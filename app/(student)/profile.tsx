import React, { useState } from "react";
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
import { logout, changePassword } from "@/lib/auth-helpers";
import { useAuthStore } from "@/store/authStore";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const profile = useAuthStore((s) => s.profile);

  // Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    // 1. Client-side validation
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
      // We call the helper which handles Supabase updateUser and the 30-day reset logic
      await changePassword(newPassword);
      
      Alert.alert("Success", "Your password has been changed successfully.");
      
      // Reset and close modal
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Profile Picture & Name */}
        <View style={styles.avatarSection}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.mainAvatar} />
          ) : (
            <View style={styles.mainAvatarPlaceholder}>
              <Text style={styles.avatarText}>
                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : "?"}
              </Text>
            </View>
          )}
          <Text style={styles.name}>{profile?.full_name || "No Name Set"}</Text>
          <Text style={styles.idText}>ID: {profile?.student_id || "N/A"}</Text>
        </View>

        {/* Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Student Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Grade Level</Text>
            <Text style={styles.value}>{profile?.grade_level || "N/A"}</Text>
          </View>
          
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.label}>Section</Text>
            <Text style={styles.value}>{profile?.section || "N/A"}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {/* Change Password Button */}
          <TouchableOpacity 
            style={styles.changePassButton} 
            onPress={() => setShowPasswordModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="lock-closed-outline" size={20} color="#164a2d" />
            <Text style={styles.changePassText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={18} color="#164a2d" />
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={() => logout()} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ------------------------- */}
      {/* CHANGE PASSWORD MODAL    */}
      {/* ------------------------- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPasswordModal}
        onRequestClose={() => {}} // Prevent Android back button
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.content}>
            {/* Header */}
            <View style={modalStyles.headerRow}>
              <Text style={modalStyles.title}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)} disabled={isChangingPassword}>
                <Ionicons name="close" size={28} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Inputs */}
            <View style={{ marginTop: 24 }}>
              {/* Current Password (For UX consistency, though Supabase doesn't strictly require it for logged-in users) */}
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

              {/* New Password */}
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

              {/* Confirm New Password */}
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

            {/* Submit Button */}
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
    </SafeAreaView>
  );
}

// --- Main Profile Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f9fafb" },
  headerContainer: {
    backgroundColor: "#164a2d",
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 8,
    shadowColor: "#164a2d",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  headerTitle: { color: "white", fontSize: 24, fontWeight: "800" },
  profileIconContainer: { 
    width: 48, height: 48, borderRadius: 24, overflow: 'hidden', 
    borderWidth: 2, borderColor: "rgba(255,255,255,0.3)" 
  },
  profileImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  
  avatarSection: { alignItems: "center", paddingVertical: 24 },
  mainAvatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: "#164a2d" },
  mainAvatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#164a2d", justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 40, fontWeight: "700", color: "white" },
  name: { fontSize: 22, fontWeight: "800", color: "#111827", marginTop: 16 },
  idText: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  
  card: { 
    backgroundColor: "white", marginHorizontal: 16, borderRadius: 16, padding: 20, 
    borderWidth: 1, borderColor: "#f3f4f6",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 2, elevation: 2 
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 16 },
  infoRow: { 
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", 
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" 
  },
  label: { fontSize: 14, color: "#6b7280" },
  value: { fontSize: 14, fontWeight: "600", color: "#111827" },
  
  actionContainer: { marginHorizontal: 16, marginTop: 24 },
  changePassButton: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#164a2d",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 2,
  },
  changePassText: { flex: 1, color: "#164a2d", fontSize: 16, fontWeight: "600", marginLeft: 12 },
  logoutButton: { 
    backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", 
    padding: 16, borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center" 
  },
  logoutText: { color: "#dc2626", fontSize: 16, fontWeight: "600", marginLeft: 8 },
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