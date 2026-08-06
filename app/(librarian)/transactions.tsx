import { supabase } from "@/lib/supabaseClient";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View,} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowDown, ArrowDownLeft, ArrowUp, ArrowUpRight, CheckCircle2, FileClock, } from "lucide-react-native";

const colors = {
  bgBase: "#EEF1F7",
  bgElevated: "#FFFFFF",

  primary: "#164a2d",
  primaryDeep: "#0e3620",
  primaryGlass: "rgba(22,74,45,0.08)",
  primaryBorder: "rgba(22,74,45,0.16)",

  gold: "#B45309",
  goldGlass: "rgba(180,83,9,0.10)",
  goldBorder: "rgba(180,83,9,0.22)",

  success: "#1f9d55",
  successGlass: "rgba(31,157,85,0.12)",
  successBorder: "rgba(31,157,85,0.24)",

  textPrimary: "#0f172a",
  textSecondary: "#6B7280",
  textMuted: "#94a3b8",

  borderSoft: "rgba(15,23,42,0.06)",
  shadowDark: "#AEB8CC",
};

// ============================================================
// Types
// ============================================================
type TxStatus = "borrowed" | "returned";
type TxFilter = "all" | TxStatus;

interface Transaction {
  id: string;
  status: TxStatus;
  borrowed_at: string;
  returned_at: string | null;
  profiles: { full_name: string | null } | null;
  books: { title: string | null } | null;
}

type SortDirection = "desc" | "asc"; 

// ============================================================
// Card — plain solid elevated surface, no blur (see book-detail.tsx for why)
// ============================================================
function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.cardBase, style]}>{children}</View>;
}

