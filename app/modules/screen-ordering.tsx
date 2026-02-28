import { useState, useCallback } from "react";
import {
  Text, View, ScrollView, TextInput, Pressable, Alert, StyleSheet, Platform, Switch,
} from "react-native";
import { Stack } from "expo-router";
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
} from "@/lib/screen-ordering/types";

export default function ScreenOrderingScreen() {
  const colors = useColors();
  const order = useScreenOrder();
  const { state, activeScreen, activeScreenIndex } = order;

  const screen = activeScreen;
  const sel = screen.selections;
  const mfr = state.manufacturer;

  // Determine which series options to show
  let seriesOptions: string[] = [];
  if (sel.screenType === "Twichell Solar") seriesOptions = TWICHELL_SOLAR_SERIES;
  else if (sel.screenType === "Ferrari Soltis") seriesOptions = FERRARI_SOLTIS_SERIES;

  const needsSeries = sel.screenType === "Twichell Solar" || sel.screenType === "Ferrari Soltis";
  const isVinyl = sel.screenType === "Vinyl";
  const colorOptions = getScreenColorOptions(sel.screenType, sel.series);
  const frameCollections = FRAME_COLOR_COLLECTIONS[mfr] ?? [];
  const frameColors = FRAME_COLORS[sel.frameColorCollection] ?? [];
  const motorTypes = MOTOR_TYPES[mfr] ?? [];
  const remoteOptions = REMOTE_OPTIONS[sel.motorType] ?? [];
  const warnings = order.getScreenWarnings(screen);

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
              GLOBAL SETTINGS
              ═══════════════════════════════════════════════════════════════ */}
          <SectionHeader title="Global Settings" colors={colors} />

          <View style={styles.row2Col}>
            <View style={styles.col}>
              <FieldPicker
                label="Manufacturer"
                value={state.manufacturer}
                options={["DOS Screens", "MagnaTrack"]}
                onSelect={(v) => order.setManufacturer(v as ScreenManufacturer)}
                required
              />
            </View>
            <View style={styles.col}>
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.foreground }]}>Total Screens</Text>
                <View style={styles.counterRow}>
                  <Pressable
                    onPress={() => order.setScreenCount(Math.max(1, state.screens.length - 1))}
                    style={({ pressed }) => [styles.counterBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={[styles.counterBtnText, { color: colors.foreground }]}>−</Text>
                  </Pressable>
                  <Text style={[styles.counterValue, { color: colors.foreground }]}>{state.screens.length}</Text>
                  <Pressable
                    onPress={() => order.setScreenCount(state.screens.length + 1)}
                    style={({ pressed }) => [styles.counterBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={[styles.counterBtnText, { color: colors.foreground }]}>+</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          {/* ═══════════════════════════════════════════════════════════════
              SCREEN TABS
              ═══════════════════════════════════════════════════════════════ */}
          {state.screens.length > 1 && (
            <View style={styles.screenTabs}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
                {state.screens.map((s, i) => (
                  <Pressable
                    key={s.id}
                    onPress={() => order.setActiveScreenIndex(i)}
                    style={({ pressed }) => [
                      styles.screenTab,
                      { backgroundColor: i === activeScreenIndex ? colors.primary : colors.surface, borderColor: colors.border },
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

          {/* ═══════════════════════════════════════════════════════════════
              PER-SCREEN CONFIGURATION
              ═══════════════════════════════════════════════════════════════ */}
          <SectionHeader
            title={`Screen ${activeScreenIndex + 1} of ${state.screens.length}`}
            subtitle={screen.description || undefined}
            colors={colors}
          />

          <FormInput label="Description" value={screen.description}
            onChangeText={(v) => order.updateScreenField(activeScreenIndex, "description", v)}
            placeholder={`Screen ${activeScreenIndex + 1} label`} />

          {/* Screen Material */}
          <SubSectionHeader title="Screen Material" colors={colors} />
          <FieldPicker label="Screen Type" value={sel.screenType}
            options={getScreenTypes(mfr)} onSelect={(v) => order.updateSelection(activeScreenIndex, "screenType", v)} required />
          {needsSeries && (
            <FieldPicker label="Series" value={sel.series}
              options={seriesOptions} onSelect={(v) => order.updateSelection(activeScreenIndex, "series", v)} required />
          )}
          {isVinyl && (
            <>
              <FieldPicker label="Window Config" value={sel.vinylWindowConfig}
                options={VINYL_WINDOW_CONFIGS} onSelect={(v) => order.updateSelection(activeScreenIndex, "vinylWindowConfig", v)} />
              <FieldPicker label="Orientation" value={sel.vinylOrientation}
                options={VINYL_ORIENTATIONS} onSelect={(v) => order.updateSelection(activeScreenIndex, "vinylOrientation", v)} />
            </>
          )}
          {colorOptions.length > 0 && (
            <FieldPicker label="Screen Color" value={sel.screenColor}
              options={colorOptions} onSelect={(v) => order.updateSelection(activeScreenIndex, "screenColor", v)} required />
          )}

          {/* Frame */}
          <SubSectionHeader title="Frame" colors={colors} />
          <FieldPicker label="Frame Collection" value={sel.frameColorCollection}
            options={frameCollections} onSelect={(v) => order.updateSelection(activeScreenIndex, "frameColorCollection", v)} required />
          {frameColors.length > 0 && (
            <FieldPicker label="Frame Color" value={sel.frameColor}
              options={frameColors} onSelect={(v) => order.updateSelection(activeScreenIndex, "frameColor", v)} required />
          )}

          {/* Motor */}
          <SubSectionHeader title="Motor" colors={colors} />
          <FieldPicker label="Motor Type" value={sel.motorType}
            options={motorTypes} onSelect={(v) => order.updateSelection(activeScreenIndex, "motorType", v)} required />
          {remoteOptions.length > 0 && (
            <FieldPicker label="Remote" value={sel.remoteOption}
              options={remoteOptions} onSelect={(v) => order.updateSelection(activeScreenIndex, "remoteOption", v)} />
          )}
          <View style={styles.row2Col}>
            <View style={styles.col}>
              <FieldPicker label="Motor Side" value={sel.motorSide}
                options={MOTOR_SIDE_OPTIONS} onSelect={(v) => order.updateSelection(activeScreenIndex, "motorSide", v)} required />
            </View>
            <View style={styles.col}>
              <FieldPicker label="Mount Type" value={sel.installMount}
                options={INSTALL_MOUNT_OPTIONS} onSelect={(v) => order.updateSelection(activeScreenIndex, "installMount", v)} required />
            </View>
          </View>
          {sel.installMount === "Face-mount" && (
            <FieldPicker label="Face Mount Sides" value={sel.faceMountSides}
              options={FACE_MOUNT_SIDES} onSelect={(v) => order.updateSelection(activeScreenIndex, "faceMountSides", v)} required />
          )}

          {/* ═══════════════════════════════════════════════════════════════
              MEASUREMENTS
              ═══════════════════════════════════════════════════════════════ */}
          <SectionHeader title="Measurements" colors={colors} />

          {/* Reverse toggle */}
          <View style={[styles.toggleRow, { borderColor: colors.border }]}>
            <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Reverse Measurements (swap L/R)</Text>
            <Switch
              value={screen.reversedMeasurements}
              onValueChange={() => order.toggleReverseMeasurements(activeScreenIndex)}
              trackColor={{ false: colors.border, true: colors.primary + "80" }}
              thumbColor={screen.reversedMeasurements ? colors.primary : "#f4f3f4"}
            />
          </View>

          {/* Left Side Heights */}
          <Text style={[styles.measureGroup, { color: colors.muted }]}>LEFT SIDE (Heights)</Text>
          <View style={styles.measureRow}>
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
          </View>

          {/* Right Side Heights */}
          <Text style={[styles.measureGroup, { color: colors.muted }]}>RIGHT SIDE (Heights)</Text>
          <View style={styles.measureRow}>
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
          </View>

          {/* Horizontal Widths */}
          <Text style={[styles.measureGroup, { color: colors.muted }]}>HORIZONTAL (Widths)</Text>
          <View style={styles.measureRow}>
            {(["top", "middle", "bottom"] as MeasurementPoint[]).map((pt) => (
              <MeasurementInput
                key={pt}
                label={MEASUREMENT_LABELS[pt]}
                shortLabel={MEASUREMENT_SHORT_LABELS[pt]}
                value={screen.measurements[pt]}
                onChange={(v) => order.updateMeasurement(activeScreenIndex, pt, v)}
                required={pt === "top" || pt === "bottom"}
              />
            ))}
          </View>

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
              MISC
              ═══════════════════════════════════════════════════════════════ */}
          <SectionHeader title="Misc" colors={colors} />
          <View style={styles.row2Col}>
            <View style={styles.col}>
              <FormInput label="Number of Cuts" value={screen.numberOfCuts}
                onChangeText={(v) => order.updateScreenField(activeScreenIndex, "numberOfCuts", v)}
                placeholder="e.g., 2" keyboardType="number-pad" />
            </View>
            <View style={styles.col}>
              <FormInput label="Special Instructions" value={screen.specialInstructions}
                onChangeText={(v) => order.updateScreenField(activeScreenIndex, "specialInstructions", v)}
                placeholder="Any special notes..." multiline />
            </View>
          </View>

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
  col: { flex: 1 },

  // Measurements
  measureGroup: {
    fontSize: 12, fontWeight: "700", marginTop: 12, marginBottom: 8,
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  measureRow: { flexDirection: "row", gap: 8 },

  // Toggle
  toggleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10, paddingHorizontal: 4, marginBottom: 8,
    borderBottomWidth: 0.5,
  },
  toggleLabel: { fontSize: 14, fontWeight: "500" },

  // Screen tabs
  screenTabs: { marginBottom: 8 },
  tabsRow: { gap: 8 },
  screenTab: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  screenTabText: { fontSize: 14, fontWeight: "600" },

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
});
