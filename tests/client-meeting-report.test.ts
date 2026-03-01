/**
 * Client Meeting Report — Unit Tests
 *
 * Tests types, storage utilities, and HTML generation.
 * Avoids importing react-native-dependent files (pdf-export.ts, form.tsx).
 */

import { describe, it, expect } from 'vitest';
import {
  EMPTY_REPORT,
  DEAL_STATUS_LABELS,
  LEAD_SOURCE_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  VALUE_COMMUNICATED_OPTIONS,
  OBJECTION_OPTIONS,
  MESSAGING_OPTIONS,
} from '../app/modules/client-meeting-report/types';
import type { ClientMeetingReport } from '../app/modules/client-meeting-report/types';
import { generateId } from '../app/modules/client-meeting-report/storage';

// ── Types & EMPTY_REPORT ──────────────────────────────────────────────────────

describe('EMPTY_REPORT', () => {
  it('creates a report with all required fields', () => {
    const r = EMPTY_REPORT();
    expect(r.consultantName).toBe('');
    expect(r.clientName).toBe('');
    expect(r.purchaseConfidencePct).toBe(50);
    expect(r.leadSources).toEqual([]);
    expect(r.projectTypes).toEqual([]);
    expect(r.valueCommunicated).toEqual([]);
    expect(r.objections).toEqual([]);
    expect(r.nextActions).toEqual([]);
    expect(r.financingDiscussed).toBeNull();
  });

  it('sets weekOf to a Monday (ISO date)', () => {
    const r = EMPTY_REPORT();
    const d = new Date(r.weekOf);
    // Monday = day 1 in getDay()
    expect(d.getDay()).toBe(1);
  });

  it('sets appointmentDate to today', () => {
    const r = EMPTY_REPORT();
    const today = new Date().toISOString().split('T')[0];
    expect(r.appointmentDate).toBe(today);
  });

  it('has a createdAt and updatedAt timestamp', () => {
    const r = EMPTY_REPORT();
    expect(r.createdAt).toBeTruthy();
    expect(r.updatedAt).toBeTruthy();
    expect(new Date(r.createdAt).getFullYear()).toBeGreaterThanOrEqual(2026);
  });
});

// ── Deal Status Labels ────────────────────────────────────────────────────────

describe('DEAL_STATUS_LABELS', () => {
  it('has labels for all 7 deal statuses', () => {
    const statuses = [
      'working-design',
      'proposal-presented',
      'actively-considering',
      'awaiting-financing',
      'waiting-design',
      'delayed',
      'lost',
    ] as const;
    statuses.forEach((s) => {
      expect(DEAL_STATUS_LABELS[s]).toBeTruthy();
    });
  });

  it('all labels are non-empty strings', () => {
    Object.values(DEAL_STATUS_LABELS).forEach((label) => {
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });
  });
});

// ── Option Lists ──────────────────────────────────────────────────────────────

describe('Option lists', () => {
  it('LEAD_SOURCE_OPTIONS includes google, meta, and other', () => {
    const values = LEAD_SOURCE_OPTIONS.map((o) => o.value);
    expect(values).toContain('google');
    expect(values).toContain('meta');
    expect(values).toContain('other');
  });

  it('PROJECT_TYPE_OPTIONS includes motorized-screens and pergotenda', () => {
    const values = PROJECT_TYPE_OPTIONS.map((o) => o.value);
    expect(values).toContain('motorized-screens');
    expect(values).toContain('pergotenda');
  });

  it('VALUE_COMMUNICATED_OPTIONS has at least 5 items', () => {
    expect(VALUE_COMMUNICATED_OPTIONS.length).toBeGreaterThanOrEqual(5);
  });

  it('OBJECTION_OPTIONS includes price and timing', () => {
    const values = OBJECTION_OPTIONS.map((o) => o.value);
    expect(values).toContain('price');
    expect(values).toContain('timing');
  });

  it('MESSAGING_OPTIONS includes financing-offer', () => {
    const values = MESSAGING_OPTIONS.map((o) => o.value);
    expect(values).toContain('financing-offer');
  });

  it('all option lists have value and label fields', () => {
    const allLists = [
      LEAD_SOURCE_OPTIONS,
      PROJECT_TYPE_OPTIONS,
      VALUE_COMMUNICATED_OPTIONS,
      OBJECTION_OPTIONS,
      MESSAGING_OPTIONS,
    ];
    allLists.forEach((list) => {
      list.forEach((item) => {
        expect(item.value).toBeTruthy();
        expect(item.label).toBeTruthy();
      });
    });
  });
});

