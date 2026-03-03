import { useState, useCallback, useEffect } from "react";
import {
  Text, View, ScrollView, TextInput, Pressable, Alert, StyleSheet, Platform, Switch, Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useScreenOrder } from "@/hooks/use-screen-order";
import { FieldPicker } from "@/components/screen-ordering/field-picker";
import { MeasurementInput } from "@/components/screen-ordering/measurement-input";
import { CalcResults } from "@/components/screen-ordering/calc-results";
import {
  MOTOR_TYPES, REMOTE_OPTIONS, INSTALL_MOUNT_OPTIONS, FACE_MOUNT_SIDES,
  MOTOR_SIDE_OPTIONS, FRAME_COLOR_COLLECTIONS, FRAME_COLORS,
  getScreenTypes, getScreenColorOptions,
  TWICHELL_SOLAR_SERIES, FERRARI_SOLTIS_SERIES,
  VINYL_WINDOW_CONFIGS, VINYL_ORIENTATIONS,
  type ScreenManufacturer,
} from "@/lib/screen-ordering/constants";
import {
  MEASUREMENT_LABELS, MEASUREMENT_SHORT_LABELS,
  type MeasurementPoint,
  type ScreenPhoto,
} from "@/lib/screen-ordering/types";
import { generateOrderPdfHtml, generateScreenPdfHtml } from "@/lib/screen-ordering/pdf-template";
import { usePdfPreview } from "@/lib/screen-ordering/pdf-context";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import type { OrderState } from "@/lib/screen-ordering/types";

const SCREEN_COUNT_OPTIONS = Array.from({ length: 20 }, (_, i) => String(i + 1));

