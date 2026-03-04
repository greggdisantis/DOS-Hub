import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { uploadMaterialFile } from "@/lib/upload-material-file";

interface Attachment {
  url: string;
  name: string;
  type: string;
  uploadedByName: string;
  uploadedAt: string;
}

interface Props {
  checklistId: number;
  attachments: Attachment[];
  onAttachmentsChange: () => void;
  readOnly?: boolean;
}

export default function FinalReviewTab({ checklistId, attachments, onAttachmentsChange, readOnly }: Props) {
  const colors = useColors();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<any>(null);
  const uploadFileMutation = trpc.projectMaterial.uploadFile.useMutation();

  const uploadPdfFile = async (uri: string, name: string, mimeType = "application/pdf") => {
    const url = await uploadMaterialFile(uri, mimeType, name);
    await uploadFileMutation.mutateAsync({
      id: checklistId,
      fileUrl: url,
      fileName: name,
      fileType: mimeType,
    });
  };

  const handlePickPDF = async () => {
    if (Platform.OS === "web") {
      // On web, use a hidden file input — DocumentPicker on web doesn't reliably return readable URIs
      if (fileInputRef.current) fileInputRef.current.click();
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled) return;

      setUploading(true);
      for (const asset of result.assets) {
        await uploadPdfFile(asset.uri, asset.name, "application/pdf");
      }
      onAttachmentsChange();
    } catch (err: any) {
      Alert.alert("Upload Failed", err.message ?? "Could not upload PDF.");
    } finally {
      setUploading(false);
    }
  };

  const handleWebFileChange = async (e: any) => {
    const files: FileList = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uri = URL.createObjectURL(file);
        await uploadPdfFile(uri, file.name, file.type || "application/pdf");
        URL.revokeObjectURL(uri);
      }
      onAttachmentsChange();
    } catch (err: any) {
      Alert.alert("Upload Failed", err.message ?? "Could not upload PDF.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleOpenAttachment = (url: string) => {
    if (Platform.OS === "web") {
      window.open(url, "_blank");
    } else {
      Linking.openURL(url);
    }
  };

  const pdfAttachments = attachments.filter((a) => a.type === "application/pdf" || a.name?.endsWith(".pdf"));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Hidden file input for web PDF upload */}
      {Platform.OS === "web" && (
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          style={{ display: "none" }}
          onChange={handleWebFileChange}
        />
      )}

      {/* Header */}
      <View style={[styles.sectionHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Purchase Order PDFs</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
          Upload all PO PDFs for this project. These will be included in the final printed checklist for the delivery team.
        </Text>
      </View>

      {/* Uploaded PDFs list */}
      {pdfAttachments.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyIcon, { color: colors.muted }]}>📄</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>No PO PDFs uploaded yet</Text>
          {!readOnly && (
            <Text style={[styles.emptyHint, { color: colors.muted }]}>
              Tap "Add PO PDF" below to attach purchase orders
            </Text>
          )}
        </View>
      ) : (
        pdfAttachments.map((attachment, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.attachmentRow, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => handleOpenAttachment(attachment.url)}
            activeOpacity={0.7}
          >
            <View style={[styles.pdfIcon, { backgroundColor: colors.error + "20" }]}>
              <Text style={[styles.pdfIconText, { color: colors.error }]}>PDF</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.attachmentName, { color: colors.foreground }]} numberOfLines={2}>
                {attachment.name}
              </Text>
              <Text style={[styles.attachmentMeta, { color: colors.muted }]}>
                Uploaded by {attachment.uploadedByName} · {new Date(attachment.uploadedAt).toLocaleDateString()}
              </Text>
            </View>
            <Text style={[styles.openLink, { color: colors.primary }]}>Open</Text>
          </TouchableOpacity>
        ))
      )}

      {/* Upload button */}
      {!readOnly && (
        <TouchableOpacity
          style={[styles.uploadBtn, { borderColor: colors.primary, opacity: uploading ? 0.7 : 1 }]}
          onPress={handlePickPDF}
          disabled={uploading}
          activeOpacity={0.8}
        >
          {uploading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={[styles.uploadBtnText, { color: colors.primary }]}>+ Add PO PDF</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Info note */}
      <View style={[styles.infoCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
        <Text style={[styles.infoText, { color: colors.foreground }]}>
          <Text style={{ fontWeight: "700" }}>How it works: </Text>
          Once the checklist is closed, a combined PDF is generated with the checklist and all attached POs. The delivery team can print it, load the truck, and return the signed hard copy to the office.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 60 },
  sectionHeader: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 6 },
  sectionSubtitle: { fontSize: 13, lineHeight: 18 },
  emptyState: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 32, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 16, fontWeight: "600" },
  emptyHint: { fontSize: 13, textAlign: "center" },
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  pdfIcon: { width: 44, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  pdfIconText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  attachmentName: { fontSize: 14, fontWeight: "500", lineHeight: 20 },
  attachmentMeta: { fontSize: 12, marginTop: 2 },
  openLink: { fontSize: 13, fontWeight: "600" },
  uploadBtn: {
    margin: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  uploadBtnText: { fontSize: 15, fontWeight: "600" },
  infoCard: { margin: 16, borderWidth: 1, borderRadius: 10, padding: 14 },
  infoText: { fontSize: 13, lineHeight: 20 },
});
