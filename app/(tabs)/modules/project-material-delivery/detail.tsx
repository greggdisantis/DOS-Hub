import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import {
  BoxedItems,
  DeliveryItems,
  ProjectSpecificItems,
  DEFAULT_BOXED_ITEMS,
  DEFAULT_DELIVERY_ITEMS,
  DEFAULT_PROJECT_SPECIFIC_ITEMS,
  ChecklistStatus,
  STATUS_LABELS,
  STATUS_COLORS,
} from "./types";
import BoxedItemsForm from "./boxed-items";
import DeliveryItemsForm from "./delivery-items";
import ProjectSpecificItemsForm from "./project-specific-items";
import FinalReviewTab from "./final-review-tab";
import PhotosTabComponent from "./photos-tab";

// ── Stage helpers ─────────────────────────────────────────────────────────────

/** Statuses where the Warehouse tab is visible */
const WAREHOUSE_VISIBLE_STATUSES: ChecklistStatus[] = ["awaiting_warehouse", "final_review", "complete", "closed"];

/** Statuses where the Final Review PO upload tab is visible */
const FINAL_REVIEW_STATUSES: ChecklistStatus[] = ["final_review", "complete", "closed"];

/** Statuses where Photos tab is visible */
const PHOTOS_VISIBLE_STATUSES: ChecklistStatus[] = ["final_review", "complete", "closed"];

type Tab = "info" | "boxed" | "delivery" | "specific" | "warehouse" | "final_review" | "photos" | "audit";

function getTabs(status: ChecklistStatus): { key: Tab; label: string }[] {
  const tabs: { key: Tab; label: string }[] = [
    { key: "info", label: "Info" },
    { key: "boxed", label: "Boxed Items" },
    { key: "delivery", label: "Delivery Items" },
    { key: "specific", label: "Project Items" },
  ];
  if (WAREHOUSE_VISIBLE_STATUSES.includes(status)) {
    tabs.push({ key: "warehouse", label: "Warehouse" });
  }
  if (FINAL_REVIEW_STATUSES.includes(status)) {
    tabs.push({ key: "final_review", label: "PO Files" });
  }
  if (PHOTOS_VISIBLE_STATUSES.includes(status)) {
    tabs.push({ key: "photos", label: "Photos" });
  }
  tabs.push({ key: "audit", label: "Audit Trail" });
  return tabs;
}

// Status workflow transitions (forward)
const STATUS_TRANSITIONS: Record<ChecklistStatus, { next: ChecklistStatus | null; action: string; nextLabel: string }> = {
  draft: { next: "ready_for_supervisor", action: "Submitted for Supervisor Review", nextLabel: "Submit to Supervisor" },
  ready_for_supervisor: { next: "awaiting_main_office", action: "Approved by Supervisor — Sent to Main Office", nextLabel: "Approve & Send to Main Office" },
  awaiting_main_office: { next: "awaiting_warehouse", action: "Main Office Approved — Sent to Warehouse", nextLabel: "Approve & Send to Warehouse" },
  awaiting_warehouse: { next: "final_review", action: "Warehouse Prepared — Ready for Final Review", nextLabel: "Mark Warehouse Ready" },
  final_review: { next: "complete", action: "Final Review Complete", nextLabel: "Mark Complete" },
  complete: { next: "closed", action: "Checklist Closed", nextLabel: "Close Checklist" },
  closed: { next: null, action: "", nextLabel: "" },
};

