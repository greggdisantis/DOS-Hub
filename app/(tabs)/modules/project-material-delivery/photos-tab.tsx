import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { uploadMaterialFile } from "@/lib/upload-material-file";

interface Props {
  checklistId: number;
  loadedPhotos: string[];
  deliveredPhotos: string[];
  materialsLoaded: boolean;
  materialsDelivered: boolean;
  onUpdate: () => void;
  readOnly?: boolean;
}

type PhotoTab = "loading" | "delivery";

export default function PhotosTab({
  checklistId,
  loadedPhotos,
  deliveredPhotos,
  materialsLoaded,
  materialsDelivered,
  onUpdate,
  readOnly,
}: Props) {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<PhotoTab>("loading");
  const [uploading, setUploading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const fileInputRef = useRef<any>(null);
  const updateMutation = trpc.projectMaterial.update.useMutation();

  const photos = activeTab === "loading" ? loadedPhotos : deliveredPhotos;
  const isLoaded = materialsLoaded;
  const isDelivered = materialsDelivered;

  const handleToggleLoaded = async () => {
    if (readOnly) return;
    try {
      await updateMutation.mutateAsync({ id: checklistId, materialsLoaded: !isLoaded });
      onUpdate();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not update status.");
    }
  };

  const handleToggleDelivered = async () => {
    if (readOnly) return;
    try {
      await updateMutation.mutateAsync({ id: checklistId, materialsDelivered: !isDelivered });
      onUpdate();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not update status.");
    }
  };

  const uploadPhoto = async (uri: string, mimeType = "image/jpeg") => {
    setUploading(true);
    try {
      const fileName = `photo-${Date.now()}.jpg`;
      const url = await uploadMaterialFile(uri, mimeType, fileName);

      const updatedLoaded = activeTab === "loading" ? [...loadedPhotos, url] : loadedPhotos;
      const updatedDelivered = activeTab === "delivery" ? [...deliveredPhotos, url] : deliveredPhotos;

      await updateMutation.mutateAsync({
        id: checklistId,
        materialsLoadedPhotos: updatedLoaded,
        materialsDeliveredPhotos: updatedDelivered,
      });
      onUpdate();
    } catch (err: any) {
      Alert.alert("Upload Failed", err.message ?? "Could not upload photo.");
    } finally {
      setUploading(false);
      setShowPicker(false);
    }
  };

  const handleTakePhoto = async () => {
    setShowPicker(false);
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera permission is needed to take photos.");
        return;
      }
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false });
    if (!result.canceled) {
      await uploadPhoto(result.assets[0].uri);
    }
  };

  const handleChooseFromLibrary = async () => {
    setShowPicker(false);
    if (Platform.OS === "web") {
      // On web, use a hidden file input
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (!result.canceled) {
      for (const asset of result.assets) {
        await uploadPhoto(asset.uri);
      }
    }
  };

  const handleWebFileChange = async (e: any) => {
    const files: FileList = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uri = URL.createObjectURL(file);
      await uploadPhoto(uri, file.type || "image/jpeg");
      URL.revokeObjectURL(uri);
    }
    // Reset the input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Hidden file input for web */}
      {Platform.OS === "web" && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={handleWebFileChange}
        />
      )}

      {/* Loaded / Delivered checkboxes */}
      <View style={[styles.checkboxSection, { borderBottomColor: colors.border }]}>
        <CheckboxRow
          label="All Materials Loaded"
          description="Confirm all items have been loaded onto the truck"
          checked={isLoaded}
          onToggle={handleToggleLoaded}
          colors={colors}
          readOnly={readOnly}
        />
        <CheckboxRow
          label="All Materials Delivered"
          description="Confirm all items have been delivered to the site"
          checked={isDelivered}
          onToggle={handleToggleDelivered}
          colors={colors}
          readOnly={readOnly}
        />
      </View>

      {/* Photo sub-tabs */}
      <View style={[styles.photoTabBar, { borderBottomColor: colors.border }]}>
        {(["loading", "delivery"] as const).map((pt) => {
          const isActive = activeTab === pt;
          const count = pt === "loading" ? loadedPhotos.length : deliveredPhotos.length;
          return (
            <TouchableOpacity
              key={pt}
              onPress={() => { setActiveTab(pt); setShowPicker(false); }}
              style={[styles.photoTab, isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.photoTabText, { color: isActive ? colors.primary : colors.muted }]}>
                {pt === "loading" ? "Loading Photos" : "Delivery Photos"}
                {count > 0 && <Text> ({count})</Text>}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Photo grid */}
      <ScrollView contentContainerStyle={styles.photosContent}>
        {photos.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyIcon, { color: colors.muted }]}>📷</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              No {activeTab === "loading" ? "loading" : "delivery"} photos yet
            </Text>
          </View>
        ) : (
          <View style={styles.photoGrid}>
            {photos.map((uri, i) => (
              <View key={i} style={[styles.photoThumb, { borderColor: colors.border }]}>
                <Image source={{ uri }} style={styles.photoImage} resizeMode="cover" />
              </View>
            ))}
          </View>
        )}

        {!readOnly && (
          <>
            {/* Inline source picker — avoids Alert.alert multi-button issue on web */}
            {showPicker ? (
              <View style={[styles.pickerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.pickerTitle, { color: colors.foreground }]}>Add Photo</Text>
                {Platform.OS !== "web" && (
                  <TouchableOpacity
                    style={[styles.pickerOption, { borderBottomColor: colors.border }]}
                    onPress={handleTakePhoto}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerOptionText, { color: colors.foreground }]}>📸  Take Photo</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.pickerOption, { borderBottomColor: colors.border }]}
                  onPress={handleChooseFromLibrary}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerOptionText, { color: colors.foreground }]}>🖼  Choose from Library</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pickerCancel}
                  onPress={() => setShowPicker(false)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerCancelText, { color: colors.muted }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.addPhotoBtn, { borderColor: colors.primary, opacity: uploading ? 0.7 : 1 }]}
                onPress={() => setShowPicker(true)}
                disabled={uploading}
                activeOpacity={0.8}
              >
                {uploading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={[styles.addPhotoBtnText, { color: colors.primary }]}>
                    + Add {activeTab === "loading" ? "Loading" : "Delivery"} Photo
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function CheckboxRow({
  label,
  description,
  checked,
  onToggle,
  colors,
  readOnly,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  colors: any;
  readOnly?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.checkboxRow,
        { borderBottomColor: colors.border, backgroundColor: checked ? colors.success + "08" : "transparent" },
      ]}
      onPress={readOnly ? undefined : onToggle}
      activeOpacity={readOnly ? 1 : 0.7}
    >
      <View
        style={[
          styles.checkbox,
          { borderColor: checked ? colors.success : colors.border, backgroundColor: checked ? colors.success : "transparent" },
        ]}
      >
        {checked && <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>✓</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.checkboxLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.checkboxDescription, { color: colors.muted }]}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  checkboxSection: { borderBottomWidth: StyleSheet.hairlineWidth },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  checkbox: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  checkboxLabel: { fontSize: 15, fontWeight: "600", lineHeight: 20 },
  checkboxDescription: { fontSize: 12, marginTop: 2 },
  photoTabBar: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  photoTab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  photoTabText: { fontSize: 14, fontWeight: "600" },
  photosContent: { padding: 16, paddingBottom: 60 },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 15, fontWeight: "500" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  photoThumb: { width: 100, height: 100, borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  photoImage: { width: "100%", height: "100%" },
  addPhotoBtn: { borderWidth: 1.5, borderStyle: "dashed", borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  addPhotoBtnText: { fontSize: 15, fontWeight: "600" },
  pickerCard: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 8,
  },
  pickerTitle: { fontSize: 14, fontWeight: "700", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  pickerOption: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  pickerOptionText: { fontSize: 15 },
  pickerCancel: { paddingHorizontal: 16, paddingVertical: 14 },
  pickerCancelText: { fontSize: 15, fontWeight: "500" },
});
