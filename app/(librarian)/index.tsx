import { changePassword, logout } from "@/lib/auth-helpers";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/store/authStore";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// --- Types ---
interface RecentTransaction {
  id: string;
  borrowed_at: string;
  status: string;
  profiles: { full_name: string | null };
  books: { title: string | null };
}

export default function LibrarianDashboard() {
  const profile = useAuthStore((s) => s.profile);

  // Dashboard Data State
  const [loading, setLoading] = useState(true);
  const [totalBooks, setTotalBooks] = useState(0);
  const [totalBorrowed, setTotalBorrowed] = useState(0);
  const [totalReturned, setTotalReturned] = useState(0);
  const [recentTx, setRecentTx] = useState<RecentTransaction[]>([]);

  // UI State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Run all counts and the recent query in parallel for speed
      const [booksRes, borrowedRes, returnedRes, txRes] = await Promise.all([
        supabase.from("books").select("*", { count: "exact", head: true }),
        supabase.from("transactions").select("*", { count: "exact", head: true }).eq("status", "borrowed"),
        supabase.from("transactions").select("*", { count: "exact", head: true }).eq("status", "returned"),
        supabase
          .from("transactions")
          .select("id, borrowed_at, status, profiles(full_name), books(title)")
          .order("borrowed_at", { ascending: false })
          .limit(5),
      ]);

      setTotalBooks(booksRes.count || 0);
      setTotalBorrowed(borrowedRes.count || 0);
      setTotalReturned(returnedRes.count || 0);
      setRecentTx((txRes.data as RecentTransaction[]) || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#164a2d" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerGreeting}>Hello,</Text>
              <Text style={styles.headerName}>{profile?.full_name || "Librarian"}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowProfileModal(true)} style={styles.profileIconContainer}>
              <Ionicons name="settings-outline" size={28} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: "#164a2d" }]}>
            <Ionicons name="library-outline" size={24} color="rgba(255,255,255,0.8)" />
            <Text style={styles.statNumber}>{totalBooks}</Text>
            <Text style={styles.statLabel}>Total Books</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: "#fef3c7", borderWidth: 1, borderColor: "#fde68a" }]}>
            <Ionicons name="book-outline" size={24} color="#92400e" />
            <Text style={[styles.statNumber, { color: "#92400e" }]}>{totalBorrowed}</Text>
            <Text style={[styles.statLabel, { color: "#78350f" }]}>Borrowed</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" }]}>
            <Ionicons name="checkmark-done-outline" size={24} color="#166534" />
            <Text style={[styles.statNumber, { color: "#166534" }]}>{totalReturned}</Text>
            <Text style={[styles.statLabel, { color: "#14532d" }]}>Returned</Text>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>

          {recentTx.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={40} color="#d1d5db" />
              <Text style={styles.emptyText}>No recent transactions</Text>
            </View>
          ) : (
            recentTx.map((tx) => (
              <View key={tx.id} style={styles.txCard}>
                <View style={styles.txIconContainer}>
                  <Ionicons
                    name={tx.status === "borrowed" ? "arrow-forward-outline" : "arrow-down-outline"}
                    size={18}
                    color={tx.status === "borrowed" ? "#d97706" : "#16a34a"}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.txBookTitle} numberOfLines={1}>
                    {tx.books?.title || "Unknown Book"}
                  </Text>
                  <Text style={styles.txStudentName}>
                    by {tx.profiles?.full_name || "Unknown Student"}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.txDate}>{formatDate(tx.borrowed_at)}</Text>
                  <Text style={[
                    styles.txStatus,
                    { color: tx.status === "borrowed" ? "#d97706" : "#16a34a" }
                  ]}>
                    {tx.status === "borrowed" ? "Borrowed" : "Returned"}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* ------------------------- */}
      {/* PROFILE / SETTINGS MODAL */}
      {/* ------------------------- */}
      <Modal animationType="slide" transparent={true} visible={showProfileModal} onRequestClose={() => setShowProfileModal(false)}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.content}>
            <View style={modalStyles.headerRow}>
              <Text style={modalStyles.title}>Settings</Text>
              <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                <Ionicons name="close" size={28} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Profile Info Display */}
            <View style={modalStyles.profileBox}>
              <View style={modalStyles.avatarPlaceholder}>
                <Text style={modalStyles.avatarText}>
                  {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : "L"}
                </Text>
              </View>
              <View style={{ marginLeft: 16 }}>
                <Text style={modalStyles.profileName}>{profile?.full_name || "Librarian"}</Text>
                <Text style={modalStyles.profileSubtext}>Library Account</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={modalStyles.actionRow}
              onPress={() => setShowPasswordModal(true)}
            >
              <Ionicons name="lock-closed-outline" size={22} color="#164a2d" />
              <Text style={modalStyles.actionText}>Change Password</Text>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            {/* Logout Button at Bottom */}
            <TouchableOpacity
              style={modalStyles.logoutButton}
              onPress={handleLogout}
              disabled={loggingOut}
              activeOpacity={0.8}
            >
              {loggingOut ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={20} color="white" />
                  <Text style={modalStyles.logoutText}>Logout</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ------------------------- */}
      {/* CHANGE PASSWORD MODAL    */}
      {/* ------------------------- */}
      <Modal animationType="slide" transparent={true} visible={showPasswordModal} onRequestClose={() => { }}>
        <View style={passModalStyles.overlay}>
          <View style={passModalStyles.content}>
            <View style={passModalStyles.headerRow}>
              <Text style={passModalStyles.title}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)} disabled={isChangingPassword}>
                <Ionicons name="close" size={28} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 24 }}>
              <View style={passModalStyles.inputGroup}>
                <Text style={passModalStyles.label}>Current Password</Text>
                <TextInput style={passModalStyles.input} placeholder="Enter current password" placeholderTextColor="#9ca3af" secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} editable={!isChangingPassword} />
              </View>
              <View style={passModalStyles.inputGroup}>
                <Text style={passModalStyles.label}>New Password</Text>
                <TextInput style={passModalStyles.input} placeholder="Must be at least 8 characters" placeholderTextColor="#9ca3af" secureTextEntry value={newPassword} onChangeText={setNewPassword} editable={!isChangingPassword} />
              </View>
              <View style={passModalStyles.inputGroup}>
                <Text style={passModalStyles.label}>Confirm New Password</Text>
                <TextInput style={passModalStyles.input} placeholder="Re-enter new password" placeholderTextColor="#9ca3af" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} editable={!isChangingPassword} />
              </View>
            </View>

            <TouchableOpacity style={[passModalStyles.submitButton, isChangingPassword && passModalStyles.submitButtonDisabled]} onPress={handleChangePassword} disabled={isChangingPassword} activeOpacity={0.85}>
              {isChangingPassword ? <ActivityIndicator size="small" color="white" /> : <Text style={passModalStyles.submitButtonText}>Update Password</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- Main Dashboard Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f9fafb" },
  centerContainer: { flex: 1, backgroundColor: "white", justifyContent: "center", alignItems: "center" },

  headerContainer: {
    backgroundColor: "#164a2d",
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 24,
    shadowColor: "#164a2d",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24 },
  headerGreeting: { color: "rgba(255,255,255,0.7)", fontSize: 14 },
  headerName: { color: "white", fontSize: 24, fontWeight: "800", marginTop: 2 },
  profileIconContainer: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center"
  },

  statsContainer: { flexDirection: "row", paddingHorizontal: 16, gap: 12, marginBottom: 32 },
  statCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  statNumber: { fontSize: 28, fontWeight: "800", color: "white", marginTop: 8 },
  statLabel: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.8)", marginTop: 4 },

  sectionContainer: { paddingHorizontal: 16, paddingBottom: 100 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 16 },
  emptyState: { alignItems: "center", justifyContent: "center", marginTop: 40, paddingVertical: 40 },
  emptyText: { color: "#9ca3af", marginTop: 12, fontSize: 16 },

  txCard: {
    backgroundColor: "white", flexDirection: "row", alignItems: "center", padding: 16,
    borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: "#f3f4f6",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 2, elevation: 2,
  },
  txIconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f9fafb", justifyContent: "center", alignItems: "center" },
  txBookTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  txStudentName: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  txDate: { fontSize: 11, color: "#9ca3af" },
  txStatus: { fontSize: 12, fontWeight: "700", marginTop: 4 },
});

