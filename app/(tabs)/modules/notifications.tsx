import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

const TYPE_ICONS: Record<string, string> = {
  cmr_new: "doc.text.fill",
  order_status: "rectangle.grid.2x2.fill",
  material_delivery_status: "shippingbox.fill",
  material_delivery_warehouse: "shippingbox.fill",
  general: "bell.fill",
};

const TYPE_COLORS: Record<string, string> = {
  cmr_new: "#8B5CF6",
  order_status: "#0a7ea4",
  material_delivery_status: "#F59E0B",
  material_delivery_warehouse: "#EF4444",
  general: "#6B7280",
};

function formatRelativeTime(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationsScreen() {
  const colors = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: notifications = [], isLoading, refetch } = trpc.notifications.list.useQuery();
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });
  const deleteNotif = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  const handleTap = (notif: any) => {
    if (!notif.isRead) {
      markRead.mutate({ id: notif.id });
    }
    // Deep-link to the relevant module
    const data = notif.data as Record<string, unknown> | null;
    if (data?.screen) {
      router.push(data.screen as any);
    }
  };

  const handleDelete = (id: number) => {
    deleteNotif.mutate({ id });
  };

  const renderItem = ({ item }: { item: any }) => {
    const iconName = TYPE_ICONS[item.type] ?? "bell.fill";
    const iconColor = TYPE_COLORS[item.type] ?? colors.muted;
    const isUnread = !item.isRead;

    return (
      <Pressable
        onPress={() => handleTap(item)}
        style={({ pressed }) => [
          styles.notifRow,
          {
            backgroundColor: isUnread ? iconColor + "0A" : colors.surface,
            borderColor: colors.border,
          },
          pressed && { opacity: 0.75 },
        ]}
      >
        {/* Unread dot */}
        {isUnread && (
          <View style={[styles.unreadDot, { backgroundColor: iconColor }]} />
        )}

        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: iconColor + "18" }]}>
          <IconSymbol name={iconName as any} size={20} color={iconColor} />
        </View>

        {/* Text */}
        <View style={styles.textWrap}>
          <Text
            style={[
              styles.notifTitle,
              { color: colors.foreground, fontWeight: isUnread ? "700" : "500" },
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            style={[styles.notifBody, { color: colors.muted }]}
            numberOfLines={2}
          >
            {item.body}
          </Text>
          <Text style={[styles.notifTime, { color: colors.muted }]}>
            {formatRelativeTime(item.createdAt)}
          </Text>
        </View>

        {/* Delete */}
        <Pressable
          onPress={() => handleDelete(item.id)}
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.5 }]}
          hitSlop={8}
        >
          <IconSymbol name="xmark" size={14} color={colors.muted} />
        </Pressable>
      </Pressable>
    );
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <IconSymbol name="chevron.left" size={22} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notifications</Text>
        {unreadCount > 0 ? (
          <Pressable
            onPress={handleMarkAllRead}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all read</Text>
          </Pressable>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <IconSymbol name="bell.fill" size={48} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No notifications yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            You'll see alerts here when activity happens in the app.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 4,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: "600",
    width: 80,
    textAlign: "right",
  },
  notifRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: 14,
    left: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  notifTitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  notifBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 11,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 4,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
