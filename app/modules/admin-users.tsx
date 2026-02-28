import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleApprove = (userId: number, userName: string | null) => {
    Alert.alert(
      "Approve User",
      `Approve ${userName || "this user"} and assign a role:`,
      [
        { text: "Cancel", style: "cancel" },
        ...ROLE_OPTIONS.map((role) => ({
          text: ROLE_LABELS[role],
          onPress: () => approveMutation.mutate({ userId, role }),
        })),
      ],
    );
  };

  const handleReject = (userId: number, userName: string | null) => {
    Alert.alert(
      "Reject User",
      `Are you sure you want to reject ${userName || "this user"}? Their account will be deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => rejectMutation.mutate({ userId }),
        },
      ],
    );
  };

  const handleChangeRole = (userId: number, userName: string | null, currentRole: string) => {
    const options = ["pending", ...ROLE_OPTIONS].filter((r) => r !== currentRole);
    Alert.alert(
      "Change Role",
      `Change role for ${userName || "this user"}:`,
      [
        { text: "Cancel", style: "cancel" },
        ...options.map((role) => ({
          text: ROLE_LABELS[role],
          onPress: () => updateRoleMutation.mutate({ userId, role: role as any }),
        })),
      ],
    );
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
            <Text className="text-base font-semibold text-foreground">{item.name || "Unknown"}</Text>
            <Text className="text-xs text-muted">{item.email || "No email"}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: roleColor + "20" }]}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: roleColor }}>
              {ROLE_LABELS[item.role] || item.role}
            </Text>
          </View>
        </View>

        {isPending ? (
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => handleApprove(item.id, item.name)}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: colors.success },
                pressed && { opacity: 0.8 },
              ]}
            >
              <IconSymbol name="checkmark.circle.fill" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Approve</Text>
            </Pressable>
            <Pressable
              onPress={() => handleReject(item.id, item.name)}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: colors.error },
                pressed && { opacity: 0.8 },
              ]}
            >
              <IconSymbol name="xmark.circle.fill" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Reject</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => handleChangeRole(item.id, item.name, item.role)}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.8 },
              ]}
            >
              <IconSymbol name="pencil" size={14} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Change Role</Text>
            </Pressable>
          </View>
        )}

        <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
          <Text className="text-xs text-muted">
            Joined: {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          <Text className="text-xs text-muted">
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

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
        >
          <IconSymbol name="chevron.right" size={24} color={colors.foreground} style={{ transform: [{ rotate: "180deg" }] }} />
        </Pressable>
        <Text className="text-2xl font-bold text-foreground ml-2 flex-1">User Management</Text>
        {pendingCount > 0 && (
          <View style={[styles.pendingBadge, { backgroundColor: colors.warning }]}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#FFFFFF" }}>{pendingCount}</Text>
          </View>
        )}
      </View>

      {/* Pending Section */}
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
            <Text className="text-muted">No users found.</Text>
          </View>
        }
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
});
