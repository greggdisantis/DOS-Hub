import { Text, View, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { formatInchesFrac } from "@/lib/screen-ordering/calculations";
import type { ScreenCalculations } from "@/lib/screen-ordering/types";

interface CalcResultsProps {
  calculations: ScreenCalculations | null;
  warnings?: string[];
}

export function CalcResults({ calculations, warnings }: CalcResultsProps) {
  const colors = useColors();

  if (!calculations) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.emptyText, { color: colors.muted }]}>
          Enter measurements above to see calculated results.
        </Text>
      </View>
    );
  }

  const c = calculations;
  const buildOutColor =
    c.buildOutType === "FLAG" ? colors.error :
    c.buildOutNeeded ? colors.warning : colors.success;
  const uChannelColor = c.uChannelNeeded ? colors.warning : colors.success;

  const rows: { label: string; value: string; color?: string }[] = [
    { label: "Upper Slope (S)", value: formatInchesFrac(c.upperSlopeIn) },
    { label: "Left Height", value: formatInchesFrac(c.leftHeightIn) },
    { label: "Right Height", value: formatInchesFrac(c.rightHeightIn) },
    {
      label: "Slope Direction",
      value: c.slopeDirection === "Left" ? "Left to Right"
        : c.slopeDirection === "Right" ? "Right to Left"
        : c.slopeDirection ?? "—",
    },
    { label: "High Side", value: c.highSide ?? "—" },
    { label: "Low Side", value: c.lowSide ?? "—" },
    { label: "Track to Track", value: formatInchesFrac(c.trackToTrackIn) },
    { label: "Top–Bottom Diff", value: formatInchesFrac(c.tbDiffIn) },
    { label: "U-Channel", value: c.uChannelNeeded ? "REQUIRED" : "Not needed", color: uChannelColor },
    {
      label: "Build-out",
      value: c.buildOutType === "FLAG" ? "FLAG — Review Needed"
        : c.buildOutNeeded ? `Required (${c.buildOutType})`
        : "Not needed",
      color: buildOutColor,
    },
    { label: "Bias", value: formatInchesFrac(c.biasIn) },
  ];

  // Only show extended hood if it has a value
  if (c.extendedHoodIn != null) {
    rows.push({ label: "Extended Hood", value: formatInchesFrac(c.extendedHoodIn) });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>Calculated Results</Text>

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <View style={[styles.warningBox, { backgroundColor: colors.error + "15", borderColor: colors.error }]}>
          {warnings.map((w, i) => (
            <View key={i} style={styles.warningRow}>
              <Text style={[styles.warningIcon]}>⚠️</Text>
              <Text style={[styles.warningText, { color: colors.error }]}>{w}</Text>
            </View>
          ))}
        </View>
      )}

      {rows.map((row) => (
        <View key={row.label} style={[styles.row, { borderBottomColor: colors.border }]}>
          <Text style={[styles.rowLabel, { color: colors.muted }]}>{row.label}</Text>
          <Text style={[styles.rowValue, { color: row.color ?? colors.foreground }]}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14, borderWidth: 1, padding: 16, marginTop: 16,
  },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  emptyText: { fontSize: 14, textAlign: "center", paddingVertical: 20 },
  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 10, borderBottomWidth: 0.5,
  },
  rowLabel: { fontSize: 14, flex: 1 },
  rowValue: { fontSize: 14, fontWeight: "600", flex: 1, textAlign: "right" },
  warningBox: {
    borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 12,
  },
  warningRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 4,
  },
  warningIcon: { fontSize: 14, marginTop: 1 },
  warningText: { fontSize: 13, fontWeight: "600", flex: 1, lineHeight: 18 },
});
