import { Text, View, Pressable, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function ScreenOrderingScreen() {
  const colors = useColors();

  return (
    <>
      <Stack.Screen options={{ title: "Motorized Screens" }} />
      <ScreenContainer className="px-5" edges={["left", "right"]}>
        <View className="flex-1 items-center justify-center">
          <View style={[styles.iconContainer, { backgroundColor: "#F59E0B" + "18" }]}>
            <IconSymbol name="rectangle.grid.2x2.fill" size={48} color="#F59E0B" />
          </View>
          <Text className="text-2xl font-bold text-foreground mt-5">Motorized Screens</Text>
          <Text className="text-sm text-muted mt-2 text-center px-8 leading-5">
            Configure and order motorized screens with real-time structural calculations and PDF generation.
          </Text>

          <View style={styles.featureList}>
            {[
              "Multi-manufacturer support",
              "Structural wind-load calculations",
              "Real-time pricing engine",
              "PDF order generation",
              "Project linking",
            ].map((feature, i) => (
              <View key={i} style={styles.featureRow}>
                <IconSymbol name="bolt.fill" size={14} color={colors.success} />
                <Text className="text-sm text-foreground ml-2">{feature}</Text>
              </View>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.comingSoonBadge,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text className="text-sm font-semibold text-muted">Coming Soon</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  featureList: {
    marginTop: 28,
    gap: 12,
    alignSelf: "stretch",
    paddingHorizontal: 32,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  comingSoonBadge: {
    marginTop: 28,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
  },
});
