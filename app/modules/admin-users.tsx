import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { AuthGuard } from "@/components/auth-guard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

// ─── Constants ───────────────────────────────────────────────────────────────

const SYSTEM_ROLES = ["pending", "guest", "member", "manager", "admin"] as const;
type SystemRole = (typeof SYSTEM_ROLES)[number];

const SYSTEM_ROLE_LABELS: Record<string, string> = {
  pending: "Pending",
  guest: "Guest",
  member: "Team Member",
  manager: "Manager",
  admin: "Admin",
  // Legacy values kept for display of old records
  user: "User",
  technician: "Technician",
};

const SYSTEM_ROLE_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  guest: "#94A3B8",
  member: "#0a7ea4",
  manager: "#8B5CF6",
  admin: "#EF4444",
  user: "#687076",
  technician: "#0a7ea4",
};

/** The 17 DOS job roles users can be assigned (multi-select) */
const DOS_ROLES = [
  "Owner",
  "Finance Dept.",
  "Project Consultant",
  "Sales Manager",
  "Construction Coordinator",
  "Executive Assistant",
  "Permit Dept",
  "Logistics Dept",
  "Drafting",
  "Engineering",
  "Operations Manager",
  "Project Manager",
  "Project Supervisor",
  "Warehouse Manager",
  "Marketing",
  "Team Member",
  "Guest User",
] as const;

/** Module-level permissions */
const MODULE_PERMISSIONS: { key: string; label: string; icon: any }[] = [
  { key: "receipt-capture", label: "Receipt Capture", icon: "camera.fill" },
  { key: "zoning-lookup", label: "Zoning Lookup", icon: "map.fill" },
  { key: "screen-ordering", label: "Screen Ordering", icon: "rectangle.grid.2x2.fill" },
  { key: "job-intelligence", label: "Job Intelligence", icon: "chart.bar.fill" },
  { key: "hubspot-crm", label: "HubSpot CRM", icon: "link" },
  { key: "training", label: "Training", icon: "book.fill" },
  { key: "client-meeting-report", label: "Client Meeting Report", icon: "doc.text.fill" },
  { key: "sales-pipeline", label: "Sales Pipeline", icon: "chart.bar.fill" },
  { key: "dashboard", label: "Dashboard", icon: "chart.bar.fill" },
  { key: "admin-users", label: "User Management", icon: "person.2.fill" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function crossConfirm(title: string, message: string): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  const { Alert } = require("react-native");
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "OK", onPress: () => resolve(true) },
    ]);
  });
}

// ─── Role Picker Modal ────────────────────────────────────────────────────────

