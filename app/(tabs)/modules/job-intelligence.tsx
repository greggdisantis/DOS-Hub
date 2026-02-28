/**
 * Job Intelligence Module
 * Upload Service Fusion Excel file and analyze job readiness
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, FlatList } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { parseServiceFusionExcel, type ParsedJob } from './job-intelligence/excel-parser';
import { calculateJobReadiness, type JobReadiness } from './job-intelligence/readiness-calculator';
import { ReportsView } from './job-intelligence/reports-view';
import { type JobData, REPORT_CONFIGS } from './job-intelligence/report-types';

type ViewMode = 'upload' | 'results' | 'reports';

export default function JobIntelligenceScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [jobs, setJobs] = useState<JobReadiness[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const parsedJobs = await parseServiceFusionExcel(file);
      const readinessJobs = parsedJobs.map(calculateJobReadiness);
      setJobs(readinessJobs);
      setViewMode('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsLoading(false);
    }
  };

  if (viewMode === 'upload') {
    return <UploadView onFileUpload={handleFileUpload} isLoading={isLoading} error={error} />;
  }

  if (viewMode === 'results') {
    return (
      <ResultsView
        jobs={jobs}
        onViewReports={() => setViewMode('reports')}
        onBack={() => {
          setViewMode('upload');
          setJobs([]);
          setError(null);
        }}
      />
    );
  }

  if (viewMode === 'reports') {
    console.log('Converting jobs to JobData format, count:', jobs.length);
    const jobsData: JobData[] = jobs.map((job) => ({
      customer: job.customer,
      projectSupervisor: job.projectSupervisor,
      jobNumber: undefined,
      permitStatus: undefined,
      permitApprovalDate: undefined,
      struXure: job.struXure && job.struXure.readyMonth
        ? {
            readyMonth: job.struXure.readyMonth || '',
            confidence: job.struXure.confidence as 'HARD' | 'FORECAST' | 'BLOCKED',
            status: job.struXure.status,
          }
        : undefined,
      screens: job.screens && job.screens.readyMonth
        ? {
            readyMonth: job.screens.readyMonth || '',
            confidence: job.screens.confidence as 'HARD' | 'FORECAST' | 'BLOCKED',
            status: job.screens.status,
          }
        : undefined,
      pergotenda: job.pergotenda && job.pergotenda.readyMonth
        ? {
            readyMonth: job.pergotenda.readyMonth || '',
            confidence: job.pergotenda.confidence as 'HARD' | 'FORECAST' | 'BLOCKED',
            status: job.pergotenda.status,
          }
        : undefined,
      awning: job.awning && job.awning.readyMonth
        ? {
            readyMonth: job.awning.readyMonth || '',
            confidence: job.awning.confidence as 'HARD' | 'FORECAST' | 'BLOCKED',
            status: job.awning.status,
          }
        : undefined,
    }));

    return (
      <View className="flex-1">
        <ReportsView jobs={jobsData} />
      </View>
    );
  }

  return (
    <ResultsView
      jobs={jobs}
      onViewReports={() => setViewMode('reports')}
      onBack={() => {
        setViewMode('upload');
        setJobs([]);
        setError(null);
      }}
    />
  );
}

/**
 * Upload View Component
 */
interface UploadViewProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
  error: string | null;
}

function UploadView({ onFileUpload, isLoading, error }: UploadViewProps) {
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="flex-1 p-6 gap-6 justify-center">
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">Job Intelligence</Text>
            <Text className="text-base text-muted">
              Upload your Service Fusion Sales Revenue Report to analyze material readiness
            </Text>
          </View>

          <View className="bg-surface rounded-lg p-6 gap-4 border border-border">
            <Text className="text-lg font-semibold text-foreground">Upload Excel File</Text>
            <Text className="text-sm text-muted">
              Select a Service Fusion Sales Revenue Report (XLSX format) to begin analysis
            </Text>

            <View className="bg-primary/10 rounded-lg p-4 border border-primary/20">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileInputChange}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: '2px dashed #0a7ea4',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.5 : 1,
                }}
              />
            </View>

            {isLoading && (
              <View className="flex-row items-center gap-3">
                <ActivityIndicator color="#0a7ea4" />
                <Text className="text-sm text-foreground">Processing file...</Text>
              </View>
            )}

            {error && (
              <View className="bg-error/10 rounded-lg p-3 border border-error/20">
                <Text className="text-sm text-error">{error}</Text>
              </View>
            )}
          </View>

          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">What this tool does:</Text>
            <View className="gap-2">
              <Text className="text-sm text-muted">• Parses all jobs from your Service Fusion export</Text>
              <Text className="text-sm text-muted">• Calculates material readiness for each product</Text>
              <Text className="text-sm text-muted">• Shows permit and material status</Text>
              <Text className="text-sm text-muted">• Identifies blocking issues</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

