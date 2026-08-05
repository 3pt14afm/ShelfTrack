import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { loginLibrarian, needsPasswordChange } from "@/lib/auth-helpers";

export default function LibrarianLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (loading) return;
    setLoading(true);
    try {
      await loginLibrarian(username.trim(), password);

      if (await needsPasswordChange()) {
        router.replace("/change-password");
      } else {
        router.replace("/(librarian)");
      }
    } catch (err: any) {
      Alert.alert("Login failed", err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 justify-center px-6 bg-surface">
      <Text className="text-2xl font-bold text-shelf-700 text-center mb-8">
        Librarian Login
      </Text>

      <Text className="text-muted mb-1">Username</Text>
      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder="e.g. librarian123"
        autoCapitalize="none"
        className="border border-gray-300 rounded-xl px-4 py-3 mb-4 bg-white"
      />

      <Text className="text-muted mb-1">Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        className="border border-gray-300 rounded-xl px-4 py-3 mb-6 bg-white"
      />

      <Pressable
        onPress={handleLogin}
        disabled={loading || username.length === 0 || password.length === 0}
        className="bg-shelf-600 rounded-xl py-4 items-center disabled:opacity-50"
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-semibold">Login</Text>
        )}
      </Pressable>
    </View>
  );
}