import { useState, useCallback, useEffect } from "react";
import { Text, View, TextInput, Pressable, Modal, ScrollView, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { FRACTION_OPTIONS } from "@/lib/screen-ordering/constants";

interface MeasurementInputProps {
  label: string;
  shortLabel: string;
  value: number | null;
  onChange: (value: number | null) => void;
  required?: boolean;
}

/**
 * Inline measurement input matching the original app:
 * [whole inches input] [fraction dropdown]
 * Each measurement shows the short label (e.g., "UL") and a whole-number text field + fraction picker.
 */
export function MeasurementInput({ label, shortLabel, value, onChange, required }: MeasurementInputProps) {
  const colors = useColors();
  const [showFracPicker, setShowFracPicker] = useState(false);

  // Decompose value into whole inches and fraction
  const wholeInches = value != null ? Math.floor(value) : null;
  const fracValue = value != null ? Math.round((value - Math.floor(value)) * 16) / 16 : 0;

  const [editWhole, setEditWhole] = useState(wholeInches != null ? String(wholeInches) : "");
  const [editFrac, setEditFrac] = useState(fracValue);

  // Sync when value changes externally
  useEffect(() => {
    if (value != null) {
      setEditWhole(String(Math.floor(value)));
      setEditFrac(Math.round((value - Math.floor(value)) * 16) / 16);
    } else {
      setEditWhole("");
      setEditFrac(0);
    }
  }, [value]);

  const commitValue = useCallback((whole: string, frac: number) => {
    const w = parseInt(whole, 10);
    if (isNaN(w) || w <= 0) {
      if (whole === "" || whole === "0") {
        onChange(null);
        return;
      }
    }
    const total = (isNaN(w) ? 0 : w) + frac;
    onChange(total > 0 ? total : null);
  }, [onChange]);

  const handleWholeChange = useCallback((text: string) => {
    // Only allow digits
    const cleaned = text.replace(/[^0-9]/g, "");
    setEditWhole(cleaned);
  }, []);

  const handleWholeBlur = useCallback(() => {
    commitValue(editWhole, editFrac);
  }, [editWhole, editFrac, commitValue]);

  const handleFracSelect = useCallback((frac: number) => {
    setEditFrac(frac);
    setShowFracPicker(false);
    commitValue(editWhole, frac);
  }, [editWhole, commitValue]);

  // Format fraction for display
  const fracDisplay = editFrac > 0 ? formatFraction(editFrac) : "0";

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.muted }]} numberOfLines={1}>
        {label} ({shortLabel}){required ? " *" : ""}
      </Text>
      <View style={styles.inputRow}>
        <TextInput
          value={editWhole}
          onChangeText={handleWholeChange}
          onBlur={handleWholeBlur}
          keyboardType="number-pad"
          placeholder="Enter value here"
          placeholderTextColor={colors.muted}
          style={[
            styles.wholeInput,
            {
              backgroundColor: "#EEF0F8",
              borderColor: colors.border,
              color: colors.foreground,
            },
          ]}
          returnKeyType="done"
        />
        <Pressable
          onPress={() => setShowFracPicker(true)}
          style={[
            styles.fracButton,
            {
              backgroundColor: "#EEF0F8",
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.fracButtonText, { color: colors.foreground }]}>
            {fracDisplay}
          </Text>
          <Text style={[styles.fracArrow, { color: colors.muted }]}>▼</Text>
        </Pressable>
      </View>

      {/* Fraction Picker Modal */}
      <Modal visible={showFracPicker} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowFracPicker(false)}>
          <View style={[styles.pickerSheet, { backgroundColor: colors.background }]}>
            <Text style={[styles.pickerTitle, { color: colors.foreground }]}>
              Select Fraction (1/16ths)
            </Text>
            <ScrollView style={styles.pickerScroll}>
              {FRACTION_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.label}
                  onPress={() => handleFracSelect(opt.value)}
                  style={({ pressed }) => [
                    styles.pickerItem,
                    { borderBottomColor: colors.border },
                    editFrac === opt.value && { backgroundColor: colors.primary + "20" },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      { color: editFrac === opt.value ? colors.primary : colors.foreground },
                      editFrac === opt.value && { fontWeight: "700" },
                    ]}
                  >
                    {opt.label === "0" ? "0" : opt.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function formatFraction(frac: number): string {
  if (frac <= 0) return "0";
  const sixteenths = Math.round(frac * 16);
  if (sixteenths <= 0 || sixteenths >= 16) return "0";
  const g = gcd(sixteenths, 16);
  return `${sixteenths / g}/${16 / g}`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

const styles = StyleSheet.create({
  container: { flex: 1, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  inputRow: { flexDirection: "row", gap: 6 },
  wholeInput: {
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  fracButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 60,
    justifyContent: "center",
    gap: 4,
  },
  fracButtonText: { fontSize: 14, fontWeight: "500" },
  fracArrow: { fontSize: 8 },
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.4)" },
  pickerSheet: {
    borderRadius: 14,
    padding: 16,
    width: "80%",
    maxWidth: 300,
    maxHeight: 400,
  },
  pickerTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  pickerScroll: { maxHeight: 300 },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  pickerItemText: { fontSize: 16, textAlign: "center" },
});
