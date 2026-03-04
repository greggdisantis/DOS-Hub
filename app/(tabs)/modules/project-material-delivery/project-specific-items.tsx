import React from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { ProjectSpecificItems } from "./types";

interface Props {
  value: ProjectSpecificItems;
  onChange: (v: ProjectSpecificItems) => void;
  readOnly?: boolean;
}

// ── Shared sub-components ────────────────────────────────────────────────────

function FieldLabel({ label, colors }: { label: string; colors: any }) {
  return <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label}</Text>;
}

function NumInput({
  value,
  onChange,
  placeholder = "0",
  colors,
  readOnly,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  colors: any;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <View style={[styles.numInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={{ color: colors.foreground, fontSize: 15, textAlign: "center" }}>
          {value !== null ? String(value) : "—"}
        </Text>
      </View>
    );
  }
  return (
    <TextInput
      style={[styles.numInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
      value={value !== null ? String(value) : ""}
      onChangeText={(t) => onChange(t === "" ? null : parseInt(t.replace(/[^0-9]/g, ""), 10) || null)}
      keyboardType="number-pad"
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      returnKeyType="done"
      editable={!readOnly}
    />
  );
}

function TextFieldInput({
  value,
  onChange,
  placeholder,
  colors,
  readOnly,
  flex,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  colors: any;
  readOnly?: boolean;
  flex?: number;
}) {
  if (readOnly) {
    return (
      <View style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, flex }]}>
        <Text style={{ color: value ? colors.foreground : colors.muted, fontSize: 14 }}>
          {value || placeholder}
        </Text>
      </View>
    );
  }
  return (
    <TextInput
      style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground, flex }]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      editable={!readOnly}
    />
  );
}

