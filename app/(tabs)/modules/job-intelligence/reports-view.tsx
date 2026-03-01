/**
 * Job Intelligence - Reports View
 * Displays all report types with grouped layouts matching reference PDF designs
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
  StyleSheet,
} from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { REPORT_CONFIGS, getReportData, type JobData, type ReportType } from './report-types';
import { exportReportToPDF } from './pdf-report-export';

interface ReportsViewProps {
  jobs: JobData[];
  isLoading?: boolean;
}

export function ReportsView({ jobs, isLoading = false }: ReportsViewProps) {
  const colors = useColors();
  const [activeReport, setActiveReport] = useState<ReportType>('final');
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showReportMenu, setShowReportMenu] = useState(false);
  const reportContentRef = useRef<View>(null);

  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return jobs;
    const query = searchQuery.toLowerCase();
    return jobs.filter(
      (job) =>
        job.customer.toLowerCase().includes(query) ||
        job.projectSupervisor?.toLowerCase().includes(query) ||
        job.jobNumber?.toLowerCase().includes(query) ||
        job.permitStatus?.toLowerCase().includes(query),
    );
  }, [jobs, searchQuery]);

  const reportData = getReportData(filteredJobs, activeReport);
  const currentReport = REPORT_CONFIGS.find((r) => r.id === activeReport);

  const handleExportPDF = async () => {
    if (!currentReport) return;
    setExporting(true);
    try {
      // On web, get the actual DOM element from the ref for direct capture
      let domElement: HTMLElement | null = null;
      if (typeof window !== 'undefined' && reportContentRef.current) {
        // React Native Web renders View as a div; the ref has the underlying DOM node
        domElement = (reportContentRef.current as any) as HTMLElement;
      }
      await exportReportToPDF(currentReport.title, reportData, activeReport, domElement);
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4 text-muted">Loading reports...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="flex-1">
      {/* Search Bar */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: colors.surface,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        }}
      >
        <TextInput
          placeholder="Search by customer, supervisor, job #..."
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          style={{
            paddingHorizontal: 12,
            paddingVertical: 9,
            borderRadius: 8,
            backgroundColor: colors.background,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
            color: colors.foreground,
            fontSize: 14,
          }}
        />
        {searchQuery.length > 0 && (
          <Text style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
            {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} found
          </Text>
        )}
      </View>

      {/* Report Dropdown */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 10,
          backgroundColor: colors.surface,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          zIndex: 100,
        }}
      >
        <Pressable
          onPress={() => setShowReportMenu(!showReportMenu)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: colors.background,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, flex: 1 }}>
            {currentReport?.title || 'Select a report'}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginRight: 4 }}>
            {reportData.length} jobs
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted }}>{showReportMenu ? '▲' : '▼'}</Text>
        </Pressable>

        {showReportMenu && (
          <View
            style={{
              position: 'absolute',
              top: 58,
              left: 16,
              right: 16,
              backgroundColor: colors.background,
              borderRadius: 10,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.border,
              maxHeight: 320,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 8,
              elevation: 8,
              zIndex: 200,
            }}
          >
            <ScrollView scrollEnabled nestedScrollEnabled>
              {REPORT_CONFIGS.map((report, index) => (
                <Pressable
                  key={report.id}
                  onPress={() => {
                    setActiveReport(report.id);
                    setShowReportMenu(false);
                  }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    borderBottomWidth: index < REPORT_CONFIGS.length - 1 ? StyleSheet.hairlineWidth : 0,
                    borderBottomColor: colors.border,
                    backgroundColor: activeReport === report.id ? colors.primary + '18' : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: activeReport === report.id ? '600' : '400',
                      color: activeReport === report.id ? colors.primary : colors.foreground,
                    }}
                  >
                    {report.title}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.muted, marginTop: 1 }}>
                    {report.description}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Export Button Row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ fontSize: 13, color: colors.muted }}>
          {reportData.length} job{reportData.length !== 1 ? 's' : ''}
          {searchQuery.length > 0 ? ` (filtered)` : ''}
        </Text>
        <Pressable
          onPress={handleExportPDF}
          disabled={exporting || reportData.length === 0}
          style={({ pressed }) => ({
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: 7,
            backgroundColor:
              exporting || reportData.length === 0 ? colors.border : colors.primary,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>
            {exporting ? 'Exporting...' : 'Export PDF'}
          </Text>
        </Pressable>
      </View>

      {/* Report Content */}
      {reportData.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 15 }}>
            No data available for this report
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
          <View ref={reportContentRef}>
            <ReportContent jobs={reportData} reportType={activeReport} searchQuery={searchQuery} />
          </View>
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

// ─── Report Content Router ────────────────────────────────────────────────────

interface ReportContentProps {
  jobs: JobData[];
  reportType: ReportType;
  searchQuery?: string;
}

function ReportContent({ jobs, reportType, searchQuery }: ReportContentProps) {
  switch (reportType) {
    case 'struXure':
      return <ProductMonthGroupedReport jobs={jobs} product="struXure" searchQuery={searchQuery} />;
    case 'screens':
      return <ProductMonthGroupedReport jobs={jobs} product="screens" searchQuery={searchQuery} />;
    case 'pergotenda':
      return <ProductMonthGroupedReport jobs={jobs} product="pergotenda" searchQuery={searchQuery} />;
    case 'awnings':
      return <ProductMonthGroupedReport jobs={jobs} product="awning" searchQuery={searchQuery} />;
    case 'supervisor-workload':
      return <SupervisorWorkloadReport jobs={jobs} searchQuery={searchQuery} />;
    case 'material-status':
      return <MaterialStatusReport jobs={jobs} searchQuery={searchQuery} />;
    case 'permit-status':
      return <PermitStatusReport jobs={jobs} searchQuery={searchQuery} />;
    case 'permit-date-list':
      return <PermitDateListReport jobs={jobs} searchQuery={searchQuery} />;
    case 'blocked':
      return <BlockedReport jobs={jobs} searchQuery={searchQuery} />;
    case 'exceptions':
      return <ExceptionsReport jobs={jobs} searchQuery={searchQuery} />;
    default:
      return <FinalReport jobs={jobs} searchQuery={searchQuery} />;
  }
}

// ─── Shared Helpers ───────────────────────────────────────────────────────────

function useColors2() {
  return useColors();
}

function ConfidenceBadge({ confidence }: { confidence: 'HARD' | 'FORECAST' | 'BLOCKED' }) {
  const colors = useColors2();
  const color =
    confidence === 'HARD' ? '#22c55e' : confidence === 'FORECAST' ? '#f59e0b' : '#ef4444';
  return (
    <Text
      style={{
        fontSize: 10,
        fontWeight: '700',
        color,
        letterSpacing: 0.5,
      }}
    >
      {confidence}
    </Text>
  );
}

function SectionHeader({
  title,
  count,
  right,
}: {
  title: string;
  count?: number;
  right?: string;
}) {
  const colors = useColors2();
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 6,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.foreground,
        marginBottom: 0,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>
          {title}
          {count !== undefined ? ` (${count})` : ''}
        </Text>
        {right ? (
          <Text style={{ fontSize: 12, color: colors.muted }}>{right}</Text>
        ) : null}
      </View>
    </View>
  );
}

function SubSectionHeader({ title, count }: { title: string; count?: number }) {
  const colors = useColors2();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>
        {title}
        {count !== undefined ? ` (${count})` : ''}
      </Text>
      <View
        style={{
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border,
          marginTop: 4,
        }}
      />
    </View>
  );
}

