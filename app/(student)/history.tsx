import React, { useState, useEffect } from "react";
import { View, Text, FlatList, ActivityIndicator, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabaseClient";

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

export default function HistoryScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

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
    return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#164a2d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* EXACT SAME GREEN HEADER AS HOME */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Borrowed History</Text>
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
        data={transactions}
        style={{ flex: 1 }}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No borrowing history yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.books?.cover_image_url ? (
              <Image source={{ uri: item.books.cover_image_url }} style={styles.cover} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="book-outline" size={20} color="#9ca3af" />
              </View>
            )}
            <View style={styles.infoContainer}>
              <Text style={styles.title} numberOfLines={1}>{item.books?.title || "Unknown Book"}</Text>
              <Text style={styles.author}>{item.books?.author || "Unknown Author"}</Text>
              <Text style={styles.date}>Borrowed: {formatDate(item.borrowed_at)}</Text>
            </View>
            <View style={[styles.statusBadge, item.status === "borrowed" ? styles.statusBorrowed : styles.statusReturned]}>
              <Text style={styles.statusText}>{item.status === "borrowed" ? "Active" : "Returned"}</Text>
            </View>
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
    paddingTop: 20, // Safe area spacing
    paddingBottom: 24,
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
  emptyText: { color: "#9ca3af", marginTop: 16, fontSize: 16 },
  card: {
    backgroundColor: "white", flexDirection: "row", alignItems: "center",
    padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: "#f3f4f6",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 2, elevation: 2,
  },
  cover: { width: 50, height: 70, borderRadius: 6, backgroundColor: "#e5e7eb", marginRight: 12 },
  coverPlaceholder: { width: 50, height: 70, borderRadius: 6, backgroundColor: "#f3f4f6", marginRight: 12, justifyContent: "center", alignItems: "center" },
  infoContainer: { flex: 1, justifyContent: "center" },
  title: { fontSize: 14, fontWeight: "600", color: "#111827" },
  author: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  date: { fontSize: 11, color: "#9ca3af", marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusBorrowed: { backgroundColor: "#fef3c7" },
  statusReturned: { backgroundColor: "#f0fdf4" },
  statusText: { fontSize: 11, fontWeight: "600" },
});