import React, { useState, useEffect } from "react";
import { View, Text, FlatList, ActivityIndicator, Image, Alert, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabaseClient";

interface BorrowedBook {
  id: string;
  borrowed_at: string;
  due_date: string;
  books: {
    id: string;
    title: string;
    author: string;
    cover_image_url: string | null;
    book_id: string;
    available_copies: number;
  };
}

export default function MyBooksScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const [books, setBooks] = useState<BorrowedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [returningId, setReturningId] = useState<string | null>(null);

  useEffect(() => { fetchMyBooks(); }, []);

  const fetchMyBooks = async () => {
    if (!session?.user) return;
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`id, borrowed_at, due_date, books ( id, title, author, cover_image_url, book_id, available_copies )`)
        .eq("student_id", session.user.id)
        .eq("status", "borrowed");
      if (error) throw error;
      setBooks(data || []);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const handleReturn = async (txId: string, bookId: string, currentCopies: number) => {
    Alert.alert("Return Book", "Are you sure you want to return this book?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Return", style: "destructive",
        onPress: async () => {
          setReturningId(txId);
          try {
            const { error: txError } = await supabase.from("transactions").update({ status: "returned", returned_at: new Date().toISOString() }).eq("id", txId);
            if (txError) throw txError;
            const { error: updateError } = await supabase.from("books").update({ available_copies: currentCopies + 1 }).eq("id", bookId);
            if (updateError) throw updateError;
            Alert.alert("Success", "Book returned successfully!");
            fetchMyBooks();
          } catch (err: any) { Alert.alert("Error", err.message || "Failed to return book."); } 
          finally { setReturningId(null); }
        },
      },
    ]);
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (loading) return (<View style={styles.centerContainer}><ActivityIndicator size="large" color="#164a2d" /></View>);

  return (
    <View style={styles.container}>
      {/* EXACT SAME GREEN HEADER AS HOME */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Borrowed Books</Text>
          <TouchableOpacity onPress={() => router.replace("/profile")} style={styles.profileIconContainer}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.profileImage} />
            ) : (
              <Ionicons name="person-circle-outline" size={48} color="rgba(255,255,255,0.9)" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={books}
        style={{ flex: 1 }}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="book-off-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No borrowed books</Text>
            <Text style={styles.emptySubtext}>Books you borrow will appear here</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: "row", flex: 1 }}>
              {item.books?.cover_image_url ? (
                <Image source={{ uri: item.books.cover_image_url }} style={styles.cover} resizeMode="cover" />
              ) : (
                <View style={styles.coverPlaceholder}><Ionicons name="book-outline" size={24} color="#9ca3af" /></View>
              )}
              <View style={{ flex: 1, marginLeft: 12, justifyContent: "center" }}>
                <Text style={styles.title} numberOfLines={2}>{item.books?.title}</Text>
                <Text style={styles.author} numberOfLines={1}>{item.books?.author}</Text>
                <View style={{ flexDirection: "row", marginTop: 8 }}>
                  <View style={styles.dateBox}>
                    <Text style={styles.dateLabel}>Borrowed</Text>
                    <Text style={styles.dateValue}>{formatDate(item.borrowed_at)}</Text>
                  </View>
                  <View style={[styles.dateBox, { marginLeft: 12 }]}>
                    <Text style={styles.dateLabel}>Due Date</Text>
                    <Text style={[styles.dateValue, { color: "#d97706" }]}>{formatDate(item.due_date)}</Text>
                  </View>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.returnButton, returningId === item.id && styles.returnButtonDisabled]}
              onPress={() => handleReturn(item.id, item.books.id, item.books.available_copies)}
              disabled={returningId === item.id}
              activeOpacity={0.8}
            >
              {returningId === item.id ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.returnButtonText}>Return</Text>}
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  centerContainer: { flex: 1, backgroundColor: "white", justifyContent: "center", alignItems: "center" },
  
  // --- EXACT GREEN HEADER STYLES ---
  headerContainer: {
    backgroundColor: "#164a2d",
    paddingTop: 40,
    paddingBottom: 10,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 8,
    shadowColor: "#164a2d",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  headerTitle: { color: "white", fontSize: 24, fontWeight: "800" },
  profileIconContainer: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: "rgba(255,255,255,0.3)" },
  profileImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  // --- LIST STYLES ---
  emptyContainer: { alignItems: "center", justifyContent: "center", marginTop: 100 },
  emptyText: { color: "#6b7280", marginTop: 16, fontSize: 16, fontWeight: "600" },
  emptySubtext: { color: "#9ca3af", marginTop: 4, fontSize: 13 },
  card: {
    backgroundColor: "white", padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: "#f3f4f6",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 3,
    justifyContent: "space-between",
  },
  cover: { width: 80, height: 110, borderRadius: 8, backgroundColor: "#e5e7eb" },
  coverPlaceholder: { width: 80, height: 110, borderRadius: 8, backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center" },
  title: { fontSize: 16, fontWeight: "700", color: "#111827" },
  author: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  dateBox: { backgroundColor: "#f9fafb", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  dateLabel: { fontSize: 10, color: "#9ca3af", textTransform: "uppercase" },
  dateValue: { fontSize: 12, color: "#374151", fontWeight: "600", marginTop: 2 },
  returnButton: { backgroundColor: "#164a2d", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, justifyContent: "center", marginTop: 12, shadowColor: "#164a2d", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  returnButtonDisabled: { backgroundColor: "#9ca3af" },
  returnButtonText: { color: "white", fontWeight: "700", fontSize: 14 },
});