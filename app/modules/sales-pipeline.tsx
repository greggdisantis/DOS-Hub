/**
 * Sales Pipeline Module
 *
 * Lists all Client Meeting Reports as pipeline entries.
 * Allows inline editing of current PC% and estimated contract value.
 * Mark as Sold / Lost to record outcome and track accuracy.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, Alert, TextInput,
  ScrollView, Modal, ActivityIndicator,
} from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { loadAllReports, saveReport } from './client-meeting-report/storage';
import { ClientMeetingReport, DEAL_STATUS_LABELS } from './client-meeting-report/types';
import { Platform } from 'react-native';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(val?: number): string {
  if (val === undefined || val === null) return '—';
  return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function pcColor(pct: number, colors: ReturnType<typeof useColors>): string {
  if (pct >= 70) return colors.success;
  if (pct >= 40) return colors.warning;
  return colors.error;
}

function pcLabel(pct: number): string {
  if (pct >= 80) return 'Hot';
  if (pct >= 60) return 'Likely';
  if (pct >= 40) return 'Possible';
  if (pct >= 20) return 'Unlikely';
  return 'Cold';
}

// ── Summary Stats Bar ─────────────────────────────────────────────────────────

function SummaryBar({ reports }: { reports: ClientMeetingReport[] }) {
  const colors = useColors();
  const open = reports.filter((r) => r.outcome === 'open');
  const sold = reports.filter((r) => r.outcome === 'sold');
  const lost = reports.filter((r) => r.outcome === 'lost');

  const totalPipeline = open.reduce((sum, r) => sum + (r.estimatedContractValue ?? 0), 0);
  const weightedPipeline = open.reduce((sum, r) => sum + (r.estimatedContractValue ?? 0) * (r.purchaseConfidencePct / 100), 0);
  const totalSold = sold.reduce((sum, r) => sum + (r.estimatedContractValue ?? 0), 0);
  const conversionRate = reports.length > 0 ? Math.round((sold.length / reports.length) * 100) : 0;

  const stats = [
    { label: 'Open', value: String(open.length), sub: formatCurrency(totalPipeline), color: colors.primary },
    { label: 'Weighted', value: formatCurrency(weightedPipeline), sub: 'by PC%', color: colors.warning },
    { label: 'Sold', value: String(sold.length), sub: formatCurrency(totalSold), color: colors.success },
    { label: 'Conv. Rate', value: `${conversionRate}%`, sub: `${lost.length} lost`, color: colors.muted },
  ];

  return (
    <View style={[styles.summaryBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {stats.map((s, i) => (
        <View key={s.label} style={[styles.statCell, i < stats.length - 1 && { borderRightWidth: 1, borderRightColor: colors.border }]}>
          <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>{s.label}</Text>
          <Text style={[styles.statSub, { color: colors.muted }]}>{s.sub}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Accuracy Analytics ────────────────────────────────────────────────────────

function AccuracyPanel({ reports }: { reports: ClientMeetingReport[] }) {
  const colors = useColors();
  const closed = reports.filter((r) => r.outcome !== 'open' && r.originalPcPct !== undefined);

  if (closed.length === 0) return null;

  // Group by consultant
  const byConsultant: Record<string, { name: string; entries: ClientMeetingReport[] }> = {};
  for (const r of closed) {
    if (!byConsultant[r.consultantUserId]) {
      byConsultant[r.consultantUserId] = { name: r.consultantName, entries: [] };
    }
    byConsultant[r.consultantUserId].entries.push(r);
  }

  return (
    <View style={[styles.accuracyPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.accuracyTitle, { color: colors.foreground }]}>PC% Accuracy by Consultant</Text>
      <Text style={[styles.accuracySubtitle, { color: colors.muted }]}>Original estimate vs. actual outcome</Text>
      {Object.values(byConsultant).map((c) => {
        const soldEntries = c.entries.filter((r) => r.outcome === 'sold');
        const lostEntries = c.entries.filter((r) => r.outcome === 'lost');
        const avgOrigPc = Math.round(c.entries.reduce((s, r) => s + (r.originalPcPct ?? 0), 0) / c.entries.length);
        const soldAvgPc = soldEntries.length > 0
          ? Math.round(soldEntries.reduce((s, r) => s + (r.originalPcPct ?? 0), 0) / soldEntries.length)
          : null;
        const lostAvgPc = lostEntries.length > 0
          ? Math.round(lostEntries.reduce((s, r) => s + (r.originalPcPct ?? 0), 0) / lostEntries.length)
          : null;
        const accuracy = c.entries.length > 0 ? Math.round((soldEntries.length / c.entries.length) * 100) : 0;

        return (
          <View key={c.name} style={[styles.accuracyRow, { borderTopColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.accuracyConsultant, { color: colors.foreground }]}>{c.name}</Text>
              <Text style={[styles.accuracyDetail, { color: colors.muted }]}>
                {c.entries.length} closed · Avg orig PC%: {avgOrigPc}%
              </Text>
              {soldAvgPc !== null && (
                <Text style={[styles.accuracyDetail, { color: colors.success }]}>
                  Sold avg PC%: {soldAvgPc}% ({soldEntries.length} deals)
                </Text>
              )}
              {lostAvgPc !== null && (
                <Text style={[styles.accuracyDetail, { color: colors.error }]}>
                  Lost avg PC%: {lostAvgPc}% ({lostEntries.length} deals)
                </Text>
              )}
            </View>
            <View style={[styles.accuracyBadge, { backgroundColor: accuracy >= 60 ? colors.success + '22' : colors.warning + '22' }]}>
              <Text style={[styles.accuracyBadgeText, { color: accuracy >= 60 ? colors.success : colors.warning }]}>
                {accuracy}%{'\n'}conv.
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── Inline Edit Modal ─────────────────────────────────────────────────────────

interface EditModalProps {
  report: ClientMeetingReport;
  onSave: (updates: Partial<ClientMeetingReport>) => void;
  onClose: () => void;
}

function EditModal({ report, onSave, onClose }: EditModalProps) {
  const colors = useColors();
  const [pc, setPc] = useState(String(report.purchaseConfidencePct));
  const [value, setValue] = useState(report.estimatedContractValue !== undefined ? String(report.estimatedContractValue) : '');

  const PC_OPTIONS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  const handleSave = () => {
    const pcNum = parseInt(pc, 10);
    const valNum = parseFloat(value.replace(/[^0-9.]/g, ''));
    onSave({
      purchaseConfidencePct: isNaN(pcNum) ? report.purchaseConfidencePct : pcNum,
      estimatedContractValue: isNaN(valNum) ? report.estimatedContractValue : valNum,
    });
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            Update: {report.clientName}
          </Text>

          <Text style={[styles.modalLabel, { color: colors.muted }]}>Current PC%</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {PC_OPTIONS.map((opt) => (
                <Pressable
                  key={opt}
                  onPress={() => setPc(String(opt))}
                  style={({ pressed }) => [
                    styles.pcChip,
                    {
                      backgroundColor: String(opt) === pc ? colors.primary : colors.surface,
                      borderColor: String(opt) === pc ? colors.primary : colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.pcChipText, { color: String(opt) === pc ? '#fff' : colors.foreground }]}>
                    {opt}%
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Text style={[styles.modalLabel, { color: colors.muted }]}>Estimated Contract Value ($)</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="e.g., 25000"
            placeholderTextColor={colors.muted}
            keyboardType="numeric"
            returnKeyType="done"
            style={[styles.modalInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
          />

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.modalBtn, { backgroundColor: colors.border }, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [styles.modalBtn, { backgroundColor: colors.primary, flex: 1 }, pressed && { opacity: 0.8 }]}
            >
              <Text style={[styles.modalBtnText, { color: '#fff' }]}>Save Changes</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Pipeline Row ──────────────────────────────────────────────────────────────

interface PipelineRowProps {
  report: ClientMeetingReport;
  onEdit: () => void;
  onMarkSold: () => void;
  onMarkLost: () => void;
  onReopen: () => void;
}

function PipelineRow({ report, onEdit, onMarkSold, onMarkLost, onReopen }: PipelineRowProps) {
  const colors = useColors();
  const isSold = report.outcome === 'sold';
  const isLost = report.outcome === 'lost';
  const isOpen = report.outcome === 'open';

  const currentPc = report.purchaseConfidencePct;
  const origPc = report.originalPcPct;
  const pcDrift = origPc !== undefined ? currentPc - origPc : null;

  const rowBg = isSold ? colors.success + '10' : isLost ? colors.error + '10' : colors.surface;
  const rowBorder = isSold ? colors.success + '40' : isLost ? colors.error + '40' : colors.border;

  return (
    <View style={[styles.pipelineRow, { backgroundColor: rowBg, borderColor: rowBorder }]}>
      {/* Header row */}
      <View style={styles.rowHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.clientName, { color: colors.foreground }]} numberOfLines={1}>
            {report.clientName || 'Unnamed Client'}
          </Text>
          <Text style={[styles.consultantName, { color: colors.muted }]} numberOfLines={1}>
            {report.consultantName} · {report.appointmentDate ? new Date(report.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
          </Text>
        </View>
        {isOpen && (
          <Pressable
            onPress={onEdit}
            style={({ pressed }) => [styles.editBtn, { borderColor: colors.border }, pressed && { opacity: 0.6 }]}
            hitSlop={4}
          >
            <IconSymbol name="pencil" size={14} color={colors.muted} />
          </Pressable>
        )}
      </View>

      {/* Data row */}
      <View style={styles.rowData}>
        {/* PC% */}
        <View style={styles.dataCell}>
          <Text style={[styles.dataCellLabel, { color: colors.muted }]}>Current PC%</Text>
          <Text style={[styles.dataCellValue, { color: pcColor(currentPc, colors) }]}>
            {currentPc}% <Text style={[styles.dataCellSub, { color: colors.muted }]}>{pcLabel(currentPc)}</Text>
          </Text>
        </View>

        {/* Original PC% */}
        <View style={styles.dataCell}>
          <Text style={[styles.dataCellLabel, { color: colors.muted }]}>Orig. PC%</Text>
          <Text style={[styles.dataCellValue, { color: colors.foreground }]}>
            {origPc !== undefined ? `${origPc}%` : '—'}
          </Text>
          {pcDrift !== null && pcDrift !== 0 && (
            <Text style={[styles.dataCellSub, { color: pcDrift > 0 ? colors.success : colors.error }]}>
              {pcDrift > 0 ? `+${pcDrift}` : String(pcDrift)}
            </Text>
          )}
        </View>

        {/* Est. Value */}
        <View style={styles.dataCell}>
          <Text style={[styles.dataCellLabel, { color: colors.muted }]}>Est. Value</Text>
          <Text style={[styles.dataCellValue, { color: colors.foreground }]}>
            {formatCurrency(report.estimatedContractValue)}
          </Text>
        </View>

        {/* Status */}
        <View style={styles.dataCell}>
          <Text style={[styles.dataCellLabel, { color: colors.muted }]}>Status</Text>
          <View style={[styles.outcomePill, {
            backgroundColor: isSold ? colors.success + '22' : isLost ? colors.error + '22' : colors.primary + '18',
          }]}>
            <Text style={[styles.outcomePillText, {
              color: isSold ? colors.success : isLost ? colors.error : colors.primary,
            }]}>
              {isSold ? 'SOLD' : isLost ? 'LOST' : (report.dealStatus ? (DEAL_STATUS_LABELS[report.dealStatus] ?? 'Open') : 'Open')}
            </Text>
          </View>
        </View>
      </View>

      {/* Action buttons */}
      {isOpen && (
        <View style={styles.actionRow}>
          <Pressable
            onPress={onMarkSold}
            style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.success + '18', borderColor: colors.success + '40' }, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.actionBtnText, { color: colors.success }]}>✓ Mark as Sold</Text>
          </Pressable>
          <Pressable
            onPress={onMarkLost}
            style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.error + '18', borderColor: colors.error + '40' }, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.actionBtnText, { color: colors.error }]}>✗ Mark as Lost</Text>
          </Pressable>
        </View>
      )}
      {!isOpen && (
        <View style={styles.actionRow}>
          <Text style={[styles.closedDate, { color: colors.muted }]}>
            {isSold ? '✓ Sold' : '✗ Lost'}{report.soldAt ? ` on ${new Date(report.soldAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
          </Text>
          <Pressable
            onPress={onReopen}
            style={({ pressed }) => [styles.reopenBtn, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.reopenBtnText, { color: colors.muted }]}>Reopen</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

type FilterTab = 'open' | 'sold' | 'lost' | 'all';

export default function SalesPipelineScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const [reports, setReports] = useState<ClientMeetingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('open');
  const [editingReport, setEditingReport] = useState<ClientMeetingReport | null>(null);
  const [search, setSearch] = useState('');

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const all = await loadAllReports();
      // Sort: open first, then by appointment date desc
      all.sort((a, b) => {
        if (a.outcome === 'open' && b.outcome !== 'open') return -1;
        if (a.outcome !== 'open' && b.outcome === 'open') return 1;
        return new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime();
      });
      setReports(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  const updateReport = useCallback(async (id: string, updates: Partial<ClientMeetingReport>) => {
    const report = reports.find((r) => r.id === id);
    if (!report) return;
    const updated: ClientMeetingReport = { ...report, ...updates, updatedAt: new Date().toISOString() };
    await saveReport(updated);
    await loadReports();
  }, [reports, loadReports]);

  const handleMarkSold = useCallback((report: ClientMeetingReport) => {
    Alert.alert(
      'Mark as Sold',
      `Mark "${report.clientName}" as SOLD? This will record the outcome and lock the original PC% for accuracy tracking.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Sold',
          onPress: () => updateReport(report.id, {
            outcome: 'sold',
            soldAt: new Date().toISOString(),
            soldBy: user?.id ? String(user.id) : '',
          }),
        },
      ]
    );
  }, [updateReport, user]);

  const handleMarkLost = useCallback((report: ClientMeetingReport) => {
    Alert.alert(
      'Mark as Lost',
      `Mark "${report.clientName}" as LOST? This will record the outcome for accuracy tracking.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Lost',
          style: 'destructive',
          onPress: () => updateReport(report.id, {
            outcome: 'lost',
            soldAt: new Date().toISOString(),
            soldBy: user?.id ? String(user.id) : '',
          }),
        },
      ]
    );
  }, [updateReport, user]);

  const handleReopen = useCallback((report: ClientMeetingReport) => {
    Alert.alert('Reopen', `Reopen "${report.clientName}" as active?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reopen', onPress: () => updateReport(report.id, { outcome: 'open', soldAt: undefined, soldBy: undefined }) },
    ]);
  }, [updateReport]);

  const handleEditSave = useCallback(async (updates: Partial<ClientMeetingReport>) => {
    if (!editingReport) return;
    await updateReport(editingReport.id, updates);
    setEditingReport(null);
  }, [editingReport, updateReport]);

  const filteredReports = reports.filter((r) => {
    const matchesFilter = filter === 'all' || r.outcome === filter;
    const q = search.toLowerCase();
    const matchesSearch = !q || r.clientName.toLowerCase().includes(q) || r.consultantName.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const FILTER_TABS: { key: FilterTab; label: string }[] = [
    { key: 'open', label: `Open (${reports.filter((r) => r.outcome === 'open').length})` },
    { key: 'sold', label: `Sold (${reports.filter((r) => r.outcome === 'sold').length})` },
    { key: 'lost', label: `Lost (${reports.filter((r) => r.outcome === 'lost').length})` },
    { key: 'all', label: `All (${reports.length})` },
  ];

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Sales Pipeline</Text>
        <Text style={[styles.headerSub, { color: colors.muted }]}>Track deals, confidence & outcomes</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Loading pipeline…</Text>
        </View>
      ) : (
        <FlatList
          data={filteredReports}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              <SummaryBar reports={reports} />

              {/* Search */}
              <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search client or consultant…"
                  placeholderTextColor={colors.muted}
                  returnKeyType="search"
                  style={[styles.searchInput, { color: colors.foreground }]}
                />
              </View>

              {/* Filter tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabs}>
                {FILTER_TABS.map((tab) => (
                  <Pressable
                    key={tab.key}
                    onPress={() => setFilter(tab.key)}
                    style={({ pressed }) => [
                      styles.filterTab,
                      { borderColor: filter === tab.key ? colors.primary : colors.border, backgroundColor: filter === tab.key ? colors.primary + '18' : colors.surface },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={[styles.filterTabText, { color: filter === tab.key ? colors.primary : colors.muted }]}>
                      {tab.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <AccuracyPanel reports={reports} />
            </>
          }
          renderItem={({ item }) => (
            <PipelineRow
              report={item}
              onEdit={() => setEditingReport(item)}
              onMarkSold={() => handleMarkSold(item)}
              onMarkLost={() => handleMarkLost(item)}
              onReopen={() => handleReopen(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.muted }]}>No reports found</Text>
              <Text style={[styles.emptyBody, { color: colors.muted }]}>
                Create Client Meeting Reports to populate the pipeline.
              </Text>
            </View>
          }
        />
      )}

      {editingReport && (
        <EditModal
          report={editingReport}
          onSave={handleEditSave}
          onClose={() => setEditingReport(null)}
        />
      )}
    </ScreenContainer>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  headerSub: { fontSize: 13, marginTop: 2 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  listContent: { padding: 12, gap: 10, paddingBottom: 32 },

  // Summary bar
  summaryBar: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 },
  statValue: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginTop: 2 },
  statSub: { fontSize: 10, marginTop: 1 },

  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, gap: 8, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, lineHeight: 20 },

  // Filter tabs
  filterTabs: { marginBottom: 12 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  filterTabText: { fontSize: 13, fontWeight: '500' },

  // Accuracy panel
  accuracyPanel: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  accuracyTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  accuracySubtitle: { fontSize: 12, marginBottom: 10 },
  accuracyRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, marginTop: 10, borderTopWidth: 1 },
  accuracyConsultant: { fontSize: 13, fontWeight: '600' },
  accuracyDetail: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  accuracyBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  accuracyBadgeText: { fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 16 },

  // Pipeline row
  pipelineRow: { borderRadius: 12, borderWidth: 1, padding: 14 },
  rowHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  clientName: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  consultantName: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  editBtn: { padding: 6, borderRadius: 8, borderWidth: 1 },

  rowData: { flexDirection: 'row', gap: 4, marginBottom: 10 },
  dataCell: { flex: 1 },
  dataCellLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', marginBottom: 3 },
  dataCellValue: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  dataCellSub: { fontSize: 11, lineHeight: 14 },

  outcomePill: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  outcomePillText: { fontSize: 10, fontWeight: '700' },

  actionRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  closedDate: { flex: 1, fontSize: 12, lineHeight: 16 },
  reopenBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  reopenBtnText: { fontSize: 12, fontWeight: '500' },

  // Edit modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 400, borderRadius: 16, borderWidth: 1, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  modalLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 },
  modalInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: 16 },
  modalBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center', paddingHorizontal: 16 },
  modalBtnText: { fontSize: 14, fontWeight: '600' },
  pcChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  pcChipText: { fontSize: 13, fontWeight: '600' },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
