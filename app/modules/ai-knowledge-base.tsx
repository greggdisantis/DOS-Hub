import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

interface KnowledgeFile {
  id: number;
  fileName: string;
  category: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  description?: string;
  createdAt: string;
}

export default function AIKnowledgeBase() {
  const { user } = useAuth();
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);

  const listQuery = trpc.knowledgeBase.list.useQuery({ category: selectedCategory || undefined });
  const categoriesQuery = trpc.knowledgeBase.categories.useQuery();
  const uploadMutation = trpc.knowledgeBase.upload.useMutation();
  const deleteMutation = trpc.knowledgeBase.delete.useMutation();

  useEffect(() => {
    if (categoriesQuery.data) {
      setCategories(categoriesQuery.data);
    }
  }, [categoriesQuery.data]);

  useEffect(() => {
    if (listQuery.data) {
      setFiles(listQuery.data as KnowledgeFile[]);
      setIsLoading(false);
    }
  }, [listQuery.data]);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "text/markdown", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const category = selectedCategory || newCategory || "General";

      setIsUploading(true);

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await uploadMutation.mutateAsync({
        fileName: file.name,
        category,
        fileBuffer: base64,
        mimeType: file.mimeType || "application/octet-stream",
        fileSize: file.size || 0,
        description: `Uploaded by ${user?.name || "User"}`,
      });

      setIsUploading(false);
      setNewCategory("");
      setShowNewCategoryInput(false);
      listQuery.refetch();
      categoriesQuery.refetch();
      Alert.alert("Success", "File uploaded successfully");
    } catch (error) {
      setIsUploading(false);
      Alert.alert("Error", `Failed to upload file: ${error}`);
    }
  };

  const handleDeleteFile = (fileId: number, fileName: string) => {
    Alert.alert("Delete File", `Are you sure you want to delete "${fileName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync({ id: fileId });
            listQuery.refetch();
            Alert.alert("Success", "File deleted");
          } catch (error) {
            Alert.alert("Error", `Failed to delete file: ${error}`);
          }
        },
      },
    ]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color="#0a7ea4" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-foreground mb-2">AI Knowledge Base</Text>
          <Text className="text-muted">Manage training documents and knowledge files</Text>
        </View>

        {/* Upload Section */}
        <View className="bg-surface rounded-lg p-4 mb-6 border border-border">
          <Text className="text-lg font-semibold text-foreground mb-3">Upload Document</Text>

          {/* Category Selection */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-muted mb-2">Select or Create Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => {
                    setSelectedCategory(selectedCategory === cat ? null : cat);
                    setShowNewCategoryInput(false);
                  }}
                  className={`px-4 py-2 rounded-full mr-2 ${
                    selectedCategory === cat ? "bg-primary" : "bg-background border border-border"
                  }`}
                >
                  <Text className={selectedCategory === cat ? "text-background font-medium" : "text-foreground"}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {showNewCategoryInput ? (
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => {
                    setNewCategory("");
                    setShowNewCategoryInput(false);
                  }}
                  className="flex-1 bg-background border border-border rounded-lg p-3"
                >
                  <Text className="text-muted">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (newCategory.trim()) {
                      setSelectedCategory(newCategory);
                      setShowNewCategoryInput(false);
                    }
                  }}
                  className="flex-1 bg-primary rounded-lg p-3"
                >
                  <Text className="text-background font-medium text-center">Create: {newCategory}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowNewCategoryInput(true)}
                className="bg-background border border-border rounded-lg p-3"
              >
                <Text className="text-primary font-medium">+ New Category</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Upload Button */}
          <TouchableOpacity
            onPress={handlePickFile}
            disabled={isUploading}
            className={`bg-primary rounded-lg p-4 ${isUploading ? "opacity-50" : ""}`}
          >
            {isUploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-background font-semibold text-center">📁 Choose File to Upload</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Files List */}
        <View>
          <Text className="text-lg font-semibold text-foreground mb-3">
            Documents {selectedCategory && `in "${selectedCategory}"`}
          </Text>

          {files.length === 0 ? (
            <View className="bg-surface rounded-lg p-6 items-center">
              <Text className="text-muted text-center">No documents yet. Upload your first training file!</Text>
            </View>
          ) : (
            <FlatList
              data={files}
              scrollEnabled={false}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-foreground">{item.fileName}</Text>
                      <Text className="text-sm text-muted mt-1">
                        {item.category} • {formatFileSize(item.fileSize)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteFile(item.id, item.fileName)}
                      className="bg-error rounded-lg p-2"
                    >
                      <Text className="text-background font-bold">🗑</Text>
                    </TouchableOpacity>
                  </View>
                  {item.description && (
                    <Text className="text-sm text-muted mt-2">{item.description}</Text>
                  )}
                  <Text className="text-xs text-muted mt-2">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
