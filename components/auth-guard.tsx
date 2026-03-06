import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "expo-router";
import { ActivityIndicator, Text, View, Pressable, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { NameCollectionScreen } from "@/components/name-collection-screen";

type AuthGuardProps = {
  children: React.ReactNode;
  /** If true, require manager or admin role */
  requireManager?: boolean;
  /** If true, require admin role */
  requireAdmin?: boolean;
};

/**
 * Auth guard that wraps screens requiring authentication.
 * Shows login prompt if not authenticated, pending screen if not approved.
 */
export function AuthGuard({ children, requireManager, requireAdmin }: AuthGuardProps) {
  const { user, isAuthenticated, loading: authLoading, refresh } = useAuth();
  const colors = useColors();
  const router = useRouter();

  if (authLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-muted mt-4">Loading...</Text>
        </View>
      </ScreenContainer>
    );
  }

  // Not logged in — show login prompt
  if (!isAuthenticated) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + "15" }]}>
            <IconSymbol name="person.circle.fill" size={48} color={colors.primary} />
          </View>
          <Text className="text-2xl font-bold text-foreground mt-4">Sign In Required</Text>
          <Text className="text-base text-muted text-center mt-2 px-8">
            Sign in to access DOS Hub features and save your work.
          </Text>
          <Pressable
            onPress={() => router.push("/login")}
            style={({ pressed }) => [
              styles.loginButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.loginButtonText}>Sign In</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  // Logged in but not approved — show pending screen
  if (user && !user.approved) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <View style={[styles.iconCircle, { backgroundColor: colors.warning + "15" }]}>
            <IconSymbol name="exclamationmark.triangle.fill" size={48} color={colors.warning} />
          </View>
          <Text className="text-2xl font-bold text-foreground mt-4">Pending Approval</Text>
          <Text className="text-base text-muted text-center mt-2 px-8">
            Your account is awaiting administrator approval. You'll be notified once your access is granted.
          </Text>
          <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statusRow}>
              <Text className="text-sm text-muted">Name</Text>
              <Text className="text-sm font-medium text-foreground">{user?.name || "—"}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text className="text-sm text-muted">Email</Text>
              <Text className="text-sm font-medium text-foreground">{user?.email || "—"}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text className="text-sm text-muted">Status</Text>
              <View style={[styles.badge, { backgroundColor: colors.warning + "20" }]}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.warning }}>Pending</Text>
              </View>
            </View>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // Approved but no name set — collect first/last name before proceeding
  if (user && user.approved && !user.firstName) {
    return <NameCollectionScreen onComplete={refresh} />;
  }

  // Check role requirements
  if (requireAdmin && user?.role !== "admin" && user?.role !== "super-admin") {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <IconSymbol name="shield.fill" size={48} color={colors.error} />
          <Text className="text-xl font-bold text-foreground mt-4">Admin Access Required</Text>
          <Text className="text-base text-muted text-center mt-2 px-8">
            This section is restricted to administrators.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  if (requireManager && user?.role !== "manager" && user?.role !== "admin" && user?.role !== "super-admin") {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <IconSymbol name="shield.fill" size={48} color={colors.error} />
          <Text className="text-xl font-bold text-foreground mt-4">Manager Access Required</Text>
          <Text className="text-base text-muted text-center mt-2 px-8">
            This section is restricted to managers and administrators.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  statusCard: {
    marginTop: 24,
    width: "100%",
    maxWidth: 320,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
});
