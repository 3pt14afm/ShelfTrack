import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabaseClient"; // Added supabase import
import { logout, changePassword, uploadAvatar } from "@/lib/auth-helpers";
import { useAuthStore } from "@/store/authStore";

export default function ProfileScreen() {
  const profile = useAuthStore((s) => s.profile);

  // Avatar upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Stats state
  const [stats, setStats] = useState({ borrowed: 0, due: 0, returned: 0 });

  // Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Fetch user stats from transactions table
  useEffect(() => {
    if (profile?.id) {
      fetchUserStats();
    }
  }, [profile?.id]);

  const fetchUserStats = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("status, due_date")
        .eq("student_id", profile.id);

      if (error) throw error;

      let borrowed = 0;
      let returned = 0;
      let due = 0;
      const now = new Date();

      data.forEach((tx) => {
        if (tx.status === "borrowed") {
          borrowed++;
          // Check if it's overdue
          if (new Date(tx.due_date) < now) {
            due++;
          }
        } else if (tx.status === "returned") {
          returned++;
        }
      });

      setStats({ borrowed, due, returned });
    } catch (err) {
      console.error("Error fetching stats:", err.message);
    }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Needed",
        "Please allow access to your photos to update your profile picture."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    setIsUploadingAvatar(true);
    try {
      const newAvatarUrl = await uploadAvatar(result.assets[0].uri);
      useAuthStore.setState({ profile: { ...profile, avatar_url: newAvatarUrl } });
    } catch (err: any) {
      Alert.alert("Upload Failed", err.message || "Could not update your profile picture.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "Your new passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Too Short", "Password must be at least 8 characters long.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(newPassword);
      Alert.alert("Success", "Your password has been changed successfully.");
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Header — gradient banner + floating glass profile card,
            avatar straddling the seam between the two. */}
        <View style={styles.headerWrap}>
          <LinearGradient
            colors={["#1f6b40", "#164a2d", "#0d2e1c"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerBlobOne} pointerEvents="none" />
            <View style={styles.headerBlobTwo} pointerEvents="none" />
            <View style={styles.headerBlobThree} pointerEvents="none" />
          </LinearGradient>

          <View style={styles.avatarWrapper}>
            <View style={styles.avatarInner}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.mainAvatar} />
              ) : (
                <View style={styles.mainAvatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : "?"}
                  </Text>
                </View>
              )}

              {isUploadingAvatar && (
                <View style={styles.avatarLoadingOverlay}>
                  <ActivityIndicator color="white" />
                </View>
              )}

              <TouchableOpacity
                style={styles.editAvatarBadge}
                onPress={handlePickAvatar}
                disabled={isUploadingAvatar}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={15} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.profileCard}>
            <Text style={styles.name}>{profile?.full_name || "No Name Set"}</Text>

            <View style={styles.idPill}>
              <Ionicons name="finger-print-outline" size={11} color="#164a2d" />
              <Text style={styles.idPillText}>ID {profile?.student_id || "N/A"}</Text>
            </View>

            <View style={styles.cardDivider} />

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={[styles.statIconCircle, { backgroundColor: "#eef6f0" }]}>
                  <Ionicons name="book-outline" size={16} color="#164a2d" />
                </View>
                <Text style={styles.statValue}>{stats.borrowed}</Text>
                <Text style={styles.statLabel}>Borrowed</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View style={[styles.statIconCircle, { backgroundColor: "#fef3c7" }]}>
                  <Ionicons name="alert-circle-outline" size={16} color="#b45309" />
                </View>
                <Text style={styles.statValue}>{stats.due}</Text>
                <Text style={styles.statLabel}>Due</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View style={[styles.statIconCircle, { backgroundColor: "#e0f2fe" }]}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#0369a1" />
                </View>
                <Text style={styles.statValue}>{stats.returned}</Text>
                <Text style={styles.statLabel}>Returned</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Student Information</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoLabelRow}>
              <Ionicons name="school-outline" size={16} color="#6b7280" />
              <Text style={styles.label}>Grade Level</Text>
            </View>
            <Text style={styles.value}>{profile?.grade_level || "N/A"}</Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.infoLabelRow}>
              <Ionicons name="people-outline" size={16} color="#6b7280" />
              <Text style={styles.label}>Section</Text>
            </View>
            <Text style={styles.value}>{profile?.section || "N/A"}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <Text style={styles.sectionLabel}>Account Settings</Text>

          <TouchableOpacity
            style={styles.changePassButton}
            onPress={() => setShowPasswordModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconCircle}>
              <Ionicons name="lock-closed-outline" size={16} color="#164a2d" />
            </View>
            <Text style={styles.changePassText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={() => logout()} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color="#dc2626" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* CHANGE PASSWORD MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPasswordModal}
        onRequestClose={() => {}}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.content}>
            <View style={modalStyles.headerRow}>
              <Text style={modalStyles.title}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)} disabled={isChangingPassword}>
                <Ionicons name="close" size={28} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 24 }}>
              <View style={modalStyles.inputGroup}>
                <Text style={modalStyles.label}>Current Password</Text>
                <TextInput
                  style={modalStyles.input}
                  placeholder="Enter current password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  editable={!isChangingPassword}
                />
              </View>

              <View style={modalStyles.inputGroup}>
                <Text style={modalStyles.label}>New Password</Text>
                <TextInput
                  style={modalStyles.input}
                  placeholder="Must be at least 8 characters"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  editable={!isChangingPassword}
                />
              </View>

              <View style={modalStyles.inputGroup}>
                <Text style={modalStyles.label}>Confirm New Password</Text>
                <TextInput
                  style={modalStyles.input}
                  placeholder="Re-enter new password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!isChangingPassword}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[modalStyles.submitButton, isChangingPassword && modalStyles.submitButtonDisabled]}
              onPress={handleChangePassword}
              disabled={isChangingPassword}
              activeOpacity={0.85}
            >
              {isChangingPassword ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={modalStyles.submitButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- Main Profile Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f9fafb", paddingBottom: 10 },

  headerWrap: { position: "relative", marginBottom: 4 },
  headerGradient: {
    height: 182,
    paddingTop: 6,
    paddingHorizontal: 22,
    overflow: "hidden",
  },
  headerBlobOne: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: -60,
    right: -40,
  },
  headerBlobTwo: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.06)",
    bottom: -25,
    left: -30,
  },
  headerBlobThree: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.01)",
    bottom: 120,
    left: 70,
  },

  avatarWrapper: {
    position: "absolute",
    top: 73,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  avatarInner: {
    width: 104,
    height: 104,
    position: "relative",
  },
  mainAvatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 4,
    borderColor: "white",
  },
  mainAvatarPlaceholder: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "#164a2d",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "white",
  },
  avatarText: { fontSize: 38, fontWeight: "700", color: "white" },
  avatarLoadingOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 52,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  editAvatarBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#164a2d",
    borderWidth: 3,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },

  profileCard: {
    marginHorizontal: 16,
    marginTop: -62,
    backgroundColor: "white",
    borderRadius: 26,
    paddingTop: 60,
    paddingBottom: 18,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#0d2e1c",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  name: { fontSize: 18, fontWeight: "800", color: "#111827" },
  idPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#eef6f0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 4,
  },
  idPillText: { fontSize: 10, fontWeight: "700", color: "#164a2d" },

  cardDivider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    width: "100%",
    marginTop: 18,
    marginBottom: 16,
  },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statIconCircle: {
    width: 35,
    height: 35,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  statLabel: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "400",
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#f3f4f6",
  },

  card: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 6 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  infoLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 12, color: "#6b7280" },
  value: { fontSize: 12, fontWeight: "600", color: "#111827" },

  actionContainer: { marginHorizontal: 16, marginTop: 28 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  changePassButton: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 10,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 18,
    backgroundColor: "#eef6f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  changePassText: { flex: 1, color: "#111827", fontSize: 12, fontWeight: "600" },
  logoutButton: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 10,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutText: { color: "#dc2626", fontSize: 14, fontWeight: "600", marginLeft: 8 },
});

// --- Modal Styles ---
const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 },
  content: {
    backgroundColor: "white", borderRadius: 20, padding: 24, width: "100%",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "800", color: "#111827" },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 8 },
  input: {
    backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: "#111827"
  },
  submitButton: {
    width: "100%", backgroundColor: "#164a2d", paddingVertical: 16, borderRadius: 12,
    alignItems: "center", marginTop: 12,
    shadowColor: "#164a2d", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4
  },
  submitButtonDisabled: { backgroundColor: "#9ca3af", elevation: 0, shadowOpacity: 0 },
  submitButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 18 },
});