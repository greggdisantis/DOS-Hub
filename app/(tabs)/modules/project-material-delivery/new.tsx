import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

const PROJECT_SUPERVISOR_ROLE = "Project Supervisor";
const WAREHOUSE_MANAGER_ROLE = "Warehouse Manager";

export default function NewChecklistScreen() {
  const colors = useColors();
  const router = useRouter();

  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [supervisorUserId, setSupervisorUserId] = useState<number | null>(null);
  const [supervisorName, setSupervisorName] = useState("");
  const [showSupervisorPicker, setShowSupervisorPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: users } = trpc.users.list.useQuery();
  const createMutation = trpc.projectMaterial.create.useMutation();
  const utils = trpc.useUtils();

  // Sort users: Project Supervisors first, then everyone else
  const sortedUsers = useMemo(() => {
    if (!users) return [];
    const supervisors = users.filter((u: any) =>
      Array.isArray(u.dosRoles) && u.dosRoles.includes(PROJECT_SUPERVISOR_ROLE),
    );
    const others = users.filter(
      (u: any) => !Array.isArray(u.dosRoles) || !u.dosRoles.includes(PROJECT_SUPERVISOR_ROLE),
    );
    return [...supervisors, ...others];
  }, [users]);

  const handleCreate = async () => {
    if (!projectName.trim()) {
      Alert.alert("Required", "Please enter a project name.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createMutation.mutateAsync({
        projectName: projectName.trim(),
        clientName: clientName.trim() || undefined,
        projectLocation: projectLocation.trim() || undefined,
        supervisorUserId: supervisorUserId ?? undefined,
        supervisorName: supervisorName || undefined,
      });
      await utils.projectMaterial.list.invalidate();
      // Navigate to the detail/edit screen
      router.replace({
        pathname: "/(tabs)/modules/project-material-delivery/detail",
        params: { id: String(result.id), isNew: "1" },
      });
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to create checklist.");
    } finally {
      setSubmitting(false);
    }
  };

  const getUserDisplayName = (u: any) =>
    [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || u.email || "Unknown";

  const isProjectSupervisor = (u: any) =>
    Array.isArray(u.dosRoles) && u.dosRoles.includes(PROJECT_SUPERVISOR_ROLE);

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>New Checklist</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Project Information</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
          Step 1 of 4 — Enter the basic project details to start the checklist.
        </Text>

        {/* Project Name */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Project Name <Text style={{ color: colors.error }}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            value={projectName}
            onChangeText={setProjectName}
            placeholder="e.g. Smith Residence - Patio Enclosure"
            placeholderTextColor={colors.muted}
            returnKeyType="next"
          />
        </View>

        {/* Client Name */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Client Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            value={clientName}
            onChangeText={setClientName}
            placeholder="e.g. John Smith"
            placeholderTextColor={colors.muted}
            returnKeyType="next"
          />
        </View>

        {/* Project Location */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Project Location / Address</Text>
          <TextInput
            style={[styles.input, styles.multiline, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            value={projectLocation}
            onChangeText={setProjectLocation}
            placeholder="e.g. 123 Main St, Springfield, IL"
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={2}
            returnKeyType="done"
          />
        </View>

        {/* Project Supervisor */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Project Supervisor</Text>
          <TouchableOpacity
            style={[styles.input, styles.picker, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowSupervisorPicker(true)}
            activeOpacity={0.8}
          >
            <Text style={{ color: supervisorName ? colors.foreground : colors.muted, fontSize: 15 }}>
              {supervisorName || "Select supervisor..."}
            </Text>
            <Text style={{ color: colors.muted }}>▾</Text>
          </TouchableOpacity>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 }]}
          onPress={handleCreate}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createBtnText}>Create Checklist →</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Supervisor Picker Modal */}
      <Modal visible={showSupervisorPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Supervisor</Text>
            <TouchableOpacity onPress={() => setShowSupervisorPicker(false)}>
              <Text style={[styles.modalClose, { color: colors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={sortedUsers}
            keyExtractor={(u: any) => String(u.id)}
            renderItem={({ item: u, index }) => {
              const name = getUserDisplayName(u);
              const isSupervisor = isProjectSupervisor(u);
              const isSelected = supervisorUserId === u.id;
              // Section header for non-supervisors
              const prevIsSupervisor = index > 0 ? isProjectSupervisor(sortedUsers[index - 1]) : true;
              const showDivider = !isSupervisor && prevIsSupervisor && index > 0;
              return (
                <>
                  {showDivider && (
                    <View style={[styles.divider, { borderTopColor: colors.border }]}>
                      <Text style={[styles.dividerText, { color: colors.muted }]}>Other Users</Text>
                    </View>
                  )}
                  {index === 0 && isSupervisor && (
                    <Text style={[styles.sectionHeader, { color: colors.muted }]}>Project Supervisors</Text>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.userRow,
                      { borderBottomColor: colors.border },
                      isSelected && { backgroundColor: colors.primary + "15" },
                    ]}
                    onPress={() => {
                      setSupervisorUserId(u.id);
                      setSupervisorName(name);
                      setShowSupervisorPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View>
                      <Text style={[styles.userName, { color: colors.foreground }]}>{name}</Text>
                      {isSupervisor && (
                        <Text style={[styles.userRole, { color: colors.primary }]}>Project Supervisor</Text>
                      )}
                    </View>
                    {isSelected && <Text style={{ color: colors.primary, fontSize: 18 }}>✓</Text>}
                  </TouchableOpacity>
                </>
              );
            }}
          />
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 60 },
  backText: { fontSize: 15, fontWeight: "500" },
  title: { fontSize: 18, fontWeight: "700" },
  content: { padding: 20, gap: 4, paddingBottom: 60 },
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  multiline: { minHeight: 64, textAlignVertical: "top" },
  picker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  createBtn: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  createBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  modalClose: { fontSize: 16, fontWeight: "600" },
  sectionHeader: { fontSize: 12, fontWeight: "600", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  dividerText: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userName: { fontSize: 15, fontWeight: "500" },
  userRole: { fontSize: 12, marginTop: 2 },
});
