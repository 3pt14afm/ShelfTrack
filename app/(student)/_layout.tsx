import { Tabs } from "expo-router";
import { View, ActivityIndicator, StyleSheet, Platform } from "react-native";
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
        headerShown: false,
        tabBarActiveTintColor: "#164a2d",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={18} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "time" : "time-outline"} size={18} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-books"
        options={{
          title: "My Books",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "book" : "book-outline"} size={18} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={18} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    backgroundColor: "#FAFAFA",
    justifyContent: "center",
    alignItems: "center",
  },
  tabBar: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 28 : 16,
    left: 20,
    right: 20,
    height: 50,
    borderRadius: 20,
    marginHorizontal: 14,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)", 
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6, // Clean shadow on Android
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: -3
  },
});