import { Stack } from "expo-router";
import { useColors } from "@/hooks/use-colors";

export default function ModulesLayout() {
  const colors = useColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: "600", color: colors.foreground },
        headerShadowVisible: false,
        headerBackTitle: "Back",
      }}
    />
  );
}
