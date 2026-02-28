import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { AuthGuard } from "@/components/auth-guard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

const ROLE_OPTIONS = ["technician", "manager", "admin"] as const;
type RoleOption = (typeof ROLE_OPTIONS)[number];

const ROLE_LABELS: Record<string, string> = {
  pending: "Pending",
  technician: "Technician",
  manager: "Manager",
  admin: "Admin",
  user: "User",
};

const ROLE_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  technician: "#0a7ea4",
  manager: "#8B5CF6",
  admin: "#EF4444",
  user: "#687076",
};

/** Cross-platform confirm dialog */
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

function AdminUsersContent() {
  const colors = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: allUsers, isLoading, refetch } = trpc.users.list.useQuery();
  const { data: pendingUsers } = trpc.users.pending.useQuery();

  const approveMutation = trpc.users.approve.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      utils.users.pending.invalidate();
    },
  });

  const rejectMutation = trpc.users.reject.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      utils.users.pending.invalidate();
    },
  });

  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
    },
  });

  const [refreshing, setRefreshing] = useState(false);
  // Role picker modal state
  const [roleModal, setRoleModal] = useState<{
    visible: boolean;
    userId: number;
    userName: string;
    mode: "approve" | "change";
    currentRole?: string;
  }>({ visible: false, userId: 0, userName: "", mode: "approve" });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleApprove = (userId: number, userName: string | null) => {
    setRoleModal({
      visible: true,
      userId,
      userName: userName || "this user",
      mode: "approve",
    });
  };

  const handleReject = async (userId: number, userName: string | null) => {
    const confirmed = await crossConfirm(
      "Reject User",
      `Are you sure you want to reject ${userName || "this user"}? Their account will be deleted.`,
    );
    if (confirmed) {
      rejectMutation.mutate({ userId });
    }
  };

  const handleChangeRole = (userId: number, userName: string | null, currentRole: string) => {
    setRoleModal({
      visible: true,
      userId,
      userName: userName || "this user",
      mode: "change",
      currentRole,
    });
  };

  const handleSelectRole = (role: string) => {
    if (roleModal.mode === "approve") {
      approveMutation.mutate({ userId: roleModal.userId, role: role as RoleOption });
    } else {
      updateRoleMutation.mutate({ userId: roleModal.userId, role: role as any });
    }
    setRoleModal((prev) => ({ ...prev, visible: false }));
  };

  const pendingCount = pendingUsers?.length ?? 0;

  const renderUser = ({ item }: { item: any }) => {
    const isPending = !item.approved;
    const roleColor = ROLE_COLORS[item.role] || colors.muted;

    return (
      <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.userHeader}>
          <View style={[styles.avatar, { backgroundColor: roleColor + "20" }]}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: roleColor }}>
              {item.name ? item.name.charAt(0).toUpperCase() : "?"}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>{item.name || "Unknown"}</Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>{item.email || "No email"}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: roleColor + "20" }]}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: roleColor }}>
              {ROLE_LABELS[item.role] || item.role}
            </Text>
          </View>
        </View>

        {isPending ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => handleApprove(item.id, item.name)}
              activeOpacity={0.7}
              style={[styles.actionButton, { backgroundColor: colors.success }]}
            >
              <IconSymbol name="checkmark.circle.fill" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleReject(item.id, item.name)}
              activeOpacity={0.7}
              style={[styles.actionButton, { backgroundColor: colors.error }]}
            >
              <IconSymbol name="xmark.circle.fill" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => handleChangeRole(item.id, item.name, item.role)}
              activeOpacity={0.7}
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
            >
              <IconSymbol name="pencil" size={14} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Change Role</Text>
            </TouchableOpacity>
          </View>
        )}

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
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  // Determine available roles for the modal
  const availableRoles =
    roleModal.mode === "approve"
      ? [...ROLE_OPTIONS]
      : ["pending", ...ROLE_OPTIONS].filter((r) => r !== roleModal.currentRole);

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
        renderItem={renderUser}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ color: colors.muted }}>No users found.</Text>
          </View>
        }
      />

      {/* Role Picker Modal */}
      <Modal
        visible={roleModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setRoleModal((prev) => ({ ...prev, visible: false }))}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setRoleModal((prev) => ({ ...prev, visible: false }))}
          style={styles.modalOverlay}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground, marginBottom: 4 }}>
              {roleModal.mode === "approve" ? "Approve & Assign Role" : "Change Role"}
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 20 }}>
              Select a role for {roleModal.userName}:
            </Text>

            {availableRoles.map((role) => {
              const roleColor = ROLE_COLORS[role] || colors.muted;
              return (
                <TouchableOpacity
                  key={role}
                  onPress={() => handleSelectRole(role)}
                  activeOpacity={0.7}
                  style={[styles.roleOption, { borderColor: colors.border }]}
                >
                  <View style={[styles.roleOptionDot, { backgroundColor: roleColor }]} />
                  <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, flex: 1 }}>
                    {ROLE_LABELS[role]}
                  </Text>
                  <IconSymbol name="chevron.right" size={18} color={colors.muted} />
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={() => setRoleModal((prev) => ({ ...prev, visible: false }))}
              activeOpacity={0.7}
              style={[styles.cancelButton, { borderColor: colors.border }]}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.muted }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pendingBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
  },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  roleOptionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cancelButton: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
});
