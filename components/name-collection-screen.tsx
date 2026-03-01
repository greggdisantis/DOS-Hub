import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

/**
 * Shown after first login when the user has not yet set their first/last name.
 * Calls users.updateName and then triggers a refresh of the auth state.
 */
export function NameCollectionScreen({ onComplete }: { onComplete: () => void }) {
  const colors = useColors();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const updateName = trpc.users.updateName.useMutation({
    onSuccess: () => {
      onComplete();
    },
    onError: (err) => {
      setError(err.message || "Failed to save name. Please try again.");
    },
  });

  const handleSave = () => {
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first || !last) {
      setError("Please enter both your first and last name.");
      return;
    }
    setError(null);
    updateName.mutate({ firstName: first, lastName: last });
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.iconCircle}>
            <Text style={{ fontSize: 36 }}>👋</Text>
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Welcome to DOS Hub</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Before you get started, please enter your full name. This will be used across all modules.
          </Text>

          {/* First Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.muted }]}>First Name</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="e.g. Gregg"
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            />
          </View>

          {/* Last Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.muted }]}>Last Name</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="e.g. Disantis"
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSave}
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            />
          </View>

          {/* Error */}
          {error && (
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          )}

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={updateName.isPending}
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
          >
            {updateName.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(10, 126, 164, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  fieldGroup: {
    width: "100%",
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
  },
  saveButton: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
});
