import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { logout, updateStudentProfile } from "@/lib/auth-helpers";
import { useAuthStore } from "@/store/authStore";

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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Green Header Navbar */}
        <View style={styles.headerContainer}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerGreeting}>Hello,</Text>
              <Text style={styles.headerName}>{profile?.full_name || "Student"}</Text>
              <Text style={styles.headerSubtext}>Welcome to ShelfTrack</Text>
            </View>
            <TouchableOpacity onPress={() => router.replace("/profile")} style={styles.profileIconContainer}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.profileImage} />
              ) : (
                <Ionicons name="person-circle-outline" size={48} color="rgba(255,255,255,0.9)" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>What would you like to do?</Text>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push("/scan")} activeOpacity={0.8}>
            <View style={[styles.iconBox, { backgroundColor: "#f0fdf4" }]}>
              <Ionicons name="scan-outline" size={28} color="#164a2d" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Scan Book</Text>
              <Text style={styles.actionSubtitle}>Borrow or return a book via QR</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.replace("/my-books")} activeOpacity={0.8}>
            <View style={[styles.iconBox, { backgroundColor: "#eff6ff" }]}>
              <Ionicons name="bookmarks-outline" size={28} color="#1e40af" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>My Borrowed Books</Text>
              <Text style={styles.actionSubtitle}>View books you currently have</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.replace("/history")} activeOpacity={0.8}>
            <View style={[styles.iconBox, { backgroundColor: "#fef3c7" }]}>
              <Ionicons name="time-outline" size={28} color="#92400e" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Borrowed History</Text>
              <Text style={styles.actionSubtitle}>View your past transactions</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ONBOARDING MODAL (Hidden behind main UI if triggered) */}
      <Modal visible={showOnboarding} animationType="slide" transparent={true} onRequestClose={() => {}}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.content}>
            <Text style={modalStyles.mainTitle}>Complete Your Profile</Text>
            <Text style={modalStyles.subTitle}>Please fill this out so the librarian can identify your borrowed books.</Text>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={modalStyles.inputGroup}>
                <Text style={modalStyles.label}>First Name <Text style={{color:'red'}}>*</Text></Text>
                <TextInput style={modalStyles.input} placeholder="e.g. Juan" value={firstName} onChangeText={setFirstName} />
              </View>
              <View style={modalStyles.inputGroup}>
                <Text style={modalStyles.label}>Middle Name</Text>
                <TextInput style={modalStyles.input} placeholder="e.g. Santos" value={middleName} onChangeText={setMiddleName} />
              </View>
              <View style={modalStyles.inputGroup}>
                <Text style={modalStyles.label}>Last Name <Text style={{color:'red'}}>*</Text></Text>
                <TextInput style={modalStyles.input} placeholder="e.g. Dela Cruz" value={lastName} onChangeText={setLastName} />
              </View>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={modalStyles.label}>Grade Level <Text style={{color:'red'}}>*</Text></Text>
                  <TextInput style={modalStyles.input} placeholder="e.g. 10" value={gradeLevel} onChangeText={setGradeLevel} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={modalStyles.label}>Section</Text>
                  <TextInput style={modalStyles.input} placeholder="e.g. A" value={section} onChangeText={setSection} autoCapitalize="characters" />
                </View>
              </View>
            </ScrollView>
            <TouchableOpacity onPress={handleSaveProfile} disabled={isSaving} style={modalStyles.submitButton}>
              {isSaving ? <ActivityIndicator size="small" color="white" /> : <Text style={modalStyles.submitButtonText}>Save and Continue</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Need to add Image to imports if using avatars
import { Image } from "react-native";

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f9fafb" },
  headerContainer: {
    backgroundColor: "#164a2d",
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 24,
    shadowColor: "#164a2d",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  headerGreeting: { color: "rgba(255,255,255,0.7)", fontSize: 14 },
  headerName: { color: "white", fontSize: 24, fontWeight: "800", marginTop: 2 },
  headerSubtext: { color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 4 },
  profileIconContainer: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    overflow: 'hidden',
    borderWidth: 2, 
    borderColor: "rgba(255,255,255,0.3)" 
  },
  profileImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  actionsContainer: { paddingHorizontal: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 16 },
  actionCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 2,
  },
  iconBox: { width: 50, height: 50, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 16 },
  actionTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
  actionSubtitle: { fontSize: 12, color: "#6b7280", marginTop: 2 },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  content: { backgroundColor: "#ffffff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: "85%" },
  mainTitle: { fontSize: 24, fontWeight: "800", color: "#111827", marginBottom: 6 },
  subTitle: { fontSize: 14, color: "#6b7280", marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 6 },
  input: { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: "#111827" },
  submitButton: { width: "100%", backgroundColor: "#164a2d", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 20 },
  submitButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 18 },
});