function SystemRoleModal({
  visible,
  userName,
  mode,
  currentRole,
  onSelect,
  onClose,
}: {
  visible: boolean;
  userName: string;
  mode: "approve" | "change";
  currentRole?: string;
  onSelect: (role: string) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const availableRoles =
    mode === "approve"
      ? [...SYSTEM_ROLES]
      : (["pending", ...SYSTEM_ROLES] as string[]).filter((r) => r !== currentRole);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.modalOverlay}>
        <View
          style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onStartShouldSetResponder={() => true}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground, marginBottom: 4 }}>
            {mode === "approve" ? "Approve & Assign Role" : "Change System Role"}
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 20 }}>
            Select a system role for {userName}:
          </Text>
          {availableRoles.map((role) => {
            const roleColor = SYSTEM_ROLE_COLORS[role] || colors.muted;
            return (
              <TouchableOpacity
                key={role}
                onPress={() => onSelect(role)}
                activeOpacity={0.7}
                style={[styles.roleOption, { borderColor: colors.border }]}
              >
                <View style={[styles.roleOptionDot, { backgroundColor: roleColor }]} />
                <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, flex: 1 }}>
                  {SYSTEM_ROLE_LABELS[role] || role}
                </Text>
                <IconSymbol name="chevron.right" size={18} color={colors.muted} />
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            style={[styles.cancelButton, { borderColor: colors.border }]}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.muted }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── DOS Roles Modal ──────────────────────────────────────────────────────────

function DosRolesModal({
  visible,
  userName,
  selectedRoles,
  onSave,
  onClose,
}: {
  visible: boolean;
  userName: string;
  selectedRoles: string[];
  onSave: (roles: string[]) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const [draft, setDraft] = useState<string[]>(selectedRoles);

  // Sync draft when modal opens
  const handleToggle = (role: string) => {
    setDraft((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => setDraft(selectedRoles)}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[styles.modalContent, styles.tallModal, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground, marginBottom: 4 }}>
            Assign Job Roles
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 16 }}>
            Select all roles that apply to {userName}:
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
            {DOS_ROLES.map((role) => {
              const selected = draft.includes(role);
              return (
                <TouchableOpacity
                  key={role}
                  onPress={() => handleToggle(role)}
                  activeOpacity={0.7}
                  style={[
                    styles.checkRow,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary + "12" : "transparent",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.primary : "transparent",
                      },
                    ]}
                  >
                    {selected && <IconSymbol name="checkmark" size={12} color="#FFFFFF" />}
                  </View>
                  <Text style={{ fontSize: 15, color: colors.foreground, flex: 1 }}>{role}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={[styles.modalBtn, { borderColor: colors.border, flex: 1 }]}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.muted }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onSave(draft)}
              activeOpacity={0.7}
              style={[styles.modalBtn, { backgroundColor: colors.primary, flex: 1 }]}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#FFFFFF" }}>Save Roles</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Permissions Modal ────────────────────────────────────────────────────────

function PermissionsModal({
  visible,
  userName,
  currentPermissions,
  onSave,
  onClose,
}: {
  visible: boolean;
  userName: string;
  currentPermissions: Record<string, boolean>;
  onSave: (perms: Record<string, boolean>) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const [draft, setDraft] = useState<Record<string, boolean>>(currentPermissions);

  const handleToggle = (key: string) => {
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => setDraft(currentPermissions)}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[styles.modalContent, styles.tallModal, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground, marginBottom: 4 }}>
            Module Permissions
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 16 }}>
            Toggle access for {userName}:
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
            {MODULE_PERMISSIONS.map((mod) => {
              const enabled = draft[mod.key] !== false; // default to true (access granted)
              return (
                <View
                  key={mod.key}
                  style={[styles.permRow, { borderBottomColor: colors.border }]}
                >
                  <IconSymbol name={mod.icon} size={18} color={enabled ? colors.primary : colors.muted} />
                  <Text style={{ flex: 1, fontSize: 15, color: colors.foreground, marginLeft: 10 }}>
                    {mod.label}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleToggle(mod.key)}
                    activeOpacity={0.7}
                    style={[
                      styles.toggle,
                      { backgroundColor: enabled ? colors.primary : colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        { transform: [{ translateX: enabled ? 18 : 2 }] },
                      ]}
                    />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={[styles.modalBtn, { borderColor: colors.border, flex: 1 }]}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.muted }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onSave(draft)}
              activeOpacity={0.7}
              style={[styles.modalBtn, { backgroundColor: colors.primary, flex: 1 }]}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#FFFFFF" }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── User Card ────────────────────────────────────────────────────────────────

function UserCard({ item, onApprove, onReject, onChangeRole, onChangeDosRoles, onChangePermissions }: {
  item: any;
  onApprove: () => void;
  onReject: () => void;
  onChangeRole: () => void;
  onChangeDosRoles: () => void;
  onChangePermissions: () => void;
}) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const isPending = !item.approved;
  const roleColor = SYSTEM_ROLE_COLORS[item.role] || colors.muted;
  const dosRoles: string[] = Array.isArray(item.dosRoles) ? item.dosRoles : [];

  return (
    <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Header row */}
      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.8}
        style={styles.userHeader}
      >
        <View style={[styles.avatar, { backgroundColor: roleColor + "20" }]}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: roleColor }}>
            {item.name ? item.name.charAt(0).toUpperCase() : "?"}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>{item.name || "Unknown"}</Text>
          <Text style={{ fontSize: 12, color: colors.muted }}>{item.email || "No email"}</Text>
          {dosRoles.length > 0 && (
            <Text style={{ fontSize: 11, color: colors.primary, marginTop: 2 }} numberOfLines={1}>
              {dosRoles.join(" · ")}
            </Text>
          )}
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <View style={[styles.roleBadge, { backgroundColor: roleColor + "20" }]}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: roleColor }}>
              {SYSTEM_ROLE_LABELS[item.role] || item.role}
            </Text>
          </View>
          <IconSymbol
            name="chevron.right"
            size={14}
            color={colors.muted}
            style={{ transform: [{ rotate: expanded ? "90deg" : "0deg" }] }}
          />
        </View>
      </TouchableOpacity>

      {/* Pending actions */}
      {isPending && (
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={onApprove} activeOpacity={0.7} style={[styles.actionButton, { backgroundColor: colors.success }]}>
            <IconSymbol name="checkmark.circle.fill" size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onReject} activeOpacity={0.7} style={[styles.actionButton, { backgroundColor: colors.error }]}>
            <IconSymbol name="xmark.circle.fill" size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Expanded management panel */}
      {expanded && !isPending && (
        <View style={[styles.expandedPanel, { borderTopColor: colors.border }]}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Manage User
          </Text>
          <View style={styles.mgmtRow}>
            <TouchableOpacity
              onPress={onChangeRole}
              activeOpacity={0.7}
              style={[styles.mgmtBtn, { borderColor: colors.border }]}
            >
              <IconSymbol name="person.fill" size={14} color={colors.primary} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>System Role</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onChangeDosRoles}
              activeOpacity={0.7}
              style={[styles.mgmtBtn, { borderColor: colors.border }]}
            >
              <IconSymbol name="list.bullet" size={14} color={colors.primary} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>
                Job Roles {dosRoles.length > 0 ? `(${dosRoles.length})` : ""}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onChangePermissions}
              activeOpacity={0.7}
              style={[styles.mgmtBtn, { borderColor: colors.border }]}
            >
              <IconSymbol name="lock.fill" size={14} color={colors.primary} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>Permissions</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Meta row */}
      <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
        <Text style={{ fontSize: 11, color: colors.muted }}>
          Joined: {new Date(item.createdAt).toLocaleDateString()}
        </Text>
        <Text style={{ fontSize: 11, color: colors.muted }}>
          Last active: {new Date(item.lastSignedIn).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function AdminUsersContent() {
  const colors = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: allUsers, isLoading, refetch } = trpc.users.list.useQuery();
  const { data: pendingUsers } = trpc.users.pending.useQuery();

  const approveMutation = trpc.users.approve.useMutation({
    onSuccess: () => { utils.users.list.invalidate(); utils.users.pending.invalidate(); },
  });
  const rejectMutation = trpc.users.reject.useMutation({
    onSuccess: () => { utils.users.list.invalidate(); utils.users.pending.invalidate(); },
  });
  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => utils.users.list.invalidate(),
  });
  const updateDosRolesMutation = trpc.users.updateDosRoles.useMutation({
    onSuccess: () => utils.users.list.invalidate(),
  });
  const updatePermissionsMutation = trpc.users.updatePermissions.useMutation({
    onSuccess: () => utils.users.list.invalidate(),
  });

  const [refreshing, setRefreshing] = useState(false);

  // System role modal
  const [roleModal, setRoleModal] = useState<{
    visible: boolean; userId: number; userName: string; mode: "approve" | "change"; currentRole?: string;
  }>({ visible: false, userId: 0, userName: "", mode: "approve" });

  // DOS roles modal
  const [dosModal, setDosModal] = useState<{
    visible: boolean; userId: number; userName: string; currentRoles: string[];
  }>({ visible: false, userId: 0, userName: "", currentRoles: [] });

  // Permissions modal
  const [permsModal, setPermsModal] = useState<{
    visible: boolean; userId: number; userName: string; currentPermissions: Record<string, boolean>;
  }>({ visible: false, userId: 0, userName: "", currentPermissions: {} });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleApprove = (userId: number, userName: string | null) => {
    setRoleModal({ visible: true, userId, userName: userName || "this user", mode: "approve" });
  };

  const handleReject = async (userId: number, userName: string | null) => {
    const confirmed = await crossConfirm("Reject User", `Reject ${userName || "this user"}? Their account will be deleted.`);
    if (confirmed) rejectMutation.mutate({ userId });
  };

  const handleChangeRole = (userId: number, userName: string | null, currentRole: string) => {
    setRoleModal({ visible: true, userId, userName: userName || "this user", mode: "change", currentRole });
  };

  const handleSelectSystemRole = (role: string) => {
    if (roleModal.mode === "approve") {
      approveMutation.mutate({ userId: roleModal.userId, role: role as SystemRole });
    } else {
      updateRoleMutation.mutate({ userId: roleModal.userId, role: role as any });
    }
    setRoleModal((prev) => ({ ...prev, visible: false }));
  };

  const handleChangeDosRoles = (userId: number, userName: string | null, currentRoles: string[]) => {
    setDosModal({ visible: true, userId, userName: userName || "this user", currentRoles });
  };

  const handleSaveDosRoles = (roles: string[]) => {
    updateDosRolesMutation.mutate({ userId: dosModal.userId, dosRoles: roles });
    setDosModal((prev) => ({ ...prev, visible: false }));
  };

  const handleChangePermissions = (userId: number, userName: string | null, currentPermissions: Record<string, boolean>) => {
    setPermsModal({ visible: true, userId, userName: userName || "this user", currentPermissions });
  };

  const handleSavePermissions = (perms: Record<string, boolean>) => {
    updatePermissionsMutation.mutate({ userId: permsModal.userId, permissions: perms });
    setPermsModal((prev) => ({ ...prev, visible: false }));
  };

  const pendingCount = pendingUsers?.length ?? 0;

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6}>
          <IconSymbol name="chevron.right" size={24} color={colors.foreground} style={{ transform: [{ rotate: "180deg" }] }} />
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground, marginLeft: 8, flex: 1 }}>
          User Management
        </Text>
        {pendingCount > 0 && (
          <View style={[styles.pendingBadge, { backgroundColor: colors.warning }]}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#FFFFFF" }}>{pendingCount}</Text>
          </View>
        )}
      </View>

      {/* Pending Banner */}
      {pendingCount > 0 && (
        <View style={[styles.pendingBanner, { backgroundColor: colors.warning + "15", borderColor: colors.warning + "40" }]}>
          <IconSymbol name="exclamationmark.triangle.fill" size={18} color={colors.warning} />
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.warning, marginLeft: 8 }}>
            {pendingCount} user{pendingCount > 1 ? "s" : ""} awaiting approval
          </Text>
        </View>
      )}

      <FlatList
        data={allUsers}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <UserCard
            item={item}
            onApprove={() => handleApprove(item.id, item.name)}
            onReject={() => handleReject(item.id, item.name)}
            onChangeRole={() => handleChangeRole(item.id, item.name, item.role)}
            onChangeDosRoles={() => handleChangeDosRoles(item.id, item.name, Array.isArray(item.dosRoles) ? item.dosRoles : [])}
            onChangePermissions={() => handleChangePermissions(item.id, item.name, (item.permissions as Record<string, boolean>) || {})}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ color: colors.muted }}>No users found.</Text>
          </View>
        }
      />

      {/* System Role Modal */}
      <SystemRoleModal
        visible={roleModal.visible}
        userName={roleModal.userName}
        mode={roleModal.mode}
        currentRole={roleModal.currentRole}
        onSelect={handleSelectSystemRole}
        onClose={() => setRoleModal((prev) => ({ ...prev, visible: false }))}
      />

      {/* DOS Roles Modal */}
      <DosRolesModal
        visible={dosModal.visible}
        userName={dosModal.userName}
        selectedRoles={dosModal.currentRoles}
        onSave={handleSaveDosRoles}
        onClose={() => setDosModal((prev) => ({ ...prev, visible: false }))}
      />

      {/* Permissions Modal */}
      <PermissionsModal
        visible={permsModal.visible}
        userName={permsModal.userName}
        currentPermissions={permsModal.currentPermissions}
        onSave={handleSavePermissions}
        onClose={() => setPermsModal((prev) => ({ ...prev, visible: false }))}
      />
    </ScreenContainer>
  );
}

export default function AdminUsersScreen() {
  return (
    <AuthGuard requireAdmin>
      <AdminUsersContent />
    </AuthGuard>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  userCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  userHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  userInfo: { flex: 1 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  actionRow: { flexDirection: "row", paddingHorizontal: 14, paddingBottom: 12, gap: 10 },
  actionButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 6 },
  actionButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  expandedPanel: { paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  mgmtRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  mgmtBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
  },
  metaRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  pendingBadge: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  pendingBanner: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalContent: { width: "100%", maxWidth: 400, borderRadius: 16, borderWidth: 1, padding: 20 },
  tallModal: { maxHeight: "85%" },
  roleOption: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  roleOptionDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  cancelButton: { marginTop: 12, paddingVertical: 14, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  // Checkbox rows
  checkRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, marginBottom: 6, borderRadius: 8, borderWidth: 1, gap: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  // Permission rows
  permRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  toggle: { width: 40, height: 22, borderRadius: 11, justifyContent: "center" },
  toggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#FFFFFF" },
  // Modal buttons
  modalBtn: { paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: "center" },
});
