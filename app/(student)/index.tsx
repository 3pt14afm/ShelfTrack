import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  ImageBackground,
  Image,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { logout, updateStudentProfile } from "@/lib/auth-helpers";
import { useAuthStore } from "@/store/authStore";

// Calculate 40% of the screen height
const HERO_HEIGHT = Dimensions.get("window").height * 0.25;

export default function StudentDashboard() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);

  // Onboarding State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [section, setSection] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile && !profile.full_name) {
      setShowOnboarding(true);
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim() || !gradeLevel.trim()) {
      Alert.alert("Missing Information", "First Name, Last Name, and Grade Level are required.");
      return;
    }
    setIsSaving(true);
    try {
      const names = [firstName.trim(), middleName.trim(), lastName.trim()].filter((n) => n.length > 0);
      const fullName = names.join(" ");
      await updateStudentProfile({ full_name: fullName, grade_level: gradeLevel.trim(), section: section.trim() || null });
      useAuthStore.setState({ profile: { ...profile, full_name: fullName, grade_level: gradeLevel.trim(), section: section.trim() || null } });
      setShowOnboarding(false);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <ImageBackground
          source={{ uri: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=1000&auto=format&fit=crop" }}
          style={{ minHeight: 230 }}
          className="rounded-b-[32px] overflow-hidden"
        >
        <View className="flex-1 bg-[#164a2d]/80">
          <SafeAreaView edges={["top"]}>
            <View className="flex-row items-center justify-center mx-6 pt-28">
              <TouchableOpacity
                onPress={() => router.replace("/profile")}
                className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/40 bg-white/10"
              >
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} className="w-full h-full" resizeMode="cover" />
                ) : (
                  <View className="w-full h-full items-center justify-center">
                    <Ionicons name="person" size={32} color="rgba(255,255,255,0.9)" />
                  </View>
                )}
              </TouchableOpacity>
              <View className="flex-1 pl-4">
                <Text className="text-white/70 text-base font-medium">Welcome back,</Text>
                <Text className="text-white text-2xl font-extrabold mt-1">
                  {profile?.full_name || "Student"}
                </Text>
                <Text className="text-white/90 text-sm font-medium mt-2">
                  What do you like to do today?
                </Text>
              </View>
            </View>
          </SafeAreaView>
        </View>
        </ImageBackground>

        {/* Action Buttons - Overlapping Tilted Stack */}
        <View className="px-6 pt-10 pb-6">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Quick Actions
          </Text>

        <View style={{ paddingHorizontal: 4, gap: 12 }}>
          {/* Card 1: Scan Book QR */}
          <TouchableOpacity
            onPress={() => router.push("/scan")}
            activeOpacity={0.85}
            className="flex-row items-center justify-between bg-white p-6 rounded-2xl"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-1 pr-4">
              <Text className="text-xl font-bold text-black">Scan Book QR</Text>
              <Text className="text-sm text-black/70 mt-1">Borrow or return a book instantly</Text>
            </View>
            <View className="w-14 h-14 rounded-2xl bg-white/15 items-center justify-center">
              <Ionicons name="scan-outline" size={28} color="black" />
            </View>
          </TouchableOpacity>

          {/* Card 2: My Borrowed Books */}
          <TouchableOpacity
            onPress={() => router.replace("/my-books")}
            activeOpacity={0.85}
            className="flex-row items-center justify-between bg-white p-6 rounded-2xl"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-1 pr-4">
              <Text className="text-xl font-bold text-black">My Borrowed Books</Text>
              <Text className="text-sm text-black/70 mt-1">View books you currently have</Text>
            </View>
            <View className="w-14 h-14 rounded-2xl bg-white/15 items-center justify-center">
              <Ionicons name="bookmarks-outline" size={28} color="black" />
            </View>
          </TouchableOpacity>

          {/* Card 3: Borrowed History */}
          <TouchableOpacity
            onPress={() => router.replace("/history")}
            activeOpacity={0.85}
            className="flex-row items-center justify-between bg-white p-6 rounded-2xl"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-1 pr-4">
              <Text className="text-xl font-bold text-black">Borrowed History</Text>
              <Text className="text-sm text-black/70 mt-1">View your past transactions</Text>
            </View>
            <View className="w-14 h-14 rounded-2xl bg-white/15 items-center justify-center">
              <Ionicons name="time-outline" size={28} color="black" />
            </View>
          </TouchableOpacity>

          {/* Card 4: My Profile */}
          <TouchableOpacity
            onPress={() => router.replace("/profile")}
            activeOpacity={0.85}
            className="flex-row items-center justify-between bg-white p-6 rounded-2xl"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-1 pr-4">
              <Text className="text-xl font-bold text-black">My Profile</Text>
              <Text className="text-sm text-black/70 mt-1">View your profile information</Text>
            </View>
            <View className="w-14 h-14 rounded-2xl bg-white/15 items-center justify-center">
              <Ionicons name="person" size={28} color="black" />
            </View>
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>

      {/* ONBOARDING MODAL (Bottom Sheet Style) */}
      <Modal visible={showOnboarding} animationType="slide" transparent={true} onRequestClose={() => {}}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-end bg-black/60"
        >
          <View className="bg-white rounded-t-[32px] shadow-2xl max-h-[90%]">
            {/* Drag Handle & Header */}
            <View className="pt-3 pb-2 items-center">
              <View className="w-10 h-1.5 bg-slate-200 rounded-full" />
            </View>
            
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-100">
              <Text className="text-xl font-bold text-slate-900">Complete Your Profile</Text>
            </View>

            <ScrollView 
              className="px-6 py-5" 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text className="text-sm text-slate-500 mb-6">
                Please fill this out so the librarian can identify your borrowed books.
              </Text>

              <View className="space-y-4">
                <View>
                  <Text className="mb-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">First Name *</Text>
                  <TextInput
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-slate-900"
                    placeholder="e.g. Juan"
                    placeholderTextColor="#94a3b8"
                    value={firstName}
                    onChangeText={setFirstName}
                  />
                </View>

                <View>
                  <Text className="mb-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Middle Name</Text>
                  <TextInput
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-slate-900"
                    placeholder="e.g. Santos"
                    placeholderTextColor="#94a3b8"
                    value={middleName}
                    onChangeText={setMiddleName}
                  />
                </View>

                <View>
                  <Text className="mb-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Last Name *</Text>
                  <TextInput
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-slate-900"
                    placeholder="e.g. Dela Cruz"
                    placeholderTextColor="#94a3b8"
                    value={lastName}
                    onChangeText={setLastName}
                  />
                </View>

                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <Text className="mb-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Grade Level *</Text>
                    <TextInput
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-slate-900"
                      placeholder="e.g. 10"
                      placeholderTextColor="#94a3b8"
                      value={gradeLevel}
                      onChangeText={setGradeLevel}
                      keyboardType="numeric"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="mb-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Section</Text>
                    <TextInput
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-slate-900"
                      placeholder="e.g. A"
                      placeholderTextColor="#94a3b8"
                      value={section}
                      onChangeText={setSection}
                      autoCapitalize="characters"
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity 
                onPress={handleSaveProfile} 
                disabled={isSaving} 
                className="mt-8 w-full rounded-xl py-4 shadow-md mb-8 flex-row justify-center items-center bg-[#164a2d]"
                style={{ opacity: isSaving ? 0.7 : 1 }}
              >
                {isSaving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="white" />
                    <Text className="ml-2 font-bold text-white text-base">Save and Continue</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
} 