import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useColors } from "@/hooks/use-colors";

interface PhotoUploadSectionProps {
  photoKey: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
  photos: string[];
  onPhotoAdd: (photoKey: string, uri: string) => void;
  onPhotoDelete: (photoKey: string, index: number) => void;
}

export function PhotoUploadSection({
  photoKey,
  label,
  checked,
  onToggle,
  photos,
  onPhotoAdd,
  onPhotoDelete,
}: PhotoUploadSectionProps) {
  const colors = useColors();

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onPhotoAdd(photoKey, result.assets[0].uri);
    }
  };

  const handlePickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onPhotoAdd(photoKey, result.assets[0].uri);
    }
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 12,
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: photos.length > 0 ? 12 : 0,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: 4,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
      backgroundColor: checked ? colors.primary : "transparent",
    },
    checkboxText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: "bold",
    },
    label: {
      flex: 1,
      fontSize: 14,
      color: colors.foreground,
      fontWeight: "500",
    },
    uploadButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.primary,
      borderRadius: 6,
      marginLeft: 8,
    },
    uploadButtonText: {
      color: colors.background,
      fontSize: 12,
      fontWeight: "600",
    },
    photoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginLeft: 36,
    },
    photoThumbnailContainer: {
      position: "relative",
      width: 80,
      height: 80,
      borderRadius: 6,
      overflow: "hidden",
      backgroundColor: colors.surface,
    },
    photoThumbnail: {
      width: "100%",
      height: "100%",
    },
    deleteButton: {
      position: "absolute",
      top: 4,
      right: 4,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: "#FF3B30",
      justifyContent: "center",
      alignItems: "center",
    },
    deleteButtonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "bold",
    },
    addMoreButton: {
      width: 80,
      height: 80,
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: colors.primary,
      borderRadius: 6,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.surface,
    },
    addMoreText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: "600",
      textAlign: "center",
    },
    actionButtons: {
      flexDirection: "row",
      gap: 8,
      marginLeft: 36,
      marginTop: 8,
    },
    actionButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 6,
      justifyContent: "center",
      alignItems: "center",
    },
    actionButtonText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: "600",
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.checkboxRow}>
        <TouchableOpacity style={styles.checkbox} onPress={onToggle}>
          <Text style={styles.checkboxText}>{checked ? "✓" : ""}</Text>
        </TouchableOpacity>
        <Text style={styles.label}>{label}</Text>
        {photos.length === 0 && (
          <TouchableOpacity style={styles.uploadButton} onPress={handlePickPhoto}>
            <Text style={styles.uploadButtonText}>📸 Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {photos.length > 0 && (
        <>
          <View style={styles.photoGrid}>
            {photos.map((uri, idx) => (
              <View key={idx} style={styles.photoThumbnailContainer}>
                <Image source={{ uri }} style={styles.photoThumbnail} />
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => onPhotoDelete(photoKey, idx)}
                >
                  <Text style={styles.deleteButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 5 && (
              <TouchableOpacity style={styles.addMoreButton} onPress={handlePickPhoto}>
                <Text style={styles.addMoreText}>+ Add More</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handlePickPhoto}>
              <Text style={styles.actionButtonText}>📷 Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handlePickFromLibrary}>
              <Text style={styles.actionButtonText}>🖼️ Gallery</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}