export default function ScreenOrderingScreen() {
  const colors = useColors();
  const router = useRouter();
  const { setData: setPdfPreview } = usePdfPreview();
  const order = useScreenOrder();
  const { state, activeScreen, activeScreenIndex } = order;
  const { user, isAuthenticated } = useAuth();
  const [savedOrderId, setSavedOrderId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedOrders, setShowSavedOrders] = useState(false);

  // Auto-fill submitter name from user profile
  useEffect(() => {
    if (user && !order.state.project.submitterName) {
      const fullName = (user.firstName && user.lastName)
        ? `${user.firstName} ${user.lastName}`.trim()
        : (user.name ?? '');
      if (fullName) order.updateProject({ submitterName: fullName });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const utils = trpc.useUtils();
  const createOrderMutation = trpc.orders.create.useMutation({
    onSuccess: (data) => {
      setSavedOrderId(data.orderId);
      setIsSaving(false);
      Alert.alert("Saved", "Order saved successfully.");
      utils.orders.list.invalidate();
    },
    onError: (err) => {
      setIsSaving(false);
      Alert.alert("Error", err.message || "Failed to save order.");
    },
  });
  const updateOrderMutation = trpc.orders.update.useMutation({
    onSuccess: () => {
      setIsSaving(false);
      Alert.alert("Saved", "Order updated successfully.");
      utils.orders.list.invalidate();
    },
    onError: (err) => {
      setIsSaving(false);
      Alert.alert("Error", err.message || "Failed to update order.");
    },
  });
  const { data: savedOrders } = trpc.orders.list.useQuery(undefined, {
    enabled: isAuthenticated && showSavedOrders,
  });

  const handleSaveOrder = () => {
    if (!isAuthenticated) {
      Alert.alert("Sign In Required", "Please sign in to save orders.");
      return;
    }
    setIsSaving(true);
    const title = state.project.name
      ? `${state.project.name} - ${state.project.date}`
      : `Screen Order - ${state.project.date}`;
    // Strip photos base64 from saved data to keep payload small
    const cleanState = {
      ...state,
      screens: state.screens.map((s) => ({
        ...s,
        photos: s.photos.map((p) => ({ ...p, base64: undefined })),
      })),
    };
    if (savedOrderId) {
      updateOrderMutation.mutate({
        orderId: savedOrderId,
        title,
        orderData: cleanState,
        screenCount: state.screens.length,
        manufacturer: state.manufacturer,
        changeDescription: "Updated from app",
      });
    } else {
      createOrderMutation.mutate({
        title,
        orderData: cleanState,
        screenCount: state.screens.length,
        manufacturer: state.manufacturer,
      });
    }
  };

  const handleLoadOrder = (orderData: any, orderId: number) => {
    order.loadState(orderData as OrderState);
    setSavedOrderId(orderId);
    setShowSavedOrders(false);
  };

  const screen = activeScreen;
  const sel = screen.selections;
  const mfr = state.manufacturer;

  // Global material (used when allSame=true) or per-screen material
  const effectiveMat = order.getEffectiveMaterial(screen);

  // Determine series options based on effective screen type
  let seriesOptions: string[] = [];
  if (effectiveMat.screenType === "Twichell Solar") seriesOptions = TWICHELL_SOLAR_SERIES;
  else if (effectiveMat.screenType === "Ferrari Soltis") seriesOptions = FERRARI_SOLTIS_SERIES;

  const needsSeries = effectiveMat.screenType === "Twichell Solar" || effectiveMat.screenType === "Ferrari Soltis";
  const isVinyl = effectiveMat.screenType === "Vinyl";
  const colorOptions = getScreenColorOptions(effectiveMat.screenType, effectiveMat.series);
  const frameCollections = FRAME_COLOR_COLLECTIONS[mfr] ?? [];
  const frameColors = FRAME_COLORS[effectiveMat.frameColorCollection] ?? [];
  const motorTypes = MOTOR_TYPES[mfr] ?? [];
  const remoteOptions = REMOTE_OPTIONS[state.globalMotorType] ?? [];
  const warnings = order.getScreenWarnings(screen);

  // Inline side-check warnings for measurement columns
  const leftSideMismatch = screen.calculations?.leftSideMismatch ?? false;
  const rightSideMismatch = screen.calculations?.rightSideMismatch ?? false;

  return (
    <>
      <Stack.Screen options={{ title: "Motorized Screens" }} />
      <ScreenContainer edges={["left", "right"]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ═══════════════════════════════════════════════════════════════
              PROJECT INFORMATION
              ═══════════════════════════════════════════════════════════════ */}
          <SectionHeader title="Project Information" colors={colors} />

          <View style={styles.row2Col}>
            <View style={styles.col}>
              <FormInput label="Project Name *" value={state.project.name}
                onChangeText={(v) => order.updateProject({ name: v })} placeholder="e.g., Smith Residence" />
            </View>
            <View style={styles.col}>
              <FormInput label="Submitter *" value={state.project.submitterName}
                onChangeText={(v) => order.updateProject({ submitterName: v })} placeholder="Your name" />
            </View>
          </View>
          <View style={styles.row2Col}>
            <View style={styles.col}>
              <FormInput label="Job Number" value={state.project.jobNumber}
                onChangeText={(v) => order.updateProject({ jobNumber: v })} placeholder="Optional" />
            </View>
            <View style={styles.col}>
              <FormInput label="Address" value={state.project.address}
                onChangeText={(v) => order.updateProject({ address: v })} placeholder="Site address" />
            </View>
          </View>
          <FormInput label="Date" value={state.project.date}
            onChangeText={(v) => order.updateProject({ date: v })} placeholder="YYYY-MM-DD" />

          {/* ═══════════════════════════════════════════════════════════════
              GLOBAL SELECTIONS
              ═══════════════════════════════════════════════════════════════ */}
          <SectionHeader title="Global Selections" colors={colors} />

          {/* Row 1: Manufacturer, Total Screens, Input Units, Motor Type */}
          <View style={styles.row4Col}>
            <View style={styles.col}>
              <FieldPicker
                label="Screen Manufacturer"
                value={state.manufacturer}
                options={["DOS Screens", "MagnaTrack"]}
                onSelect={(v) => order.setManufacturer(v as ScreenManufacturer)}
                required
              />
            </View>
            <View style={styles.colSmall}>
              <FieldPicker
                label="Total # of Screens"
                value={String(state.screens.length)}
                options={SCREEN_COUNT_OPTIONS}
                onSelect={(v) => order.setScreenCount(parseInt(v, 10))}
                required
              />
            </View>
            <View style={styles.col}>
              <FieldPicker
                label="Input Units"
                value={state.inputUnits}
                options={["Inches + 1/16\""]}
                onSelect={(v) => order.setInputUnits(v)}
              />
            </View>
            <View style={styles.col}>
              <FieldPicker
                label="Motor Type (Global)"
                value={state.globalMotorType}
                options={motorTypes}
                onSelect={(v) => order.setGlobalMotorType(v)}
                placeholder="— Select —"
                required
              />
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* All Same Toggle */}
          <View style={styles.allSameRow}>
            <Text style={[styles.allSameLabel, { color: colors.foreground }]}>
              All Screen Material & Frame Colors the Same?
            </Text>
            <View style={styles.yesNoRow}>
              <Pressable
                onPress={() => order.setAllSame(true)}
                style={[
                  styles.yesNoBtn,
                  state.allSame
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                ]}
              >
                <Text style={[styles.yesNoBtnText, { color: state.allSame ? "#fff" : colors.foreground }]}>Yes</Text>
              </Pressable>
              <Pressable
                onPress={() => order.setAllSame(false)}
                style={[
                  styles.yesNoBtn,
                  !state.allSame
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                ]}
              >
                <Text style={[styles.yesNoBtnText, { color: !state.allSame ? "#fff" : colors.foreground }]}>No</Text>
              </Pressable>
            </View>
          </View>

          {/* Global Screen Material & Frame (when allSame=true) */}
          {state.allSame && (
            <View style={styles.globalMaterialRow}>
              {/* Screen Material column */}
              <View style={styles.col}>
                <SubSectionHeader title="Screen Material" colors={colors} />
                <FieldPicker label="Screen Type" value={state.globalMaterial.screenType}
                  options={getScreenTypes(mfr)}
                  onSelect={(v) => order.updateGlobalMaterial("screenType", v)} required />
                {needsSeries && (
                  <FieldPicker label={effectiveMat.screenType === "Twichell Solar" ? "Twichell Series" : "Ferrari Series"}
                    value={state.globalMaterial.series}
                    options={seriesOptions}
                    onSelect={(v) => order.updateGlobalMaterial("series", v)} required />
                )}
                {isVinyl && (
                  <>
                    <FieldPicker label="Window Config" value={state.globalMaterial.vinylWindowConfig}
                      options={VINYL_WINDOW_CONFIGS}
                      onSelect={(v) => order.updateGlobalMaterial("vinylWindowConfig", v)} />
                    <FieldPicker label="Orientation" value={state.globalMaterial.vinylOrientation}
                      options={VINYL_ORIENTATIONS}
                      onSelect={(v) => order.updateGlobalMaterial("vinylOrientation", v)} />
                  </>
                )}
                {colorOptions.length > 0 && (
                  <FieldPicker label="Screen Color" value={state.globalMaterial.screenColor}
                    options={colorOptions}
                    onSelect={(v) => order.updateGlobalMaterial("screenColor", v)} required />
                )}
              </View>

              {/* Frame column */}
              <View style={styles.col}>
                <SubSectionHeader title="Frame" colors={colors} />
                <FieldPicker label="Frame Color Collection" value={state.globalMaterial.frameColorCollection}
                  options={frameCollections}
                  onSelect={(v) => order.updateGlobalMaterial("frameColorCollection", v)} required />
                {frameColors.length > 0 && (
                  <FieldPicker label="Frame Color" value={state.globalMaterial.frameColor}
                    options={frameColors}
                    onSelect={(v) => order.updateGlobalMaterial("frameColor", v)} required />
                )}
              </View>
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SCREENS CONFIGURATION
              ═══════════════════════════════════════════════════════════════ */}
          <SectionHeader title="Screens Configuration" colors={colors} />

          {/* Screen tabs (when multiple screens) */}
          {state.screens.length > 1 && (
            <View style={styles.screenTabs}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
                {state.screens.map((s, i) => (
                  <Pressable
                    key={s.id}
                    onPress={() => order.setActiveScreenIndex(i)}
                    style={({ pressed }) => [
                      styles.screenTab,
                      {
                        backgroundColor: i === activeScreenIndex ? colors.primary : colors.surface,
                        borderColor: i === activeScreenIndex ? colors.primary : colors.border,
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={[styles.screenTabText, { color: i === activeScreenIndex ? "#fff" : colors.foreground }]}>
                      {s.description || `Screen ${i + 1}`}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ─── Per-Screen Card ─────────────────────────────────────── */}
          <View style={[styles.screenCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Screen header */}
            <View style={styles.screenCardHeader}>
              <Text style={[styles.screenCardTitle, { color: colors.foreground }]}>
                SCREEN #{activeScreenIndex + 1}
              </Text>
              <Pressable
                onPress={() => {
                  const html = generateScreenPdfHtml(state, activeScreenIndex);
                  const screenTitle = screen.description || `Screen ${activeScreenIndex + 1}`;
                  setPdfPreview({ html, title: screenTitle, mode: activeScreenIndex });
                  router.push("/modules/pdf-preview" as any);
                }}
                style={({ pressed }) => [
                  styles.previewBtn,
                  { borderColor: colors.primary },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.previewBtnText, { color: colors.primary }]}>Preview Screen PDF</Text>
              </Pressable>
            </View>

            {/* Description */}
            <FormInput label="Description" value={screen.description}
              onChangeText={(v) => order.updateScreenField(activeScreenIndex, "description", v)}
              placeholder="e.g., Middle Area" />

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Per-screen material (only when allSame=false) */}
            {!state.allSame && (
              <>
                <View style={styles.row2Col}>
                  <View style={styles.col}>
                    <SubSectionHeader title="Screen Material" colors={colors} />
                    <FieldPicker label="Screen Type" value={sel.screenType}
                      options={getScreenTypes(mfr)}
                      onSelect={(v) => order.updateSelection(activeScreenIndex, "screenType", v)} required />
                    {needsSeries && (
                      <FieldPicker label="Series" value={sel.series}
                        options={seriesOptions}
                        onSelect={(v) => order.updateSelection(activeScreenIndex, "series", v)} required />
                    )}
                    {isVinyl && (
                      <>
                        <FieldPicker label="Window Config" value={sel.vinylWindowConfig}
                          options={VINYL_WINDOW_CONFIGS}
                          onSelect={(v) => order.updateSelection(activeScreenIndex, "vinylWindowConfig", v)} />
                        <FieldPicker label="Orientation" value={sel.vinylOrientation}
                          options={VINYL_ORIENTATIONS}
                          onSelect={(v) => order.updateSelection(activeScreenIndex, "vinylOrientation", v)} />
                      </>
                    )}
                    {colorOptions.length > 0 && (
                      <FieldPicker label="Screen Color" value={sel.screenColor}
                        options={colorOptions}
                        onSelect={(v) => order.updateSelection(activeScreenIndex, "screenColor", v)} required />
                    )}
                  </View>
                  <View style={styles.col}>
                    <SubSectionHeader title="Frame" colors={colors} />
                    <FieldPicker label="Frame Collection" value={sel.frameColorCollection}
                      options={frameCollections}
                      onSelect={(v) => order.updateSelection(activeScreenIndex, "frameColorCollection", v)} required />
                    {frameColors.length > 0 && (
                      <FieldPicker label="Frame Color" value={sel.frameColor}
                        options={frameColors}
                        onSelect={(v) => order.updateSelection(activeScreenIndex, "frameColor", v)} required />
                    )}
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              </>
            )}

            {/* Install Mount / Motor Side / Remote — one row */}
            <View style={styles.row3Col}>
              <View style={styles.col}>
                <FieldPicker label="Install Mount Type" value={sel.installMount}
                  options={INSTALL_MOUNT_OPTIONS}
                  onSelect={(v) => order.updateSelection(activeScreenIndex, "installMount", v)} required />
              </View>
              <View style={styles.col}>
                <FieldPicker label="Motor Side" value={sel.motorSide}
                  options={MOTOR_SIDE_OPTIONS}
                  onSelect={(v) => order.updateSelection(activeScreenIndex, "motorSide", v)} required />
              </View>
              <View style={styles.col}>
                <FieldPicker label="Remote" value={sel.remoteOption}
                  options={remoteOptions}
                  onSelect={(v) => order.updateSelection(activeScreenIndex, "remoteOption", v)}
                  placeholder={state.globalMotorType ? "— Select —" : "Select motor type first"}
                />
              </View>
            </View>

            {sel.installMount === "Face-mount" && (
              <FieldPicker label="Face Mount Sides" value={sel.faceMountSides}
                options={FACE_MOUNT_SIDES}
                onSelect={(v) => order.updateSelection(activeScreenIndex, "faceMountSides", v)} required />
            )}

            {/* ─── Measurements ──────────────────────────────────────── */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.measureSectionTitle, { color: colors.foreground }]}>Measurements</Text>

            {/* Reverse toggle */}
            <View style={[styles.reverseRow, { borderColor: colors.border }]}>
              <View style={styles.reverseLeft}>
                <Text style={[styles.reverseLabel, { color: colors.foreground }]}>Reverse measurements?</Text>
                <IconSymbol name="info.circle.fill" size={14} color={colors.muted} />
              </View>
              <View style={styles.yesNoRow}>
                <Pressable
                  onPress={() => { if (!screen.reversedMeasurements) order.toggleReverseMeasurements(activeScreenIndex); }}
                  style={[
                    styles.yesNoBtn,
                    screen.reversedMeasurements
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                  ]}
                >
                  <Text style={[styles.yesNoBtnText, { color: screen.reversedMeasurements ? "#fff" : colors.foreground }]}>Yes</Text>
                </Pressable>
                <Pressable
                  onPress={() => { if (screen.reversedMeasurements) order.toggleReverseMeasurements(activeScreenIndex); }}
                  style={[
                    styles.yesNoBtn,
                    !screen.reversedMeasurements
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                  ]}
                >
                  <Text style={[styles.yesNoBtnText, { color: !screen.reversedMeasurements ? "#fff" : colors.foreground }]}>No</Text>
                </Pressable>
              </View>
              {screen.reversedMeasurements && (
                <Text style={[styles.reverseHint, { color: colors.muted }]}>
                  If active, Left and Right values are swapped for all calculations.
                </Text>
              )}
            </View>

            {/* Measurement grid: Left + Right side by side, Horizontal full-width below */}
            <View style={styles.measureGrid}>
              {/* Top row: LEFT SIDE + RIGHT SIDE */}
              <View style={styles.measureTopRow}>
                {/* LEFT SIDE */}
                <View style={[styles.measureCol, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.measureColHeader, { color: colors.foreground }]}>LEFT SIDE</Text>
                  {(["upperLeft", "lowerLeft", "overallLeft"] as MeasurementPoint[]).map((pt) => (
                    <MeasurementInput
                      key={pt}
                      label={MEASUREMENT_LABELS[pt]}
                      shortLabel={MEASUREMENT_SHORT_LABELS[pt]}
                      value={screen.measurements[pt]}
                      onChange={(v) => order.updateMeasurement(activeScreenIndex, pt, v)}
                      required={pt === "upperLeft" || pt === "overallLeft"}
                    />
                  ))}
                  {leftSideMismatch && (
                    <View style={[styles.inlineWarning, { backgroundColor: "#FFF3CD", borderColor: "#FFCC02" }]}>
                      <Text style={styles.inlineWarningIcon}>⚠️</Text>
                      <Text style={[styles.inlineWarningText, { color: "#856404" }]}>
                        UL + LL must equal OL within 1/8".
                      </Text>
                    </View>
                  )}
                </View>

                {/* RIGHT SIDE */}
                <View style={[styles.measureCol, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.measureColHeader, { color: colors.foreground }]}>RIGHT SIDE</Text>
                  {(["upperRight", "lowerRight", "overallRight"] as MeasurementPoint[]).map((pt) => (
                    <MeasurementInput
                      key={pt}
                      label={MEASUREMENT_LABELS[pt]}
                      shortLabel={MEASUREMENT_SHORT_LABELS[pt]}
                      value={screen.measurements[pt]}
                      onChange={(v) => order.updateMeasurement(activeScreenIndex, pt, v)}
                      required={pt === "upperRight" || pt === "overallRight"}
                    />
                  ))}
                  {rightSideMismatch && (
                    <View style={[styles.inlineWarning, { backgroundColor: "#FFF3CD", borderColor: "#FFCC02" }]}>
                      <Text style={styles.inlineWarningIcon}>⚠️</Text>
                      <Text style={[styles.inlineWarningText, { color: "#856404" }]}>
                        UR + LR must equal OR within 1/8".
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Bottom row: HORIZONTAL full-width */}
              <View style={[styles.measureHorizRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.measureColHeader, { color: colors.foreground }]}>HORIZONTAL</Text>
                <View style={styles.horizInputs}>
                  {(["top", "middle", "bottom"] as MeasurementPoint[]).map((pt) => (
                    <View key={pt} style={styles.horizInputCol}>
                      <MeasurementInput
                        label={MEASUREMENT_LABELS[pt]}
                        shortLabel={MEASUREMENT_SHORT_LABELS[pt]}
                        value={screen.measurements[pt]}
                        onChange={(v) => order.updateMeasurement(activeScreenIndex, pt, v)}
                        required={pt === "top" || pt === "bottom"}
                      />
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* # of Cuts */}
            <FormInput label="# of Cuts" value={screen.numberOfCuts}
              onChangeText={(v) => order.updateScreenField(activeScreenIndex, "numberOfCuts", v)}
              placeholder="e.g., 2" keyboardType="number-pad" />

            {/* Special Instructions */}
            <FormInput label="Special Instructions" value={screen.specialInstructions}
              onChangeText={(v) => order.updateScreenField(activeScreenIndex, "specialInstructions", v)}
              placeholder="Type any special notes for this screen..." multiline />

            {/* ─── Photos ──────────────────────────────────────────── */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.measureSectionTitle, { color: colors.foreground }]}>Measurement Photos</Text>

            <View style={styles.photosGrid}>
              {screen.photos.map((photo, pIdx) => (
                <View key={`photo-${pIdx}`} style={[styles.photoThumb, { borderColor: colors.border }]}>
                  <Image source={{ uri: photo.uri }} style={styles.photoImage} resizeMode="cover" />
                  <Pressable
                    onPress={() => order.removePhoto(activeScreenIndex, pIdx)}
                    style={({ pressed }) => [
                      styles.photoRemoveBtn,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <IconSymbol name="xmark" size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}

              {/* Add Photo buttons */}
              <Pressable
                onPress={async () => {
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ["images"],
                    allowsMultipleSelection: true,
                    quality: 0.8,
                    base64: true,
                  });
                  if (!result.canceled && result.assets.length > 0) {
                    const newPhotos: ScreenPhoto[] = result.assets.map((a) => ({
                      uri: a.uri,
                      base64DataUri: a.base64 ? `data:image/jpeg;base64,${a.base64}` : undefined,
                      width: a.width,
                      height: a.height,
                    }));
                    order.addPhotos(activeScreenIndex, newPhotos);
                  }
                }}
                style={({ pressed }) => [
                  styles.addPhotoBtn,
                  { borderColor: colors.border, backgroundColor: colors.background },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <IconSymbol name="photo.on.rectangle" size={24} color={colors.muted} />
                <Text style={[styles.addPhotoText, { color: colors.muted }]}>Gallery</Text>
              </Pressable>

              <Pressable
                onPress={async () => {
                  const { status } = await ImagePicker.requestCameraPermissionsAsync();
                  if (status !== "granted") {
                    Alert.alert("Permission Required", "Camera access is needed to take photos.");
                    return;
                  }
                  const result = await ImagePicker.launchCameraAsync({
                    quality: 0.8,
                    base64: true,
                  });
                  if (!result.canceled && result.assets.length > 0) {
                    const a = result.assets[0];
                    order.addPhotos(activeScreenIndex, [{
                      uri: a.uri,
                      base64DataUri: a.base64 ? `data:image/jpeg;base64,${a.base64}` : undefined,
                      width: a.width,
                      height: a.height,
                    }]);
                  }
                }}
                style={({ pressed }) => [
                  styles.addPhotoBtn,
                  { borderColor: colors.border, backgroundColor: colors.background },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <IconSymbol name="camera.fill" size={24} color={colors.muted} />
                <Text style={[styles.addPhotoText, { color: colors.muted }]}>Camera</Text>
              </Pressable>
            </View>

          </View>
          {/* End per-screen card */}

          {/* ═══════════════════════════════════════════════════════════════
              CALCULATED RESULTS & WARNINGS
              ═══════════════════════════════════════════════════════════════ */}
          <CalcResults calculations={screen.calculations} warnings={warnings} />

          {/* ═══════════════════════════════════════════════════════════════
              MATERIALS NOTES
              ═══════════════════════════════════════════════════════════════ */}
          {screen.calculations?.uChannelNeeded && (
            <>
              <SubSectionHeader title="U-Channel Notes" colors={colors} />
              <FormInput label="U-Channel Notes" value={screen.uChannelNotes}
                onChangeText={(v) => order.updateScreenField(activeScreenIndex, "uChannelNotes", v)}
                placeholder="Notes about U-channel requirements..." multiline />
            </>
          )}

          {screen.calculations?.buildOutNeeded && (
            <>
              <SubSectionHeader title="Build-out Details" colors={colors} />
              <View style={styles.row2Col}>
                <View style={styles.col}>
                  <FormInput label="Build-out Color" value={screen.buildOutColor}
                    onChangeText={(v) => order.updateScreenField(activeScreenIndex, "buildOutColor", v)}
                    placeholder="Color..." />
                </View>
                <View style={styles.col}>
                  <FormInput label="Build-out Notes" value={screen.buildOutNotes}
                    onChangeText={(v) => order.updateScreenField(activeScreenIndex, "buildOutNotes", v)}
                    placeholder="Notes..." />
                </View>
              </View>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              ACTIONS
              ═══════════════════════════════════════════════════════════════ */}
          <View style={styles.actionRow}>
            {state.screens.length > 1 && (
              <Pressable
                onPress={() => {
                  if (Platform.OS === "web") {
                    if (confirm("Remove this screen?")) order.removeScreen(activeScreenIndex);
                  } else {
                    Alert.alert("Remove Screen", "Are you sure?", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Remove", style: "destructive", onPress: () => order.removeScreen(activeScreenIndex) },
                    ]);
                  }
                }}
                style={({ pressed }) => [styles.removeBtn, { borderColor: colors.error }, pressed && { opacity: 0.7 }]}
              >
                <IconSymbol name="trash.fill" size={16} color={colors.error} />
                <Text style={[styles.removeBtnText, { color: colors.error }]}>Remove Screen</Text>
              </Pressable>
            )}
          </View>

          {/* Save / Load Order */}
          {isAuthenticated && (
            <View style={styles.saveLoadRow}>
              <Pressable
                onPress={handleSaveOrder}
                disabled={isSaving}
                style={({ pressed }) => [
                  styles.saveBtn,
                  { backgroundColor: colors.success },
                  pressed && { opacity: 0.8 },
                  isSaving && { opacity: 0.5 },
                ]}
              >
                <IconSymbol name="checkmark.circle.fill" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>
                  {isSaving ? "Saving..." : savedOrderId ? "Update Order" : "Save Order"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowSavedOrders(!showSavedOrders)}
                style={({ pressed }) => [
                  styles.loadBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <IconSymbol name="folder.fill" size={18} color={colors.primary} />
                <Text style={[styles.loadBtnText, { color: colors.primary }]}>
                  {showSavedOrders ? "Hide Saved" : "Load Order"}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Saved Orders List */}
          {showSavedOrders && savedOrders && savedOrders.length > 0 && (
            <View style={[styles.savedOrdersList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text className="text-sm font-semibold text-foreground mb-2">Saved Orders</Text>
              {savedOrders.map((o: any) => (
                <Pressable
                  key={o.id}
                  onPress={() => handleLoadOrder(o.orderData, o.id)}
                  style={({ pressed }) => [
                    styles.savedOrderItem,
                    { borderColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text className="text-sm font-medium text-foreground">{o.title}</Text>
                    <Text className="text-xs text-muted">
                      {o.screenCount} screen{o.screenCount > 1 ? "s" : ""} · {o.manufacturer || ""} · {o.status}
                    </Text>
                  </View>
                  <Text className="text-xs text-muted">
                    {new Date(o.updatedAt).toLocaleDateString()}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          {showSavedOrders && (!savedOrders || savedOrders.length === 0) && (
            <View style={[styles.savedOrdersList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text className="text-sm text-muted text-center py-4">No saved orders yet.</Text>
            </View>
          )}

          {/* Export to PDF */}
          <Pressable
            onPress={() => {
              const html = generateOrderPdfHtml(state);
              const title = `Screen Order - ${state.project.name || "Untitled"}`;
              setPdfPreview({ html, title, mode: "all" });
              router.push("/modules/pdf-preview" as any);
            }}
            style={({ pressed }) => [
              styles.exportBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
          >
            <IconSymbol name="doc.text.fill" size={18} color="#fff" />
            <Text style={styles.exportBtnText}>Preview PDF</Text>
          </Pressable>

          {/* Reset */}
          <Pressable
            onPress={() => {
              if (Platform.OS === "web") {
                if (confirm("Start a new order? All data will be cleared.")) order.resetOrder();
              } else {
                Alert.alert("New Order", "All data will be cleared.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Clear", style: "destructive", onPress: () => order.resetOrder() },
                ]);
              }
            }}
            style={({ pressed }) => [styles.textBtn, pressed && { opacity: 0.5 }]}
          >
            <Text style={[styles.textBtnText, { color: colors.muted }]}>Start New Order</Text>
          </Pressable>

        </ScrollView>
      </ScreenContainer>
    </>
  );
}

// ─── Reusable Sub-components ──────────────────────────────────────────────

function SectionHeader({ title, subtitle, colors }: {
  title: string; subtitle?: string; colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.sectionHeaderWrap}>
      <View style={[styles.sectionLine, { backgroundColor: colors.primary }]} />
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {subtitle && <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>{subtitle}</Text>}
    </View>
  );
}

function SubSectionHeader({ title, colors }: {
  title: string; colors: ReturnType<typeof useColors>;
}) {
  return (
    <Text style={[styles.subSectionTitle, { color: colors.foreground }]}>{title}</Text>
  );
}

function FormInput({
  label, value, onChangeText, placeholder, multiline, keyboardType,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; multiline?: boolean; keyboardType?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.formField}>
      <Text style={[styles.formLabel, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        keyboardType={keyboardType as any}
        style={[
          styles.formInput,
          { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
          multiline && { minHeight: 60, textAlignVertical: "top" },
        ]}
        returnKeyType={multiline ? "default" : "done"}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: { padding: 20, paddingBottom: 80 },

  // Section headers
  sectionHeaderWrap: { marginTop: 24, marginBottom: 16 },
  sectionLine: { height: 3, borderRadius: 2, marginBottom: 10 },
  sectionTitle: { fontSize: 20, fontWeight: "800" },
  sectionSubtitle: { fontSize: 13, marginTop: 2 },
  subSectionTitle: { fontSize: 15, fontWeight: "700", marginTop: 16, marginBottom: 10 },

  // Form
  formField: { marginBottom: 12 },
  formLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  formInput: {
    fontSize: 15, paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 10, borderWidth: 1,
  },

  // Layout
  row2Col: { flexDirection: "row", gap: 12 },
  row3Col: { flexDirection: "row", gap: 10 },
  row4Col: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  col: { flex: 1, minWidth: 120 },
  colSmall: { flex: 0.6, minWidth: 80 },

  // Divider
  divider: { height: 1, marginVertical: 16 },

  // All Same toggle
  allSameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  allSameLabel: { fontSize: 14, fontWeight: "600" },
  yesNoRow: { flexDirection: "row", gap: 0 },
  yesNoBtn: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 6,
  },
  yesNoBtnText: { fontSize: 14, fontWeight: "600" },

  // Global material
  globalMaterialRow: { flexDirection: "row", gap: 16 },

  // Screen tabs
  screenTabs: { marginBottom: 12 },
  tabsRow: { gap: 8 },
  screenTab: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  screenTabText: { fontSize: 14, fontWeight: "600" },

  // Screen card
  screenCard: {
    borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 8,
  },
  screenCardHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12,
  },
  screenCardTitle: { fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },

  // Measurements
  measureSectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  reverseRow: {
    flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10,
    paddingVertical: 10, marginBottom: 12, borderBottomWidth: 0.5,
  },
  reverseLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  reverseLabel: { fontSize: 14, fontWeight: "600" },
  reverseHint: { fontSize: 12, fontStyle: "italic", width: "100%" },

  measureGrid: { flexDirection: "column", gap: 8, marginBottom: 16 },
  measureTopRow: { flexDirection: "row", gap: 8 },
  measureCol: {
    flex: 1, borderRadius: 10, borderWidth: 1, padding: 10,
  },
  measureHorizRow: {
    borderRadius: 10, borderWidth: 1, padding: 10,
  },
  horizInputs: { flexDirection: "row", gap: 8 },
  horizInputCol: { flex: 1 },
  measureColHeader: {
    fontSize: 12, fontWeight: "800", textAlign: "center", marginBottom: 10,
    textTransform: "uppercase", letterSpacing: 0.8,
  },

  // Inline warning
  inlineWarning: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    padding: 8, borderRadius: 8, borderWidth: 1, marginTop: 4,
  },
  inlineWarningIcon: { fontSize: 12, marginTop: 1 },
  inlineWarningText: { fontSize: 11, fontWeight: "600", flex: 1, lineHeight: 15 },

  // Toggle (legacy)
  toggleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10, paddingHorizontal: 4, marginBottom: 8,
    borderBottomWidth: 0.5,
  },
  toggleLabel: { fontSize: 14, fontWeight: "500" },

  // Counter
  counterRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  counterBtn: {
    width: 36, height: 36, borderRadius: 8, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  counterBtnText: { fontSize: 20, fontWeight: "600" },
  counterValue: { fontSize: 18, fontWeight: "700", minWidth: 30, textAlign: "center" },

  // Actions
  actionRow: { marginTop: 20, gap: 12 },
  removeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 12, borderRadius: 10, borderWidth: 1, gap: 8,
  },
  removeBtnText: { fontSize: 14, fontWeight: "600" },
  textBtn: { alignItems: "center", paddingVertical: 16 },
  textBtnText: { fontSize: 14, fontWeight: "500" },

  // Preview button
  previewBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1,
  },
  previewBtnText: { fontSize: 13, fontWeight: "600" },

  // Export button
  exportBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 14, borderRadius: 12, gap: 10, marginTop: 16,
  },
  exportBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  // Photos
  photosGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8,
  },
  photoThumb: {
    width: 90, height: 90, borderRadius: 10, borderWidth: 1, overflow: "hidden",
    position: "relative",
  },
  photoImage: {
    width: "100%", height: "100%",
  },
  photoRemoveBtn: {
    position: "absolute", top: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center", justifyContent: "center",
  },
  addPhotoBtn: {
    width: 90, height: 90, borderRadius: 10, borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", gap: 4,
  },
  addPhotoText: {
    fontSize: 11, fontWeight: "600",
  },
  // Save / Load
  saveLoadRow: {
    flexDirection: "row", gap: 10, marginTop: 16, marginBottom: 4,
  },
  saveBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 14, borderRadius: 10,
  },
  saveBtnText: {
    color: "#fff", fontSize: 15, fontWeight: "700",
  },
  loadBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 14, borderRadius: 10, borderWidth: 1,
  },
  loadBtnText: {
    fontSize: 15, fontWeight: "700",
  },
  savedOrdersList: {
    borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 8,
  },
  savedOrderItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10, borderBottomWidth: 1, gap: 8,
  },
});
