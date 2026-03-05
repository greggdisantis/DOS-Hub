import React, { useState, useCallback } from "react";
import {
  Text,
  View,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Stack, router } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

// ─── Types ────────────────────────────────────────────────────────────────────

type ExpenseType = "JOB" | "OVERHEAD";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface ReceiptForm {
  submitterName: string;
  expenseType: ExpenseType;
  // Job fields
  jobName: string;
  workOrderNumber: string;
  poNumber: string;
  // Overhead fields
  overheadCategory: string;
  // Vendor & date
  vendorName: string;
  vendorLocation: string;
  purchaseDate: string;
  materialCategory: string;
  // Line items & totals
  lineItems: LineItem[];
  subtotal: string;
  tax: string;
  total: string;
  notes: string;
}

const OVERHEAD_CATEGORIES = [
  "Office Supplies",
  "Tools & Equipment",
  "Marketing",
  "Fuel (Non-job)",
  "Software / Subscriptions",
  "Training",
  "Meals",
  "Misc Overhead",
];

const MATERIAL_CATEGORIES = [
  "Structures",
  "Screens",
  "Electrical",
  "Miscellaneous",
  "Fuel",
  "Tools",
];

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step, total }: { step: number; total: number }) {
  const colors = useColors();
  return (
    <View style={styles.stepRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.stepDot,
            { backgroundColor: i < step ? colors.primary : colors.border },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ReceiptCaptureScreen() {
  const colors = useColors();
  const { user } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1); // 1=capture, 2=analyze, 3=review
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("image/jpeg");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const [form, setForm] = useState<ReceiptForm>({
    submitterName: user?.name || "",
    expenseType: "JOB",
    jobName: "",
    workOrderNumber: "",
    poNumber: "",
    overheadCategory: "",
    vendorName: "",
    vendorLocation: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    materialCategory: "Miscellaneous",
    lineItems: [],
    subtotal: "",
    tax: "",
    total: "",
    notes: "",
  });

  // tRPC
  const analyzeImageMutation = trpc.aquacleanReceipts.analyzeImage.useMutation();
  const createReceiptMutation = trpc.aquacleanReceipts.create.useMutation();
  const utils = trpc.useUtils();

  // Upload image to S3 via server
  // Image upload handled via direct fetch to /api/upload-image

  const updateForm = useCallback((patch: Partial<ReceiptForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  // ── Image picking ──────────────────────────────────────────────────────────

  const pickImage = async (fromCamera: boolean) => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permission needed", "Camera access is required to take photos.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: "images",
          quality: 0.85,
          base64: true,
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permission needed", "Photo library access is required.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: "images",
          quality: 0.85,
          base64: true,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setImageBase64(asset.base64 || null);
        setImageMime(asset.mimeType || "image/jpeg");
      }
    } catch (e) {
      Alert.alert("Error", "Could not access image. Please try again.");
    }
  };

  // ── Analyze receipt ────────────────────────────────────────────────────────

  const analyzeReceipt = async () => {
    if (!imageBase64) {
      Alert.alert("No image", "Please capture or upload a receipt image first.");
      return;
    }

    setAnalyzing(true);
    setStep(2);

    try {
      // Upload image to S3 first so LLM can access it via URL
      const dataUrl = `data:${imageMime};base64,${imageBase64}`;

      // Use the server's upload endpoint
      const uploadRes = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL || ""}/api/upload-image`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64: imageBase64, mimeType: imageMime }),
          credentials: "include",
        }
      );

      let imageUrl = dataUrl;
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
        setUploadedImageUrl(uploadData.url);
      } else {
        // Fallback: use data URL (may not work with LLM but we can still show the image)
        setUploadedImageUrl(null);
      }

      // Call AI analysis
      const extracted = await analyzeImageMutation.mutateAsync({ imageUrl });

      // Populate form with extracted data
      updateForm({
        vendorName: extracted.vendorName || "",
        vendorLocation: extracted.vendorLocation || "",
        purchaseDate: extracted.purchaseDate || new Date().toISOString().slice(0, 10),
        lineItems: (extracted.lineItems || []).map((item: any) => ({
          description: item.description || "",
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          lineTotal: Number(item.lineTotal) || 0,
        })),
        subtotal: String(extracted.subtotal || ""),
        tax: String(extracted.tax || ""),
        total: String(extracted.total || ""),
      });

      setStep(3);
    } catch (err) {
      console.error("Analysis error:", err);
      // Still go to review step even if AI fails
      setStep(3);
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Save receipt ───────────────────────────────────────────────────────────

  const saveReceipt = async () => {
    if (!form.vendorName) {
      Alert.alert("Required", "Please enter a vendor name.");
      return;
    }

    setSaving(true);
    try {
      // Generate filename: VendorName_D-M-YYYY_HHmmss
      const now = new Date();
      const d = now.getDate();
      const m = now.getMonth() + 1;
      const y = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      const safeVendor = form.vendorName.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
      const fileName = `${safeVendor}_${d}-${m}-${y}_${hh}${mm}${ss}`;

      await createReceiptMutation.mutateAsync({
        submitterName: form.submitterName || user?.name || "",
        vendorName: form.vendorName,
        vendorLocation: form.vendorLocation,
        purchaseDate: form.purchaseDate,
        expenseType: form.expenseType,
        jobName: form.expenseType === "JOB" ? form.jobName : undefined,
        workOrderNumber: form.expenseType === "JOB" ? form.workOrderNumber : undefined,
        poNumber: form.expenseType === "JOB" ? form.poNumber : undefined,
        overheadCategory: form.expenseType === "OVERHEAD" ? form.overheadCategory : undefined,
        materialCategory: form.materialCategory,
        lineItems: form.lineItems,
        subtotal: form.subtotal || undefined,
        tax: form.tax || undefined,
        total: form.total || undefined,
        notes: form.notes,
        imageUrl: uploadedImageUrl || undefined,
        fileName,
      });

      await utils.aquacleanReceipts.list.invalidate();

      Alert.alert("Saved!", `Receipt saved as "${fileName}"`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error("Save error:", err);
      Alert.alert("Error", "Failed to save receipt. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Line item helpers ──────────────────────────────────────────────────────

  const addLineItem = () => {
    updateForm({
      lineItems: [
        ...form.lineItems,
        { description: "", quantity: 1, unitPrice: 0, lineTotal: 0 },
      ],
    });
  };

  const updateLineItem = (index: number, patch: Partial<LineItem>) => {
    const updated = form.lineItems.map((item, i) => {
      if (i !== index) return item;
      const merged = { ...item, ...patch };
      // Auto-calculate lineTotal
      if (patch.quantity !== undefined || patch.unitPrice !== undefined) {
        merged.lineTotal = merged.quantity * merged.unitPrice;
      }
      return merged;
    });
    updateForm({ lineItems: updated });
  };

  const removeLineItem = (index: number) => {
    updateForm({ lineItems: form.lineItems.filter((_, i) => i !== index) });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen
        options={{
          title: "AquaClean Receipt Capture",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
        }}
      />
      <ScreenContainer edges={["left", "right"]}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step indicator */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <StepIndicator step={step} total={3} />
            <Text style={[styles.stepLabel, { color: colors.muted }]}>
              {step === 1 ? "Capture Receipt" : step === 2 ? "Analyzing..." : "Review & Confirm"}
            </Text>
          </View>

          {/* ── STEP 1: Capture ─────────────────────────────────────────── */}
          {step === 1 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Capture a Receipt
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
                Take a photo or upload an image to get started.
              </Text>

              {imageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.imagePreview}
                    contentFit="contain"
                  />
                  <Pressable
                    onPress={() => { setImageUri(null); setImageBase64(null); }}
                    style={({ pressed }) => [styles.removeImage, pressed && { opacity: 0.6 }]}
                  >
                    <Text style={{ color: colors.error, fontWeight: "600" }}>Remove Image</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={[styles.imagePlaceholder, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <IconSymbol name="photo.fill" size={48} color={colors.muted} />
                  <Text style={[styles.placeholderText, { color: colors.muted }]}>No image selected</Text>
                </View>
              )}

              <View style={styles.buttonRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.captureBtn,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                  ]}
                  onPress={() => pickImage(true)}
                >
                  <IconSymbol name="camera.fill" size={18} color="#fff" />
                  <Text style={styles.captureBtnText}>Take Photo</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.captureBtn,
                    { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                  ]}
                  onPress={() => pickImage(false)}
                >
                  <IconSymbol name="arrow.up.trash" size={18} color={colors.foreground} />
                  <Text style={[styles.captureBtnText, { color: colors.foreground }]}>Upload Image</Text>
                </Pressable>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.analyzeBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                  !imageUri && { opacity: 0.4 },
                ]}
                onPress={analyzeReceipt}
                disabled={!imageUri}
              >
                <Text style={styles.analyzeBtnText}>Analyze Receipt</Text>
              </Pressable>
            </View>
          )}

          {/* ── STEP 2: Analyzing ───────────────────────────────────────── */}
          {step === 2 && (
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.analyzingTitle, { color: colors.foreground }]}>
                Analyzing Receipt...
              </Text>
              <Text style={[styles.analyzingSubtitle, { color: colors.muted }]}>
                Extracting details, please wait.
              </Text>
            </View>
          )}

          {/* ── STEP 3: Review & Confirm ─────────────────────────────────── */}
          {step === 3 && (
            <View>
              {/* Receipt image thumbnail */}
              {imageUri && (
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>Receipt Image</Text>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.thumbnailImage}
                    contentFit="contain"
                  />
                  <Pressable
                    onPress={() => { setStep(1); }}
                    style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, marginTop: 8, alignSelf: "center" }]}
                  >
                    <Text style={{ color: colors.primary, fontWeight: "600" }}>Start Over</Text>
                  </Pressable>
                </View>
              )}

              {/* Submitter */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Submitter's Name</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={form.submitterName}
                  onChangeText={(v) => updateForm({ submitterName: v })}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.muted}
                  returnKeyType="done"
                />
              </View>

              {/* Receipt Classification */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Receipt Classification</Text>

                {/* Expense type toggle */}
                <View style={styles.toggleRow}>
                  {(["JOB", "OVERHEAD"] as ExpenseType[]).map((type) => (
                    <Pressable
                      key={type}
                      style={({ pressed }) => [
                        styles.toggleBtn,
                        {
                          backgroundColor: form.expenseType === type ? colors.primary : colors.background,
                          borderColor: form.expenseType === type ? colors.primary : colors.border,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                      onPress={() => updateForm({ expenseType: type })}
                    >
                      <Text style={{ color: form.expenseType === type ? "#fff" : colors.foreground, fontWeight: "600", fontSize: 13 }}>
                        {type === "JOB" ? "Job Receipt" : "Overhead / General"}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Job fields */}
                {form.expenseType === "JOB" && (
                  <View style={{ gap: 10, marginTop: 12 }}>
                    <View>
                      <Text style={[styles.fieldLabel, { color: colors.muted }]}>Job Name *</Text>
                      <TextInput
                        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                        value={form.jobName}
                        onChangeText={(v) => updateForm({ jobName: v })}
                        placeholder="e.g. Smith Residence"
                        placeholderTextColor={colors.muted}
                        returnKeyType="done"
                      />
                    </View>
                    <View>
                      <Text style={[styles.fieldLabel, { color: colors.muted }]}>Job Number / Work Order *</Text>
                      <TextInput
                        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                        value={form.workOrderNumber}
                        onChangeText={(v) => updateForm({ workOrderNumber: v })}
                        placeholder="e.g. 12345"
                        placeholderTextColor={colors.muted}
                        returnKeyType="done"
                      />
                    </View>
                    <View>
                      <Text style={[styles.fieldLabel, { color: colors.muted }]}>PO Number (Optional)</Text>
                      <TextInput
                        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                        value={form.poNumber}
                        onChangeText={(v) => updateForm({ poNumber: v })}
                        placeholder="e.g. PO-99"
                        placeholderTextColor={colors.muted}
                        returnKeyType="done"
                      />
                    </View>
                  </View>
                )}

                {/* Overhead category */}
                {form.expenseType === "OVERHEAD" && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.fieldLabel, { color: colors.muted }]}>Category *</Text>
                    <View style={styles.categoryGrid}>
                      {OVERHEAD_CATEGORIES.map((cat) => (
                        <Pressable
                          key={cat}
                          style={({ pressed }) => [
                            styles.categoryChip,
                            {
                              backgroundColor: form.overheadCategory === cat ? colors.primary + "22" : colors.background,
                              borderColor: form.overheadCategory === cat ? colors.primary : colors.border,
                              opacity: pressed ? 0.7 : 1,
                            },
                          ]}
                          onPress={() => updateForm({ overheadCategory: cat })}
                        >
                          <Text style={{ color: form.overheadCategory === cat ? colors.primary : colors.foreground, fontSize: 12, fontWeight: "500" }}>
                            {cat}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Vendor & Date */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Vendor & Date</Text>
                <View style={{ gap: 10 }}>
                  <View>
                    <Text style={[styles.fieldLabel, { color: colors.muted }]}>Vendor Name *</Text>
                    <TextInput
                      style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                      value={form.vendorName}
                      onChangeText={(v) => updateForm({ vendorName: v })}
                      placeholder="e.g. THE HOME DEPOT"
                      placeholderTextColor={colors.muted}
                      returnKeyType="done"
                    />
                  </View>
                  <View>
                    <Text style={[styles.fieldLabel, { color: colors.muted }]}>Location</Text>
                    <TextInput
                      style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                      value={form.vendorLocation}
                      onChangeText={(v) => updateForm({ vendorLocation: v })}
                      placeholder="e.g. 2500 Troy Road, Edwardsville, IL"
                      placeholderTextColor={colors.muted}
                      returnKeyType="done"
                    />
                  </View>
                  <View>
                    <Text style={[styles.fieldLabel, { color: colors.muted }]}>Purchase Date *</Text>
                    <TextInput
                      style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                      value={form.purchaseDate}
                      onChangeText={(v) => updateForm({ purchaseDate: v })}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.muted}
                      returnKeyType="done"
                    />
                  </View>
                  <View>
                    <Text style={[styles.fieldLabel, { color: colors.muted }]}>Material Class</Text>
                    <View style={styles.categoryGrid}>
                      {MATERIAL_CATEGORIES.map((cat) => (
                        <Pressable
                          key={cat}
                          style={({ pressed }) => [
                            styles.categoryChip,
                            {
                              backgroundColor: form.materialCategory === cat ? colors.primary + "22" : colors.background,
                              borderColor: form.materialCategory === cat ? colors.primary : colors.border,
                              opacity: pressed ? 0.7 : 1,
                            },
                          ]}
                          onPress={() => updateForm({ materialCategory: cat })}
                        >
                          <Text style={{ color: form.materialCategory === cat ? colors.primary : colors.foreground, fontSize: 12, fontWeight: "500" }}>
                            {cat}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>
              </View>

              {/* Line Items */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Line Items</Text>

                {form.lineItems.length === 0 && (
                  <Text style={[styles.emptyText, { color: colors.muted }]}>No line items yet.</Text>
                )}

                {form.lineItems.map((item, index) => (
                  <View key={index} style={[styles.lineItemRow, { borderColor: colors.border }]}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <TextInput
                        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                        value={item.description}
                        onChangeText={(v) => updateLineItem(index, { description: v })}
                        placeholder="Description"
                        placeholderTextColor={colors.muted}
                        returnKeyType="done"
                      />
                      <View style={styles.lineItemNumbers}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Qty</Text>
                          <TextInput
                            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                            value={String(item.quantity)}
                            onChangeText={(v) => updateLineItem(index, { quantity: parseFloat(v) || 0 })}
                            keyboardType="decimal-pad"
                            returnKeyType="done"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Unit Price</Text>
                          <TextInput
                            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                            value={String(item.unitPrice)}
                            onChangeText={(v) => updateLineItem(index, { unitPrice: parseFloat(v) || 0 })}
                            keyboardType="decimal-pad"
                            returnKeyType="done"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Total</Text>
                          <TextInput
                            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                            value={String(item.lineTotal)}
                            onChangeText={(v) => updateLineItem(index, { lineTotal: parseFloat(v) || 0 })}
                            keyboardType="decimal-pad"
                            returnKeyType="done"
                          />
                        </View>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => removeLineItem(index)}
                      style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.6 : 1 }]}
                    >
                      <IconSymbol name="trash.fill" size={18} color={colors.error} />
                    </Pressable>
                  </View>
                ))}

                <Pressable
                  style={({ pressed }) => [styles.addLineBtn, { borderColor: colors.primary, opacity: pressed ? 0.7 : 1 }]}
                  onPress={addLineItem}
                >
                  <IconSymbol name="plus" size={16} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: "600", marginLeft: 6 }}>Add Line Item</Text>
                </Pressable>
              </View>

              {/* Totals */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Totals</Text>
                <View style={styles.totalsRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.muted }]}>Subtotal</Text>
                    <TextInput
                      style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                      value={form.subtotal}
                      onChangeText={(v) => updateForm({ subtotal: v })}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.muted }]}>Tax</Text>
                    <TextInput
                      style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                      value={form.tax}
                      onChangeText={(v) => updateForm({ tax: v })}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.muted }]}>Total *</Text>
                    <TextInput
                      style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                      value={form.total}
                      onChangeText={(v) => updateForm({ total: v })}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                    />
                  </View>
                </View>
              </View>

              {/* Notes */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Receipt Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.notesInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={form.notes}
                  onChangeText={(v) => updateForm({ notes: v })}
                  placeholder="Add any additional notes..."
                  placeholderTextColor={colors.muted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Save button */}
              <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                <Pressable
                  style={({ pressed }) => [
                    styles.saveBtn,
                    { backgroundColor: colors.primary, opacity: pressed || saving ? 0.85 : 1 },
                  ]}
                  onPress={saveReceipt}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Receipt</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  stepRow: {
    flexDirection: "row",
    gap: 8,
  },
  stepDot: {
    width: 32,
    height: 4,
    borderRadius: 2,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  section: {
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  sectionSubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  imagePlaceholder: {
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  placeholderText: {
    fontSize: 14,
  },
  imagePreviewContainer: {
    alignItems: "center",
    gap: 8,
  },
  imagePreview: {
    width: "100%",
    height: 280,
    borderRadius: 12,
  },
  removeImage: {
    paddingVertical: 4,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  captureBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  captureBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  analyzeBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  analyzeBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  analyzingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
    gap: 16,
  },
  analyzingTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  analyzingSubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  card: {
    margin: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  notesInput: {
    height: 80,
    paddingTop: 10,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  lineItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  lineItemNumbers: {
    flexDirection: "row",
    gap: 8,
  },
  deleteBtn: {
    paddingTop: 10,
    paddingLeft: 4,
  },
  addLineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 4,
  },
  totalsRow: {
    flexDirection: "row",
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: "italic",
  },
  thumbnailImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