// Backward status transitions (managers/admins only)
const STATUS_BACK_TRANSITIONS: Partial<Record<ChecklistStatus, { prev: ChecklistStatus; action: string; prevLabel: string }>> = {
  ready_for_supervisor: { prev: "draft", action: "Reverted to Draft", prevLabel: "Revert to Draft" },
  awaiting_main_office: { prev: "ready_for_supervisor", action: "Reverted to Supervisor Review", prevLabel: "Revert to Supervisor" },
  awaiting_warehouse: { prev: "awaiting_main_office", action: "Reverted to Main Office Review", prevLabel: "Revert to Main Office" },
  final_review: { prev: "awaiting_warehouse", action: "Reverted to Warehouse", prevLabel: "Revert to Warehouse" },
  complete: { prev: "final_review", action: "Reverted to Final Review", prevLabel: "Revert to Final Review" },
  closed: { prev: "complete", action: "Reopened — Reverted to Complete", prevLabel: "Reopen Checklist" },
};

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function DetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id, isNew } = useLocalSearchParams<{ id: string; isNew?: string }>();
  const checklistId = parseInt(id ?? "0", 10);

  const [activeTab, setActiveTab] = useState<Tab>(isNew === "1" ? "boxed" : "info");
  const [boxedItems, setBoxedItems] = useState<BoxedItems>(DEFAULT_BOXED_ITEMS);
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItems>(DEFAULT_DELIVERY_ITEMS);
  const [projectSpecificItems, setProjectSpecificItems] = useState<ProjectSpecificItems>(DEFAULT_PROJECT_SPECIFIC_ITEMS);
  const [warehouseCheckoffs, setWarehouseCheckoffs] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: checklist, isLoading, refetch } = trpc.projectMaterial.get.useQuery(
    { id: checklistId },
    { enabled: checklistId > 0 },
  );
  const { data: me } = trpc.auth.me.useQuery();
  const updateMutation = trpc.projectMaterial.update.useMutation();
  const updateStatusMutation = trpc.projectMaterial.updateStatus.useMutation();
  const revertStatusMutation = trpc.projectMaterial.revertStatus.useMutation();
  const deleteMutation = trpc.projectMaterial.delete.useMutation();
  const generatePdfMutation = trpc.projectMaterial.generatePdf.useMutation();
  const utils = trpc.useUtils();

  const isManagerOrAdmin = me?.role === "admin" || me?.role === "manager";
  const isSupervisor = (me?.dosRoles as string[] | undefined)?.includes("Supervisor") ?? false;

  // Load data from server into local state
  useEffect(() => {
    if (checklist) {
      if (checklist.boxedItems) setBoxedItems(checklist.boxedItems as BoxedItems);
      if (checklist.deliveryItems) setDeliveryItems(checklist.deliveryItems as DeliveryItems);
      if (checklist.projectSpecificItems) setProjectSpecificItems(checklist.projectSpecificItems as ProjectSpecificItems);
      if (checklist.warehouseCheckoffs) setWarehouseCheckoffs(checklist.warehouseCheckoffs as Record<string, boolean>);
    }
  }, [checklist?.id]);

  // When status changes, ensure active tab is still valid
  useEffect(() => {
    if (checklist) {
      const validTabs = getTabs(checklist.status as ChecklistStatus).map((t) => t.key);
      if (!validTabs.includes(activeTab)) {
        setActiveTab("info");
      }
    }
  }, [checklist?.status]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateMutation.mutateAsync({
        id: checklistId,
        boxedItems: boxedItems as any,
        deliveryItems: deliveryItems as any,
        projectSpecificItems: projectSpecificItems as any,
        warehouseCheckoffs: warehouseCheckoffs as any,
      });
      await utils.projectMaterial.get.invalidate({ id: checklistId });
      await utils.projectMaterial.list.invalidate();
    } catch (err: any) {
      Alert.alert("Save Failed", err.message ?? "Could not save checklist.");
    } finally {
      setSaving(false);
    }
  }, [checklistId, boxedItems, deliveryItems, projectSpecificItems, warehouseCheckoffs]);

  const handleGeneratePdf = useCallback(async () => {
    setPdfLoading(true);
    try {
      const result = await generatePdfMutation.mutateAsync({ id: checklistId });
      // On web, open directly — Alert.alert multi-button callbacks don't fire on web
      if (Platform.OS === "web") {
        window.open(result.url, "_blank");
      } else {
        Alert.alert(
          "PDF Ready",
          "Your checklist PDF has been generated. Tap Open to view it.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open PDF", onPress: () => Linking.openURL(result.url) },
          ],
        );
      }
    } catch (err: any) {
      Alert.alert("PDF Error", err.message ?? "Could not generate PDF.");
    } finally {
      setPdfLoading(false);
    }
  }, [checklistId]);

  const handleStatusAdvance = async () => {
    const status = checklist?.status as ChecklistStatus;
    const transition = STATUS_TRANSITIONS[status];
    if (!transition.next) return;
    setStatusLoading(true);
    try {
      await updateStatusMutation.mutateAsync({
        id: checklistId,
        status: transition.next,
        action: transition.action,
        projectName: checklist?.projectName,
      });
      await refetch();
      await utils.projectMaterial.list.invalidate();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to update status.");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleStatusRevert = async (prevStatus: ChecklistStatus, action: string) => {
    setStatusLoading(true);
    try {
      await revertStatusMutation.mutateAsync({
        id: checklistId,
        status: prevStatus,
        action,
      });
      await refetch();
      await utils.projectMaterial.list.invalidate();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to revert status.");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteMutation.mutateAsync({ id: checklistId });
      await utils.projectMaterial.list.invalidate();
      router.replace("/(tabs)/modules/project-material-delivery");
    } catch (err: any) {
      Alert.alert("Delete Failed", err.message ?? "Could not delete checklist.");
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!checklist) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={{ color: colors.muted }}>Checklist not found.</Text>
        </View>
      </ScreenContainer>
    );
  }

  const status = checklist.status as ChecklistStatus;
  const statusColor = STATUS_COLORS[status] ?? "#6B7280";
  const statusLabel = STATUS_LABELS[status] ?? status;
  const transition = STATUS_TRANSITIONS[status];
  const backTransition = STATUS_BACK_TRANSITIONS[status];

  // Edit access: managers/admins can always edit (except closed), supervisors can edit at their stage
  const isEditable = isManagerOrAdmin
    ? status !== "closed"
    : isSupervisor
    ? ["draft", "ready_for_supervisor", "awaiting_main_office", "final_review"].includes(status)
    : ["draft", "awaiting_main_office", "final_review"].includes(status);

  const tabs = getTabs(status);
  const showSave = isEditable && activeTab !== "info" && activeTab !== "audit";

  const renderTabContent = () => {
    switch (activeTab) {
      case "info":
        return (
          <ScrollView contentContainerStyle={styles.infoContent}>
            <InfoRow label="Project Name" value={checklist.projectName} colors={colors} />
            <InfoRow label="Client" value={checklist.clientName} colors={colors} />
            <InfoRow label="Location" value={checklist.projectLocation} colors={colors} />
            <InfoRow label="Supervisor" value={checklist.supervisorName} colors={colors} />
            <InfoRow label="Created By" value={checklist.createdByName} colors={colors} />
            <InfoRow label="Created" value={new Date(checklist.createdAt).toLocaleString()} colors={colors} />
            <InfoRow label="Last Updated" value={new Date(checklist.updatedAt).toLocaleString()} colors={colors} />

            {/* Delete button — managers/admins only */}
            {isManagerOrAdmin && (
              <View style={{ marginTop: 24 }}>
                {showDeleteConfirm ? (
                  <View style={[styles.deleteConfirmBox, { borderColor: colors.error, backgroundColor: colors.error + "10" }]}>
                    <Text style={[styles.deleteConfirmText, { color: colors.foreground }]}>
                      Are you sure? This will permanently delete this checklist and all its data.
                    </Text>
                    <View style={styles.deleteConfirmBtns}>
                      <TouchableOpacity
                        style={[styles.deleteConfirmCancel, { borderColor: colors.border }]}
                        onPress={() => setShowDeleteConfirm(false)}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: colors.foreground, fontWeight: "600" }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.deleteConfirmDelete, { backgroundColor: colors.error, opacity: deleting ? 0.7 : 1 }]}
                        onPress={handleDelete}
                        disabled={deleting}
                        activeOpacity={0.8}
                      >
                        {deleting ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={{ color: "#fff", fontWeight: "700" }}>Delete Permanently</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.deleteBtn, { borderColor: colors.error }]}
                    onPress={() => setShowDeleteConfirm(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.deleteBtnText, { color: colors.error }]}>Delete Checklist</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        );
      case "boxed":
        return <BoxedItemsForm value={boxedItems} onChange={setBoxedItems} readOnly={!isEditable} />;
      case "delivery":
        return <DeliveryItemsForm value={deliveryItems} onChange={setDeliveryItems} readOnly={!isEditable} />;
      case "specific":
        return <ProjectSpecificItemsForm value={projectSpecificItems} onChange={setProjectSpecificItems} readOnly={!isEditable} />;
      case "warehouse":
        return (
          <WarehouseTab
            boxedItems={boxedItems}
            checkoffs={warehouseCheckoffs}
            onToggle={(key) => setWarehouseCheckoffs((prev) => ({ ...prev, [key]: !prev[key] }))}
            colors={colors}
            readOnly={status !== "awaiting_warehouse" && !isManagerOrAdmin}
          />
        );
      case "final_review":
        return (
          <FinalReviewTab
            checklistId={checklistId}
            attachments={checklist.attachments ?? []}
            onAttachmentsChange={() => {
              utils.projectMaterial.get.invalidate({ id: checklistId });
              refetch();
            }}
            readOnly={status !== "final_review" && !isManagerOrAdmin}
          />
        );
      case "photos":
        return (
          <PhotosTabComponent
            checklistId={checklistId}
            loadedPhotos={checklist.materialsLoadedPhotos ?? []}
            deliveredPhotos={checklist.materialsDeliveredPhotos ?? []}
            materialsLoaded={checklist.materialsLoaded ?? false}
            materialsDelivered={checklist.materialsDelivered ?? false}
            materialsLoadedByName={(checklist as any).materialsLoadedByName ?? null}
            materialsLoadedAt={(checklist as any).materialsLoadedAt ?? null}
            materialsDeliveredByName={(checklist as any).materialsDeliveredByName ?? null}
            materialsDeliveredAt={(checklist as any).materialsDeliveredAt ?? null}
            onUpdate={() => {
              utils.projectMaterial.get.invalidate({ id: checklistId });
              refetch();
            }}
            readOnly={status === "closed" && !isManagerOrAdmin}
          />
        );
      case "audit":
        return <AuditTab trail={checklist.auditTrail ?? []} colors={colors} />;
    }
  };

  return (
    <ScreenContainer>
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)/modules/project-material-delivery")}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
          {checklist.projectName}
        </Text>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.pdfBtn, { borderColor: colors.primary, opacity: pdfLoading ? 0.6 : 1 }]}
            onPress={handleGeneratePdf}
            disabled={pdfLoading}
            activeOpacity={0.8}
          >
            {pdfLoading ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Text style={[styles.pdfBtnText, { color: colors.primary }]}>PDF</Text>
            )}
          </TouchableOpacity>
          {showSave && (
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Status + Submit bar ── */}
      <View style={[styles.statusBar, { backgroundColor: statusColor + "15", borderBottomColor: colors.border }]}>
        <View style={styles.statusLeft}>
          <Text style={[styles.statusBarLabel, { color: colors.muted }]}>Status</Text>
          <Text style={[styles.statusBarValue, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        <View style={styles.statusActions}>
          {/* Backward revert — managers/admins only */}
          {isManagerOrAdmin && backTransition && (
            <TouchableOpacity
              style={[styles.revertBtn, { borderColor: colors.muted, opacity: statusLoading ? 0.7 : 1 }]}
              onPress={() => handleStatusRevert(backTransition.prev, backTransition.action)}
              disabled={statusLoading}
              activeOpacity={0.8}
            >
              <Text style={[styles.revertBtnText, { color: colors.muted }]}>
                {"\u21A9"} {backTransition.prevLabel}
              </Text>
            </TouchableOpacity>
          )}
          {/* Forward transition */}
          {transition.next && (
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: statusColor, opacity: statusLoading ? 0.7 : 1 }]}
              onPress={handleStatusAdvance}
              disabled={statusLoading}
              activeOpacity={0.85}
            >
              {statusLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>{transition.nextLabel} {"\u2192"}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Tab bar ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.tabBarContent}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tab, isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, { color: isActive ? colors.primary : colors.muted }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Tab content ── */}
      <View style={{ flex: 1 }}>{renderTabContent()}</View>
    </ScreenContainer>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({ label, value, colors }: { label: string; value: string | null | undefined; colors: any }) {
  if (!value) return null;
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function WarehouseTab({
  boxedItems,
  checkoffs,
  onToggle,
  colors,
  readOnly,
}: {
  boxedItems: BoxedItems;
  checkoffs: Record<string, boolean>;
  onToggle: (key: string) => void;
  colors: any;
  readOnly?: boolean;
}) {
  const items: { key: string; label: string; qty: number }[] = [];
  const addItem = (key: string, label: string, qty: number | null) => {
    if (qty && qty > 0) items.push({ key, label, qty });
  };

  addItem("pvc_scupper6", '6" Scupper', boxedItems.pvc.scupper6);
  addItem("pvc_scupper8", '8" Scupper', boxedItems.pvc.scupper8);
  addItem("pvc_coupling3", '3" Coupling', boxedItems.pvc.coupling3);
  addItem("pvc_reducer3to2", '3" to 2" Reducer', boxedItems.pvc.reducer3to2);
  addItem("pvc_coupling3b", '3" Coupling (B)', boxedItems.pvc.coupling3b);
  addItem("pvc_coupling2", '2" Coupling', boxedItems.pvc.coupling2);
  if (boxedItems.pvc.custom && boxedItems.pvc.customQty) addItem("pvc_custom", boxedItems.pvc.custom, boxedItems.pvc.customQty);
  addItem("screws_1_5", '1.5" Screen Screws', boxedItems.screenScrews.size1_5);
  addItem("screws_2", '2" Screen Screws', boxedItems.screenScrews.size2);
  addItem("ledger_2_7_8", '2-7/8" Ledger Locks', boxedItems.ledgerLocks.size2_7_8);
  addItem("ledger_4_5", '4.5" Ledger Locks', boxedItems.ledgerLocks.size4_5);
  addItem("ledger_6", '6" Ledger Locks', boxedItems.ledgerLocks.size6);
  addItem("wedge_5_5", '5.5" Wedge Anchors', boxedItems.wedgeAnchors.size5_5);
  if (boxedItems.wedgeAnchors.custom && boxedItems.wedgeAnchors.customQty) addItem("wedge_custom", boxedItems.wedgeAnchors.custom, boxedItems.wedgeAnchors.customQty);
  addItem("foam_tape", "Foam Tape Roll", boxedItems.foamTape.tapeRoll);
  addItem("foam_3m", "3M Dot", boxedItems.foamTape.dot3m);
  addItem("foam_flashing", "Flashing Tape", boxedItems.foamTape.flashingTape);
  if (boxedItems.caulkSealants.osiQuadMaxColor && boxedItems.caulkSealants.osiQuadMaxQty) addItem("osi_quad", `OSI Quad Max (${boxedItems.caulkSealants.osiQuadMaxColor})`, boxedItems.caulkSealants.osiQuadMaxQty);
  if (boxedItems.caulkSealants.flexSealQty) addItem("flex_seal", `Flex Seal (${boxedItems.caulkSealants.flexSealColor || "no color"})`, boxedItems.caulkSealants.flexSealQty);
  addItem("ruscoe", "Ruscoe 12-3", boxedItems.caulkSealants.ruscoe12_3Qty);
  if (boxedItems.caulkSealants.customName && boxedItems.caulkSealants.customQty) addItem("caulk_custom", `${boxedItems.caulkSealants.customName} (${boxedItems.caulkSealants.customColor || "no color"})`, boxedItems.caulkSealants.customQty);
  if (boxedItems.ledLights.hasLights && boxedItems.ledLights.qty) addItem("led_lights", `LED Lights (${boxedItems.ledLights.type || "type TBD"}, ${boxedItems.ledLights.color || "color TBD"})`, boxedItems.ledLights.qty);

  const checked = items.filter((i) => checkoffs[i.key]).length;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={[styles.warehouseHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.warehouseTitle, { color: colors.foreground }]}>Warehouse Pull List</Text>
        <Text style={[styles.warehouseProgress, { color: colors.primary }]}>{checked} / {items.length} pulled</Text>
      </View>
      {readOnly && (
        <View style={[styles.readOnlyBanner, { backgroundColor: colors.warning + "20", borderBottomColor: colors.warning }]}>
          <Text style={[styles.readOnlyBannerText, { color: colors.warning }]}>
            View only — warehouse pull list is locked after this stage.
          </Text>
        </View>
      )}
      {items.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: colors.muted, textAlign: "center", padding: 32 }}>
            No items with quantities entered yet. Fill in Boxed Items first.
          </Text>
        </View>
      ) : (
        items.map((item) => {
          const isDone = !!checkoffs[item.key];
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.checkRow, { borderBottomColor: colors.border, backgroundColor: isDone ? colors.success + "10" : "transparent" }]}
              onPress={readOnly ? undefined : () => onToggle(item.key)}
              activeOpacity={readOnly ? 1 : 0.7}
            >
              <View style={[styles.checkbox, { borderColor: isDone ? colors.success : colors.border, backgroundColor: isDone ? colors.success : "transparent" }]}>
                {isDone && <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.checkLabel, { color: isDone ? colors.muted : colors.foreground, textDecorationLine: isDone ? "line-through" : "none" }]}>{item.label}</Text>
              </View>
              <Text style={[styles.checkQty, { color: isDone ? colors.muted : colors.primary }]}>x{item.qty}</Text>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

function AuditTab({ trail, colors }: { trail: Array<{ userId: number; userName: string; action: string; timestamp: string }>; colors: any }) {
  if (trail.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted }}>No audit trail entries yet.</Text>
      </View>
    );
  }
  return (
    <FlatList
      data={[...trail].reverse()}
      keyExtractor={(_, i) => String(i)}
      contentContainerStyle={{ paddingBottom: 40 }}
      renderItem={({ item }) => (
        <View style={[styles.auditRow, { borderBottomColor: colors.border }]}>
          <View style={[styles.auditDot, { backgroundColor: colors.primary }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.auditAction, { color: colors.foreground }]}>{item.action}</Text>
            <Text style={[styles.auditMeta, { color: colors.muted }]}>
              {item.userName} · {new Date(item.timestamp).toLocaleString()}
            </Text>
          </View>
        </View>
      )}
    />
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 60 },
  backText: { fontSize: 15, fontWeight: "500" },
  title: { fontSize: 16, fontWeight: "700", flex: 1, textAlign: "center" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  pdfBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5, minWidth: 44, alignItems: "center", justifyContent: "center" },
  pdfBtnText: { fontWeight: "700", fontSize: 13 },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  saveBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
    flexWrap: "wrap",
  },
  statusLeft: { flex: 1, minWidth: 120 },
  statusBarLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
  statusBarValue: { fontSize: 14, fontWeight: "700" },
  statusActions: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  submitBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, flexShrink: 1 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  revertBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, flexShrink: 1 },
  revertBtnText: { fontWeight: "600", fontSize: 12 },
  tabBar: { borderBottomWidth: StyleSheet.hairlineWidth, maxHeight: 44 },
  tabBarContent: { paddingHorizontal: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 12, marginRight: 2 },
  tabText: { fontSize: 13, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  infoContent: { padding: 16, paddingBottom: 40 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 16 },
  infoLabel: { fontSize: 14, flex: 1 },
  infoValue: { fontSize: 14, fontWeight: "500", flex: 2, textAlign: "right" },
  deleteBtn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  deleteBtnText: { fontWeight: "600", fontSize: 15 },
  deleteConfirmBox: { borderWidth: 1.5, borderRadius: 10, padding: 16, gap: 12 },
  deleteConfirmText: { fontSize: 14, lineHeight: 20 },
  deleteConfirmBtns: { flexDirection: "row", gap: 10 },
  deleteConfirmCancel: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  deleteConfirmDelete: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  warehouseHeader: { padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth },
  warehouseTitle: { fontSize: 16, fontWeight: "700" },
  warehouseProgress: { fontSize: 14, fontWeight: "600" },
  readOnlyBanner: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  readOnlyBannerText: { fontSize: 13, fontWeight: "500" },
  checkRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  checkLabel: { fontSize: 15, lineHeight: 20 },
  checkQty: { fontSize: 14, fontWeight: "600" },
  auditRow: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  auditDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  auditAction: { fontSize: 14, fontWeight: "500", lineHeight: 20 },
  auditMeta: { fontSize: 12, marginTop: 2 },
});
