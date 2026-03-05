import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Platform,
} from "react-native";
import { Stack } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

// ─── Types ────────────────────────────────────────────────────────────────────

type RequestType = "vacation" | "sick" | "personal" | "bereavement" | "unpaid" | "other";

const REQUEST_TYPES: { value: RequestType; label: string; color: string }[] = [
  { value: "vacation", label: "Vacation", color: "#3B82F6" },
  { value: "sick", label: "Sick Leave", color: "#EF4444" },
  { value: "personal", label: "Personal", color: "#8B5CF6" },
  { value: "bereavement", label: "Bereavement", color: "#6B7280" },
  { value: "unpaid", label: "Unpaid", color: "#F59E0B" },
  { value: "other", label: "Other", color: "#10B981" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  approved: "#22C55E",
  denied: "#EF4444",
  cancelled: "#9CA3AF",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

function getCurrentPeriodYear(startDate?: string | null): string {
  const now = new Date();
  if (!startDate) return `${now.getFullYear()}`;
  const [, m, d] = startDate.split("-");
  const periodStart = new Date(now.getFullYear(), parseInt(m) - 1, parseInt(d));
  if (now < periodStart) {
    return `${now.getFullYear() - 1}-${now.getFullYear()}`;
  }
  return `${now.getFullYear()}-${now.getFullYear() + 1}`;
}

function calcDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (e < s) return 0;
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diff;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Simple Date Input ────────────────────────────────────────────────────────

function DateInput({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [raw, setRaw] = useState(value.replace(/-/g, "/"));

  const handleChange = (text: string) => {
    // Auto-insert slashes: YYYY/MM/DD
    let cleaned = text.replace(/[^0-9]/g, "");
    if (cleaned.length > 4) cleaned = cleaned.slice(0, 4) + "/" + cleaned.slice(4);
    if (cleaned.length > 7) cleaned = cleaned.slice(0, 7) + "/" + cleaned.slice(7);
    cleaned = cleaned.slice(0, 10);
    setRaw(cleaned);
    if (cleaned.length === 10) {
      const iso = cleaned.replace(/\//g, "-");
      onChange(iso);
    }
  };

  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
        value={raw}
        onChangeText={handleChange}
        placeholder="YYYY/MM/DD"
        placeholderTextColor={colors.muted}
        keyboardType="numeric"
        maxLength={10}
        returnKeyType="done"
      />
    </View>
  );
}

// ─── PTO Balance Card ─────────────────────────────────────────────────────────

function PTOBalanceCard({ colors }: { colors: ReturnType<typeof useColors> }) {
  const { data: policy } = trpc.timeOff.getMyPolicy.useQuery();
  const periodYear = getCurrentPeriodYear(policy?.periodStartDate);
  const { data: usedData } = trpc.timeOff.getUsedDays.useQuery({ periodYear });

  const totalDays = parseFloat(String(policy?.totalDaysAllowed ?? "0"));
  const usedDays = usedData?.usedDays ?? 0;
  const remainingDays = Math.max(0, totalDays - usedDays);
  const pct = totalDays > 0 ? Math.min(1, usedDays / totalDays) : 0;

  return (
    <View style={[styles.balanceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.balanceTitle, { color: colors.foreground }]}>PTO Balance</Text>
      {policy ? (
        <>
          <View style={styles.balanceRow}>
            <View style={styles.balanceStat}>
              <Text style={[styles.balanceNum, { color: "#22C55E" }]}>{remainingDays.toFixed(1)}</Text>
              <Text style={[styles.balanceLabel, { color: colors.muted }]}>Remaining</Text>
            </View>
            <View style={styles.balanceStat}>
              <Text style={[styles.balanceNum, { color: "#F59E0B" }]}>{usedDays.toFixed(1)}</Text>
              <Text style={[styles.balanceLabel, { color: colors.muted }]}>Used</Text>
            </View>
            <View style={styles.balanceStat}>
              <Text style={[styles.balanceNum, { color: colors.foreground }]}>{totalDays.toFixed(1)}</Text>
              <Text style={[styles.balanceLabel, { color: colors.muted }]}>Total</Text>
            </View>
          </View>
          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: pct > 0.8 ? "#EF4444" : "#22C55E" }]} />
          </View>
          {policy.periodStartDate && policy.periodEndDate && (
            <Text style={[styles.periodText, { color: colors.muted }]}>
              Period: {formatDate(policy.periodStartDate)} – {formatDate(policy.periodEndDate)}
            </Text>
          )}
          <Text style={[styles.periodText, { color: colors.muted }]}>Year: {periodYear}</Text>
        </>
      ) : (
        <Text style={[styles.noPolicy, { color: colors.muted }]}>
          No PTO policy configured yet. Contact your manager.
        </Text>
      )}
    </View>
  );
}

