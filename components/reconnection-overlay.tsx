import { View, Text, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface ReconnectionOverlayProps {
  visible: boolean;
  isConnecting?: boolean;
  message?: string;
}

/**
 * Full-screen overlay shown while the app is reconnecting to the backend
 * Appears when the server is hibernating and being woken up
 */
export function ReconnectionOverlay({
  visible,
  isConnecting = true,
  message = "Reconnecting to server...",
}: ReconnectionOverlayProps) {
  const colors = useColors();

  if (!visible) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.background,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <View style={{ alignItems: "center", gap: 16 }}>
        {isConnecting && (
          <ActivityIndicator size="large" color={colors.primary} />
        )}
        <Text
          style={{
            fontSize: 16,
            color: colors.foreground,
            fontWeight: "500",
            textAlign: "center",
            maxWidth: 280,
          }}
        >
          {message}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: colors.muted,
            textAlign: "center",
            maxWidth: 280,
          }}
        >
          This usually takes a few seconds
        </Text>
      </View>
    </View>
  );
}
