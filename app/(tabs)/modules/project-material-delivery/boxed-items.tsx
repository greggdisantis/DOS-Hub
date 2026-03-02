import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Modal,
  FlatList,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { BoxedItems, DEFAULT_BOXED_ITEMS, OSI_QUAD_MAX_COLORS } from "./types";

interface Props {
  value: BoxedItems;
  onChange: (v: BoxedItems) => void;
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

export default function BoxedItemsForm({ value, onChange }: Props) {
  const colors = useColors();
  const [showOsiPicker, setShowOsiPicker] = useState(false);

  const set = <K extends keyof BoxedItems>(section: K, patch: Partial<BoxedItems[K]>) => {
    onChange({ ...value, [section]: { ...(value[section] as any), ...(patch as any) } });
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* ── PVC ── */}
      <SectionHeader title="PVC" colors={colors} />
      <Row label='6" Scupper' colors={colors}>
        <NumInput value={value.pvc.scupper6} onChange={(v) => set("pvc", { scupper6: v })} colors={colors} />
      </Row>
      <Row label='8" Scupper' colors={colors}>
        <NumInput value={value.pvc.scupper8} onChange={(v) => set("pvc", { scupper8: v })} colors={colors} />
      </Row>
      <Row label='3" Coupling' colors={colors}>
        <NumInput value={value.pvc.coupling3} onChange={(v) => set("pvc", { coupling3: v })} colors={colors} />
      </Row>
      <Row label='3" to 2" Reducer' colors={colors}>
        <NumInput value={value.pvc.reducer3to2} onChange={(v) => set("pvc", { reducer3to2: v })} colors={colors} />
      </Row>
      <Row label='3" Coupling (B)' colors={colors}>
        <NumInput value={value.pvc.coupling3b} onChange={(v) => set("pvc", { coupling3b: v })} colors={colors} />
      </Row>
      <Row label='2" Coupling' colors={colors}>
        <NumInput value={value.pvc.coupling2} onChange={(v) => set("pvc", { coupling2: v })} colors={colors} />
      </Row>
      <View style={styles.customRow}>
        <TextInput
          style={[styles.customInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
          value={value.pvc.custom}
          onChangeText={(t) => set("pvc", { custom: t })}
          placeholder="Other PVC item..."
          placeholderTextColor={colors.muted}
        />
        <NumInput value={value.pvc.customQty} onChange={(v) => set("pvc", { customQty: v })} colors={colors} />
      </View>

      {/* ── Screen Screws ── */}
      <SectionHeader title="Screen Screws" colors={colors} />
      <Row label='1.5" Screws' colors={colors}>
        <NumInput value={value.screenScrews.size1_5} onChange={(v) => set("screenScrews", { size1_5: v })} colors={colors} />
      </Row>
      <Row label='2" Screws' colors={colors}>
        <NumInput value={value.screenScrews.size2} onChange={(v) => set("screenScrews", { size2: v })} colors={colors} />
      </Row>

      {/* ── Ledger Locks ── */}
      <SectionHeader title="Ledger Locks" colors={colors} />
      <Row label='2-7/8" Ledger Locks' colors={colors}>
        <NumInput value={value.ledgerLocks.size2_7_8} onChange={(v) => set("ledgerLocks", { size2_7_8: v })} colors={colors} />
      </Row>
      <Row label='4.5" Ledger Locks' colors={colors}>
        <NumInput value={value.ledgerLocks.size4_5} onChange={(v) => set("ledgerLocks", { size4_5: v })} colors={colors} />
      </Row>
      <Row label='6" Ledger Locks' colors={colors}>
        <NumInput value={value.ledgerLocks.size6} onChange={(v) => set("ledgerLocks", { size6: v })} colors={colors} />
      </Row>

      {/* ── Wedge Anchors ── */}
      <SectionHeader title="Wedge Anchors" colors={colors} />
      <Row label='5.5" Wedge Anchors' colors={colors}>
        <NumInput value={value.wedgeAnchors.size5_5} onChange={(v) => set("wedgeAnchors", { size5_5: v })} colors={colors} />
      </Row>
      <View style={styles.customRow}>
        <TextInput
          style={[styles.customInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
          value={value.wedgeAnchors.custom}
          onChangeText={(t) => set("wedgeAnchors", { custom: t })}
          placeholder="Other size..."
          placeholderTextColor={colors.muted}
        />
        <NumInput value={value.wedgeAnchors.customQty} onChange={(v) => set("wedgeAnchors", { customQty: v })} colors={colors} />
      </View>

      {/* ── Foam Tape / Adhesive ── */}
      <SectionHeader title="Foam Tape / Adhesive" colors={colors} />
      <Row label="Foam Tape Roll" colors={colors}>
        <NumInput value={value.foamTape.tapeRoll} onChange={(v) => set("foamTape", { tapeRoll: v })} colors={colors} />
      </Row>
      <Row label="3M Dot" colors={colors}>
        <NumInput value={value.foamTape.dot3m} onChange={(v) => set("foamTape", { dot3m: v })} colors={colors} />
      </Row>
      <Row label="Flashing Tape" colors={colors}>
        <NumInput value={value.foamTape.flashingTape} onChange={(v) => set("foamTape", { flashingTape: v })} colors={colors} />
      </Row>

      {/* ── Caulk / Sealants ── */}
      <SectionHeader title="Caulk / Sealants" colors={colors} />
      <Row label="OSI Quad Max" colors={colors}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            style={[styles.colorPicker, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowOsiPicker(true)}
            activeOpacity={0.8}
          >
            <Text style={{ color: value.caulkSealants.osiQuadMaxColor ? colors.foreground : colors.muted, fontSize: 13 }}>
              {value.caulkSealants.osiQuadMaxColor || "Color..."}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 11 }}>▾</Text>
          </TouchableOpacity>
          <NumInput value={value.caulkSealants.osiQuadMaxQty} onChange={(v) => set("caulkSealants", { osiQuadMaxQty: v })} colors={colors} />
        </View>
      </Row>
      <Row label="Flex Seal" colors={colors}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TextInput
            style={[styles.colorInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            value={value.caulkSealants.flexSealColor}
            onChangeText={(t) => set("caulkSealants", { flexSealColor: t })}
            placeholder="Color"
            placeholderTextColor={colors.muted}
          />
          <NumInput value={value.caulkSealants.flexSealQty} onChange={(v) => set("caulkSealants", { flexSealQty: v })} colors={colors} />
        </View>
      </Row>
      <Row label="Ruscoe 12-3" colors={colors}>
        <NumInput value={value.caulkSealants.ruscoe12_3Qty} onChange={(v) => set("caulkSealants", { ruscoe12_3Qty: v })} colors={colors} />
      </Row>
      <View style={styles.customRow}>
        <TextInput
          style={[styles.customInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
          value={value.caulkSealants.customName}
          onChangeText={(t) => set("caulkSealants", { customName: t })}
          placeholder="Other sealant..."
          placeholderTextColor={colors.muted}
        />
        <TextInput
          style={[styles.colorInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
          value={value.caulkSealants.customColor}
          onChangeText={(t) => set("caulkSealants", { customColor: t })}
          placeholder="Color"
          placeholderTextColor={colors.muted}
        />
        <NumInput value={value.caulkSealants.customQty} onChange={(v) => set("caulkSealants", { customQty: v })} colors={colors} />
      </View>

      {/* ── LED Lights ── */}
      <SectionHeader title="LED Lights" colors={colors} />
      <Row label="Includes LED Lights" colors={colors}>
        <Switch
          value={value.ledLights.hasLights}
          onValueChange={(v) => set("ledLights", { hasLights: v })}
          trackColor={{ true: colors.primary }}
        />
      </Row>
      {value.ledLights.hasLights && (
        <>
          <Row label="Type" colors={colors}>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              value={value.ledLights.type}
              onChangeText={(t) => set("ledLights", { type: t })}
              placeholder="e.g. Strip, Puck"
              placeholderTextColor={colors.muted}
            />
          </Row>
          <Row label="Color" colors={colors}>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              value={value.ledLights.color}
              onChangeText={(t) => set("ledLights", { color: t })}
              placeholder="e.g. Warm White"
              placeholderTextColor={colors.muted}
            />
          </Row>
          <Row label="Quantity" colors={colors}>
            <NumInput value={value.ledLights.qty} onChange={(v) => set("ledLights", { qty: v })} colors={colors} />
          </Row>
        </>
      )}

      {/* ── Notes ── */}
      <SectionHeader title="Notes" colors={colors} />
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

      {/* OSI Color Picker Modal */}
      <Modal visible={showOsiPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>OSI Quad Max Color</Text>
            <TouchableOpacity onPress={() => setShowOsiPicker(false)}>
              <Text style={[styles.modalClose, { color: colors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={OSI_QUAD_MAX_COLORS}
            keyExtractor={(c) => c}
            renderItem={({ item: c }) => {
              const isSelected = value.caulkSealants.osiQuadMaxColor === c;
              return (
                <TouchableOpacity
                  style={[styles.colorRow, { borderBottomColor: colors.border }, isSelected && { backgroundColor: colors.primary + "15" }]}
                  onPress={() => {
                    set("caulkSealants", { osiQuadMaxColor: c });
                    setShowOsiPicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.colorRowText, { color: colors.foreground }]}>{c}</Text>
                  {isSelected && <Text style={{ color: colors.primary, fontSize: 18 }}>✓</Text>}
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
  customRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "transparent",
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  colorInput: {
    width: 80,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 13,
  },
  colorPicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 100,
  },
  textInput: {
    width: 140,
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
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  modalClose: { fontSize: 16, fontWeight: "600" },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colorRowText: { fontSize: 15 },
});
