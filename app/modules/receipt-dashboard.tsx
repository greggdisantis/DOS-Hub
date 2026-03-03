/**
 * Receipt Finance Dashboard
 * Accessible from the Dashboard module (admin/manager only).
 * Shows all receipts in a date-grouped file-system view with filters and analytics.
 */
import React, { useState, useCallback, useMemo } from "react";
import {
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(n: number | string | null | undefined): string {
  const v = parseFloat(String(n ?? "0"));
  return isNaN(v) ? "$0.00" : `$${v.toFixed(2)}`;
}

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function groupByDate(receipts: any[]): { label: string; data: any[] }[] {
  const map = new Map<string, any[]>();
  for (const r of receipts) {
    const raw = r.purchaseDate || r.createdAt;
    const d = new Date(raw);
    const key = isNaN(d.getTime())
      ? "Unknown Date"
      : d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return Array.from(map.entries()).map(([label, data]) => ({ label, data }));
}

// ─── Analytics Cards ──────────────────────────────────────────────────────────

function AnalyticsSection({ analytics }: { analytics: any }) {
  const colors = useColors();
  if (!analytics) return null;

  return (
    <View style={{ gap: 12 }}>
      {/* Summary row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statIcon, { backgroundColor: "#3B82F620" }]}>
            <IconSymbol name="dollarsign.circle.fill" size={20} color="#3B82F6" />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{fmt$(analytics.totalSpend)}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Total Spend</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statIcon, { backgroundColor: "#8B5CF620" }]}>
            <IconSymbol name="receipt" size={20} color="#8B5CF6" />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {analytics.byUser?.reduce((s: number, u: any) => s + u.count, 0) ?? 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Receipts</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statIcon, { backgroundColor: "#22C55E20" }]}>
            <IconSymbol name="person.3.fill" size={20} color="#22C55E" />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{analytics.byUser?.length ?? 0}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Submitters</Text>
        </View>
      </View>

      {/* Spend by User */}
      {analytics.byUser?.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Spend by Employee</Text>
          {analytics.byUser.slice(0, 8).map((u: any, i: number) => (
            <View key={u.userId} style={[styles.barRow, i > 0 && { marginTop: 10 }]}>
              <Text style={[styles.barLabel, { color: colors.foreground }]} numberOfLines={1}>{u.name}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.min(100, (u.total / analytics.totalSpend) * 100)}%`,
                      backgroundColor: "#3B82F6",
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barValue, { color: colors.muted }]}>{fmt$(u.total)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Top Vendors */}
      {analytics.byVendor?.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Top Vendors</Text>
          {analytics.byVendor.slice(0, 6).map((v: any, i: number) => (
            <View key={v.vendor} style={[styles.barRow, i > 0 && { marginTop: 10 }]}>
              <Text style={[styles.barLabel, { color: colors.foreground }]} numberOfLines={1}>{v.vendor}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.min(100, (v.total / analytics.totalSpend) * 100)}%`,
                      backgroundColor: "#8B5CF6",
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barValue, { color: colors.muted }]}>{fmt$(v.total)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Spend by Category */}
      {analytics.byCategory?.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Spend by Category</Text>
          {analytics.byCategory.map((c: any, i: number) => (
            <View key={c.category} style={[styles.barRow, i > 0 && { marginTop: 10 }]}>
              <Text style={[styles.barLabel, { color: colors.foreground }]} numberOfLines={1}>{c.category}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.min(100, (c.total / analytics.totalSpend) * 100)}%`,
                      backgroundColor: "#F59E0B",
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barValue, { color: colors.muted }]}>{fmt$(c.total)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Monthly Trend */}
      {analytics.monthlyTrend?.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Monthly Spend Trend</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, paddingVertical: 8, minHeight: 100 }}>
              {analytics.monthlyTrend.map((m: any) => {
                const maxVal = Math.max(...analytics.monthlyTrend.map((x: any) => x.total));
                const height = maxVal > 0 ? Math.max(8, (m.total / maxVal) * 80) : 8;
                return (
                  <View key={m.month} style={{ alignItems: "center", gap: 4 }}>
                    <Text style={{ fontSize: 10, color: colors.muted }}>{fmt$(m.total)}</Text>
                    <View style={[styles.monthBar, { height, backgroundColor: "#22C55E" }]} />
                    <Text style={{ fontSize: 10, color: colors.muted }}>{m.month.slice(5)}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ─── Receipt Row (file-system style) ─────────────────────────────────────────

function ReceiptRow({ receipt, onPress, onExportPDF }: { receipt: any; onPress: () => void; onExportPDF: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.receiptRow,
        { borderBottomColor: colors.border, opacity: pressed ? 0.75 : 1 },
      ]}
      onPress={onPress}
    >
      {/* File icon */}
      <View style={[styles.fileIcon, { backgroundColor: "#3B82F620" }]}>
        <IconSymbol name="doc.text.fill" size={18} color="#3B82F6" />
      </View>

      {/* Main info */}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>
          {receipt.fileName || `${receipt.vendorName || "Receipt"}_${receipt.purchaseDate || "—"}`}
        </Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Text style={[styles.fileMeta, { color: colors.muted }]}>
            {receipt.submitterName || receipt.userName || "—"}
          </Text>
          <Text style={[styles.fileMeta, { color: colors.muted }]}>·</Text>
          <Text style={[styles.fileMeta, { color: colors.muted }]}>
            {receipt.vendorName || "Unknown Vendor"}
          </Text>
        </View>
      </View>

      {/* Amount + PDF button */}
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Text style={[styles.amount, { color: colors.foreground }]}>{fmt$(receipt.total)}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.pdfBtn,
            { backgroundColor: "#EF444420", opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={(e) => {
            e.stopPropagation?.();
            onExportPDF();
          }}
        >
          <IconSymbol name="arrow.down" size={12} color="#EF4444" />
          <Text style={{ fontSize: 10, color: "#EF4444", fontWeight: "600" }}>PDF</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// ─── Filters Panel ────────────────────────────────────────────────────────────

function FiltersPanel({
  filters,
  onChange,
  users,
}: {
  filters: { userId?: number; vendorName?: string; startDate?: string; endDate?: string };
  onChange: (f: any) => void;
  users: { id: number; name: string }[];
}) {
  const colors = useColors();
  return (
    <View style={[styles.filtersPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>Filter Receipts</Text>

      {/* User filter */}
      <View>
        <Text style={[styles.filterLabel, { color: colors.muted }]}>Employee</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              style={({ pressed }) => [
                styles.filterChip,
                {
                  backgroundColor: !filters.userId ? colors.primary + "22" : colors.background,
                  borderColor: !filters.userId ? colors.primary : colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={() => onChange({ ...filters, userId: undefined })}
            >
              <Text style={{ color: !filters.userId ? colors.primary : colors.foreground, fontSize: 12, fontWeight: "500" }}>
                All
              </Text>
            </Pressable>
            {users.map((u) => (
              <Pressable
                key={u.id}
                style={({ pressed }) => [
                  styles.filterChip,
                  {
                    backgroundColor: filters.userId === u.id ? colors.primary + "22" : colors.background,
                    borderColor: filters.userId === u.id ? colors.primary : colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => onChange({ ...filters, userId: filters.userId === u.id ? undefined : u.id })}
              >
                <Text style={{ color: filters.userId === u.id ? colors.primary : colors.foreground, fontSize: 12, fontWeight: "500" }}>
                  {u.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Vendor filter */}
      <View>
        <Text style={[styles.filterLabel, { color: colors.muted }]}>Vendor Name</Text>
        <TextInput
          style={[styles.filterInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
          value={filters.vendorName || ""}
          onChangeText={(v) => onChange({ ...filters, vendorName: v || undefined })}
          placeholder="Search vendor..."
          placeholderTextColor={colors.muted}
          returnKeyType="search"
        />
      </View>

      {/* Date range */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.filterLabel, { color: colors.muted }]}>From (YYYY-MM-DD)</Text>
          <TextInput
            style={[styles.filterInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={filters.startDate || ""}
            onChangeText={(v) => onChange({ ...filters, startDate: v || undefined })}
            placeholder="2026-01-01"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.filterLabel, { color: colors.muted }]}>To (YYYY-MM-DD)</Text>
          <TextInput
            style={[styles.filterInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={filters.endDate || ""}
            onChangeText={(v) => onChange({ ...filters, endDate: v || undefined })}
            placeholder="2026-12-31"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
          />
        </View>
      </View>

      {/* Clear */}
      <Pressable
        style={({ pressed }) => [styles.clearBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
        onPress={() => onChange({})}
      >
        <Text style={{ color: colors.muted, fontSize: 13 }}>Clear Filters</Text>
      </Pressable>
    </View>
  );
}

// ─── Receipt Detail Modal ─────────────────────────────────────────────────────

function ReceiptDetailSheet({
  receipt,
  onClose,
  onDelete,
  onArchive,
  onUnarchive,
  isAdmin,
  isArchived,
}: {
  receipt: any;
  onClose: () => void;
  onDelete: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  isAdmin?: boolean;
  isArchived?: boolean;
}) {
  const colors = useColors();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const lineItems: any[] = (() => {
    try {
      if (!receipt.lineItems) return [];
      if (typeof receipt.lineItems === "string") return JSON.parse(receipt.lineItems);
      return receipt.lineItems;
    } catch {
      return [];
    }
  })();

  return (
    <View style={[styles.detailSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.detailHeader}>
        <Text style={[styles.detailTitle, { color: colors.foreground }]} numberOfLines={2}>
          {receipt.fileName || receipt.vendorName || "Receipt"}
        </Text>
        <Pressable onPress={onClose} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <IconSymbol name="xmark" size={22} color={colors.muted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Receipt image */}
        {receipt.imageUrl && (
          <Image
            source={{ uri: receipt.imageUrl }}
            style={styles.detailImage}
            contentFit="contain"
          />
        )}

        {/* Classification */}
        <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.detailSection, { color: colors.muted }]}>Classification</Text>
          <DetailRow label="Submitted By" value={receipt.submitterName || "—"} colors={colors} />
          <DetailRow label="Type" value={receipt.expenseType === "OVERHEAD" ? "Overhead / General" : "Job Receipt"} colors={colors} />
          {receipt.expenseType === "JOB" && (
            <>
              <DetailRow label="Job Name" value={receipt.jobName || "—"} colors={colors} />
              <DetailRow label="Work Order" value={receipt.workOrderNumber || "—"} colors={colors} />
              <DetailRow label="PO Number" value={receipt.poNumber || "—"} colors={colors} />
            </>
          )}
          {receipt.expenseType === "OVERHEAD" && (
            <DetailRow label="Category" value={receipt.overheadCategory || "—"} colors={colors} />
          )}
        </View>

        {/* Vendor */}
        <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.detailSection, { color: colors.muted }]}>Vendor & Date</Text>
          <DetailRow label="Vendor" value={receipt.vendorName || "—"} colors={colors} />
          <DetailRow label="Location" value={receipt.vendorLocation || "—"} colors={colors} />
          <DetailRow label="Purchase Date" value={fmtDate(receipt.purchaseDate)} colors={colors} />
          <DetailRow label="Material Class" value={receipt.materialCategory || "—"} colors={colors} />
        </View>

        {/* Line items */}
        {lineItems.length > 0 && (
          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.detailSection, { color: colors.muted }]}>Line Items</Text>
            {lineItems.map((item: any, i: number) => (
              <View key={i} style={[styles.lineItemDetail, { borderBottomColor: colors.border }]}>
                <Text style={{ flex: 2, fontSize: 13, color: colors.foreground }}>{item.description}</Text>
                <Text style={{ flex: 1, fontSize: 12, color: colors.muted, textAlign: "center" }}>×{item.quantity}</Text>
                <Text style={{ flex: 1, fontSize: 12, color: colors.muted, textAlign: "right" }}>{fmt$(item.lineTotal)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Totals */}
        <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.detailSection, { color: colors.muted }]}>Totals</Text>
          <DetailRow label="Subtotal" value={fmt$(receipt.subtotal)} colors={colors} />
          <DetailRow label="Tax" value={fmt$(receipt.tax)} colors={colors} />
          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>{fmt$(receipt.total)}</Text>
          </View>
        </View>

        {/* Notes */}
        {receipt.notes ? (
          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.detailSection, { color: colors.muted }]}>Notes</Text>
            <Text style={{ fontSize: 13, color: colors.foreground, lineHeight: 20 }}>{receipt.notes}</Text>
          </View>
        ) : null}

        {/* Archive / Unarchive — admin/manager only */}
        {isAdmin && (
          isArchived ? (
            <Pressable
              style={({ pressed }) => [styles.archiveBtn, { borderColor: colors.primary, opacity: pressed ? 0.7 : 1 }]}
              onPress={onUnarchive}
            >
              <IconSymbol name="arrow.uturn.left" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: "600", marginLeft: 6 }}>Restore to Active</Text>
            </Pressable>
          ) : (
            confirmArchive ? (
              <View style={[styles.confirmDeleteBox, { borderColor: "#22C55E", backgroundColor: "#22C55E11" }]}>
                <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600", textAlign: "center", marginBottom: 10 }}>
                  Mark this receipt as processed? It will move to the Archive folder.
                </Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable
                    style={({ pressed }) => [styles.confirmBtn, { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 }]}
                    onPress={() => setConfirmArchive(false)}
                  >
                    <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 13 }}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.confirmBtn, { borderColor: "#22C55E", backgroundColor: "#22C55E", opacity: pressed ? 0.7 : 1 }]}
                    onPress={onArchive}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Mark Processed</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.archiveBtn, { borderColor: "#22C55E", opacity: pressed ? 0.7 : 1 }]}
                onPress={() => setConfirmArchive(true)}
              >
                <IconSymbol name="checkmark.circle.fill" size={16} color="#22C55E" />
                <Text style={{ color: "#22C55E", fontWeight: "600", marginLeft: 6 }}>Receipt Processed</Text>
              </Pressable>
            )
          )
        )}

        {/* Delete */}
        {confirmDelete ? (
          <View style={[styles.confirmDeleteBox, { borderColor: colors.error, backgroundColor: colors.error + "11" }]}>
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600", textAlign: "center", marginBottom: 10 }}>
              Delete this receipt? This cannot be undone.
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                style={({ pressed }) => [styles.confirmBtn, { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 }]}
                onPress={() => setConfirmDelete(false)}
              >
                <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 13 }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.confirmBtn, { borderColor: colors.error, backgroundColor: colors.error, opacity: pressed ? 0.7 : 1 }]}
                onPress={onDelete}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.deleteReceiptBtn, { borderColor: colors.error, opacity: pressed ? 0.7 : 1 }]}
            onPress={() => setConfirmDelete(true)}
          >
            <IconSymbol name="trash.fill" size={16} color={colors.error} />
            <Text style={{ color: colors.error, fontWeight: "600", marginLeft: 6 }}>Delete Receipt</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailRowLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.detailRowValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type ViewMode = "files" | "archive" | "analytics";

export function ReceiptDashboardContent() {
  const colors = useColors();
  const [viewMode, setViewMode] = useState<ViewMode>("files");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{
    userId?: number;
    vendorName?: string;
    startDate?: string;
    endDate?: string;
  }>({});
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: receipts, isLoading, refetch } = trpc.receipts.list.useQuery(
    Object.keys(filters).length > 0 ? filters : undefined
  );
  const { data: archivedReceipts, isLoading: isLoadingArchive, refetch: refetchArchive } = trpc.receipts.listArchived.useQuery(
    Object.keys(filters).length > 0 ? filters : undefined
  );
  const { data: analytics, refetch: refetchAnalytics } = trpc.receipts.analytics.useQuery();
  const { data: usersData } = trpc.users.list.useQuery();
  const deleteReceiptMutation = trpc.receipts.delete.useMutation();
  const archiveMutation = trpc.receipts.archive.useMutation();
  const unarchiveMutation = trpc.receipts.unarchive.useMutation();
  const utils = trpc.useUtils();

  // If analytics query succeeds, user is admin/manager
  const isAdmin = analytics !== undefined;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchArchive(), refetchAnalytics()]);
    setRefreshing(false);
  }, [refetch, refetchArchive, refetchAnalytics]);

  const userList = useMemo(
    () => (usersData || []).map((u: any) => ({ id: u.id, name: u.name || u.email || "User" })),
    [usersData]
  );

  const grouped = useMemo(() => groupByDate(receipts || []), [receipts]);
  const groupedArchive = useMemo(() => groupByDate(archivedReceipts || []), [archivedReceipts]);

  const handleExportPDF = useCallback((receipt: any) => {
    router.push({
      pathname: "/modules/receipt-pdf",
      params: { receiptId: String(receipt.id) },
    } as any);
  }, []);

  const handleDelete = useCallback(async (receipt: any) => {
    try {
      await deleteReceiptMutation.mutateAsync({ id: receipt.id });
      await utils.receipts.list.invalidate();
      await utils.receipts.listArchived.invalidate();
      setSelectedReceipt(null);
    } catch (e: any) {
      Alert.alert("Delete Failed", e?.message ?? "Failed to delete receipt.");
    }
  }, [deleteReceiptMutation, utils]);

  const handleArchive = useCallback(async (receipt: any) => {
    try {
      await archiveMutation.mutateAsync({ id: receipt.id });
      await utils.receipts.list.invalidate();
      await utils.receipts.listArchived.invalidate();
      setSelectedReceipt(null);
    } catch (e: any) {
      Alert.alert("Archive Failed", e?.message ?? "Failed to archive receipt.");
    }
  }, [archiveMutation, utils]);

  const handleUnarchive = useCallback(async (receipt: any) => {
    try {
      await unarchiveMutation.mutateAsync({ id: receipt.id });
      await utils.receipts.list.invalidate();
      await utils.receipts.listArchived.invalidate();
      setSelectedReceipt(null);
    } catch (e: any) {
      Alert.alert("Restore Failed", e?.message ?? "Failed to restore receipt.");
    }
  }, [unarchiveMutation, utils]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.muted, marginTop: 12 }}>Loading receipts...</Text>
      </View>
    );
  }

  const isCurrentArchived = selectedReceipt ? !!selectedReceipt.archived : false;

  return (
    <View style={{ flex: 1 }}>
      {/* Toolbar */}
      <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
        {/* View mode toggle */}
        <View style={[styles.modeToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(["files", "archive", "analytics"] as ViewMode[]).map((mode) => (
            <Pressable
              key={mode}
              style={({ pressed }) => [
                styles.modeBtn,
                {
                  backgroundColor: viewMode === mode ? colors.primary : "transparent",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() => setViewMode(mode)}
            >
              <IconSymbol
                name={mode === "files" ? "folder.fill" : mode === "archive" ? "archivebox.fill" : "chart.pie.fill"}
                size={14}
                color={viewMode === mode ? "#fff" : colors.muted}
              />
              <Text style={{ color: viewMode === mode ? "#fff" : colors.muted, fontSize: 11, fontWeight: "600", marginLeft: 3 }}>
                {mode === "files" ? "Files" : mode === "archive" ? "Archive" : "Analytics"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Filter toggle */}
        <Pressable
          style={({ pressed }) => [
            styles.filterToggleBtn,
            {
              backgroundColor: showFilters ? colors.primary + "22" : colors.surface,
              borderColor: showFilters ? colors.primary : colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={() => setShowFilters((v) => !v)}
        >
          <IconSymbol name="line.3.horizontal.decrease.circle" size={16} color={showFilters ? colors.primary : colors.muted} />
          <Text style={{ color: showFilters ? colors.primary : colors.muted, fontSize: 12, fontWeight: "600", marginLeft: 4 }}>
            Filter
            {Object.keys(filters).length > 0 ? ` (${Object.keys(filters).length})` : ""}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Filters panel */}
        {showFilters && (
          <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
            <FiltersPanel filters={filters} onChange={setFilters} users={userList} />
          </View>
        )}

        {viewMode === "analytics" && (
          <View style={{ padding: 12 }}>
            <AnalyticsSection analytics={analytics} />
          </View>
        )}

        {viewMode === "files" && (
          <View>
            {grouped.length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol name="receipt" size={48} color={colors.muted} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Receipts Yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                  Receipts submitted by employees will appear here.
                </Text>
              </View>
            ) : (
              grouped.map((group) => (
                <View key={group.label}>
                  <View style={[styles.groupHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                    <IconSymbol name="calendar" size={14} color={colors.muted} />
                    <Text style={[styles.groupLabel, { color: colors.muted }]}>{group.label}</Text>
                    <Text style={[styles.groupCount, { color: colors.muted }]}>
                      {group.data.length} receipt{group.data.length !== 1 ? "s" : ""} ·{" "}
                      {fmt$(group.data.reduce((s: number, r: any) => s + parseFloat(String(r.total ?? "0")), 0))}
                    </Text>
                  </View>
                  <View style={[styles.groupBody, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    {group.data.map((receipt: any) => (
                      <ReceiptRow
                        key={receipt.id}
                        receipt={receipt}
                        onPress={() => setSelectedReceipt(receipt)}
                        onExportPDF={() => handleExportPDF(receipt)}
                      />
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {viewMode === "archive" && (
          <View>
            {/* Archive header banner */}
            <View style={[styles.archiveBanner, { backgroundColor: "#22C55E15", borderColor: "#22C55E40" }]}>
              <IconSymbol name="archivebox.fill" size={16} color="#22C55E" />
              <Text style={{ color: "#22C55E", fontSize: 12, fontWeight: "600", marginLeft: 6 }}>
                Processed Receipts — {archivedReceipts?.length ?? 0} archived
              </Text>
            </View>

            {isLoadingArchive ? (
              <View style={[styles.center, { paddingVertical: 40 }]}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : groupedArchive.length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol name="archivebox.fill" size={48} color={colors.muted} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Archived Receipts</Text>
                <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                  Receipts marked as processed will appear here.
                </Text>
              </View>
            ) : (
              groupedArchive.map((group) => (
                <View key={group.label}>
                  <View style={[styles.groupHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                    <IconSymbol name="calendar" size={14} color={colors.muted} />
                    <Text style={[styles.groupLabel, { color: colors.muted }]}>{group.label}</Text>
                    <Text style={[styles.groupCount, { color: colors.muted }]}>
                      {group.data.length} receipt{group.data.length !== 1 ? "s" : ""} ·{" "}
                      {fmt$(group.data.reduce((s: number, r: any) => s + parseFloat(String(r.total ?? "0")), 0))}
                    </Text>
                  </View>
                  <View style={[styles.groupBody, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    {group.data.map((receipt: any) => (
                      <ReceiptRow
                        key={receipt.id}
                        receipt={receipt}
                        onPress={() => setSelectedReceipt({ ...receipt, archived: true })}
                        onExportPDF={() => handleExportPDF(receipt)}
                      />
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Detail sheet overlay */}
      {selectedReceipt && (
        <View style={styles.overlay}>
          <Pressable style={styles.overlayBg} onPress={() => setSelectedReceipt(null)} />
          <ReceiptDetailSheet
            receipt={selectedReceipt}
            onClose={() => setSelectedReceipt(null)}
            onDelete={() => handleDelete(selectedReceipt)}
            onArchive={() => handleArchive(selectedReceipt)}
            onUnarchive={() => handleUnarchive(selectedReceipt)}
            isAdmin={isAdmin}
            isArchived={isCurrentArchived}
          />
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modeToggle: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    flex: 1,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  // Analytics
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "500", textAlign: "center" },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { width: 90, fontSize: 12, fontWeight: "500" },
  barTrack: { flex: 1, height: 8, backgroundColor: "#E5E7EB", borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  barValue: { width: 60, fontSize: 11, textAlign: "right" },
  monthBar: { width: 28, borderRadius: 4 },
  // File system
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  groupLabel: { flex: 1, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  groupCount: { fontSize: 11 },
  groupBody: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  receiptRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fileIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  fileName: { fontSize: 13, fontWeight: "600" },
  fileMeta: { fontSize: 11 },
  amount: { fontSize: 14, fontWeight: "700" },
  pdfBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySubtitle: { fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
  // Filters
  filtersPanel: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginBottom: 4,
  },
  filterLabel: { fontSize: 12, fontWeight: "500", marginBottom: 6 },
  filterInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  clearBtn: {
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  // Detail sheet
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  detailSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: "90%",
    paddingTop: 16,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  detailTitle: { flex: 1, fontSize: 16, fontWeight: "700" },
  detailImage: { width: "100%", height: 200, marginBottom: 8 },
  detailCard: {
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  detailSection: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  detailRowLabel: { fontSize: 13 },
  detailRowValue: { fontSize: 13, fontWeight: "500", flex: 1, textAlign: "right" },
  lineItemDetail: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    marginTop: 4,
  },
  totalLabel: { fontSize: 15, fontWeight: "700" },
  totalValue: { fontSize: 15, fontWeight: "800" },
  archiveBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  archiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 12,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  deleteReceiptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 12,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  confirmDeleteBox: {
    marginHorizontal: 12,
    marginTop: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  confirmBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
});
