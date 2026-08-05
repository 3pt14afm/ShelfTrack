// app/_layout.tsx
import "../global.css";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, ActivityIndicator } from "react-native";

import { useAuthListener } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";

export default function RootLayout() {
  useAuthListener();

  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View className="flex-1 items-center justify-center bg-surface">
          <ActivityIndicator size="large" color="#164a2d" />
        </View>
      </SafeAreaProvider>
    );
  }

  const loggedIn = !!session && !!profile;
  const mustChangePassword = loggedIn && profile.must_change_password;

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#ffffff" },
        }}
      >
        <Stack.Protected guard={!loggedIn}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={loggedIn && mustChangePassword}>
          <Stack.Screen name="change-password" />
        </Stack.Protected>

        <Stack.Protected guard={loggedIn && !mustChangePassword && profile?.role === "librarian"}>
          <Stack.Screen name="(librarian)" />
        </Stack.Protected>

        <Stack.Protected guard={loggedIn && !mustChangePassword && profile?.role === "student"}>
          <Stack.Screen name="(student)" />
        </Stack.Protected>
      </Stack>
    </SafeAreaProvider>
  );
}