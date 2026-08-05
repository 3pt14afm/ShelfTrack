import { Tabs } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/authStore";

export default function StudentLayout() {
  const profile = useAuthStore((s) => s.profile);

  if (!profile) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#164a2d" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        // HIDE native header for ALL tabs. We will build custom ones inside the files.
        headerShown: false, 
        tabBarActiveTintColor: "#164a2d",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="history" 
        options={{ 
          title: "History",
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="my-books" 
        options={{ 
          title: "My Books",
          tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" size={size} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />
        }} 
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  tabBar: {
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingBottom: 5,
    height: 60,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
});