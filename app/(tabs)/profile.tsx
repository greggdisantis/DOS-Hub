import { ScrollView, Text, View, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { startOAuthLogin } from "@/constants/oauth";

type SettingsRow = {
  id: string;
  icon: string;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  /** Only show for these roles */
  roles?: string[];
};

const ROLE_LABELS: Record<string, string> = {
  pending: "Pending Approval",
  guest: "Guest",
  member: "Team Member",
  technician: "Team Member",
  manager: "Manager",
  admin: "Administrator",
  "super-admin": "Super Admin",
  user: "Team Member",
};

const ROLE_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  guest: "#94A3B8",
  member: "#0a7ea4",
  technician: "#0a7ea4",
  manager: "#8B5CF6",
  admin: "#EF4444",
  "super-admin": "#3B82F6",
  user: "#0a7ea4",
};

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  const userRole = user?.role ?? "pending";
  const isApproved = user?.approved ?? false;
  const isAdmin = userRole === "admin" || userRole === "super-admin";
  const isSuperAdmin = userRole === "super-admin";
  const isManagerOrAdmin = userRole === "manager" || userRole === "admin" || userRole === "super-admin";

  const SETTINGS_SECTIONS = [
    {
      title: "Motorized Screens",
      items: [
        {
          id: "dashboard",
          icon: "chart.bar.fill",
          label: "Dashboard",
          subtitle: "Order status & team metrics",
          onPress: () => router.push("/modules/dashboard" as any),
          roles: ["admin", "manager", "super-admin"],
        },
        {
          id: "my-orders",
          icon: "folder.fill",
          label: "My Saved Orders",
          subtitle: "View and manage your orders",
          onPress: () => router.push("/modules/order-review" as any),
        },
        {
          id: "all-orders",
          icon: "doc.text.fill",
          label: "All Orders",
          subtitle: "Review team orders & revisions",
          onPress: () => router.push("/modules/order-review" as any),
          roles: ["admin", "manager", "super-admin"],
        },
      ].filter((item) => !item.roles || item.roles.includes(userRole)) as SettingsRow[],
    },
    // Future order types can be added here as separate sections, e.g.:
    // { title: "StruXure Orders", items: [...] },
    {
      title: "Account",
      items: [
        {
          id: "notifications",
          icon: "bell.fill",
          label: "Notifications",
          subtitle: "View your notification history",
          onPress: () => router.push("/modules/notifications" as any),
        },
        {
          id: "notification-preferences",
          icon: "gearshape.fill",
          label: "Notification Preferences",
          subtitle: "Choose which alerts you receive",
          onPress: () => router.push("/modules/notification-preferences" as any),
        },
        { id: "appearance", icon: "gearshape.fill", label: "Appearance", subtitle: "Theme & display" },
      ] as SettingsRow[],
    },
    {
      title: "Administration",
      items: [
        {
          id: "super-admin-dashboard",
          icon: "chart.bar.fill",
          label: "Super-Admin Dashboard",
          subtitle: "System analytics & audit logs",
          onPress: () => router.push("/modules/super-admin-dashboard"),
          roles: ["super-admin"],
        },
        {
          id: "super-admin-notifications",
          icon: "bell.badge.fill",
          label: "Critical Alerts",
          subtitle: "System events & notifications",
          onPress: () => router.push("/modules/super-admin-notifications"),
          roles: ["super-admin"],
        },
        {
          id: "users",
          icon: "shield.fill",
          label: "User Management",
          subtitle: "Approve users, set roles & permissions",
          onPress: () => router.push("/modules/admin-users"),
          roles: ["admin", "super-admin"],
        },
        {
          id: "module-permissions",
          icon: "lock.fill",
          label: "Module Permissions",
          subtitle: "Configure role-based access per module",
          onPress: () => router.push("/modules/module-permissions" as any),
          roles: ["admin", "super-admin"],
        },
        {
          id: "team",
          icon: "person.circle.fill",
          label: "Team Members",
          subtitle: "View team",
          onPress: () => router.push("/modules/admin-users"),
          roles: ["admin", "manager", "super-admin"],
        },
      ].filter((item) => !item.roles || item.roles.includes(userRole)) as SettingsRow[],
    },
    {
      title: "Support",
      items: [
        {
          id: "ai-training",
          icon: "sparkles",
          label: "AI Training Assistant",
          subtitle: "Learn DOS Hub with AI",
          onPress: () => router.push("/modules/ai-training"),
        },
        {
          id: "training-material",
          icon: "doc.text.fill",
          label: "Generate Training Material",
          subtitle: "Create training content with AI",
          onPress: () => router.push("/modules/training-material-generator"),
        },
        {
          id: "quiz-generator",
          icon: "questionmark.circle.fill",
          label: "Generate Quiz",
          subtitle: "Create quizzes from material",
          onPress: () => router.push("/modules/quiz-generator"),
        },
        { id: "help", icon: "book.fill", label: "Help Center", subtitle: "FAQs & guides" },
        { id: "feedback", icon: "paperplane.fill", label: "Send Feedback" },
      ] as SettingsRow[],
    },
  ].filter((section) => section.items.length > 0);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-3xl font-bold text-foreground">Profile</Text>
        </View>

        {/* Not Signed In */}
        {!isAuthenticated && (
          <View className="px-5 mt-3">
            <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: colors.muted + "30" }]}>
                <IconSymbol name="person.circle.fill" size={28} color={colors.muted} />
              </View>
              <View style={styles.userInfo}>
                <Text className="text-lg font-semibold text-foreground">Not Signed In</Text>
                <Text className="text-sm text-muted">Sign in to access all features</Text>
              </View>
            </View>
            <Pressable
              onPress={() => startOAuthLogin()}
              style={({ pressed }) => [
                styles.signInButton,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>Sign In</Text>
            </Pressable>
          </View>
        )}

        {/* Signed In User Card */}
        {isAuthenticated && (
          <View className="px-5 mt-3">
            <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: (ROLE_COLORS[userRole] || colors.primary) + "20" }]}>
                <Text style={{ fontSize: 22, fontWeight: "700", color: ROLE_COLORS[userRole] || colors.primary }}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : "?"}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text className="text-lg font-semibold text-foreground">
                  {user?.name || "Unknown User"}
                </Text>
                <Text className="text-sm text-muted">
                  {user?.email || "No email"}
                </Text>
                <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                  <View style={[styles.roleBadge, { backgroundColor: (ROLE_COLORS[userRole] || colors.primary) + "20" }]}>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: ROLE_COLORS[userRole] || colors.primary }}>
                      {ROLE_LABELS[userRole] || userRole}
                    </Text>
                  </View>
                  {!isApproved && (
                    <View style={[styles.roleBadge, { backgroundColor: colors.warning + "20" }]}>
                      <Text style={{ fontSize: 11, fontWeight: "600", color: colors.warning }}>
                        Awaiting Approval
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Pending Approval Banner */}
        {isAuthenticated && !isApproved && (
          <View className="px-5 mt-3">
            <View style={[styles.pendingBanner, { backgroundColor: colors.warning + "10", borderColor: colors.warning + "40" }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={20} color={colors.warning} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.warning }}>
                  Account Pending Approval
                </Text>
                <Text className="text-xs text-muted mt-1">
                  An administrator needs to approve your account before you can access all features.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Settings Sections */}
        {isAuthenticated && isApproved && SETTINGS_SECTIONS.map((section) => (
          <View key={section.title} className="px-5 mt-5">
            <Text className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              {section.title}
            </Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {section.items.map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={item.onPress}
                  style={({ pressed }) => [
                    styles.settingsRow,
                    index < section.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <IconSymbol name={item.icon as any} size={20} color={colors.primary} />
                  <View style={styles.settingsText}>
                    <Text className="text-base text-foreground">{item.label}</Text>
                    {item.subtitle && <Text className="text-xs text-muted">{item.subtitle}</Text>}
                  </View>
                  <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out */}
        {isAuthenticated && (
          <View className="px-5 mt-6">
            <Pressable
              onPress={logout}
              style={({ pressed }) => [
                styles.signOutButton,
                { borderColor: colors.error },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={{ fontSize: 16, fontWeight: "600", color: colors.error }}>Sign Out</Text>
            </Pressable>
          </View>
        )}

        {/* Version */}
        <View className="items-center mt-6">
          <Text className="text-xs text-muted">DOS Hub v1.0.0</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flex: 1,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  settingsText: {
    flex: 1,
  },
  signOutButton: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  signInButton: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
  },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
});
