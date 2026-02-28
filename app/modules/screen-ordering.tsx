import { useState, useCallback } from "react";
import {
  Text, View, ScrollView, TextInput, Pressable, Alert, StyleSheet, Platform,
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
import { MEASUREMENT_POINTS, MEASUREMENT_LABELS, type MeasurementPoint } from "@/lib/screen-ordering/types";

type Step = "project" | "configure" | "summary";

export default function ScreenOrderingScreen() {
  const colors = useColors();
  const [step, setStep] = useState<Step>("project");
  const order = useScreenOrder();
  const { state, activeScreen, activeScreenIndex } = order;

  // ─── Step: Project Info ─────────────────────────────────────────────
  const renderProjectStep = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.stepTitle, { color: colors.foreground }]}>Project Information</Text>
      <Text style={[styles.stepSubtitle, { color: colors.muted }]}>
        Enter the project details before configuring screens.
      </Text>

      <View style={styles.formSection}>
        <FormInput label="Project Name *" value={state.project.name}
          onChangeText={(v) => order.updateProject({ name: v })} placeholder="e.g., Smith Residence" />
        <FormInput label="Submitter Name *" value={state.project.submitterName}
          onChangeText={(v) => order.updateProject({ submitterName: v })} placeholder="Your name" />
        <FormInput label="Job Number" value={state.project.jobNumber}
          onChangeText={(v) => order.updateProject({ jobNumber: v })} placeholder="Optional" />
        <FormInput label="Address" value={state.project.address}
          onChangeText={(v) => order.updateProject({ address: v })} placeholder="Site address" />

        <FieldPicker
          label="Manufacturer"
          value={state.manufacturer}
          options={["DOS Screens", "MagnaTrack"]}
          onSelect={(v) => order.setManufacturer(v as ScreenManufacturer)}
          required
        />
      </View>

      <Pressable
        onPress={() => {
          if (!order.isProjectValid) {
            if (Platform.OS === "web") { alert("Please fill in Project Name and Submitter Name."); }
            else { Alert.alert("Missing Info", "Please fill in Project Name and Submitter Name."); }
            return;
          }
          setStep("configure");
        }}
        style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.primaryBtnText}>Continue to Screens</Text>
        <IconSymbol name="chevron.right" size={18} color="#fff" />
      </Pressable>
    </ScrollView>
  );

  // ─── Step: Configure Screens ────────────────────────────────────────
  const renderConfigureStep = () => {
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

    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Screen Tabs */}
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
            <Pressable
              onPress={order.addScreen}
              style={({ pressed }) => [styles.addScreenBtn, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
            >
              <IconSymbol name="plus.circle.fill" size={20} color={colors.primary} />
            </Pressable>
          </ScrollView>
        </View>

        {/* Screen Description */}
        <FormInput label="Screen Label" value={screen.description}
          onChangeText={(v) => order.updateScreenField(activeScreenIndex, "description", v)}
          placeholder={`Screen ${activeScreenIndex + 1}`} />

        {/* Screen Type Selection */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Screen Material</Text>
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

        {/* Frame & Motor */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Frame & Motor</Text>
        <FieldPicker label="Frame Collection" value={sel.frameColorCollection}
          options={frameCollections} onSelect={(v) => order.updateSelection(activeScreenIndex, "frameColorCollection", v)} required />
        {frameColors.length > 0 && (
          <FieldPicker label="Frame Color" value={sel.frameColor}
            options={frameColors} onSelect={(v) => order.updateSelection(activeScreenIndex, "frameColor", v)} required />
        )}
        <FieldPicker label="Motor Type" value={sel.motorType}
          options={motorTypes} onSelect={(v) => order.updateSelection(activeScreenIndex, "motorType", v)} required />
        {remoteOptions.length > 0 && (
          <FieldPicker label="Remote" value={sel.remoteOption}
            options={remoteOptions} onSelect={(v) => order.updateSelection(activeScreenIndex, "remoteOption", v)} />
        )}
        <FieldPicker label="Motor Side" value={sel.motorSide}
          options={MOTOR_SIDE_OPTIONS} onSelect={(v) => order.updateSelection(activeScreenIndex, "motorSide", v)} required />

        {/* Install */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Installation</Text>
        <FieldPicker label="Mount Type" value={sel.installMount}
          options={INSTALL_MOUNT_OPTIONS} onSelect={(v) => order.updateSelection(activeScreenIndex, "installMount", v)} required />
        {sel.installMount === "Face-mount" && (
          <FieldPicker label="Face Mount Sides" value={sel.faceMountSides}
            options={FACE_MOUNT_SIDES} onSelect={(v) => order.updateSelection(activeScreenIndex, "faceMountSides", v)} />
        )}

        {/* Measurements */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Measurements</Text>
        <Text style={[styles.sectionHint, { color: colors.muted }]}>
          Tap each field to enter feet, inches, and fractions.
        </Text>

        {/* Height measurements - left side */}
        <Text style={[styles.measureGroup, { color: colors.muted }]}>Left Side (Heights)</Text>
        <View style={styles.measureRow}>
          {(["upperLeft", "lowerLeft", "overallLeft"] as MeasurementPoint[]).map((pt) => (
            <MeasurementInput
              key={pt}
              label={MEASUREMENT_LABELS[pt]}
              value={screen.measurements[pt]}
              onChange={(v) => order.updateMeasurement(activeScreenIndex, pt, v)}
              required={pt === "upperLeft"}
            />
          ))}
        </View>

        {/* Height measurements - right side */}
        <Text style={[styles.measureGroup, { color: colors.muted }]}>Right Side (Heights)</Text>
        <View style={styles.measureRow}>
          {(["upperRight", "lowerRight", "overallRight"] as MeasurementPoint[]).map((pt) => (
            <MeasurementInput
              key={pt}
              label={MEASUREMENT_LABELS[pt]}
              value={screen.measurements[pt]}
              onChange={(v) => order.updateMeasurement(activeScreenIndex, pt, v)}
              required={pt === "upperRight"}
            />
          ))}
        </View>

        {/* Width measurements */}
        <Text style={[styles.measureGroup, { color: colors.muted }]}>Widths</Text>
        <View style={styles.measureRow}>
          {(["top", "middle", "bottom"] as MeasurementPoint[]).map((pt) => (
            <MeasurementInput
              key={pt}
              label={MEASUREMENT_LABELS[pt]}
              value={screen.measurements[pt]}
              onChange={(v) => order.updateMeasurement(activeScreenIndex, pt, v)}
              required={pt === "top" || pt === "bottom"}
            />
          ))}
        </View>

        {/* Calculation Results */}
        <CalcResults calculations={screen.calculations} />

        {/* Special Instructions */}
        <View style={{ marginTop: 16 }}>
          <FormInput label="Special Instructions" value={screen.specialInstructions}
            onChangeText={(v) => order.updateScreenField(activeScreenIndex, "specialInstructions", v)}
            placeholder="Any special notes..." multiline />
        </View>

        {/* Remove Screen */}
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

        {/* Navigation */}
        <View style={styles.navRow}>
          <Pressable
            onPress={() => setStep("project")}
            style={({ pressed }) => [styles.secondaryBtn, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Back</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              order.recalculateAll();
              setStep("summary");
            }}
            style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary, flex: 1 }, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.primaryBtnText}>Review Order</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  };

  // ─── Step: Summary ──────────────────────────────────────────────────
  const renderSummaryStep = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.stepTitle, { color: colors.foreground }]}>Order Summary</Text>

      {/* Project Info Card */}
      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Project</Text>
        <SummaryRow label="Name" value={state.project.name} colors={colors} />
        <SummaryRow label="Submitter" value={state.project.submitterName} colors={colors} />
        {state.project.jobNumber ? <SummaryRow label="Job #" value={state.project.jobNumber} colors={colors} /> : null}
        {state.project.address ? <SummaryRow label="Address" value={state.project.address} colors={colors} /> : null}
        <SummaryRow label="Manufacturer" value={state.manufacturer} colors={colors} />
        <SummaryRow label="Total Screens" value={String(state.screens.length)} colors={colors} />
      </View>

      {/* Screen Cards */}
      {state.screens.map((screen, i) => (
        <View key={screen.id} style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            {screen.description || `Screen ${i + 1}`}
          </Text>
          <SummaryRow label="Screen Type" value={screen.selections.screenType} colors={colors} />
          {screen.selections.series ? <SummaryRow label="Series" value={screen.selections.series} colors={colors} /> : null}
          <SummaryRow label="Color" value={screen.selections.screenColor} colors={colors} />
          <SummaryRow label="Frame" value={`${screen.selections.frameColorCollection} — ${screen.selections.frameColor}`} colors={colors} />
          <SummaryRow label="Motor" value={`${screen.selections.motorType} (${screen.selections.motorSide})`} colors={colors} />
          <SummaryRow label="Mount" value={screen.selections.installMount} colors={colors} />
          {screen.calculations && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <SummaryRow label="Slope" value={`${screen.calculations.upperSlopeIn?.toFixed(2) ?? "—"}" ${screen.calculations.slopeDirection ?? ""}`} colors={colors} />
              <SummaryRow label="Track-to-Track" value={screen.calculations.trackToTrackIn != null ? `${screen.calculations.trackToTrackIn.toFixed(2)}"` : "—"} colors={colors} />
              <SummaryRow label="U-Channel" value={screen.calculations.uChannelNeeded ? "REQUIRED" : "Not needed"} colors={colors}
                valueColor={screen.calculations.uChannelNeeded ? colors.warning : undefined} />
              <SummaryRow label="Build-out" value={screen.calculations.buildOutType} colors={colors}
                valueColor={screen.calculations.buildOutType === "FLAG" ? colors.error : screen.calculations.buildOutType !== "None" ? colors.warning : undefined} />
            </>
          )}
          {screen.specialInstructions ? (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.specialInstr, { color: colors.muted }]}>Notes: {screen.specialInstructions}</Text>
            </>
          ) : null}
        </View>
      ))}

      {/* Actions */}
      <View style={styles.navRow}>
        <Pressable
          onPress={() => setStep("configure")}
          style={({ pressed }) => [styles.secondaryBtn, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Edit</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            if (Platform.OS === "web") { alert("Order submitted! PDF generation coming soon."); }
            else { Alert.alert("Order Submitted", "Your order has been recorded. PDF generation coming soon."); }
          }}
          style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary, flex: 1 }, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.primaryBtnText}>Submit Order</Text>
        </Pressable>
      </View>

      {/* New Order */}
      <Pressable
        onPress={() => {
          order.resetOrder();
          setStep("project");
        }}
        style={({ pressed }) => [styles.textBtn, pressed && { opacity: 0.5 }]}
      >
        <Text style={[styles.textBtnText, { color: colors.muted }]}>Start New Order</Text>
      </Pressable>
    </ScrollView>
  );

  return (
    <>
      <Stack.Screen options={{ title: "Screen Ordering" }} />
      <ScreenContainer edges={["left", "right"]}>
        {step === "project" && renderProjectStep()}
        {step === "configure" && renderConfigureStep()}
        {step === "summary" && renderSummaryStep()}
      </ScreenContainer>
    </>
  );
}

