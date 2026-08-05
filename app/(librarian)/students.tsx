// app/(librarian)/students.tsx
import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { listStudents } from "@/lib/students";
import { createStudent, resetStudentPassword } from "@/lib/auth-helpers";
import { Profile } from "@/store/authStore";

export default function StudentsScreen() {
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newStudentId, setNewStudentId] = useState("");
  const [creating, setCreating] = useState(false);

  const [resettingId, setResettingId] = useState<string | null>(null);

  const loadStudents = useCallback(async (searchTerm: string) => {
    try {
      const data = await listStudents(searchTerm);
      setStudents(data);
    } catch (err: any) {
      Alert.alert("Failed to load students", err.message ?? "Something went wrong.");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadStudents(search).finally(() => setLoading(false));
  }, []);

  // Debounce search so we're not querying on every keystroke
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadStudents(search);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, loadStudents]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadStudents(search);
    setRefreshing(false);
  }

  async function handleAddStudent() {
    if (!/^\d{12}$/.test(newStudentId)) {
      Alert.alert("Invalid Student ID", "Student ID must be exactly 12 digits.");
      return;
    }

    setCreating(true);
    try {
      await createStudent(newStudentId);
      setAddModalVisible(false);
      setNewStudentId("");
      await loadStudents(search);
      Alert.alert(
        "Student added",
        `Student ${newStudentId} was created with the default password. They'll be asked to change it on first login.`
      );
    } catch (err: any) {
      Alert.alert("Failed to add student", err.message ?? "Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

  function confirmResetPassword(student: Profile) {
    Alert.alert(
      "Reset password?",
      `This will reset ${student.full_name || student.student_id}'s password back to the default. They'll be asked to change it on next login.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => handleResetPassword(student),
        },
      ]
    );
  }

  async function handleResetPassword(student: Profile) {
    if (!student.student_id) return;
    setResettingId(student.id);
    try {
      await resetStudentPassword(student.student_id);
      Alert.alert("Password reset", "The student's password was reset to the default.");
    } catch (err: any) {
      Alert.alert("Failed to reset password", err.message ?? "Something went wrong.");
    } finally {
      setResettingId(null);
    }
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-surface">
      <View className="flex-1 px-4 pt-4">
      <View className="flex-row items-center mb-4">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or Student ID"
          className="flex-1 border border-gray-300 rounded-xl px-4 py-3 bg-white mr-3"
        />
        <Pressable
          onPress={() => setAddModalVisible(true)}
          className="bg-shelf-600 rounded-xl px-4 py-3"
        >
          <Text className="text-white font-semibold">Add</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#164a2d" />
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View className="items-center justify-center mt-20">
              <Text className="text-muted">No students found.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-3 flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-base font-semibold text-shelf-700">
                  {item.full_name || "Not yet set up"}
                </Text>
                <Text className="text-muted text-sm">{item.student_id}</Text>
                {(item.grade_level || item.section) && (
                  <Text className="text-muted text-sm">
                    {[item.grade_level, item.section].filter(Boolean).join(" - ")}
                  </Text>
                )}
              </View>

              <Pressable
                onPress={() => confirmResetPassword(item)}
                disabled={resettingId === item.id}
                className="border border-shelf-600 rounded-lg px-3 py-2 disabled:opacity-50"
              >
                {resettingId === item.id ? (
                  <ActivityIndicator color="#164a2d" size="small" />
                ) : (
                  <Text className="text-shelf-600 font-medium text-sm">
                    Reset Password
                  </Text>
                )}
              </Pressable>
            </View>
          )}
        />
      )}

      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="bg-white rounded-2xl p-6 w-full">
            <Text className="text-lg font-bold text-shelf-700 mb-1">
              Add Student
            </Text>
            <Text className="text-muted text-sm mb-4">
              Enter the student's 12-digit Student ID. Their default password
              will be "password123" — they'll be required to change it on
              first login.
            </Text>

            <TextInput
              value={newStudentId}
              onChangeText={setNewStudentId}
              placeholder="12-digit Student ID"
              keyboardType="number-pad"
              maxLength={12}
              className="border border-gray-300 rounded-xl px-4 py-3 mb-4 bg-white"
            />

            <View className="flex-row justify-end">
              <Pressable
                onPress={() => {
                  setAddModalVisible(false);
                  setNewStudentId("");
                }}
                className="px-4 py-3 mr-2"
              >
                <Text className="text-muted font-medium">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleAddStudent}
                disabled={creating || newStudentId.length !== 12}
                className="bg-shelf-600 rounded-xl px-4 py-3 disabled:opacity-50"
              >
                {creating ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-white font-semibold">Create</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </SafeAreaView>
  );
}