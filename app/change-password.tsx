import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { changePassword } from "@/lib/auth-helpers";
import { useAuthStore } from "@/store/authStore";

export default function ChangePassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);

  async function handleSubmit() {
    if (newPassword !== confirmPassword) {
      Alert.alert("Passwords don't match", "Please re-enter your new password.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(newPassword);

      // Update local store so the layout guards see must_change_password = false
      // immediately, without waiting for a fresh fetch.
      if (profile) {
        setProfile({ ...profile, must_change_password: false });
      }

      Alert.alert("Success", "Your password has been updated.");

      if (profile?.role === "librarian") {
        router.replace("/(librarian)");
      } else {
        router.replace("/(student)");
      }
    } catch (err: any) {
      Alert.alert("Couldn't update password", err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 justify-center px-6 bg-surface">
      <Text className="text-2xl font-bold text-shelf-700 text-center mb-2">
        Set a New Password
      </Text>
      <Text className="text-muted text-center mb-8">
        For your security, please choose a new password before continuing.
      </Text>

      <Text className="text-muted mb-1">New Password</Text>
      <TextInput
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="At least 8 characters"
        secureTextEntry
        className="border border-gray-300 rounded-xl px-4 py-3 mb-4 bg-white"
      />

      <Text className="text-muted mb-1">Confirm New Password</Text>
      <TextInput
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Re-enter new password"
        secureTextEntry
        className="border border-gray-300 rounded-xl px-4 py-3 mb-6 bg-white"
      />

      <Pressable
        onPress={handleSubmit}
        disabled={loading || newPassword.length === 0 || confirmPassword.length === 0}
        className="bg-shelf-600 rounded-xl py-4 items-center disabled:opacity-50"
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-semibold">Update Password</Text>
        )}
      </Pressable>
    </View>
  );
}