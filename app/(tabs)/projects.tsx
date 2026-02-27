import { useState, useMemo } from "react";
import { FlatList, Text, View, Pressable, TextInput, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

type ProjectStatus = "active" | "completed" | "on_hold";

type ProjectItem = {
  id: string;
  name: string;
  address: string;
  status: ProjectStatus;
  customer: string;
  lastUpdated: string;
};

const STATUS_CONFIG: Record<ProjectStatus, { label: string; colorKey: string }> = {
  active: { label: "Active", colorKey: "success" },
  completed: { label: "Completed", colorKey: "primary" },
  on_hold: { label: "On Hold", colorKey: "warning" },
};

const SAMPLE_PROJECTS: ProjectItem[] = [];

export default function ProjectsScreen() {
  const colors = useColors();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ProjectStatus | "all">("all");

  const filteredProjects = useMemo(() => {
    let result = SAMPLE_PROJECTS;
    if (activeFilter !== "all") {
      result = result.filter((p) => p.status === activeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          p.customer.toLowerCase().includes(q)
      );
    }
    return result;
  }, [search, activeFilter]);

  const filters: Array<{ key: ProjectStatus | "all"; label: string }> = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
    { key: "on_hold", label: "On Hold" },
  ];

  return (
    <ScreenContainer>
      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-3xl font-bold text-foreground">Projects</Text>
        <Text className="text-sm text-muted mt-1">Track and manage all your projects</Text>
      </View>

      {/* Search Bar */}
      <View className="px-5 mt-3">
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
          <TextInput
            placeholder="Search projects..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.foreground }]}
            returnKeyType="done"
          />
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow} className="px-5 mt-3 mb-2">
        {filters.map((f) => {
          const isActive = activeFilter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setActiveFilter(f.key)}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  backgroundColor: isActive ? colors.primary : colors.surface,
                  borderColor: isActive ? colors.primary : colors.border,
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: isActive ? "#FFFFFF" : colors.muted,
                }}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filteredProjects.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <IconSymbol name="folder.fill" size={48} color={colors.muted} />
          <Text className="text-lg font-semibold text-muted mt-4">No Projects Yet</Text>
          <Text className="text-sm text-muted mt-1 text-center">
            Projects will appear here as you create them through the various modules.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProjects}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const statusConf = STATUS_CONFIG[item.status];
            const statusColor = (colors as any)[statusConf.colorKey] || colors.muted;
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.projectCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={styles.projectHeader}>
                  <Text className="text-base font-semibold text-foreground flex-1" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: statusColor }}>
                      {statusConf.label}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-muted mt-1" numberOfLines={1}>{item.address}</Text>
                <View style={styles.projectFooter}>
                  <Text className="text-xs text-muted">{item.customer}</Text>
                  <Text className="text-xs text-muted">{item.lastUpdated}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  projectCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  projectHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  projectFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
});
