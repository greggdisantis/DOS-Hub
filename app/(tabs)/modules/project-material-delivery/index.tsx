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
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { ChecklistStatus, STATUS_LABELS, STATUS_COLORS, ProjectMaterialChecklist } from "./types";

const STATUS_ORDER: ChecklistStatus[] = [
  "draft",
  "ready_for_supervisor",
  "awaiting_main_office",
  "awaiting_warehouse",
  "final_review",
  "complete",
  "closed",
];

export default function ProjectMaterialDeliveryScreen() {
  const colors = useColors();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ChecklistStatus | "all">("all");

  const { data: checklists, isLoading, refetch } = trpc.projectMaterial.list.useQuery(undefined, {
    refetchOnMount: true,
  });

  const { data: me } = trpc.auth.me.useQuery();
  const canCreate = me?.role === "admin" || me?.role === "manager";

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filtered = (checklists ?? []).filter((c: any) =>
    filterStatus === "all" ? true : c.status === filterStatus,
  );

  const renderStatusBadge = (status: string) => {
    const s = status as ChecklistStatus;
    const label = STATUS_LABELS[s] ?? status;
    const color = STATUS_COLORS[s] ?? "#6B7280";
    return (
      <View style={[styles.badge, { backgroundColor: color + "22", borderColor: color }]}>
        <Text style={[styles.badgeText, { color }]}>{label}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => (
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
        {renderStatusBadge(item.status)}
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
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Material Delivery</Text>
        {canCreate && (
          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)/modules/project-material-delivery/new")}
            activeOpacity={0.8}
          >
            <Text style={styles.newBtnText}>+ New</Text>
          </TouchableOpacity>
        )}
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
                    backgroundColor: isActive ? color + "22" : "transparent",
                    borderColor: isActive ? color : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, { color: isActive ? color : colors.muted }]}>
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
            {filterStatus === "all"
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  meta: {
    fontSize: 13,
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
});
