import React, { useState, useRef, useEffect } from "react";
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

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AITrainingScreen() {
  const colors = useColors();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi! I'm the DOS Hub training assistant. Ask me anything about DOS Hub operations, procedures, or products.",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const { mutate: askQuestion } = trpc.ai.askQuestion.useMutation({
    onSuccess: (response) => {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: response.answer,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setLoading(false);
    },
    onError: (error) => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Error: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setLoading(false);
    },
  });

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setLoading(true);

    askQuestion({ question: inputText });
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <ScreenContainer className="flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 flex-col">
          {/* Header */}
          <View className="px-4 py-4 border-b border-border">
            <Text className="text-2xl font-bold text-foreground">AI Training Assistant</Text>
            <Text className="text-sm text-muted mt-1">Ask questions about DOS Hub</Text>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            className="flex-1 px-4 py-4"
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message) => (
              <View
                key={message.id}
                className={cn(
                  "mb-4 flex-row",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <View
                  className={cn(
                    "rounded-lg px-4 py-3 max-w-xs",
                    message.role === "user"
                      ? "bg-primary"
                      : "bg-surface border border-border"
                  )}
                >
                  <Text
                    className={cn(
                      "text-base leading-relaxed",
                      message.role === "user"
                        ? "text-background"
                        : "text-foreground"
                    )}
                  >
                    {message.content}
                  </Text>
                  <Text
                    className={cn(
                      "text-xs mt-2",
                      message.role === "user"
                        ? "text-background opacity-70"
                        : "text-muted"
                    )}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
            ))}

            {loading && (
              <View className="flex-row items-center gap-2 mb-4">
                <View className="bg-surface border border-border rounded-lg px-4 py-3">
                  <ActivityIndicator color={colors.primary} />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input */}
          <View className="px-4 py-4 border-t border-border bg-background">
            <View className="flex-row items-end gap-2">
              <TextInput
                className={cn(
                  "flex-1 bg-surface border border-border rounded-lg px-4 py-3 text-foreground",
                  "text-base"
                )}
                placeholder="Ask a question..."
                placeholderTextColor={colors.muted}
                value={inputText}
                onChangeText={setInputText}
                editable={!loading}
                multiline
                maxHeight={100}
              />
              <TouchableOpacity
                onPress={handleSendMessage}
                disabled={loading || !inputText.trim()}
                className={cn(
                  "bg-primary rounded-lg p-3 justify-center items-center",
                  (loading || !inputText.trim()) && "opacity-50"
                )}
              >
                <Text className="text-background font-semibold">Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
