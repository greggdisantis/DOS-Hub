/**
 * Client Meeting Report — AsyncStorage persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClientMeetingReport } from './types';

const STORAGE_KEY = 'client_meeting_reports_v1';

export async function loadAllReports(): Promise<ClientMeetingReport[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ClientMeetingReport[];
  } catch {
    return [];
  }
}

export async function saveReport(report: ClientMeetingReport): Promise<void> {
  const all = await loadAllReports();
  const idx = all.findIndex((r) => r.id === report.id);
  const updated = { ...report, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    all[idx] = updated;
  } else {
    all.unshift(updated);
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export async function deleteReport(id: string): Promise<void> {
  const all = await loadAllReports();
  const filtered = all.filter((r) => r.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function generateId(): string {
  return `cmr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
