import { View, Text, Pressable, Image as RNImage } from "react-native";
import { router, Redirect } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import LibraryLogo from "@/components/logo";

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
    <View className="flex-1 px-6 pb-6 bg-surface">

  {/* Centered Middle Section */}
  <View className="flex-1 justify-center">
    {/* SVG Logo Container */}
    <View className="items-center">
      <LibraryLogo width={200} height={200} />
    </View>
    <Text className="text-center text-2xl font-extrabold -mt-6 mb-2">SHELFTRACK</Text>
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

  {/* Pinned Bottom View */}
<View className="flex-row items-center justify-center gap-2.5 px-6 pt-4">
  <RNImage 
    source={require("@/assets/images/steclogo.png")} 
    className="w-10 h-10"
    resizeMode="contain"
  />
  <Text className="shrink text-xs font-semibold text-center">
    Ramon M. Durano Sr. Foundation Science and Technology Education Center Library System
  </Text>
</View>
  
</View>
  );
}