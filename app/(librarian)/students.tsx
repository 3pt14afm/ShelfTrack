import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert, RefreshControl, StyleSheet, useWindowDimensions, } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Search,
  X,
  KeyRound,
  Users,
  UserRound,
  UserX,
  BookOpenCheck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react-native";
import { listStudents } from "@/lib/students";
import { resetStudentPassword } from "@/lib/auth-helpers";
import { supabase } from "@/lib/supabaseClient";
import { Profile } from "@/store/authStore";

// ============================================================
// Design tokens — soft neumorphic base + glass surfaces
// (shared visual language with the rest of the app)
// ============================================================
const colors = {
  bgBase: "#EEF1F7",
  bgBaseAlt: "#E6EBF5",
  glass: "rgba(255,255,255,0.55)",
  glassStrong: "rgba(255,255,255,0.82)",
  glassBorder: "rgba(255,255,255,0.7)",
  glassBorderSoft: "rgba(255,255,255,0.45)",

  primary: "#164a2d",
  primaryDark: "#0d2e1c",
  primarySoft: "#1f6b40",

  gold: "#B45309",
  goldGlass: "rgba(180,83,9,0.10)",
  goldBorder: "rgba(180,83,9,0.22)",

  success: "#166534",
  successGlass: "rgba(22,101,52,0.10)",
  successBorder: "rgba(22,101,52,0.22)",

  textPrimary: "#1C1A16",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",

  shadowDark: "#AEB8CC",

  white: "#ffffff",
};

