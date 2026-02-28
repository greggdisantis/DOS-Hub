import { useState, useCallback } from "react";
import { Text, View, TextInput, Pressable, Modal, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { FRACTION_OPTIONS } from "@/lib/screen-ordering/constants";

interface MeasurementInputProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  required?: boolean;
}

export function MeasurementInput({ label, value, onChange, required }: MeasurementInputProps) {
  const colors = useColors();
  const [showPicker, setShowPicker] = useState(false);

  // Break value into feet, inches, fraction
  const feet = value != null ? Math.floor(value / 12) : 0;
  const totalInches = value != null ? value % 12 : 0;
  const wholeInches = Math.floor(totalInches);
  const fracValue = totalInches - wholeInches;

  const [editFeet, setEditFeet] = useState(String(feet));
  const [editInches, setEditInches] = useState(String(wholeInches));
  const [editFrac, setEditFrac] = useState(fracValue);

  const openPicker = useCallback(() => {
    const f = value != null ? Math.floor(value / 12) : 0;
    const ti = value != null ? value % 12 : 0;
    const wi = Math.floor(ti);
    const fv = ti - wi;
    setEditFeet(String(f));
    setEditInches(String(wi));
    setEditFrac(Math.round(fv * 16) / 16);
    setShowPicker(true);
  }, [value]);

  const applyValue = useCallback(() => {
    const f = parseInt(editFeet, 10) || 0;
    const i = parseInt(editInches, 10) || 0;
    const total = f * 12 + i + editFrac;
    onChange(total > 0 ? total : null);
    setShowPicker(false);
  }, [editFeet, editInches, editFrac, onChange]);

  const displayValue = value != null ? formatDisplay(value) : "—";

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.foreground }]} numberOfLines={1}>
        {label}{required ? " *" : ""}
      </Text>
      <Pressable
        onPress={openPicker}
        style={({ pressed }) => [
          styles.valueBox,
          { backgroundColor: colors.surface, borderColor: value != null ? colors.primary + "50" : colors.border },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={[styles.valueText, { color: value != null ? colors.foreground : colors.muted }]}>
          {displayValue}
        </Text>
      </Pressable>

      <Modal visible={showPicker} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowPicker(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{label}</Text>
              <Pressable onPress={applyValue} style={({ pressed }) => [pressed && { opacity: 0.5 }]}>
                <Text style={[styles.doneBtn, { color: colors.primary }]}>Done</Text>
              </Pressable>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.muted }]}>Feet</Text>
                <TextInput
                  value={editFeet}
                  onChangeText={setEditFeet}
                  keyboardType="number-pad"
                  style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                  returnKeyType="done"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.muted }]}>Inches</Text>
                <TextInput
                  value={editInches}
                  onChangeText={setEditInches}
                  keyboardType="number-pad"
                  style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                  returnKeyType="done"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1.5 }]}>
                <Text style={[styles.inputLabel, { color: colors.muted }]}>Fraction</Text>
                <View style={styles.fracRow}>
                  {FRACTION_OPTIONS.filter((_, i) => i % 2 === 0).map((opt) => (
                    <Pressable
                      key={opt.label}
                      onPress={() => setEditFrac(opt.value)}
                      style={({ pressed }) => [
                        styles.fracChip,
                        { backgroundColor: editFrac === opt.value ? colors.primary : colors.surface, borderColor: colors.border },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={[styles.fracText, { color: editFrac === opt.value ? "#fff" : colors.foreground }]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <Pressable
              onPress={applyValue}
              style={({ pressed }) => [
                styles.applyBtn,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.applyBtnText}>Apply</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function formatDisplay(inches: number): string {
  const ft = Math.floor(inches / 12);
  const rem = inches % 12;
  const whole = Math.floor(rem);
  const frac = rem - whole;
  let fracStr = "";
  if (frac > 0.01) {
    const sixteenths = Math.round(frac * 16);
    if (sixteenths > 0 && sixteenths < 16) {
      const g = gcd(sixteenths, 16);
      fracStr = ` ${sixteenths / g}/${16 / g}`;
    }
  }
  if (ft > 0) return `${ft}' ${whole}${fracStr}"`;
  return `${whole}${fracStr}"`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

const styles = StyleSheet.create({
  container: { flex: 1, marginBottom: 8 },
  label: { fontSize: 11, fontWeight: "600", marginBottom: 4, textAlign: "center" },
  valueBox: {
    paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8,
    borderWidth: 1, alignItems: "center",
  },
  valueText: { fontSize: 14, fontWeight: "500" },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  sheetHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingBottom: 16, borderBottomWidth: 1, marginBottom: 20,
  },
  sheetTitle: { fontSize: 17, fontWeight: "700" },
  doneBtn: { fontSize: 16, fontWeight: "600" },
  inputRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 12, fontWeight: "500", marginBottom: 6 },
  textInput: {
    fontSize: 20, fontWeight: "600", textAlign: "center",
    paddingVertical: 12, borderRadius: 10, borderWidth: 1,
  },
  fracRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  fracChip: {
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
    minWidth: 40, alignItems: "center",
  },
  fracText: { fontSize: 13, fontWeight: "500" },
  applyBtn: {
    paddingVertical: 14, borderRadius: 12, alignItems: "center",
  },
  applyBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
