/**
 * CMR Reports Dashboard
 *
 * Admin / Manager: see ALL reports from the database, grouped by user then month.
 * Guest / Member:  see ONLY their own reports.
 *
 * Filters: consultant (from users table), date range (native date picker),
 *          outcome, min/max value, min/max PC%.
 * Each row has a PDF export button.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, Alert,
  ActivityIndicator, ScrollView, Modal, Platform, TextInput,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { trpc } from '@/lib/trpc';
import { exportMeetingReportPDF } from './client-meeting-report/pdf-export';
import { ClientMeetingReport, DEAL_STATUS_LABELS } from './client-meeting-report/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { loadAllReports } from './client-meeting-report/storage';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d?: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return d; }
}

function monthKey(d?: string | null): string {
  if (!d) return 'Unknown';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch { return 'Unknown'; }
}

function fmt$(n?: number | string | null): string {
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (num === undefined || num === null || isNaN(num as number)) return '—';
  return `$${(num as number).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function toClientMeetingReport(row: any): ClientMeetingReport {
  const data = row.reportData as ClientMeetingReport;
  return {
    ...data,
    id: row.localId ?? data?.id ?? String(row.id),
    consultantName: row.consultantName ?? data?.consultantName ?? '',
    consultantUserId: row.consultantUserId ?? data?.consultantUserId ?? '',
    clientName: row.clientName ?? data?.clientName ?? '',
    appointmentDate: row.appointmentDate ?? data?.appointmentDate ?? '',
    weekOf: row.weekOf ?? data?.weekOf ?? '',
    dealStatus: row.dealStatus ?? data?.dealStatus ?? '',
    outcome: (row.outcome ?? data?.outcome ?? 'open') as 'open' | 'sold' | 'lost',
    purchaseConfidencePct: row.purchaseConfidencePct ?? data?.purchaseConfidencePct ?? 0,
    originalPcPct: row.originalPcPct ?? data?.originalPcPct,
    estimatedContractValue: row.estimatedContractValue != null
      ? parseFloat(String(row.estimatedContractValue))
      : data?.estimatedContractValue,
    soldAt: row.soldAt ?? data?.soldAt,
  };
}

// ── Filter state ──────────────────────────────────────────────────────────────

interface Filters {
  consultantId: number | null;  // null = all
  startDate: Date | null;
  endDate: Date | null;
  outcome: 'all' | 'open' | 'sold' | 'lost';
  minValue: string;
  maxValue: string;
  minPc: string;
  maxPc: string;
}

const DEFAULT_FILTERS: Filters = {
  consultantId: null,
  startDate: null,
  endDate: null,
  outcome: 'all',
  minValue: '',
  maxValue: '',
  minPc: '',
  maxPc: '',
};

// ── Date Picker Button ────────────────────────────────────────────────────────
// On web: renders a native HTML <input type="date"> which shows the browser
// calendar picker. On native: styled TextInput with YYYY-MM-DD format.

function DatePickerButton({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const colors = useColors();
  const dateStr = value ? value.toISOString().slice(0, 10) : '';

  if (Platform.OS === 'web') {
    // Use native HTML date input for proper calendar picker on web
    return (
      <View style={{ flex: 1 }}>
        <Text style={[styles.inputLabel, { color: colors.muted }]}>{label}</Text>
        <View style={[styles.dateBtn, { borderColor: value ? colors.primary : colors.border, backgroundColor: colors.background }]}>
          {/* @ts-ignore - web-only input element */}
          <input
            type="date"
            value={dateStr}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const v = e.target.value;
              if (!v) { onChange(null); return; }
              const d = new Date(v + 'T00:00:00');
              if (!isNaN(d.getTime())) onChange(d);
            }}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: value ? colors.foreground : colors.muted,
              fontSize: 13,
              fontFamily: 'inherit',
              cursor: 'pointer',
              width: '100%',
              padding: 0,
            }}
          />
          {value && (
            <Pressable
              onPress={() => onChange(null)}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <IconSymbol name="xmark.circle.fill" size={13} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // Native: styled TextInput
  const [text, setText] = useState(dateStr);
  useEffect(() => { setText(dateStr); }, [dateStr]);

  const handleBlur = () => {
    if (!text.trim()) { onChange(null); return; }
    const d = new Date(text + 'T00:00:00');
    if (!isNaN(d.getTime())) onChange(d);
    else setText(dateStr);
  };

  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.inputLabel, { color: colors.muted }]}>{label} (YYYY-MM-DD)</Text>
      <View style={[styles.dateBtn, { borderColor: value ? colors.primary : colors.border, backgroundColor: colors.background }]}>
        <IconSymbol name="calendar" size={13} color={value ? colors.primary : colors.muted} />
        <TextInput
          value={text}
          onChangeText={setText}
          onBlur={handleBlur}
          placeholder="Any"
          placeholderTextColor={colors.muted}
          style={[styles.dateBtnText, { color: value ? colors.foreground : colors.muted, flex: 1, padding: 0 }]}
          keyboardType="numbers-and-punctuation"
          returnKeyType="done"
          maxLength={10}
        />
        {value && (
          <Pressable
            onPress={() => { onChange(null); setText(''); }}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          >
            <IconSymbol name="xmark.circle.fill" size={13} color={colors.muted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ── Report Row ────────────────────────────────────────────────────────────────

function ReportRow({
  report,
  showUser,
  onExportPDF,
  isExporting,
}: {
  report: ClientMeetingReport;
  showUser: boolean;
  onExportPDF: () => void;
  isExporting: boolean;
}) {
  const colors = useColors();
  const pcColor =
    report.purchaseConfidencePct >= 70
      ? colors.success
      : report.purchaseConfidencePct >= 40
      ? colors.warning
      : colors.error;

  const outcomeColor =
    report.outcome === 'sold'
      ? colors.success
      : report.outcome === 'lost'
      ? colors.error
      : colors.primary;

  const outcomeLabel =
    report.outcome === 'sold' ? 'Sold' : report.outcome === 'lost' ? 'Lost' : 'Open';

  const dealLabel = report.dealStatus
    ? (DEAL_STATUS_LABELS[report.dealStatus] ?? report.dealStatus)
    : '—';

  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.rowTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.clientName, { color: colors.foreground }]} numberOfLines={1}>
            {report.clientName || 'Unnamed Client'}
          </Text>
          {showUser && (
            <Text style={[styles.userName, { color: colors.muted }]} numberOfLines={1}>
              {report.consultantName}
            </Text>
          )}
          <Text style={[styles.rowDate, { color: colors.muted }]}>
            {fmtDate(report.appointmentDate)}
          </Text>
        </View>

        <View style={[styles.pcBadge, { backgroundColor: pcColor + '22' }]}>
          <Text style={[styles.pcBadgeText, { color: pcColor }]}>
            {report.purchaseConfidencePct}%
          </Text>
        </View>

        <View style={[styles.outcomePill, { backgroundColor: outcomeColor + '18' }]}>
          <Text style={[styles.outcomePillText, { color: outcomeColor }]}>{outcomeLabel}</Text>
        </View>

        <Pressable
          onPress={onExportPDF}
          disabled={isExporting}
          style={({ pressed }) => ([
            styles.pdfBtn,
            { borderColor: colors.error + '60', backgroundColor: colors.error + '10' },
            pressed && { opacity: 0.7 },
          ])}
        >
          {isExporting
            ? <ActivityIndicator size={10} color={colors.error} />
            : <IconSymbol name="arrow.down.doc.fill" size={12} color={colors.error} />}
          <Text style={[styles.pdfBtnText, { color: colors.error }]}>PDF</Text>
        </Pressable>
      </View>

      <View style={styles.rowBottom}>
        <View style={styles.metaChip}>
          <Text style={[styles.metaLabel, { color: colors.muted }]}>Est. Value</Text>
          <Text style={[styles.metaValue, { color: colors.foreground }]}>
            {fmt$(report.estimatedContractValue)}
          </Text>
        </View>
        <View style={styles.metaChip}>
          <Text style={[styles.metaLabel, { color: colors.muted }]}>Orig PC%</Text>
          <Text style={[styles.metaValue, { color: colors.foreground }]}>
            {report.originalPcPct !== undefined ? `${report.originalPcPct}%` : '—'}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: colors.primary + '12' }]}>
          <Text style={[styles.statusPillText, { color: colors.primary }]} numberOfLines={1}>
            {dealLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ title, count, totalValue }: { title: string; count: number; totalValue: number }) {
  const colors = useColors();
  return (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.sectionMeta, { color: colors.muted }]}>
        {count} report{count !== 1 ? 's' : ''} · {fmt$(totalValue)}
      </Text>
    </View>
  );
}