// Faux glass surface — layered translucency + a sheen gradient, no real
// backdrop blur (real blur renders inconsistently across platforms and
// Expo Go, and looks muddy over busy/scrolling content).
function GlassSurface({
  tint = "light",
  style,
  children,
}: {
  tint?: "light" | "dark";
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

const BASE_WIDTH = 375;
function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// Helper to get initials for avatar
const getInitials = (name: string | null) => {
  if (!name) return "?";
  const names = name.split(" ");
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

// Helper to generate avatar accent color based on name
const AVATAR_COLORS = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
const getAvatarColor = (name: string | null) => {
  if (!name) return "#94a3b8";
  const charCode = name.charCodeAt(0);
  return AVATAR_COLORS[charCode % AVATAR_COLORS.length];
};

type BorrowFilter = "all" | "borrowed";
type SortOrder = "default" | "asc" | "desc";

export default function StudentsScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const scale = clamp(width / BASE_WIDTH, 0.9, 1.12);

  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const [resettingId, setResettingId] = useState<string | null>(null);

  // Set of profile ids that currently have at least one "borrowed"
  // (not yet returned) transaction — used to drive the borrow filter.
  const [borrowedIds, setBorrowedIds] = useState<Set<string>>(new Set());
  const [borrowFilter, setBorrowFilter] = useState<BorrowFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("default");

  const loadStudents = useCallback(async (searchTerm: string) => {
    try {
      const data = await listStudents(searchTerm);
      setStudents(data);
    } catch (err: any) {
      Alert.alert("Failed to load students", err.message ?? "Something went wrong.");
    }
  }, []);

  const loadBorrowedIds = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("student_id")
        .eq("status", "borrowed");

      if (error) throw error;
      setBorrowedIds(new Set((data || []).map((t: any) => t.student_id)));
    } catch (err: any) {
      console.error("Failed to load borrow status:", err.message);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadStudents(search), loadBorrowedIds()]).finally(() => setLoading(false));
  }, []);

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadStudents(search);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, loadStudents]);

  // Students are added from the shared Add modal in the tab bar, which
  // lives outside this screen — refetch on focus so newly added students
  // (and up-to-date borrow status) show up without a manual refresh.
  useFocusEffect(
    useCallback(() => {
      loadStudents(search);
      loadBorrowedIds();
    }, [loadStudents, loadBorrowedIds, search])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([loadStudents(search), loadBorrowedIds()]);
    setRefreshing(false);
  }

  function confirmResetPassword(student: Profile) {
    Alert.alert(
      "Reset password?",
      `This will reset ${student.full_name || student.student_id}'s password back to the default. They'll be asked to change it on next login.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => handleResetPassword(student),
        },
      ]
    );
  }

  async function handleResetPassword(student: Profile) {
    if (!student.student_id) return;
    setResettingId(student.id);
    try {
      await resetStudentPassword(student.student_id);
      Alert.alert("Password reset", "The student's password was reset to the default.");
    } catch (err: any) {
      Alert.alert("Failed to reset password", err.message ?? "Something went wrong.");
    } finally {
      setResettingId(null);
    }
  }

  const visibleStudents = useMemo(() => {
    let list = students;

    if (borrowFilter === "borrowed") {
      list = list.filter((s) => borrowedIds.has(s.id));
    }

    if (sortOrder === "default") {
      return list;
    }

    const sorted = [...list].sort((a, b) => {
      const nameA = (a.full_name || a.student_id || "").toLowerCase();
      const nameB = (b.full_name || b.student_id || "").toLowerCase();
      return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

    return sorted;
  }, [students, borrowFilter, borrowedIds, sortOrder]);

  const FILTERS: { key: BorrowFilter; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "All", icon: <Users size={13} /> },
    { key: "borrowed", label: "Borrowed", icon: <BookOpenCheck size={13} /> },
  ];

  const cycleSortOrder = () => {
    setSortOrder((s) => (s === "default" ? "asc" : s === "asc" ? "desc" : "default"));
  };

  const SortIcon = sortOrder === "asc" ? ArrowUp : sortOrder === "desc" ? ArrowDown : ArrowUpDown;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <LinearGradient colors={[colors.bgBase, colors.bgBaseAlt]} style={StyleSheet.absoluteFill} />

      {/* Header — glass card with roster stats, mirrors Library Catalog's stat-chip style */}
      <View style={[styles.headerWrap, isTablet && styles.headerWrapTablet]}>
        <GlassSurface tint="light" style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerIconBadge}>
              <Users size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.headerTitle}>Students</Text>
              <Text style={styles.headerSubtitle}>
                Track checkouts, and reset credentials
              </Text>
            </View>
          </View>

          <View style={styles.headerStatsRow}>
            <View style={styles.statChip}>
              <Users size={13} color={colors.primary} />
              <Text style={styles.statChipText}>
                {visibleStudents.length} {visibleStudents.length === 1 ? "Student" : "Students"}
              </Text>
            </View>
            <View style={[styles.statChip, styles.statChipSuccess]}>
              <BookOpenCheck size={13} color={colors.success} />
              <Text style={[styles.statChipText, { color: colors.success }]}>
                {borrowedIds.size} Borrowed
              </Text>
            </View>
          </View>
        </GlassSurface>
      </View>

      {/* Toolbar — search, borrow filter, and sort — sits below the header
          as its own glass surface. */}
      <View style={[styles.toolbarWrap, isTablet && styles.headerWrapTablet]}>
        <GlassSurface tint="light" style={styles.toolbarCard}>
          <View style={styles.searchBar}>
            <Search size={14} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or ID"
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <View style={styles.searchClear}>
                  <X size={12} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterRow}>
            <View style={styles.filterPills}>
              {FILTERS.map((f) => {
                const active = borrowFilter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    onPress={() => setBorrowFilter(f.key)}
                    activeOpacity={0.85}
                    style={[styles.filterPill, active && styles.filterPillActive]}
                  >
                    {React.cloneElement(f.icon as React.ReactElement, {
                      color: active ? colors.white : colors.textSecondary,
                    })}
                    <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={cycleSortOrder}
              activeOpacity={0.85}
              style={[styles.sortButton, sortOrder !== "default" && styles.sortButtonActive]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <SortIcon size={13} color={sortOrder !== "default" ? colors.white : colors.primary} />
            </TouchableOpacity>
          </View>
        </GlassSurface>
      </View>

      <View style={[styles.bodyWrapper, isTablet && styles.bodyWrapperTablet]}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={visibleStudents}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <UserX size={40} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No Students Found</Text>
                <Text style={styles.emptySubtitle}>
                  {search || borrowFilter !== "all"
                    ? "Try a different search term or filter."
                    : "Tap the + button below to add your first student."}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const avatarColor = getAvatarColor(item.full_name);
              const isResetting = resettingId === item.id;
              const hasBorrowed = borrowedIds.has(item.id);

              return (
                <View style={styles.cardOuter}>
                  <GlassSurface tint="light" style={styles.card}>
                    <View style={styles.cardRow}>
                      {/* Avatar */}
                      <View style={[styles.avatar, { backgroundColor: avatarColor + "22", borderColor: avatarColor + "33" }]}>
                        {item.full_name ? (
                          <Text style={[styles.avatarText, { color: avatarColor }]}>
                            {getInitials(item.full_name)}
                          </Text>
                        ) : (
                          <UserRound size={18} color={avatarColor} />
                        )}
                      </View>

                      {/* Info */}
                      <View style={styles.cardInfo}>
                        <Text style={styles.studentName} numberOfLines={1}>
                          {item.full_name || "Account Not Set Up"}
                        </Text>
                        <Text style={styles.studentId}>ID: {item.student_id}</Text>
                        {(item.grade_level || item.section) && (
                          <View style={styles.gradeBadge}>
                            <Text style={styles.gradeBadgeText}>
                              {[item.grade_level, item.section].filter(Boolean).join(" - ")}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Right column: borrowed top, reset bottom */}
                      <View style={styles.rightColumn}>
                        {hasBorrowed ? (
                          <View style={styles.borrowedBadge}>
                            <BookOpenCheck size={10} color={colors.success} />
                            <Text style={styles.borrowedBadgeText}>Borrowed</Text>
                          </View>
                        ) : (
                          <View style={styles.borrowedBadgeSpacer} />
                        )}

                        <TouchableOpacity
                          onPress={() => confirmResetPassword(item)}
                          disabled={isResetting}
                          style={[styles.resetButton, isResetting && styles.resetButtonDisabled]}
                          activeOpacity={0.85}
                        >
                          {isResetting ? (
                            <ActivityIndicator color={colors.gold} size="small" />
                          ) : (
                            <>
                              <KeyRound size={13} color={colors.gold} />
                              <Text style={styles.resetButtonText}>Reset</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </GlassSurface>
                </View>
              );
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bgBase },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center" },

  headerWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  headerWrapTablet: { maxWidth: 720, width: "100%", alignSelf: "center" },
  headerCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 18,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
  },
  headerTopRow: { flexDirection: "row", alignItems: "center" },
  headerIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(22,74,45,0.10)",
    borderWidth: 1,
    borderColor: "rgba(22,74,45,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.2 },
  headerSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontWeight: "500" },
  headerStatsRow: { flexDirection: "row", gap: 8, marginTop: 14 },

  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.bgBase,
    borderWidth: 1,
    borderColor: colors.successGlass,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statChipSuccess: {
    backgroundColor: colors.bgBase,
    borderColor: colors.successGlass,
  },
  statChipText: { fontSize: 11, fontWeight: "700", color: colors.primary },

  // Toolbar — its own glass surface, sitting below the header card.
  toolbarWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  toolbarCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 14,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 2,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgBase,
    borderWidth: 1,
    borderColor: colors.bgBaseAlt,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 37,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 12, color: colors.textPrimary },
  searchClear: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  filterPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 1,
    borderColor: colors.successGlass,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 2,
  },
  filterPillText: { fontSize: 11, fontWeight: "700", color: colors.textSecondary },
  filterPillTextActive: { color: colors.white },

  sortButton: {
    width: 27,
    height: 27,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 1,
    borderColor: colors.successGlass,
  },
  sortButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 2,
  },

  bodyWrapper: { flex: 1, width: "100%" },
  bodyWrapperTablet: { maxWidth: 720, alignSelf: "center" },

  listContent: { padding: 16, paddingTop: 14, paddingBottom: 40, flexGrow: 1 },

  cardOuter: {
    marginBottom: 12,
    borderRadius: 20,
    backgroundColor: colors.bgBase,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 12,
  },
  cardRow: { flexDirection: "row", alignItems: "flex-start" },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { fontWeight: "800", fontSize: 14 },

  cardInfo: { flex: 1, paddingRight: 10 },
  studentName: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  studentId: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },

  gradeBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    paddingVertical: 3,
    marginTop: 6,
  },
  gradeBadgeText: { fontSize: 10, fontWeight: "700", color: colors.textSecondary, letterSpacing: 0.3 },

  // New: right-side column holding borrowed badge (top) and reset button (bottom)
  rightColumn: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    minHeight: 62, // roughly matches avatar+info height; tweak to taste
  },

  borrowedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.successGlass,
    borderWidth: 1,
    borderColor: colors.successBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  borrowedBadgeText: { fontSize: 9, fontWeight: "700", color: colors.success, letterSpacing: 0.3 },
  // keeps reset button pinned to bottom even when there's no borrowed badge
  borrowedBadgeSpacer: { height: 1 },

  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.goldGlass,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 62,
    justifyContent: "center",
  },
  resetButtonDisabled: { opacity: 0.6 },
  resetButtonText: { fontSize: 10, fontWeight: "700", color: colors.gold },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingTop: 64 },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.bgBase,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  emptyTitle: { fontSize: 19, fontWeight: "800", color: colors.textPrimary },
  emptySubtitle: { marginTop: 8, textAlign: "center", fontSize: 13, color: colors.textSecondary, maxWidth: 280, lineHeight: 19 },
});