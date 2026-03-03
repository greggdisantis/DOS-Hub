/**
 * Receipt PDF Export Screen
 * Generates a DOS-branded PDF for a receipt and opens it via the system share sheet.
 */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
  Platform,
  Linking,
} from "react-native";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function ReceiptPDFScreen() {
  const colors = useColors();
  const { receiptId } = useLocalSearchParams<{ receiptId: string }>();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("receipt.pdf");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePDFMutation = trpc.receipts.generatePDF.useMutation();

  const handleGenerate = async () => {
    if (!receiptId) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await generatePDFMutation.mutateAsync({ id: parseInt(receiptId, 10) });
      setPdfUrl(result.url);
      setFileName(result.fileName);
    } catch (e: any) {
      setError(e?.message || "Failed to generate PDF");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    handleGenerate();
  }, [receiptId]);

  const handleShare = async () => {
    if (!pdfUrl) return;
    try {
      if (Platform.OS === "web") {
        // On web, open the URL directly
        Linking.openURL(pdfUrl);
        return;
      }

      // Download to local cache then share
      const localUri = FileSystem.cacheDirectory + fileName;
      const downloadResult = await FileSystem.downloadAsync(pdfUrl, localUri);

      if (downloadResult.status === 200) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: "application/pdf",
            dialogTitle: `Share ${fileName}`,
            UTI: "com.adobe.pdf",
          });
        } else {
          Alert.alert("Share unavailable", "Sharing is not available on this device.");
        }
      } else {
        Alert.alert("Error", "Failed to download PDF for sharing.");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to share PDF");
    }
  };

  const handleOpenInBrowser = () => {
    if (pdfUrl) Linking.openURL(pdfUrl);
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={22} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>PDF Export</Text>
        {pdfUrl && (
          <Pressable
            style={({ pressed }) => [styles.shareBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
            onPress={handleShare}
          >
            <IconSymbol name="square.and.arrow.up" size={16} color="#fff" />
            <Text style={styles.shareBtnText}>Share</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.body}>
        {generating && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.statusText, { color: colors.muted }]}>Generating PDF...</Text>
            <Text style={[styles.subText, { color: colors.muted }]}>
              Building your DOS Receipt Summary Report
            </Text>
          </View>
        )}

        {error && !generating && (
          <View style={styles.center}>
            <View style={[styles.errorIcon, { backgroundColor: colors.error + "22" }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={40} color={colors.error} />
            </View>
            <Text style={[styles.statusText, { color: colors.foreground }]}>Generation Failed</Text>
            <Text style={[styles.subText, { color: colors.muted }]}>{error}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.retryBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={handleGenerate}
            >
              <Text style={styles.retryBtnText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {pdfUrl && !generating && (
          <View style={styles.center}>
            <View style={[styles.successIcon, { backgroundColor: "#22C55E22" }]}>
              <IconSymbol name="checkmark.circle.fill" size={56} color="#22C55E" />
            </View>
            <Text style={[styles.statusText, { color: colors.foreground }]}>PDF Ready</Text>
            <Text style={[styles.fileNameText, { color: colors.muted }]}>{fileName}</Text>

            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={handleShare}
              >
                <IconSymbol name="square.and.arrow.up" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>Share / Download</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={handleOpenInBrowser}
              >
                <IconSymbol name="safari.fill" size={18} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>Open in Browser</Text>
              </Pressable>
            </View>

            <Text style={[styles.hint, { color: colors.muted }]}>
              The PDF includes a summary page and the original receipt image on page 2.
            </Text>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  shareBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  body: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  statusText: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  subText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  fileNameText: {
    fontSize: 13,
    textAlign: "center",
    fontFamily: "monospace",
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actions: {
    width: "100%",
    gap: 10,
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  hint: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
});
