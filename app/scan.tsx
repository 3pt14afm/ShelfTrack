import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
  StyleSheet,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/store/authStore";

// --- Viewfinder Dimensions ---
const WINDOW_WIDTH = Dimensions.get("window").width;
const WINDOW_HEIGHT = Dimensions.get("window").height;
const SQUARE_SIZE = 250;
const SIDE_MARGIN = (WINDOW_WIDTH - SQUARE_SIZE) / 2;
const TOP_MARGIN = WINDOW_HEIGHT * 0.2;
const BOTTOM_MARGIN = WINDOW_HEIGHT - TOP_MARGIN - SQUARE_SIZE;

// --- Types ---
type ScreenState = "menu" | "camera" | "confirm";
type ActionType = "borrow" | "return";

interface Book {
  id: string; 
  book_id: string; 
  title: string;
  author: string;
  cover_image_url: string | null;
  available_copies: number;
}

export default function ScanScreen() {
  const profile = useAuthStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);

  // UI State
  const [screen, setScreen] = useState<ScreenState>("menu");
  const [action, setAction] = useState<ActionType>("borrow");
  const [scannedBookId, setScannedBookId] = useState<string | null>(null);

  // Data State
  const [book, setBook] = useState<Book | null>(null);
  const [loadingBook, setLoadingBook] = useState(false);
  const [processingTx, setProcessingTx] = useState(false);

  // Camera State
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.status === "undetermined") {
      requestPermission();
    }
  }, [permission]);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (isScanning) return;
    setIsScanning(true);
    setScannedBookId(data);
    setScreen("confirm");
  };

  useEffect(() => {
    if (screen === "confirm" && scannedBookId) {
      fetchBookDetails();
    } else {
      setBook(null);
      setScannedBookId(null);
      setIsScanning(false);
    }
  }, [screen]);

  const fetchBookDetails = async () => {
    if (!scannedBookId) return;
    setLoadingBook(true);
    try {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("book_id", scannedBookId)
        .single();

      if (error) throw error;
      setBook(data);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not find a book with this QR code.", [
        { text: "OK", onPress: () => setScreen("menu") },
      ]);
    } finally {
      setLoadingBook(false);
    }
  };

  const handleConfirm = async () => {
    if (!book || !session?.user) return;
    setProcessingTx(true);

    try {
      if (action === "borrow") {
        if (book.available_copies <= 0) {
          throw new Error("This book has no available copies to borrow.");
        }

        // Check if student already borrowed this book
        const { data: existingTx, error: checkError } = await supabase
          .from("transactions")
          .select("id")
          .eq("student_id", session.user.id)
          .eq("book_id", book.id)
          .eq("status", "borrowed")
          .maybeSingle();

        if (checkError) throw checkError;
        
        if (existingTx) {
          throw new Error("You have already borrowed this book and haven't returned it yet.");
        }

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);

        const { error: txError } = await supabase.from("transactions").insert({
          book_id: book.id,
          student_id: session.user.id,
          status: "borrowed",
          borrowed_at: new Date().toISOString(),
          due_date: dueDate.toISOString(),
        });

        if (txError) throw txError;

        const { error: updateError } = await supabase
          .from("books")
          .update({ available_copies: book.available_copies - 1 })
          .eq("id", book.id);

        if (updateError) throw updateError;

        Alert.alert(
          "Success!",
          `You have borrowed "${book.title}".\nDue date: ${dueDate.toLocaleDateString()}`,
          [{ text: "Done", onPress: () => setScreen("menu") }]
        );

      } else if (action === "return") {
        const { data: txData, error: txError } = await supabase
          .from("transactions")
          .update({ status: "returned", returned_at: new Date().toISOString() })
          .eq("student_id", session.user.id)
          .eq("book_id", book.id)
          .eq("status", "borrowed")
          .select("id")
          .single();

        if (txError || !txData) {
          throw new Error("No active borrow record found for this book under your account.");
        }

        const { error: updateError } = await supabase
          .from("books")
          .update({ available_copies: book.available_copies + 1 })
          .eq("id", book.id);

        if (updateError) throw updateError;

        Alert.alert("Success!", `You have returned "${book.title}".`, [
          { text: "Done", onPress: () => setScreen("menu") },
        ]);
      }
    } catch (err: any) {
      Alert.alert("Transaction Failed", err.message);
    } finally {
      setProcessingTx(false);
    }
  };

  // -------------------------
  // RENDER: MENU SCREEN (Fixed for iOS)
  // -------------------------
  if (screen === "menu") {
    return (
      <SafeAreaView style={menuStyles.safeArea}>
        <View style={menuStyles.headerContainer}>
          <Text style={menuStyles.mainTitle}>Scan a Book</Text>
          <Text style={menuStyles.subTitle}>Choose an action to start scanning.</Text>
        </View>

        <View style={menuStyles.buttonContainer}>
          {/* Borrow Button */}
          <TouchableOpacity
            onPress={() => {
              setAction("borrow");
              setScreen("camera");
            }}
            activeOpacity={0.85}
            style={menuStyles.borrowButton}
          >
            <View style={menuStyles.iconBoxPrimary}>
              <Ionicons name="add-circle-outline" size={28} color="white" />
            </View>
            <View style={menuStyles.textContainer}>
              <Text style={menuStyles.buttonTitlePrimary}>Borrow Book</Text>
              <Text style={menuStyles.buttonSubtitlePrimary}>Scan QR to borrow a book</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          {/* Return Button */}
          <TouchableOpacity
            onPress={() => {
              setAction("return");
              setScreen("camera");
            }}
            activeOpacity={0.85}
            style={menuStyles.returnButton}
          >
            <View style={menuStyles.iconBoxSecondary}>
              <Ionicons name="return-down-back-outline" size={28} color="#164a2d" />
            </View>
            <View style={menuStyles.textContainer}>
              <Text style={menuStyles.buttonTitleSecondary}>Return Book</Text>
              <Text style={menuStyles.buttonSubtitleSecondary}>Scan QR to return a book</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="rgba(0,0,0,0.3)" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // -------------------------
  // RENDER: CAMERA SCREEN
  // -------------------------
  if (screen === "camera") {
    if (!permission || (!permission.granted && permission.status === "undetermined")) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="white" />
        </View>
      );
    }

    if (!permission.granted && permission.status === "denied") {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="camera-outline" size={64} color="#9ca3af" />
          <Text style={styles.errorTitle}>Camera Access Required</Text>
          <Text style={styles.errorText}>
            Please enable camera permissions in your settings to scan books.
          </Text>
          <TouchableOpacity onPress={() => setScreen("menu")} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, backgroundColor: "black" }}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        />

        <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: TOP_MARGIN, backgroundColor: "rgba(0,0,0,0.6)" }} />
        <View style={{ position: "absolute", top: TOP_MARGIN, left: 0, width: SIDE_MARGIN, bottom: BOTTOM_MARGIN, backgroundColor: "rgba(0,0,0,0.6)" }} />
        <View style={{ position: "absolute", top: TOP_MARGIN, right: 0, width: SIDE_MARGIN, bottom: BOTTOM_MARGIN, backgroundColor: "rgba(0,0,0,0.6)" }} />
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: BOTTOM_MARGIN, backgroundColor: "rgba(0,0,0,0.6)" }} />

        <View style={{ position: "absolute", top: TOP_MARGIN, left: SIDE_MARGIN, width: SQUARE_SIZE, height: SQUARE_SIZE, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", borderRadius: 12 }} />

        <View style={[styles.corner, { top: TOP_MARGIN - 2, left: SIDE_MARGIN - 2, borderTopWidth: 4, borderLeftWidth: 4 }]} />
        <View style={[styles.corner, { top: TOP_MARGIN - 2, right: SIDE_MARGIN - 2, borderTopWidth: 4, borderRightWidth: 4 }]} />
        <View style={[styles.corner, { bottom: BOTTOM_MARGIN - 2, left: SIDE_MARGIN - 2, borderBottomWidth: 4, borderLeftWidth: 4 }]} />
        <View style={[styles.corner, { bottom: BOTTOM_MARGIN - 2, right: SIDE_MARGIN - 2, borderBottomWidth: 4, borderRightWidth: 4 }]} />

        <View style={{ position: "absolute", top: 60, left: 0, right: 0, alignItems: "center" }}>
          <Text style={{ color: "white", fontSize: 18, fontWeight: "700" }}>
            Scan {action === "borrow" ? "Book to Borrow" : "Book to Return"}
          </Text>
        </View>

        <View style={{ position: "absolute", bottom: 60, left: 0, right: 0, alignItems: "center" }}>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginBottom: 20 }}>
            Fit the QR code inside the square
          </Text>
          <TouchableOpacity onPress={() => setScreen("menu")} style={{ backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 999 }}>
            <Text style={{ color: "white", fontWeight: "600" }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // -------------------------
  // RENDER: CONFIRM SCREEN
  // -------------------------
  if (screen === "confirm") {
    if (loadingBook) {
      return (
        <SafeAreaView style={confirmStyles.container}>
          <ActivityIndicator size="large" color="#164a2d" />
          <Text style={confirmStyles.loadingText}>Looking up book...</Text>
        </SafeAreaView>
      );
    }

    if (!book) return null;

    const isUnavailable = action === "borrow" && book.available_copies <= 0;

    return (
      <SafeAreaView style={confirmStyles.safeArea}>
        <ScrollView 
          style={confirmStyles.scrollView} 
          contentContainerStyle={confirmStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={confirmStyles.headerRow}>
            <TouchableOpacity onPress={() => setScreen("menu")}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={confirmStyles.headerTitle}>
              {action === "borrow" ? "Confirm Borrow" : "Confirm Return"}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={confirmStyles.bookCard}>
            {book.cover_image_url ? (
              <Image source={{ uri: book.cover_image_url }} style={confirmStyles.bookCover} resizeMode="cover" />
            ) : (
              <View style={confirmStyles.bookCoverPlaceholder}>
                <Ionicons name="book-outline" size={32} color="#9ca3af" />
              </View>
            )}
            <View style={confirmStyles.bookInfo}>
              <Text style={confirmStyles.bookTitle} numberOfLines={2}>{book.title}</Text>
              <Text style={confirmStyles.bookAuthor}>{book.author}</Text>
              <Text style={confirmStyles.bookCode}>Code: {book.book_id}</Text>
            </View>
          </View>

          <View style={confirmStyles.card}>
            <Text style={confirmStyles.cardTitle}>Borrower Details</Text>
            <View style={confirmStyles.infoRowBorder}>
              <Text style={confirmStyles.infoLabel}>Student Name</Text>
              <Text style={confirmStyles.infoValue}>{profile?.full_name || "N/A"}</Text>
            </View>
            <View style={confirmStyles.infoRow}>
              <Text style={confirmStyles.infoLabel}>Student ID</Text>
              <Text style={confirmStyles.infoValue}>{profile?.student_id || "N/A"}</Text>
            </View>
          </View>

          {isUnavailable && (
            <View style={confirmStyles.warningBox}>
              <Ionicons name="alert-circle" size={24} color="#dc2626" />
              <Text style={confirmStyles.warningText}>
                This book currently has 0 available copies and cannot be borrowed.
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleConfirm}
            disabled={isUnavailable || processingTx}
            style={[confirmStyles.actionButton, isUnavailable && confirmStyles.actionButtonDisabled]}
          >
            {processingTx ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons 
                  name={action === "borrow" ? "checkmark-circle-outline" : "return-down-back-outline"} 
                  size={20} 
                  color={isUnavailable ? "#9ca3af" : "white"} 
                />
                <Text style={[confirmStyles.actionButtonText, isUnavailable && confirmStyles.actionButtonTextDisabled]}>
                  {isUnavailable ? "Unavailable" : `Confirm ${action === "borrow" ? "Borrow" : "Return"}`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

// --- iOS Friendly Menu Button Styles ---
const menuStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  headerContainer: {
    paddingHorizontal: 24,
    marginTop: 24,
    marginBottom: 12,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  subTitle: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 6,
  },
  buttonContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    gap: 16,
  },
  borrowButton: {
    backgroundColor: "#164a2d",
    borderRadius: 20,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    // Proper iOS Shadow
    shadowColor: "#164a2d",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8, 
  },
  returnButton: {
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#164a2d",
    borderRadius: 20,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    // Subtle iOS Shadow for white cards
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2, 
  },
  iconBoxPrimary: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },
  iconBoxSecondary: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#f0fdf4", // Very light green background
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },
  textContainer: {
    flex: 1,
  },
  buttonTitlePrimary: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
  },
  buttonSubtitlePrimary: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
  buttonTitleSecondary: {
    fontSize: 20,
    fontWeight: "700",
    color: "#164a2d",
  },
  buttonSubtitleSecondary: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
});


// --- Styles for Camera Viewfinder ---
const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorTitle: {
    color: "white",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 8,
  },
  errorText: {
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  backButton: {
    backgroundColor: "#164a2d",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  backButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#164a2d",
    borderRadius: 4,
  },
});

// --- Standard Styles for Confirm Screen ---
const confirmStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  container: {
    flex: 1,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    color: "#6b7280",
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  bookCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  bookCover: {
    width: 96,
    height: 144,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
  },
  bookCoverPlaceholder: {
    width: 96,
    height: 144,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  bookInfo: {
    flex: 1,
    justifyContent: "center",
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  bookAuthor: {
    fontSize: 14,
    color: "#4b5563",
    marginTop: 4,
  },
  bookCode: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 8,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  infoRowBorder: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f9fafb",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
  },
  warningBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  warningText: {
    fontSize: 14,
    color: "#b91c1c",
    marginLeft: 12,
    flex: 1,
  },
  actionButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: "#164a2d",
  },
  actionButtonDisabled: {
    backgroundColor: "#d1d5db",
    elevation: 0,
    shadowOpacity: 0,
  },
  actionButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 18,
    marginLeft: 8,
  },
  actionButtonTextDisabled: {
    color: "#6b7280",
  },
});