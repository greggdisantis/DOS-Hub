/**
 * Job Intelligence - Report Data Types
 * Defines all report views and their data structures
 */

export interface JobData {
  customer: string;
  projectSupervisor?: string;
  jobNumber?: string;
  permitStatus?: string;
  permitApprovalDate?: string;
  struXure?: ProductReadiness;
  screens?: ProductReadiness;
  pergotenda?: ProductReadiness;
  awning?: ProductReadiness;
  dosScreens?: ProductReadiness;
  magnaTrackScreens?: ProductReadiness;
  exceptions?: string[];
}

export interface ProductReadiness {
  readyMonth: string;
  confidence: 'HARD' | 'FORECAST' | 'BLOCKED';
  status: string;
  materialStatus?: string;
  leadTime?: number;
  manufacturer?: string;
}

export type ReportType = 
  | 'final'
  | 'blocked'
  | 'permit-date-list'
  | 'permit-status'
  | 'material-status'
  | 'supervisor-workload'
  | 'struXure'
  | 'screens'
  | 'pergotenda'
  | 'awnings'
  | 'dos-magnatrack'
  | 'exceptions';

export interface ReportConfig {
  id: ReportType;
  title: string;
  description: string;
  icon: string;
}

export const REPORT_CONFIGS: ReportConfig[] = [
  {
    id: 'final',
    title: 'Final Report',
    description: 'All jobs with readiness summary',
    icon: 'document.text',
  },
  {
    id: 'blocked',
    title: 'Blocked Report',
    description: 'Jobs with blocked products',
    icon: 'exclamationmark.circle',
  },
  {
    id: 'permit-date-list',
    title: 'Permit Date List',
    description: 'Permit-related jobs with approval dates',
    icon: 'calendar',
  },
  {
    id: 'permit-status',
    title: 'Permit Status',
    description: 'Jobs grouped by permit status',
    icon: 'checkmark.circle',
  },
  {
    id: 'material-status',
    title: 'Material Status',
    description: 'Jobs grouped by material status',
    icon: 'cube.box',
  },
  {
    id: 'supervisor-workload',
    title: 'Supervisor Workload',
    description: 'Jobs grouped by supervisor',
    icon: 'person.2',
  },
  {
    id: 'struXure',
    title: 'StruXure',
    description: 'StruXure material readiness',
    icon: 'square.grid.2x2',
  },
  {
    id: 'screens',
    title: 'Screens',
    description: 'Screens material readiness',
    icon: 'rectangle.grid.1x2',
  },
  {
    id: 'pergotenda',
    title: 'Pergotenda',
    description: 'Pergotenda material readiness',
    icon: 'square.grid.3x3',
  },
  {
    id: 'awnings',
    title: 'Awnings',
    description: 'Awnings material readiness',
    icon: 'triangle.fill',
  },
  {
    id: 'dos-magnatrack',
    title: 'DOS & MagnaTrack',
    description: 'Installation readiness',
    icon: 'wrench.and.screwdriver',
  },
  {
    id: 'exceptions',
    title: 'Exceptions',
    description: 'Error and blocked jobs',
    icon: 'exclamationmark.triangle',
  },
];

// Report filtering and aggregation functions
export function filterFinalReport(jobs: JobData[]): JobData[] {
  return jobs;
}

export function filterBlockedReport(jobs: JobData[]): JobData[] {
  return jobs.filter((job) => {
    return (
      job.struXure?.confidence === 'BLOCKED' ||
      job.screens?.confidence === 'BLOCKED' ||
      job.pergotenda?.confidence === 'BLOCKED' ||
      job.awning?.confidence === 'BLOCKED' ||
      job.dosScreens?.confidence === 'BLOCKED' ||
      job.magnaTrackScreens?.confidence === 'BLOCKED'
    );
  });
}

export function filterPermitDateList(jobs: JobData[]): JobData[] {
  return jobs.filter((job) => job.permitApprovalDate || job.permitStatus);
}

export function filterPermitStatus(jobs: JobData[]): JobData[] {
  return jobs.filter((job) => job.permitStatus);
}

export function filterMaterialStatus(jobs: JobData[]): JobData[] {
  return jobs.filter((job) => {
    return (
      job.struXure ||
      job.screens ||
      job.pergotenda ||
      job.awning ||
      job.dosScreens ||
      job.magnaTrackScreens
    );
  });
}

export function filterSupervisorWorkload(jobs: JobData[]): JobData[] {
  return jobs.filter((job) => job.projectSupervisor);
}

export function filterStruXureReport(jobs: JobData[]): JobData[] {
  return jobs.filter((job) => job.struXure);
}

export function filterScreensReport(jobs: JobData[]): JobData[] {
  return jobs.filter((job) => job.screens);
}

export function filterPergotendaReport(jobs: JobData[]): JobData[] {
  return jobs.filter((job) => job.pergotenda);
}

export function filterAwningsReport(jobs: JobData[]): JobData[] {
  return jobs.filter((job) => job.awning);
}

export function filterDOSMagnaTrackReport(jobs: JobData[]): JobData[] {
  return jobs.filter((job) => job.dosScreens || job.magnaTrackScreens);
}

export function filterExceptionsReport(jobs: JobData[]): JobData[] {
  return jobs.filter((job) => {
    return (
      job.exceptions?.length ||
      job.struXure?.confidence === 'BLOCKED' ||
      job.screens?.confidence === 'BLOCKED' ||
      job.pergotenda?.confidence === 'BLOCKED' ||
      job.awning?.confidence === 'BLOCKED'
    );
  });
}

export function getReportData(
  jobs: JobData[],
  reportType: ReportType
): JobData[] {
  switch (reportType) {
    case 'final':
      return filterFinalReport(jobs);
    case 'blocked':
      return filterBlockedReport(jobs);
    case 'permit-date-list':
      return filterPermitDateList(jobs);
    case 'permit-status':
      return filterPermitStatus(jobs);
    case 'material-status':
      return filterMaterialStatus(jobs);
    case 'supervisor-workload':
      return filterSupervisorWorkload(jobs);
    case 'struXure':
      return filterStruXureReport(jobs);
    case 'screens':
      return filterScreensReport(jobs);
    case 'pergotenda':
      return filterPergotendaReport(jobs);
    case 'awnings':
      return filterAwningsReport(jobs);
    case 'dos-magnatrack':
      return filterDOSMagnaTrackReport(jobs);
    case 'exceptions':
      return filterExceptionsReport(jobs);
    default:
      return jobs;
  }
}
