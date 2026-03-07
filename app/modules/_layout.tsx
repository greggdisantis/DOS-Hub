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
    >
      {/* Explicitly define module screens to avoid duplicate route registration */}
      <Stack.Screen name="dashboard" options={{ title: "Dashboard" }} />
      <Stack.Screen name="screen-ordering" options={{ title: "Screen Ordering" }} />
      <Stack.Screen name="sales-pipeline" options={{ title: "Sales Pipeline" }} />
      <Stack.Screen name="receipt-dashboard" options={{ title: "Receipt Dashboard" }} />
      <Stack.Screen name="receipt-capture" options={{ title: "Receipt Capture" }} />
      <Stack.Screen name="aquaclean-receipt-dashboard" options={{ title: "AquaClean Receipt Dashboard" }} />
      <Stack.Screen name="aquaclean-receipt-capture" options={{ title: "AquaClean Receipt Capture" }} />
      <Stack.Screen name="cmr-reports-dashboard" options={{ title: "CMR Reports" }} />
      <Stack.Screen name="client-meeting-report" options={{ title: "Client Meeting Report" }} />
      <Stack.Screen name="precon-dashboard" options={{ title: "Precon Dashboard" }} />
      <Stack.Screen name="time-off-calendar" options={{ title: "Time Off Calendar" }} />
      <Stack.Screen name="time-off-admin" options={{ title: "Time Off Admin" }} />
      <Stack.Screen name="job-intelligence" options={{ title: "Job Intelligence" }} />
      <Stack.Screen name="hubspot" options={{ title: "HubSpot" }} />
      <Stack.Screen name="admin-users" options={{ title: "Admin Users" }} />
      <Stack.Screen name="super-admin-dashboard" options={{ title: "Super Admin Dashboard" }} />
      <Stack.Screen name="super-admin-notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="module-permissions" options={{ title: "Module Permissions" }} />
      <Stack.Screen name="ai-training" options={{ title: "AI Training" }} />
      <Stack.Screen name="quiz-generator" options={{ title: "Quiz Generator" }} />
      <Stack.Screen name="order-detail" options={{ title: "Order Detail" }} />
      <Stack.Screen name="order-review" options={{ title: "Order Review" }} />
      <Stack.Screen name="pdf-preview" options={{ title: "PDF Preview" }} />
      <Stack.Screen name="receipt-pdf" options={{ title: "Receipt PDF" }} />
      <Stack.Screen name="aquaclean-receipt-pdf" options={{ title: "AquaClean Receipt PDF" }} />
    </Stack>
  );
}
