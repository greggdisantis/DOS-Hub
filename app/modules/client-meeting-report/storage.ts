/**
 * Client Meeting Report — AsyncStorage persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClientMeetingReport } from './types';

const STORAGE_KEY = 'client_meeting_reports_v1';
const BACKFILL_KEY = 'cmr_db_backfill_done_v1';

export async function isBackfillDone(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(BACKFILL_KEY);
    return val === 'true';
  } catch { return false; }
}

export async function markBackfillDone(): Promise<void> {
  try {
    await AsyncStorage.setItem(BACKFILL_KEY, 'true');
  } catch {}
}

/**
 * Migrate legacy records saved before new fields were added.
 * Ensures backward compatibility without a hard schema migration.
 */
function migrateReport(r: ClientMeetingReport): ClientMeetingReport {
  return {
    ...r,
    // Default outcome to 'open' for records saved before the field existed
    outcome: r.outcome ?? 'open' as 'open',
  };
}

export async function loadAllReports(): Promise<ClientMeetingReport[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ClientMeetingReport[];
    return parsed.map(migrateReport);
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