// ── Filter Modal ──────────────────────────────────────────────────────────────

function FilterModal({
  visible,
  filters,
  consultants,
  isAdmin,
  onApply,
  onClose,
}: {
  visible: boolean;
  filters: Filters;
  consultants: Array<{ id: number; name: string }>;
  isAdmin: boolean;
  onApply: (f: Filters) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const [local, setLocal] = useState<Filters>(filters);

  React.useEffect(() => {
    if (visible) setLocal(filters);
  }, [visible, filters]);

  const set = <K extends keyof Filters>(key: K, val: Filters[K]) =>
    setLocal((prev) => ({ ...prev, [key]: val }));

  const OUTCOMES: { key: Filters['outcome']; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'sold', label: 'Sold' },
    { key: 'lost', label: 'Lost' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Filter Reports</Text>
            <Pressable onPress={onClose} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
              <IconSymbol name="xmark.circle.fill" size={22} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
            {/* Consultant filter (admin/manager only) */}
            {isAdmin && (
              <View style={styles.filterGroup}>
                <Text style={[styles.filterLabel, { color: colors.muted }]}>Consultant</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                  {[{ id: null as number | null, name: 'All' }, ...consultants].map((c) => (
                    <Pressable
                      key={c.id ?? '__all__'}
                      onPress={() => set('consultantId', c.id)}
                      style={({ pressed }) => ([
                        styles.chip,
                        {
                          borderColor: local.consultantId === c.id ? colors.primary : colors.border,
                          backgroundColor: local.consultantId === c.id ? colors.primary + '18' : colors.background,
                        },
                        pressed && { opacity: 0.7 },
                      ])}
                    >
                      <Text style={[styles.chipText, { color: local.consultantId === c.id ? colors.primary : colors.muted }]}>
                        {c.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Outcome filter */}
            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: colors.muted }]}>Outcome</Text>
              <View style={styles.chipRow}>
                {OUTCOMES.map((o) => (
                  <Pressable
                    key={o.key}
                    onPress={() => set('outcome', o.key)}
                    style={({ pressed }) => ([
                      styles.chip,
                      {
                        borderColor: local.outcome === o.key ? colors.primary : colors.border,
                        backgroundColor: local.outcome === o.key ? colors.primary + '18' : colors.background,
                      },
                      pressed && { opacity: 0.7 },
                    ])}
                  >
                    <Text style={[styles.chipText, { color: local.outcome === o.key ? colors.primary : colors.muted }]}>
                      {o.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Date range — native date pickers */}
            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: colors.muted }]}>Date Range</Text>
              <View style={styles.inputRow}>
                <DatePickerButton
                  label="From"
                  value={local.startDate}
                  onChange={(d) => set('startDate', d)}
                  maximumDate={local.endDate ?? undefined}
                />
                <DatePickerButton
                  label="To"
                  value={local.endDate}
                  onChange={(d) => set('endDate', d)}
                  minimumDate={local.startDate ?? undefined}
                />
              </View>
            </View>

            {/* Value range */}
            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: colors.muted }]}>Est. Value Range ($)</Text>
              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.muted }]}>Min</Text>
                  <TextInput
                    value={local.minValue}
                    onChangeText={(t) => set('minValue', t.replace(/[^0-9.]/g, ''))}
                    placeholder="0"
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                    returnKeyType="done"
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.muted }]}>Max</Text>
                  <TextInput
                    value={local.maxValue}
                    onChangeText={(t) => set('maxValue', t.replace(/[^0-9.]/g, ''))}
                    placeholder="Any"
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                    returnKeyType="done"
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
                  />
                </View>
              </View>
            </View>

            {/* PC% range */}
            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: colors.muted }]}>PC% Range</Text>
              <View style={styles.chipRow}>
                {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((pct) => {
                  const minPct = parseInt(local.minPc || '0');
                  const maxPct = parseInt(local.maxPc || '100');
                  const isInRange = pct >= minPct && pct <= maxPct;
                  return (
                    <Pressable
                      key={pct}
                      onPress={() => {
                        // Toggle: if tapping the current min, reset; otherwise set new range
                        if (local.minPc === String(pct) && local.maxPc === String(pct)) {
                          set('minPc', '');
                          set('maxPc', '');
                        } else if (!local.minPc || pct < parseInt(local.minPc)) {
                          set('minPc', String(pct));
                        } else {
                          set('maxPc', String(pct));
                        }
                      }}
                      style={({ pressed }) => ([
                        styles.chip,
                        {
                          borderColor: isInRange && (local.minPc || local.maxPc) ? colors.primary : colors.border,
                          backgroundColor: isInRange && (local.minPc || local.maxPc) ? colors.primary + '18' : colors.background,
                        },
                        pressed && { opacity: 0.7 },
                      ])}
                    >
                      <Text style={[styles.chipText, { color: isInRange && (local.minPc || local.maxPc) ? colors.primary : colors.muted }]}>
                        {pct}%
                      </Text>
                    </Pressable>
                  );
                })}
                {(local.minPc || local.maxPc) && (
                  <Pressable
                    onPress={() => { set('minPc', ''); set('maxPc', ''); }}
                    style={({ pressed }) => ([styles.chip, { borderColor: colors.error, backgroundColor: colors.error + '10' }, pressed && { opacity: 0.7 }])}
                  >
                    <Text style={[styles.chipText, { color: colors.error }]}>Clear</Text>
                  </Pressable>
                )}
              </View>
              {(local.minPc || local.maxPc) && (
                <Text style={[styles.pcRangeLabel, { color: colors.muted }]}>
                  Range: {local.minPc || '0'}% – {local.maxPc || '100'}%
                </Text>
              )}
            </View>
          </ScrollView>

          <View style={styles.modalBtns}>
            <Pressable
              onPress={() => { setLocal(DEFAULT_FILTERS); onApply(DEFAULT_FILTERS); onClose(); }}
              style={({ pressed }) => ([styles.clearBtn, { borderColor: colors.border }, pressed && { opacity: 0.7 }])}
            >
              <Text style={[styles.clearBtnText, { color: colors.muted }]}>Clear</Text>
            </Pressable>
            <Pressable
              onPress={() => { onApply(local); onClose(); }}
              style={({ pressed }) => ([styles.applyBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.85 }])}
            >
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Summary Bar ───────────────────────────────────────────────────────────────

