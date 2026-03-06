import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
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
import { useCallback, useState } from "react";

/**
 * Super-Admin Dashboard
 * Shows system-wide analytics, user activity logs, and deployment history
 */
export default function SuperAdminDashboard() {
  const colors = useColors();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch audit logs and notifications
  const { data: auditLogs, isLoading, refetch } = trpc.superAdmin.getAuditLogs.useQuery(
    { limit: 50 },
    { enabled: true }
  );

  const { data: notifications } = trpc.superAdmin.getUnreadNotifications.useQuery(
    undefined,
    { enabled: true }
  );

  const { data: stats } = trpc.superAdmin.getSystemStats.useQuery(
    undefined,
    { enabled: true }
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <AuthGuard requireAdmin>
      <ScreenContainer className="bg-background">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View className="p-6 gap-6">
            {/* Header */}
            <View className="gap-2">
              <Text className="text-3xl font-bold text-foreground">Super-Admin Dashboard</Text>
              <Text className="text-base text-muted">System overview & activity logs</Text>
            </View>

            {/* System Stats Cards */}
            {stats && (
              <View className="gap-4">
                <View className="flex-row gap-3">
                  {/* Total Users Card */}
                  <View
                    className="flex-1 bg-surface rounded-2xl p-4 border border-border"
                    style={{ borderColor: colors.border }}
                  >
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className="text-sm text-muted mb-1">Total Users</Text>
                        <Text className="text-2xl font-bold text-foreground">{stats.totalUsers}</Text>
                      </View>
                      <View
                        className="w-12 h-12 rounded-full items-center justify-center"
                        style={{ backgroundColor: colors.primary + "20" }}
                      >
                        <IconSymbol name="person.2.fill" size={24} color={colors.primary} />
                      </View>
                    </View>
                  </View>

                  {/* Pending Approvals Card */}
                  <View
                    className="flex-1 bg-surface rounded-2xl p-4 border border-border"
                    style={{ borderColor: colors.border }}
                  >
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className="text-sm text-muted mb-1">Pending</Text>
                        <Text className="text-2xl font-bold text-foreground">{stats.pendingUsers}</Text>
                      </View>
                      <View
                        className="w-12 h-12 rounded-full items-center justify-center"
                        style={{ backgroundColor: colors.warning + "20" }}
                      >
                        <IconSymbol name="clock.fill" size={24} color={colors.warning} />
                      </View>
                    </View>
                  </View>
                </View>

                <View className="flex-row gap-3">
                  {/* Super-Admins Card */}
                  <View
                    className="flex-1 bg-surface rounded-2xl p-4 border border-border"
                    style={{ borderColor: colors.border }}
                  >
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className="text-sm text-muted mb-1">Super-Admins</Text>
                        <Text className="text-2xl font-bold text-foreground">{stats.superAdmins}</Text>
                      </View>
                      <View
                        className="w-12 h-12 rounded-full items-center justify-center"
                        style={{ backgroundColor: "#3B82F6" + "20" }}
                      >
                        <IconSymbol name="shield.fill" size={24} color="#3B82F6" />
                      </View>
                    </View>
                  </View>

                  {/* Admins Card */}
                  <View
                    className="flex-1 bg-surface rounded-2xl p-4 border border-border"
                    style={{ borderColor: colors.border }}
                  >
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className="text-sm text-muted mb-1">Admins</Text>
                        <Text className="text-2xl font-bold text-foreground">{stats.admins}</Text>
                      </View>
                      <View
                        className="w-12 h-12 rounded-full items-center justify-center"
                        style={{ backgroundColor: colors.error + "20" }}
                      >
                        <IconSymbol name="person.badge.key.fill" size={24} color={colors.error} />
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Unread Notifications */}
            {notifications && notifications.length > 0 && (
              <View className="gap-3">
                <Text className="text-lg font-bold text-foreground">
                  Critical Alerts ({notifications.length})
                </Text>
                {notifications.slice(0, 3).map((notif) => (
                  <View
                    key={notif.id}
                    className="bg-surface rounded-xl p-4 border border-border gap-2"
                    style={{
                      borderColor:
                        notif.severity === "critical"
                          ? colors.error
                          : notif.severity === "warning"
                            ? colors.warning
                            : colors.border,
                      borderLeftWidth: 4,
                    }}
                  >
                    <Text className="font-semibold text-foreground">{notif.title}</Text>
                    <Text className="text-sm text-muted">{notif.message}</Text>
                    <Text className="text-xs text-muted mt-1">
                      {new Date(notif.createdAt).toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Recent Activity */}
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-bold text-foreground">Recent Activity</Text>
                {isLoading && <ActivityIndicator size="small" color={colors.primary} />}
              </View>

              {auditLogs && auditLogs.length > 0 ? (
                <FlatList
                  data={auditLogs}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <View className="bg-surface rounded-xl p-4 mb-3 border border-border gap-2">
                      <View className="flex-row items-center justify-between">
                        <Text className="font-semibold text-foreground flex-1">
                          {item.actionType.replace(/_/g, " ").toUpperCase()}
                        </Text>
                        <Text className="text-xs text-muted">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text className="text-sm text-muted">{item.description}</Text>
                      {item.details && (
                        <Text className="text-xs text-muted mt-1">
                          {JSON.stringify(item.details).substring(0, 100)}...
                        </Text>
                      )}
                    </View>
                  )}
                />
              ) : (
                <View className="bg-surface rounded-xl p-8 items-center justify-center">
                  <Text className="text-muted">No recent activity</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </ScreenContainer>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
