import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  RefreshControl,
  StyleSheet,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  QrCode,
  Tag,
  Minus,
  Plus,
  AlertCircle,
  Layers,
  Building2,
  Hash,
  Users,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  Share2,
  X,
  BookMarked,
  Sparkles,
} from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { supabase } from "@/lib/supabaseClient";
import { SafeAreaView } from "react-native-safe-area-context";

// --- Design tokens ---
// Kept consistent with the palette already used on the Students / Books
// screens (deep green primary, warm gold accent) and extended with the
// glass + neumorphic tokens this screen needs.
const colors = {
  bgBase: "#F2F6F3",
  bgElevated: "#FFFFFF",

  primary: "#164a2d",
  primaryDeep: "#0e3620",
  primaryGlass: "rgba(22,74,45,0.08)",
  primaryBorder: "rgba(22,74,45,0.16)",

  gold: "#b8873a",
  goldGlass: "rgba(184,135,58,0.12)",
  goldBorder: "rgba(184,135,58,0.28)",

  success: "#1f9d55",
  successGlass: "rgba(31,157,85,0.12)",
  successBorder: "rgba(31,157,85,0.24)",

  danger: "#dc2626",
  dangerGlass: "rgba(220,38,38,0.10)",
  dangerBorder: "rgba(220,38,38,0.22)",

  warning: "#d97706",
  warningGlass: "rgba(217,119,6,0.12)",
  warningBorder: "rgba(217,119,6,0.24)",

  textPrimary: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#94a3b8",

  glassBorder: "rgba(255,255,255,0.55)",
  glassBorderSoft: "rgba(15,23,42,0.06)",
  shadowDark: "#0b1f14",

  // Neumorphic bevel — light catches the top-left, shadow pools bottom-right.
  neuHighlight: "rgba(255,255,255,0.9)",
  neuShadowEdge: "rgba(163,177,198,0.45)",
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getInitials = (name: string | null) => {
  if (!name) return "?";
  const names = name.split(" ");
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

const getAvatarColor = (name: string | null) => {
  const palette = ["#4f46e5", "#0ea5e9", "#10b981", "#b8873a", "#dc2626", "#8b5cf6"];
  if (!name) return colors.textMuted;
  const charCode = name.charCodeAt(0);
  return palette[charCode % palette.length];
};

// --- Card surface ---
// Plain, solid elevated card — no blur. BlurView doesn't render translucent
// on most Android devices (falls back to a flat fill), so a frosted-glass
// look there just reads as a plain box with a muddy halo around it. This
// keeps the same rounded, soft-shadow "lifted off the page" language
// without relying on blur to sell it.
function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.cardBase, style]}>{children}</View>;
}

// --- Types ---
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

interface Borrower {
  id: string;
  borrowed_at: string;
  due_date: string;
  profiles: {
    full_name: string | null;
    student_id: string | null;
    grade_level: string | null;
  };
}

