import { ScrollView, Text, View, Pressable, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";

type SettingsRow = {
  id: string;
  icon: string;
  label: string;
  subtitle?: string;
};

const SETTINGS_SECTIONS = [
  {
    title: "Account",
    items: [
      { id: "notifications", icon: "bell.fill", label: "Notifications", subtitle: "Manage alerts" },
      { id: "appearance", icon: "gearshape.fill", label: "Appearance", subtitle: "Theme & display" },
    ] as SettingsRow[],
  },
  {
    title: "Company",
    items: [
      { id: "branding", icon: "photo.fill", label: "Branding", subtitle: "Logo & colors" },
      { id: "team", icon: "person.circle.fill", label: "Team Members", subtitle: "Manage users" },
      { id: "subscription", icon: "shield.fill", label: "Subscription", subtitle: "Plan & billing" },
    ] as SettingsRow[],
  },
  {
    title: "Support",
    items: [
      { id: "help", icon: "book.fill", label: "Help Center", subtitle: "FAQs & guides" },
      { id: "feedback", icon: "paperplane.fill", label: "Send Feedback" },
    ] as SettingsRow[],
  },
];

export default function ProfileScreen() {
  const colors = useColors();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-3xl font-bold text-foreground">Profile</Text>
        </View>

        {/* User Card */}
        <View className="px-5 mt-3">
          <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={{ fontSize: 22, fontWeight: "700", color: "#FFFFFF" }}>
                {isAuthenticated && user?.name ? user.name.charAt(0).toUpperCase() : "?"}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text className="text-lg font-semibold text-foreground">
                {isAuthenticated && user?.name ? user.name : "Not Signed In"}
              </Text>
              <Text className="text-sm text-muted">
                {isAuthenticated && user?.email ? user.email : "Sign in to access all features"}
              </Text>
              {isAuthenticated && (
                <View style={[styles.roleBadge, { backgroundColor: colors.primary + "20" }]}>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: colors.primary }}>Member</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Settings Sections */}
        {SETTINGS_SECTIONS.map((section) => (
          <View key={section.title} className="px-5 mt-5">
            <Text className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              {section.title}
            </Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {section.items.map((item, index) => (
                <Pressable
                  key={item.id}
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
    marginTop: 4,
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
});
