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
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing"; 
import { supabase } from "@/lib/supabaseClient";
import { SafeAreaView } from "react-native-safe-area-context"; // Added Safe Area import

// --- Constants & Utilities ---
const COLORS = {
  primary: "#164a2d",
  white: "#ffffff",
  bgGray: "#f9fafb",
  textDark: "#111827",
  textMedium: "#4b5563",
  textLight: "#6b7280",
  textMuted: "#9ca3af",
  border: "#f3f4f6",
  errorRed: "#ef4444",
  warningAmber: "#d97706",
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // QR Code Modal State & Ref
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
    let isMounted = true;

    const loadData = async () => {
      await fetchBookDetails();
    };

    if (isMounted) loadData();

    return () => {
      isMounted = false;
    };
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

  // --- Dual Approach QR Handlers ---
  const getQrBase64 = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!qrRef.current) return reject(new Error("QR Code not ready"));

      qrRef.current.toDataURL((data: string) => {
        if (data) {
          const rawBase64 = data.replace(/^data:image\/[a-z]+;base64,/, "");
          resolve(rawBase64);
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
          "Direct download isn't available in Expo Go. Would you like to share it instead?",
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

      Alert.alert("Success", "QR code downloaded to your phone's gallery!");
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

  // --- Loading State ---
  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white p-6">
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.errorRed} />
        <Text className="mt-4 text-gray-700 text-center">{error}</Text>
        <TouchableOpacity
          onPress={() => fetchBookDetails()}
          className="mt-6 bg-[#164a2d] px-6 py-3 rounded-xl shadow-sm"
        >
          <Text className="text-white font-semibold">Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!book) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white p-6">
        <Text className="text-lg text-gray-800">Book not found.</Text>
      </SafeAreaView>
    );
  }

  // --- Main Render ---
  return (
    // Wrapped in SafeAreaView, moved bg-gray-50 here
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1 p-4" // Removed bg-gray-50 from here
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Book Header Card */}
        <View className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 flex-row">
          {book.cover_image_url ? (
            <Image
              source={{ uri: book.cover_image_url }}
              className="h-36 w-24 rounded-xl bg-gray-200 mr-4"
            />
          ) : (
            <View className="h-36 w-24 rounded-xl bg-gray-100 mr-4 items-center justify-center">
              <Ionicons name="image-outline" size={32} color={COLORS.textMuted} />
            </View>
          )}

          <View className="flex-1 justify-between">
            <View>
              <Text className="text-lg font-bold text-gray-900" numberOfLines={2}>
                {book.title}
              </Text>
              <Text className="text-sm text-gray-600 mt-1">Author: {book.author}</Text>
              <Text className="text-xs text-gray-400 mt-1">Code: {book.book_id}</Text>
            </View>

            <View className="mt-2 flex-row items-center justify-between">
              <View className="rounded-full bg-green-50 px-3 py-1">
                <Text className="text-xs font-semibold text-[#164a2d]">
                  {book.available_copies} / {book.total_copies} Available
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setQrModalVisible(true)}
                className="flex-row items-center bg-[#164a2d] px-3 py-1.5 rounded-lg shadow-sm"
              >
                <Ionicons name="qr-code-outline" size={14} color={COLORS.white} />
                <Text className="text-xs font-semibold text-white ml-1">QR Code</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Additional Info Section */}
        <View className="mt-4 rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
          <Text className="text-base font-bold text-gray-900 mb-3">Book Information</Text>

          <View className="space-y-2">
            <View className="flex-row justify-between py-1 border-b border-gray-50">
              <Text className="text-sm text-gray-500">Category</Text>
              <Text className="text-sm font-medium text-gray-800">{book.category || "N/A"}</Text>
            </View>
            <View className="flex-row justify-between py-1 border-b border-gray-50">
              <Text className="text-sm text-gray-500">Publisher</Text>
              <Text className="text-sm font-medium text-gray-800">{book.publisher || "N/A"}</Text>
            </View>
            <View className="flex-row justify-between py-1">
              <Text className="text-sm text-gray-500">ISBN</Text>
              <Text className="text-sm font-medium text-gray-800">{book.isbn || "N/A"}</Text>
            </View>
          </View>
        </View>

        {/* Current Borrowers Section with Sort Icon */}
        <View className="mt-4 mb-8">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-gray-900">
              Currently Borrowed By ({borrowers.length})
            </Text>

            {borrowers.length > 1 && (
              <TouchableOpacity
                onPress={toggleSortOrder}
                className="flex-row items-center bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
              >
                <Ionicons
                  name={sortOrder === "desc" ? "arrow-down" : "arrow-up"}
                  size={14}
                  color={COLORS.primary}
                />
                <Text className="text-xs font-medium text-gray-700 ml-1.5">
                  {sortOrder === "desc" ? "Latest" : "Oldest"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {borrowers.length === 0 ? (
            <View className="rounded-2xl bg-white p-6 items-center justify-center shadow-sm border border-gray-100">
              <Ionicons name="checkmark-circle-outline" size={36} color={COLORS.primary} />
              <Text className="mt-2 text-sm font-medium text-gray-700">No active borrowers</Text>
              <Text className="text-xs text-gray-400 text-center mt-1">
                All copies of this book are currently on the shelf.
              </Text>
            </View>
          ) : (
            sortedBorrowers.map((item) => (
              <View
                key={item.id}
                className="mb-2 rounded-xl bg-white p-4 shadow-sm border border-gray-100 flex-row items-center justify-between"
              >
                <View className="flex-1 pr-2">
                  <Text className="text-sm font-bold text-gray-900">
                    {item.profiles?.full_name || "Unknown Student"}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    ID: {item.profiles?.student_id || "N/A"}{" "}
                    {item.profiles?.grade_level ? `• Grade ${item.profiles.grade_level}` : ""}
                  </Text>
                  <Text className="text-xs text-gray-400 mt-1">
                    Borrowed: {formatDate(item.borrowed_at)}
                  </Text>
                </View>

                <View className="items-end">
                  <Text className="text-xs font-semibold text-amber-600">
                    Due: {formatDate(item.due_date)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* QR Code Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={qrModalVisible}
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm items-center shadow-xl">
            <View className="w-full flex-row justify-between items-center border-b border-gray-100 pb-4 mb-6">
              <Text className="text-lg font-bold text-gray-900">Book QR Code</Text>
              <TouchableOpacity onPress={() => setQrModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMedium} />
              </TouchableOpacity>
            </View>

            <View className="bg-gray-50 p-4 rounded-2xl border border-gray-100 items-center mb-6">
              <QRCode
                value={book.book_id}
                size={200}
                getRef={(c) => (qrRef.current = c)}
              />
              <Text className="text-sm font-bold text-gray-800 mt-4 text-center" numberOfLines={1}>
                {book.title}
              </Text>
              <Text className="text-xs text-[#164a2d] font-semibold mt-1">ID: {book.book_id}</Text>
            </View>

            {/* Dual Action Buttons */}
            <View className="w-full space-y-3">
              <TouchableOpacity
                onPress={handleDownloadQR}
                className="w-full bg-[#164a2d] py-3.5 rounded-xl items-center mb-3 shadow-md flex-row justify-center"
              >
                <Ionicons name="download-outline" size={18} color={COLORS.white} />
                <Text className="font-bold text-white ml-2">Download to Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShareQR}
                className="w-full bg-white border-2 border-[#164a2d] py-3.5 rounded-xl items-center flex-row justify-center"
              >
                <Ionicons name="share-outline" size={18} color={COLORS.primary} />
                <Text className="font-bold text-[#164a2d] ml-2">Share / Save via Share Sheet</Text>
              </TouchableOpacity>

              <Text className="text-xs text-gray-400 text-center">
                Tip: Use "Share" if direct download doesn't work in Expo Go
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}