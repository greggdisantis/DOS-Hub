import { ScrollView, Text, View, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

type ModuleCard = {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
};

type ModuleCategory = {
  label: string;
  modules: ModuleCard[];
};

const MODULE_CATEGORIES: ModuleCategory[] = [
  {
    label: "Utilities",
    modules: [
      {
        id: "screen-ordering",
        title: "Motorized Screens",
        description: "Motorized screen orders",
        icon: "rectangle.grid.2x2.fill",
        route: "/modules/screen-ordering",
        color: "#F59E0B",
      },
      {
        id: "job-intelligence",
        title: "Job Intelligence",
        description: "Service Fusion insights",
        icon: "chart.bar.fill",
        route: "/modules/job-intelligence",
        color: "#3B82F6",
      },
      {
        id: "project-material-delivery",
        title: "Material Delivery",
        description: "Project material checklists & warehouse tracking",
        icon: "shippingbox.fill",
        route: "/modules/project-material-delivery",
        color: "#7C3AED",
      },
      {
        id: "receipt-capture",
        title: "Receipt Capture",
        description: "Scan and track expenses",
        icon: "receipt",
        route: "/modules/receipt-capture",
        color: "#F59E0B",
      },
      {
        id: "zoning-lookup",
        title: "Zoning Lookup",
        description: "Property & permit research",
        icon: "map.fill",
        route: "/modules/zoning-lookup",
        color: "#6366F1",
      },
    ],
  },
  {
    label: "Sales",
    modules: [
      {
        id: "client-meeting-report",
        title: "My Client Meeting Reports",
        description: "Post-meeting reports & deal tracking",
        icon: "doc.text.fill",
        route: "/modules/client-meeting-report",
        color: "#10B981",
      },
      {
        id: "sales-pipeline",
        title: "Sales Pipeline",
        description: "Team pipeline & deal tracking",
        icon: "chart.line.uptrend.xyaxis",
        route: "/modules/sales-pipeline",
        color: "#0EA5E9",
      },
    ],
  },
  {
    label: "Training",
    modules: [
      {
        id: "training",
        title: "Training Hub",
        description: "Courses & certifications",
        icon: "book.fill",
        route: "/modules/training",
        color: "#8B5CF6",
      },
    ],
  },
  {
    label: "Administration",
    modules: [
      {
        id: "hubspot",
        title: "HubSpot CRM",
        description: "Deal & contact management",
        icon: "link",
        route: "/modules/hubspot",
        color: "#EF4444",
      },
    ],
  },
];

const QUICK_ACTIONS = [
  { id: "dashboard", label: "Dashboard", icon: "chart.bar.fill", route: "/modules/dashboard" },
  { id: "job-intelligence", label: "Job Intelligence", icon: "chart.bar.fill", route: "/modules/job-intelligence" },
  { id: "client-meeting-report", label: "CMR", icon: "doc.text.fill", route: "/modules/client-meeting-report" },
  { id: "material-delivery", label: "Material Delivery", icon: "shippingbox.fill", route: "/modules/project-material-delivery" },
];

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-sm text-muted">Welcome back</Text>
          <Text className="text-3xl font-bold text-foreground mt-1">DOS Hub</Text>
        </View>

        {/* Quick Actions */}
        <View className="px-5 mt-4">
          <Text className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            {QUICK_ACTIONS.map((action) => (
              <Pressable
                key={action.id}
                onPress={() => router.push(action.route as any)}
                style={({ pressed }) => [
                  styles.quickActionButton,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: colors.primary + "15" }]}>
                  <IconSymbol name={action.icon as any} size={20} color={colors.primary} />
                </View>
                <Text className="text-xs font-medium text-foreground mt-2 text-center" numberOfLines={2}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Categorized Module Sections */}
        {MODULE_CATEGORIES.map((category) => (
          <View key={category.label} className="px-5 mt-6">
            <Text className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              {category.label}
            </Text>
            <View style={styles.moduleGrid}>
              {category.modules.map((module) => (
                <Pressable
                  key={module.id}
                  onPress={() => router.push(module.route as any)}
                  style={({ pressed }) => [
                    styles.moduleCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
                  ]}
                >
                  <View style={[styles.moduleIconContainer, { backgroundColor: module.color + "18" }]}>
                    <IconSymbol name={module.icon as any} size={24} color={module.color} />
                  </View>
                  <Text className="text-sm font-semibold text-foreground mt-3" numberOfLines={2}>
                    {module.title}
                  </Text>
                  <Text className="text-xs text-muted mt-1" numberOfLines={2}>
                    {module.description}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  quickActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  quickActionButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  moduleCard: {
    width: "48%",
    flexGrow: 1,
    flexBasis: "46%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  moduleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