function SummaryBar({ reports }: { reports: ClientMeetingReport[] }) {
  const colors = useColors();
  const open = reports.filter((r) => r.outcome === 'open').length;
  const sold = reports.filter((r) => r.outcome === 'sold').length;
  const totalValue = reports.reduce((s, r) => s + (r.estimatedContractValue ?? 0), 0);
  const avgPc =
    reports.length > 0
      ? Math.round(reports.reduce((s, r) => s + (r.purchaseConfidencePct ?? 0), 0) / reports.length)
      : 0;

  const cells = [
    { label: 'Total', value: String(reports.length), color: colors.primary },
    { label: 'Open', value: String(open), color: colors.warning },
    { label: 'Sold', value: String(sold), color: colors.success },
    { label: 'Pipeline', value: fmt$(totalValue), color: colors.foreground },
    { label: 'Avg PC%', value: `${avgPc}%`, color: colors.foreground },
  ];

  return (
    <View style={[styles.summaryBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {cells.map((c, i) => (
        <View
          key={c.label}
          style={[
            styles.summaryCell,
            i < cells.length - 1 && { borderRightWidth: 1, borderRightColor: colors.border },
          ]}
        >
          <Text style={[styles.summaryCellValue, { color: c.color }]}>{c.value}</Text>
          <Text style={[styles.summaryCellLabel, { color: colors.muted }]}>{c.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

type FlatItem =
  | { type: 'userHeader'; userId: string; name: string; count: number; totalValue: number }
  | { type: 'monthHeader'; key: string; label: string; count: number; totalValue: number }
  | { type: 'report'; report: ClientMeetingReport };

export function CMRReportsDashboard() {
  const colors = useColors();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);

  // Fetch reports from database
  const { data: rawReports = [], isLoading, refetch } = trpc.cmr.list.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });

  // Fetch consultants list (admin/manager only)
  const { data: consultants = [] } = trpc.users.listConsultants.useQuery(undefined, {
    enabled: isAdmin,
  });

  // Fallback: load own reports from AsyncStorage for the current user
  // This ensures reports appear even before the backfill runs.
  const [localReports, setLocalReports] = useState<ClientMeetingReport[]>([]);
  useEffect(() => {
    loadAllReports().then(setLocalReports).catch(() => {});
  }, []);

  // Convert DB rows to ClientMeetingReport shape
  const dbReports = useMemo(() => rawReports.map(toClientMeetingReport), [rawReports]);

  // Merge DB reports with local AsyncStorage reports.
  // Always include local reports not yet synced to DB — this ensures the
  // dashboard shows data even when the DB is empty (before backfill runs).
  const allReports = useMemo(() => {
    const dbLocalIds = new Set(dbReports.map((r) => r.id));
    const localOnly = localReports.filter((r) => !dbLocalIds.has(r.id));
    return [...dbReports, ...localOnly];
  }, [dbReports, localReports]);

  // Apply filters
  const filtered = useMemo(() => {
    return allReports.filter((r) => {
      // Consultant filter — match by userId stored in consultantUserId
      if (filters.consultantId !== null) {
        const matchById = r.consultantUserId === String(filters.consultantId);
        const consultant = consultants.find((c) => c.id === filters.consultantId);
        const matchByName = consultant && r.consultantName === consultant.name;
        if (!matchById && !matchByName) return false;
      }
      if (filters.outcome !== 'all' && r.outcome !== filters.outcome) return false;
      if (filters.startDate) {
        const d = new Date(r.appointmentDate);
        if (isNaN(d.getTime()) || d < filters.startDate) return false;
      }
      if (filters.endDate) {
        const d = new Date(r.appointmentDate);
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (isNaN(d.getTime()) || d > endOfDay) return false;
      }
      if (filters.minValue) {
        const min = parseFloat(filters.minValue);
        if (!isNaN(min) && (r.estimatedContractValue ?? 0) < min) return false;
      }
      if (filters.maxValue) {
        const max = parseFloat(filters.maxValue);
        if (!isNaN(max) && (r.estimatedContractValue ?? 0) > max) return false;
      }
      if (filters.minPc) {
        const min = parseFloat(filters.minPc);
        if (!isNaN(min) && (r.purchaseConfidencePct ?? 0) < min) return false;
      }
      if (filters.maxPc) {
        const max = parseFloat(filters.maxPc);
        if (!isNaN(max) && (r.purchaseConfidencePct ?? 0) > max) return false;
      }
      return true;
    });
  }, [allReports, filters, consultants]);

  // Build flat list items
  const flatItems = useMemo((): FlatItem[] => {
    const items: FlatItem[] = [];

    if (isAdmin) {
      const byUser = new Map<string, ClientMeetingReport[]>();
      for (const r of filtered) {
        const key = r.consultantName || 'Unknown';
        if (!byUser.has(key)) byUser.set(key, []);
        byUser.get(key)!.push(r);
      }

      const sortedUsers = Array.from(byUser.keys()).sort();

      for (const userName of sortedUsers) {
        const userReports = byUser.get(userName)!;
        const userTotal = userReports.reduce((s, r) => s + (r.estimatedContractValue ?? 0), 0);
        items.push({ type: 'userHeader', userId: userName, name: userName, count: userReports.length, totalValue: userTotal });

        const byMonth = new Map<string, ClientMeetingReport[]>();
        for (const r of userReports) {
          const mk = monthKey(r.appointmentDate);
          if (!byMonth.has(mk)) byMonth.set(mk, []);
          byMonth.get(mk)!.push(r);
        }

        const sortedMonths = Array.from(byMonth.keys()).sort((a, b) => {
          return new Date(b).getTime() - new Date(a).getTime();
        });

        for (const mk of sortedMonths) {
          const monthReports = byMonth.get(mk)!.sort(
            (a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()
          );
          const monthTotal = monthReports.reduce((s, r) => s + (r.estimatedContractValue ?? 0), 0);
          items.push({ type: 'monthHeader', key: `${userName}-${mk}`, label: mk, count: monthReports.length, totalValue: monthTotal });
          for (const r of monthReports) {
            items.push({ type: 'report', report: r });
          }
        }
      }
    } else {
      const byMonth = new Map<string, ClientMeetingReport[]>();
      for (const r of filtered) {
        const mk = monthKey(r.appointmentDate);
        if (!byMonth.has(mk)) byMonth.set(mk, []);
        byMonth.get(mk)!.push(r);
      }

      const sortedMonths = Array.from(byMonth.keys()).sort((a, b) => {
        return new Date(b).getTime() - new Date(a).getTime();
      });

      for (const mk of sortedMonths) {
        const monthReports = byMonth.get(mk)!.sort(
          (a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()
        );
        const monthTotal = monthReports.reduce((s, r) => s + (r.estimatedContractValue ?? 0), 0);
        items.push({ type: 'monthHeader', key: mk, label: mk, count: monthReports.length, totalValue: monthTotal });
        for (const r of monthReports) {
          items.push({ type: 'report', report: r });
        }
      }
    }

    return items;
  }, [filtered, isAdmin]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.consultantId !== null ||
      filters.outcome !== 'all' ||
      filters.startDate !== null ||
      filters.endDate !== null ||
      filters.minValue !== '' ||
      filters.maxValue !== '' ||
      filters.minPc !== '' ||
      filters.maxPc !== ''
    );
  }, [filters]);

  const handleExportPDF = useCallback(async (report: ClientMeetingReport) => {
    if (exportingId) return;
    setExportingId(report.id);
    try {
      await exportMeetingReportPDF(report);
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message ?? 'Could not generate PDF.');
    } finally {
      setExportingId(null);
    }
  }, [exportingId]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>Loading reports…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Toolbar */}
      <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
        <Text style={[styles.toolbarTitle, { color: colors.foreground }]}>
          {isAdmin ? 'All CMR Reports' : 'My Reports'}
        </Text>
        <Pressable
          onPress={() => refetch()}
          style={({ pressed }) => ([styles.refreshBtn, pressed && { opacity: 0.7 }])}
        >
          <IconSymbol name="arrow.clockwise" size={16} color={colors.muted} />
        </Pressable>
        <Pressable
          onPress={() => setShowFilters(true)}
          style={({ pressed }) => ([
            styles.filterBtn,
            {
              borderColor: hasActiveFilters ? colors.primary : colors.border,
              backgroundColor: hasActiveFilters ? colors.primary + '18' : colors.surface,
            },
            pressed && { opacity: 0.7 },
          ])}
        >
          <IconSymbol name="line.3.horizontal.decrease.circle" size={15} color={hasActiveFilters ? colors.primary : colors.muted} />
          <Text style={[styles.filterBtnText, { color: hasActiveFilters ? colors.primary : colors.muted }]}>
            Filter{hasActiveFilters ? ' ●' : ''}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={flatItems}
        keyExtractor={(item) => {
          if (item.type === 'userHeader') return `uh-${item.userId}`;
          if (item.type === 'monthHeader') return `mh-${item.key}`;
          return `r-${item.report.id}`;
        }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<SummaryBar reports={filtered} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.muted }]}>No reports found</Text>
            <Text style={[styles.emptyBody, { color: colors.muted }]}>
              {hasActiveFilters
                ? 'Try adjusting your filters.'
                : isAdmin
                ? 'No Client Meeting Reports have been submitted yet.'
                : 'You have not submitted any Client Meeting Reports yet.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          if (item.type === 'userHeader') {
            return (
              <View style={[styles.userHeader, { backgroundColor: colors.primary + '12', borderBottomColor: colors.primary + '30' }]}>
                <IconSymbol name="person.fill" size={14} color={colors.primary} />
                <Text style={[styles.userHeaderName, { color: colors.primary }]}>{item.name}</Text>
                <Text style={[styles.userHeaderMeta, { color: colors.primary + 'AA' }]}>
                  {item.count} report{item.count !== 1 ? 's' : ''} · {fmt$(item.totalValue)}
                </Text>
              </View>
            );
          }
          if (item.type === 'monthHeader') {
            return (
              <SectionHeader
                title={item.label}
                count={item.count}
                totalValue={item.totalValue}
              />
            );
          }
          return (
            <View style={{ paddingHorizontal: 12, paddingTop: 6 }}>
              <ReportRow
                report={item.report}
                showUser={isAdmin && filters.consultantId === null}
                onExportPDF={() => handleExportPDF(item.report)}
                isExporting={exportingId === item.report.id}
              />
            </View>
          );
        }}
      />

      <FilterModal
        visible={showFilters}
        filters={filters}
        consultants={consultants}
        isAdmin={isAdmin}
        onApply={setFilters}
        onClose={() => setShowFilters(false)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  toolbarTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  refreshBtn: { padding: 6, marginRight: 4 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterBtnText: { fontSize: 13, fontWeight: '600' },

  summaryBar: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  summaryCell: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  summaryCellValue: { fontSize: 13, fontWeight: '700' },
  summaryCellLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', marginTop: 2 },

  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 12,
    borderBottomWidth: 1,
  },
  userHeaderName: { fontSize: 14, fontWeight: '700', flex: 1 },
  userHeaderMeta: { fontSize: 12 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionMeta: { fontSize: 11 },

  row: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 2,
  },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  clientName: { fontSize: 14, fontWeight: '700', lineHeight: 18 },
  userName: { fontSize: 12, marginTop: 1, lineHeight: 16 },
  rowDate: { fontSize: 11, marginTop: 1 },
  pcBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  pcBadgeText: { fontSize: 12, fontWeight: '700' },
  outcomePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  outcomePillText: { fontSize: 11, fontWeight: '700' },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  pdfBtnText: { fontSize: 11, fontWeight: '700' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaChip: { alignItems: 'center' },
  metaLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },
  metaValue: { fontSize: 12, fontWeight: '700' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusPillText: { fontSize: 11, fontWeight: '600' },

  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Filter modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  filterGroup: { marginBottom: 16 },
  filterLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 4,
  },
  chipText: { fontSize: 13, fontWeight: '500' },
  inputRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  inputLabel: { fontSize: 11, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    lineHeight: 18,
  },

  // Date picker button
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dateBtnText: { fontSize: 13, flex: 1 },

  // iOS date picker modal
  iosPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iosPickerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    width: '90%',
    maxWidth: 380,
  },
  iosPickerDone: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },

  pcRangeLabel: { fontSize: 11, marginTop: 6 },

  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  clearBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  clearBtnText: { fontSize: 14, fontWeight: '600' },
  applyBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
