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
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

export default function QuizGeneratorScreen() {
  const colors = useColors();
  const [trainingMaterial, setTrainingMaterial] = useState("");
  const [numQuestions, setNumQuestions] = useState("5");
  const [quiz, setQuiz] = useState("");
  const [loading, setLoading] = useState(false);

  const { mutate: generateQuiz } = trpc.ai.generateQuiz.useMutation({
    onSuccess: (response) => {
      setQuiz(response.quiz);
      setLoading(false);
    },
    onError: (error) => {
      setQuiz(`Error: ${error.message}`);
      setLoading(false);
    },
  });

  const handleGenerate = () => {
    if (!trainingMaterial.trim()) return;
    setLoading(true);
    setQuiz("");
    generateQuiz({
      trainingMaterial,
      numQuestions: Math.min(20, Math.max(1, parseInt(numQuestions) || 5)),
    });
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
            <Text className="text-2xl font-bold text-foreground">Quiz Generator</Text>
            <Text className="text-sm text-muted mt-1">Create quizzes from training material</Text>
          </View>

          {/* Input Section */}
          <View className="px-4 gap-4">
            <View>
              <Text className="text-sm font-semibold text-foreground mb-2">Training Material</Text>
              <TextInput
                className={cn(
                  "bg-surface border border-border rounded-lg px-4 py-3 text-foreground",
                  "text-base"
                )}
                placeholder="Paste training material here..."
                placeholderTextColor={colors.muted}
                value={trainingMaterial}
                onChangeText={setTrainingMaterial}
                editable={!loading}
                multiline
                maxHeight={150}
              />
            </View>

            <View>
              <Text className="text-sm font-semibold text-foreground mb-2">Number of Questions</Text>
              <TextInput
                className={cn(
                  "bg-surface border border-border rounded-lg px-4 py-3 text-foreground",
                  "text-base"
                )}
                placeholder="5"
                placeholderTextColor={colors.muted}
                value={numQuestions}
                onChangeText={setNumQuestions}
                editable={!loading}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>

            <TouchableOpacity
              onPress={handleGenerate}
              disabled={loading || !trainingMaterial.trim()}
              className={cn(
                "bg-primary rounded-lg px-6 py-4 items-center",
                (loading || !trainingMaterial.trim()) && "opacity-50"
              )}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text className="text-background font-semibold text-base">Generate Quiz</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Quiz Display */}
          {quiz && (
            <View className="px-4 mt-6">
              <Text className="text-lg font-semibold text-foreground mb-3">Generated Quiz</Text>
              <View className="bg-surface border border-border rounded-lg p-4">
                <Text className="text-foreground leading-relaxed text-base">{quiz}</Text>
              </View>
            </View>
          )}

          {loading && (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator color={colors.primary} size="large" />
              <Text className="text-muted mt-4">Generating quiz...</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
