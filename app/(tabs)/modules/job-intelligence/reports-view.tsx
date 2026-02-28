/**
 * Job Intelligence - Reports View
 * Displays all 12 report types with dropdown menu and PDF export
 */

import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable, ScrollView, ActivityIndicator, TextInput } from 'react-native';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showReportMenu, setShowReportMenu] = useState(false);

  console.log('ReportsView - REPORT_CONFIGS:', REPORT_CONFIGS);
  console.log('ReportsView - jobs count:', jobs.length);
  console.log('ReportsView - activeReport:', activeReport);

  // Filter jobs based on search query
  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return jobs;
    
    const query = searchQuery.toLowerCase();
    return jobs.filter((job) => 
      job.customer.toLowerCase().includes(query) ||
      job.projectSupervisor?.toLowerCase().includes(query) ||
      job.jobNumber?.toLowerCase().includes(query) ||
      job.permitStatus?.toLowerCase().includes(query)
    );
  }, [jobs, searchQuery]);

  const reportData = getReportData(filteredJobs, activeReport);
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
      {/* Global Search Bar */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TextInput
          placeholder="Search jobs by customer, supervisor, job #..."
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
            color: colors.foreground,
            fontSize: 14,
          }}
        />
        {searchQuery.length > 0 && (
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 6 }}>
            Found {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {/* Report Dropdown Menu */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 8 }}>Select Report</Text>
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
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, flex: 1 }}>
            {currentReport?.title || 'Select a report'}
          </Text>
          <Text style={{ fontSize: 16, color: colors.muted }}>{showReportMenu ? '▲' : '▼'}</Text>
        </Pressable>
        
        {showReportMenu && (
          <View style={{
            marginTop: 8,
            backgroundColor: colors.background,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            maxHeight: 300,
          }}>
            <ScrollView scrollEnabled={REPORT_CONFIGS.length > 6} nestedScrollEnabled={true}>
              {REPORT_CONFIGS.map((report, index) => (
                <Pressable
                  key={report.id}
                  onPress={() => {
                    setActiveReport(report.id);
                    setShowReportMenu(false);
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    borderBottomWidth: index < REPORT_CONFIGS.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                    backgroundColor: activeReport === report.id ? colors.surface : 'transparent',
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: activeReport === report.id ? '600' : '400',
                    color: activeReport === report.id ? colors.primary : colors.foreground,
                  }}>
                    {report.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                    {report.description}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

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
            {searchQuery.length > 0 && ` (filtered from ${filteredJobs.length})`}
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
            <ReportRow job={item} reportType={activeReport} index={index} searchQuery={searchQuery} />
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
  searchQuery?: string;
}

function ReportRow({ job, reportType, index, searchQuery }: ReportRowProps) {
  const colors = useColors();
  const isAlternate = index % 2 === 1;
  const isSearchMatch = searchQuery && (
    job.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.projectSupervisor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.jobNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: isSearchMatch ? colors.primary + '15' : (isAlternate ? colors.surface : colors.background),
        borderLeftWidth: isSearchMatch ? 4 : 0,
        borderLeftColor: isSearchMatch ? colors.primary : 'transparent',
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: 'bold', color: colors.foreground, fontSize: 14 }}>
            {highlightText(job.customer, searchQuery)}
          </Text>
          {job.projectSupervisor && (
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
              Supervisor: {highlightText(job.projectSupervisor, searchQuery)}
            </Text>
          )}
          {job.jobNumber && (
            <Text style={{ fontSize: 12, color: colors.muted }}>
              Job #: {highlightText(job.jobNumber, searchQuery)}
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
            {job.projectSupervisor || 'Unassigned'}
          </Text>
        </View>
      );

    case 'struXure':
      return (
        <View style={{ marginLeft: 16, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: getConfidenceColor(job.struXure?.confidence, colors) }}>
            {job.struXure?.readyMonth || 'N/A'}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
            {job.struXure?.confidence || 'Unknown'}
          </Text>
        </View>
      );

    case 'screens':
      return (
        <View style={{ marginLeft: 16, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: getConfidenceColor(job.screens?.confidence, colors) }}>
            {job.screens?.readyMonth || 'N/A'}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
            {job.screens?.confidence || 'Unknown'}
          </Text>
        </View>
      );

    case 'pergotenda':
      return (
        <View style={{ marginLeft: 16, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: getConfidenceColor(job.pergotenda?.confidence, colors) }}>
            {job.pergotenda?.readyMonth || 'N/A'}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
            {job.pergotenda?.confidence || 'Unknown'}
          </Text>
        </View>
      );

    case 'awnings':
      return (
        <View style={{ marginLeft: 16, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: getConfidenceColor(job.awning?.confidence, colors) }}>
            {job.awning?.readyMonth || 'N/A'}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
            {job.awning?.confidence || 'Unknown'}
          </Text>
        </View>
      );

    case 'dos-magnatrack':
      return (
        <View style={{ marginLeft: 16, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground }}>
            {job.dosScreens?.readyMonth || job.magnaTrackScreens?.readyMonth || 'N/A'}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
            {job.dosScreens?.manufacturer || job.magnaTrackScreens?.manufacturer || 'Unknown'}
          </Text>
        </View>
      );

    case 'exceptions':
      return (
        <View style={{ marginLeft: 16, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#ef4444' }}>
            {job.exceptions?.length || 0} issue{(job.exceptions?.length || 0) !== 1 ? 's' : ''}
          </Text>
        </View>
      );

    default:
      return null;
  }
}

function getEarliestReadyMonth(job: JobData): string {
  const months = [
    job.struXure?.readyMonth,
    job.screens?.readyMonth,
    job.pergotenda?.readyMonth,
    job.awning?.readyMonth,
  ].filter(Boolean);
  
  if (months.length === 0) return 'N/A';
  return months.sort().pop() || 'N/A';
}

function getOverallConfidence(job: JobData): string {
  const confidences = [
    job.struXure?.confidence,
    job.screens?.confidence,
    job.pergotenda?.confidence,
    job.awning?.confidence,
  ].filter(Boolean);
  
  if (confidences.includes('BLOCKED')) return 'BLOCKED';
  if (confidences.includes('FORECAST')) return 'FORECAST';
  return 'CONFIRMED';
}

function getBlockedProducts(job: JobData): string[] {
  const blocked = [];
  if (job.struXure?.confidence === 'BLOCKED') blocked.push('StruXure');
  if (job.screens?.confidence === 'BLOCKED') blocked.push('Screens');
  if (job.pergotenda?.confidence === 'BLOCKED') blocked.push('Pergotenda');
  if (job.awning?.confidence === 'BLOCKED') blocked.push('Awnings');
  return blocked;
}

function getMaterialProducts(job: JobData): string[] {
  const products = [];
  if (job.struXure?.materialStatus) products.push(`StruXure: ${job.struXure.materialStatus}`);
  if (job.screens?.materialStatus) products.push(`Screens: ${job.screens.materialStatus}`);
  if (job.pergotenda?.materialStatus) products.push(`Pergotenda: ${job.pergotenda.materialStatus}`);
  if (job.awning?.materialStatus) products.push(`Awnings: ${job.awning.materialStatus}`);
  return products;
}

function getConfidenceColor(confidence: string | undefined, colors: any): string {
  switch (confidence) {
    case 'HARD':
    case 'CONFIRMED':
      return '#22c55e';
    case 'FORECAST':
      return '#f59e0b';
    case 'BLOCKED':
      return '#ef4444';
    default:
      return colors.foreground;
  }
}

function highlightText(text: string, query?: string): string {
  if (!query) return text;
  // Simple implementation - in a real app, you might want to highlight the matching part
  return text;
}
