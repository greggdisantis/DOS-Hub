import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

// ─── Checkbox Row ─────────────────────────────────────────────────────────────
interface CheckboxRowProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
  indent?: boolean;
}
export function CheckboxRow({ label, checked, onToggle, indent }: CheckboxRowProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.checkboxRow, indent && { paddingLeft: 28 }]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, { borderColor: checked ? colors.primary : colors.border, backgroundColor: checked ? colors.primary : "transparent" }]}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={[styles.checkboxLabel, { color: colors.foreground }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Y/N Toggle ───────────────────────────────────────────────────────────────
interface YNToggleProps {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}
export function YNToggle({ label, value, onChange }: YNToggleProps) {
  const colors = useColors();
  return (
    <View style={styles.ynRow}>
      <Text style={[styles.ynLabel, { color: colors.foreground }]}>{label}</Text>
      <View style={styles.ynButtons}>
        <TouchableOpacity
          style={[styles.ynBtn, value === true && { backgroundColor: colors.success, borderColor: colors.success }]}
          onPress={() => onChange(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.ynBtnText, { color: value === true ? "#fff" : colors.muted }]}>Y</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ynBtn, value === false && { backgroundColor: colors.error, borderColor: colors.error }]}
          onPress={() => onChange(false)}
          activeOpacity={0.7}
        >
          <Text style={[styles.ynBtnText, { color: value === false ? "#fff" : colors.muted }]}>N</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Text Field ───────────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
}
export function Field({ label, value, onChangeText, placeholder, multiline, required }: FieldProps) {
  const colors = useColors();
  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>
        {label}{required && <Text style={{ color: colors.error }}> *</Text>}
      </Text>
      <TextInput
        style={[
          styles.fieldInput,
          { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface },
          multiline && { height: 80, textAlignVertical: "top" },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? ""}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        returnKeyType={multiline ? undefined : "done"}
      />
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
export function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <View style={[styles.sectionHeader, { backgroundColor: "#1E3A5F" }]}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

// ─── Accessory Row ────────────────────────────────────────────────────────────
interface AccessoryRowProps {
  label: string;
  checked: boolean;
  qty: string;
  location: string;
  switchLocation?: string;
  onToggle: () => void;
  onQtyChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  onSwitchChange?: (v: string) => void;
}
export function AccessoryRow({
  label, checked, qty, location, switchLocation,
  onToggle, onQtyChange, onLocationChange, onSwitchChange,
}: AccessoryRowProps) {
  const colors = useColors();
  return (
    <View style={[styles.accessoryRow, { borderBottomColor: colors.border }]}>
      <TouchableOpacity style={styles.accessoryCheck} onPress={onToggle} activeOpacity={0.7}>
        <View style={[styles.checkbox, { borderColor: checked ? colors.primary : colors.border, backgroundColor: checked ? colors.primary : "transparent" }]}>
          {checked && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={[styles.accessoryLabel, { color: colors.foreground }]}>{label}</Text>
      </TouchableOpacity>
      <View style={styles.accessoryFields}>
        <TextInput
          style={[styles.accessoryInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface, width: 50 }]}
          value={qty}
          onChangeText={onQtyChange}
          placeholder="Qty"
          placeholderTextColor={colors.muted}
          keyboardType="numeric"
          returnKeyType="done"
        />
        <TextInput
          style={[styles.accessoryInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface, flex: 1 }]}
          value={location}
          onChangeText={onLocationChange}
          placeholder="Location"
          placeholderTextColor={colors.muted}
          returnKeyType="done"
        />
        {onSwitchChange !== undefined && (
          <TextInput
            style={[styles.accessoryInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface, flex: 1 }]}
            value={switchLocation ?? ""}
            onChangeText={onSwitchChange}
            placeholder="Switch"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
          />
        )}
      </View>
    </View>
  );
}

// ─── Work Item Block ──────────────────────────────────────────────────────────
interface WorkItemBlockProps {
  title: string;
  item: {
    needed: boolean | null;
    additionalCost: boolean | null;
    addendumNeeded: boolean | null;
    responsibleParty: "CUSTOMER" | "DOS" | "OTHER" | null;
    contractor: string;
    scopeOfWork: string;
  };
  onChange: (updates: Partial<WorkItemBlockProps["item"]>) => void;
}
export function WorkItemBlock({ title, item, onChange }: WorkItemBlockProps) {
  const colors = useColors();
  const parties = ["CUSTOMER", "DOS", "OTHER"] as const;
  return (
    <View style={[styles.workItemBlock, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={styles.workItemHeader}>
        <View style={[styles.checkbox, { borderColor: item.needed === true ? colors.primary : colors.border, backgroundColor: item.needed === true ? colors.primary : "transparent" }]}>
          {item.needed === true && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={[styles.workItemTitle, { color: colors.foreground }]}>{title}</Text>
      </View>
      <View style={styles.workItemRow}>
        <YNToggle label="Needed?" value={item.needed} onChange={(v) => onChange({ needed: v })} />
        <YNToggle label="Additional Cost?" value={item.additionalCost} onChange={(v) => onChange({ additionalCost: v })} />
        <YNToggle label="Addendum Needed?" value={item.addendumNeeded} onChange={(v) => onChange({ addendumNeeded: v })} />
      </View>
      <View style={styles.workItemPartyRow}>
        <Text style={[styles.fieldLabel, { color: colors.muted, marginBottom: 4 }]}>Responsible Party:</Text>
        <View style={styles.partyButtons}>
          {parties.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.partyBtn, { borderColor: item.responsibleParty === p ? colors.primary : colors.border, backgroundColor: item.responsibleParty === p ? colors.primary : "transparent" }]}
              onPress={() => onChange({ responsibleParty: p })}
              activeOpacity={0.7}
            >
              <Text style={[styles.partyBtnText, { color: item.responsibleParty === p ? "#fff" : colors.muted }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <Field label="Contractor" value={item.contractor} onChangeText={(v) => onChange({ contractor: v })} placeholder="Contractor name" />
      <Field label="Scope of Work" value={item.scopeOfWork} onChangeText={(v) => onChange({ scopeOfWork: v })} placeholder="Describe scope..." multiline />
    </View>
  );
}

const styles = StyleSheet.create({
  checkboxRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 16, gap: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  checkmark: { color: "#fff", fontSize: 13, fontWeight: "700" },
  checkboxLabel: { fontSize: 14, flex: 1, lineHeight: 20 },
  ynRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 16, gap: 8 },
  ynLabel: { fontSize: 13, flex: 1 },
  ynButtons: { flexDirection: "row", gap: 6 },
  ynBtn: { width: 36, height: 28, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center", borderColor: "#ccc" },
  ynBtnText: { fontSize: 12, fontWeight: "700" },
  fieldContainer: { paddingHorizontal: 16, paddingVertical: 6 },
  fieldLabel: { fontSize: 12, marginBottom: 4, fontWeight: "500" },
  fieldInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, minHeight: 40 },
  sectionHeader: { paddingHorizontal: 16, paddingVertical: 8, marginTop: 16, marginBottom: 4 },
  sectionHeaderText: { color: "#fff", fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  accessoryRow: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8, paddingHorizontal: 16 },
  accessoryCheck: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  accessoryLabel: { fontSize: 13, fontWeight: "500" },
  accessoryFields: { flexDirection: "row", gap: 6, paddingLeft: 32 },
  accessoryInput: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, minHeight: 34 },
  workItemBlock: { margin: 12, borderWidth: 1, borderRadius: 10, overflow: "hidden" },
  workItemHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, backgroundColor: "rgba(0,0,0,0.04)" },
  workItemTitle: { fontSize: 14, fontWeight: "700" },
  workItemRow: { paddingHorizontal: 4 },
  workItemPartyRow: { paddingHorizontal: 16, paddingVertical: 8 },
  partyButtons: { flexDirection: "row", gap: 8 },
  partyBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1.5 },
  partyBtnText: { fontSize: 12, fontWeight: "600" },
});
