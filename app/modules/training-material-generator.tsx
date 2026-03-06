import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Share,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

export default function TrainingMaterialGeneratorScreen() {
  const colors = useColors();
  const [topic, setTopic] = useState("");
  const [material, setMaterial] = useState("");
  const [loading, setLoading] = useState(false);

  const { mutate: generateMaterial } = trpc.ai.generateTrainingMaterial.useMutation({
    onSuccess: (response) => {
      setMaterial(response.material);
      setLoading(false);
    },
    onError: (error) => {
      setMaterial(`Error: ${error.message}`);
      setLoading(false);
    },
  });

  const handleGenerate = () => {
    if (!topic.trim()) return;
    setLoading(true);
    setMaterial("");
    generateMaterial({ topic });
  };

  const handleShare = async () => {
    if (!material) return;
    try {
      await Share.share({
        message: `DOS Hub Training Material\n\nTopic: ${topic}\n\n${material}`,
        title: `DOS Hub Training: ${topic}`,
      });
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  return (
    <ScreenContainer className="flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="px-4 py-4">
            <Text className="text-2xl font-bold text-foreground">Training Material Generator</Text>
            <Text className="text-sm text-muted mt-1">Generate DOS Hub training content</Text>
          </View>

          {/* Input Section */}
          <View className="px-4 gap-4">
            <View>
              <Text className="text-sm font-semibold text-foreground mb-2">Topic</Text>
              <TextInput
                className={cn(
                  "bg-surface border border-border rounded-lg px-4 py-3 text-foreground",
                  "text-base"
                )}
                placeholder="e.g., Order Management, Installation Procedures..."
                placeholderTextColor={colors.muted}
                value={topic}
                onChangeText={setTopic}
                editable={!loading}
                multiline
                maxHeight={100}
              />
            </View>

            <TouchableOpacity
              onPress={handleGenerate}
              disabled={loading || !topic.trim()}
              className={cn(
                "bg-primary rounded-lg px-6 py-4 items-center",
                (loading || !topic.trim()) && "opacity-50"
              )}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text className="text-background font-semibold text-base">Generate Material</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Material Display */}
          {material && (
            <View className="px-4 mt-6 gap-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-lg font-semibold text-foreground">Generated Material</Text>
                <TouchableOpacity
                  onPress={handleShare}
                  className="bg-primary rounded-lg px-4 py-2"
                >
                  <Text className="text-background font-semibold text-sm">Share</Text>
                </TouchableOpacity>
              </View>

              <View className="bg-surface border border-border rounded-lg p-4">
                <Text className="text-foreground leading-relaxed text-base">{material}</Text>
              </View>
            </View>
          )}

          {loading && (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator color={colors.primary} size="large" />
              <Text className="text-muted mt-4">Generating training material...</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
