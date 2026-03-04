import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  FlatList,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { BoxedItems, DEFAULT_BOXED_ITEMS, OSI_QUAD_MAX_COLORS } from "./types";

interface Props {
  value: BoxedItems;
  onChange: (v: BoxedItems) => void;
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
        <Text style={[{ color: colors.foreground, fontSize: 15, textAlign: "center" }]}>
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
      <View style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, flex: flex ?? undefined }]}>
        <Text style={{ color: value ? colors.foreground : colors.muted, fontSize: 14 }}>
          {value || placeholder}
        </Text>
      </View>
    );
  }
  return (
    <TextInput
      style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground, flex: flex ?? undefined }]}
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

/** A toggle card that clearly shows Yes / No state */
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
      <View
        style={[
          styles.togglePill,
          { backgroundColor: value ? colors.primary : colors.border },
        ]}
      >
        <Text style={[styles.togglePillText, { color: value ? "#fff" : colors.muted }]}>
          {value ? "YES" : "NO"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/** A labeled row with item name + qty */
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

export default function BoxedItemsForm({ value, onChange, readOnly }: Props) {
  const colors = useColors();
  const [showOsiPicker, setShowOsiPicker] = useState(false);

  const set = <K extends keyof BoxedItems>(section: K, patch: Partial<BoxedItems[K]>) => {
    if (readOnly) return;
    onChange({ ...value, [section]: { ...(value[section] as any), ...(patch as any) } });
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

      {/* ── PVC ── */}
      <SectionHeader title="PVC" colors={colors} />
      <ItemRow label='6" Scupper' qty={value.pvc.scupper6} onQtyChange={(v) => set("pvc", { scupper6: v })} colors={colors} readOnly={readOnly} />
      <ItemRow label='8" Scupper' qty={value.pvc.scupper8} onQtyChange={(v) => set("pvc", { scupper8: v })} colors={colors} readOnly={readOnly} />
      <ItemRow label='3" Coupling' qty={value.pvc.coupling3} onQtyChange={(v) => set("pvc", { coupling3: v })} colors={colors} readOnly={readOnly} />
      <ItemRow label='3" to 2" Reducer' qty={value.pvc.reducer3to2} onQtyChange={(v) => set("pvc", { reducer3to2: v })} colors={colors} readOnly={readOnly} />
      <ItemRow label='3" Coupling (B)' qty={value.pvc.coupling3b} onQtyChange={(v) => set("pvc", { coupling3b: v })} colors={colors} readOnly={readOnly} />
      <ItemRow label='2" Coupling' qty={value.pvc.coupling2} onQtyChange={(v) => set("pvc", { coupling2: v })} colors={colors} readOnly={readOnly} />
      {/* Custom PVC */}
      <View style={[styles.customItemRow, { borderBottomColor: colors.border }]}>
        <View style={styles.customItemLeft}>
          <FieldLabel label="Custom Item" colors={colors} />
          <TextFieldInput
            value={value.pvc.custom}
            onChange={(t) => set("pvc", { custom: t })}
            placeholder="Other PVC item..."
            colors={colors}
            readOnly={readOnly}
            flex={1}
          />
        </View>
        <View style={styles.customItemRight}>
          <FieldLabel label="Qty" colors={colors} />
          <NumInput value={value.pvc.customQty} onChange={(v) => set("pvc", { customQty: v })} colors={colors} readOnly={readOnly} />
        </View>
      </View>

      {/* ── Screen Screws ── */}
      <SectionHeader title="Screen Screws" colors={colors} />
      <ItemRow label='1.5" Screws' qty={value.screenScrews.size1_5} onQtyChange={(v) => set("screenScrews", { size1_5: v })} colors={colors} readOnly={readOnly} />
      <ItemRow label='2" Screws' qty={value.screenScrews.size2} onQtyChange={(v) => set("screenScrews", { size2: v })} colors={colors} readOnly={readOnly} />

      {/* ── Ledger Locks ── */}
      <SectionHeader title="Ledger Locks" colors={colors} />
      <ItemRow label='2-7/8" Ledger Locks' qty={value.ledgerLocks.size2_7_8} onQtyChange={(v) => set("ledgerLocks", { size2_7_8: v })} colors={colors} readOnly={readOnly} />
      <ItemRow label='4.5" Ledger Locks' qty={value.ledgerLocks.size4_5} onQtyChange={(v) => set("ledgerLocks", { size4_5: v })} colors={colors} readOnly={readOnly} />
      <ItemRow label='6" Ledger Locks' qty={value.ledgerLocks.size6} onQtyChange={(v) => set("ledgerLocks", { size6: v })} colors={colors} readOnly={readOnly} />

      {/* ── Wedge Anchors ── */}
      <SectionHeader title="Wedge Anchors" colors={colors} />
      <ItemRow label='5.5" Wedge Anchors' qty={value.wedgeAnchors.size5_5} onQtyChange={(v) => set("wedgeAnchors", { size5_5: v })} colors={colors} readOnly={readOnly} />
      <View style={[styles.customItemRow, { borderBottomColor: colors.border }]}>
        <View style={styles.customItemLeft}>
          <FieldLabel label="Custom Size" colors={colors} />
          <TextFieldInput
            value={value.wedgeAnchors.custom}
            onChange={(t) => set("wedgeAnchors", { custom: t })}
            placeholder="Other size..."
            colors={colors}
            readOnly={readOnly}
            flex={1}
          />
        </View>
        <View style={styles.customItemRight}>
          <FieldLabel label="Qty" colors={colors} />
          <NumInput value={value.wedgeAnchors.customQty} onChange={(v) => set("wedgeAnchors", { customQty: v })} colors={colors} readOnly={readOnly} />
        </View>
      </View>

      {/* ── Foam Tape / Adhesive ── */}
      <SectionHeader title="Foam Tape / Adhesive" colors={colors} />
      <ItemRow label="Foam Tape Roll" qty={value.foamTape.tapeRoll} onQtyChange={(v) => set("foamTape", { tapeRoll: v })} colors={colors} readOnly={readOnly} />
      <ItemRow label="3M Dot" qty={value.foamTape.dot3m} onQtyChange={(v) => set("foamTape", { dot3m: v })} colors={colors} readOnly={readOnly} />
      <ItemRow label="Flashing Tape" qty={value.foamTape.flashingTape} onQtyChange={(v) => set("foamTape", { flashingTape: v })} colors={colors} readOnly={readOnly} />

      {/* ── Caulk / Sealants ── */}
      <SectionHeader title="Caulk / Sealants" colors={colors} />

      {/* OSI Quad Max */}
      <View style={[styles.sealantRow, { borderBottomColor: colors.border }]}>
        <View style={styles.sealantLeft}>
          <FieldLabel label="Item" colors={colors} />
          <Text style={[styles.itemName, { color: colors.foreground }]}>OSI Quad Max</Text>
        </View>
        <View style={styles.sealantMid}>
          <FieldLabel label="Color" colors={colors} />
          <TouchableOpacity
            style={[styles.colorPicker, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={readOnly ? undefined : () => setShowOsiPicker(true)}
            activeOpacity={readOnly ? 1 : 0.8}
          >
            <Text style={{ color: value.caulkSealants.osiQuadMaxColor ? colors.foreground : colors.muted, fontSize: 13 }} numberOfLines={1}>
              {value.caulkSealants.osiQuadMaxColor || "Select..."}
            </Text>
            {!readOnly && <Text style={{ color: colors.muted, fontSize: 11 }}>▾</Text>}
          </TouchableOpacity>
        </View>
        <View style={styles.sealantRight}>
          <FieldLabel label="Qty" colors={colors} />
          <NumInput value={value.caulkSealants.osiQuadMaxQty} onChange={(v) => set("caulkSealants", { osiQuadMaxQty: v })} colors={colors} readOnly={readOnly} />
        </View>
      </View>

      {/* Flex Seal */}
      <View style={[styles.sealantRow, { borderBottomColor: colors.border }]}>
        <View style={styles.sealantLeft}>
          <FieldLabel label="Item" colors={colors} />
          <Text style={[styles.itemName, { color: colors.foreground }]}>Flex Seal</Text>
        </View>
        <View style={styles.sealantMid}>
          <FieldLabel label="Color" colors={colors} />
          <TextFieldInput
            value={value.caulkSealants.flexSealColor}
            onChange={(t) => set("caulkSealants", { flexSealColor: t })}
            placeholder="Color"
            colors={colors}
            readOnly={readOnly}
          />
        </View>
        <View style={styles.sealantRight}>
          <FieldLabel label="Qty" colors={colors} />
          <NumInput value={value.caulkSealants.flexSealQty} onChange={(v) => set("caulkSealants", { flexSealQty: v })} colors={colors} readOnly={readOnly} />
        </View>
      </View>

      {/* Ruscoe 12-3 */}
      <ItemRow label="Ruscoe 12-3" qty={value.caulkSealants.ruscoe12_3Qty} onQtyChange={(v) => set("caulkSealants", { ruscoe12_3Qty: v })} colors={colors} readOnly={readOnly} />

      {/* Custom Sealant */}
      <View style={[styles.customSealantRow, { borderBottomColor: colors.border }]}>
        <View style={styles.customSealantTop}>
          <View style={{ flex: 1 }}>
            <FieldLabel label="Custom Sealant" colors={colors} />
            <TextFieldInput
              value={value.caulkSealants.customName}
              onChange={(t) => set("caulkSealants", { customName: t })}
              placeholder="Other sealant..."
              colors={colors}
              readOnly={readOnly}
              flex={1}
            />
          </View>
          <View style={{ marginLeft: 8 }}>
            <FieldLabel label="Color" colors={colors} />
            <TextFieldInput
              value={value.caulkSealants.customColor}
              onChange={(t) => set("caulkSealants", { customColor: t })}
              placeholder="Color"
              colors={colors}
              readOnly={readOnly}
            />
          </View>
          <View style={{ marginLeft: 8 }}>
            <FieldLabel label="Qty" colors={colors} />
            <NumInput value={value.caulkSealants.customQty} onChange={(v) => set("caulkSealants", { customQty: v })} colors={colors} readOnly={readOnly} />
          </View>
        </View>
      </View>

      {/* ── LED Lights ── */}
      <SectionHeader title="LED Lights" colors={colors} />
      <View style={styles.toggleSection}>
        <ToggleCard
          label="Includes LED Lights"
          description="Toggle on if this project requires LED lighting"
          value={value.ledLights.hasLights}
          onToggle={() => set("ledLights", { hasLights: !value.ledLights.hasLights })}
          colors={colors}
          readOnly={readOnly}
        />
      </View>
      {value.ledLights.hasLights && (
        <View style={[styles.expandedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.expandedRow}>
            <View style={{ flex: 1 }}>
              <FieldLabel label="Type" colors={colors} />
              <TextFieldInput
                value={value.ledLights.type}
                onChange={(t) => set("ledLights", { type: t })}
                placeholder="e.g. Strip, Puck"
                colors={colors}
                readOnly={readOnly}
                flex={1}
              />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <FieldLabel label="Color" colors={colors} />
              <TextFieldInput
                value={value.ledLights.color}
                onChange={(t) => set("ledLights", { color: t })}
                placeholder="e.g. Warm White"
                colors={colors}
                readOnly={readOnly}
                flex={1}
              />
            </View>
            <View style={{ marginLeft: 10 }}>
              <FieldLabel label="Qty" colors={colors} />
              <NumInput value={value.ledLights.qty} onChange={(v) => set("ledLights", { qty: v })} colors={colors} readOnly={readOnly} />
            </View>
          </View>
        </View>
      )}

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
          placeholder="Additional notes for boxed items..."
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      )}

      {/* OSI Color Picker Modal */}
      <Modal visible={showOsiPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select OSI Quad Max Color</Text>
            <TouchableOpacity onPress={() => setShowOsiPicker(false)} activeOpacity={0.7}>
              <Text style={[styles.modalClose, { color: colors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={OSI_QUAD_MAX_COLORS}
            keyExtractor={(c) => c}
            renderItem={({ item: color }) => {
              const isSelected = value.caulkSealants.osiQuadMaxColor === color;
              return (
                <TouchableOpacity
                  style={[styles.colorOption, { borderBottomColor: colors.border, backgroundColor: isSelected ? colors.primary + "15" : "transparent" }]}
                  onPress={() => { set("caulkSealants", { osiQuadMaxColor: color }); setShowOsiPicker(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.colorOptionText, { color: isSelected ? colors.primary : colors.foreground, fontWeight: isSelected ? "700" : "400" }]}>{color}</Text>
                  {isSelected && <Text style={{ color: colors.primary, fontSize: 16 }}>✓</Text>}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
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
    minWidth: 80,
  },
  customItemRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  customItemLeft: { flex: 1, flexDirection: "row", alignItems: "flex-end" },
  customItemRight: { alignItems: "flex-end" },
  sealantRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  sealantLeft: { width: 90 },
  sealantMid: { flex: 1 },
  sealantRight: { alignItems: "flex-end" },
  colorPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  customSealantRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  customSealantTop: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
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
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 17, fontWeight: "600" },
  modalClose: { fontSize: 16, fontWeight: "600" },
  colorOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colorOptionText: { fontSize: 16 },
});
