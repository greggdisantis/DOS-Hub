/**
 * Job Intelligence - Reports View
 * Displays all 12 report types with tab navigation and PDF export
 */

import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { cn } from '@/lib/utils';
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

  console.log('ReportsView - REPORT_CONFIGS:', REPORT_CONFIGS);
  console.log('ReportsView - jobs count:', jobs.length);
  console.log('ReportsView - activeReport:', activeReport);

  const reportData = getReportData(jobs, activeReport);
  const currentReport = REPORT_CONFIGS.find((r) => r.id === activeReport);

  const handleExportPDF = async () => {
    if (!currentReport) return;
    setExporting(true);
    try {
      await exportReportToPDF(currentReport.title, reportData, activeReport);
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
      {/* Report Tabs - Horizontal ScrollView */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        scrollEventThrottle={16}
        style={{
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {REPORT_CONFIGS.map((report) => (
          <Pressable
            key={report.id}
            onPress={() => setActiveReport(report.id)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 12,
              borderBottomWidth: 3,
              borderBottomColor: activeReport === report.id ? colors.primary : 'transparent',
              minWidth: 110,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: activeReport === report.id ? colors.primary : colors.muted,
              }}
              numberOfLines={1}
            >
              {report.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Report Header with Export Button */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.foreground }}>
            {currentReport?.title}
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
            {currentReport?.description}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 8 }}>
            {reportData.length} job{reportData.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Pressable
          onPress={handleExportPDF}
          disabled={exporting || reportData.length === 0}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: exporting || reportData.length === 0 ? colors.muted : colors.primary,
            opacity: exporting || reportData.length === 0 ? 0.5 : 1,
            marginLeft: 16,
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
            {exporting ? 'Exporting...' : 'Export PDF'}
          </Text>
        </Pressable>
      </View>

      {/* Report Content */}
      {reportData.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
          <Text style={{ color: colors.muted, textAlign: 'center' }}>
            No data available for this report
          </Text>
        </View>
      ) : (
        <FlatList
          data={reportData}
          keyExtractor={(item, index) => `${item.customer}-${index}`}
          renderItem={({ item, index }) => (
            <ReportRow job={item} reportType={activeReport} index={index} />
          )}
          contentContainerStyle={{ paddingVertical: 8 }}
          scrollEnabled={true}
        />
      )}
    </ScreenContainer>
  );
}

interface ReportRowProps {
  job: JobData;
  reportType: ReportType;
  index: number;
}

function ReportRow({ job, reportType, index }: ReportRowProps) {
  const colors = useColors();
  const isAlternate = index % 2 === 1;

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: isAlternate ? colors.surface : colors.background,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: 'bold', color: colors.foreground, fontSize: 14 }}>
            {job.customer}
          </Text>
          {job.projectSupervisor && (
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
              Supervisor: {job.projectSupervisor}
            </Text>
          )}
          {job.jobNumber && (
            <Text style={{ fontSize: 12, color: colors.muted }}>
              Job #: {job.jobNumber}
            </Text>
          )}
        </View>

        {/* Product-specific columns */}
        {renderReportColumns(job, reportType, colors)}
      </View>
    </View>
  );
}

