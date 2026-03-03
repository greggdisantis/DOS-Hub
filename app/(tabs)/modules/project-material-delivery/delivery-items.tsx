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
import { DeliveryItems } from "./types";

interface Props {
  value: DeliveryItems;
  onChange: (v: DeliveryItems) => void;
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

export default function DeliveryItemsForm({ value, onChange }: Props) {
  const colors = useColors();

  const set = <K extends keyof DeliveryItems>(section: K, patch: Partial<DeliveryItems[K]>) => {
    onChange({ ...value, [section]: { ...(value[section] as any), ...(patch as any) } });
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* ── Fans ── */}
      <SectionHeader title="Fans" colors={colors} />
      <Row label="Includes Fans" colors={colors}>
        <Switch
          value={value.fans.hasFans}
          onValueChange={(v) => set("fans", { hasFans: v })}
          trackColor={{ true: colors.primary }}
        />
      </Row>
      {value.fans.hasFans && (
        <>
          <Row label="Type" colors={colors}>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              value={value.fans.type}
              onChangeText={(t) => set("fans", { type: t })}
              placeholder="e.g. Ceiling, Wall"
              placeholderTextColor={colors.muted}
            />
          </Row>
          <Row label="Color" colors={colors}>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              value={value.fans.color}
              onChangeText={(t) => set("fans", { color: t })}
              placeholder="e.g. Bronze"
              placeholderTextColor={colors.muted}
            />
          </Row>
          <Row label="Quantity" colors={colors}>
            <NumInput value={value.fans.qty} onChange={(v) => set("fans", { qty: v })} colors={colors} />
          </Row>
        </>
      )}

      {/* ── PVC Pipe ── */}
      <SectionHeader title="PVC Pipe" colors={colors} />
      <Row label='3" × 10ft Pipe' colors={colors}>
        <NumInput value={value.pvc.pipe3_10ft} onChange={(v) => set("pvc", { pipe3_10ft: v })} colors={colors} />
      </Row>
      <Row label='2" × 10ft Pipe' colors={colors}>
        <NumInput value={value.pvc.pipe2_10ft} onChange={(v) => set("pvc", { pipe2_10ft: v })} colors={colors} />
      </Row>
      <View style={styles.customRow}>
        <TextInput
          style={[styles.customInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
          value={value.pvc.custom}
          onChangeText={(t) => set("pvc", { custom: t })}
          placeholder="Other PVC pipe..."
          placeholderTextColor={colors.muted}
        />
        <NumInput value={value.pvc.customQty} onChange={(v) => set("pvc", { customQty: v })} colors={colors} />
      </View>

      {/* ── AZEK ── */}
      <SectionHeader title="AZEK" colors={colors} />
      <Row label='5/4 AZEK' colors={colors}>
        <NumInput value={value.azek.size5_4} onChange={(v) => set("azek", { size5_4: v })} colors={colors} />
      </Row>
      <Row label='3/4 AZEK' colors={colors}>
        <NumInput value={value.azek.size3_4} onChange={(v) => set("azek", { size3_4: v })} colors={colors} />
      </Row>
      <View style={styles.customRow}>
        <TextInput
          style={[styles.customInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
          value={value.azek.other}
          onChangeText={(t) => set("azek", { other: t })}
          placeholder="Other AZEK..."
          placeholderTextColor={colors.muted}
        />
        <NumInput value={value.azek.otherQty} onChange={(v) => set("azek", { otherQty: v })} colors={colors} />
      </View>

      {/* ── Wire ── */}
      <SectionHeader title="Wire" colors={colors} />
      <Row label="18/5 Wire" colors={colors}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TextInput
            style={[styles.sizeInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            value={value.wire.wire18_5_sizeRoll}
            onChangeText={(t) => set("wire", { wire18_5_sizeRoll: t })}
            placeholder="Size/Roll"
            placeholderTextColor={colors.muted}
          />
          <NumInput value={value.wire.wire18_5_qty} onChange={(v) => set("wire", { wire18_5_qty: v })} colors={colors} />
        </View>
      </Row>
      <Row label="12/2 Wire" colors={colors}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TextInput
            style={[styles.sizeInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            value={value.wire.wire12_2_sizeRoll}
            onChangeText={(t) => set("wire", { wire12_2_sizeRoll: t })}
            placeholder="Size/Roll"
            placeholderTextColor={colors.muted}
          />
          <NumInput value={value.wire.wire12_2_qty} onChange={(v) => set("wire", { wire12_2_qty: v })} colors={colors} />
        </View>
      </Row>
      <Row label="10/2 Wire" colors={colors}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TextInput
            style={[styles.sizeInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            value={value.wire.wire10_2_sizeRoll}
            onChangeText={(t) => set("wire", { wire10_2_sizeRoll: t })}
            placeholder="Size/Roll"
            placeholderTextColor={colors.muted}
          />
          <NumInput value={value.wire.wire10_2_qty} onChange={(v) => set("wire", { wire10_2_qty: v })} colors={colors} />
        </View>
      </Row>
      <View style={styles.customRow}>
        <TextInput
          style={[styles.customInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
          value={value.wire.custom}
          onChangeText={(t) => set("wire", { custom: t })}
          placeholder="Other wire..."
          placeholderTextColor={colors.muted}
        />
        <TextInput
          style={[styles.sizeInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
          value={value.wire.customSizeRoll}
          onChangeText={(t) => set("wire", { customSizeRoll: t })}
          placeholder="Size/Roll"
          placeholderTextColor={colors.muted}
        />
        <NumInput value={value.wire.customQty} onChange={(v) => set("wire", { customQty: v })} colors={colors} />
      </View>

      {/* ── Misc ── */}
      <SectionHeader title="Miscellaneous" colors={colors} />
      <View style={styles.customRow}>
        <TextInput
          style={[styles.customInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
          value={value.misc.custom}
          onChangeText={(t) => set("misc", { custom: t })}
          placeholder="Misc item..."
          placeholderTextColor={colors.muted}
        />
        <NumInput value={value.misc.customQty} onChange={(v) => set("misc", { customQty: v })} colors={colors} />
      </View>

      {/* ── Notes ── */}
      <SectionHeader title="Notes" colors={colors} />
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
  sizeInput: {
    width: 80,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 13,
  },
  customRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
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
