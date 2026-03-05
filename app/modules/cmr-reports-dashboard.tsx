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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { trpc } from '@/lib/trpc';
import { Linking } from 'react-native';
import {
  ClientMeetingReport, DEAL_STATUS_LABELS,
  LEAD_SOURCE_OPTIONS, PROJECT_TYPE_OPTIONS,
  VALUE_COMMUNICATED_OPTIONS, OBJECTION_OPTIONS,
  MESSAGING_OPTIONS,
} from './client-meeting-report/types';
import { IconSymbol } from '@/components/ui/icon-symbol';


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

function toClientMeetingReport(row: any): ClientMeetingReport & { dbId: number } {
  const data = row.reportData as ClientMeetingReport;
  return {
    ...data,
    id: row.localId ?? data?.id ?? String(row.id),
    dbId: row.id as number,
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
  onOpen,
}: {
  report: ClientMeetingReport;
  showUser: boolean;
  onExportPDF: () => void;
  isExporting: boolean;
  onOpen: () => void;
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

        <Pressable
          onPress={onOpen}
          style={({ pressed }) => ([
            styles.outcomePill,
            { backgroundColor: outcomeColor + (pressed ? '35' : '18') },
            pressed && { opacity: 0.8 },
          ])}
        >
          <Text style={[styles.outcomePillText, { color: outcomeColor }]}>{outcomeLabel}</Text>
        </Pressable>

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

      {/* Latest progress note */}
      {report.progressNotes && report.progressNotes.length > 0 && (() => {
        const latest = report.progressNotes[0];
        const noteDate = (() => {
          try { return new Date(latest.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
          catch { return ''; }
        })();
        return (
          <View style={[styles.latestNoteRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.latestNoteLabel, { color: colors.primary }]}>Note {noteDate}:</Text>
            <Text style={[styles.latestNoteText, { color: colors.muted }]} numberOfLines={2}>{latest.text}</Text>
          </View>
        );
      })()}

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

// ── CMR Detail Modal ─────────────────────────────────────────────────────────

function CMRDetailModal({
  report,
  visible,
  onClose,
  onExportPDF,
  isExporting,
}: {
  report: ClientMeetingReport | null;
  visible: boolean;
  onClose: () => void;
  onExportPDF: () => void;
  isExporting: boolean;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  if (!report) return null;

  const pcColor =
    report.purchaseConfidencePct >= 70
      ? colors.success
      : report.purchaseConfidencePct >= 40
      ? colors.warning
      : colors.error;

  const fmt = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const dealLabel = report.dealStatus
    ? (DEAL_STATUS_LABELS[report.dealStatus] ?? report.dealStatus)
    : '—';

  const leadSourceLabels = report.leadSources
    .map((v) => LEAD_SOURCE_OPTIONS.find((o) => o.value === v)?.label ?? v)
    .join(', ');

  const projectTypeLabels = report.projectTypes
    .map((v) => PROJECT_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v)
    .join(', ');

  const valueCommunicatedLabels = report.valueCommunicated
    .map((v) => VALUE_COMMUNICATED_OPTIONS.find((o) => o.value === v)?.label ?? v)
    .join(', ');

  const objectionLabels = report.objections
    .map((v) => OBJECTION_OPTIONS.find((o) => o.value === v)?.label ?? v)
    .join(', ');

  const messagingLabels = report.messagingReferenced
    .map((v) => MESSAGING_OPTIONS.find((o) => o.value === v)?.label ?? v)
    .join(', ');

  const sourceLabel =
    report.source === 'marketing-in-home' ? 'Marketing – In-Home'
    : report.source === 'marketing-showroom' ? 'Marketing – Showroom'
    : report.source === 'self-generated' ? 'Self-Generated'
    : '—';

  function Row({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
      <View style={[detailStyles.row, { borderBottomColor: colors.border }]}>
        <Text style={[detailStyles.key, { color: colors.muted }]}>{label}</Text>
        <Text style={[detailStyles.val, { color: colors.foreground }]}>{value}</Text>
      </View>
    );
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <View style={detailStyles.section}>
        <View style={[detailStyles.sectionHeader, { borderBottomColor: colors.primary }]}>
          <Text style={[detailStyles.sectionTitle, { color: colors.primary }]}>{title}</Text>
        </View>
        {children}
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[detailStyles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        {/* Header toolbar */}
        <View style={[detailStyles.toolbar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [detailStyles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <IconSymbol name="chevron.right" size={20} color={colors.primary} style={{ transform: [{ rotate: '180deg' }] }} />
            <Text style={[detailStyles.backBtnText, { color: colors.primary }]}>Close</Text>
          </Pressable>
          <Text style={[detailStyles.toolbarTitle, { color: colors.foreground }]} numberOfLines={1}>
            {report.clientName || 'Report'}
          </Text>
          <Pressable
            onPress={onExportPDF}
            disabled={isExporting}
            style={({ pressed }) => [
              detailStyles.exportBtn,
              { backgroundColor: colors.error + (pressed ? 'CC' : 'FF') },
              pressed && { opacity: 0.85 },
            ]}
          >
            {isExporting
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <IconSymbol name="arrow.down.doc.fill" size={12} color="#fff" />
                  <Text style={detailStyles.exportBtnText}>PDF</Text>
                </>}
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero header */}
          <View style={[detailStyles.hero, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
            <Text style={[detailStyles.heroName, { color: colors.foreground }]}>
              {report.clientName || 'Unnamed Client'}
            </Text>
            <Text style={[detailStyles.heroSub, { color: colors.muted }]}>
              {fmt(report.appointmentDate)} · {report.consultantName}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <View style={[detailStyles.pcBadge, { backgroundColor: pcColor }]}>
                <Text style={detailStyles.pcBadgeText}>{report.purchaseConfidencePct}% PC</Text>
              </View>
              {report.estimatedContractValue != null && (
                <View style={[detailStyles.valueBadge, { backgroundColor: colors.success + '22', borderColor: colors.success + '44' }]}>
                  <Text style={[detailStyles.valueBadgeText, { color: colors.success }]}>
                    ${report.estimatedContractValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </Text>
                </View>
              )}
              <View style={[detailStyles.statusBadge, { backgroundColor: colors.primary + '18' }]}>
                <Text style={[detailStyles.statusBadgeText, { color: colors.primary }]}>{dealLabel}</Text>
              </View>
            </View>
          </View>

          <Section title="Client Information">
            <Row label="Consultant" value={report.consultantName} />
            <Row label="Week Of" value={fmt(report.weekOf)} />
            <Row label="Source" value={sourceLabel} />
            <Row label="Address" value={report.address} />
            <Row label="Client Type" value={report.clientType === 'residential' ? 'Residential' : report.clientType === 'commercial' ? 'Commercial' : null} />
            <Row label="Appt Type" value={report.appointmentType === 'in-home' ? 'In-Home' : report.appointmentType === 'showroom' ? 'Showroom' : report.appointmentType === 'phone' ? 'Phone' : null} />
            <Row label="Lead Sources" value={leadSourceLabels || null} />
            <Row label="Project Types" value={projectTypeLabels || null} />
          </Section>

          <Section title="Deal Status">
            <Row label="Status" value={dealLabel} />
            <Row label="Close Timeline" value={report.closeTimeline ? `${report.closeTimeline} days` : null} />
            <Row label="Follow-Up Date" value={fmt(report.followUpDate)} />
            <Row label="Proposal Date" value={fmt(report.proposalDate)} />
            <Row label="Lost Reason" value={report.lostReason} />
            <Row label="Conversation Summary" value={report.lastConversationSummary} />
          </Section>

          <Section title="Purchase Confidence">
            <Row label="Current PC%" value={`${report.purchaseConfidencePct}%`} />
            <Row label="Original PC%" value={report.originalPcPct != null ? `${report.originalPcPct}%` : null} />
            <Row label="Est. Value" value={report.estimatedContractValue != null ? `$${report.estimatedContractValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : null} />
            <Row label="Decision Makers" value={report.decisionMakers} />
            <Row label="Motivation" value={report.mainMotivation} />
            <Row label="Hesitation" value={report.mainHesitation} />
            <Row label="PC Notes" value={report.pcNotes} />
          </Section>

          <Section title="Value & Objections">
            <Row label="Financing?" value={report.financingDiscussed === true ? 'Yes' : report.financingDiscussed === false ? 'No' : null} />
            <Row label="Financing Reaction" value={report.financingReaction || null} />
            <Row label="Value Communicated" value={valueCommunicatedLabels || null} />
            <Row label="Client Response" value={report.clientResponse || null} />
            <Row label="Objections" value={objectionLabels || null} />
            <Row label="Objection Notes" value={report.objectionNotes} />
          </Section>

          <Section title="Next Steps">
            <Row label="Next Actions" value={report.nextActions.join(', ') || null} />
            <Row label="Follow-Up Date" value={fmt(report.nextFollowUpDate)} />
          </Section>

          {(report.source === 'marketing-in-home' || report.source === 'marketing-showroom') && (
            <Section title="Marketing Feedback">
              <Row label="Lead Quality" value={report.leadQuality || null} />
              <Row label="Expectation Align" value={report.expectationAlignment || null} />
              <Row label="Messaging" value={messagingLabels || null} />
              <Row label="Budget Alignment" value={report.budgetAlignment || null} />
              <Row label="Marketing Notes" value={report.marketingNotes} />
            </Section>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const detailStyles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  backBtnText: { fontSize: 15, fontWeight: '500' },
  toolbarTitle: { flex: 1, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 52,
    justifyContent: 'center',
  },
  exportBtnText: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  hero: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  heroName: { fontSize: 22, fontWeight: '700' },
  heroSub: { fontSize: 13, marginTop: 2 },
  pcBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  pcBadgeText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  valueBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  valueBadgeText: { fontWeight: '700', fontSize: 14 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  statusBadgeText: { fontWeight: '600', fontSize: 13 },
  section: { marginBottom: 16 },
  sectionHeader: { borderBottomWidth: 1.5, paddingBottom: 4, marginBottom: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  row: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  key: { width: 130, fontSize: 12, fontWeight: '600', flexShrink: 0 },
  val: { flex: 1, fontSize: 13, lineHeight: 18 },
});

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
  const [detailReport, setDetailReport] = useState<(ClientMeetingReport & { dbId: number }) | null>(null);
  const exportPDFMutation = trpc.cmr.exportPDF.useMutation();

  // Fetch reports from database
  const { data: rawReports = [], isLoading, refetch } = trpc.cmr.list.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });

  // Fetch consultants list (admin/manager only)
  const { data: consultants = [] } = trpc.users.listConsultants.useQuery(undefined, {
    enabled: isAdmin,
  });

  // Convert DB rows to ClientMeetingReport shape (database is the single source of truth)
  const allReports = useMemo(() => rawReports.map(toClientMeetingReport), [rawReports]);

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

  const handleExportPDF = useCallback(async (report: ClientMeetingReport & { dbId?: number }) => {
    if (exportingId) return;
    const numericId = (report as any).dbId as number | undefined;
    if (!numericId) {
      Alert.alert('Export Failed', 'Report ID not found. Please refresh and try again.');
      return;
    }
    setExportingId(report.id);
    try {
      const result = await exportPDFMutation.mutateAsync({ id: numericId });
      if (Platform.OS === 'web') {
        window.open(result.url, '_blank');
      } else {
        await Linking.openURL(result.url);
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message ?? 'Could not generate PDF. Please try again.');
    } finally {
      setExportingId(null);
    }
  }, [exportingId, exportPDFMutation]);

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
                onOpen={() => setDetailReport(item.report)}
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

      <CMRDetailModal
        report={detailReport}
        visible={detailReport !== null}
        onClose={() => setDetailReport(null)}
        onExportPDF={() => detailReport && handleExportPDF(detailReport)}
        isExporting={detailReport !== null && exportingId === detailReport.id}
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
  latestNoteRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, borderTopWidth: 0.5, alignItems: 'flex-start' },
  latestNoteLabel: { fontSize: 11, fontWeight: '700', flexShrink: 0 },
  latestNoteText: { fontSize: 11, lineHeight: 15, flex: 1 },

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
