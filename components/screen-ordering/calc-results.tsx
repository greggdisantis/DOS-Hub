import { Text, View, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { formatInches } from "@/lib/screen-ordering/calculations";
import type { ScreenCalculations } from "@/lib/screen-ordering/types";

interface CalcResultsProps {
  calculations: ScreenCalculations | null;
}

export function CalcResults({ calculations }: CalcResultsProps) {
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
    c.buildOutType !== "None" ? colors.warning : colors.success;
  const uChannelColor = c.uChannelNeeded ? colors.warning : colors.success;

  const rows: { label: string; value: string; color?: string }[] = [
    { label: "Upper Slope (S)", value: formatInches(c.upperSlopeIn) },
    { label: "Left Height", value: formatInches(c.leftHeightIn) },
    { label: "Right Height", value: formatInches(c.rightHeightIn) },
    { label: "Slope Direction", value: c.slopeDirection ?? "—" },
    { label: "High Side", value: c.highSide ?? "—" },
    { label: "Track to Track", value: formatInches(c.trackToTrackIn) },
    { label: "Top–Bottom Diff", value: formatInches(c.tbDiffIn) },
    { label: "U-Channel", value: c.uChannelNeeded ? "REQUIRED" : "Not needed", color: uChannelColor },
    { label: "Build-out", value: c.buildOutType === "FLAG" ? "⚠ REVIEW NEEDED" : c.buildOutType, color: buildOutColor },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>Calculated Results</Text>
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
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 14, fontWeight: "600" },
});
