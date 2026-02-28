import type { JobReadiness } from './readiness-calculator';

export async function exportJobsToPDF(jobs: JobReadiness[], filename: string = 'job-intelligence-report.pdf') {
  let csv = 'Customer,Supervisor,StruXure Ready,StruXure Confidence,Screens Ready,Screens Confidence,Pergotenda Ready,Pergotenda Confidence,Awning Ready,Awning Confidence\n';

  jobs.forEach((job) => {
    const row = [
      `"${job.customer}"`,
      `"${job.projectSupervisor || ''}"`,
      job.struXure?.readyMonth || 'N/A',
      getConfidenceLabel(job.struXure?.confidence || ''),
      job.screens?.readyMonth || 'N/A',
      getConfidenceLabel(job.screens?.confidence || ''),
      job.pergotenda?.readyMonth || 'N/A',
      getConfidenceLabel(job.pergotenda?.confidence || ''),
      job.awning?.readyMonth || 'N/A',
      getConfidenceLabel(job.awning?.confidence || ''),
    ];
    csv += row.join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.replace('.pdf', '.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
