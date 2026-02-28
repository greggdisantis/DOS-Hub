/**
 * Screen Ordering Module — PDF Export
 * Uses expo-print on native (iOS/Android) and a new-window approach on web.
 */
import { Platform, Alert } from "react-native";
import type { OrderState } from "./types";
import { generateOrderPdfHtml, generateScreenPdfHtml } from "./pdf-template";

/**
 * Export the full order (all screens) as a PDF.
 * - On native: uses expo-print to generate a PDF file and share it
 * - On web: opens a new window with the HTML and triggers print dialog
 */
export async function exportOrderPdf(state: OrderState): Promise<void> {
  const html = generateOrderPdfHtml(state);

  if (Platform.OS === "web") {
    printHtmlOnWeb(html);
  } else {
    await printHtmlOnNative(html, `Screen-Order-${state.project.name || "Untitled"}`);
  }
}

/**
 * Preview a single screen's PDF.
 */
export async function previewScreenPdf(state: OrderState, screenIndex: number): Promise<void> {
  const html = generateScreenPdfHtml(state, screenIndex);
  const screen = state.screens[screenIndex];
  const title = screen?.description || `Screen-${screenIndex + 1}`;

  if (Platform.OS === "web") {
    printHtmlOnWeb(html);
  } else {
    await printHtmlOnNative(html, title);
  }
}

// ─── Platform-specific implementations ─────────────────────────────────────

function printHtmlOnWeb(html: string): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow pop-ups to export PDF.");
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  // Wait for content to render, then trigger print
  setTimeout(() => {
    printWindow.print();
  }, 500);
}

async function printHtmlOnNative(html: string, title: string): Promise<void> {
  try {
    // Dynamic import to avoid web bundling issues
    const Print = await import("expo-print");
    const Sharing = await import("expo-sharing");

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Share the generated PDF
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: `Share ${title}`,
      UTI: "com.adobe.pdf",
    });
  } catch (error: any) {
    console.error("PDF export error:", error);
    Alert.alert("Export Error", error?.message || "Failed to generate PDF. Please try again.");
  }
}
