import { changePassword, logout } from "@/lib/auth-helpers";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/store/authStore";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ============================================================
// Design tokens — soft neumorphic base + glass surfaces
// ============================================================
const colors = {
  bgBase: "#EEF1F7",
  bgBaseAlt: "#E6EBF5",
  glass: "rgba(255,255,255,0.55)",
  glassStrong: "rgba(255,255,255,0.78)",
  glassBorder: "rgba(255,255,255,0.7)",
  glassBorderSoft: "rgba(255,255,255,0.45)",

  primary: "#1B4332",
  primaryDark: "#0F2A1B",
  primarySoft: "#2D6A4F",

  emeraldLight: "#ECFDF5",
  emeraldBase: "#D1FAE5",
  emeraldDark: "#34D399",
  
  gold: "#B45309",
  goldGlass: "rgba(180,83,9,0.10)",
  goldBorder: "rgba(180,83,9,0.22)",

  success: "#166534",
  successGlass: "rgba(22,101,52,0.10)",
  successBorder: "rgba(22,101,52,0.22)",

  danger: "#DC2626",

  textPrimary: "#1C1A16",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",

  shadowDark: "#AEB8CC",
};

// --- Types ---
interface RecentTransaction {
  id: string;
  borrowed_at: string;
  status: string;
  profiles: { full_name: string | null };
  books: { title: string | null };
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function GlassSurface({
  tint,
  style,
  children,
}: {
  intensity?: number;
  tint: "light" | "dark";
  style?: any;
  children?: React.ReactNode;
}) {
  const isDark = tint === "dark";
  const baseColor = isDark ? "rgba(20,18,14,0.72)" : colors.glassStrong;
  const sheenColors = isDark
    ? (["rgba(255,255,255,0.05)", "rgba(255,255,255,0)"] as const)
    : (["rgba(255,255,255,0.55)", "rgba(255,255,255,0)"] as const);

  return (
    <View style={[style, { backgroundColor: baseColor, overflow: "hidden" }]}>
      <LinearGradient
        colors={sheenColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.7 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

export default function LibrarianDashboard() {
  const profile = useAuthStore((s) => s.profile);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  // Dashboard Data State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
  const [showPw, setShowPw] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
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
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
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

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPw(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Missing info", "Please fill in every field.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "Your new passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Too short", "Password must be at least 8 characters long.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(newPassword);
      Alert.alert("Success", "Your password has been changed successfully.");
      setShowPasswordModal(false);
      resetPasswordForm();
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

  const stats = useMemo(
    () => [
      {
        key: "total",
        label: "Total Books",
        value: totalBooks,
        icon: "library-outline" as const,
        bg: colors.primary,
        fg: "#FFFFFF",
        sub: "#F5F5F7",
      },
      {
        key: "borrowed",
        label: "Borrowed",
        value: totalBorrowed,
        icon: "book-outline" as const,
        bg: colors.goldGlass,
        border: colors.goldBorder,
        fg: colors.gold,
        sub: "#92400E",
      },
      {
        key: "returned",
        label: "Returned",
        value: totalReturned,
        icon: "checkmark-done-outline" as const,
        bg: colors.successGlass,
        border: colors.successBorder,
        fg: colors.success,
        sub: "#14532D",
      },
    ],
    [totalBooks, totalBorrowed, totalReturned]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <LinearGradient
        colors={[colors.bgBase, colors.bgBaseAlt]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Content wrapper — centers & caps width on tablets/large screens */}
        <View style={[styles.contentWrapper, isTablet && styles.contentWrapperTablet]}>
          {/* Header */}
          <LinearGradient
            colors={[colors.success, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerContainer}
          >
            <View style={styles.headerContent}>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerGreeting}>{getGreeting()},</Text>
                <Text style={styles.headerName} numberOfLines={1}>
                  {profile?.full_name || "Librarian"}
                </Text>
                <View style={styles.headerBadge}>
                  <Ionicons name="shield-checkmark-outline" size={12} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.headerBadgeText}>Librarian access</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowProfileModal(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Open settings"
                activeOpacity={0.8}
              >
                <View style={styles.profileIconContainer}>
                  <Ionicons name="settings-outline" size={19} color="rgba(255,255,255,0.9)" />
                </View>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Stats Cards */}
          <View style={[styles.statsContainer, isTablet && styles.statsContainerTablet]}>
            {stats.map((s) =>
              s.key === "total" ? (
                <LinearGradient
                  key={s.key}
                  colors={[colors.success, colors.emeraldDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.statCard, styles.statCardGlow]}
                >
                  <View style={[styles.statIconWrap, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
                    <Ionicons name={s.icon} size={18} color={s.fg} />
                  </View>
                  <Text style={[styles.statNumber, { color: s.fg }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: s.sub }]}>{s.label}</Text>
                </LinearGradient>
              ) : (
                <View key={s.key} style={styles.statCardOuter}>
                  <View
                    style={[
                      styles.statCard,
                      styles.statCardInner,
                      { backgroundColor: s.bg, borderColor: s.border },
                    ]}
                  >
                    <View style={[styles.statIconWrap, { backgroundColor: "rgba(255,255,255,0.55)" }]}>
                      <Ionicons name={s.icon} size={18} color={s.fg} />
                    </View>
                    <Text style={[styles.statNumber, { color: s.fg }]}>{s.value}</Text>
                    <Text style={[styles.statLabel, { color: s.sub }]}>{s.label}</Text>
                  </View>
                </View>
              )
            )}
          </View>

          {/* Recent Transactions */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <View style={styles.sectionPill}>
                <Text style={styles.sectionPillText}>Last {recentTx.length || 0}</Text>
              </View>
            </View>

            {recentTx.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="time-outline" size={32} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyText}>No recent transactions</Text>
                <Text style={styles.emptySubtext}>Borrow and return activity will show up here.</Text>
              </View>
            ) : (
              <View style={styles.txListCard}>
                <View style={isTablet ? styles.txGrid : undefined}>
                  {recentTx.map((tx, index) => {
                    const isBorrowed = tx.status === "borrowed";
                    const isLast = index === recentTx.length - 1;
                    return (
                      <View
                        key={tx.id}
                        style={[
                          styles.txRow,
                          isTablet && styles.txRowTablet,
                          !isTablet && !isLast && styles.txRowDivider,
                        ]}
                      >
                        <View
                          style={[styles.txIconContainer,
                            { backgroundColor: isBorrowed ? colors.goldGlass : colors.successGlass },
                          ]}
                        >
                          {isBorrowed ? ( <ArrowUpRight size={17} color={colors.gold} />
                            ) : ( <ArrowDownLeft size={17} color={colors.success} /> )
                          }
                        </View>
                        <View style={styles.txMiddle}>
                          <Text style={styles.txBookTitle} numberOfLines={1}>
                            {tx.books?.title || "Unknown Book"}
                          </Text>
                          <Text style={styles.txStudentName} numberOfLines={1}>
                            {tx.profiles?.full_name || "Unknown Student"}
                          </Text>
                        </View>
                        <View style={styles.txRight}>
                          <Text style={styles.txDate}>{formatDate(tx.borrowed_at)}</Text>
                          <View
                            style={[
                              styles.txStatusPill,
                              { backgroundColor: isBorrowed ? colors.goldGlass : colors.successGlass },
                            ]}
                          >
                            <Text style={[styles.txStatusText, { color: isBorrowed ? colors.gold : colors.success }]}>
                              {isBorrowed ? "Borrowed" : "Returned"}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ------------------------- */}
      {/* PROFILE / SETTINGS MODAL */}
      {/* ------------------------- */}
      <Modal
        animationType="slide"
        transparent
        visible={showProfileModal}
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={modalStyles.overlay}>
          <GlassSurface intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowProfileModal(false)}
          />
          <GlassSurface intensity={100} tint="light" style={modalStyles.content}>
            <View style={modalStyles.grabber} />
            <View style={modalStyles.headerRow}>
              <Text style={modalStyles.title}>Settings</Text>
            </View>

            {/* Profile Info Display */}
            <View style={modalStyles.profileBox}>
              <LinearGradient
                colors={[colors.primary, colors.primarySoft]}
                style={modalStyles.avatarPlaceholder}
              >
                <Text style={modalStyles.avatarText}>
                  {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : "L"}
                </Text>
              </LinearGradient>
              <View style={{ marginLeft: 16, flex: 1 }}>
                <Text style={modalStyles.profileName} numberOfLines={1}>
                  {profile?.full_name || "Librarian"}
                </Text>
                <Text style={modalStyles.profileSubtext}>Library Account</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={modalStyles.actionRow}
              onPress={() => setShowPasswordModal(true)}
              activeOpacity={0.7}
            >
              <View style={modalStyles.actionIconWrap}>
                <Ionicons name="lock-closed-outline" size={19} color={colors.primary} />
              </View>
              <Text style={modalStyles.actionText}>Change Password</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            {/* Logout Button at Bottom */}
            <TouchableOpacity
              style={modalStyles.logoutButton}
              onPress={handleLogout}
              disabled={loggingOut}
              activeOpacity={0.85}
            >
              {loggingOut ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={19} color="white" />
                  <Text style={modalStyles.logoutText}>Logout</Text>
                </>
              )}
            </TouchableOpacity>
          </GlassSurface>
        </View>
      </Modal>

      {/* ------------------------- */}
      {/* CHANGE PASSWORD MODAL    */}
      {/* ------------------------- */}
      <Modal
        animationType="fade"
        transparent
        visible={showPasswordModal}
        onRequestClose={() => {
          if (!isChangingPassword) setShowPasswordModal(false);
        }}
      >
        <View style={passModalStyles.overlay}>
          <GlassSurface intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
          <GlassSurface intensity={100} tint="light" style={passModalStyles.content}>
            <View style={passModalStyles.headerRow}>
              <View>
                <Text style={passModalStyles.title}>Change Password</Text>
                <Text style={passModalStyles.subtitle}>Keep your account secure</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowPasswordModal(false);
                  resetPasswordForm();
                }}
                disabled={isChangingPassword}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 20 }}>
              <View style={passModalStyles.inputGroup}>
                <Text style={passModalStyles.label}>Current Password</Text>
                <TextInput
                  style={passModalStyles.input}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPw}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  editable={!isChangingPassword}
                />
              </View>
              <View style={passModalStyles.inputGroup}>
                <Text style={passModalStyles.label}>New Password</Text>
                <TextInput
                  style={passModalStyles.input}
                  placeholder="Must be at least 8 characters"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPw}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  editable={!isChangingPassword}
                />
              </View>
              <View style={passModalStyles.inputGroup}>
                <View style={passModalStyles.labelRow}>
                  <Text style={passModalStyles.label}>Confirm New Password</Text>
                  <TouchableOpacity onPress={() => setShowPw((v) => !v)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Text style={passModalStyles.toggleText}>{showPw ? "Hide" : "Show"}</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={passModalStyles.input}
                  placeholder="Re-enter new password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPw}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!isChangingPassword}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[passModalStyles.submitButton, isChangingPassword && passModalStyles.submitButtonDisabled]}
              onPress={handleChangePassword}
              disabled={isChangingPassword}
              activeOpacity={0.88}
            >
              {isChangingPassword ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={passModalStyles.submitButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </GlassSurface>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- Main Dashboard Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bgBase },
  centerContainer: { flex: 1, backgroundColor: colors.bgBase, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: colors.textSecondary, fontSize: 14 },

  contentWrapper: { flex: 1, width: "100%" },
  contentWrapperTablet: { maxWidth: 720, alignSelf: "center" },

  headerContainer: {
    height: 200,
    paddingTop: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginBottom: 20,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 24 },
  headerGreeting: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: "500" },
  headerName: { color: "white", fontSize: 25, fontWeight: "800", marginTop: 2, letterSpacing: 0.2 },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 10,
    gap: 5,
  },
  headerBadgeText: { color: "rgba(255,255,255,0.9)", fontSize: 10, fontWeight: "600" },
  profileIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.14)",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },

  statsContainer: {
    flexDirection: "row",
    alignItems: "stretch", 
    paddingHorizontal: 16,
    marginTop: -80,
    marginBottom: 24,
    gap: 8,
  },
  statsContainerTablet: { paddingHorizontal: 0 },
  statCard: {
    flex: 1,
    width: 0, 
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#ffffff40",
    borderRadius: 20,
    paddingVertical: 13,
    paddingHorizontal: 14,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  statCardOuter: {
    flex: 1,
    width: 0, 
    minHeight: 100,
    borderRadius: 20,
    backgroundColor: colors.bgBase,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  statCardInner: {
    flex: 1,
    width: "100%", 
    height: "100%", 
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  statCardGlow: {
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  statIconWrap: { width: 30, height: 30, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  statNumber: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5, paddingLeft: 2, },
  statLabel: { fontSize: 11, fontWeight: "500", marginTop: 3, paddingLeft: 2, },

  sectionContainer: { paddingHorizontal: 16, paddingBottom: 50 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.2 },
  sectionPill: {
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  sectionPillText: { fontSize: 10, fontWeight: "700", color: colors.textSecondary },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    backgroundColor: colors.glass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderStyle: "dashed",
  },
  emptyIconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.glassStrong, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyText: { color: colors.textPrimary, fontSize: 15, fontWeight: "700" },
  emptySubtext: { color: colors.textMuted, fontSize: 13, marginTop: 4 },

  txListCard: {
    backgroundColor: colors.glassStrong,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 14,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 2,
  },
  txGrid: { flexDirection: "row", flexWrap: "wrap" },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  txRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  txRowTablet: { width: "50%", paddingHorizontal: 6 },
  txIconContainer: { width: 30, height: 30, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  txMiddle: { flex: 1, marginLeft: 12 },
  txBookTitle: { fontSize: 13, fontWeight: "700", color: colors.textPrimary, paddingBottom: 5 },
  txStudentName: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  txRight: { alignItems: "flex-end", marginLeft: 8 },
  txDate: { fontSize: 10, color: colors.textMuted, marginBottom: 5 },
  txStatusPill: { paddingHorizontal: 8, paddingVertical: 3, marginTop: 3, borderRadius: 10 },
  txStatusText: { fontSize: 9, fontWeight: "600" },
  txCardTablet: { width: "48.5%", marginBottom: 0 },
});

// --- Settings Modal Styles ---
const modalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  content: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingTop: 12,
    minHeight: "48%",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.15)", alignSelf: "center", marginBottom: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 },
  title: { fontSize: 18, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.3 },
  closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.glassStrong, alignItems: "center", justifyContent: "center" },
  profileBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 14,
    borderRadius: 20,
    marginBottom: 20,
  },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 27, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 20, fontWeight: "700", color: "white" },
  profileName: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  profileSubtext: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glassStrong,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: 12,
  },
  actionIconWrap: { width: 34, height: 34, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.7)", alignItems: "center", justifyContent: "center" },
  actionText: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.textPrimary, marginLeft: 12 },
  logoutButton: {
    backgroundColor: colors.danger,
    padding: 10,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    gap: 8,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  logoutText: { color: "white", fontWeight: "700", fontSize: 14 },
});

// --- Password Modal Styles ---
const passModalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  content: {
    borderRadius: 28,
    padding: 24,
    width: "100%",
    maxWidth: 420,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: 20, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.2 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 3 },
  inputGroup: { marginBottom: 18 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  label: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 },
  toggleText: { fontSize: 12, fontWeight: "700", color: colors.primary },
  input: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.textPrimary,
  },
  submitButton: {
    width: "100%",
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  submitButtonDisabled: { backgroundColor: colors.textMuted, elevation: 0, shadowOpacity: 0 },
  submitButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 16, letterSpacing: 0.2 },
});