// --- Settings Modal Styles ---
const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  content: { backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: "50%" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 24, fontWeight: "800", color: "#111827" },
  profileBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#f9fafb", padding: 16, borderRadius: 16, marginBottom: 24 },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#164a2d", justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 24, fontWeight: "700", color: "white" },
  profileName: { fontSize: 18, fontWeight: "700", color: "#111827" },
  profileSubtext: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  actionRow: { flexDirection: "row", alignItems: "center", backgroundColor: "white", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#f3f4f6", marginBottom: 12 },
  actionText: { flex: 1, fontSize: 16, fontWeight: "500", color: "#111827", marginLeft: 12 },
  logoutButton: { backgroundColor: "#dc2626", padding: 16, borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 16 },
  logoutText: { color: "white", fontWeight: "700", fontSize: 16, marginLeft: 8 },
});

// --- Password Modal Styles ---
const passModalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 },
  content: { backgroundColor: "white", borderRadius: 20, padding: 24, width: "100%", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "800", color: "#111827" },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 8 },
  input: { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: "#111827" },
  submitButton: { width: "100%", backgroundColor: "#164a2d", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 12, shadowColor: "#164a2d", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  submitButtonDisabled: { backgroundColor: "#9ca3af", elevation: 0, shadowOpacity: 0 },
  submitButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 18 },
});