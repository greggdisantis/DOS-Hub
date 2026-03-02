import React from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Switch,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { ProjectSpecificItems } from "./types";

interface Props {
  value: ProjectSpecificItems;
  onChange: (v: ProjectSpecificItems) => void;
}

function NumInput({
  value,
  onChange,
  placeholder = "0",
  colors,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  colors: any;
}) {
  return (
    <TextInput
      style={[styles.numInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
      value={value !== null ? String(value) : ""}
      onChangeText={(t) => onChange(t === "" ? null : parseInt(t.replace(/[^0-9]/g, ""), 10) || null)}
      keyboardType="number-pad"
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      returnKeyType="done"
    />
  );
}

function Row({ label, children, colors }: { label: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
      <View style={styles.rowRight}>{children}</View>
    </View>
  );
}

function SectionHeader({ title, colors }: { title: string; colors: any }) {
  return (
    <View style={[styles.sectionHeader, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionHeaderText, { color: colors.primary }]}>{title}</Text>
    </View>
  );
}

export default function ProjectSpecificItemsForm({ value, onChange }: Props) {
  const colors = useColors();

  const set = <K extends keyof ProjectSpecificItems>(section: K, patch: Partial<ProjectSpecificItems[K]>) => {
    onChange({ ...value, [section]: { ...(value[section] as any), ...(patch as any) } });
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* ── Heaters ── */}
      <SectionHeader title="Heaters" colors={colors} />
      <Row label="Includes Heaters" colors={colors}>
        <Switch
          value={value.heaters.hasHeaters}
          onValueChange={(v) => set("heaters", { hasHeaters: v })}
          trackColor={{ true: colors.primary }}
        />
      </Row>
      {value.heaters.hasHeaters && (
        <>
          <Row label="Type" colors={colors}>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              value={value.heaters.type}
              onChangeText={(t) => set("heaters", { type: t })}
              placeholder="e.g. Infrared, Electric"
              placeholderTextColor={colors.muted}
            />
          </Row>
          <Row label="Color" colors={colors}>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              value={value.heaters.color}
              onChangeText={(t) => set("heaters", { color: t })}
              placeholder="e.g. Black, Silver"
              placeholderTextColor={colors.muted}
            />
          </Row>
          <Row label="Quantity" colors={colors}>
            <NumInput value={value.heaters.qty} onChange={(v) => set("heaters", { qty: v })} colors={colors} />
          </Row>
          <Row label="Relay Panel Needed" colors={colors}>
            <Switch
              value={value.heaters.relayPanelNeeded}
              onValueChange={(v) => set("heaters", { relayPanelNeeded: v })}
              trackColor={{ true: colors.primary }}
            />
          </Row>
        </>
      )}

      {/* ── Other Project Items ── */}
      <SectionHeader title="Other Project Items" colors={colors} />

      {/* J-Channel */}
      <View style={[styles.itemBlock, { borderBottomColor: colors.border }]}>
        <View style={styles.itemRow}>
          <Text style={[styles.rowLabel, { color: colors.foreground }]}>J-Channel</Text>
          <NumInput value={value.otherItems.jChannelQty} onChange={(v) => set("otherItems", { jChannelQty: v })} colors={colors} />
        </View>
        <TextInput
          style={[styles.noteInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
          value={value.otherItems.jChannelNote}
          onChangeText={(t) => set("otherItems", { jChannelNote: t })}
          placeholder="Note (color, size, etc.)"
          placeholderTextColor={colors.muted}
        />
      </View>

      {/* Lumber */}
      <View style={[styles.itemBlock, { borderBottomColor: colors.border }]}>
        <View style={styles.itemRow}>
          <Text style={[styles.rowLabel, { color: colors.foreground }]}>Lumber</Text>
          <NumInput value={value.otherItems.lumberQty} onChange={(v) => set("otherItems", { lumberQty: v })} colors={colors} />
        </View>
        <TextInput
          style={[styles.noteInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
          value={value.otherItems.lumberNote}
          onChangeText={(t) => set("otherItems", { lumberNote: t })}
          placeholder="Note (size, type, etc.)"
          placeholderTextColor={colors.muted}
        />
      </View>

      {/* Trim Coil */}
      <View style={[styles.itemBlock, { borderBottomColor: colors.border }]}>
        <View style={styles.itemRow}>
          <Text style={[styles.rowLabel, { color: colors.foreground }]}>Trim Coil</Text>
          <NumInput value={value.otherItems.trimCoilQty} onChange={(v) => set("otherItems", { trimCoilQty: v })} colors={colors} />
        </View>
        <TextInput
          style={[styles.noteInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
          value={value.otherItems.trimCoilNote}
          onChangeText={(t) => set("otherItems", { trimCoilNote: t })}
          placeholder="Note (color, width, etc.)"
          placeholderTextColor={colors.muted}
        />
      </View>

      {/* Custom Item 1 */}
      <View style={[styles.itemBlock, { borderBottomColor: colors.border }]}>
        <View style={styles.itemRow}>
          <TextInput
            style={[styles.customNameInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            value={value.otherItems.custom1}
            onChangeText={(t) => set("otherItems", { custom1: t })}
            placeholder="Custom item..."
            placeholderTextColor={colors.muted}
          />
          <NumInput value={value.otherItems.custom1Qty} onChange={(v) => set("otherItems", { custom1Qty: v })} colors={colors} />
        </View>
        <TextInput
          style={[styles.noteInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
          value={value.otherItems.custom1Note}
          onChangeText={(t) => set("otherItems", { custom1Note: t })}
          placeholder="Note..."
          placeholderTextColor={colors.muted}
        />
      </View>

      {/* Custom Item 2 */}
      <View style={[styles.itemBlock, { borderBottomColor: colors.border }]}>
        <View style={styles.itemRow}>
          <TextInput
            style={[styles.customNameInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            value={value.otherItems.custom2}
            onChangeText={(t) => set("otherItems", { custom2: t })}
            placeholder="Custom item..."
            placeholderTextColor={colors.muted}
          />
          <NumInput value={value.otherItems.custom2Qty} onChange={(v) => set("otherItems", { custom2Qty: v })} colors={colors} />
        </View>
        <TextInput
          style={[styles.noteInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
          value={value.otherItems.custom2Note}
          onChangeText={(t) => set("otherItems", { custom2Note: t })}
          placeholder="Note..."
          placeholderTextColor={colors.muted}
        />
      </View>

      {/* ── Notes ── */}
      <SectionHeader title="Notes" colors={colors} />
      <TextInput
        style={[styles.notesInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
        value={value.notes}
        onChangeText={(t) => onChange({ ...value, notes: t })}
        placeholder="Additional notes for project specific items..."
        placeholderTextColor={colors.muted}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 40 },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: 15, flex: 1, marginRight: 8 },
  rowRight: { flexDirection: "row", alignItems: "center" },
  numInput: {
    width: 64,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    textAlign: "center",
  },
  textInput: {
    width: 140,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  itemBlock: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  customNameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    marginRight: 8,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  notesInput: {
    margin: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 100,
  },
});