/**
 * Results View Component
 */
interface ResultsViewProps {
  jobs: JobReadiness[];
  onViewReports: () => void;
  onBack: () => void;
}

function ResultsView({ jobs, onViewReports, onBack }: ResultsViewProps) {
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filteredJobs =
    filterCategory === 'all' ? jobs : jobs.filter((job) => job.jobCategory.includes(filterCategory));

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'HARD':
        return '#22C55E';
      case 'FORECAST':
        return '#F59E0B';
      case 'BLOCKED':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getConfidenceLabel = (confidence: string) => {
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
  };

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView className="flex-1">
        <View className="p-4 gap-4">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="text-2xl font-bold text-foreground">Results</Text>
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={onViewReports} className="bg-primary rounded-lg px-4 py-2">
                <Text className="text-background font-semibold text-sm">View Reports</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onBack} className="bg-muted rounded-lg px-4 py-2">
                <Text className="text-background font-semibold text-sm">New File</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="bg-surface rounded-lg p-3 border border-border">
            <Text className="text-sm text-muted">
              Processed {jobs.length} jobs from Service Fusion export
            </Text>
          </View>

          {filteredJobs.length === 0 ? (
            <View className="items-center justify-center py-12">
              <Text className="text-lg font-semibold text-foreground">No jobs found</Text>
            </View>
          ) : (
            <View className="gap-3">
              {filteredJobs.map((job, index) => (
                <JobCard key={index} job={job} getConfidenceColor={getConfidenceColor} getConfidenceLabel={getConfidenceLabel} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

/**
 * Job Card Component
 */
interface JobCardProps {
  job: JobReadiness;
  getConfidenceColor: (confidence: string) => string;
  getConfidenceLabel: (confidence: string) => string;
}

function JobCard({ job, getConfidenceColor, getConfidenceLabel }: JobCardProps) {
  return (
    <View className="bg-surface rounded-lg p-4 gap-3 border border-border">
      <View>
        <Text className="text-lg font-semibold text-foreground">{job.customer}</Text>
        {job.projectSupervisor && (
          <Text className="text-sm text-muted">{job.projectSupervisor}</Text>
        )}
      </View>

      <View className="gap-2">
        {job.struXure && (
          <ProductRow
            product="StruXure"
            result={job.struXure}
            getConfidenceColor={getConfidenceColor}
            getConfidenceLabel={getConfidenceLabel}
          />
        )}
        {job.screens && (
          <ProductRow
            product="Screens"
            result={job.screens}
            getConfidenceColor={getConfidenceColor}
            getConfidenceLabel={getConfidenceLabel}
          />
        )}
        {job.pergotenda && (
          <ProductRow
            product="Pergotenda"
            result={job.pergotenda}
            getConfidenceColor={getConfidenceColor}
            getConfidenceLabel={getConfidenceLabel}
          />
        )}
        {job.awning && (
          <ProductRow
            product="Awning"
            result={job.awning}
            getConfidenceColor={getConfidenceColor}
            getConfidenceLabel={getConfidenceLabel}
          />
        )}
      </View>
    </View>
  );
}

/**
 * Product Row Component
 */
interface ProductRowProps {
  product: string;
  result: any;
  getConfidenceColor: (confidence: string) => string;
  getConfidenceLabel: (confidence: string) => string;
}

function ProductRow({ product, result, getConfidenceColor, getConfidenceLabel }: ProductRowProps) {
  return (
    <View className="flex-row items-center justify-between p-2 bg-background rounded">
      <Text className="text-sm font-medium text-foreground">{product}</Text>
      <View className="flex-row items-center gap-2">
        {result.readyMonth && (
          <Text className="text-sm font-semibold text-foreground">{result.readyMonth}</Text>
        )}
        <View
          style={{ backgroundColor: getConfidenceColor(result.confidence) }}
          className="px-2 py-1 rounded"
        >
          <Text className="text-xs font-semibold text-white">
            {getConfidenceLabel(result.confidence)}
          </Text>
        </View>
      </View>
    </View>
  );
}
