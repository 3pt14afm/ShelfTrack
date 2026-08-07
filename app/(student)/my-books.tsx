import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  ActivityIndicator, 
  Image, 
  Alert, 
  TouchableOpacity 
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabaseClient";
import { SafeAreaView } from "react-native-safe-area-context";

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
  const tabBarHeight = useBottomTabBarHeight();
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  
  const [books, setBooks] = useState<BorrowedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [returningId, setReturningId] = useState<string | null>(null);

  useEffect(() => { 
    fetchMyBooks(); 
  }, []);

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
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleReturn = async (txId: string, bookId: string, currentCopies: number) => {
    Alert.alert("Return Book", "Are you sure you want to return this book?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Return", 
        style: "destructive",
        onPress: async () => {
          setReturningId(txId);
          try {
            const { error: txError } = await supabase
              .from("transactions")
              .update({ status: "returned", returned_at: new Date().toISOString() })
              .eq("id", txId);
            if (txError) throw txError;
            
            const { error: updateError } = await supabase
              .from("books")
              .update({ available_copies: currentCopies + 1 })
              .eq("id", bookId);
            if (updateError) throw updateError;
            
            Alert.alert("Success", "Book returned successfully!");
            fetchMyBooks();
          } catch (err: any) { 
            Alert.alert("Error", err.message || "Failed to return book."); 
          } finally { 
            setReturningId(null); 
          }
        },
      },
    ]);
  };

  const formatDate = (dateString: string) => 
    new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#164a2d" />
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      {/* EXACT SAME GREEN HEADER AS HOME - Refined & Modern */}
      <SafeAreaView edges={['top']} className="bg-[#164a2d] rounded-b-[32px] pb-6 pt-2 shadow-lg shadow-[#164a2d]/30">
        <View className="flex-row justify-between items-center px-6 pt-3">
          <View>
            <Text className="text-white text-2xl font-extrabold">My Books</Text>
            <Text className="text-white/70 text-sm font-medium mt-1">
              {books.length} {books.length === 1 ? "book" : "books"} currently borrowed
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

      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        className="flex-1"
        contentContainerClassName="p-5 pt-6"
        contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center mt-24">
            <View className="bg-slate-100 p-6 rounded-full mb-5">
              <Ionicons name="book-outline" size={48} color="#94a3b8" />
            </View>
            <Text className="text-lg font-bold text-slate-800">No Active Loans</Text>
            <Text className="text-sm text-slate-500 mt-2 text-center max-w-xs">
              You currently have no borrowed books. Visit the library to find something to read!
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isOverdue = new Date(item.due_date) < new Date();
          
          return (
            <View className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-4">
              <View className="flex-row">
                {/* Book Cover */}
                {item.books?.cover_image_url ? (
                  <Image 
                    source={{ uri: item.books.cover_image_url }} 
                    className="h-32 w-24 rounded-xl bg-slate-200" 
                    resizeMode="cover" 
                  />
                ) : (
                  <View className="h-32 w-24 rounded-xl bg-slate-100 items-center justify-center">
                    <Ionicons name="book-outline" size={32} color="#cbd5e1" />
                  </View>
                )}

                {/* Book Info */}
                <View className="flex-1 pl-4">
                  <Text className="text-base font-bold text-slate-900 leading-tight" numberOfLines={2}>
                    {item.books?.title}
                  </Text>
                  <Text className="text-sm text-slate-500 mt-1" numberOfLines={1}>
                    {item.books?.author}
                  </Text>

                  {/* Dates */}
                  <View className="flex-row mt-3 space-x-2">
                    <View className="bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg flex-1">
                      <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Borrowed
                      </Text>
                      <Text className="text-xs text-slate-700 font-semibold mt-0.5">
                        {formatDate(item.borrowed_at)}
                      </Text>
                    </View>
                    
                    <View className={`px-2.5 py-1.5 rounded-lg flex-1 border ${isOverdue ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                      <Text className={`text-[10px] font-bold uppercase tracking-wider ${isOverdue ? 'text-red-400' : 'text-amber-500'}`}>
                        {isOverdue ? "Overdue" : "Due Date"}
                      </Text>
                      <Text className={`text-xs font-semibold mt-0.5 ${isOverdue ? 'text-red-700' : 'text-amber-700'}`}>
                        {formatDate(item.due_date)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Return Button */}
              <TouchableOpacity
                className={`mt-4 py-3 rounded-xl flex-row justify-center items-center ${
                  returningId === item.id ? "bg-slate-300" : "bg-[#164a2d] shadow-sm shadow-[#164a2d]/20"
                }`}
                onPress={() => handleReturn(item.id, item.books.id, item.books.available_copies)}
                disabled={returningId === item.id}
                activeOpacity={0.8}
              >
                {returningId === item.id ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="arrow-undo-circle-outline" size={18} color="white" />
                    <Text className="text-white font-bold text-sm ml-2">Return Book</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}