import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

interface Checklist {
  id: number;
  projectName: string | null;
  projectAddress: string | null;
  meetingDate: string | null;
  supervisorName: string | null;
  status: string;
  archived: boolean;
  archivedAt: string | null;
  archivedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_OPTIONS = ["all", "draft", "completed", "signed"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

function statusColor(status: string, colors: any) {
  if (status === "signed") return colors.success;
  if (status === "completed") return colors.primary;
  return colors.warning;
}

function statusLabel(status: string) {
  if (status === "signed") return "Signed";
  if (status === "completed") return "Completed";
  return "Draft";
}

export function PreconDashboardContent() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === "admin" || user?.role === "manager";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [supervisorFilter, setSupervisorFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [pdfLoadingId, setPdfLoadingId] = useState<number | null>(null);
  const [archiveLoadingId, setArchiveLoadingId] = useState<number | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);

  const { data: checklists = [], isLoading, refetch } = trpc.precon.listAll.useQuery({
    includeArchived: showArchived,
  });

  const generatePdfMutation = trpc.precon.generatePdf.useMutation();
  const archiveMutation = trpc.precon.archive.useMutation();
  const unarchiveMutation = trpc.precon.unarchive.useMutation();
  const deleteMutation = trpc.precon.delete.useMutation();

  // Collect unique supervisor names for filter
  const supervisorNames = Array.from(
    new Set((checklists as Checklist[]).map((c) => c.supervisorName).filter(Boolean))
  ) as string[];

  const filtered = (checklists as Checklist[]).filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (c.projectName ?? "").toLowerCase().includes(q) ||
      (c.supervisorName ?? "").toLowerCase().includes(q) ||
      (c.projectAddress ?? "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesSupervisor = !supervisorFilter || c.supervisorName === supervisorFilter;
    const matchesArchived = showArchived ? c.archived : !c.archived;
    return matchesSearch && matchesStatus && matchesSupervisor && matchesArchived;
  });

  const handleGeneratePdf = async (item: Checklist) => {
    setPdfLoadingId(item.id);
    try {
      const result = await generatePdfMutation.mutateAsync({ id: item.id });
      const pdfUrl = `data:application/pdf;base64,${result.base64}`;
      if (Platform.OS === "web") {
        const link = document.createElement("a");
        link.href = pdfUrl;
        link.download = `precon-${item.projectName || item.id}.pdf`;
        link.click();
      } else {
        Alert.alert("PDF Ready", `PDF generated for "${item.projectName}".`);
      }
    } catch (err: any) {
      Alert.alert("PDF Error", err.message ?? "Could not generate PDF.");
    } finally {
      setPdfLoadingId(null);
    }
  };

