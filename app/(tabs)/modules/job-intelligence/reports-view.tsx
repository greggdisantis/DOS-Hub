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
      {/* Report Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="border-b border-border"
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {REPORT_CONFIGS.map((report) => (
          <Pressable
            key={report.id}
            onPress={() => setActiveReport(report.id)}
            className={cn(
              'px-4 py-3 border-b-2 mr-2',
              activeReport === report.id
                ? 'border-primary'
                : 'border-transparent'
            )}
          >
            <Text
              className={cn(
                'text-sm font-semibold',
                activeReport === report.id
                  ? 'text-primary'
                  : 'text-muted'
              )}
            >
              {report.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Report Header with Export Button */}
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-border">
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground">
            {currentReport?.title}
          </Text>
          <Text className="text-sm text-muted mt-1">
            {currentReport?.description}
          </Text>
          <Text className="text-xs text-muted mt-2">
            {reportData.length} job{reportData.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Pressable
          onPress={handleExportPDF}
          disabled={exporting || reportData.length === 0}
          className={cn(
            'px-4 py-2 rounded-lg',
            exporting || reportData.length === 0
              ? 'bg-muted opacity-50'
              : 'bg-primary'
          )}
        >
          <Text className="text-white font-semibold text-sm">
            {exporting ? 'Exporting...' : 'Export PDF'}
          </Text>
        </Pressable>
      </View>

      {/* Report Content */}
      {reportData.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-muted text-center">
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
      className={cn(
        'px-4 py-3 border-b border-border',
        isAlternate ? 'bg-surface' : ''
      )}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="font-bold text-foreground text-sm">
            {job.customer}
          </Text>
          {job.projectSupervisor && (
            <Text className="text-xs text-muted mt-1">
              Supervisor: {job.projectSupervisor}
            </Text>
          )}
          {job.jobNumber && (
            <Text className="text-xs text-muted">
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
        <View className="ml-4 items-end">
          <Text className="text-xs font-semibold text-primary">
            {getEarliestReadyMonth(job)}
          </Text>
          <Text className="text-xs text-muted mt-1">
            {getOverallConfidence(job)}
          </Text>
        </View>
      );

    case 'blocked':
      return (
        <View className="ml-4 items-end">
          <Text className="text-xs font-semibold text-error">BLOCKED</Text>
          <Text className="text-xs text-muted mt-1">
            {getBlockedProducts(job).join(', ')}
          </Text>
        </View>
      );

    case 'permit-date-list':
      return (
        <View className="ml-4 items-end">
          <Text className="text-xs font-semibold text-foreground">
            {job.permitApprovalDate || 'TBD'}
          </Text>
          <Text className="text-xs text-muted mt-1">
            {job.permitStatus || 'Unknown'}
          </Text>
        </View>
      );

    case 'permit-status':
      return (
        <View className="ml-4 items-end">
          <Text className="text-xs font-semibold text-foreground">
            {job.permitStatus || 'Unknown'}
          </Text>
        </View>
      );

    case 'material-status':
      return (
        <View className="ml-4 items-end">
          <Text className="text-xs text-muted">
            {getMaterialProducts(job).join(', ')}
          </Text>
        </View>
      );

    case 'supervisor-workload':
      return (
        <View className="ml-4 items-end">
          <Text className="text-xs font-semibold text-foreground">
            {getEarliestReadyMonth(job)}
          </Text>
          <Text className="text-xs text-muted mt-1">
            {getOverallConfidence(job)}
          </Text>
        </View>
      );

    case 'struXure':
      return job.struXure ? (
        <View className="ml-4 items-end">
          <Text className="text-xs font-semibold text-foreground">
            {job.struXure.readyMonth}
          </Text>
          <Text className="text-xs text-muted mt-1">
            {getConfidenceLabel(job.struXure.confidence)}
          </Text>
        </View>
      ) : null;

    case 'screens':
      return job.screens ? (
        <View className="ml-4 items-end">
          <Text className="text-xs font-semibold text-foreground">
            {job.screens.readyMonth}
          </Text>
          <Text className="text-xs text-muted mt-1">
            {getConfidenceLabel(job.screens.confidence)}
          </Text>
        </View>
      ) : null;

    case 'pergotenda':
      return job.pergotenda ? (
        <View className="ml-4 items-end">
          <Text className="text-xs font-semibold text-foreground">
            {job.pergotenda.readyMonth}
          </Text>
          <Text className="text-xs text-muted mt-1">
            {getConfidenceLabel(job.pergotenda.confidence)}
          </Text>
        </View>
      ) : null;

    case 'awnings':
      return job.awning ? (
        <View className="ml-4 items-end">
          <Text className="text-xs font-semibold text-foreground">
            {job.awning.readyMonth}
          </Text>
          <Text className="text-xs text-muted mt-1">
            {getConfidenceLabel(job.awning.confidence)}
          </Text>
        </View>
      ) : null;

    case 'dos-magnatrack':
      return (
        <View className="ml-4 items-end">
          <Text className="text-xs text-muted">
            {job.dosScreens ? 'DOS' : ''} {job.magnaTrackScreens ? 'MagnaTrack' : ''}
          </Text>
        </View>
      );

    case 'exceptions':
      return (
        <View className="ml-4 items-end">
          <Text className="text-xs font-semibold text-error">
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