// --- Component ---
export default function BookDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [book, setBook] = useState<Book | null>(null);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const [updatingCopies, setUpdatingCopies] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const qrRef = useRef<any>(null);

  const fetchBookDetails = async (isRefresh = false) => {
    if (!id) {
      if (!isRefresh) {
        setLoading(false);
        setError("Book ID is missing.");
      }
      return;
    }

    if (!isRefresh) setLoading(true);

    try {
      const { data: bookData, error: bookError } = await supabase
        .from("books")
        .select("*")
        .eq("id", id)
        .single();

      if (bookError) throw bookError;

      const { data: transactionData, error: txError } = await supabase
        .from("transactions")
        .select(`
          id,
          borrowed_at,
          due_date,
          profiles (
            full_name,
            student_id,
            grade_level
          )
        `)
        .eq("book_id", id)
        .eq("status", "borrowed");

      if (txError) throw txError;

      setBook(bookData);
      setBorrowers(transactionData || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load book details");
    } finally {
      if (!isRefresh) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookDetails();
  }, [id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBookDetails(true);
    setRefreshing(false);
  };

  const sortedBorrowers = [...borrowers].sort((a, b) => {
    const timeA = new Date(a.borrowed_at).getTime();
    const timeB = new Date(b.borrowed_at).getTime();
    return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
  });

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
  };

  // ---------------------------------------------------------
  // Manage Copies Logic
  // ---------------------------------------------------------
  const handleAdjustCopies = async (delta: number) => {
    if (!book || updatingCopies) return;

    const borrowedCount = borrowers.length;
    const newTotal = book.total_copies + delta;

    if (newTotal < 0) return;

    if (newTotal < borrowedCount) {
      Alert.alert(
        "Cannot Remove Copy",
        `${borrowedCount} ${borrowers.length === 1 ? "copy is" : "copies are"} currently checked out. The total cannot drop below active loans.`,
        [{ text: "Understood", style: "default" }]
      );
      return;
    }

    const newAvailable = newTotal - borrowedCount;
    const previousBook = book;

    setBook({ ...book, total_copies: newTotal, available_copies: newAvailable });
    setUpdatingCopies(true);

    try {
      const { error: updateError } = await supabase
        .from("books")
        .update({ total_copies: newTotal, available_copies: newAvailable })
        .eq("id", book.id);

      if (updateError) throw updateError;
    } catch (err: any) {
      setBook(previousBook);
      Alert.alert("Update Failed", err.message || "Something went wrong.");
    } finally {
      setUpdatingCopies(false);
    }
  };

  // --- QR Code Handlers ---
  const getQrBase64 = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!qrRef.current) return reject(new Error("QR Code not ready"));

      qrRef.current.toDataURL((data: string) => {
        if (data) {
          resolve(data.replace(/^data:image\/[a-z]+;base64,/, ""));
        } else {
          reject(new Error("Failed to generate QR code data."));
        }
      });
    });
  };

  const handleDownloadQR = async () => {
    if (!book) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Limited",
          "Direct download isn't available. Would you like to share it instead?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Share", onPress: handleShareQR },
          ]
        );
        return;
      }

      const base64Data = await getQrBase64();
      const fileUri = `${FileSystem.cacheDirectory}book_${book.book_id}_qr.png`;

      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const asset = await MediaLibrary.createAssetAsync(fileUri);
      await MediaLibrary.createAlbumAsync("ShelfTrack", asset, false).catch(() => {});
      await FileSystem.deleteAsync(fileUri, { idempotent: true });

      Alert.alert("Success", "QR code saved to gallery!");
      setQrModalVisible(false);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to download QR code.");
    }
  };

  const handleShareQR = async () => {
    if (!book) return;
    try {
      const base64Data = await getQrBase64();
      const fileUri = `${FileSystem.cacheDirectory}book_${book.book_id}_qr.png`;

      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(fileUri, {
        mimeType: "image/png",
        dialogTitle: "Save or Share QR Code",
      });
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to share QR code.");
    }
  };

  // --- Loading & Error States ---
  if (loading) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.centerScreen, { padding: 24 }]}>
        <View style={styles.errorIconWrap}>
          <AlertCircle size={40} color={colors.danger} />
        </View>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => fetchBookDetails()} style={styles.retryButton} activeOpacity={0.85}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!book) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <Text style={styles.notFoundText}>Book not found.</Text>
      </SafeAreaView>
    );
  }

  const atMinCopies = book.total_copies <= borrowers.length;

  // --- Main Render ---
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {/* Glass header, consistent with Students / Library Catalog */}
      <View style={styles.headerWrap}>
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerIconButton} activeOpacity={0.75}>
              <ArrowLeft size={20} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Book Details</Text>
            <TouchableOpacity
              onPress={() => setQrModalVisible(true)}
              style={[styles.headerIconButton, styles.headerIconButtonGold]}
              activeOpacity={0.75}
            >
              <QrCode size={19} color={colors.gold} />
            </TouchableOpacity>
          </View>
        </Card>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero: cover + title + quick stats */}
        <Card style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.coverFrame}>
              {book.cover_image_url ? (
                <Image source={{ uri: book.cover_image_url }} style={styles.coverImage} resizeMode="cover" />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <BookMarked size={32} color={colors.textMuted} />
                </View>
              )}
            </View>

            <View style={styles.heroInfo}>
              <Text style={styles.bookTitle} numberOfLines={3}>
                {book.title}
              </Text>
              <Text style={styles.bookAuthor} numberOfLines={1}>
                {book.author}
              </Text>

              <View style={styles.idChip}>
                <Tag size={11} color={colors.textSecondary} />
                <Text style={styles.idChipText}>{book.book_id}</Text>
              </View>

              <View style={styles.heroFooterRow}>
                <View style={styles.statChip}>
                  <Sparkles size={12} color={colors.success} />
                  <Text style={[styles.statChipText, { color: colors.success }]}>
                    {book.available_copies} Available
                  </Text>
                </View>
                <View style={[styles.statChip, styles.statChipGold]}>
                  <Users size={12} color={colors.gold} />
                  <Text style={[styles.statChipText, { color: colors.gold }]}>{borrowers.length} Borrowed</Text>
                </View>
              </View>
            </View>
          </View>

          
        </Card>

        {/* Manage Copies — neumorphic stepper */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Manage Copies</Text>
          <Text style={styles.sectionSubtitle}>Adjust stock levels. Borrowed copies are protected.</Text>

          <View style={styles.stepperRow}>
            <TouchableOpacity
              onPress={() => handleAdjustCopies(-1)}
              disabled={updatingCopies || atMinCopies}
              style={[styles.neuButton, (updatingCopies || atMinCopies) && styles.neuButtonDisabled]}
              activeOpacity={0.8}
            >
              <View style={styles.neuButtonBevel}>
                <Minus size={22} color={colors.textPrimary} />
              </View>
            </TouchableOpacity>

            <View style={styles.stepperCenter}>
              {updatingCopies ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Text style={styles.stepperValue}>{book.total_copies}</Text>
              )}
              <Text style={styles.stepperLabel}>Total Copies</Text>
            </View>

            <TouchableOpacity
              onPress={() => handleAdjustCopies(1)}
              disabled={updatingCopies}
              style={[styles.neuButton, styles.neuButtonPrimary, updatingCopies && styles.neuButtonDisabled]}
              activeOpacity={0.8}
            >
              <View style={[styles.neuButtonBevel, styles.neuButtonBevelPrimary]}>
                <Plus size={22} color={colors.bgElevated} />
              </View>
            </TouchableOpacity>
          </View>

          {atMinCopies && borrowers.length > 0 && (
            <View style={styles.warningBanner}>
              <AlertCircle size={15} color={colors.warning} />
              <Text style={styles.warningBannerText}>
                All copies are currently checked out. Removal is disabled.
              </Text>
            </View>
          )}
        </Card>

        {/* Book Information */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Book Information</Text>

          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <View style={styles.infoLabelGroup}>
                <Layers size={14} color={colors.textMuted} />
                <Text style={styles.infoLabel}>Category</Text>
              </View>
              <Text style={styles.infoValue}>{book.category || "N/A"}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoLabelGroup}>
                <Building2 size={14} color={colors.textMuted} />
                <Text style={styles.infoLabel}>Publisher</Text>
              </View>
              <Text style={styles.infoValue}>{book.publisher || "N/A"}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoLabelGroup}>
                <Hash size={14} color={colors.textMuted} />
                <Text style={styles.infoLabel}>ISBN</Text>
              </View>
              <Text style={styles.infoValue}>{book.isbn || "N/A"}</Text>
            </View>
          </View>
        </Card>

        {/* Active Borrowers */}
        <View style={styles.borrowersHeaderRow}>
          <Text style={styles.borrowersTitle}>Active Borrowers ({borrowers.length})</Text>

          {borrowers.length > 1 && (
            <TouchableOpacity onPress={toggleSortOrder} style={styles.sortButton} activeOpacity={0.8}>
              {sortOrder === "desc" ? (
                <ArrowDown size={13} color={colors.primary} />
              ) : (
                <ArrowUp size={13} color={colors.primary} />
              )}
              <Text style={styles.sortButtonText}>{sortOrder === "desc" ? "Newest" : "Oldest"}</Text>
            </TouchableOpacity>
          )}
        </View>

        {borrowers.length === 0 ? (
          <Card style={styles.emptyBorrowers}>
            <View style={styles.emptyIconWrap}>
              <CheckCircle2 size={36} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Active Borrowers</Text>
            <Text style={styles.emptySubtitle}>All copies are currently on the shelf.</Text>
          </Card>
        ) : (
          <View style={{ gap: 10 }}>
            {sortedBorrowers.map((item) => {
              const isOverdue = new Date(item.due_date) < new Date();
              const avatarColor = getAvatarColor(item.profiles?.full_name);

              return (
                <Card key={item.id} style={styles.borrowerCard}>
                  <View style={styles.borrowerRow}>
                    <View
                      style={[
                        styles.borrowerAvatar,
                        { backgroundColor: avatarColor + "22", borderColor: avatarColor + "33" },
                      ]}
                    >
                      <Text style={[styles.borrowerAvatarText, { color: avatarColor }]}>
                        {getInitials(item.profiles?.full_name)}
                      </Text>
                    </View>

                    <View style={styles.borrowerInfo}>
                      <Text style={styles.borrowerName} numberOfLines={1}>
                        {item.profiles?.full_name || "Unknown Student"}
                      </Text>
                      <Text style={styles.borrowerMeta}>
                        {item.profiles?.student_id || "N/A"}
                        {item.profiles?.grade_level ? `  •  Grade ${item.profiles.grade_level}` : ""}
                      </Text>
                      <Text style={styles.borrowerDate}>Borrowed {formatDate(item.borrowed_at)}</Text>
                    </View>

                    <View style={styles.borrowerRight}>
                      <View
                        style={[
                          styles.dueBadge,
                          isOverdue ? styles.dueBadgeOverdue : styles.dueBadgeUpcoming,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dueBadgeText,
                            { color: isOverdue ? colors.danger : colors.warning },
                          ]}
                        >
                          {isOverdue ? "Overdue" : "Due"}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.dueDate,
                          isOverdue && { color: colors.danger },
                        ]}
                      >
                        {formatDate(item.due_date)}
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* QR Code Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={qrModalVisible}
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Card style={styles.qrModalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Book QR Code</Text>
              <TouchableOpacity
                onPress={() => setQrModalVisible(false)}
                style={styles.modalCloseButton}
                activeOpacity={0.8}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.qrFrame}>
              <QRCode
                value={book.book_id}
                size={190}
                color={colors.textPrimary}
                getRef={(c) => (qrRef.current = c)}
              />
              <Text style={styles.qrBookTitle} numberOfLines={2}>
                {book.title}
              </Text>
              <Text style={styles.qrBookId}>ID: {book.book_id}</Text>
            </View>

            <TouchableOpacity onPress={handleDownloadQR} style={styles.primaryModalButton} activeOpacity={0.9}>
              <Download size={18} color={colors.bgElevated} />
              <Text style={styles.primaryModalButtonText}>Save to Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleShareQR} style={styles.secondaryModalButton} activeOpacity={0.85}>
              <Share2 size={18} color={colors.primary} />
              <Text style={styles.secondaryModalButtonText}>Share via Sheet</Text>
            </TouchableOpacity>

            <Text style={styles.modalHint}>If download fails, use Share instead.</Text>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  cardBase: { backgroundColor: colors.bgElevated },

  screen: { flex: 1, backgroundColor: colors.bgBase },
  centerScreen: { flex: 1, backgroundColor: colors.bgBase, alignItems: "center", justifyContent: "center" },

  scrollContent: { padding: 16, paddingBottom: 40 },

  // Header
  headerWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    paddingVertical: 8,
    paddingHorizontal: 10,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 15, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.1 },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgBase,
    borderWidth: 1,
    borderColor: colors.successGlass,
  },
  headerIconButtonGold: { backgroundColor: colors.goldGlass, borderColor: colors.goldBorder },

  // Hero
  heroCard: {
    marginTop: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    padding: 16,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 3,
  },
  heroRow: { flexDirection: "row" },
  coverFrame: {
    width: 104,
    height: 148,
    borderRadius: 16,
    marginRight: 14,
    backgroundColor: colors.bgElevated,
    shadowColor: colors.neuShadowEdge,
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderTopColor: colors.neuHighlight,
    borderLeftColor: colors.neuHighlight,
    borderRightColor: colors.glassBorderSoft,
    borderBottomColor: colors.glassBorderSoft,
    overflow: "hidden",
  },
  coverImage: { width: "100%", height: "100%" },
  coverPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F1EA" },

  heroInfo: { flex: 1, justifyContent: "center" },
  bookTitle: { fontSize: 16, fontWeight: "800", color: colors.textPrimary, lineHeight: 23 },
  bookAuthor: { fontSize: 12, color: colors.textSecondary, marginTop: 4, fontWeight: "500" },
  idChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: colors.glassBorderSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 10,
  },
  idChipText: { fontSize: 10, fontWeight: "700", color: colors.textSecondary, letterSpacing: 0.2 },

  heroFooterRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: "auto", },

  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.successGlass,
    borderWidth: 1,
    borderColor: colors.successBorder,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statChipGold: { backgroundColor: colors.goldGlass, borderColor: colors.goldBorder },
  statChipText: { fontSize: 10, fontWeight: "700" },

  // Section cards
  sectionCard: {
    marginTop: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    padding: 18,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: colors.textPrimary },
  sectionSubtitle: { fontSize: 11, color: colors.textMuted, marginTop: 3, marginBottom: 6 },

  // Neumorphic stepper
  stepperRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 8, gap: 22 },
  neuButton: { borderRadius: 27 },
  neuButtonDisabled: { opacity: 0.4 },
  neuButtonBevel: {
    width: 40,
    height: 40,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgBase,
    borderWidth: 1.5,
    borderTopColor: colors.neuHighlight,
    borderLeftColor: colors.neuHighlight,
    borderRightColor: colors.bgBase,
    borderBottomColor: colors.bgBase,
    shadowColor: colors.bgBase,
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 4,
  },
  neuButtonPrimary: {},
  neuButtonBevelPrimary: {
    backgroundColor: colors.primary,
    borderTopColor: "rgba(255,255,255,0.35)",
    borderLeftColor: "rgba(255,255,255,0.35)",
    borderRightColor: colors.primaryGlass,
    borderBottomColor: colors.primaryGlass,
    shadowColor: colors.primaryGlass,
  },
  stepperCenter: { alignItems: "center", width: 76 },
  stepperValue: { fontSize: 30, fontWeight: "800", color: colors.textPrimary },
  stepperLabel: { fontSize: 10, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 },

  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.warningGlass,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  warningBannerText: { fontSize: 11.5, color: colors.warning, flex: 1, fontWeight: "600" },

  // Info list
  infoList: { marginTop: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },
  infoLabelGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: "500" },
  infoValue: { fontSize: 11, fontWeight: "700", color: colors.textPrimary },
  infoDivider: { height: 1, backgroundColor: colors.glassBorderSoft },

  // Borrowers
  borrowersHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 10,
  },
  borrowersTitle: { fontSize: 13, fontWeight: "800", color: colors.textPrimary },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryGlass,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  sortButtonText: { fontSize: 10, fontWeight: "700", color: colors.primary },

  emptyBorrowers: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    paddingVertical: 34,
    alignItems: "center",
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryGlass,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  emptySubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: "center" },

  borrowerCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    padding: 14,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  borrowerRow: { flexDirection: "row", alignItems: "flex-start" },
  borrowerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  borrowerAvatarText: { fontSize: 15, fontWeight: "800" },
  borrowerInfo: { flex: 1, paddingRight: 8 },
  borrowerName: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  borrowerMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  borrowerDate: { fontSize: 10, color: colors.textMuted, marginTop: 3 },
  borrowerRight: { alignItems: "flex-end" },
  dueBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, },
  dueBadgeOverdue: { backgroundColor: colors.dangerGlass },
  dueBadgeUpcoming: { backgroundColor: colors.warningGlass },
  dueBadgeText: { fontSize: 10, fontWeight: "800" },
  dueDate: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginTop: 12},

  // Error / not-found states
  errorIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.dangerGlass,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  errorText: { fontSize: 15, color: colors.textSecondary, textAlign: "center", fontWeight: "500" },
  retryButton: { marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 999 },
  retryButtonText: { color: colors.bgElevated, fontWeight: "700", fontSize: 13 },
  notFoundText: { fontSize: 15, color: colors.textSecondary },

  // QR Modal
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(11,31,20,0.55)",
  },
  qrModalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    padding: 20,
    alignItems: "center",
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 8,
  },
  modalHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 18 },
  modalTitle: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glassBorderSoft,
  },
  qrFrame: {
    width: "100%",
    backgroundColor: colors.bgElevated,
    padding: 22,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 18,
    borderWidth: 1.5,
    borderTopColor: colors.bgBase,
    borderLeftColor: colors.bgBase,
    borderRightColor: colors.neuShadowEdge,
    borderBottomColor: colors.neuShadowEdge,
    shadowColor: colors.neuShadowEdge,
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  qrBookTitle: { fontSize: 13, fontWeight: "700", color: colors.textPrimary, marginTop: 16, textAlign: "center" },
  qrBookId: { fontSize: 11, fontWeight: "700", color: colors.primary, marginTop: 4, letterSpacing: 0.4 },

  primaryModalButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 14,
  },
  primaryModalButtonText: { color: colors.bgElevated, fontWeight: "700", fontSize: 13 },

  secondaryModalButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primaryGlass,
    borderWidth: 1,
    borderColor: colors.successGlass,
    paddingVertical: 8,
    borderRadius: 14,
    marginTop: 10,
  },
  secondaryModalButtonText: { color: colors.primary, fontWeight: "700", fontSize: 13 },

  modalHint: { fontSize: 10.5, color: colors.textMuted, textAlign: "center", marginTop: 10 },
});