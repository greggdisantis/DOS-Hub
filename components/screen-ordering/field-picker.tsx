import { useState } from "react";
import { Text, View, Pressable, Modal, FlatList, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface FieldPickerProps {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export function FieldPicker({ label, value, options, onSelect, placeholder = "Select...", required }: FieldPickerProps) {
  const colors = useColors();
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.foreground }]}>
        {label}{required ? " *" : ""}
      </Text>
      <Pressable
        onPress={() => setVisible(true)}
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text
          style={[styles.triggerText, { color: value ? colors.foreground : colors.muted }]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>▼</Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{label}</Text>
              <Pressable onPress={() => setVisible(false)} style={({ pressed }) => [pressed && { opacity: 0.5 }]}>
                <Text style={[styles.doneBtn, { color: colors.primary }]}>Done</Text>
              </Pressable>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { onSelect(item); setVisible(false); }}
                  style={({ pressed }) => [
                    styles.option,
                    { borderBottomColor: colors.border },
                    item === value && { backgroundColor: colors.primary + "15" },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.optionText, { color: colors.foreground }, item === value && { color: colors.primary, fontWeight: "600" }]}>
                    {item}
                  </Text>
                  {item === value && <Text style={{ color: colors.primary }}>✓</Text>}
                </Pressable>
              )}
              style={{ maxHeight: 400 }}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  trigger: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1,
  },
  triggerText: { fontSize: 15, flex: 1, marginRight: 8 },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 34 },
  sheetHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 17, fontWeight: "700" },
  doneBtn: { fontSize: 16, fontWeight: "600" },
  option: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5,
  },
  optionText: { fontSize: 16 },
});
