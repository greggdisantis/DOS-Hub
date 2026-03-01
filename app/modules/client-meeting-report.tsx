/**
 * Client Meeting Report Module
 *
 * Main screen: list of all reports for the logged-in consultant.
 * Tap "+" to create a new report, tap a card to view/edit/export.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { ClientMeetingFormWizard } from './client-meeting-report/form';
import { exportMeetingReportPDF } from './client-meeting-report/pdf-export';
import { loadAllReports, saveReport, deleteReport, generateId } from './client-meeting-report/storage';
import { trpc } from '@/lib/trpc';
import {
  ClientMeetingReport, EMPTY_REPORT, DEAL_STATUS_LABELS,
} from './client-meeting-report/types';
import { Platform } from 'react-native';

type ViewMode = 'list' | 'form' | 'detail';

// ── Report card ───────────────────────────────────────────────────────────────

function ReportCard({
  report, onPress, onDelete,
}: { report: ClientMeetingReport; onPress: () => void; onDelete: () => void }) {
  const colors = useColors();
  const date = report.appointmentDate
    ? new Date(report.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
  const statusLabel = report.dealStatus ? (DEAL_STATUS_LABELS[report.dealStatus] ?? report.dealStatus) : 'Draft';
  const pcColor = report.purchaseConfidencePct >= 70 ? colors.success : report.purchaseConfidencePct >= 40 ? colors.warning : colors.error;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.75 },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardClient, { color: colors.foreground }]} numberOfLines={1}>
            {report.clientName || 'Unnamed Client'}
          </Text>
          <Text style={[styles.cardDate, { color: colors.muted }]}>{date}</Text>
        </View>
        <View style={[styles.pcBadge, { backgroundColor: pcColor + '22' }]}>
          <Text style={[styles.pcBadgeText, { color: pcColor }]}>{report.purchaseConfidencePct}%</Text>
        </View>
      </View>

      <View style={styles.cardMeta}>
        <View style={[styles.statusPill, { backgroundColor: colors.primary + '18' }]}>
          <Text style={[styles.statusPillText, { color: colors.primary }]} numberOfLines={1}>{statusLabel}</Text>
        </View>
        <Text style={[styles.cardConsultant, { color: colors.muted }]} numberOfLines={1}>
          {report.consultantName}
        </Text>
      </View>

      <Pressable
        onPress={onDelete}
        style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.5 }]}
        hitSlop={8}
      >
        <IconSymbol name="trash.fill" size={16} color={colors.error} />
      </Pressable>
    </Pressable>
  );
}

// ── Detail / export view ──────────────────────────────────────────────────────

function ReportDetail({
  report, onEdit, onExport, onBack, isExporting,
}: {
  report: ClientMeetingReport;
  onEdit: () => void;
  onExport: () => void;
  onBack: () => void;
  isExporting: boolean;
}) {
  const colors = useColors();
  const reportRef = useRef<View>(null);

  const pcColor = report.purchaseConfidencePct >= 70 ? colors.success : report.purchaseConfidencePct >= 40 ? colors.warning : colors.error;
  const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  function Row({ label, value }: { label: string; value?: string }) {
    if (!value) return null;
    return (
      <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.detailKey, { color: colors.muted }]}>{label}</Text>
        <Text style={[styles.detailVal, { color: colors.foreground }]}>{value}</Text>
      </View>
    );
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <View style={styles.detailSection}>
        <View style={[styles.detailSectionHeader, { borderBottomColor: colors.primary }]}>
          <Text style={[styles.detailSectionTitle, { color: colors.primary }]}>{title}</Text>
        </View>
        {children}
      </View>
    );
  }

  const dealLabel = report.dealStatus ? (DEAL_STATUS_LABELS[report.dealStatus] ?? report.dealStatus) : '—';

  return (
    <View style={{ flex: 1 }}>
      {/* Toolbar */}
      <View style={[styles.detailToolbar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={onBack} style={({ pressed }) => [styles.toolbarBtn, pressed && { opacity: 0.6 }]}>
          <IconSymbol name="chevron.right" size={20} color={colors.primary} style={{ transform: [{ rotate: '180deg' }] }} />
          <Text style={[styles.toolbarBtnText, { color: colors.primary }]}>Back</Text>
        </Pressable>
        <Text style={[styles.toolbarTitle, { color: colors.foreground }]} numberOfLines={1}>
          {report.clientName || 'Report'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={onEdit} style={({ pressed }) => [styles.toolbarBtn, pressed && { opacity: 0.6 }]}>
            <IconSymbol name="pencil" size={18} color={colors.primary} />
          </Pressable>
          <Pressable onPress={onExport} style={({ pressed }) => [styles.exportBtn, { backgroundColor: colors.primary + (pressed ? 'CC' : 'FF') }, pressed && { opacity: 0.85 }]}>
            {isExporting
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Text style={styles.exportBtnText}>EXPORT TO PDF</Text>}
          </Pressable>
        </View>
      </View>

      {/* Report content (ref for PDF capture) */}
      <ScrollView
        ref={reportRef as any}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.detailHeader, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
          <Text style={[styles.detailClientName, { color: colors.foreground }]}>{report.clientName || 'Unnamed Client'}</Text>
          <Text style={[styles.detailSubtitle, { color: colors.muted }]}>
            {fmt(report.appointmentDate)} · {report.consultantName}
          </Text>
          <View style={[styles.pcBadgeLarge, { backgroundColor: pcColor }]}>
            <Text style={styles.pcBadgeLargeText}>{report.purchaseConfidencePct}% PC</Text>
          </View>
        </View>

        <Section title="Client Information">
          <Row label="Consultant" value={report.consultantName} />
          <Row label="Week Of" value={fmt(report.weekOf)} />
          <Row label="Source" value={report.source === 'marketing-in-home' ? 'Marketing – In-Home' : report.source === 'marketing-showroom' ? 'Marketing – Showroom' : report.source === 'self-generated' ? 'Self-Generated' : undefined} />
          <Row label="Address" value={report.address} />
          <Row label="Client Type" value={report.clientType === 'residential' ? 'Residential' : report.clientType === 'commercial' ? 'Commercial' : undefined} />
          <Row label="Appt Type" value={report.appointmentType === 'in-home' ? 'In-Home' : report.appointmentType === 'showroom' ? 'Showroom' : report.appointmentType === 'phone' ? 'Phone' : undefined} />
          <Row label="Lead Sources" value={report.leadSources.join(', ')} />
          <Row label="Project Types" value={report.projectTypes.join(', ')} />
        </Section>

        <Section title="Deal Status">
          <Row label="Status" value={dealLabel} />
          <Row label="Close Timeline" value={report.closeTimeline ? `${report.closeTimeline} days` : undefined} />
          <Row label="Follow-Up Date" value={fmt(report.followUpDate)} />
          <Row label="Conversation Summary" value={report.lastConversationSummary} />
        </Section>

        <Section title="Purchase Confidence">
          <Row label="PC %" value={String(report.purchaseConfidencePct) + '%'} />
          <Row label="Decision Makers" value={report.decisionMakers} />
          <Row label="Motivation" value={report.mainMotivation} />
          <Row label="Hesitation" value={report.mainHesitation} />
          <Row label="PC Notes" value={report.pcNotes} />
        </Section>

        <Section title="Value & Objections">
          <Row label="Financing Discussed?" value={report.financingDiscussed === true ? 'Yes' : report.financingDiscussed === false ? 'No' : undefined} />
          <Row label="Value Communicated" value={report.valueCommunicated.join(', ')} />
          <Row label="Client Response" value={report.clientResponse} />
          <Row label="Objections" value={report.objections.join(', ')} />
          <Row label="Objection Notes" value={report.objectionNotes} />
        </Section>

        <Section title="Next Steps">
          <Row label="Next Actions" value={report.nextActions.join(', ')} />
          <Row label="Follow-Up Date" value={fmt(report.nextFollowUpDate)} />
        </Section>

        {(report.source === 'marketing-in-home' || report.source === 'marketing-showroom') && (
          <Section title="Marketing Feedback">
            <Row label="Lead Quality" value={report.leadQuality} />
            <Row label="Expectation Alignment" value={report.expectationAlignment} />
            <Row label="Messaging Referenced" value={report.messagingReferenced.join(', ')} />
            <Row label="Budget Alignment" value={report.budgetAlignment} />
            <Row label="Marketing Notes" value={report.marketingNotes} />
          </Section>
        )}
      </ScrollView>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ClientMeetingReportScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const [reports, setReports] = useState<ClientMeetingReport[]>([]);
  const [loading, setLoading] = useState(true);
   const { editReportId } = useLocalSearchParams<{ editReportId?: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeReport, setActiveReport] = useState<ClientMeetingReport | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const detailScrollRef = useRef<ScrollView>(null);
  // Load reports on mount; if editReportId param is present, auto-open that report for editing
  useEffect(() => {
    loadAllReports().then((all) => {
      setReports(all);
      setLoading(false);
      if (editReportId) {
        const target = all.find((r) => r.id === editReportId);
        if (target) {
          setActiveReport({ ...target });
          setViewMode('form');
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshReports = useCallback(async () => {
    const all = await loadAllReports();
    setReports(all);
  }, []);

  const handleNewReport = useCallback(() => {
    const blank = EMPTY_REPORT();
    blank.id = generateId();
    const fullName = (user?.firstName && user?.lastName)
      ? `${user.firstName} ${user.lastName}`.trim()
      : (user?.name ?? '');
    blank.consultantName = fullName;
    blank.consultantUserId = user?.id != null ? String(user.id) : '';
    setActiveReport(blank);
    setViewMode('form');
  }, [user]);

  const handleEdit = useCallback((report: ClientMeetingReport) => {
    setActiveReport({ ...report });
    setViewMode('form');
  }, []);

  const handleView = useCallback((report: ClientMeetingReport) => {
    setActiveReport(report);
    setViewMode('detail');
  }, []);

  const handleUpdate = useCallback((partial: Partial<ClientMeetingReport>) => {
    setActiveReport((prev) => prev ? { ...prev, ...partial } : prev);
  }, []);

  const cmrUpsert = trpc.cmr.upsert.useMutation();

  const handleSave = useCallback(async () => {
    if (!activeReport) return;
    setIsSaving(true);
    try {
      // Lock originalPcPct on first save — never overwrite once set
      const reportToSave: ClientMeetingReport = {
        ...activeReport,
        originalPcPct: activeReport.originalPcPct ?? activeReport.purchaseConfidencePct,
      };
      // Save locally first (always works even offline)
      await saveReport(reportToSave);
      // Also sync to database so admin/manager can see it in the dashboard
      try {
        await cmrUpsert.mutateAsync({
          localId: reportToSave.id,
          consultantName: reportToSave.consultantName,
          consultantUserId: reportToSave.consultantUserId,
          clientName: reportToSave.clientName,
          appointmentDate: reportToSave.appointmentDate,
          weekOf: reportToSave.weekOf,
          dealStatus: reportToSave.dealStatus,
          outcome: reportToSave.outcome ?? 'open',
          purchaseConfidencePct: reportToSave.purchaseConfidencePct,
          originalPcPct: reportToSave.originalPcPct,
          estimatedContractValue: reportToSave.estimatedContractValue,
          soldAt: reportToSave.soldAt,
          reportData: reportToSave,
        });
      } catch (syncErr) {
        // Non-fatal: local save succeeded, DB sync failed (e.g. offline)
        console.warn('[CMR] DB sync failed (non-fatal):', syncErr);
      }
      await refreshReports();
      setViewMode('list');
      setActiveReport(null);
    } catch (e) {
      Alert.alert('Error', 'Failed to save report. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [activeReport, refreshReports, cmrUpsert]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert('Delete Report', 'Are you sure you want to delete this report?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteReport(id);
          await refreshReports();
        },
      },
    ]);
  }, [refreshReports]);

  const handleExport = useCallback(async () => {
    if (!activeReport) return;
    setIsExporting(true);
    try {
      // On web, get the DOM element from the ScrollView ref
      let domEl: HTMLElement | null = null;
      if (Platform.OS === 'web' && detailScrollRef.current) {
        // React Native Web renders ScrollView as a div
        domEl = (detailScrollRef.current as any)._nativeTag ?? (detailScrollRef.current as any)._node ?? null;
        if (!domEl) {
          // Fallback: find by traversing
          const inner = (detailScrollRef.current as any)?._scrollRef?.current;
          domEl = inner ?? null;
        }
      }
      await exportMeetingReportPDF(activeReport, domEl);
    } catch (e) {
      Alert.alert('Export Failed', 'Could not generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [activeReport]);

  const handleCancel = useCallback(() => {
    setViewMode('list');
    setActiveReport(null);
  }, []);

  // ── Render form ──────────────────────────────────────────────────────────
  if (viewMode === 'form' && activeReport) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']}>
        <View style={[styles.formHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.formHeaderTitle, { color: colors.foreground }]}>
            {activeReport.id && reports.find((r) => r.id === activeReport.id) ? 'Edit Report' : 'New Meeting Report'}
          </Text>
        </View>
        <ClientMeetingFormWizard
          report={activeReport}
          onUpdate={handleUpdate}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isSaving}
        />
      </ScreenContainer>
    );
  }

  // ── Render detail ────────────────────────────────────────────────────────
  if (viewMode === 'detail' && activeReport) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']}>
        <ReportDetail
          report={activeReport}
          onEdit={() => handleEdit(activeReport)}
          onExport={handleExport}
          onBack={() => { setViewMode('list'); setActiveReport(null); }}
          isExporting={isExporting}
        />
      </ScreenContainer>
    );
  }

  // ── Render list ──────────────────────────────────────────────────────────
  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.listHeader}>
        <View>
          <Text style={[styles.listTitle, { color: colors.foreground }]}>Meeting Reports</Text>
          <Text style={[styles.listSubtitle, { color: colors.muted }]}>
            {reports.length} report{reports.length !== 1 ? 's' : ''} saved
          </Text>
        </View>
        <Pressable
          onPress={handleNewReport}
          style={({ pressed }) => [styles.newBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.8 }]}
        >
          <IconSymbol name="plus.circle.fill" size={18} color="#fff" />
          <Text style={styles.newBtnText}>New Report</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.center}>
          <IconSymbol name="doc.text.fill" size={48} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Reports Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Tap "New Report" to create your first client meeting report.
          </Text>
          <Pressable
            onPress={handleNewReport}
            style={({ pressed }) => [styles.emptyBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.emptyBtnText}>Create First Report</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ReportCard
              report={item}
              onPress={() => handleView(item)}
              onDelete={() => handleDelete(item.id)}
            />
          )}
        />
      )}
    </ScreenContainer>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  listTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  listSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  newBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  cardClient: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  cardDate: {
    fontSize: 12,
    marginTop: 2,
  },
  pcBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pcBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 28,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    maxWidth: 180,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardConsultant: {
    fontSize: 11,
    flex: 1,
  },
  deleteBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 8,
  },
  emptyBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  formHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  formHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  // Detail view
  detailToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  toolbarBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 44,
    justifyContent: 'center',
  },
  exportBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  toolbarTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  detailHeader: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    alignItems: 'flex-start',
    gap: 4,
  },
  detailClientName: {
    fontSize: 22,
    fontWeight: '700',
  },
  detailSubtitle: {
    fontSize: 13,
  },
  pcBadgeLarge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  pcBadgeLargeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailSectionHeader: {
    borderBottomWidth: 1.5,
    paddingBottom: 4,
    marginBottom: 8,
  },
  detailSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  detailKey: {
    width: 130,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 0,
  },
  detailVal: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