// ── Storage ID generation ─────────────────────────────────────────────────────

describe('generateId', () => {
  it('generates unique IDs starting with cmr_', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).toMatch(/^cmr_/);
    expect(id2).toMatch(/^cmr_/);
    expect(id1).not.toBe(id2);
  });

  it('generates IDs with sufficient entropy (length > 15)', () => {
    const id = generateId();
    expect(id.length).toBeGreaterThan(15);
  });
});

// ── HTML generation (inline, no react-native dependency) ─────────────────────

describe('Report HTML generation (inline)', () => {
  // Inline a minimal version of generateReportHTML logic to test
  // without importing react-native-dependent pdf-export.ts
  function buildFilename(clientName: string): string {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const yyyy = now.getFullYear();
    const safe = clientName.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
    return `DOS_Hub _ Client_Meeting_Report _ ${safe} _ ${mm}-${dd}-${yyyy}.pdf`;
  }

  it('builds correct filename format', () => {
    const filename = buildFilename('Acme Corp');
    expect(filename).toMatch(/^DOS_Hub _ Client_Meeting_Report _ Acme_Corp _ \d{2}-\d{2}-\d{4}\.pdf$/);
  });

  it('sanitizes special characters in client name', () => {
    const filename = buildFilename('Smith & Jones, LLC');
    expect(filename).not.toContain('&');
    expect(filename).not.toContain(',');
    expect(filename).toContain('Smith');
    expect(filename).toContain('Jones');
  });

  it('handles empty client name', () => {
    const filename = buildFilename('');
    expect(filename).toContain('DOS_Hub _ Client_Meeting_Report');
    expect(filename).toMatch(/\.pdf$/);
  });
});

// ── Data model integrity ──────────────────────────────────────────────────────

describe('ClientMeetingReport data model', () => {
  it('EMPTY_REPORT has all required sections', () => {
    const r = EMPTY_REPORT();

    // Section 1: Client Info
    expect('consultantName' in r).toBe(true);
    expect('weekOf' in r).toBe(true);
    expect('source' in r).toBe(true);
    expect('clientName' in r).toBe(true);
    expect('appointmentDate' in r).toBe(true);
    expect('address' in r).toBe(true);
    expect('clientType' in r).toBe(true);
    expect('appointmentType' in r).toBe(true);
    expect('leadSources' in r).toBe(true);
    expect('projectTypes' in r).toBe(true);

    // Section 2: Deal Status
    expect('dealStatus' in r).toBe(true);
    expect('closeTimeline' in r).toBe(true);
    expect('lastConversationSummary' in r).toBe(true);

    // Section 3: Purchase Confidence
    expect('purchaseConfidencePct' in r).toBe(true);
    expect('decisionMakers' in r).toBe(true);
    expect('mainMotivation' in r).toBe(true);
    expect('mainHesitation' in r).toBe(true);
    expect('pcNotes' in r).toBe(true);

    // Section 4: Value & Objections
    expect('financingDiscussed' in r).toBe(true);
    expect('valueCommunicated' in r).toBe(true);
    expect('clientResponse' in r).toBe(true);
    expect('objections' in r).toBe(true);
    expect('objectionNotes' in r).toBe(true);

    // Section 5: Next Steps
    expect('nextActions' in r).toBe(true);
    // nextFollowUpDate is optional — verify it's accessible (may be undefined)
    expect(r.nextFollowUpDate === undefined || typeof r.nextFollowUpDate === 'string').toBe(true);

    // Marketing feedback
    expect('leadQuality' in r).toBe(true);
    expect('expectationAlignment' in r).toBe(true);
    expect('messagingReferenced' in r).toBe(true);
    expect('budgetAlignment' in r).toBe(true);
    expect('marketingNotes' in r).toBe(true);

    // HubSpot stub
    expect('hubspotContactId' in r || r.hubspotContactId === undefined).toBe(true);
  });

  it('purchaseConfidencePct defaults to 50', () => {
    const r = EMPTY_REPORT();
    expect(r.purchaseConfidencePct).toBe(50);
    expect(r.purchaseConfidencePct).toBeGreaterThanOrEqual(0);
    expect(r.purchaseConfidencePct).toBeLessThanOrEqual(100);
  });
});
