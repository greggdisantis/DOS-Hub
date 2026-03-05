import { useState, useMemo } from "react";
import { FlatList, Text, View, Pressable, TextInput, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

type ToolItem = {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  category: string;
};

// Category display order
const CATEGORY_ORDER = ["Utilities", "Sales", "Training", "Administration"];

const ALL_TOOLS: ToolItem[] = [
  // Utilities
  {
    id: "screen-ordering",
    title: "Motorized Screens",
    description: "Configure and order motorized screens with structural calculations.",
    icon: "rectangle.grid.2x2.fill",
    route: "/modules/screen-ordering",
    color: "#F59E0B",
    category: "Utilities",
  },
  {
    id: "job-intelligence",
    title: "Job Intelligence",
    description: "Service Fusion open jobs readiness engine and project tracking.",
    icon: "chart.bar.fill",
    route: "/modules/job-intelligence",
    color: "#3B82F6",
    category: "Utilities",
  },
  {
    id: "project-material-delivery",
    title: "Material Delivery",
    description: "Create and track project material checklists from warehouse to job site.",
    icon: "shippingbox.fill",
    route: "/modules/project-material-delivery",
    color: "#7C3AED",
    category: "Utilities",
  },
  {
    id: "precon-checklist",
    title: "Preconstruction Checklist",
    description: "Digital pre-construction meeting forms. Supervisors complete and clients sign off on-site.",
    icon: "checklist",
    route: "/modules/precon",
    color: "#1E3A5F",
    category: "Utilities",
  },
  {
    id: "receipt-capture",
    title: "Receipt Capture",
    description: "AI-powered expense tracking. Scan receipts and extract data automatically.",
    icon: "receipt",
    route: "/modules/receipt-capture",
    color: "#10B981",
    category: "Utilities",
  },
  {
    id: "aquaclean-receipt-capture",
    title: "AquaClean Receipt Capture",
    description: "AquaClean-specific expense receipt capture, tracking, and reporting.",
    icon: "receipt",
    route: "/modules/aquaclean-receipt-capture",
    color: "#0EA5E9",
    category: "Utilities",
  },
  {
    id: "zoning-lookup",
    title: "Zoning Lookup",
    description: "Property jurisdiction, zoning, and permit research for PA and NJ.",
    icon: "map.fill",
    route: "/modules/zoning-lookup",
    color: "#6366F1",
    category: "Utilities",
  },
  // Sales
  {
    id: "client-meeting-report",
    title: "My Client Meeting Reports",
    description: "Post-meeting reports with deal status, purchase confidence, and next steps.",
    icon: "doc.text.fill",
    route: "/modules/client-meeting-report",
    color: "#10B981",
    category: "Sales",
  },
  {
    id: "sales-pipeline",
    title: "Sales Pipeline",
    description: "Track estimated contract values, purchase confidence, and close outcomes for all active clients.",
    icon: "chart.bar.fill",
    route: "/modules/sales-pipeline",
    color: "#059669",
    category: "Sales",
  },
  // Training
  {
    id: "training",
    title: "Training Hub",
    description: "Access training modules, courses, and certification materials.",
    icon: "book.fill",
    route: "/modules/training",
    color: "#8B5CF6",
    category: "Training",
  },
  // Administration
  {
    id: "time-off",
    title: "Time Off",
    description: "Request paid time off, view your PTO balance, and track approvals.",
    icon: "calendar",
    route: "/modules/time-off",
    color: "#22C55E",
    category: "Administration",
  },
  {
    id: "time-off-admin",
    title: "Time Off Admin",
    description: "Manager dashboard: review, approve, or deny employee time off requests.",
    icon: "calendar",
    route: "/modules/time-off-admin",
    color: "#8B5CF6",
    category: "Administration",
  },
  {
    id: "hubspot",
    title: "HubSpot CRM",
    description: "Search deals, attach documents, and manage customer records.",
    icon: "link",
    route: "/modules/hubspot",
    color: "#EF4444",
    category: "Administration",
  },
  {
    id: "admin-users",
    title: "User Management",
    description: "Approve new users, assign system roles, job roles, and module permissions.",
    icon: "person.2.fill",
    route: "/modules/admin-users",
    color: "#6B7280",
    category: "Administration",
  },
];

export default function ToolsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filteredTools = useMemo(() => {
    if (!search.trim()) return ALL_TOOLS;
    const q = search.toLowerCase();
    return ALL_TOOLS.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [search]);

  const categories = useMemo(() => {
    const presentCats = [...new Set(filteredTools.map((t) => t.category))];
    // Sort by the defined order
    const ordered = CATEGORY_ORDER.filter((c) => presentCats.includes(c));
    return ordered.map((cat) => ({
      category: cat,
      tools: filteredTools.filter((t) => t.category === cat),
    }));
  }, [filteredTools]);

  return (
    <ScreenContainer>
      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-3xl font-bold text-foreground">Tools</Text>
        <Text className="text-sm text-muted mt-1">All available modules and utilities</Text>
      </View>

      {/* Search Bar */}
      <View className="px-5 mt-3 mb-2">
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
          <TextInput
            placeholder="Search tools..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.foreground }]}
            returnKeyType="done"
          />
        </View>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.category}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: section }) => (
          <View className="mt-4">
            <Text className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              {section.category}
            </Text>
            {section.tools.map((tool) => (
              <Pressable
                key={tool.id}
                onPress={() => router.push(tool.route as any)}
                style={({ pressed }) => [
                  styles.toolRow,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={[styles.toolIcon, { backgroundColor: tool.color + "18" }]}>
                  <IconSymbol name={tool.icon as any} size={22} color={tool.color} />
                </View>
                <View style={styles.toolText}>
                  <Text className="text-base font-semibold text-foreground">{tool.title}</Text>
                  <Text className="text-xs text-muted mt-0.5" numberOfLines={2}>
                    {tool.description}
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        )}
      />
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
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 14,
  },
  toolIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  toolText: {
    flex: 1,
  },
});
