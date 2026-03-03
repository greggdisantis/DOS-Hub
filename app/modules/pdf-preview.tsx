/**
 * PDF Preview Screen
 * Full-screen in-app preview of the generated PDF HTML.
 * - Export: on web, opens a new window with the HTML and triggers Save-as-PDF via print dialog
 *           on native, uses expo-print to generate a PDF file and share via share sheet
 * - Print: opens the system print dialog for the preview content
 */
import { useCallback, useRef, useState } from "react";
import {
  Text, View, Pressable, StyleSheet, Platform, Alert, ActivityIndicator,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { usePdfPreview } from "@/lib/screen-ordering/pdf-context";

export default function PdfPreviewScreen() {
  const colors = useColors();
  const router = useRouter();
  const { data } = usePdfPreview();
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const title = data?.title || "PDF Preview";
  const html = data?.html || "";

  // ─── Export: generate PDF file and save/download ───────────────────────────
  const handleExport = useCallback(async () => {
    if (!html) return;
    setExporting(true);

    try {
      if (Platform.OS === "web") {
        // On web: create a Blob from the HTML, open it in a new tab,
        // then use the browser's built-in print-to-PDF (Save as PDF)
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const exportWindow = window.open(url, "_blank");
        if (exportWindow) {
          exportWindow.onload = () => {
            // Auto-trigger print dialog after content loads
            setTimeout(() => {
              exportWindow.print();
              URL.revokeObjectURL(url);
            }, 600);
          };
        } else {
          // Fallback: direct download as HTML
          const a = document.createElement("a");
          a.href = url;
          const safeName = (data?.title || "screen-order")
            .replace(/[^a-zA-Z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .toLowerCase();
          a.download = `${safeName}-${new Date().toISOString().split("T")[0]}.html`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } else {
        // On native: use expo-print to generate PDF file, then share via share sheet
        const Print = await import("expo-print");
        const Sharing = await import("expo-sharing");

        const { uri } = await Print.printToFileAsync({
          html,
          base64: false,
        });

        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Save ${title}`,
          UTI: "com.adobe.pdf",
        });
      }
    } catch (error: any) {
      console.error("PDF export error:", error);
      if (Platform.OS === "web") {
        alert("Failed to export PDF. Please try again.");
      } else {
        Alert.alert("Export Error", error?.message || "Failed to generate PDF.");
      }
    } finally {
      setExporting(false);
    }
  }, [html, title, data?.title]);

  // ─── Print: open system print dialog ──────────────────────────────────────
  const handlePrint = useCallback(async () => {
    if (!html) return;
    setPrinting(true);

    try {
      if (Platform.OS === "web") {
        // Print the iframe content directly
        const iframe = iframeRef.current;
        if (iframe?.contentWindow) {
          iframe.contentWindow.print();
        } else {
          // Fallback: open new window and print
          const printWindow = window.open("", "_blank");
          if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            setTimeout(() => printWindow.print(), 500);
          }
        }
      } else {
        // On native: use expo-print's printAsync for direct printing
        const Print = await import("expo-print");
        await Print.printAsync({ html });
      }
    } catch (error: any) {
      console.error("Print error:", error);
      if (Platform.OS === "web") {
        alert("Failed to print. Please try again.");
      } else {
        Alert.alert("Print Error", error?.message || "Failed to print.");
      }
    } finally {
      setPrinting(false);
    }
  }, [html]);

  // ─── No data state ────────────────────────────────────────────────────────
  if (!html) {
    return (
      <>
        <Stack.Screen options={{ title: "PDF Preview", headerShown: true }} />
        <ScreenContainer className="p-6" edges={["top", "left", "right", "bottom"]}>
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              No PDF data available. Please go back and generate a preview.
            </Text>
          </View>
        </ScreenContainer>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: title,
          headerShown: true,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, paddingRight: 12 }]}
            >
              <IconSymbol name="chevron.right" size={20} color={colors.primary} style={{ transform: [{ scaleX: -1 }] }} />
            </Pressable>
          ),
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* PDF Preview Area */}
        <View style={styles.previewArea}>
          {Platform.OS === "web" ? (
            <iframe
              ref={iframeRef as any}
              srcDoc={html}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                backgroundColor: "#fff",
              }}
              title="PDF Preview"
            />
          ) : (
            <WebViewPreview html={html} />
          )}
        </View>

        {/* Bottom Toolbar */}
        <View style={[styles.toolbar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {/* Export Button — saves PDF file */}
          <Pressable
            onPress={handleExport}
            disabled={exporting}
            style={({ pressed }) => [
              styles.toolbarBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              exporting && { opacity: 0.6 },
            ]}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <IconSymbol name="square.and.arrow.up" size={18} color="#fff" />
            )}
            <Text style={styles.exportBtnText}>
              {exporting ? "Generating..." : "Export PDF"}
            </Text>
          </Pressable>

          {/* Print Button — opens print dialog */}
          <Pressable
            onPress={handlePrint}
            disabled={printing}
            style={({ pressed }) => [
              styles.toolbarBtn,
              styles.printBtn,
              { borderColor: colors.primary },
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              printing && { opacity: 0.6 },
            ]}
          >
            {printing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <IconSymbol name="doc.text.fill" size={18} color={colors.primary} />
            )}
            <Text style={[styles.printBtnText, { color: colors.primary }]}>
              {printing ? "Printing..." : "Print"}
            </Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

// ─── Native WebView Wrapper ──────────────────────────────────────────────────

function WebViewPreview({ html }: { html: string }) {
  try {
    const { WebView } = require("react-native-webview");
    return (
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        style={{ flex: 1, backgroundColor: "#fff" }}
        scalesPageToFit={true}
        javaScriptEnabled={true}
      />
    );
  } catch {
    return (
      <View style={styles.emptyContainer}>
        <Text style={{ color: "#888" }}>WebView not available on this platform.</Text>
      </View>
    );
  }
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  previewArea: {
    flex: 1,
  },
  toolbar: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "web" ? 12 : 28,
    borderTopWidth: 0.5,
  },
  toolbarBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  exportBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  printBtn: {
    borderWidth: 2,
    backgroundColor: "transparent",
  },
  printBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
