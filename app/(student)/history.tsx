import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/store/authStore";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, Clock3, ListFilter, Search, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Transaction {
  id: string;
  borrowed_at: string;
  due_date: string;
  returned_at: string | null;
  status: string;
  books: {
    title: string;
    author: string;
    cover_image_url: string | null;
    book_id: string;
  };
}

const colors = {
  bgBase: "#EEF1F7",
  bgBaseAlt: "#E6EBF5",
  glassStrong: "rgba(255,255,255,0.82)",
  glassBorder: "rgba(255,255,255,0.7)",
  primary: "#164a2d",
  primaryDark: "#0d2e1c",
  success: "#166534",
  successGlass: "rgba(22,101,52,0.10)",
  successBorder: "rgba(22,101,52,0.22)",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  textPrimary: "#1C1A16",
  shadowDark: "#AEB8CC",
  white: "#ffffff",
};

function GlassSurface({ style, children }: { style?: any; children?: React.ReactNode }) {
  return (
    <View style={[style, { backgroundColor: colors.glassStrong, overflow: "hidden" }]}>
      <LinearGradient
        colors={["rgba(255,255,255,0.55)", "rgba(255,255,255,0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.7 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

type StatusFilter = "all" | "active" | "returned";
type SortOrder = "none" | "asc" | "desc";

const FILTERS: { key: StatusFilter; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "All", icon: <ListFilter size={13} /> },
  { key: "active", label: "Active", icon: <Clock3 size={13} /> },
  { key: "returned", label: "Returned", icon: <CheckCircle2 size={13} /> },
];

export default function HistoryScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Search / filter / sort toolbar state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("none");

  const SortIcon = sortOrder === "asc" ? ArrowUp : sortOrder === "desc" ? ArrowDown : ArrowUpDown;

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    if (!session?.user) return;
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`id, borrowed_at, due_date, returned_at, status, books ( title, author, cover_image_url, book_id )`)
        .eq("student_id", session.user.id)
        .order("borrowed_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Cycle: all -> active -> returned -> all
  const cycleStatusFilter = () => {
    setStatusFilter((prev) =>
      prev === "all" ? "active" : prev === "active" ? "returned" : "all"
    );
  };

  // Cycle: none -> asc -> desc -> none
  const cycleSortOrder = () => {
    setSortOrder((prev) => (prev === "none" ? "asc" : prev === "asc" ? "desc" : "none"));
  };

  const displayedTransactions = useMemo(() => {
    let result = [...transactions];

    if (statusFilter !== "all") {
      result = result.filter((t) =>
        statusFilter === "returned" ? t.status === "returned" : t.status !== "returned"
      );
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((t) => t.books?.title?.toLowerCase().includes(q));
    }

    if (sortOrder !== "none") {
      result.sort((a, b) => {
        const diff = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        return sortOrder === "asc" ? diff : -diff;
      });
    }

    return result;
  }, [transactions, statusFilter, search, sortOrder]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#164a2d" />
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      {/* SAME IMAGE BACKGROUND HERO AS HOME */}
      <ImageBackground
        source={{ uri: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=1000&auto=format&fit=crop" }}
        style={{ minHeight: 120 }}
        className="rounded-b-[32px] overflow-hidden"
      >
        <View className="flex-1 bg-[#164a2d]/80">
          <SafeAreaView edges={["top"]}>
            <View className="flex-row justify-between items-center px-6 pt-3 pb-6">
              <View>
                <Text className="text-white text-2xl font-extrabold">History</Text>
                <Text className="text-white/70 text-sm font-medium mt-1">
                  Your complete borrowing timeline
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => router.replace("/profile")}
                className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/30 bg-white/10"
              >
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} className="w-full h-full" resizeMode="cover" />
                ) : (
                  <View className="w-full h-full items-center justify-center">
                    <Ionicons name="person" size={24} color="rgba(255,255,255,0.9)" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </ImageBackground>

      {/* TOOLBAR: search / filter / sort, top right */}
      <View style={styles.toolbarWrap}>
        <GlassSurface style={styles.toolbarCard}>
          <View style={styles.searchBar}>
            <Search size={14} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by book title"
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
                const active = statusFilter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    onPress={() => setStatusFilter(f.key)}
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
              style={[styles.sortButton, sortOrder !== "none" && styles.sortButtonActive]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <SortIcon size={13} color={sortOrder !== "none" ? colors.white : colors.primary} />
            </TouchableOpacity>
          </View>
        </GlassSurface>
      </View>

      <Text className="flex text-center text-xs text-slate-500 mt-64">This feature is currently under active development.</Text>

      {/* <FlatList
        data={displayedTransactions}
        keyExtractor={(item) => item.id}
        className="flex-1"
        contentContainerClassName="p-5 pt-4"
        contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center mt-24">
            <View className="bg-slate-100 p-6 rounded-full mb-5">
              <Ionicons name="time-outline" size={48} color="#94a3b8" />
            </View>
            <Text className="text-lg font-bold text-slate-800">
              {transactions.length === 0 ? "No History Yet" : "No Matches Found"}
            </Text>
            <Text className="text-sm text-slate-500 mt-2 text-center max-w-xs">
              {transactions.length === 0
                ? "Your borrowing and return history will show up here."
                : "Try a different search term or filter."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isReturned = item.status === "returned";

          return (
            <View className="flex-row items-start bg-white rounded-2xl p-3 border border-slate-200 shadow-sm mb-3">
              -------------- Book Cover ---------------
              {item.books?.cover_image_url ? (
                <Image
                  source={{ uri: item.books.cover_image_url }}
                  className="h-24 w-16 rounded-lg bg-slate-200"
                  resizeMode="cover"
                />
              ) : (
                <View className="h-24 w-16 rounded-lg bg-slate-100 items-center justify-center">
                  <Ionicons name="book-outline" size={24} color="#cbd5e1" />
                </View>
              )}

              --------------- Book Info ---------------
              <View className="flex-1 pl-3 pr-2">
                <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                  {item.books?.title || "Unknown Book"}
                </Text>
                <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                  {item.books?.author || "Unknown Author"}
                </Text>

                ----------------- Date Stack -----------------
                <View className="mt-2 space-y-1.5">
                  <View className="flex-row items-center">
                    <Ionicons name="calendar-outline" size={12} color="#94a3b8" />
                    <Text className="text-[11px] text-slate-500 ml-1.5">
                      Borrowed: {formatDate(item.borrowed_at)}
                    </Text>
                  </View>

                  {isReturned && item.returned_at ? (
                    <View className="flex-row items-center">
                      <Ionicons name="checkmark-done-outline" size={12} color="#10b981" />
                      <Text className="text-[11px] text-emerald-600 font-medium ml-1.5">
                        Returned: {formatDate(item.returned_at)}
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row items-center">
                      <Ionicons name="time-outline" size={12} color="#f59e0b" />
                      <Text className="text-[11px] text-amber-600 font-medium ml-1.5">
                        Due: {formatDate(item.due_date)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

             ----------------- Status Badge — normal flow, own column, so it never overlaps the title ----------
              <View
                className={`px-2.5 py-1 rounded-full border shrink-0 ${isReturned ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"
                  }`}
              >
                <Text
                  className={`text-[10px] font-bold uppercase tracking-wider ${isReturned ? "text-emerald-700" : "text-amber-700"
                    }`}
                >
                  {isReturned ? "Returned" : "Active"}
                </Text>
              </View>
            </View>
          );
        }}
      /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbarWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, backgroundColor: 'transparent' },
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
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  filterRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  filterPills: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  filterPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 1, borderColor: colors.successGlass,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  filterPillActive: {
    backgroundColor: colors.primary, borderColor: colors.primary,
    shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22, shadowRadius: 5, elevation: 2,
  },
  filterPillText: { fontSize: 11, fontWeight: "700", color: colors.textSecondary },
  filterPillTextActive: { color: colors.white },
  sortButton: {
    width: 27, height: 27, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 1, borderColor: colors.successGlass,
  },
  sortButtonActive: {
    backgroundColor: colors.primary, borderColor: colors.primary,
    shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22, shadowRadius: 5, elevation: 2,
  },
});