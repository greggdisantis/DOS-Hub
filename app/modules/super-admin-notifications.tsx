import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { AuthGuard } from "@/components/auth-guard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useCallback, useState } from "react";

/**
 * Super-Admin Notifications Center
 * Shows critical system events and alerts that only super-admins can see
 */
export default function SuperAdminNotifications() {
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch unread notifications
  const { data: notifications, isLoading, refetch } = trpc.superAdmin.getUnreadNotifications.useQuery(
    undefined,
    { enabled: true }
  );

  const markAsReadMutation = trpc.superAdmin.markNotificationAsRead.useMutation({
    onSuccess: () => refetch(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate({ notificationId });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return colors.error;
      case "warning":
        return colors.warning;
      default:
        return colors.primary;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return "exclamationmark.triangle.fill";
      case "warning":
        return "exclamationmark.circle.fill";
      default:
        return "info.circle.fill";
    }
  };

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
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-3xl font-bold text-foreground">Notifications</Text>
                  <Text className="text-base text-muted">Critical system alerts</Text>
                </View>
                {isLoading && <ActivityIndicator size="small" color={colors.primary} />}
              </View>
            </View>

            {/* Unread Count Badge */}
            {notifications && notifications.length > 0 && (
              <View
                className="bg-error rounded-full px-4 py-2 self-start"
                style={{ backgroundColor: colors.error + "20" }}
              >
                <Text style={{ color: colors.error, fontWeight: "600" }}>
                  {notifications.length} unread alert{notifications.length !== 1 ? "s" : ""}
                </Text>
              </View>
            )}

            {/* Notifications List */}
            {notifications && notifications.length > 0 ? (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => handleMarkAsRead(item.id)}
                    style={({ pressed }) => [
                      {
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <View
                      className="bg-surface rounded-2xl p-4 mb-4 border-l-4 gap-3"
                      style={{
                        borderLeftColor: getSeverityColor(item.severity),
                        borderColor: colors.border,
                        borderWidth: 1,
                      }}
                    >
                      {/* Header */}
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-row items-center gap-3 flex-1">
                          <View
                            className="w-10 h-10 rounded-full items-center justify-center"
                            style={{ backgroundColor: getSeverityColor(item.severity) + "20" }}
                          >
                            <IconSymbol
                              name={getSeverityIcon(item.severity)}
                              size={20}
                              color={getSeverityColor(item.severity)}
                            />
                          </View>
                          <View className="flex-1">
                            <Text className="font-semibold text-foreground text-base">
                              {item.title}
                            </Text>
                            <Text
                              className="text-xs font-medium mt-1"
                              style={{ color: getSeverityColor(item.severity) }}
                            >
                              {item.severity.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-xs text-muted">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                      </View>

                      {/* Message */}
                      <Text className="text-sm text-muted leading-relaxed">{item.message}</Text>

                      {/* Details */}
                      {item.data && (
                        <View className="bg-background rounded-lg p-3 mt-2">
                          <Text className="text-xs text-muted font-mono">
                            {JSON.stringify(item.data, null, 2).substring(0, 200)}
                            {JSON.stringify(item.data).length > 200 ? "..." : ""}
                          </Text>
                        </View>
                      )}

                      {/* Action Button */}
                      <Pressable
                        onPress={() => handleMarkAsRead(item.id)}
                        style={({ pressed }) => [
                          {
                            backgroundColor: colors.primary,
                            opacity: pressed ? 0.8 : 1,
                          },
                        ]}
                        className="rounded-lg py-2 px-4 items-center justify-center mt-2"
                      >
                        <Text className="text-white font-semibold text-sm">Mark as Read</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                )}
              />
            ) : (
              <View className="bg-surface rounded-2xl p-8 items-center justify-center border border-border gap-3">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center"
                  style={{ backgroundColor: colors.primary + "10" }}
                >
                  <IconSymbol name="checkmark.circle.fill" size={32} color={colors.primary} />
                </View>
                <Text className="text-lg font-semibold text-foreground">All Clear</Text>
                <Text className="text-sm text-muted text-center">
                  No critical alerts at this time. Your system is running smoothly.
                </Text>
              </View>
            )}
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
