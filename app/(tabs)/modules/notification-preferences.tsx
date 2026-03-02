import { useState, useEffect } from "react";
import {
  View,
  Text,
  Switch,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type PrefKey =
  | "cmr_new"
  | "order_status"
  | "material_delivery_status"
  | "material_delivery_warehouse";

interface PrefItem {
  key: PrefKey;
  label: string;
  description: string;
  icon: string;
  color: string;
}

const PREF_ITEMS: PrefItem[] = [
  {
    key: "cmr_new",
    label: "CMR Report Submissions",
    description: "Get notified when a new Client Meeting Report is submitted",
    icon: "doc.text.fill",
    color: "#8B5CF6",
  },
  {
    key: "order_status",
    label: "Screen Order Updates",
    description: "Get notified when your screen order status changes (approved, rejected, completed)",
    icon: "rectangle.grid.2x2.fill",
    color: "#0a7ea4",
  },
  {
    key: "material_delivery_status",
    label: "Material Delivery Status",
    description: "Get notified when a material delivery checklist advances through the workflow",
    icon: "shippingbox.fill",
    color: "#F59E0B",
  },
  {
    key: "material_delivery_warehouse",
    label: "Warehouse Pull Alerts",
    description: "Get notified when a warehouse pull list is ready for action",
    icon: "shippingbox.fill",
    color: "#EF4444",
  },
];

export default function NotificationPreferencesScreen() {
  const colors = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: savedPrefs, isLoading } = trpc.notifications.getPrefs.useQuery();
  const updatePrefs = trpc.notifications.updatePrefs.useMutation({
    onSuccess: () => {
      utils.notifications.getPrefs.invalidate();
    },
    onError: (err) => {
      Alert.alert("Error", `Failed to save preferences: ${err.message}`);
    },
  });

  // Local state — true = enabled (default if not set)
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>({
    cmr_new: true,
    order_status: true,
    material_delivery_status: true,
    material_delivery_warehouse: true,
  });

  // Sync from server once loaded
  useEffect(() => {
    if (savedPrefs && Object.keys(savedPrefs).length > 0) {
      setPrefs((prev) => ({ ...prev, ...savedPrefs }));
    }
  }, [savedPrefs]);

  const handleToggle = (key: PrefKey, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    updatePrefs.mutate({ prefs: updated });
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <IconSymbol name="chevron.left" size={22} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Notification Preferences
        </Text>
        <View style={{ width: 30 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          {/* Intro */}
          <View
            style={[
              styles.infoCard,
              { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" },
            ]}
          >
            <IconSymbol name="bell.fill" size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.foreground }]}>
              Choose which notifications you receive. Turning off a type stops both push notifications
              and in-app alerts for that category.
            </Text>
          </View>

          {/* Pref items */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {PREF_ITEMS.map((item, index) => (
              <View
                key={item.key}
                style={[
                  styles.prefRow,
                  index < PREF_ITEMS.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                {/* Icon */}
                <View
                  style={[styles.iconWrap, { backgroundColor: item.color + "18" }]}
                >
                  <IconSymbol name={item.icon as any} size={20} color={item.color} />
                </View>

                {/* Text */}
                <View style={styles.prefText}>
                  <Text style={[styles.prefLabel, { color: colors.foreground }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.prefDesc, { color: colors.muted }]}>
                    {item.description}
                  </Text>
                </View>

                {/* Toggle */}
                <Switch
                  value={prefs[item.key]}
                  onValueChange={(val) => handleToggle(item.key, val)}
                  trackColor={{ false: colors.border, true: colors.primary + "80" }}
                  thumbColor={prefs[item.key] ? colors.primary : colors.muted}
                  ios_backgroundColor={colors.border}
                />
              </View>
            ))}
          </View>

          {/* Saving indicator */}
          {updatePrefs.isPending && (
            <View style={styles.savingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.savingText, { color: colors.muted }]}>Saving…</Text>
            </View>
          )}

          <Text style={[styles.footerNote, { color: colors.muted }]}>
            Changes are saved automatically. You can also manage push notification permissions in
            your device Settings.
          </Text>
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 4,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  prefText: {
    flex: 1,
    gap: 2,
  },
  prefLabel: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  prefDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  savingText: {
    fontSize: 13,
  },
  footerNote: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
