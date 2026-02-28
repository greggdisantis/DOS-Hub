/**
 * Job Intelligence Module
 * Analyzes open jobs and calculates material readiness timelines
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useAuth } from '@/hooks/use-auth';
import { JobForm } from './job-intelligence/job-form';
import type { ProcessedJob } from './job-intelligence/types';

export default function JobIntelligenceScreen() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'form' | 'list'>('form');
  const [jobs, setJobs] = useState<ProcessedJob[]>([]);
  const [selectedJobIndex, setSelectedJobIndex] = useState<number | null>(null);

  const handleSaveJob = (job: ProcessedJob) => {
    if (selectedJobIndex !== null) {
      const updated = [...jobs];
      updated[selectedJobIndex] = job;
      setJobs(updated);
      setSelectedJobIndex(null);
    } else {
      setJobs([...jobs, job]);
    }
    setMode('list');
  };

  const handleEditJob = (index: number) => {
    setSelectedJobIndex(index);
    setMode('form');
  };

  const handleDeleteJob = (index: number) => {
    setJobs(jobs.filter((_, i) => i !== index));
  };

  const handleNewJob = () => {
    setSelectedJobIndex(null);
    setMode('form');
  };

  if (mode === 'form') {
    return (
      <JobForm
        initialJob={selectedJobIndex !== null ? jobs[selectedJobIndex].canonical : undefined}
        onSave={handleSaveJob}
      />
    );
  }

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="p-4 gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-foreground">Job Intelligence</Text>
            <TouchableOpacity
              onPress={handleNewJob}
              className="bg-primary rounded-lg px-4 py-2"
            >
              <Text className="text-background font-semibold">+ New Job</Text>
            </TouchableOpacity>
          </View>

          {jobs.length === 0 ? (
            <View className="flex-1 items-center justify-center gap-4 py-12">
              <Text className="text-lg font-semibold text-foreground">No Jobs Yet</Text>
              <Text className="text-sm text-muted text-center">
                Create a new job to analyze material readiness timelines
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {jobs.map((job, index) => (
                <JobCard
                  key={index}
                  job={job}
                  onEdit={() => handleEditJob(index)}
                  onDelete={() => handleDeleteJob(index)}
                />
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
  job: ProcessedJob;
  onEdit: () => void;
  onDelete: () => void;
}

function JobCard({ job, onEdit, onDelete }: JobCardProps) {
  const getReadinessColor = (confidence: string) => {
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

  const getReadinessLabel = (confidence: string) => {
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
    <View className="bg-surface rounded-lg p-4 gap-3 border border-border">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-foreground">
            {job.canonical.Customer}
          </Text>
          {job.canonical.ProjectSupervisor && (
            <Text className="text-sm text-muted">
              {job.canonical.ProjectSupervisor}
            </Text>
          )}
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={onEdit}
            className="bg-primary rounded-lg px-3 py-2"
          >
            <Text className="text-background text-sm font-semibold">Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            className="bg-error rounded-lg px-3 py-2"
          >
            <Text className="text-background text-sm font-semibold">Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="gap-2">
        {Object.entries(job.readiness).map(([product, result]) => {
          if (!result) return null;
          return (
            <View key={product} className="flex-row items-center justify-between">
              <Text className="text-sm text-foreground">{product}</Text>
              <View className="flex-row items-center gap-2">
                {result.readyMonth && (
                  <Text className="text-sm font-semibold text-foreground">
                    {result.readyMonth}
                  </Text>
                )}
                <View
                  style={{ backgroundColor: getReadinessColor(result.confidence) }}
                  className="px-2 py-1 rounded"
                >
                  <Text className="text-xs font-semibold text-white">
                    {getReadinessLabel(result.confidence)}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
