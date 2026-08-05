import { View, Text, Pressable } from "react-native";
import { router, Redirect } from "expo-router";
import { useAuthStore } from "@/store/authStore";

export default function Index() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);

  console.log("[index] rendered", {
    session: !!session,
    profile: !!profile,
  });

  // Already logged in? Skip straight to the right place.
  if (session && profile) {
    if (profile.must_change_password) {
      return <Redirect href="/change-password" />;
    }
    return (
      <Redirect href={profile.role === "librarian" ? "/(librarian)" : "/(student)"} />
    );
  }

  return (
    <View className="flex-1 justify-center px-6 bg-surface">
      <Text className="text-3xl font-bold text-shelf-700 text-center mb-1">
        SHELFTRACK
      </Text>
      <Text className="text-muted text-center mb-10">
        Smart Library Management System
      </Text>

      <Pressable
        className="bg-shelf-600 rounded-xl py-4 mb-3"
        onPress={() => router.push("/(auth)/librarian-login")}
      >
        <Text className="text-white text-center font-semibold">
          Login as Librarian
        </Text>
      </Pressable>

      <Pressable
        className="border border-shelf-600 rounded-xl py-4"
        onPress={() => router.push("/(auth)/student-login")}
      >
        <Text className="text-shelf-600 text-center font-semibold">
          Login as Student
        </Text>
      </Pressable>
    </View>
  );
}