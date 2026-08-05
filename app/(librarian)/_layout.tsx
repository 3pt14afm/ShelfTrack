import { Tabs } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/authStore";

export default function LibrarianLayout() {
  const profile = useAuthStore((s) => s.profile);

  // No Redirect here on purpose — app/_layout.tsx already guarantees
  // we only reach this screen with a valid session + librarian profile.
  // A second Redirect firing here at the same time as the root layout's
  // was what caused the logout loop.
  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color="#164a2d" />
      </View>
    );
  }

  return (
    <Tabs 
      screenOptions={{ 
        headerShown: false,
        tabBarActiveTintColor: "#164a2d"
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="students" 
        options={{ 
          title: "Students",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="books" 
        options={{ 
          title: "Books",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="transactions" 
        options={{ 
          title: "Transactions",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="swap-horizontal-outline" size={size} color={color} />
          ),
        }} 
      />
    </Tabs>
  );
}