import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Platform,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import {
  ChecklistStatus,
  STATUS_LABELS,
  STATUS_COLORS,
} from "./types";

const STATUS_ORDER: ChecklistStatus[] = [
  "draft",
  "ready_for_supervisor",
  "awaiting_main_office",
  "awaiting_warehouse",
  "final_review",
  "complete",
  "closed",
];

// All valid transitions a manager/admin can move a checklist to from the list
const ALL_STATUSES = STATUS_ORDER;

type ViewMode = "active" | "archived";

export default function ProjectMaterialDeliveryScreen() {
  const colors = useColors();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ChecklistStatus | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("active");

  // Status change modal state
  const [statusModalItem, setStatusModalItem] = useState<any | null>(null);

  // PDF generation loading state (keyed by checklist id)
  const [pdfLoadingId, setPdfLoadingId] = useState<number | null>(null);

  const { data: checklists, isLoading, refetch } = trpc.projectMaterial.list.useQuery(undefined, {
    refetchOnMount: true,
  });

  const { data: me } = trpc.auth.me.useQuery();
  const isManagerOrAdmin = me?.role === "admin" || me?.role === "manager" || me?.role === "super-admin";

  const archiveMutation = trpc.projectMaterial.archive.useMutation();
  const unarchiveMutation = trpc.projectMaterial.unarchive.useMutation();
  const updateStatusMutation = trpc.projectMaterial.revertStatus.useMutation();
  const generatePdfMutation = trpc.projectMaterial.generatePdf.useMutation();
  const utils = trpc.useUtils();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const invalidate = () => {
    utils.projectMaterial.list.invalidate();
    refetch();
  };

  // Split checklists into active vs archived
  const allItems: any[] = checklists ?? [];
  const activeItems = allItems.filter((c) => !c.archived);
  const archivedItems = allItems.filter((c) => c.archived);

  const sourceItems = viewMode === "archived" ? archivedItems : activeItems;
  const filtered = sourceItems.filter((c: any) =>
    filterStatus === "all" ? true : c.status === filterStatus,
  );

  // ── Archive / Unarchive ────────────────────────────────────────────────────

  const handleArchive = (item: any) => {
    const doArchive = async () => {
      try {
        await archiveMutation.mutateAsync({ id: item.id });
        invalidate();
      } catch (e: any) {
        Alert.alert("Error", e.message ?? "Could not archive checklist.");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Archive "${item.projectName}"? It will be moved to the Archived folder.`)) {
        doArchive();
      }
    } else {
      Alert.alert(
        "Archive Checklist",
        `Move "${item.projectName}" to the Archived folder?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Archive", style: "destructive", onPress: doArchive },
        ],
      );
    }
  };

  const handleUnarchive = (item: any) => {
    const doUnarchive = async () => {
      try {
        await unarchiveMutation.mutateAsync({ id: item.id });
        invalidate();
      } catch (e: any) {
        Alert.alert("Error", e.message ?? "Could not unarchive checklist.");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Restore "${item.projectName}" back to the active list?`)) {
        doUnarchive();
      }
    } else {
      Alert.alert(
        "Unarchive Checklist",
        `Restore "${item.projectName}" back to the active list?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Restore", onPress: doUnarchive },
        ],
      );
    }
  };

  // ── Quick Status Change ────────────────────────────────────────────────────

  const handleStatusChange = async (item: any, newStatus: ChecklistStatus) => {
    setStatusModalItem(null);
    if (newStatus === item.status) return;
    try {
      const oldLabel = STATUS_LABELS[item.status as ChecklistStatus] ?? item.status;
      const newLabel = STATUS_LABELS[newStatus] ?? newStatus;
      await updateStatusMutation.mutateAsync({
        id: item.id,
        status: newStatus,
        action: `Status changed from "${oldLabel}" to "${newLabel}" (from list view)`,
      });
      invalidate();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not update status.");
    }
  };

  // ── Save to PDF ────────────────────────────────────────────────────────────

  const handleSavePdf = async (item: any) => {
    if (pdfLoadingId !== null) return; // prevent double-tap
    setPdfLoadingId(item.id);
    try {
      const result = await generatePdfMutation.mutateAsync({ id: item.id });
      if (Platform.OS === "web") {
        window.open(result.url, "_blank");
      } else {
        Alert.alert(
          "PDF Ready",
          `"${item.projectName}" checklist PDF has been generated.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open PDF", onPress: () => Linking.openURL(result.url) },
          ],
        );
      }
    } catch (e: any) {
      Alert.alert("PDF Error", e.message ?? "Could not generate PDF.");
    } finally {
      setPdfLoadingId(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const renderStatusBadge = (status: string, item?: any, tappable = false) => {
    const s = status as ChecklistStatus;
    const label = STATUS_LABELS[s] ?? status;
    const color = STATUS_COLORS[s] ?? "#6B7280";

    if (tappable && isManagerOrAdmin && item) {
      return (
        <TouchableOpacity
          onPress={() => setStatusModalItem(item)}
          style={[styles.badge, { backgroundColor: color, borderColor: color }]}
          activeOpacity={0.75}
        >
          <Text style={styles.badgeTextSolid}>{label} ▾</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={[styles.badge, { backgroundColor: color, borderColor: color }]}>
        <Text style={styles.badgeTextSolid}>{label}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const isArchived = !!item.archived;
    const isClosed = item.status === "closed";
    const isPdfLoading = pdfLoadingId === item.id;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() =>
          router.push({
            pathname: "/(tabs)/modules/project-material-delivery/detail",
            params: { id: String(item.id) },
          })
        }
        activeOpacity={0.75}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.projectName, { color: colors.foreground }]} numberOfLines={1}>
            {item.projectName}
          </Text>
          {renderStatusBadge(item.status, item, !isArchived)}
        </View>
        {item.clientName ? (
          <Text style={[styles.meta, { color: colors.muted }]}>Client: {item.clientName}</Text>
        ) : null}
        {item.supervisorName ? (
          <Text style={[styles.meta, { color: colors.muted }]}>Supervisor: {item.supervisorName}</Text>
        ) : null}
        <Text style={[styles.meta, { color: colors.muted }]}>
          Created by {item.createdByName ?? "Unknown"} ·{" "}
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>

        {/* Card action row — PDF + Archive/Unarchive */}
        <View style={styles.cardActions}>
          {/* Save to PDF button — available to all users */}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation?.();
              handleSavePdf(item);
            }}
            style={[styles.actionBtn, { borderColor: colors.primary, backgroundColor: isPdfLoading ? colors.primary + "18" : "transparent" }]}
            activeOpacity={0.7}
            disabled={isPdfLoading}
          >
            {isPdfLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>⬇ Save PDF</Text>
            )}
          </TouchableOpacity>

          {/* Archive / Unarchive — managers/admins only */}
          {isManagerOrAdmin && (
            isArchived ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation?.();
                  handleUnarchive(item);
                }}
                style={[styles.actionBtn, { borderColor: colors.primary }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>↩ Unarchive</Text>
              </TouchableOpacity>
            ) : isClosed ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation?.();
                  handleArchive(item);
                }}
                style={[styles.actionBtn, { borderColor: colors.muted }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionBtnText, { color: colors.muted }]}>Archive</Text>
              </TouchableOpacity>
            ) : null
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Material Delivery</Text>
        {isManagerOrAdmin && viewMode === "active" && (
          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)/modules/project-material-delivery/new")}
            activeOpacity={0.8}
          >
            <Text style={styles.newBtnText}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Active / Archived toggle */}
      <View style={[styles.viewToggle, { borderBottomColor: colors.border }]}>
        {(["active", "archived"] as ViewMode[]).map((mode) => {
          const isActive = viewMode === mode;
          const count = mode === "active" ? activeItems.length : archivedItems.length;
          return (
            <TouchableOpacity
              key={mode}
              onPress={() => { setViewMode(mode); setFilterStatus("all"); }}
              style={[
                styles.viewToggleBtn,
                isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.viewToggleBtnText, { color: isActive ? colors.primary : colors.muted }]}>
                {mode === "active" ? "Active" : "Archived"}
                {count > 0 && <Text style={styles.viewToggleCount}> ({count})</Text>}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Status filter tabs */}
      <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={["all", ...STATUS_ORDER] as (ChecklistStatus | "all")[]}
          keyExtractor={(s) => s}
          contentContainerStyle={styles.filterContent}
          renderItem={({ item: s }) => {
            const isActive = filterStatus === s;
            const color = s === "all" ? colors.primary : STATUS_COLORS[s as ChecklistStatus];
            return (
              <TouchableOpacity
                onPress={() => setFilterStatus(s)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? color : "transparent",
                    borderColor: isActive ? color : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, { color: isActive ? "#fff" : colors.muted }]}>
                  {s === "all" ? "All" : STATUS_LABELS[s as ChecklistStatus]}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            {viewMode === "archived"
              ? "No archived checklists."
              : filterStatus === "all"
              ? "No checklists yet. Tap + New to create one."
              : `No checklists with status "${STATUS_LABELS[filterStatus as ChecklistStatus]}".`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}

      {/* Quick Status Change Modal */}
      <Modal
        visible={!!statusModalItem}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalItem(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setStatusModalItem(null)}
        >
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Change Status</Text>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]} numberOfLines={1}>
              {statusModalItem?.projectName}
            </Text>
            {ALL_STATUSES.map((s) => {
              const isCurrent = statusModalItem?.status === s;
              const color = STATUS_COLORS[s];
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => handleStatusChange(statusModalItem, s)}
                  style={[
                    styles.modalOption,
                    { borderColor: colors.border },
                    isCurrent && { backgroundColor: color + "18" },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.modalOptionDot, { backgroundColor: color }]} />
                  <Text style={[styles.modalOptionText, { color: isCurrent ? color : colors.foreground, fontWeight: isCurrent ? "700" : "400" }]}>
                    {STATUS_LABELS[s]}
                  </Text>
                  {isCurrent && (
                    <Text style={[styles.modalCurrentTag, { color }]}>current</Text>
                  )}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              onPress={() => setStatusModalItem(null)}
              style={[styles.modalCancelBtn, { borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCancelText, { color: colors.muted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  newBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  viewToggle: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  viewToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  viewToggleBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  viewToggleCount: {
    fontWeight: "400",
  },
  filterBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  list: {
    padding: 12,
    gap: 10,
  },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 4,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  projectName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeTextSolid: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  meta: {
    fontSize: 13,
  },
  cardActions: {
    flexDirection: "row",
    marginTop: 8,
    gap: 8,
    flexWrap: "wrap",
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 30,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
    gap: 10,
  },
  modalOptionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  modalOptionText: {
    fontSize: 14,
    flex: 1,
  },
  modalCurrentTag: {
    fontSize: 11,
    fontWeight: "600",
  },
  modalCancelBtn: {
    marginTop: 4,
    paddingVertical: 11,
    alignItems: "center",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