// ============================================================
// Screen
// ============================================================
export default function TransactionsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeFilter, setActiveFilter] = useState<TxFilter>("all");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, status, borrowed_at, returned_at, profiles(full_name), books(title)")
        .order("borrowed_at", { ascending: false });

      if (error) throw error;
      setTransactions((data as unknown as Transaction[]) || []);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  // Filter logic: "all" shows everything, otherwise filter by status
  const filtered = useMemo(() => {
    const list =
      activeFilter === "all" ? transactions : transactions.filter((tx) => tx.status === activeFilter);

    // Sort by the most relevant date (returned_at if it exists, otherwise borrowed_at)
    const dateKey = (tx: Transaction) => tx.returned_at ?? tx.borrowed_at;

    return [...list].sort((a, b) => {
      const aTime = new Date(dateKey(a)).getTime();
      const bTime = new Date(dateKey(b)).getTime();
      return sortDir === "desc" ? bTime - aTime : aTime - bTime;
    });
  }, [transactions, activeFilter, sortDir]);

  const FILTERS: { key: TxFilter; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "All", icon: <FileClock size={12} /> },
    { key: "borrowed", label: "Borrowed", icon: <ArrowUpRight size={12} /> },
    { key: "returned", label: "Returned", icon: <ArrowDownLeft size={12} /> },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const datePart = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timePart = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${datePart} · ${timePart}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading transactions…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.headerWrap}>
        <Card style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerIconBadge}>
              <FileClock size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.headerTitle}>Transactions</Text>
              <Text style={styles.headerSubtitle}>Track borrowed and returned books</Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Toolbar — filter pills + sort, mirrors the Students screen toolbar */}
      <View style={styles.toolbarWrap}>
        <Card style={styles.toolbarCard}>
          <View style={styles.filterRow}>
            <View style={styles.filterPills}>
              {FILTERS.map((f) => {
                const active = activeFilter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    onPress={() => setActiveFilter(f.key)}
                    activeOpacity={0.85}
                    style={[styles.filterPill, active && styles.filterPillActive]}
                  >
                    {React.cloneElement(f.icon as React.ReactElement, {
                      color: active ? colors.bgElevated : colors.textSecondary,
                    })}
                    <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              activeOpacity={0.85}
              style={styles.sortButton}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              {sortDir === "desc" ? (
                <ArrowDown size={13} color={colors.primary} />
              ) : (
                <ArrowUp size={13} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </Card>
      </View>

      {/* Records count */}
      <View style={styles.recordsRow}>
        <Text style={styles.recordsLabel}>
          {filtered.length} {filtered.length === 1 ? "record" : "records"}
        </Text>
      </View>

      {/* List */}
      {filtered.length === 0 ? (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          renderItem={() => null}
          ListEmptyComponent={
            <Card style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                {activeFilter === "returned" ? (
                  <CheckCircle2 size={28} color={colors.textMuted} />
                ) : (
                  <FileClock size={28} color={colors.textMuted} />
                )}
              </View>
              <Text style={styles.emptyTitle}>No transactions found</Text>
              <Text style={styles.emptySubtitle}>
                {activeFilter === "borrowed"
                  ? "Nothing is currently checked out."
                  : activeFilter === "returned"
                  ? "Returned books will show up here."
                  : "Library activity will appear here."}
              </Text>
            </Card>
          }
        />
      ) : (
        <View style={styles.txListCard}>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.txListContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
            renderItem={({ item }) => <TransactionRow tx={item} formatDate={formatDate} />}
            ItemSeparatorComponent={() => <View style={styles.txRowDivider} />}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

// ============================================================
// Transaction Row — matches the Recent Activity row style used on the
// dashboard: a single list card with icon / info / date+status columns
// and a hairline divider between rows instead of separate cards.
// ============================================================
function TransactionRow({
  tx,
  formatDate,
}: {
  tx: Transaction;
  formatDate: (d: string) => string;
}) {
  const isBorrowed = tx.status === "borrowed";
  // If borrowed, show borrowed_at. If returned, show returned_at.
  const dateToShow = isBorrowed ? tx.borrowed_at : tx.returned_at ?? tx.borrowed_at;

  return (
    <View style={styles.txRow}>
      <View style={[styles.txIconWrap, isBorrowed ? styles.txIconWrapGold : styles.txIconWrapGreen]}>
        {isBorrowed ? (
          <ArrowUpRight size={17} color={colors.gold} />
        ) : (
          <ArrowDownLeft size={17} color={colors.success} />
        )}
      </View>

      <View style={styles.txInfo}>
        <Text style={styles.txTitle} numberOfLines={1}>
          {tx.books?.title || "Unknown Book"}
        </Text>
        <Text style={styles.txSubtitle} numberOfLines={1}>
          {tx.profiles?.full_name || "Unknown Student"}
        </Text>
        <Text style={styles.txDate}>{formatDate(dateToShow)}</Text>
      </View>

      <View style={styles.txRight}>
        <View style={[styles.txBadge, isBorrowed ? styles.txBadgeGold : styles.txBadgeGreen]}>
          <Text style={[styles.txBadgeText, { color: isBorrowed ? colors.gold : colors.success }]}>
            {isBorrowed ? "Borrowed" : "Returned"}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ============================================================
// Styles
// ============================================================
const styles = StyleSheet.create({
  cardBase: { backgroundColor: colors.bgElevated },

  screen: { flex: 1, backgroundColor: colors.bgBase },
  centerScreen: { flex: 1, backgroundColor: colors.bgBase, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, fontSize: 13, color: colors.textSecondary },

  // Header
  headerWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  headerCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 18,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  headerTopRow: { flexDirection: "row", alignItems: "center" },
  headerIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryGlass,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.2 },
  headerSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontWeight: "500" },

  // Toolbar — filter pills + sort, styled after the Students screen toolbar
  toolbarWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  toolbarCard: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    backgroundColor: colors.bgBase,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primaryDeep,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 2,
  },
  filterPillText: { fontSize: 10, fontWeight: "700", color: colors.textSecondary },
  filterPillTextActive: { color: colors.bgElevated },

  sortButton: {
    width: 27,
    height: 27,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgBase,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },

  // Records count
  recordsRow: { paddingHorizontal: 16, marginTop: 12, marginBottom: 10 },
  recordsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // List (empty state path)
  listContent: { paddingHorizontal: 16, paddingBottom: 40, flexGrow: 1 },

  // List (populated path) — one bordered card wrapping every row, like the
  // dashboard's Recent Activity list
  txListCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bgElevated,
    overflow: "hidden",
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
  },
  txListContent: { paddingHorizontal: 14, flexGrow: 1 },

  txRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  txRowDivider: { height: 1, backgroundColor: colors.borderSoft },
  txIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  txIconWrapGold: { backgroundColor: colors.goldGlass },
  txIconWrapGreen: { backgroundColor: colors.successGlass },

  txInfo: { flex: 1, paddingRight: 8 },
  txTitle: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  txSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  txRight: { alignItems: "flex-end" },
  txDate: { fontSize: 10, color: colors.textMuted, paddingTop: 7, },
  txBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  txBadgeGold: { backgroundColor: colors.goldGlass },
  txBadgeGreen: { backgroundColor: colors.successGlass },
  txBadgeText: { fontSize: 9, fontWeight: "800" },

  // Empty state
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderSoft,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bgBase,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: colors.textPrimary },
  emptySubtitle: { fontSize: 12.5, color: colors.textMuted, marginTop: 4, textAlign: "center", paddingHorizontal: 24 },
});