function SectionHeader({ title, colors }: { title: string; colors: any }) {
  return (
    <View style={[styles.sectionHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <Text style={[styles.sectionHeaderText, { color: colors.primary }]}>{title}</Text>
    </View>
  );
}

function ToggleCard({
  label,
  description,
  value,
  onToggle,
  colors,
  readOnly,
}: {
  label: string;
  description?: string;
  value: boolean;
  onToggle: () => void;
  colors: any;
  readOnly?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.toggleCard,
        {
          backgroundColor: value ? colors.primary + "12" : colors.surface,
          borderColor: value ? colors.primary : colors.border,
        },
      ]}
      onPress={readOnly ? undefined : onToggle}
      activeOpacity={readOnly ? 1 : 0.75}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.toggleLabel, { color: colors.foreground }]}>{label}</Text>
        {description ? (
          <Text style={[styles.toggleDescription, { color: colors.muted }]}>{description}</Text>
        ) : null}
      </View>
      <View style={[styles.togglePill, { backgroundColor: value ? colors.primary : colors.border }]}>
        <Text style={[styles.togglePillText, { color: value ? "#fff" : colors.muted }]}>
          {value ? "YES" : "NO"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/** An item block with item name, qty, and optional note */
function ItemBlock({
  label,
  isCustom,
  customValue,
  onCustomChange,
  qty,
  onQtyChange,
  note,
  onNoteChange,
  colors,
  readOnly,
  warehouseNoteMode,
}: {
  label?: string;
  isCustom?: boolean;
  customValue?: string;
  onCustomChange?: (v: string) => void;
  qty: number | null;
  onQtyChange: (v: number | null) => void;
  note: string;
  onNoteChange: (v: string) => void;
  colors: any;
  readOnly?: boolean;
  warehouseNoteMode?: boolean; // qty/name locked, only note editable
}) {
  return (
    <View style={[styles.itemBlock, { borderBottomColor: colors.border }]}>
      {/* Top row: name + qty */}
      <View style={styles.itemTopRow}>
        <View style={{ flex: 1 }}>
          <FieldLabel label={isCustom ? "Custom Item" : "Item"} colors={colors} />
          {isCustom ? (
            <TextFieldInput
              value={customValue ?? ""}
              onChange={onCustomChange ?? (() => {})}
              placeholder="Custom item..."
              colors={colors}
              readOnly={readOnly || warehouseNoteMode}
              flex={1}
            />
          ) : (
            <Text style={[styles.itemName, { color: colors.foreground }]}>{label}</Text>
          )}
        </View>
        <View style={{ marginLeft: 12 }}>
          <FieldLabel label="Qty" colors={colors} />
          <NumInput value={qty} onChange={onQtyChange} colors={colors} readOnly={readOnly || warehouseNoteMode} />
        </View>
      </View>

      {/* Note row */}
      <View>
        <FieldLabel label="Note" colors={colors} />
        {(readOnly && !warehouseNoteMode) ? (
          <View style={[styles.noteReadOnly, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: note ? colors.foreground : colors.muted, fontSize: 13 }}>
              {note || "No note"}
            </Text>
          </View>
        ) : (
          <TextInput
            style={[styles.noteInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            value={note}
            onChangeText={onNoteChange}
            placeholder="Color, size, spec..."
            placeholderTextColor={colors.muted}
            editable={!readOnly || warehouseNoteMode}
          />
        )}
      </View>
    </View>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ProjectSpecificItemsForm({ value, onChange, readOnly }: Props) {
  const colors = useColors();

  const set = <K extends keyof ProjectSpecificItems>(section: K, patch: Partial<ProjectSpecificItems[K]>) => {
    if (readOnly) return;
    onChange({ ...value, [section]: { ...(value[section] as any), ...(patch as any) } });
  };

  const setNote = <K extends keyof ProjectSpecificItems>(section: K, patch: Partial<ProjectSpecificItems[K]>) => {
    // Notes are always editable (even in warehouse mode)
    onChange({ ...value, [section]: { ...(value[section] as any), ...(patch as any) } });
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

      {/* ── Heaters ── */}
      <SectionHeader title="Heaters" colors={colors} />
      <View style={styles.toggleSection}>
        <ToggleCard
          label="Includes Heaters"
          description="Toggle on if heaters are required for this project"
          value={value.heaters.hasHeaters}
          onToggle={() => set("heaters", { hasHeaters: !value.heaters.hasHeaters })}
          colors={colors}
          readOnly={readOnly}
        />
      </View>
      {value.heaters.hasHeaters && (
        <View style={[styles.expandedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.expandedRow}>
            <View style={{ flex: 1 }}>
              <FieldLabel label="Type" colors={colors} />
              <TextFieldInput
                value={value.heaters.type}
                onChange={(t) => set("heaters", { type: t })}
                placeholder="e.g. Infrared"
                colors={colors}
                readOnly={readOnly}
                flex={1}
              />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <FieldLabel label="Color" colors={colors} />
              <TextFieldInput
                value={value.heaters.color}
                onChange={(t) => set("heaters", { color: t })}
                placeholder="e.g. Black"
                colors={colors}
                readOnly={readOnly}
                flex={1}
              />
            </View>
            <View style={{ marginLeft: 10 }}>
              <FieldLabel label="Qty" colors={colors} />
              <NumInput value={value.heaters.qty} onChange={(v) => set("heaters", { qty: v })} colors={colors} readOnly={readOnly} />
            </View>
          </View>
          <View style={{ marginTop: 12 }}>
            <ToggleCard
              label="Relay Panel Needed"
              description="Check if a relay panel is required for heater control"
              value={value.heaters.relayPanelNeeded}
              onToggle={() => set("heaters", { relayPanelNeeded: !value.heaters.relayPanelNeeded })}
              colors={colors}
              readOnly={readOnly}
            />
          </View>
        </View>
      )}

      {/* ── Other Project Items ── */}
      <SectionHeader title="Other Project Items" colors={colors} />

      <ItemBlock
        label="J-Channel"
        qty={value.otherItems.jChannelQty}
        onQtyChange={(v) => set("otherItems", { jChannelQty: v })}
        note={value.otherItems.jChannelNote}
        onNoteChange={(t) => setNote("otherItems", { jChannelNote: t })}
        colors={colors}
        readOnly={readOnly}
      />

      <ItemBlock
        label="Lumber"
        qty={value.otherItems.lumberQty}
        onQtyChange={(v) => set("otherItems", { lumberQty: v })}
        note={value.otherItems.lumberNote}
        onNoteChange={(t) => setNote("otherItems", { lumberNote: t })}
        colors={colors}
        readOnly={readOnly}
      />

      <ItemBlock
        label="Trim Coil"
        qty={value.otherItems.trimCoilQty}
        onQtyChange={(v) => set("otherItems", { trimCoilQty: v })}
        note={value.otherItems.trimCoilNote}
        onNoteChange={(t) => setNote("otherItems", { trimCoilNote: t })}
        colors={colors}
        readOnly={readOnly}
      />

      <ItemBlock
        isCustom
        customValue={value.otherItems.custom1}
        onCustomChange={(t) => set("otherItems", { custom1: t })}
        qty={value.otherItems.custom1Qty}
        onQtyChange={(v) => set("otherItems", { custom1Qty: v })}
        note={value.otherItems.custom1Note}
        onNoteChange={(t) => setNote("otherItems", { custom1Note: t })}
        colors={colors}
        readOnly={readOnly}
      />

      <ItemBlock
        isCustom
        customValue={value.otherItems.custom2}
        onCustomChange={(t) => set("otherItems", { custom2: t })}
        qty={value.otherItems.custom2Qty}
        onQtyChange={(v) => set("otherItems", { custom2Qty: v })}
        note={value.otherItems.custom2Note}
        onNoteChange={(t) => setNote("otherItems", { custom2Note: t })}
        colors={colors}
        readOnly={readOnly}
      />

      {/* ── Notes ── */}
      <SectionHeader title="Notes" colors={colors} />
      {readOnly ? (
        <View style={[styles.notesReadOnly, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: value.notes ? colors.foreground : colors.muted, fontSize: 14, lineHeight: 20 }}>
            {value.notes || "No notes"}
          </Text>
        </View>
      ) : (
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
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 60 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
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
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    minWidth: 80,
  },
  toggleSection: { paddingHorizontal: 16, paddingVertical: 10 },
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  toggleLabel: { fontSize: 15, fontWeight: "600", lineHeight: 20 },
  toggleDescription: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  togglePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 52,
    alignItems: "center",
  },
  togglePillText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  expandedCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  expandedRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  itemBlock: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  itemTopRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  itemName: { fontSize: 15, fontWeight: "500", lineHeight: 22 },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  noteReadOnly: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 36,
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
  notesReadOnly: {
    margin: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 60,
  },
});
