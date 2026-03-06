import { ScrollView, Text, View, Pressable, ActivityIndicator, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

export default function AdminScreen() {
  const colors = useColors();
  const [isDeploying, setIsDeploying] = useState(false);

  const handleDeploy = async () => {
    Alert.alert(
      "Deploy to Production",
      "Are you sure you want to deploy the latest changes to production?",
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Deploy",
          onPress: async () => {
            setIsDeploying(true);
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
                `Workflow triggered successfully!\n\nView progress at:\nhttps://github.com/greggdisantis/DOS-Hub/actions`,
                [{ text: "OK" }]
              );
            } catch (error) {
              Alert.alert(
                "Deployment Failed",
                error instanceof Error ? error.message : "Unknown error occurred"
              );
            } finally {
              setIsDeploying(false);
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">Admin</Text>
            <Text className="text-base text-muted">Deployment & System Controls</Text>
          </View>

          {/* Deployment Section */}
          <View className="bg-surface rounded-2xl p-6 gap-4 border border-border">
            <View className="gap-2">
              <Text className="text-lg font-semibold text-foreground">Deploy to Production</Text>
              <Text className="text-sm text-muted leading-relaxed">
                Trigger a deployment of the latest code changes to the production environment.
              </Text>
            </View>

            <Pressable
              onPress={handleDeploy}
              disabled={isDeploying}
              style={({ pressed }) => [
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.8 : isDeploying ? 0.6 : 1,
                },
              ]}
              className="flex-row items-center justify-center rounded-lg px-4 py-3 gap-2"
            >
              {isDeploying && <ActivityIndicator color={colors.background} size="small" />}
              <Text className="font-semibold text-background text-center">
                {isDeploying ? "Deploying..." : "Deploy to Production"}
              </Text>
            </Pressable>

            <Text className="text-xs text-muted">
              This will trigger the GitHub Actions workflow and deploy to Cloud Run.
            </Text>
          </View>

          {/* Info Section */}
          <View className="bg-surface rounded-2xl p-6 gap-3 border border-border">
            <Text className="text-lg font-semibold text-foreground">Deployment Info</Text>
            <View className="gap-2">
              <Text className="text-sm text-muted">
                <Text className="font-semibold text-foreground">Production URL:</Text>
                {"\n"}https://dos-hub-199485151034.us-central1.run.app/
              </Text>
              <Text className="text-sm text-muted">
                <Text className="font-semibold text-foreground">GitHub Actions:</Text>
                {"\n"}github.com/greggdisantis/DOS-Hub/actions
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
