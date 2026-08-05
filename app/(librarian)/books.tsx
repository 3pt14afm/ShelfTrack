import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  Image 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabaseClient"; 
import { useAuthStore } from "@/store/authStore";
import { uploadBookCover } from "@/lib/auth-helpers";

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
  const profile = useAuthStore((s) => s.profile);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [bookId, setBookId] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [publisher, setPublisher] = useState("");
  const [isbn, setIsbn] = useState("");
  const [totalCopies, setTotalCopies] = useState("1");
  const [coverUri, setCoverUri] = useState<string | null>(null);

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

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Permission to access camera roll is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setCoverUri(result.assets[0].uri);
    }
  };

  const handleAddBook = async () => {
    if (!bookId.trim() || !title.trim() || !author.trim()) {
      Alert.alert("Validation Error", "Please fill in Book ID, Title, and Author.");
      return;
    }

    const copies = parseInt(totalCopies, 10);
    if (isNaN(copies) || copies < 1) {
      Alert.alert("Validation Error", "Total copies must be at least 1.");
      return;
    }

    try {
      setSubmitting(true);

      const { data: newBook, error: insertError } = await supabase
        .from("books")
        .insert({
          book_id: bookId.trim(),
          title: title.trim(),
          author: author.trim(),
          category: category.trim() || null,
          publisher: publisher.trim() || null,
          isbn: isbn.trim() || null,
          total_copies: copies,
          available_copies: copies, 
          created_by: profile?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (coverUri && newBook) {
        await uploadBookCover(newBook.id, newBook.book_id, coverUri);
      }

      Alert.alert("Success", "Book added successfully!");
      setModalVisible(false);
      resetForm();
      fetchBooks();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to add book");
    } finally {
      setSubmitting(false);
    }
  };

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
              Alert.alert("Success", "Book deleted successfully.");
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to delete book.");
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setBookId("");
    setTitle("");
    setAuthor("");
    setCategory("");
    setPublisher("");
    setIsbn("");
    setTotalCopies("1");
    setCoverUri(null);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#164a2d" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 p-4">
      {books.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="book-outline" size={64} color="#9ca3af" />
          <Text className="mt-4 text-xl font-bold text-gray-800">No Books Found</Text>
          <Text className="mt-1 text-center text-sm text-gray-500">
            Your library catalog is empty. Start by adding your first book.
          </Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="mt-6 flex-row items-center rounded-xl bg-[#164a2d] px-6 py-3 shadow-md"
          >
            <Ionicons name="add" size={20} color="#ffffff" />
            <Text className="ml-2 font-semibold text-white">Add Books</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-800">
              Library Catalog ({books.length})
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              className="flex-row items-center rounded-lg bg-[#164a2d] px-4 py-2"
            >
              <Ionicons name="add" size={18} color="#ffffff" />
              <Text className="ml-1 text-sm font-semibold text-white">Add Book</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={books}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                onPress={() => router.push({ pathname: "/book-detail", params: { id: item.id } })}
                className="mb-3 flex-row rounded-xl bg-white p-3 shadow-sm border border-gray-100 items-center justify-between"
              >
                <View className="flex-row items-center flex-1 pr-2">
                  {item.cover_image_url ? (
                    <Image 
                      source={{ uri: item.cover_image_url }} 
                      className="h-24 w-16 rounded-lg bg-gray-200 mr-3" 
                    />
                  ) : (
                    <View className="h-24 w-16 rounded-lg bg-gray-100 mr-3 items-center justify-center">
                      <Ionicons name="image-outline" size={24} color="#9ca3af" />
                    </View>
                  )}

                  <View className="flex-1 pr-2">
                    <Text className="text-base font-bold text-gray-900" numberOfLines={1}>{item.title}</Text>
                    <Text className="text-sm text-gray-600 mt-0.5" numberOfLines={1}>Author: {item.author}</Text>
                    <Text className="text-xs text-gray-400 mt-1">Code: {item.book_id}</Text>
                    {item.category && (
                      <Text className="text-xs text-[#164a2d] font-medium mt-1">{item.category}</Text>
                    )}
                  </View>
                </View>

                <View className="items-end flex-row space-x-2">
                  <View className="rounded-full bg-green-50 px-2.5 py-1 mr-2">
                    <Text className="text-xs font-medium text-[#164a2d]">
                      {item.available_copies}/{item.total_copies}
                    </Text>
                  </View>

                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation(); // Prevent opening detail view when clicking delete
                      handleDeleteBook(item);
                    }}
                    className="p-2 rounded-lg bg-red-50"
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      {/* Add Book Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[90%] rounded-t-3xl bg-white p-6 shadow-xl">
            <View className="flex-row items-center justify-between border-b border-gray-100 pb-4">
              <Text className="text-xl font-bold text-gray-900">Add New Book</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#4b5563" />
              </TouchableOpacity>
            </View>

            <ScrollView className="py-4" showsVerticalScrollIndicator={false}>
              <Text className="mb-1 text-xs font-semibold text-gray-600">Book Cover Image</Text>
              <TouchableOpacity 
                onPress={pickImage}
                className="mb-4 h-40 w-full rounded-xl border border-dashed border-gray-300 bg-gray-50 items-center justify-center overflow-hidden"
              >
                {coverUri ? (
                  <Image source={{ uri: coverUri }} className="h-full w-full" />
                ) : (
                  <View className="items-center">
                    <Ionicons name="camera-outline" size={32} color="#9ca3af" />
                    <Text className="mt-2 text-xs text-gray-500 font-medium">Tap to select cover image</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text className="mb-1 text-xs font-semibold text-gray-600">Book ID / QR Code *</Text>
              <TextInput
                className="mb-3 rounded-xl border border-gray-200 p-3 text-gray-900 bg-gray-50"
                placeholder="e.g. BK-00123"
                placeholderTextColor="#9ca3af"
                value={bookId}
                onChangeText={setBookId}
              />

              <Text className="mb-1 text-xs font-semibold text-gray-600">Title *</Text>
              <TextInput
                className="mb-3 rounded-xl border border-gray-200 p-3 text-gray-900 bg-gray-50"
                placeholder="Book Title"
                placeholderTextColor="#9ca3af"
                value={title}
                onChangeText={setTitle}
              />

              <Text className="mb-1 text-xs font-semibold text-gray-600">Author *</Text>
              <TextInput
                className="mb-3 rounded-xl border border-gray-200 p-3 text-gray-900 bg-gray-50"
                placeholder="Author Name"
                placeholderTextColor="#9ca3af"
                value={author}
                onChangeText={setAuthor}
              />

              <Text className="mb-1 text-xs font-semibold text-gray-600">Category</Text>
              <TextInput
                className="mb-3 rounded-xl border border-gray-200 p-3 text-gray-900 bg-gray-50"
                placeholder="e.g. Science, Fiction"
                placeholderTextColor="#9ca3af"
                value={category}
                onChangeText={setCategory}
              />

              <Text className="mb-1 text-xs font-semibold text-gray-600">Publisher</Text>
              <TextInput
                className="mb-3 rounded-xl border border-gray-200 p-3 text-gray-900 bg-gray-50"
                placeholder="Publisher Name"
                placeholderTextColor="#9ca3af"
                value={publisher}
                onChangeText={setPublisher}
              />

              <Text className="mb-1 text-xs font-semibold text-gray-600">ISBN</Text>
              <TextInput
                className="mb-3 rounded-xl border border-gray-200 p-3 text-gray-900 bg-gray-50"
                placeholder="ISBN Number"
                placeholderTextColor="#9ca3af"
                value={isbn}
                onChangeText={setIsbn}
              />

              <Text className="mb-1 text-xs font-semibold text-gray-600">Total Copies *</Text>
              <TextInput
                className="mb-6 rounded-xl border border-gray-200 p-3 text-gray-900 bg-gray-50"
                placeholder="1"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                value={totalCopies}
                onChangeText={setTotalCopies}
              />

              <TouchableOpacity
                onPress={handleAddBook}
                disabled={submitting}
                className="items-center rounded-xl bg-[#164a2d] py-4 shadow-md mb-6"
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="font-bold text-white">Save Book</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}