// ─── Request Form Modal ────────────────────────────────────────────────────────

function RequestFormModal({
  visible,
  onClose,
  onSuccess,
  colors,
  periodYear,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  colors: ReturnType<typeof useColors>;
  periodYear: string;
}) {
  const [requestType, setRequestType] = useState<RequestType>("vacation");
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [reason, setReason] = useState("");
  const [isPartialDay, setIsPartialDay] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  const utils = trpc.useUtils();
  const submit = trpc.timeOff.submitRequest.useMutation({
    onSuccess: () => {
      utils.timeOff.getMyRequests.invalidate();
      utils.timeOff.getUsedDays.invalidate();
      onSuccess();
      resetForm();
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const resetForm = () => {
    setRequestType("vacation");
    setStartDate(todayStr());
    setEndDate(todayStr());
    setReason("");
    setIsPartialDay(false);
    setStartTime("09:00");
    setEndTime("17:00");
  };

  const days = calcDays(startDate, endDate);
  const hours = isPartialDay ? calcPartialHours(startTime, endTime) : days * 8;

  function calcPartialHours(s: string, e: string): number {
    const [sh, sm] = s.split(":").map(Number);
    const [eh, em] = e.split(":").map(Number);
    return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
  }

  const handleSubmit = () => {
    if (!startDate || !endDate) {
      Alert.alert("Missing dates", "Please enter start and end dates.");
      return;
    }
    if (endDate < startDate) {
      Alert.alert("Invalid dates", "End date must be on or after start date.");
      return;
    }
    submit.mutate({
      requestType,
      startDate,
      endDate,
      startTime: isPartialDay ? startTime : undefined,
      endTime: isPartialDay ? endTime : undefined,
      totalDays: isPartialDay ? (hours / 8).toFixed(2) : String(days),
      totalHours: String(isPartialDay ? hours : days * 8),
      reason: reason.trim() || undefined,
      periodYear,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={[styles.cancelBtnText, { color: colors.muted }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Request Time Off</Text>
          <TouchableOpacity onPress={handleSubmit} style={styles.submitBtn} disabled={submit.isPending}>
            {submit.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
          {/* Type selector */}
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>TYPE OF TIME OFF</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
            {REQUEST_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.typeChip,
                  { borderColor: t.color, backgroundColor: requestType === t.value ? t.color : "transparent" },
                ]}
                onPress={() => setRequestType(t.value)}
              >
                <Text style={[styles.typeChipText, { color: requestType === t.value ? "#fff" : t.color }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Dates */}
          <DateInput label="Start Date" value={startDate} onChange={setStartDate} colors={colors} />
          <DateInput label="End Date" value={endDate} onChange={setEndDate} colors={colors} />

          {/* Duration summary */}
          {days > 0 && (
            <View style={[styles.durationBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.durationText, { color: colors.foreground }]}>
                {isPartialDay ? `${hours.toFixed(1)} hours` : `${days} day${days !== 1 ? "s" : ""}`}
              </Text>
              <Text style={[styles.durationSub, { color: colors.muted }]}>
                {formatDate(startDate)}{days > 1 ? ` – ${formatDate(endDate)}` : ""}
              </Text>
            </View>
          )}

          {/* Partial day toggle */}
          <TouchableOpacity
            style={[styles.toggleRow, { borderColor: colors.border }]}
            onPress={() => setIsPartialDay(!isPartialDay)}
          >
            <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Partial Day</Text>
            <View style={[styles.toggleSwitch, { backgroundColor: isPartialDay ? "#3B82F6" : colors.border }]}>
              <View style={[styles.toggleThumb, { transform: [{ translateX: isPartialDay ? 20 : 2 }] }]} />
            </View>
          </TouchableOpacity>

          {isPartialDay && (
            <View style={styles.timeRow}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.muted }]}>Start Time</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="09:00"
                  placeholderTextColor={colors.muted}
                  returnKeyType="done"
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.muted }]}>End Time</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="17:00"
                  placeholderTextColor={colors.muted}
                  returnKeyType="done"
                />
              </View>
            </View>
          )}

          {/* Reason */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.muted }]}>Reason (optional)</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              value={reason}
              onChangeText={setReason}
              placeholder="Describe the reason for your time off request..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={4}
              returnKeyType="done"
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({
  item,
  onCancel,
  colors,
}: {
  item: any;
  onCancel: (id: number) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const typeInfo = REQUEST_TYPES.find((t) => t.value === item.requestType) || REQUEST_TYPES[0];
  const statusColor = STATUS_COLORS[item.status] || "#9CA3AF";

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: typeInfo.color + "20", borderColor: typeInfo.color }]}>
          <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={[styles.cardDates, { color: colors.foreground }]}>
        {formatDate(item.startDate)}{item.startDate !== item.endDate ? ` – ${formatDate(item.endDate)}` : ""}
      </Text>

      <View style={styles.cardMeta}>
        <Text style={[styles.cardMetaText, { color: colors.muted }]}>
          {parseFloat(String(item.totalDays ?? "0")).toFixed(1)} days
          {item.totalHours ? ` (${parseFloat(String(item.totalHours)).toFixed(1)} hrs)` : ""}
        </Text>
        {item.periodYear && (
          <Text style={[styles.cardMetaText, { color: colors.muted }]}>Period: {item.periodYear}</Text>
        )}
      </View>

      {item.reason ? (
        <Text style={[styles.cardReason, { color: colors.muted }]} numberOfLines={2}>
          {item.reason}
        </Text>
      ) : null}

      {item.reviewNotes ? (
        <Text style={[styles.reviewNote, { color: item.status === "approved" ? "#22C55E" : "#EF4444" }]}>
          Manager note: {item.reviewNotes}
        </Text>
      ) : null}

      {item.status === "pending" && (
        <TouchableOpacity
          style={[styles.cancelRequestBtn, { borderColor: "#EF4444" }]}
          onPress={() => onCancel(item.id)}
        >
          <Text style={styles.cancelRequestBtnText}>Cancel Request</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TimeOffScreen() {
  const colors = useColors();
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("");

  const { data: policy } = trpc.timeOff.getMyPolicy.useQuery();
  const periodYear = getCurrentPeriodYear(policy?.periodStartDate);

  const { data: requests = [], isLoading, refetch } = trpc.timeOff.getMyRequests.useQuery(
    filterPeriod ? { periodYear: filterPeriod } : undefined
  );

  const utils = trpc.useUtils();
  const cancelMutation = trpc.timeOff.cancelRequest.useMutation({
    onSuccess: () => {
      utils.timeOff.getMyRequests.invalidate();
      utils.timeOff.getUsedDays.invalidate();
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const handleCancel = useCallback(
    (id: number) => {
      Alert.alert("Cancel Request", "Are you sure you want to cancel this request?", [
        { text: "No", style: "cancel" },
        { text: "Yes, Cancel", style: "destructive", onPress: () => cancelMutation.mutate({ id }) },
      ]);
    },
    [cancelMutation]
  );

  const filtered = filterStatus === "all" ? requests : requests.filter((r: any) => r.status === filterStatus);

  // Build available period years from requests
  const availablePeriods = Array.from(new Set(requests.map((r: any) => r.periodYear).filter(Boolean))) as string[];

  return (
    <ScreenContainer>
      <Stack.Screen options={{ title: "My Time Off", headerBackTitle: "Back" }} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* PTO Balance */}
        <PTOBalanceCard colors={colors} />

        {/* Request Button */}
        <TouchableOpacity
          style={styles.requestBtn}
          onPress={() => setShowForm(true)}
        >
          <Text style={styles.requestBtnText}>+ Request Time Off</Text>
        </TouchableOpacity>

        {/* Period Filter */}
        {availablePeriods.length > 0 && (
          <View style={styles.filterSection}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>FILTER BY PERIOD</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.filterChip, { borderColor: !filterPeriod ? "#3B82F6" : colors.border, backgroundColor: !filterPeriod ? "#3B82F620" : "transparent" }]}
                onPress={() => setFilterPeriod("")}
              >
                <Text style={[styles.filterChipText, { color: !filterPeriod ? "#3B82F6" : colors.muted }]}>All Periods</Text>
              </TouchableOpacity>
              {availablePeriods.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.filterChip, { borderColor: filterPeriod === p ? "#3B82F6" : colors.border, backgroundColor: filterPeriod === p ? "#3B82F620" : "transparent" }]}
                  onPress={() => setFilterPeriod(p)}
                >
                  <Text style={[styles.filterChipText, { color: filterPeriod === p ? "#3B82F6" : colors.muted }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Status Filter */}
        <View style={styles.filterSection}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>FILTER BY STATUS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {["all", "pending", "approved", "denied", "cancelled"].map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.filterChip, {
                  borderColor: filterStatus === s ? (STATUS_COLORS[s] || "#3B82F6") : colors.border,
                  backgroundColor: filterStatus === s ? (STATUS_COLORS[s] || "#3B82F6") + "20" : "transparent",
                }]}
                onPress={() => setFilterStatus(s)}
              >
                <Text style={[styles.filterChipText, { color: filterStatus === s ? (STATUS_COLORS[s] || "#3B82F6") : colors.muted }]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Requests List */}
        <Text style={[styles.sectionLabel, { color: colors.muted, marginTop: 8 }]}>MY REQUESTS</Text>
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
        ) : filtered.length === 0 ? (
          <View style={[styles.emptyState, { borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>No requests found.</Text>
            <Text style={[styles.emptySubText, { color: colors.muted }]}>Tap "Request Time Off" to submit one.</Text>
          </View>
        ) : (
          filtered.map((item: any) => (
            <RequestCard key={item.id} item={item} onCancel={handleCancel} colors={colors} />
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <RequestFormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={() => setShowForm(false)}
        colors={colors}
        periodYear={periodYear}
      />
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  balanceCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  balanceTitle: { fontSize: 17, fontWeight: "700", marginBottom: 12 },
  balanceRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 12 },
  balanceStat: { alignItems: "center" },
  balanceNum: { fontSize: 28, fontWeight: "800" },
  balanceLabel: { fontSize: 12, marginTop: 2 },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  progressFill: { height: 8, borderRadius: 4 },
  periodText: { fontSize: 12, marginTop: 2 },
  noPolicy: { fontSize: 14, textAlign: "center", paddingVertical: 8 },
  requestBtn: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  requestBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  filterSection: { marginBottom: 12 },
  sectionLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5, marginBottom: 8 },
  filterChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
  },
  filterChipText: { fontSize: 13, fontWeight: "500" },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  typeBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontSize: 12, fontWeight: "600" },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
  cardDates: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  cardMeta: { flexDirection: "row", gap: 12, marginBottom: 4 },
  cardMetaText: { fontSize: 13 },
  cardReason: { fontSize: 13, marginTop: 4, fontStyle: "italic" },
  reviewNote: { fontSize: 13, marginTop: 6, fontWeight: "500" },
  cancelRequestBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  cancelRequestBtnText: { color: "#EF4444", fontSize: 14, fontWeight: "600" },
  emptyState: {
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: "dashed",
    padding: 32,
    alignItems: "center",
    marginTop: 8,
  },
  emptyText: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  emptySubText: { fontSize: 13, textAlign: "center" },
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    paddingTop: Platform.OS === "ios" ? 56 : 14,
  },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  cancelBtn: { paddingHorizontal: 4 },
  cancelBtnText: { fontSize: 16 },
  submitBtn: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 72,
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  modalBody: { flex: 1, padding: 16 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "600", marginBottom: 6, letterSpacing: 0.3 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: "top",
  },
  typeScroll: { marginBottom: 20 },
  typeChip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  typeChipText: { fontSize: 14, fontWeight: "600" },
  durationBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  durationText: { fontSize: 20, fontWeight: "800" },
  durationSub: { fontSize: 13, marginTop: 2 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  toggleLabel: { fontSize: 15, fontWeight: "500" },
  toggleSwitch: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  timeRow: { flexDirection: "row" },
});