  const handleArchive = async (item: Checklist) => {
    const doArchive = async () => {
      setArchiveLoadingId(item.id);
      try {
        await archiveMutation.mutateAsync({ id: item.id });
        refetch();
      } catch (err: any) {
        Alert.alert("Error", err.message);
      } finally {
        setArchiveLoadingId(null);
      }
    };
    if (Platform.OS === "web") {
      if (window.confirm(`Archive "${item.projectName || "this checklist"}"?`)) doArchive();
    } else {
      Alert.alert("Archive Checklist", `Archive "${item.projectName || "this checklist"}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Archive", onPress: doArchive },
      ]);
    }
  };

  const handleUnarchive = async (item: Checklist) => {
    setArchiveLoadingId(item.id);
    try {
      await unarchiveMutation.mutateAsync({ id: item.id });
      refetch();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setArchiveLoadingId(null);
    }
  };

  const handleDelete = async (item: Checklist) => {
    const doDelete = async () => {
      setDeleteLoadingId(item.id);
      try {
        await deleteMutation.mutateAsync({ id: item.id });
        refetch();
      } catch (err: any) {
        Alert.alert("Error", err.message);
      } finally {
        setDeleteLoadingId(null);
      }
    };
    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${item.projectName || "this checklist"}"? This cannot be undone.`)) doDelete();
    } else {
      Alert.alert("Delete Checklist", `Delete "${item.projectName || "this checklist"}"? This cannot be undone.`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const renderItem = ({ item }: { item: Checklist }) => {
    const sc = statusColor(item.status, colors);
    const isGeneratingPdf = pdfLoadingId === item.id;
    const isArchiving = archiveLoadingId === item.id;
    const isDeleting = deleteLoadingId === item.id;
    const openDetail = () =>
      router.push({ pathname: "/(tabs)/modules/precon/detail", params: { id: String(item.id) } });

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Left status stripe */}
        <View style={[styles.statusStripe, { backgroundColor: item.archived ? colors.muted : sc }]} />

        <View style={{ flex: 1 }}>
          {/* Tappable header */}
          <TouchableOpacity style={styles.cardBody} onPress={openDetail} activeOpacity={0.8}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {item.projectName || "Untitled Project"}
                </Text>
                {item.projectAddress ? (
                  <Text style={[styles.cardAddress, { color: colors.muted }]} numberOfLines={1}>
                    {item.projectAddress}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.statusPill, { backgroundColor: (item.archived ? colors.muted : sc) + "20" }]}>
                <Text style={[styles.statusPillText, { color: item.archived ? colors.muted : sc }]}>
                  {item.archived ? "Archived" : statusLabel(item.status)}
                </Text>
              </View>
            </View>
            <View style={styles.cardMeta}>
              <Text style={[styles.metaText, { color: colors.muted }]}>
                👤 {item.supervisorName || "—"}
              </Text>
              <Text style={[styles.metaText, { color: colors.muted }]}>
                📅 {item.meetingDate || new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </Text>
            </View>
            {item.archived && item.archivedByName ? (
              <Text style={[styles.archivedNote, { color: colors.muted }]}>
                Archived by {item.archivedByName}
              </Text>
            ) : null}
          </TouchableOpacity>

          {/* Action buttons */}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.primary }]}
              onPress={openDetail}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Open</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.muted }]}
              onPress={() => handleGeneratePdf(item)}
              disabled={isGeneratingPdf}
              activeOpacity={0.7}
            >
              {isGeneratingPdf ? (
                <ActivityIndicator size="small" color={colors.muted} />
              ) : (
                <Text style={[styles.actionBtnText, { color: colors.muted }]}>⬇ PDF</Text>
              )}
            </TouchableOpacity>
            {isManagerOrAdmin && (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: item.archived ? colors.success + "80" : colors.warning + "80" }]}
                  onPress={() => item.archived ? handleUnarchive(item) : handleArchive(item)}
                  disabled={isArchiving}
                  activeOpacity={0.7}
                >
                  {isArchiving ? (
                    <ActivityIndicator size="small" color={colors.muted} />
                  ) : (
                    <Text style={[styles.actionBtnText, { color: item.archived ? colors.success : colors.warning }]}>
                      {item.archived ? "Unarchive" : "Archive"}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: colors.error + "80" }]}
                  onPress={() => handleDelete(item)}
                  disabled={isDeleting}
                  activeOpacity={0.7}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <Text style={[styles.actionBtnText, { color: colors.error }]}>Delete</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Header with New Checklist button */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Preconstruction Checklists</Text>
        <TouchableOpacity
          style={[styles.newButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(tabs)/modules/precon/detail?isNew=true")}
          activeOpacity={0.7}
        >
          <Text style={[styles.newButtonText, { color: colors.background }]}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by project, supervisor, address..."
          placeholderTextColor={colors.muted}
          returnKeyType="search"
        />
      </View>

      {/* Filters row */}
      <View style={[styles.filtersRow, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        {/* Status filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
          {STATUS_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.chip,
                {
                  backgroundColor: statusFilter === s ? colors.primary : colors.surface,
                  borderColor: statusFilter === s ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setStatusFilter(s)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, { color: statusFilter === s ? colors.background : colors.muted }]}>
                {s === "all" ? "All Status" : statusLabel(s)}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Supervisor filter */}
          {supervisorNames.length > 0 && (
            <>
              <View style={[styles.chipDivider, { backgroundColor: colors.border }]} />
              <TouchableOpacity
                style={[
                  styles.chip,
                  {
                    backgroundColor: !supervisorFilter ? colors.primary : colors.surface,
                    borderColor: !supervisorFilter ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSupervisorFilter("")}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, { color: !supervisorFilter ? colors.background : colors.muted }]}>
                  All Supervisors
                </Text>
              </TouchableOpacity>
              {supervisorNames.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: supervisorFilter === name ? colors.primary : colors.surface,
                      borderColor: supervisorFilter === name ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSupervisorFilter(supervisorFilter === name ? "" : name)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, { color: supervisorFilter === name ? colors.background : colors.muted }]}>
                    {name.split(" ")[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Archive toggle */}
          {isManagerOrAdmin && (
            <>
              <View style={[styles.chipDivider, { backgroundColor: colors.border }]} />
              <TouchableOpacity
                style={[
                  styles.chip,
                  {
                    backgroundColor: showArchived ? colors.warning : colors.surface,
                    borderColor: showArchived ? colors.warning : colors.border,
                  },
                ]}
                onPress={() => setShowArchived(!showArchived)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, { color: showArchived ? "#fff" : colors.muted }]}>
                  📦 {showArchived ? "Archived" : "Archive"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyIcon, { color: colors.muted }]}>📋</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {showArchived ? "No archived checklists" : search || statusFilter !== "all" || supervisorFilter ? "No results found" : "No checklists yet"}
          </Text>
          <Text style={[styles.emptyHint, { color: colors.muted }]}>
            {showArchived ? "Archived checklists will appear here" : "Try adjusting your filters"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  newButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  newButtonText: { fontSize: 13, fontWeight: "600" },
  searchBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  searchInput: { fontSize: 14 },
  filtersRow: { borderBottomWidth: StyleSheet.hairlineWidth },
  filterChips: { paddingHorizontal: 12, paddingVertical: 8, gap: 6, alignItems: "center" },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: "600" },
  chipDivider: { width: 1, height: 20, marginHorizontal: 2 },
  listContent: { padding: 12, gap: 10, paddingBottom: 40 },
  card: { borderRadius: 12, borderWidth: 1, flexDirection: "row", overflow: "hidden" },
  statusStripe: { width: 4 },
  cardBody: { flex: 1, padding: 12, gap: 8 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "700", lineHeight: 20 },
  cardAddress: { fontSize: 12, marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusPillText: { fontSize: 11, fontWeight: "700" },
  cardMeta: { flexDirection: "row", gap: 16 },
  metaText: { fontSize: 12 },
  archivedNote: { fontSize: 11, fontStyle: "italic" },
  cardActions: { flexDirection: "row", gap: 8, marginTop: 4, paddingHorizontal: 12, paddingBottom: 10, flexWrap: "wrap" },
  actionBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5, minWidth: 52, alignItems: "center" },
  actionBtnText: { fontSize: 12, fontWeight: "600" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32, paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyHint: { fontSize: 13, textAlign: "center" },
});
