import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { BookOpen, Library, Trash2, Sparkles } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "@/lib/supabaseClient";
import { SafeAreaView } from "react-native-safe-area-context";

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

  danger: "#DC2626",
  dangerGlass: "rgba(220,38,38,0.08)",
  dangerBorder: "rgba(220,38,38,0.18)",

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

// Base width used to derive a gentle responsive scale factor — same
// technique as the tab bar: clamp so small phones shrink a little and
// large phones/tablets don't blow sizing out.
const BASE_WIDTH = 375;
function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

interface Book {
  id: string;
  book_id: string;
  title: string;
  author: string;
  category: string | null;
  publisher: string | null;
  isbn: string | null;
  cover_image_url: string | null;
  total_copies: number;
  available_copies: number;
}

export default function BooksScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const numColumns = isTablet ? 2 : 1;
  const scale = clamp(width / BASE_WIDTH, 0.9, 1.12);

  const responsive = useMemo(
    () => ({
      coverWidth: Math.round(92 * scale),
      coverHeight: Math.round(122 * scale),
      emptyIconSize: Math.round(96 * scale),
    }),
    [scale]
  );

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const availableTotal = useMemo(
    () => books.reduce((sum, b) => sum + (b.available_copies ?? 0), 0),
    [books]
  );

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBooks(data || []);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to fetch books");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  // Books are now added from the shared Add modal in the tab bar, which
  // lives outside this screen — refetch whenever this tab regains focus
  // so newly added titles show up without a manual pull-to-refresh.
  useFocusEffect(
    React.useCallback(() => {
      fetchBooks();
    }, [])
  );

  const handleDeleteBook = (book: Book) => {
    Alert.alert(
      "Delete Book",
      `Are you sure you want to delete "${book.title}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await supabase.storage
                .from("book-covers")
                .remove([
                  `${book.book_id}/cover.jpg`,
                  `${book.book_id}/cover.png`,
                  `${book.book_id}/cover.jpeg`,
                ]);

              const { error } = await supabase
                .from("books")
                .delete()
                .eq("id", book.id);

              if (error) throw error;

              setBooks((prev) => prev.filter((b) => b.id !== book.id));
              Alert.alert("Deleted", "Book removed from catalog.");
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to delete book.");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={[colors.bgBase, colors.bgBaseAlt]} style={StyleSheet.absoluteFill} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <LinearGradient colors={[colors.bgBase, colors.bgBaseAlt]} style={StyleSheet.absoluteFill} />

      {/* Header — distinct "floating glass card" style, deliberately
          different from the dashboard's own header treatment. */}
      <View style={[styles.headerWrap, isTablet && styles.headerWrapTablet]}>
        <GlassSurface tint="light" style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerIconBadge}>
              <Library size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.headerTitle}>Library Catalog</Text>
              <Text style={styles.headerSubtitle}>Browse and manage every title on record</Text>
            </View>
          </View>

          <View style={styles.headerStatsRow}>
            <View style={styles.statChip}>
              <BookOpen size={13} color={colors.primary} />
              <Text style={styles.statChipText}>
                {books.length} {books.length === 1 ? "Books" : "Books"}
              </Text>
            </View>
            <View style={[styles.statChip, styles.statChipSuccess]}>
              <Sparkles size={13} color={colors.success} />
              <Text style={[styles.statChipText, { color: colors.success }]}>
                {availableTotal} Available
              </Text>
            </View>
          </View>
        </GlassSurface>
      </View>

      <View style={[styles.bodyWrapper, isTablet && styles.bodyWrapperTablet]}>
        {books.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { width: responsive.emptyIconSize, height: responsive.emptyIconSize, borderRadius: responsive.emptyIconSize / 2 }]}>
              <Library size={Math.round(responsive.emptyIconSize * 0.42)} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Books Yet</Text>
            <Text style={styles.emptySubtitle}>
              Your library catalog is empty. Tap the + button below to add your first book.
            </Text>
          </View>
        ) : (
          <FlatList
            key={numColumns}
            data={books}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <Text style={styles.listHeaderText}>{books.length} Books in Catalog</Text>
            }
            renderItem={({ item }) => (
              <View style={[styles.cardOuter, numColumns > 1 && styles.cardOuterGrid]}>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: "/book-detail", params: { id: item.id } })}
                  activeOpacity={0.85}
                >
                  <GlassSurface tint="light" style={styles.card}>
                    <View style={styles.cardRow}>
                      {item.cover_image_url ? (
                        <Image
                          source={{ uri: item.cover_image_url }}
                          style={[styles.cover, { width: responsive.coverWidth, height: responsive.coverHeight }]}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.coverPlaceholder, { width: responsive.coverWidth, height: responsive.coverHeight }]}>
                          <BookOpen size={28} color={colors.textMuted} />
                        </View>
                      )}

                      <View style={styles.cardInfo}>
                        <View style={styles.cardTopRow}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={styles.bookTitle} numberOfLines={2}>
                              {item.title}
                            </Text>
                            <Text style={styles.bookAuthor} numberOfLines={1}>
                              {item.author}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleDeleteBook(item)}
                            style={styles.deleteButton}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Trash2 size={14} color={colors.danger} />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.badgeRow}>
                          <View style={styles.badgesLeft}>
                            <View style={styles.idBadge}>
                              <Text style={styles.idBadgeText}>{item.book_id}</Text>
                            </View>
                            {item.category && (
                              <View style={styles.categoryBadge}>
                                <Text style={styles.categoryBadgeText}>{item.category}</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.availabilityBadge}>
                            <View style={styles.availabilityDot} />
                            <Text style={styles.availabilityText}>
                              {item.available_copies}/{item.total_copies}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </GlassSurface>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// --- Screen Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bgBase },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center" },

  // New header: a single floating glass card instead of a full-bleed
  // gradient banner, so Books reads distinctly from the Dashboard.
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
    borderRadius: 12,
  },
  statChipSuccess: { backgroundColor: colors.bgBase, borderColor: colors.successGlass },
  statChipText: { fontSize: 11.5, fontWeight: "700", color: colors.primary },

  bodyWrapper: { flex: 1, width: "100%" },
  bodyWrapperTablet: { maxWidth: 720, alignSelf: "center" },

  listContent: { padding: 16, paddingTop: 14, paddingBottom: 40 },
  listHeaderText: { fontSize: 11, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 },
  columnWrapper: { justifyContent: "space-between" },

  cardOuter: {
    marginBottom: 14,
    borderRadius: 22,
    backgroundColor: colors.bgBase,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 9,
    elevation: 3,
  },
  cardOuterGrid: { width: "48.5%" },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 12,
  },
  cardRow: { flexDirection: "row" },
  cover: { borderRadius: 16, backgroundColor: "rgba(0,0,0,0.05)" },
  coverPlaceholder: {
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1, marginLeft: 14, justifyContent: "space-between" },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  bookTitle: { fontSize: 13, fontWeight: "700", color: colors.textPrimary, lineHeight: 19 },
  bookAuthor: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  deleteButton: {
    padding: 7,
    borderRadius: 10,
    backgroundColor: colors.dangerGlass,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    marginTop: -2,
  },

  badgeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  badgesLeft: { flexDirection: "row", alignItems: "center", flex: 1, flexWrap: "wrap", gap: 6 },
  idBadge: { backgroundColor: colors.bgBase, borderWidth: 1, borderColor: colors.bgBaseAlt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  idBadgeText: { fontSize: 10, fontWeight: "700", color: colors.textSecondary, letterSpacing: 0.3 },
  categoryBadge: { backgroundColor: colors.successGlass, borderWidth: 1, borderColor: colors.successBorder, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  categoryBadgeText: { fontSize: 10, fontWeight: "700", color: colors.success, letterSpacing: 0.3 },
  availabilityBadge: { flexDirection: "row", alignItems: "center", backgroundColor: colors.successGlass, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, marginLeft: 8 },
  availabilityDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success, marginRight: 6 },
  availabilityText: { fontSize: 11, fontWeight: "700", color: colors.success },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emptyIconWrap: {
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