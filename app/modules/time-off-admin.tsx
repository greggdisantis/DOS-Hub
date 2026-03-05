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
  StyleSheet,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Stack } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

// Web-compatible date picker using native HTML input
function WebDateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  if (Platform.OS !== "web") return null;
  return (
    <input
      type="date"
      value={value || ""}
      onChange={(e: any) => onChange(e.target.value)}
      style={{
        position: "absolute",
        opacity: 0,
        width: "100%",
        height: "100%",
        top: 0,
        left: 0,
        cursor: "pointer",
        zIndex: 10,
      }}
    />
  );
}

// ─── Types & Constants ────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  approved: "#22C55E",
  denied: "#EF4444",
  cancelled: "#9CA3AF",
};

const REQUEST_TYPE_COLORS: Record<string, string> = {
  vacation: "#3B82F6",
  sick: "#EF4444",
  personal: "#8B5CF6",
  bereavement: "#6B7280",
  unpaid: "#F59E0B",
  other: "#10B981",
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

// ─── Edit Policy Modal ────────────────────────────────────────────────────────

function EditPolicyModal({
  visible,
  user,
  policy,
  onClose,
  onSaved,
  colors,
}: {
  visible: boolean;
  user: { id: number; name: string };
  policy: any;
  onClose: () => void;
  onSaved: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [totalDays, setTotalDays] = useState(String(policy?.totalDaysAllowed ?? "0"));
  const [totalHours, setTotalHours] = useState(String(policy?.totalHoursAllowed ?? "0"));
  const [periodStart, setPeriodStart] = useState(policy?.periodStartDate ?? "");
  const [periodEnd, setPeriodEnd] = useState(policy?.periodEndDate ?? "");
  const [notes, setNotes] = useState(policy?.notes ?? "");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Convert "YYYY-MM-DD" string to Date object (or today if empty)
  const toDate = (str: string): Date => {
    if (str && /^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  };
  // Convert Date to "YYYY-MM-DD" string
  const fromDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const utils = trpc.useUtils();
  const upsert = trpc.timeOff.upsertPolicy.useMutation({
    onSuccess: () => {
      utils.timeOff.getAllPolicies.invalidate();
      utils.timeOff.getPolicyForUser.invalidate({ userId: user.id });
      onSaved();
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const handleSave = () => {
    upsert.mutate({
      userId: user.id,
      totalDaysAllowed: totalDays,
      totalHoursAllowed: totalHours,
      periodStartDate: periodStart || undefined,
      periodEndDate: periodEnd || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.cancelBtnText, { color: colors.muted }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit PTO Policy</Text>
          <TouchableOpacity onPress={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <Text style={{ color: "#3B82F6", fontSize: 16, fontWeight: "700" }}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
          <Text style={[styles.policyUserName, { color: colors.foreground }]}>{user.name}</Text>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.muted }]}>TOTAL DAYS ALLOWED PER PERIOD</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              value={totalDays}
              onChangeText={setTotalDays}
              keyboardType="decimal-pad"
              placeholder="e.g. 10"
              placeholderTextColor={colors.muted}
              returnKeyType="done"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.muted }]}>TOTAL HOURS ALLOWED PER PERIOD</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              value={totalHours}
              onChangeText={setTotalHours}
              keyboardType="decimal-pad"
              placeholder="e.g. 80"
              placeholderTextColor={colors.muted}
              returnKeyType="done"
            />
          </View>

          {/* Period Start Date Picker */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.muted }]}>PERIOD START DATE</Text>
            <View style={{ position: "relative" }}>
              <TouchableOpacity
                onPress={() => Platform.OS !== "web" && setShowStartPicker(true)}
                activeOpacity={0.7}
                style={[styles.datePickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={{ fontSize: 16, color: periodStart ? colors.foreground : colors.muted }}>
                  {periodStart ? formatDate(periodStart) : "Select start date"}
                </Text>
                <Text style={{ fontSize: 18 }}>📅</Text>
              </TouchableOpacity>
              <WebDateInput value={periodStart} onChange={setPeriodStart} />
            </View>
            {showStartPicker && Platform.OS !== "web" && (
              <DateTimePicker
                value={toDate(periodStart)}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={(_, date) => {
                  setShowStartPicker(Platform.OS === "ios");
                  if (date) setPeriodStart(fromDate(date));
                }}
              />
            )}
          </View>

          {/* Period End Date Picker */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.muted }]}>PERIOD END DATE</Text>
            <View style={{ position: "relative" }}>
              <TouchableOpacity
                onPress={() => Platform.OS !== "web" && setShowEndPicker(true)}
                activeOpacity={0.7}
                style={[styles.datePickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={{ fontSize: 16, color: periodEnd ? colors.foreground : colors.muted }}>
                  {periodEnd ? formatDate(periodEnd) : "Select end date"}
                </Text>
                <Text style={{ fontSize: 18 }}>📅</Text>
              </TouchableOpacity>
              <WebDateInput value={periodEnd} onChange={setPeriodEnd} />
            </View>
            {showEndPicker && Platform.OS !== "web" && (
              <DateTimePicker
                value={toDate(periodEnd)}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={(_, date) => {
                  setShowEndPicker(Platform.OS === "ios");
                  if (date) setPeriodEnd(fromDate(date));
                }}
              />
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.muted }]}>NOTES (optional)</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Standard 10-day package, resets April 1st"
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
              returnKeyType="done"
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Review Request Modal ─────────────────────────────────────────────────────

function ReviewModal({
  visible,
  request,
  onClose,
  onReviewed,
  colors,
}: {
  visible: boolean;
  request: any;
  onClose: () => void;
  onReviewed: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [reviewNotes, setReviewNotes] = useState("");
  const utils = trpc.useUtils();

  const review = trpc.timeOff.reviewRequest.useMutation({
    onSuccess: () => {
      utils.timeOff.getAllRequests.invalidate();
      onReviewed();
      setReviewNotes("");
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  if (!request) return null;

  const typeColor = REQUEST_TYPE_COLORS[request.requestType] || "#3B82F6";

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.cancelBtnText, { color: colors.muted }]}>Close</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Review Request</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
          {/* Employee info */}
          <View style={[styles.reviewInfoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.reviewEmployee, { color: colors.foreground }]}>{request.userName}</Text>
            <View style={[styles.typeBadge, { backgroundColor: typeColor + "20", borderColor: typeColor }]}>
              <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                {request.requestType.charAt(0).toUpperCase() + request.requestType.slice(1)}
              </Text>
            </View>
          </View>

          {/* Request details */}
          <View style={[styles.reviewInfoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.reviewRow}>
              <Text style={[styles.reviewRowLabel, { color: colors.muted }]}>Dates</Text>
              <Text style={[styles.reviewRowValue, { color: colors.foreground }]}>
                {formatDate(request.startDate)}{request.startDate !== request.endDate ? ` – ${formatDate(request.endDate)}` : ""}
              </Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={[styles.reviewRowLabel, { color: colors.muted }]}>Duration</Text>
              <Text style={[styles.reviewRowValue, { color: colors.foreground }]}>
                {parseFloat(String(request.totalDays ?? "0")).toFixed(1)} days
                {request.totalHours ? ` (${parseFloat(String(request.totalHours)).toFixed(1)} hrs)` : ""}
              </Text>
            </View>
            {request.periodYear && (
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewRowLabel, { color: colors.muted }]}>Period</Text>
                <Text style={[styles.reviewRowValue, { color: colors.foreground }]}>{request.periodYear}</Text>
              </View>
            )}
            {request.reason && (
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewRowLabel, { color: colors.muted }]}>Reason</Text>
                <Text style={[styles.reviewRowValue, { color: colors.foreground }]}>{request.reason}</Text>
              </View>
            )}
          </View>

          {request.status === "pending" && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.muted }]}>REVIEW NOTES (optional)</Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                  value={reviewNotes}
                  onChangeText={setReviewNotes}
                  placeholder="Add a note for the employee..."
                  placeholderTextColor={colors.muted}
                  multiline
                  numberOfLines={3}
                  returnKeyType="done"
                />
              </View>
              <View style={styles.reviewBtnRow}>
                <TouchableOpacity
                  style={[styles.reviewBtn, { backgroundColor: "#22C55E" }]}
                  onPress={() => review.mutate({ id: request.id, status: "approved", reviewNotes: reviewNotes || undefined })}
                  disabled={review.isPending}
                >
                  {review.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.reviewBtnText}>Approve</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.reviewBtn, { backgroundColor: "#EF4444" }]}
                  onPress={() => review.mutate({ id: request.id, status: "denied", reviewNotes: reviewNotes || undefined })}
                  disabled={review.isPending}
                >
                  {review.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.reviewBtnText}>Deny</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}

          {request.status !== "pending" && (
            <View style={[styles.alreadyReviewed, { backgroundColor: STATUS_COLORS[request.status] + "20", borderColor: STATUS_COLORS[request.status] }]}>
              <Text style={[styles.alreadyReviewedText, { color: STATUS_COLORS[request.status] }]}>
                This request has been {request.status.toUpperCase()}
              </Text>
              {request.reviewNotes && (
                <Text style={[styles.alreadyReviewedNote, { color: colors.muted }]}>Note: {request.reviewNotes}</Text>
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Employee Row (with inline PTO policy) ────────────────────────────────────

function EmployeeRow({
  employee,
  onEditPolicy,
  onViewRequests,
  colors,
}: {
  employee: any;
  onEditPolicy: (employee: any) => void;
  onViewRequests: (userId: number, userName: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const { data: policy } = trpc.timeOff.getPolicyForUser.useQuery({ userId: employee.id });
  const { data: usedData } = trpc.timeOff.getUserUsedDays.useQuery({ userId: employee.id });

  const totalDays = parseFloat(String(policy?.totalDaysAllowed ?? "0"));
  const usedDays = usedData?.usedDays ?? 0;
  const remaining = Math.max(0, totalDays - usedDays);
  const pct = totalDays > 0 ? Math.min(1, usedDays / totalDays) : 0;
  const barColor = pct > 0.8 ? "#EF4444" : pct > 0.5 ? "#F59E0B" : "#22C55E";
  const displayName = employee.name || employee.email || `User #${employee.id}`;

  return (
    <View style={[styles.employeeRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.employeeInfo}>
        <Text style={[styles.employeeName, { color: colors.foreground }]}>{displayName}</Text>
        {policy ? (
          <>
            <Text style={[styles.employeeMeta, { color: colors.muted }]}>
              {remaining.toFixed(1)} / {totalDays.toFixed(1)} days remaining
            </Text>
            {policy.periodStartDate && policy.periodEndDate && (
              <Text style={[styles.employeePeriod, { color: colors.muted }]}>
                {formatDate(policy.periodStartDate)} – {formatDate(policy.periodEndDate)}
              </Text>
            )}
            {/* Progress bar */}
            <View style={[styles.miniProgressTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.miniProgressFill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
            </View>
          </>
        ) : (
          <Text style={[styles.employeeMeta, { color: colors.muted }]}>No PTO policy configured</Text>
        )}
      </View>

      <View style={styles.employeeActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: colors.border }]}
          onPress={() => onViewRequests(employee.id, displayName)}
        >
          <Text style={[styles.actionBtnText, { color: colors.primary }]}>Requests</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: "#3B82F6", backgroundColor: "#3B82F610" }]}
          onPress={() => onEditPolicy({ ...policy, userId: employee.id, userName: displayName })}
        >
          <Text style={[styles.actionBtnText, { color: "#3B82F6" }]}>{policy ? "Edit PTO" : "Set PTO"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Admin Dashboard ─────────────────────────────────────────────────────

export default function TimeOffAdminScreen() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<"employees" | "pending" | "all">("pending");
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const [reviewingRequest, setReviewingRequest] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<{ id: number; name: string } | null>(null);
  const [filterPeriod, setFilterPeriod] = useState("");

  const utils = trpc.useUtils();

  const deleteRequest = trpc.timeOff.deleteRequest.useMutation({
    onSuccess: () => utils.timeOff.getAllRequests.invalidate(),
    onError: (err) => Alert.alert("Error", err.message),
  });

  const handleDeleteRequest = useCallback((req: any) => {
    Alert.alert(
      "Delete Request",
      `Delete ${req.userName}'s ${req.requestType} request? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteRequest.mutate({ id: req.id }),
        },
      ]
    );
  }, [deleteRequest]);

  // Use listEmployees to get only users marked as employees
  const { data: employees = [], isLoading: employeesLoading } = trpc.users.listEmployees.useQuery();
  const { data: allRequests = [], isLoading: requestsLoading } = trpc.timeOff.getAllRequests.useQuery(
    selectedUser
      ? { userId: selectedUser.id, periodYear: filterPeriod || undefined }
      : { periodYear: filterPeriod || undefined }
  );

  const pendingRequests = allRequests.filter((r: any) => r.status === "pending");

  // Collect available period years
  const availablePeriods = Array.from(new Set(allRequests.map((r: any) => r.periodYear).filter(Boolean))) as string[];

  const handleViewRequests = useCallback((userId: number, userName: string) => {
    setSelectedUser({ id: userId, name: userName });
    setActiveTab("all");
  }, []);

  const displayedRequests = activeTab === "pending" ? pendingRequests : allRequests;

  return (
    <ScreenContainer>
      <Stack.Screen options={{ title: "Time Off Admin", headerBackTitle: "Back" }} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Summary Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: "#F59E0B20", borderColor: "#F59E0B40" }]}>
            <Text style={[styles.statNum, { color: "#F59E0B" }]}>{pendingRequests.length}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Pending</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#22C55E20", borderColor: "#22C55E40" }]}>
            <Text style={[styles.statNum, { color: "#22C55E" }]}>
              {allRequests.filter((r: any) => r.status === "approved").length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Approved</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#3B82F620", borderColor: "#3B82F640" }]}>
            <Text style={[styles.statNum, { color: "#3B82F6" }]}>{employees.length}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Employees</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { borderColor: colors.border }]}>
          {(["pending", "employees", "all"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && { borderBottomColor: "#3B82F6", borderBottomWidth: 2 }]}
              onPress={() => { setActiveTab(tab); if (tab !== "all") setSelectedUser(null); }}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? "#3B82F6" : colors.muted }]}>
                {tab === "pending"
                  ? `Pending (${pendingRequests.length})`
                  : tab === "employees"
                  ? `Employees (${employees.length})`
                  : selectedUser
                  ? `${selectedUser.name}'s Requests`
                  : "All Requests"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Employees Tab */}
        {activeTab === "employees" && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>EMPLOYEE PTO OVERVIEW</Text>
            {employeesLoading ? (
              <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
            ) : employees.length === 0 ? (
              <View style={[styles.emptyState, { borderColor: colors.border }]}>
                <Text style={[styles.emptyText, { color: colors.muted }]}>No employees configured yet.</Text>
                <Text style={[styles.emptySubText, { color: colors.muted }]}>
                  Mark users as "Employee" in User Management to see them here.
                </Text>
              </View>
            ) : (
              employees.map((emp: any) => (
                <EmployeeRow
                  key={emp.id}
                  employee={emp}
                  onEditPolicy={setEditingPolicy}
                  onViewRequests={handleViewRequests}
                  colors={colors}
                />
              ))
            )}
          </>
        )}

        {/* Pending / All Requests Tabs */}
        {(activeTab === "pending" || activeTab === "all") && (
          <>
            {/* Period filter */}
            {availablePeriods.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={[styles.sectionLabel, { color: colors.muted }]}>FILTER BY PERIOD</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[styles.filterChip, { borderColor: !filterPeriod ? "#3B82F6" : colors.border, backgroundColor: !filterPeriod ? "#3B82F620" : "transparent" }]}
                    onPress={() => setFilterPeriod("")}
                  >
                    <Text style={[styles.filterChipText, { color: !filterPeriod ? "#3B82F6" : colors.muted }]}>All</Text>
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

            {selectedUser && (
              <View style={[styles.userFilterBanner, { backgroundColor: "#3B82F620", borderColor: "#3B82F640" }]}>
                <Text style={{ color: "#3B82F6", fontSize: 14, fontWeight: "600" }}>
                  Showing: {selectedUser.name}
                </Text>
                <TouchableOpacity onPress={() => setSelectedUser(null)}>
                  <Text style={{ color: "#3B82F6", fontSize: 13, fontWeight: "700" }}>✕ Clear</Text>
                </TouchableOpacity>
              </View>
            )}

            {requestsLoading ? (
              <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
            ) : displayedRequests.length === 0 ? (
              <View style={[styles.emptyState, { borderColor: colors.border }]}>
                <Text style={[styles.emptyText, { color: colors.muted }]}>
                  {activeTab === "pending" ? "No pending requests." : "No requests found."}
                </Text>
              </View>
            ) : (
              displayedRequests.map((req: any) => {
                const typeColor = REQUEST_TYPE_COLORS[req.requestType] || "#3B82F6";
                const statusColor = STATUS_COLORS[req.status] || "#9CA3AF";
                return (
                  <View key={req.id} style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.requestCardHeader}>
                      <Text style={[styles.requestEmployee, { color: colors.foreground }]}>{req.userName}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{req.status.toUpperCase()}</Text>
                      </View>
                    </View>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => setReviewingRequest(req)}>
                      <View style={styles.requestCardRow}>
                        <View style={[styles.typeBadge, { backgroundColor: typeColor + "20", borderColor: typeColor }]}>
                          <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                            {req.requestType.charAt(0).toUpperCase() + req.requestType.slice(1)}
                          </Text>
                        </View>
                        <Text style={[styles.requestDates, { color: colors.muted }]}>
                          {formatDate(req.startDate)}{req.startDate !== req.endDate ? ` – ${formatDate(req.endDate)}` : ""}
                        </Text>
                      </View>
                      <Text style={[styles.requestDuration, { color: colors.muted }]}>
                        {parseFloat(String(req.totalDays ?? "0")).toFixed(1)} days
                        {req.periodYear ? ` · ${req.periodYear}` : ""}
                      </Text>
                      {req.reason ? (
                        <Text style={[styles.requestReason, { color: colors.muted }]} numberOfLines={1}>{req.reason}</Text>
                      ) : null}
                      {req.status === "pending" && (
                        <Text style={{ color: "#3B82F6", fontSize: 13, fontWeight: "600", marginTop: 6 }}>Tap to review →</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteRequest(req)}
                      style={{ padding: 8, alignSelf: "flex-end", marginTop: 4 }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={{ color: "#EF4444", fontSize: 18 }}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Policy Modal */}
      {editingPolicy && (
        <EditPolicyModal
          visible={!!editingPolicy}
          user={{ id: editingPolicy.userId, name: editingPolicy.userName }}
          policy={editingPolicy}
          onClose={() => setEditingPolicy(null)}
          onSaved={() => setEditingPolicy(null)}
          colors={colors}
        />
      )}

      {/* Review Request Modal */}
      {reviewingRequest && (
        <ReviewModal
          visible={!!reviewingRequest}
          request={reviewingRequest}
          onClose={() => setReviewingRequest(null)}
          onReviewed={() => setReviewingRequest(null)}
          colors={colors}
        />
      )}
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  statNum: { fontSize: 28, fontWeight: "800" },
  statLabel: { fontSize: 12, marginTop: 2 },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabText: { fontSize: 13, fontWeight: "600" },
  sectionLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5, marginBottom: 8 },
  filterSection: { marginBottom: 12 },
  filterChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
  },
  filterChipText: { fontSize: 13, fontWeight: "500" },
  userFilterBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  employeeRow: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  employeeInfo: { flex: 1 },
  employeeName: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  employeeMeta: { fontSize: 13, marginBottom: 2 },
  employeePeriod: { fontSize: 12, marginBottom: 6 },
  miniProgressTrack: { height: 6, borderRadius: 3, overflow: "hidden", marginTop: 4 },
  miniProgressFill: { height: 6, borderRadius: 3 },
  employeeActions: { gap: 6, marginLeft: 12 },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
  },
  actionBtnText: { fontSize: 13, fontWeight: "600" },
  requestCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  requestCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  requestEmployee: { fontSize: 16, fontWeight: "700" },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
  requestCardRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  typeBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontSize: 12, fontWeight: "600" },
  requestDates: { fontSize: 13 },
  requestDuration: { fontSize: 13 },
  requestReason: { fontSize: 13, fontStyle: "italic", marginTop: 4 },
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
  cancelBtnText: { fontSize: 16 },
  modalBody: { flex: 1, padding: 16 },
  policyUserName: { fontSize: 20, fontWeight: "800", marginBottom: 20 },
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
    minHeight: 90,
    textAlignVertical: "top",
  },
  reviewInfoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  reviewEmployee: { fontSize: 18, fontWeight: "700" },
  reviewRow: { flexDirection: "row", gap: 12 },
  reviewRowLabel: { fontSize: 13, width: 70 },
  reviewRowValue: { fontSize: 13, fontWeight: "500", flex: 1 },
  reviewBtnRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  reviewBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  reviewBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  alreadyReviewed: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  alreadyReviewedText: { fontSize: 16, fontWeight: "700" },
  alreadyReviewedNote: { fontSize: 13, marginTop: 6, textAlign: "center" },
  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
});
