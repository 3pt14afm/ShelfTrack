import React from "react";
import { Tabs, useRouter } from "expo-router";
import {
  View,
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  Alert,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import {
  Users,
  Plus,
  LucideIcon,
  LayoutDashboard,
  FileClock,
  BookOpenText,
  X,
  ImagePlus,
  CheckCircle2,
  UserPlus,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabaseClient";
import { uploadBookCover, createStudent } from "@/lib/auth-helpers";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const TAB_ICONS: Record<string, LucideIcon> = {
  index: LayoutDashboard,
  students: Users,
  books: BookOpenText,
  transactions: FileClock,
};

const TAB_LABELS: Record<string, string> = {
  index: "Dashboard",
  students: "Students",
  books: "Books",
  transactions: "Transactions",
};

// ============================================================
// Design tokens — soft neumorphic base + glass surfaces,
// shared visual language across the app.
// ============================================================
const colors = {
  bgBase: "#EEF1F7",
  bgBaseAlt: "#E6EBF5",
  glass: "rgba(255,255,255,0.55)",
  glassStrong: "rgba(255,255,255,0.86)",
  glassBorder: "rgba(255,255,255,0.7)",
  glassBorderSoft: "rgba(255,255,255,0.45)",

  primary: "#164a2d",
  primaryDark: "#0d2e1c",
  primarySoft: "#1f6b40",

  textPrimary: "#1C1A16",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",

  white: "#ffffff",
  shadowDark: "#AEB8CC",
};

function GlassSurface({
  tint = "light",
  style,
  children,
}: {
  tint?: "light" | "dark";
  style?: any;
  children?: React.ReactNode;
}) {
  const isDark = tint === "dark";
  const baseColor = isDark ? "rgba(20,18,14,0.72)" : colors.glassStrong;
  const sheenColors = isDark
    ? (["rgba(255,255,255,0.05)", "rgba(255,255,255,0)"] as const)
    : (["rgba(255,255,255,0.55)", "rgba(255,255,255,0)"] as const);

  return (
    <View style={[style, { backgroundColor: baseColor, overflow: "hidden" }]}>
      <LinearGradient
        colors={sheenColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.7 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const BASE_WIDTH = 375;
const BASE_BAR_HEIGHT = 58;
const BASE_CORNER_RADIUS = 24;
const BASE_NOTCH_WIDTH = 45;
const BASE_NOTCH_DEPTH = 31;
const BASE_ADD_BUTTON_SIZE = 48;
const BASE_ICON_SIZE = 18;
const BASE_ADD_ICON_SIZE = 22;
const BASE_LABEL_FONT_SIZE = 10;

// Tablets/large screens: don't let the bar stretch edge-to-edge.
const MAX_BAR_WIDTH = 480;

function clamp(value: number, min: number, max: number) {
  "worklet";
  return Math.min(Math.max(value, min), max);
}

function getBarPath(
  width: number,
  height: number,
  cornerRadius: number,
  notchWidth: number,
  notchDepth: number
) {
  const cx = width / 2;
  const notchCurve = notchWidth * 0.4;
  return `
    M0,${cornerRadius}
    Q0,0 ${cornerRadius},0
    L${cx - notchWidth},0
    C${cx - notchWidth + notchCurve},0 ${cx - notchWidth + notchCurve},${notchDepth} ${cx},${notchDepth}
    C${cx + notchWidth - notchCurve},${notchDepth} ${cx + notchWidth - notchCurve},0 ${cx + notchWidth},0
    L${width - cornerRadius},0
    Q${width},0 ${width},${cornerRadius}
    L${width},${height}
    L0,${height}
    Z
  `;
}

function CustomTabBar({
  state,
  navigation,
  onAddPress,
}: BottomTabBarProps & { onAddPress: () => void }) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [barWidth, setBarWidth] = React.useState(0);

  // Scale factor derived from the window width, clamped so tiny
  // phones don't shrink the bar too far and tablets don't blow it
  // up past a sane size (the MAX_BAR_WIDTH cap handles tablets on
  // its own, so this stays close to 1 on wide screens).
  const scale = clamp(windowWidth / BASE_WIDTH, 0.88, 1.15);

  const sizes = React.useMemo(
    () => ({
      barHeight: Math.round(BASE_BAR_HEIGHT * scale),
      cornerRadius: Math.round(BASE_CORNER_RADIUS * scale),
      notchWidth: Math.round(BASE_NOTCH_WIDTH * scale),
      notchDepth: Math.round(BASE_NOTCH_DEPTH * scale),
      addButtonSize: Math.round(BASE_ADD_BUTTON_SIZE * scale),
      iconSize: Math.round(BASE_ICON_SIZE * scale),
      addIconSize: Math.round(BASE_ADD_ICON_SIZE * scale),
      labelFontSize: Math.round(clamp(BASE_LABEL_FONT_SIZE * scale, 9, 12)),
    }),
    [scale]
  );

  const centerSpacerWidth = sizes.notchWidth * 2 - Math.round(44 * scale);
  const addButtonTop = -Math.round(sizes.addButtonSize * 0.458);

  const routes = state.routes;
  const half = Math.ceil(routes.length / 2);
  const leftRoutes = routes.slice(0, half);
  const rightRoutes = routes.slice(half);

  const renderTab = (route: (typeof routes)[number], index: number) => {
    const isFocused = state.index === index;
    const Icon = TAB_ICONS[route.name] ?? LayoutDashboard;
    const label = TAB_LABELS[route.name] ?? route.name;
    const color = isFocused ? "#164a2d" : "#9CA3AF";

    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <Pressable key={route.key} onPress={onPress} style={styles.tabItem}>
        <Icon size={sizes.iconSize} color={color} />
        <Text
          style={[styles.tabLabel, { color, fontSize: sizes.labelFontSize }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View
        style={[
          styles.barContainer,
          {
            height: sizes.barHeight,
            maxWidth: MAX_BAR_WIDTH,
            paddingBottom: insets.bottom,
          },
        ]}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {barWidth > 0 && (
          <Svg width={barWidth} height={sizes.barHeight} style={StyleSheet.absoluteFill}>
            <Path
              d={getBarPath(
                barWidth,
                sizes.barHeight,
                sizes.cornerRadius,
                sizes.notchWidth,
                sizes.notchDepth
              )}
              fill="#ffffff"
            />
          </Svg>
        )}

        <View style={styles.contentRow}>
          <View style={styles.side}>{leftRoutes.map((r, i) => renderTab(r, i))}</View>
          <View style={{ width: centerSpacerWidth }} />
          <View style={styles.side}>
            {rightRoutes.map((r, i) => renderTab(r, i + half))}
          </View>
        </View>
      </View>

      <Pressable
        onPress={onAddPress}
        style={[
          styles.addButton,
          {
            top: addButtonTop,
            width: sizes.addButtonSize,
            height: sizes.addButtonSize,
            borderRadius: sizes.addButtonSize / 2,
          },
        ]}
        hitSlop={12}
      >
        <Plus size={sizes.addIconSize} color="#ffffff" />
      </Pressable>
    </View>
  );
}

// ============================================================
// Add Book / Add Student modal — reached from the tab bar's
// center Add button. Two tabs, one sheet. All create/validate
// logic here is copied over unchanged from books.tsx / students.tsx.
// ============================================================
type AddTab = "book" | "student";

function AddItemModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const profile = useAuthStore((s) => s.profile);
  const [activeTab, setActiveTab] = React.useState<AddTab>("book");

  // --- Book form state (from books.tsx) ---
  const [bookId, setBookId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [author, setAuthor] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [publisher, setPublisher] = React.useState("");
  const [isbn, setIsbn] = React.useState("");
  const [totalCopies, setTotalCopies] = React.useState("1");
  const [coverUri, setCoverUri] = React.useState<string | null>(null);
  const [submittingBook, setSubmittingBook] = React.useState(false);

  // --- Student form state (from students.tsx) ---
  const [newStudentId, setNewStudentId] = React.useState("");
  const [creatingStudent, setCreatingStudent] = React.useState(false);

  const resetBookForm = () => {
    setBookId("");
    setTitle("");
    setAuthor("");
    setCategory("");
    setPublisher("");
    setIsbn("");
    setTotalCopies("1");
    setCoverUri(null);
  };

  const resetStudentForm = () => {
    setNewStudentId("");
  };

  const handleClose = () => {
    if (submittingBook || creatingStudent) return;
    onClose();
    // Reset both forms once the sheet has closed.
    resetBookForm();
    resetStudentForm();
    setActiveTab("book");
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Permission to access media library is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setCoverUri(result.assets[0].uri);
    }
  };

  const handleAddBook = async () => {
    if (!bookId.trim() || !title.trim() || !author.trim()) {
      Alert.alert("Validation Error", "Please fill in Book ID, Title, and Author.");
      return;
    }

    const copies = parseInt(totalCopies, 10);
    if (isNaN(copies) || copies < 1) {
      Alert.alert("Validation Error", "Total copies must be at least 1.");
      return;
    }

    try {
      setSubmittingBook(true);

      const { data: newBook, error: insertError } = await supabase
        .from("books")
        .insert({
          book_id: bookId.trim(),
          title: title.trim(),
          author: author.trim(),
          category: category.trim() || null,
          publisher: publisher.trim() || null,
          isbn: isbn.trim() || null,
          total_copies: copies,
          available_copies: copies,
          created_by: profile?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (coverUri && newBook) {
        await uploadBookCover(newBook.id, newBook.book_id, coverUri);
      }

      Alert.alert("Success", "Book added successfully!");
      resetBookForm();
      onClose();
      setActiveTab("book");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to add book");
    } finally {
      setSubmittingBook(false);
    }
  };

  const handleAddStudent = async () => {
    if (!/^\d{12}$/.test(newStudentId)) {
      Alert.alert("Invalid Student ID", "Student ID must be exactly 12 digits.");
      return;
    }

    setCreatingStudent(true);
    try {
      await createStudent(newStudentId);
      resetStudentForm();
      onClose();
      setActiveTab("book");
      Alert.alert(
        "Student added",
        `Student ${newStudentId} was created with the default password. They'll be asked to change it on first login.`
      );
    } catch (err: any) {
      Alert.alert("Failed to add student", err.message ?? "Something went wrong.");
    } finally {
      setCreatingStudent(false);
    }
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={handleClose}>
      <View style={modalStyles.overlay}>
        <GlassSurface tint="dark" style={StyleSheet.absoluteFill} />
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />
        <GlassSurface tint="light" style={modalStyles.sheet}>
          <View style={modalStyles.grabberZone}>
            <View style={modalStyles.grabber} />
          </View>

          <View style={modalStyles.headerRow}>
            <Text style={modalStyles.title}>
              {activeTab === "book" ? "Add New Book" : "Add New Student"}
            </Text>
          </View>

          {/* Segmented tab switcher */}
          <View style={modalStyles.segmentWrap}>
            <View style={modalStyles.segmentTrack}>
              <TouchableOpacity
                onPress={() => setActiveTab("book")}
                activeOpacity={0.85}
                style={[
                  modalStyles.segmentPill,
                  activeTab === "book" && modalStyles.segmentPillActive,
                ]}
              >
                <BookOpenText
                  size={13}
                  color={activeTab === "book" ? colors.white : colors.textSecondary}
                />
                <Text
                  style={[
                    modalStyles.segmentText,
                    activeTab === "book" && modalStyles.segmentTextActive,
                  ]}
                >
                  Book
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab("student")}
                activeOpacity={0.85}
                style={[
                  modalStyles.segmentPill,
                  activeTab === "student" && modalStyles.segmentPillActive,
                ]}
              >
                <Users
                  size={13}
                  color={activeTab === "student" ? colors.white : colors.textSecondary}
                />
                <Text
                  style={[
                    modalStyles.segmentText,
                    activeTab === "student" && modalStyles.segmentTextActive,
                  ]}
                >
                  Student
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={modalStyles.form}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {activeTab === "book" ? (
              <>
                <Text style={modalStyles.label}>Book Cover</Text>
                <TouchableOpacity onPress={pickImage} style={modalStyles.imagePicker}>
                  {coverUri ? (
                    <Image source={{ uri: coverUri }} style={modalStyles.imagePreview} resizeMode="cover" />
                  ) : (
                    <View style={{ alignItems: "center" }}>
                      <ImagePlus size={20} color={colors.textMuted} />
                      <Text style={modalStyles.imagePickerText}>Tap to select cover image</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={modalStyles.inputGroup}>
                  <Text style={modalStyles.label}>Book ID / Code *</Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder="e.g. BK-00123"
                    placeholderTextColor={colors.textMuted}
                    value={bookId}
                    onChangeText={setBookId}
                  />
                </View>

                <View style={modalStyles.inputGroup}>
                  <Text style={modalStyles.label}>Title *</Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder="Book Title"
                    placeholderTextColor={colors.textMuted}
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>

                <View style={modalStyles.inputGroup}>
                  <Text style={modalStyles.label}>Author *</Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder="Author Name"
                    placeholderTextColor={colors.textMuted}
                    value={author}
                    onChangeText={setAuthor}
                  />
                </View>

                <View style={modalStyles.inputGroup}>
                  <Text style={modalStyles.label}>Category</Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder="e.g. Science, Fiction"
                    placeholderTextColor={colors.textMuted}
                    value={category}
                    onChangeText={setCategory}
                  />
                </View>

                <View style={modalStyles.inputGroup}>
                  <Text style={modalStyles.label}>Publisher</Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder="Publisher Name"
                    placeholderTextColor={colors.textMuted}
                    value={publisher}
                    onChangeText={setPublisher}
                  />
                </View>

                <View style={modalStyles.inputGroup}>
                  <Text style={modalStyles.label}>ISBN</Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder="ISBN Number"
                    placeholderTextColor={colors.textMuted}
                    value={isbn}
                    onChangeText={setIsbn}
                  />
                </View>

                <View style={modalStyles.inputGroup}>
                  <Text style={modalStyles.label}>Total Copies *</Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder="1"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={totalCopies}
                    onChangeText={setTotalCopies}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleAddBook}
                  disabled={submittingBook}
                  style={[modalStyles.submitButton, submittingBook && modalStyles.submitButtonDisabled]}
                  activeOpacity={0.88}
                >
                  {submittingBook ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <>
                      <CheckCircle2 size={14} color={colors.white} />
                      <Text style={modalStyles.submitButtonText}>Save Book</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={modalStyles.label}>12-Digit Student ID</Text>
                <TextInput
                  style={modalStyles.input}
                  placeholder="e.g. 202312345678"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={12}
                  value={newStudentId}
                  onChangeText={setNewStudentId}
                />

                <View style={modalStyles.infoBox}>
                  <Text style={modalStyles.infoBoxText}>
                    The default password will be "password123". The student will be required to
                    change it upon their first login.
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleAddStudent}
                  disabled={creatingStudent || newStudentId.length !== 12}
                  style={[
                    modalStyles.submitButton,
                    (creatingStudent || newStudentId.length !== 12) &&
                      modalStyles.submitButtonDisabled,
                  ]}
                  activeOpacity={0.88}
                >
                  {creatingStudent ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <>
                      <UserPlus size={14} color={colors.white} />
                      <Text style={modalStyles.submitButtonText}>Create Student</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </GlassSurface>
      </View>
    </Modal>
  );
}

export default function LibrarianLayout() {
  const profile = useAuthStore((s) => s.profile);
  const [addModalVisible, setAddModalVisible] = React.useState(false);

  // No Redirect here on purpose — app/_layout.tsx already guarantees
  // we only reach this screen with a valid session + librarian profile.
  // A second Redirect firing here at the same time as the root layout's
  // was what caused the logout loop.
  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color="#164a2d" />
      </View>
    );
  }

  return (
    <>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => (
          <CustomTabBar {...props} onAddPress={() => setAddModalVisible(true)} />
        )}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="books" />
        <Tabs.Screen name="students" />
        <Tabs.Screen name="transactions" />
      </Tabs>

      <AddItemModal visible={addModalVisible} onClose={() => setAddModalVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
  },
  barContainer: {
    width: "100%",
    alignSelf: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  contentRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  side: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "space-evenly",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    flexShrink: 1,
    minWidth: 0,
    paddingHorizontal: 2,
  },
  tabLabel: {
    marginTop: 2,
  },
  addButton: {
    position: "absolute",
    backgroundColor: "#164a2d",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: { elevation: 6 },
    }),
  },
});

// --- Add Item Modal Styles ---
const modalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    maxHeight: "92%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderBottomWidth: 0,
    overflow: "hidden",
  },
  grabberZone: { alignItems: "center", paddingTop: 10, paddingBottom: 4 },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.15)" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  title: { fontSize: 16, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.2 },

  segmentWrap: {
    paddingHorizontal: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    alignItems: "center",
  },
  segmentTrack: {
    width: "70%",
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255, 1)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    padding: 2,
    gap: 4,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  segmentPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
  },
  segmentPillActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  segmentText: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  segmentTextActive: { color: colors.white },

  form: { paddingHorizontal: 22, paddingTop: 16 },
  label: { marginBottom: 4, fontSize: 10, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  imagePicker: {
    marginBottom: 20,
    height: 210,
    width: "50%",
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.glassBorder,
    backgroundColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: colors.bgBase,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
    alignSelf: "center"
  },
  imagePreview: { height: "100%", width: "100%" },
  imagePickerText: { marginTop: 8, fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
  inputGroup: { marginBottom: 12 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: "rgba(255,255,255,0.6)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.textPrimary,
    shadowColor: colors.bgBase,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  infoBox: {
    flexDirection: "row",
    padding: 10,
    marginBottom: 20,
  },
  infoBoxText: { fontSize: 10, color: colors.textSecondary, lineHeight: 14, flex: 1 },
  submitButton: {
    marginTop: 4,
    marginBottom: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 8,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: colors.white, fontWeight: "700", fontSize: 12 },
});