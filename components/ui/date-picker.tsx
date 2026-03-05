/**
 * DatePicker — Cross-platform date picker component for DOS Hub.
 *
 * - iOS: inline calendar (DateTimePicker, display="inline")
 * - Android: system spinner dialog (DateTimePicker, display="default")
 * - Web: native browser <input type="date"> styled to match the app theme
 *
 * Usage:
 * ```tsx
 * import { DatePicker } from "@/components/ui/date-picker";
 *
 * const [date, setDate] = useState(""); // "YYYY-MM-DD" or ""
 *
 * <DatePicker
 *   value={date}
 *   onChange={setDate}
 *   placeholder="Select date"
 *   colors={colors}
 * />
 * ```
 */

import React, { useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useColors } from "@/hooks/use-colors";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse "YYYY-MM-DD" string → Date. Falls back to today if empty/invalid. */
function parseDate(str: string): Date {
  if (str && /^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date();
}

/** Format Date → "YYYY-MM-DD" string. */
function serializeDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Format "YYYY-MM-DD" → human-readable "Jan 1, 2026". */
export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DatePickerProps {
  /** Current value as "YYYY-MM-DD" string, or "" for no selection. */
  value: string;
  /** Called with the new "YYYY-MM-DD" string when the user picks a date. */
  onChange: (value: string) => void;
  /** Placeholder text shown when no date is selected. */
  placeholder?: string;
  /** Theme colors from useColors(). If omitted, useColors() is called internally. */
  colors?: ReturnType<typeof useColors>;
  /** Optional minimum selectable date as "YYYY-MM-DD". */
  minimumDate?: string;
  /** Optional maximum selectable date as "YYYY-MM-DD". */
  maximumDate?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  colors: colorsProp,
  minimumDate,
  maximumDate,
}: DatePickerProps) {
  const internalColors = useColors();
  const colors = colorsProp ?? internalColors;
  const [showPicker, setShowPicker] = useState(false);

  // ── Web: render a native HTML date input styled to match the app ──────────
  if (Platform.OS === "web") {
    return (
      <input
        type="date"
        value={value || ""}
        min={minimumDate || undefined}
        max={maximumDate || undefined}
        onChange={(e: any) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: 10,
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.surface,
          color: value ? colors.foreground : colors.muted,
          fontSize: 16,
          cursor: "pointer",
          outline: "none",
          boxSizing: "border-box",
          fontFamily: "inherit",
        }}
      />
    );
  }

  // ── iOS / Android: tappable button that reveals DateTimePicker ────────────
  return (
    <View>
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderWidth: 1,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 14,
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }}
      >
        <Text style={{ fontSize: 16, color: value ? colors.foreground : colors.muted }}>
          {value ? formatDateDisplay(value) : placeholder}
        </Text>
        <Text style={{ fontSize: 18 }}>📅</Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={parseDate(value)}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          minimumDate={minimumDate ? parseDate(minimumDate) : undefined}
          maximumDate={maximumDate ? parseDate(maximumDate) : undefined}
          onChange={(_, date) => {
            // On Android the picker closes automatically; on iOS keep it open
            setShowPicker(Platform.OS === "ios");
            if (date) onChange(serializeDate(date));
          }}
        />
      )}
    </View>
  );
}
