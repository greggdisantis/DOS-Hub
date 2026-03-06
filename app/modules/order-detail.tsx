import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { AuthGuard } from "@/components/auth-guard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
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

function OrderDetailContent() {
  const colors = useColors();
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { user } = useAuth();
  const { setData: setPdfPreview } = usePdfPreview();
  const utils = trpc.useUtils();

  const numericId = parseInt(orderId || "0", 10);

  const { data: order, isLoading } = trpc.orders.get.useQuery(
    { orderId: numericId },
    { enabled: numericId > 0 },
  );

  const { data: revisions, isLoading: revisionsLoading } = trpc.orders.revisions.useQuery(
    { orderId: numericId },
    { enabled: numericId > 0 },
  );

  const updateMutation = trpc.orders.update.useMutation({
    onSuccess: () => {
      utils.orders.get.invalidate({ orderId: numericId });
      utils.orders.list.invalidate();
      Alert.alert("Updated", "Order status updated.");
    },
  });

  const isManagerOrAdmin = user?.role === "manager" || user?.role === "admin" || user?.role === "super-admin";
  const isOwner = order?.userId === user?.id;

  const handleStatusChange = (newStatus: string) => {
    Alert.alert(
      "Change Status",
      `Set order status to "${STATUS_LABELS[newStatus]}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () =>
            updateMutation.mutate({
              orderId: numericId,
              status: newStatus as any,
              changeDescription: `Status changed to ${newStatus}`,
            }),
        },
      ],
    );
  };

  const handlePreviewPdf = (orderData?: any) => {
    const data = orderData || order?.orderData;
    if (!data) return;
    const html = generateOrderPdfHtml(data as OrderState);
    const title = `Order #${numericId} - ${order?.title || "Preview"}`;
    setPdfPreview({ html, title, mode: "all" });
    router.push("/modules/pdf-preview" as any);
  };

  const handleEditOrder = () => {
    // Navigate to screen ordering with this order loaded
    // We'll use the pdf context to pass the order data temporarily
    router.push("/modules/screen-ordering" as any);
    // The user will need to load the order from the saved orders list
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text className="text-lg font-semibold text-muted">Order not found</Text>
      </View>
    );
  }

  const orderData = order.orderData as OrderState | null;
  const statusColor = STATUS_COLORS[order.status] || colors.muted;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      {/* Order Summary Card */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 12 }]}>
        <View style={styles.cardHeader}>
          <Text className="text-xl font-bold text-foreground" style={{ flex: 1 }}>
            {order.title || "Untitled Order"}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: statusColor }}>
              {STATUS_LABELS[order.status] || order.status}
            </Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <InfoRow label="Order ID" value={`#${order.id}`} colors={colors} />
          <InfoRow label="Screens" value={String(order.screenCount)} colors={colors} />
          <InfoRow label="Manufacturer" value={order.manufacturer || "—"} colors={colors} />
          <InfoRow label="Created" value={new Date(order.createdAt).toLocaleDateString()} colors={colors} />
          <InfoRow label="Updated" value={new Date(order.updatedAt).toLocaleDateString()} colors={colors} />
        </View>

        {order.submitterNotes && (
          <View style={[styles.notesBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text className="text-xs font-semibold text-muted mb-1">Notes</Text>
            <Text className="text-sm text-foreground">{order.submitterNotes}</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <Pressable
          onPress={() => handlePreviewPdf()}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.8 },
          ]}
        >
          <IconSymbol name="doc.text.fill" size={16} color="#fff" />
          <Text style={styles.actionBtnText}>Preview PDF</Text>
        </Pressable>

        {(isOwner || isManagerOrAdmin) && (
          <Pressable
            onPress={handleEditOrder}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
              pressed && { opacity: 0.8 },
            ]}
          >
            <IconSymbol name="pencil" size={16} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Edit</Text>
          </Pressable>
        )}
      </View>

      {/* Status Actions (Manager/Admin) */}
      {isManagerOrAdmin && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text className="text-sm font-semibold text-foreground mb-3">Change Status</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {["draft", "submitted", "approved", "rejected", "completed"]
              .filter((s) => s !== order.status)
              .map((status) => {
                const sc = STATUS_COLORS[status] || colors.muted;
                return (
                  <Pressable
                    key={status}
                    onPress={() => handleStatusChange(status)}
                    style={({ pressed }) => [
                      styles.statusBtn,
                      { backgroundColor: sc + "15", borderColor: sc + "40" },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "600", color: sc }}>
                      {STATUS_LABELS[status]}
                    </Text>
                  </Pressable>
                );
              })}
          </View>
        </View>
      )}

      {/* Revision History */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text className="text-sm font-semibold text-foreground mb-3">
          Revision History ({revisions?.length || 0})
        </Text>

        {revisionsLoading && <ActivityIndicator size="small" color={colors.primary} />}

        {revisions && revisions.length > 0 ? (
          revisions.map((rev: any, idx: number) => {
            const isOriginal = rev.revisionNumber === 1;
            return (
              <View
                key={rev.id}
                style={[
                  styles.revisionItem,
                  { borderColor: colors.border },
                  idx === 0 && { borderTopWidth: 0 },
                ]}
              >
                <View style={styles.revisionHeader}>
                  <View style={[
                    styles.revisionBadge,
                    { backgroundColor: isOriginal ? colors.primary + "15" : colors.muted + "15" },
                  ]}>
                    <Text style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: isOriginal ? colors.primary : colors.muted,
                    }}>
                      v{rev.revisionNumber}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text className="text-sm font-medium text-foreground">
                      {rev.changeDescription || "No description"}
                    </Text>
                    <Text className="text-xs text-muted mt-0.5">
                      {rev.editedByName || `User #${rev.editedByUserId}`}
                      {" · "}
                      {new Date(rev.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  {rev.orderData && (
                    <Pressable
                      onPress={() => handlePreviewPdf(rev.orderData)}
                      style={({ pressed }) => [
                        styles.revisionViewBtn,
                        { borderColor: colors.border },
                        pressed && { opacity: 0.6 },
                      ]}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "600", color: colors.primary }}>View</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        ) : (
          !revisionsLoading && (
            <Text className="text-sm text-muted">No revisions recorded.</Text>
          )
        )}
      </View>

      {/* Order Data Summary */}
      {orderData && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text className="text-sm font-semibold text-foreground mb-3">Order Summary</Text>
          <InfoRow label="Project" value={orderData.project?.name || "—"} colors={colors} />
          <InfoRow label="Submitter" value={orderData.project?.submitterName || "—"} colors={colors} />
          <InfoRow label="Address" value={orderData.project?.address || "—"} colors={colors} />
          <InfoRow label="Job #" value={orderData.project?.jobNumber || "—"} colors={colors} />
          <InfoRow label="Date" value={orderData.project?.date || "—"} colors={colors} />
          <InfoRow label="Screens" value={String(orderData.screens?.length || 0)} colors={colors} />
          <InfoRow label="Manufacturer" value={orderData.manufacturer || "—"} colors={colors} />
          <InfoRow label="Motor Type" value={orderData.globalMotorType || "—"} colors={colors} />
        </View>
      )}
    </ScrollView>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.infoRow}>
      <Text className="text-xs text-muted" style={{ width: 100 }}>{label}</Text>
      <Text className="text-sm text-foreground" style={{ flex: 1 }}>{value}</Text>
    </View>
  );
}

export default function OrderDetailScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Order Details" }} />
      <AuthGuard>
        <ScreenContainer className="px-4" edges={["left", "right"]}>
          <OrderDetailContent />
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
  card: {
    marginHorizontal: 0,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  infoGrid: {
    gap: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
  },
  notesBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  statusBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  revisionItem: {
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  revisionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  revisionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  revisionViewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
});