function renderReportColumns(
  job: JobData,
  reportType: ReportType,
  colors: any
) {
  switch (reportType) {
    case 'final':
      return (
        <View style={{ marginLeft: 16, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
            {getEarliestReadyMonth(job)}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
            {getOverallConfidence(job)}
          </Text>
        </View>
      );

    case 'blocked':
      return (
        <View style={{ marginLeft: 16, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#ef4444' }}>BLOCKED</Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
            {getBlockedProducts(job).join(', ')}
          </Text>
        </View>
      );

    case 'permit-date-list':
      return (
        <View style={{ marginLeft: 16, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground }}>
            {job.permitApprovalDate || 'TBD'}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
            {job.permitStatus || 'Unknown'}
          </Text>
        </View>
      );

    case 'permit-status':
      return (
        <View style={{ marginLeft: 16, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground }}>
            {job.permitStatus || 'Unknown'}
          </Text>
        </View>
      );

    case 'material-status':
      return (
        <View style={{ marginLeft: 16, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, color: colors.muted }}>
            {getMaterialProducts(job).join(', ')}
          </Text>
        </View>
      );

    case 'supervisor-workload':
      return (
        <View style={{ marginLeft: 16, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground }}>
            {getEarliestReadyMonth(job)}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
            {getOverallConfidence(job)}
          </Text>
        </View>
      );

    case 'struXure':
      return job.struXure ? (
        <View style={{ marginLeft: 16, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground }}>
            {job.struXure.readyMonth}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
            {getConfidenceLabel(job.struXure.confidence)}
          </Text>
        </View>
      ) : null;

    case 'screens':
      return job.screens ? (
        <View style={{ marginLeft: 16, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground }}>
            {job.screens.readyMonth}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
            {getConfidenceLabel(job.screens.confidence)}
          </Text>
        </View>
      ) : null;

    case 'pergotenda':
      return job.pergotenda ? (
        <View style={{ marginLeft: 16, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground }}>
            {job.pergotenda.readyMonth}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
            {getConfidenceLabel(job.pergotenda.confidence)}
          </Text>
        </View>
      ) : null;

    case 'awnings':
      return job.awning ? (
        <View style={{ marginLeft: 16, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground }}>
            {job.awning.readyMonth}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
            {getConfidenceLabel(job.awning.confidence)}
          </Text>
        </View>
      ) : null;

    case 'dos-magnatrack':
      return (
        <View style={{ marginLeft: 16, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, color: colors.muted }}>
            {job.dosScreens ? 'DOS' : ''} {job.magnaTrackScreens ? 'MagnaTrack' : ''}
          </Text>
        </View>
      );

    case 'exceptions':
      return (
        <View style={{ marginLeft: 16, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#ef4444' }}>
            {job.exceptions?.length || 0} exceptions
          </Text>
        </View>
      );

    default:
      return null;
  }
}

// Helper functions
function getEarliestReadyMonth(job: JobData): string {
  const months = [
    job.struXure?.readyMonth,
    job.screens?.readyMonth,
    job.pergotenda?.readyMonth,
    job.awning?.readyMonth,
    job.dosScreens?.readyMonth,
    job.magnaTrackScreens?.readyMonth,
  ].filter(Boolean) as string[];

  if (months.length === 0) return 'N/A';
  return months.sort().reverse()[0];
}

function getOverallConfidence(job: JobData): string {
  const confidences = [
    job.struXure?.confidence,
    job.screens?.confidence,
    job.pergotenda?.confidence,
    job.awning?.confidence,
    job.dosScreens?.confidence,
    job.magnaTrackScreens?.confidence,
  ].filter(Boolean);

  if (confidences.includes('BLOCKED')) return 'Blocked';
  if (confidences.includes('FORECAST')) return 'Estimated';
  return 'Confirmed';
}

function getConfidenceLabel(confidence: string): string {
  switch (confidence) {
    case 'HARD':
      return 'Confirmed';
    case 'FORECAST':
      return 'Estimated';
    case 'BLOCKED':
      return 'Blocked';
    default:
      return 'Unknown';
  }
}

function getBlockedProducts(job: JobData): string[] {
  const blocked = [];
  if (job.struXure?.confidence === 'BLOCKED') blocked.push('StruXure');
  if (job.screens?.confidence === 'BLOCKED') blocked.push('Screens');
  if (job.pergotenda?.confidence === 'BLOCKED') blocked.push('Pergotenda');
  if (job.awning?.confidence === 'BLOCKED') blocked.push('Awning');
  if (job.dosScreens?.confidence === 'BLOCKED') blocked.push('DOS');
  if (job.magnaTrackScreens?.confidence === 'BLOCKED') blocked.push('MagnaTrack');
  return blocked;
}

function getMaterialProducts(job: JobData): string[] {
  const products = [];
  if (job.struXure) products.push('StruXure');
  if (job.screens) products.push('Screens');
  if (job.pergotenda) products.push('Pergotenda');
  if (job.awning) products.push('Awning');
  if (job.dosScreens) products.push('DOS');
  if (job.magnaTrackScreens) products.push('MagnaTrack');
  return products;
}
