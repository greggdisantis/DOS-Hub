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
  ScrollView,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { AuthGuard } from "@/components/auth-guard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { useScreenOrder } from "@/hooks/use-screen-order";
import { generateOrderPdfHtml } from "@/lib/screen-ordering/pdf-template";
import { usePdfPreview } from "@/lib/screen-ordering/pdf-context";
import type { OrderState } from "@/lib/screen-ordering/types";

const STATUS_COLORS: Record<string, string> = {
  draft: "#687076",
  submitted: "#0a7ea4",
  approved: "#22C55E",
  rejected: "#EF4444",
  completed: "#8B5CF6",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
};

/* ─── ORDER LIST ──────────────────────────────────────────────────────── */

function OrderListContent() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: orders, isLoading, refetch } = trpc.orders.list.useQuery();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const isManagerOrAdmin = user?.role === "manager" || user?.role === "admin";

  const renderOrder = ({ item }: { item: any }) => {
    const statusColor = STATUS_COLORS[item.status] || colors.muted;
    const isOwnOrder = item.userId === user?.id;

    return (
      <Pressable
        onPress={() => router.push(`/modules/order-detail?orderId=${item.id}` as any)}
        style={({ pressed }) => [
          styles.orderCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && { opacity: 0.8 },
        ]}
      >
        <View style={styles.orderHeader}>
          <View style={{ flex: 1 }}>
            <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
              {item.title || "Untitled Order"}
            </Text>
            <Text className="text-xs text-muted mt-1">
              {item.screenCount} screen{item.screenCount > 1 ? "s" : ""}
              {item.manufacturer ? ` · ${item.manufacturer}` : ""}
              {!isOwnOrder && isManagerOrAdmin ? ` · by User #${item.userId}` : ""}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: statusColor }}>
              {STATUS_LABELS[item.status] || item.status}
            </Text>
          </View>
        </View>
        <View style={[styles.orderMeta, { borderTopColor: colors.border }]}>
          <Text className="text-xs text-muted">
            Updated: {new Date(item.updatedAt).toLocaleDateString()}
          </Text>
          <IconSymbol name="chevron.right" size={14} color={colors.muted} />
        </View>
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={orders}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderOrder}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8 }}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        <View style={[styles.center, { paddingVertical: 60 }]}>
          <IconSymbol name="folder.fill" size={48} color={colors.muted} />
          <Text className="text-lg font-semibold text-muted mt-3">No Orders Yet</Text>
          <Text className="text-sm text-muted text-center mt-1 px-8">
            Orders you create in the Screen Ordering tool will appear here.
          </Text>
        </View>
      }
    />
  );
}

export default function OrderReviewScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Saved Orders" }} />
      <AuthGuard>
        <ScreenContainer edges={["left", "right"]}>
          <OrderListContent />
        </ScreenContainer>
      </AuthGuard>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  orderCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
