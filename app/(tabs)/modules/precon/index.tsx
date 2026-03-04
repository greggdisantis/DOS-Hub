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
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

interface Checklist {
  id: number;
  projectName: string | null;
  projectAddress: string | null;
  meetingDate: string | null;
  supervisorName: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

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

export default function PreconListScreen() {
  const router = useRouter();
  const colors = useColors();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [pdfLoadingId, setPdfLoadingId] = useState<number | null>(null);

  const { data: checklists = [], isLoading, refetch } = trpc.precon.list.useQuery();
  const createMutation = trpc.precon.create.useMutation();
  const deleteMutation = trpc.precon.delete.useMutation();
  const generatePdfMutation = trpc.precon.generatePdf.useMutation();

  const filtered = checklists.filter((c: Checklist) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (c.projectName ?? "").toLowerCase().includes(q) ||
      (c.supervisorName ?? "").toLowerCase().includes(q) ||
      (c.projectAddress ?? "").toLowerCase().includes(q)
    );
  });

  const handleCreate = async () => {
    if (!newProjectName.trim()) {
      Alert.alert("Project Name Required", "Please enter a project name.");
      return;
    }
    setCreating(true);
    try {
      const result = await createMutation.mutateAsync({ projectName: newProjectName.trim() });
      setNewProjectName("");
      setShowNewForm(false);
      await refetch();
      router.push({
        pathname: "/(tabs)/modules/precon/detail",
        params: { id: String(result.id) },
      });
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not create checklist.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (item: Checklist) => {
    const doDelete = async () => {
      try {
        await deleteMutation.mutateAsync({ id: item.id });
        refetch();
      } catch (err: any) {
        Alert.alert("Error", err.message);
      }
    };
    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${item.projectName || "this checklist"}"?`)) doDelete();
    } else {
      Alert.alert("Delete Checklist", `Delete "${item.projectName || "this checklist"}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  };

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
        Alert.alert("PDF Ready", `PDF generated for "${item.projectName}".`, [{ text: "OK" }]);
      }
    } catch (err: any) {
      Alert.alert("PDF Error", err.message ?? "Could not generate PDF.");
    } finally {
      setPdfLoadingId(null);
    }
  };

  const renderItem = ({ item }: { item: Checklist }) => {
    const sc = statusColor(item.status, colors);
    const isGeneratingPdf = pdfLoadingId === item.id;
    const openDetail = () => router.push({ pathname: "/(tabs)/modules/precon/detail", params: { id: String(item.id) } });
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Left status stripe */}
        <View style={[styles.statusStripe, { backgroundColor: sc }]} />

        {/* Card content — tappable header area + action buttons below */}
        <View style={{ flex: 1 }}>
          {/* Tappable header: title, address, meta */}
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
              <View style={[styles.statusPill, { backgroundColor: sc + "20" }]}>
                <Text style={[styles.statusPillText, { color: sc }]}>{statusLabel(item.status)}</Text>
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
          </TouchableOpacity>

          {/* Action buttons — NOT nested inside the tappable area */}
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
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.error + "80" }]}
              onPress={() => handleDelete(item)}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionBtnText, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#1E3A5F" }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Pre-Construction Checklists</Text>
          <Text style={styles.headerSub}>Supervisor meeting forms</Text>
        </View>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: "rgba(255,255,255,0.2)" }]}
          onPress={() => setShowNewForm(!showNewForm)}
          activeOpacity={0.8}
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* New checklist form */}
      {showNewForm && (
        <View style={[styles.newForm, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.newFormLabel, { color: colors.foreground }]}>New Preconstruction Checklist</Text>
          <TextInput
            style={[styles.newFormInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={newProjectName}
            onChangeText={setNewProjectName}
            placeholder="Project name (required)"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            onSubmitEditing={handleCreate}
            autoFocus
          />
          <View style={styles.newFormButtons}>
            <TouchableOpacity
              style={[styles.newFormCancel, { borderColor: colors.border }]}
              onPress={() => { setShowNewForm(false); setNewProjectName(""); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.newFormCancelText, { color: colors.muted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.newFormCreate, { backgroundColor: colors.primary, opacity: creating ? 0.7 : 1 }]}
              onPress={handleCreate}
              disabled={creating}
              activeOpacity={0.8}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.newFormCreateText}>Create & Open</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

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

      {/* List */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyIcon, { color: colors.muted }]}>📋</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {search ? "No results found" : "No checklists yet"}
          </Text>
          <Text style={[styles.emptyHint, { color: colors.muted }]}>
            {search ? "Try a different search term" : 'Tap "+ New" to create your first preconstruction checklist'}
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 },
  newBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  newBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  newForm: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  newFormLabel: { fontSize: 14, fontWeight: "700" },
  newFormInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  newFormButtons: { flexDirection: "row", gap: 10 },
  newFormCancel: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  newFormCancelText: { fontSize: 14, fontWeight: "600" },
  newFormCreate: { flex: 2, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  newFormCreateText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  searchBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  searchInput: { fontSize: 14 },
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
  cardActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5, minWidth: 52, alignItems: "center" },
  actionBtnText: { fontSize: 12, fontWeight: "600" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyHint: { fontSize: 13, textAlign: "center" },
});
