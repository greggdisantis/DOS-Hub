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
import { DeliveryItems } from "./types";

interface Props {
  value: DeliveryItems;
  onChange: (v: DeliveryItems) => void;
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
  width,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  colors: any;
  readOnly?: boolean;
  flex?: number;
  width?: number;
}) {
  if (readOnly) {
    return (
      <View style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, flex: flex, width }]}>
        <Text style={{ color: value ? colors.foreground : colors.muted, fontSize: 14 }}>
          {value || placeholder}
        </Text>
      </View>
    );
  }
  return (
    <TextInput
      style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground, flex: flex, width }]}
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

function ItemRow({
  label,
  qty,
  onQtyChange,
  colors,
  readOnly,
}: {
  label: string;
  qty: number | null;
  onQtyChange: (v: number | null) => void;
  colors: any;
  readOnly?: boolean;
}) {
  return (
    <View style={[styles.itemRow, { borderBottomColor: colors.border }]}>
      <View style={styles.itemRowLeft}>
        <FieldLabel label="Item" colors={colors} />
        <Text style={[styles.itemName, { color: colors.foreground }]}>{label}</Text>
      </View>
      <View style={styles.itemRowRight}>
        <FieldLabel label="Qty" colors={colors} />
        <NumInput value={qty} onChange={onQtyChange} colors={colors} readOnly={readOnly} />
      </View>
    </View>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DeliveryItemsForm({ value, onChange, readOnly }: Props) {
  const colors = useColors();

  const set = <K extends keyof DeliveryItems>(section: K, patch: Partial<DeliveryItems[K]>) => {
    if (readOnly) return;
    onChange({ ...value, [section]: { ...(value[section] as any), ...(patch as any) } });
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

      {/* ── Fans ── */}
      <SectionHeader title="Fans" colors={colors} />
      <View style={styles.toggleSection}>
        <ToggleCard
          label="Includes Fans"
          description="Toggle on if fans are being delivered for this project"
          value={value.fans.hasFans}
          onToggle={() => set("fans", { hasFans: !value.fans.hasFans })}
          colors={colors}
          readOnly={readOnly}
        />
      </View>
      {value.fans.hasFans && (
        <View style={[styles.expandedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.expandedRow}>
            <View style={{ flex: 1 }}>
              <FieldLabel label="Type" colors={colors} />
              <TextFieldInput
                value={value.fans.type}
                onChange={(t) => set("fans", { type: t })}
                placeholder="e.g. Ceiling, Wall"
                colors={colors}
                readOnly={readOnly}
                flex={1}
              />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <FieldLabel label="Color" colors={colors} />
              <TextFieldInput
                value={value.fans.color}
                onChange={(t) => set("fans", { color: t })}
                placeholder="e.g. Bronze"
                colors={colors}
                readOnly={readOnly}
                flex={1}
              />
            </View>
            <View style={{ marginLeft: 10 }}>
              <FieldLabel label="Qty" colors={colors} />
              <NumInput value={value.fans.qty} onChange={(v) => set("fans", { qty: v })} colors={colors} readOnly={readOnly} />
            </View>
          </View>
        </View>
      )}

      {/* ── PVC Pipe ── */}
      <SectionHeader title="PVC Pipe" colors={colors} />
      <ItemRow label='3" × 10ft Pipe' qty={value.pvc.pipe3_10ft} onQtyChange={(v) => set("pvc", { pipe3_10ft: v })} colors={colors} readOnly={readOnly} />
      <ItemRow label='2" × 10ft Pipe' qty={value.pvc.pipe2_10ft} onQtyChange={(v) => set("pvc", { pipe2_10ft: v })} colors={colors} readOnly={readOnly} />
      {/* Custom PVC */}
      <View style={[styles.customItemRow, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <FieldLabel label="Custom Item" colors={colors} />
          <TextFieldInput
            value={value.pvc.custom}
            onChange={(t) => set("pvc", { custom: t })}
            placeholder="Other PVC pipe..."
            colors={colors}
            readOnly={readOnly}
            flex={1}
          />
        </View>
        <View style={{ marginLeft: 12 }}>
          <FieldLabel label="Qty" colors={colors} />
          <NumInput value={value.pvc.customQty} onChange={(v) => set("pvc", { customQty: v })} colors={colors} readOnly={readOnly} />
        </View>
      </View>

      {/* ── AZEK ── */}
      <SectionHeader title="AZEK" colors={colors} />
      <ItemRow label="5/4 AZEK" qty={value.azek.size5_4} onQtyChange={(v) => set("azek", { size5_4: v })} colors={colors} readOnly={readOnly} />
      <ItemRow label="3/4 AZEK" qty={value.azek.size3_4} onQtyChange={(v) => set("azek", { size3_4: v })} colors={colors} readOnly={readOnly} />
      <View style={[styles.customItemRow, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <FieldLabel label="Custom AZEK" colors={colors} />
          <TextFieldInput
            value={value.azek.other}
            onChange={(t) => set("azek", { other: t })}
            placeholder="Other AZEK..."
            colors={colors}
            readOnly={readOnly}
            flex={1}
          />
        </View>
        <View style={{ marginLeft: 12 }}>
          <FieldLabel label="Qty" colors={colors} />
          <NumInput value={value.azek.otherQty} onChange={(v) => set("azek", { otherQty: v })} colors={colors} readOnly={readOnly} />
        </View>
      </View>

      {/* ── Wire ── */}
      <SectionHeader title="Wire" colors={colors} />

      {/* 18/5 Wire */}
      <View style={[styles.wireRow, { borderBottomColor: colors.border }]}>
        <View style={styles.wireLeft}>
          <FieldLabel label="Item" colors={colors} />
          <Text style={[styles.itemName, { color: colors.foreground }]}>18/5 Wire</Text>
        </View>
        <View style={styles.wireMid}>
          <FieldLabel label="Size / Roll" colors={colors} />
          <TextFieldInput
            value={value.wire.wire18_5_sizeRoll}
            onChange={(t) => set("wire", { wire18_5_sizeRoll: t })}
            placeholder="Size/Roll"
            colors={colors}
            readOnly={readOnly}
            flex={1}
          />
        </View>
        <View style={styles.wireRight}>
          <FieldLabel label="Qty" colors={colors} />
          <NumInput value={value.wire.wire18_5_qty} onChange={(v) => set("wire", { wire18_5_qty: v })} colors={colors} readOnly={readOnly} />
        </View>
      </View>

      {/* 12/2 Wire */}
      <View style={[styles.wireRow, { borderBottomColor: colors.border }]}>
        <View style={styles.wireLeft}>
          <FieldLabel label="Item" colors={colors} />
          <Text style={[styles.itemName, { color: colors.foreground }]}>12/2 Wire</Text>
        </View>
        <View style={styles.wireMid}>
          <FieldLabel label="Size / Roll" colors={colors} />
          <TextFieldInput
            value={value.wire.wire12_2_sizeRoll}
            onChange={(t) => set("wire", { wire12_2_sizeRoll: t })}
            placeholder="Size/Roll"
            colors={colors}
            readOnly={readOnly}
            flex={1}
          />
        </View>
        <View style={styles.wireRight}>
          <FieldLabel label="Qty" colors={colors} />
          <NumInput value={value.wire.wire12_2_qty} onChange={(v) => set("wire", { wire12_2_qty: v })} colors={colors} readOnly={readOnly} />
        </View>
      </View>

      {/* 10/2 Wire */}
      <View style={[styles.wireRow, { borderBottomColor: colors.border }]}>
        <View style={styles.wireLeft}>
          <FieldLabel label="Item" colors={colors} />
          <Text style={[styles.itemName, { color: colors.foreground }]}>10/2 Wire</Text>
        </View>
        <View style={styles.wireMid}>
          <FieldLabel label="Size / Roll" colors={colors} />
          <TextFieldInput
            value={value.wire.wire10_2_sizeRoll}
            onChange={(t) => set("wire", { wire10_2_sizeRoll: t })}
            placeholder="Size/Roll"
            colors={colors}
            readOnly={readOnly}
            flex={1}
          />
        </View>
        <View style={styles.wireRight}>
          <FieldLabel label="Qty" colors={colors} />
          <NumInput value={value.wire.wire10_2_qty} onChange={(v) => set("wire", { wire10_2_qty: v })} colors={colors} readOnly={readOnly} />
        </View>
      </View>

      {/* Custom Wire */}
      <View style={[styles.wireRow, { borderBottomColor: colors.border }]}>
        <View style={styles.wireLeft}>
          <FieldLabel label="Custom Wire" colors={colors} />
          <TextFieldInput
            value={value.wire.custom}
            onChange={(t) => set("wire", { custom: t })}
            placeholder="Type..."
            colors={colors}
            readOnly={readOnly}
            flex={1}
          />
        </View>
        <View style={styles.wireMid}>
          <FieldLabel label="Size / Roll" colors={colors} />
          <TextFieldInput
            value={value.wire.customSizeRoll}
            onChange={(t) => set("wire", { customSizeRoll: t })}
            placeholder="Size/Roll"
            colors={colors}
            readOnly={readOnly}
            flex={1}
          />
        </View>
        <View style={styles.wireRight}>
          <FieldLabel label="Qty" colors={colors} />
          <NumInput value={value.wire.customQty} onChange={(v) => set("wire", { customQty: v })} colors={colors} readOnly={readOnly} />
        </View>
      </View>

      {/* ── Misc ── */}
      <SectionHeader title="Miscellaneous" colors={colors} />
      <View style={[styles.customItemRow, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <FieldLabel label="Item" colors={colors} />
          <TextFieldInput
            value={value.misc.custom}
            onChange={(t) => set("misc", { custom: t })}
            placeholder="Misc item..."
            colors={colors}
            readOnly={readOnly}
            flex={1}
          />
        </View>
        <View style={{ marginLeft: 12 }}>
          <FieldLabel label="Qty" colors={colors} />
          <NumInput value={value.misc.customQty} onChange={(v) => set("misc", { customQty: v })} colors={colors} readOnly={readOnly} />
        </View>
      </View>

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
          placeholder="Additional notes for delivery items..."
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
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  itemRowLeft: { flex: 1 },
  itemRowRight: { alignItems: "flex-end" },
  itemName: { fontSize: 15, fontWeight: "500", lineHeight: 22 },
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
    minWidth: 70,
  },
  customItemRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  wireRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  wireLeft: { width: 80 },
  wireMid: { flex: 1 },
  wireRight: { alignItems: "flex-end" },
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
