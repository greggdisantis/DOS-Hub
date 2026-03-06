import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Platform, View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { trpc } from "@/lib/trpc";

function NotificationBadge({ count, color }: { count: number; color: string }) {
  if (count <= 0) return null;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: color }]}>
      <Text style={badgeStyles.badgeText}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
  },
});

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: user } = trpc.auth.me.useQuery();

  // Register push notification token when user is authenticated
  usePushNotifications(!!(user && (user as any).id));

  // Poll unread notification count every 30 seconds
  const { data: unreadData } = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled: !!(user && (user as any).id),
    refetchInterval: 30000,
  });
  const unreadCount = unreadData?.count ?? 0;

  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: "Tools",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="wrench.and.screwdriver.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          href: null,
          title: "Projects",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="folder.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <View>
              <IconSymbol size={28} name="person.circle.fill" color={color} />
              <NotificationBadge count={unreadCount} color="#EF4444" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
      {/* Hide all module sub-routes from the tab bar */}
      <Tabs.Screen name="modules/notifications" options={{ href: null }} />
      <Tabs.Screen name="modules/notification-preferences" options={{ href: null }} />
      <Tabs.Screen name="modules/job-intelligence" options={{ href: null }} />
      <Tabs.Screen name="modules/job-intelligence/reports-view" options={{ href: null }} />
      <Tabs.Screen name="modules/project-material-delivery" options={{ href: null }} />
      <Tabs.Screen name="modules/project-material-delivery/index" options={{ href: null }} />
      <Tabs.Screen name="modules/project-material-delivery/new" options={{ href: null }} />
      <Tabs.Screen name="modules/project-material-delivery/detail" options={{ href: null }} />
      <Tabs.Screen name="modules/project-material-delivery/boxed-items" options={{ href: null }} />
      <Tabs.Screen name="modules/project-material-delivery/delivery-items" options={{ href: null }} />
      <Tabs.Screen name="modules/project-material-delivery/project-specific-items" options={{ href: null }} />
    </Tabs>
  );
}
