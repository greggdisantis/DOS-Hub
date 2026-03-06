import { useState } from "react";
import { Pressable, Text, View, ActivityIndicator, Alert } from "react-native";
import { useColors } from "@/hooks/use-colors";

export function DeployButton() {
  const [isLoading, setIsLoading] = useState(false);
  const colors = useColors();

  const handleDeploy = async () => {
    Alert.alert(
      "Deploy to Production",
      "Are you sure you want to deploy the latest changes to production?",
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Deploy",
          onPress: async () => {
            setIsLoading(true);
            try {
              const response = await fetch("/api/deploy-to-production", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
              });

              if (!response.ok) {
                throw new Error(`Deployment failed: ${response.statusText}`);
              }

              const data = await response.json();
              Alert.alert(
                "Deployment Started",
                `Workflow triggered successfully!\n\nView progress: ${data.workflowUrl}`,
                [{ text: "OK" }]
              );
            } catch (error) {
              Alert.alert(
                "Deployment Failed",
                error instanceof Error ? error.message : "Unknown error occurred"
              );
            } finally {
              setIsLoading(false);
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  return (
    <View className="px-4 py-3 border-t border-border bg-surface">
      <Pressable
        onPress={handleDeploy}
        disabled={isLoading}
        style={({ pressed }) => [
          {
            backgroundColor: colors.primary,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        className="flex-row items-center justify-center rounded-lg px-4 py-3 gap-2"
      >
        {isLoading && <ActivityIndicator color={colors.background} size="small" />}
        <Text className="font-semibold text-background text-center">
          {isLoading ? "Deploying..." : "Deploy to Production"}
        </Text>
      </Pressable>
    </View>
  );
}
