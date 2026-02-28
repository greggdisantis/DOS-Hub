/**
 * Job Intelligence Module - Database Service
 * Handles saving and loading jobs from the database
 */

import type { ProcessedJob, CanonicalJob, SavedJob } from './types';

/**
 * Saves a job to the database
 * In a real implementation, this would call an API endpoint
 */
export async function saveJobToDatabase(
  job: ProcessedJob,
  userId: string,
  jobId?: string
): Promise<SavedJob> {
  try {
    const payload = {
      userId,
      canonical: serializeCanonicalJob(job.canonical),
      readiness: job.readiness,
      status: 'draft',
    };

    const response = await fetch('/api/jobs', {
      method: jobId ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jobId ? { ...payload, id: jobId } : payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to save job: ${response.statusText}`);
    }

    const savedJob = await response.json();
    return deserializeSavedJob(savedJob);
  } catch (error) {
    console.error('Error saving job:', error);
    throw error;
  }
}

/**
 * Loads a job from the database
 */
export async function loadJobFromDatabase(jobId: string): Promise<SavedJob> {
  try {
    const response = await fetch(`/api/jobs/${jobId}`);

    if (!response.ok) {
      throw new Error(`Failed to load job: ${response.statusText}`);
    }

    const job = await response.json();
    return deserializeSavedJob(job);
  } catch (error) {
    console.error('Error loading job:', error);
    throw error;
  }
}

/**
 * Loads all jobs for a user
 */
export async function loadUserJobs(userId: string): Promise<SavedJob[]> {
  try {
    const response = await fetch(`/api/jobs?userId=${userId}`);

    if (!response.ok) {
      throw new Error(`Failed to load jobs: ${response.statusText}`);
    }

    const jobs = await response.json();
    return jobs.map(deserializeSavedJob);
  } catch (error) {
    console.error('Error loading user jobs:', error);
    throw error;
  }
}

/**
 * Deletes a job from the database
 */
export async function deleteJobFromDatabase(jobId: string): Promise<void> {
  try {
    const response = await fetch(`/api/jobs/${jobId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete job: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting job:', error);
    throw error;
  }
}

/**
 * Serializes a CanonicalJob for database storage
 * Converts Date objects to ISO strings
 */
function serializeCanonicalJob(job: CanonicalJob): Record<string, any> {
  return {
    Customer: job.Customer,
    JobCategory: job.JobCategory,
    ProjectSupervisor: job.ProjectSupervisor,
    ContractSignedDate: job.ContractSignedDate?.toISOString() || null,
    PermitSubmissionDate: job.PermitSubmissionDate?.toISOString() || null,
    PermitEstimatedApprovalDate: job.PermitEstimatedApprovalDate?.toISOString() || null,
    PermitActualApprovalDate: job.PermitActualApprovalDate?.toISOString() || null,
    StruXureOrderDate: job.StruXureOrderDate?.toISOString() || null,
    StruXureEstimatedMaterialReceiveDate: job.StruXureEstimatedMaterialReceiveDate?.toISOString() || null,
    StruXureActualMaterialReceivedDate: job.StruXureActualMaterialReceivedDate?.toISOString() || null,
    PreConCompletedDate: job.PreConCompletedDate?.toISOString() || null,
    ScreensEstimatedMaterialReceiveDate: job.ScreensEstimatedMaterialReceiveDate?.toISOString() || null,
    ScreensActualMaterialReceivedDate: job.ScreensActualMaterialReceivedDate?.toISOString() || null,
    PermitStatus: job.PermitStatus,
    PermitResponsibility: job.PermitResponsibility,
    StruXureMaterialStatus: job.StruXureMaterialStatus,
    StruXureSquareFootage: job.StruXureSquareFootage,
    StruXureNumberOfZones: job.StruXureNumberOfZones,
    StruXureMaterialWaiver: job.StruXureMaterialWaiver,
    ScreensMaterialStatus: job.ScreensMaterialStatus,
    ScreensManufacturer: job.ScreensManufacturer,
    ScreensQuantity: job.ScreensQuantity,
    PergotendaMaterialStatus: job.PergotendaMaterialStatus,
    PergotendaSquareFootage: job.PergotendaSquareFootage,
    PergotendaMaterialWaiver: job.PergotendaMaterialWaiver,
    AwningMaterialStatus: job.AwningMaterialStatus,
    IsThisACombinationJob: job.IsThisACombinationJob,
    InstallEstimatedReadyMonth: job.InstallEstimatedReadyMonth,
  };
}

/**
 * Deserializes a saved job from the database
 * Converts ISO date strings back to Date objects
 */
function deserializeSavedJob(data: any): SavedJob {
  const canonical: CanonicalJob = {
    Customer: data.canonical.Customer,
    JobCategory: data.canonical.JobCategory,
    ProjectSupervisor: data.canonical.ProjectSupervisor,
    ContractSignedDate: data.canonical.ContractSignedDate ? new Date(data.canonical.ContractSignedDate) : null,
    PermitSubmissionDate: data.canonical.PermitSubmissionDate ? new Date(data.canonical.PermitSubmissionDate) : null,
    PermitEstimatedApprovalDate: data.canonical.PermitEstimatedApprovalDate ? new Date(data.canonical.PermitEstimatedApprovalDate) : null,
    PermitActualApprovalDate: data.canonical.PermitActualApprovalDate ? new Date(data.canonical.PermitActualApprovalDate) : null,
    StruXureOrderDate: data.canonical.StruXureOrderDate ? new Date(data.canonical.StruXureOrderDate) : null,
    StruXureEstimatedMaterialReceiveDate: data.canonical.StruXureEstimatedMaterialReceiveDate ? new Date(data.canonical.StruXureEstimatedMaterialReceiveDate) : null,
    StruXureActualMaterialReceivedDate: data.canonical.StruXureActualMaterialReceivedDate ? new Date(data.canonical.StruXureActualMaterialReceivedDate) : null,
    PreConCompletedDate: data.canonical.PreConCompletedDate ? new Date(data.canonical.PreConCompletedDate) : null,
    ScreensEstimatedMaterialReceiveDate: data.canonical.ScreensEstimatedMaterialReceiveDate ? new Date(data.canonical.ScreensEstimatedMaterialReceiveDate) : null,
    ScreensActualMaterialReceivedDate: data.canonical.ScreensActualMaterialReceivedDate ? new Date(data.canonical.ScreensActualMaterialReceivedDate) : null,
    PermitStatus: data.canonical.PermitStatus,
    PermitResponsibility: data.canonical.PermitResponsibility,
    StruXureMaterialStatus: data.canonical.StruXureMaterialStatus,
    StruXureSquareFootage: data.canonical.StruXureSquareFootage,
    StruXureNumberOfZones: data.canonical.StruXureNumberOfZones,
    StruXureMaterialWaiver: data.canonical.StruXureMaterialWaiver,
    ScreensMaterialStatus: data.canonical.ScreensMaterialStatus,
    ScreensManufacturer: data.canonical.ScreensManufacturer,
    ScreensQuantity: data.canonical.ScreensQuantity,
    PergotendaMaterialStatus: data.canonical.PergotendaMaterialStatus,
    PergotendaSquareFootage: data.canonical.PergotendaSquareFootage,
    PergotendaMaterialWaiver: data.canonical.PergotendaMaterialWaiver,
    AwningMaterialStatus: data.canonical.AwningMaterialStatus,
    IsThisACombinationJob: data.canonical.IsThisACombinationJob,
    InstallEstimatedReadyMonth: data.canonical.InstallEstimatedReadyMonth,
  };

  return {
    id: data.id,
    userId: data.userId,
    canonical,
    readiness: data.readiness,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
    revisionNumber: data.revisionNumber,
    status: data.status,
  };
}

/**
 * Local storage service for offline support
 */
export const localJobStorage = {
  /**
   * Saves jobs to local storage
   */
  saveJobs(jobs: SavedJob[]): void {
    try {
      const serialized = jobs.map((job) => ({
        ...job,
        canonical: serializeCanonicalJob(job.canonical),
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
      }));
      localStorage.setItem('dos_hub_jobs', JSON.stringify(serialized));
    } catch (error) {
      console.error('Error saving jobs to local storage:', error);
    }
  },

  /**
   * Loads jobs from local storage
   */
  loadJobs(): SavedJob[] {
    try {
      const data = localStorage.getItem('dos_hub_jobs');
      if (!data) return [];
      const jobs = JSON.parse(data);
      return jobs.map(deserializeSavedJob);
    } catch (error) {
      console.error('Error loading jobs from local storage:', error);
      return [];
    }
  },

  /**
   * Clears local storage
   */
  clear(): void {
    try {
      localStorage.removeItem('dos_hub_jobs');
    } catch (error) {
      console.error('Error clearing local storage:', error);
    }
  },
};