// ─── Reusable Sub-components ──────────────────────────────────────────────

function FormInput({
  label, value, onChangeText, placeholder, multiline,
}: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; multiline?: boolean;
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
        style={[
          styles.formInput,
          { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
          multiline && { minHeight: 80, textAlignVertical: "top" },
        ]}
        returnKeyType={multiline ? "default" : "done"}
      />
    </View>
  );
}

function SummaryRow({
  label, value, colors, valueColor,
}: {
  label: string; value: string; colors: ReturnType<typeof useColors>; valueColor?: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: valueColor ?? colors.foreground }]} numberOfLines={2}>
        {value || "—"}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: { padding: 20, paddingBottom: 60 },
  stepTitle: { fontSize: 26, fontWeight: "800", marginBottom: 6 },
  stepSubtitle: { fontSize: 14, marginBottom: 24, lineHeight: 20 },
  formSection: { marginBottom: 8 },
  formField: { marginBottom: 14 },
  formLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  formInput: {
    fontSize: 15, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 10, borderWidth: 1,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginTop: 20, marginBottom: 12 },
  sectionHint: { fontSize: 13, marginBottom: 12, lineHeight: 18 },
  measureGroup: { fontSize: 12, fontWeight: "600", marginTop: 8, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  measureRow: { flexDirection: "row", gap: 8 },
  screenTabs: { marginBottom: 16 },
  tabsRow: { gap: 8 },
  screenTab: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  screenTabText: { fontSize: 14, fontWeight: "600" },
  addScreenBtn: {
    width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },
  removeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 12, borderRadius: 10, borderWidth: 1, marginTop: 20, gap: 8,
  },
  removeBtnText: { fontSize: 14, fontWeight: "600" },
  navRow: { flexDirection: "row", gap: 12, marginTop: 28 },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 15, borderRadius: 12, gap: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryBtn: {
    paddingVertical: 15, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1,
    alignItems: "center",
  },
  secondaryBtnText: { fontSize: 16, fontWeight: "600" },
  textBtn: { alignItems: "center", paddingVertical: 16 },
  textBtnText: { fontSize: 14, fontWeight: "500" },
  summaryCard: {
    borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  summaryRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 6,
  },
  summaryLabel: { fontSize: 13, flex: 1 },
  summaryValue: { fontSize: 14, fontWeight: "600", flex: 1.5, textAlign: "right" },
  divider: { height: 1, marginVertical: 10 },
  specialInstr: { fontSize: 13, fontStyle: "italic", marginTop: 4 },
});