function TableHeader({ columns }: { columns: { label: string; flex?: number; align?: 'left' | 'right' | 'center' }[] }) {
  const colors = useColors2();
  return (
    <View
      style={{
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 6,
        backgroundColor: colors.surface,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      }}
    >
      {columns.map((col, i) => (
        <Text
          key={i}
          style={{
            flex: col.flex ?? 1,
            fontSize: 10,
            fontWeight: '700',
            color: colors.muted,
            letterSpacing: 0.6,
            textAlign: col.align ?? 'left',
          }}
        >
          {col.label.toUpperCase()}
        </Text>
      ))}
    </View>
  );
}

function TableRow({
  columns,
  isAlternate,
  isHighlighted,
}: {
  columns: { value: string | React.ReactNode; flex?: number; align?: 'left' | 'right' | 'center'; bold?: boolean }[];
  isAlternate?: boolean;
  isHighlighted?: boolean;
}) {
  const colors = useColors2();
  return (
    <View
      style={{
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
        backgroundColor: isHighlighted
          ? colors.primary + '18'
          : isAlternate
          ? colors.surface
          : colors.background,
        borderLeftWidth: isHighlighted ? 3 : 0,
        borderLeftColor: isHighlighted ? colors.primary : 'transparent',
      }}
    >
      {columns.map((col, i) =>
        typeof col.value === 'string' ? (
          <Text
            key={i}
            style={{
              flex: col.flex ?? 1,
              fontSize: 13,
              color: colors.foreground,
              fontWeight: col.bold ? '600' : '400',
              textAlign: col.align ?? 'left',
            }}
            numberOfLines={2}
          >
            {col.value}
          </Text>
        ) : (
          <View key={i} style={{ flex: col.flex ?? 1, alignItems: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start' }}>
            {col.value}
          </View>
        ),
      )}
    </View>
  );
}

function isMatch(job: JobData, query?: string): boolean {
  if (!query) return false;
  const q = query.toLowerCase();
  return (
    job.customer.toLowerCase().includes(q) ||
    (job.projectSupervisor?.toLowerCase().includes(q) ?? false)
  );
}

// ─── Product Month-Grouped Report (Screens / StruXure / Pergotenda / Awnings) ─

type ProductKey = 'struXure' | 'screens' | 'pergotenda' | 'awning';

function ProductMonthGroupedReport({
  jobs,
  product,
  searchQuery,
}: {
  jobs: JobData[];
  product: ProductKey;
  searchQuery?: string;
}) {
  const colors = useColors();

  // Group by readyMonth
  const groups = useMemo(() => {
    const map = new Map<string, JobData[]>();
    for (const job of jobs) {
      const p = job[product];
      if (!p) continue;
      const month = p.readyMonth || 'BLOCKED';
      if (!map.has(month)) map.set(month, []);
      map.get(month)!.push(job);
    }
    // Sort: BLOCKED last, months ascending
    const sorted = Array.from(map.entries()).sort(([a], [b]) => {
      if (a === 'BLOCKED') return 1;
      if (b === 'BLOCKED') return -1;
      return a.localeCompare(b);
    });
    return sorted;
  }, [jobs, product]);

  const isScreens = product === 'screens';
  const isStruXure = product === 'struXure';

  return (
    <View>
      {groups.map(([month, groupJobs]) => {
        const totalQty = isScreens
          ? groupJobs.reduce((s, j) => s + (j.screens?.quantity ?? 0), 0)
          : undefined;
        const totalSF = isStruXure
          ? groupJobs.reduce((s, j) => s + (j.struXure?.sf ?? 0), 0)
          : undefined;
        const totalZones = isStruXure
          ? groupJobs.reduce((s, j) => s + (j.struXure?.zones ?? 0), 0)
          : undefined;

        const rightSummary = isScreens
          ? `${groupJobs.length} Jobs${totalQty ? ` | ${totalQty} Screens` : ''}`
          : isStruXure
          ? `${groupJobs.length} Jobs${totalSF ? ` | ${totalSF} SF` : ''}${totalZones ? ` | ${totalZones} Zones` : ''}`
          : `${groupJobs.length} Jobs`;

        return (
          <View key={month}>
            <SectionHeader title={month} right={rightSummary} />
            <TableHeader
              columns={
                isScreens
                  ? [
                      { label: 'Customer', flex: 3 },
                      { label: 'Qty', flex: 1, align: 'right' },
                      { label: 'Manufacturer', flex: 2 },
                      { label: 'Supervisor', flex: 2 },
                      { label: 'Source', flex: 2 },
                      { label: 'Conf.', flex: 1, align: 'right' },
                    ]
                  : isStruXure
                  ? [
                      { label: 'Customer', flex: 3 },
                      { label: 'SF', flex: 1, align: 'right' },
                      { label: 'Zones', flex: 1, align: 'right' },
                      { label: 'Supervisor', flex: 2 },
                      { label: 'Source', flex: 2 },
                      { label: 'Conf.', flex: 1, align: 'right' },
                    ]
                  : [
                      { label: 'Customer', flex: 3 },
                      { label: 'Supervisor', flex: 2 },
                      { label: 'Source', flex: 3 },
                      { label: 'Conf.', flex: 1, align: 'right' },
                    ]
              }
            />
            {groupJobs.map((job, idx) => {
              const p = job[product]!;
              const highlighted = isMatch(job, searchQuery);
              if (isScreens) {
                return (
                  <TableRow
                    key={`${job.customer}-${idx}`}
                    isAlternate={idx % 2 === 1}
                    isHighlighted={highlighted}
                    columns={[
                      { value: job.customer, flex: 3, bold: true },
                      { value: p.quantity ? String(p.quantity) : '—', flex: 1, align: 'right' },
                      { value: p.manufacturer || '—', flex: 2 },
                      { value: job.projectSupervisor || '—', flex: 2 },
                      { value: p.sourceLabel || p.status, flex: 2 },
                      {
                        value: <ConfidenceBadge confidence={p.confidence} />,
                        flex: 1,
                        align: 'right',
                      },
                    ]}
                  />
                );
              } else if (isStruXure) {
                return (
                  <TableRow
                    key={`${job.customer}-${idx}`}
                    isAlternate={idx % 2 === 1}
                    isHighlighted={highlighted}
                    columns={[
                      { value: job.customer, flex: 3, bold: true },
                      { value: p.sf ? String(p.sf) : '—', flex: 1, align: 'right' },
                      { value: p.zones ? String(p.zones) : '—', flex: 1, align: 'right' },
                      { value: job.projectSupervisor || '—', flex: 2 },
                      { value: p.sourceLabel || p.status, flex: 2 },
                      {
                        value: <ConfidenceBadge confidence={p.confidence} />,
                        flex: 1,
                        align: 'right',
                      },
                    ]}
                  />
                );
              } else {
                return (
                  <TableRow
                    key={`${job.customer}-${idx}`}
                    isAlternate={idx % 2 === 1}
                    isHighlighted={highlighted}
                    columns={[
                      { value: job.customer, flex: 3, bold: true },
                      { value: job.projectSupervisor || '—', flex: 2 },
                      { value: p.sourceLabel || p.status, flex: 3 },
                      {
                        value: <ConfidenceBadge confidence={p.confidence} />,
                        flex: 1,
                        align: 'right',
                      },
                    ]}
                  />
                );
              }
            })}
          </View>
        );
      })}
    </View>
  );
}

// ─── Supervisor Workload Report ───────────────────────────────────────────────

function SupervisorWorkloadReport({
  jobs,
  searchQuery,
}: {
  jobs: JobData[];
  searchQuery?: string;
}) {
  const colors = useColors();

  // Group by supervisor, then by month
  const supervisorGroups = useMemo(() => {
    const map = new Map<string, JobData[]>();
    for (const job of jobs) {
      const sup = job.projectSupervisor || 'Unassigned';
      if (!map.has(sup)) map.set(sup, []);
      map.get(sup)!.push(job);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [jobs]);

  return (
    <View>
      {supervisorGroups.map(([supervisor, supJobs]) => {
        // Count total units
        const totalUnits = supJobs.reduce((sum, job) => {
          let count = 0;
          if (job.struXure) count++;
          if (job.screens) count++;
          if (job.pergotenda) count++;
          if (job.awning) count++;
          return sum + count;
        }, 0);

        // Separate blocked from non-blocked
        const blockedJobs = supJobs.filter(
          (j) =>
            j.struXure?.confidence === 'BLOCKED' ||
            j.screens?.confidence === 'BLOCKED' ||
            j.pergotenda?.confidence === 'BLOCKED' ||
            j.awning?.confidence === 'BLOCKED',
        );
        const activeJobs = supJobs.filter((j) => !blockedJobs.includes(j));

        // Group active jobs by earliest ready month
        const monthMap = new Map<string, { job: JobData; products: string[] }[]>();
        for (const job of activeJobs) {
          const months = [
            job.struXure?.readyMonth,
            job.screens?.readyMonth,
            job.pergotenda?.readyMonth,
            job.awning?.readyMonth,
          ].filter(Boolean) as string[];
          const month = months.sort()[0] || 'TBD';
          if (!monthMap.has(month)) monthMap.set(month, []);
          const products = [];
          if (job.struXure) products.push('StruXure');
          if (job.screens) products.push('Screens');
          if (job.pergotenda) products.push('Pergotenda');
          if (job.awning) products.push('Awning');
          monthMap.get(month)!.push({ job, products });
        }
        const sortedMonths = Array.from(monthMap.entries()).sort(([a], [b]) =>
          a.localeCompare(b),
        );

        return (
          <View key={supervisor}>
            <SectionHeader
              title={supervisor}
              right={`${supJobs.length} Jobs · ${totalUnits} Units`}
            />

            {sortedMonths.map(([month, entries]) => (
              <View key={month}>
                <SubSectionHeader title={month} count={entries.length} />
                {entries.map(({ job, products }, idx) => {
                  const highlighted = isMatch(job, searchQuery);
                  return (
                    <View
                      key={`${job.customer}-${idx}`}
                      style={{
                        paddingHorizontal: 20,
                        paddingVertical: 7,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: colors.border,
                        backgroundColor: highlighted
                          ? colors.primary + '18'
                          : colors.background,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text style={{ fontSize: 13, color: colors.foreground, flex: 1 }}>
                        {job.customer}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.muted }}>
                        ({products.join(', ')})
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}

            {blockedJobs.length > 0 && (
              <View>
                <SubSectionHeader title="BLOCKED" count={blockedJobs.length} />
                {blockedJobs.map((job, idx) => {
                  const blockedProducts = [];
                  if (job.struXure?.confidence === 'BLOCKED') blockedProducts.push('StruXure');
                  if (job.screens?.confidence === 'BLOCKED') blockedProducts.push('Screens');
                  if (job.pergotenda?.confidence === 'BLOCKED') blockedProducts.push('Pergotenda');
                  if (job.awning?.confidence === 'BLOCKED') blockedProducts.push('Awning');
                  const highlighted = isMatch(job, searchQuery);
                  return (
                    <View
                      key={`blocked-${job.customer}-${idx}`}
                      style={{
                        paddingHorizontal: 20,
                        paddingVertical: 7,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: colors.border,
                        backgroundColor: highlighted
                          ? colors.primary + '18'
                          : colors.background,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text style={{ fontSize: 13, color: colors.foreground, flex: 1 }}>
                        {job.customer}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#ef4444' }}>
                        ({blockedProducts.join(', ')})
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── Material Status Report ───────────────────────────────────────────────────

const MATERIAL_STATUSES = [
  'Not Yet Ordered',
  'Ordered',
  'In Warehouse',
  'Material Received',
  'Delivered to Site',
];

const PRODUCT_TYPES: { key: ProductKey; label: string }[] = [
  { key: 'struXure', label: 'StruXure' },
  { key: 'screens', label: 'Screens' },
  { key: 'pergotenda', label: 'Pergotenda' },
  { key: 'awning', label: 'Awning' },
];

function MaterialStatusReport({
  jobs,
  searchQuery,
}: {
  jobs: JobData[];
  searchQuery?: string;
}) {
  const colors = useColors();

  return (
    <View>
      {PRODUCT_TYPES.map(({ key, label }) => {
        // Get all jobs that have this product
        const productJobs = jobs.filter((j) => j[key]);
        if (productJobs.length === 0) return null;

        // Group by material status
        const statusGroups = new Map<string, JobData[]>();
        for (const job of productJobs) {
          const p = job[key]!;
          const status = p.materialStatus || 'Not Yet Ordered';
          if (!statusGroups.has(status)) statusGroups.set(status, []);
          statusGroups.get(status)!.push(job);
        }

        // Sort by canonical order
        const sortedGroups = MATERIAL_STATUSES.map((s) => ({
          status: s,
          groupJobs: statusGroups.get(s) || [],
        })).filter((g) => g.groupJobs.length > 0);

        // Add any statuses not in canonical list
        for (const [status, groupJobs] of statusGroups.entries()) {
          if (!MATERIAL_STATUSES.includes(status)) {
            sortedGroups.push({ status, groupJobs });
          }
        }

        return (
          <View key={key}>
            <SectionHeader title={label} count={productJobs.length} />
            {sortedGroups.map(({ status, groupJobs }) => (
              <View key={status}>
                <SubSectionHeader title={status} count={groupJobs.length} />
                {/* Two-column layout */}
                <TwoColumnList
                  items={groupJobs.map((j) => j.customer)}
                  searchQuery={searchQuery}
                />
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

function TwoColumnList({ items, searchQuery }: { items: string[]; searchQuery?: string }) {
  const colors = useColors();
  // Pair items into rows of 2
  const rows: [string, string | null][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push([items[i], items[i + 1] ?? null]);
  }
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
      {rows.map(([left, right], idx) => (
        <View key={idx} style={{ flexDirection: 'row', paddingVertical: 4 }}>
          <Text
            style={{
              flex: 1,
              fontSize: 13,
              color: colors.foreground,
              fontWeight: searchQuery && left.toLowerCase().includes(searchQuery.toLowerCase()) ? '600' : '400',
            }}
          >
            {left}
          </Text>
          {right !== null ? (
            <Text
              style={{
                flex: 1,
                fontSize: 13,
                color: colors.foreground,
                fontWeight: searchQuery && right.toLowerCase().includes(searchQuery.toLowerCase()) ? '600' : '400',
              }}
            >
              {right}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </View>
      ))}
    </View>
  );
}

// ─── Permit Status Report ─────────────────────────────────────────────────────

const PERMIT_STATUS_ORDER = [
  'Permit Prep',
  'Permit Submitted',
  'Permit Hold',
  'Permit Variance Required',
  'Permit Approved, Pend. C',
  'Permit Received',
  'Permit Not Required',
  'Permit By Others',
];

function PermitStatusReport({
  jobs,
  searchQuery,
}: {
  jobs: JobData[];
  searchQuery?: string;
}) {
  const colors = useColors();

  const statusGroups = useMemo(() => {
    const map = new Map<string, JobData[]>();
    for (const job of jobs) {
      const status = job.permitStatus || 'Unknown';
      if (!map.has(status)) map.set(status, []);
      map.get(status)!.push(job);
    }

    // Sort by canonical order
    const sorted = PERMIT_STATUS_ORDER.map((s) => ({
      status: s,
      groupJobs: map.get(s) || [],
    })).filter((g) => g.groupJobs.length > 0);

    // Add any statuses not in canonical list
    for (const [status, groupJobs] of map.entries()) {
      if (!PERMIT_STATUS_ORDER.includes(status)) {
        sorted.push({ status, groupJobs });
      }
    }

    return sorted;
  }, [jobs]);

  return (
    <View style={{ padding: 16 }}>
      {/* Grid of 2 columns */}
      {chunkArray(statusGroups, 2).map((row, rowIdx) => (
        <View key={rowIdx} style={{ flexDirection: 'row', marginBottom: 20, gap: 12 }}>
          {row.map(({ status, groupJobs }) => (
            <View key={status} style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: colors.foreground,
                  marginBottom: 4,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.foreground,
                  paddingBottom: 4,
                }}
              >
                {status} ({groupJobs.length})
              </Text>
              {groupJobs.map((job, idx) => {
                const highlighted =
                  searchQuery && job.customer.toLowerCase().includes(searchQuery.toLowerCase());
                return (
                  <Text
                    key={idx}
                    style={{
                      fontSize: 12,
                      color: colors.foreground,
                      paddingVertical: 2,
                      fontWeight: highlighted ? '600' : '400',
                    }}
                  >
                    {job.customer}
                  </Text>
                );
              })}
            </View>
          ))}
          {/* Fill empty column if odd */}
          {row.length === 1 && <View style={{ flex: 1 }} />}
        </View>
      ))}
    </View>
  );
}

// ─── Permit Date List Report ──────────────────────────────────────────────────

function PermitDateListReport({
  jobs,
  searchQuery,
}: {
  jobs: JobData[];
  searchQuery?: string;
}) {
  const colors = useColors();
  const sorted = useMemo(
    () =>
      [...jobs].sort((a, b) => {
        const da = a.permitApprovalDate || 'ZZZZ';
        const db = b.permitApprovalDate || 'ZZZZ';
        return da.localeCompare(db);
      }),
    [jobs],
  );

  return (
    <View>
      <TableHeader
        columns={[
          { label: 'Customer', flex: 3 },
          { label: 'Permit Status', flex: 2 },
          { label: 'Approval Date', flex: 2, align: 'right' },
        ]}
      />
      {sorted.map((job, idx) => {
        const highlighted = isMatch(job, searchQuery);
        return (
          <TableRow
            key={`${job.customer}-${idx}`}
            isAlternate={idx % 2 === 1}
            isHighlighted={highlighted}
            columns={[
              { value: job.customer, flex: 3, bold: true },
              { value: job.permitStatus || '—', flex: 2 },
              { value: job.permitApprovalDate || 'TBD', flex: 2, align: 'right' },
            ]}
          />
        );
      })}
    </View>
  );
}

// ─── Blocked Report ───────────────────────────────────────────────────────────

function BlockedReport({ jobs, searchQuery }: { jobs: JobData[]; searchQuery?: string }) {
  const colors = useColors();
  return (
    <View>
      <TableHeader
        columns={[
          { label: 'Customer', flex: 3 },
          { label: 'Supervisor', flex: 2 },
          { label: 'Blocked Products', flex: 3 },
        ]}
      />
      {jobs.map((job, idx) => {
        const blocked = [];
        if (job.struXure?.confidence === 'BLOCKED') blocked.push('StruXure');
        if (job.screens?.confidence === 'BLOCKED') blocked.push('Screens');
        if (job.pergotenda?.confidence === 'BLOCKED') blocked.push('Pergotenda');
        if (job.awning?.confidence === 'BLOCKED') blocked.push('Awning');
        const highlighted = isMatch(job, searchQuery);
        return (
          <TableRow
            key={`${job.customer}-${idx}`}
            isAlternate={idx % 2 === 1}
            isHighlighted={highlighted}
            columns={[
              { value: job.customer, flex: 3, bold: true },
              { value: job.projectSupervisor || '—', flex: 2 },
              { value: blocked.join(', '), flex: 3 },
            ]}
          />
        );
      })}
    </View>
  );
}

// ─── Exceptions Report ────────────────────────────────────────────────────────

function ExceptionsReport({ jobs, searchQuery }: { jobs: JobData[]; searchQuery?: string }) {
  const colors = useColors();
  return (
    <View>
      <TableHeader
        columns={[
          { label: 'Customer', flex: 3 },
          { label: 'Issues', flex: 1, align: 'right' },
          { label: 'Details', flex: 4 },
        ]}
      />
      {jobs.map((job, idx) => {
        const highlighted = isMatch(job, searchQuery);
        return (
          <TableRow
            key={`${job.customer}-${idx}`}
            isAlternate={idx % 2 === 1}
            isHighlighted={highlighted}
            columns={[
              { value: job.customer, flex: 3, bold: true },
              { value: String(job.exceptions?.length || 0), flex: 1, align: 'right' },
              { value: job.exceptions?.join('; ') || '—', flex: 4 },
            ]}
          />
        );
      })}
    </View>
  );
}

// ─── Final Report ─────────────────────────────────────────────────────────────

function FinalReport({ jobs, searchQuery }: { jobs: JobData[]; searchQuery?: string }) {
  const colors = useColors();
  return (
    <View>
      <TableHeader
        columns={[
          { label: 'Customer', flex: 3 },
          { label: 'Supervisor', flex: 2 },
          { label: 'Ready', flex: 2 },
          { label: 'Conf.', flex: 1, align: 'right' },
        ]}
      />
      {jobs.map((job, idx) => {
        const months = [
          job.struXure?.readyMonth,
          job.screens?.readyMonth,
          job.pergotenda?.readyMonth,
          job.awning?.readyMonth,
        ].filter(Boolean) as string[];
        const earliest = months.sort()[0] || 'N/A';
        const confidences = [
          job.struXure?.confidence,
          job.screens?.confidence,
          job.pergotenda?.confidence,
          job.awning?.confidence,
        ].filter(Boolean) as ('HARD' | 'FORECAST' | 'BLOCKED')[];
        const overall: 'HARD' | 'FORECAST' | 'BLOCKED' = confidences.includes('BLOCKED')
          ? 'BLOCKED'
          : confidences.includes('FORECAST')
          ? 'FORECAST'
          : 'HARD';
        const highlighted = isMatch(job, searchQuery);
        return (
          <TableRow
            key={`${job.customer}-${idx}`}
            isAlternate={idx % 2 === 1}
            isHighlighted={highlighted}
            columns={[
              { value: job.customer, flex: 3, bold: true },
              { value: job.projectSupervisor || '—', flex: 2 },
              { value: earliest, flex: 2 },
              { value: <ConfidenceBadge confidence={overall} />, flex: 1, align: 'right' },
            ]}
          />
        );
      })}
    </View>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
