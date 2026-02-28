/**
 * Job Intelligence Module - Readiness Engine Tests
 * Validates calculation logic against expected outputs
 */

import { describe, it, expect } from 'vitest';
import { runReadinessEngine } from '../app/(tabs)/modules/job-intelligence/readinessEngine';
import type { CanonicalJob } from '../app/(tabs)/modules/job-intelligence/types';
import { Confidence } from '../app/(tabs)/modules/job-intelligence/types';
import { formatYearMonth, addWeeks } from '../app/(tabs)/modules/job-intelligence/dateUtils';

describe('Readiness Engine', () => {
  describe('StruXure Readiness', () => {
    it('should return HARD confidence with material received status', () => {
      const job: CanonicalJob = {
        Customer: 'Test Customer',
        JobCategory: '01: master - struxure project',
        IsThisACombinationJob: false,
        StruXureMaterialStatus: 'Received',
        StruXureActualMaterialReceivedDate: new Date('2026-02-15'),
      };

      const result = runReadinessEngine(job);
      const struxureReadiness = result.readiness.StruXure;

      expect(struxureReadiness).toBeDefined();
      expect(struxureReadiness?.confidence).toBe(Confidence.HARD);
      expect(struxureReadiness?.sourceLabel).toContain('Material Received');
      expect(struxureReadiness?.readyMonth).toBe('2026-02');
    });

    it('should calculate readiness based on order date + 7 weeks', () => {
      const orderDate = new Date('2026-01-15');
      const job: CanonicalJob = {
        Customer: 'Test Customer',
        JobCategory: '01: master - struxure project',
        IsThisACombinationJob: false,
        StruXureMaterialStatus: 'Ordered',
        StruXureOrderDate: orderDate,
      };

      const result = runReadinessEngine(job);
      const struxureReadiness = result.readiness.StruXure;
      const expectedDate = addWeeks(orderDate, 7);

      expect(struxureReadiness).toBeDefined();
      expect(struxureReadiness?.confidence).toBe(Confidence.HARD);
      expect(struxureReadiness?.readyMonth).toBe(formatYearMonth(expectedDate));
      expect(struxureReadiness?.sourceLabel).toContain('Ordered +7w');
    });

    it('should block if permit status is in prep state', () => {
      const job: CanonicalJob = {
        Customer: 'Test Customer',
        JobCategory: '01: master - struxure project',
        IsThisACombinationJob: false,
        PermitStatus: 'Permit Prep',
        StruXureMaterialStatus: 'Not Yet Ordered',
      };

      const result = runReadinessEngine(job);
      const struxureReadiness = result.readiness.StruXure;

      expect(struxureReadiness).toBeDefined();
      expect(struxureReadiness?.confidence).toBe(Confidence.BLOCKED);
      expect(struxureReadiness?.readyMonth).toBeNull();
      expect(struxureReadiness?.exceptions).toContain('STRUCTURE_NOT_READY_TO_ORDER');
    });

    it('should use manual override when provided', () => {
      const job: CanonicalJob = {
        Customer: 'Test Customer',
        JobCategory: '01: master - struxure project',
        IsThisACombinationJob: false,
        InstallEstimatedReadyMonth: '2026-06',
        PermitStatus: 'Permit Prep', // Would normally block
      };

      const result = runReadinessEngine(job);
      const struxureReadiness = result.readiness.StruXure;

      expect(struxureReadiness).toBeDefined();
      expect(struxureReadiness?.confidence).toBe(Confidence.HARD);
      expect(struxureReadiness?.readyMonth).toBe('2026-06');
      expect(struxureReadiness?.sourceLabel).toContain('Manual Override');
    });

    it('should handle material waiver with pre-con date', () => {
      const preConDate = new Date('2026-02-01');
      const job: CanonicalJob = {
        Customer: 'Test Customer',
        JobCategory: '01: master - struxure project',
        IsThisACombinationJob: false,
        StruXureMaterialStatus: 'Ready to Order',
        StruXureMaterialWaiver: true,
        PreConCompletedDate: preConDate,
      };

      const result = runReadinessEngine(job);
      const struxureReadiness = result.readiness.StruXure;
      const expectedDate = addWeeks(preConDate, 7);

      expect(struxureReadiness).toBeDefined();
      expect(struxureReadiness?.confidence).toBe(Confidence.HARD);
      expect(struxureReadiness?.readyMonth).toBe(formatYearMonth(expectedDate));
      expect(struxureReadiness?.sourceLabel).toContain('RTO (Waiver) +7w');
    });

    it('should block material waiver without pre-con date', () => {
      const job: CanonicalJob = {
        Customer: 'Test Customer',
        JobCategory: '01: master - struxure project',
        IsThisACombinationJob: false,
        StruXureMaterialStatus: 'Ready to Order',
        StruXureMaterialWaiver: true,
        // No PreConCompletedDate
      };

      const result = runReadinessEngine(job);
      const struxureReadiness = result.readiness.StruXure;

      expect(struxureReadiness).toBeDefined();
      expect(struxureReadiness?.confidence).toBe(Confidence.BLOCKED);
      expect(struxureReadiness?.readyMonth).toBeNull();
      expect(struxureReadiness?.exceptions).toContain('WAIVER_REQUIRES_PRECON');
    });
  });

  describe('Screens Readiness', () => {
    it('should calculate DOS screens with 3-week lead time', () => {
      const contractDate = new Date('2026-02-01');
      const job: CanonicalJob = {
        Customer: 'Test Customer',
        JobCategory: '02: master - screen only',
        IsThisACombinationJob: false,
        ContractSignedDate: contractDate,
        ScreensManufacturer: 'DOS Screens',
      };

      const result = runReadinessEngine(job);
      const screensReadiness = result.readiness.Screens;
      const expectedDate = addWeeks(contractDate, 3);

      expect(screensReadiness).toBeDefined();
      expect(screensReadiness?.confidence).toBe(Confidence.HARD);
      expect(screensReadiness?.readyMonth).toBe(formatYearMonth(expectedDate));
      expect(screensReadiness?.sourceLabel).toContain('Contract +3w');
    });

    it('should calculate MagnaTrack screens with 7-week lead time', () => {
      const contractDate = new Date('2026-02-01');
      const job: CanonicalJob = {
        Customer: 'Test Customer',
        JobCategory: '02: master - screen only',
        IsThisACombinationJob: false,
        ContractSignedDate: contractDate,
        ScreensManufacturer: 'MagnaTrack',
      };

      const result = runReadinessEngine(job);
      const screensReadiness = result.readiness.Screens;
      const expectedDate = addWeeks(contractDate, 7);

      expect(screensReadiness).toBeDefined();
      expect(screensReadiness?.confidence).toBe(Confidence.HARD);
      expect(screensReadiness?.readyMonth).toBe(formatYearMonth(expectedDate));
      expect(screensReadiness?.sourceLabel).toContain('Contract +7w');
    });

    it('should block standalone screens without contract date', () => {
      const job: CanonicalJob = {
        Customer: 'Test Customer',
        JobCategory: '02: master - screen only',
        IsThisACombinationJob: false,
        // No ContractSignedDate
      };

      const result = runReadinessEngine(job);
      const screensReadiness = result.readiness.Screens;

      expect(screensReadiness).toBeDefined();
      expect(screensReadiness?.confidence).toBe(Confidence.BLOCKED);
      expect(screensReadiness?.readyMonth).toBeNull();
      expect(screensReadiness?.exceptions).toContain('MISSING_CONTRACT_SIGNED_DATE');
    });

    it('should calculate combination job screens based on structure readiness', () => {
      const contractDate = new Date('2026-02-01');
      const job: CanonicalJob = {
        Customer: 'Test Customer',
        JobCategory: '01: master - struxure project',
        IsThisACombinationJob: true,
        ContractSignedDate: contractDate,
        ScreensManufacturer: 'DOS Screens',
        StruXureMaterialStatus: 'Received',
        StruXureActualMaterialReceivedDate: new Date('2026-03-15'),
      };

      const result = runReadinessEngine(job);
      const screensReadiness = result.readiness.Screens;

      expect(screensReadiness).toBeDefined();
      expect(screensReadiness?.confidence).toBe(Confidence.HARD);
      expect(screensReadiness?.sourceLabel).toContain('Structure +3w');
    });
  });

  describe('Awnings Readiness', () => {
    it('should calculate awnings with 3-week lead time', () => {
      const contractDate = new Date('2026-02-01');
      const job: CanonicalJob = {
        Customer: 'Test Customer',
        JobCategory: '04: master - awning',
        IsThisACombinationJob: false,
        ContractSignedDate: contractDate,
      };

      const result = runReadinessEngine(job);
      const awningsReadiness = result.readiness.Awnings;
      const expectedDate = addWeeks(contractDate, 3);

      expect(awningsReadiness).toBeDefined();
      expect(awningsReadiness?.confidence).toBe(Confidence.HARD);
      expect(awningsReadiness?.readyMonth).toBe(formatYearMonth(expectedDate));
      expect(awningsReadiness?.sourceLabel).toContain('Contract +3w');
    });

    it('should block awnings without contract date', () => {
      const job: CanonicalJob = {
        Customer: 'Test Customer',
        JobCategory: '04: master - awning',
        IsThisACombinationJob: false,
        // No ContractSignedDate
      };

      const result = runReadinessEngine(job);
      const awningsReadiness = result.readiness.Awnings;

      expect(awningsReadiness).toBeDefined();
      expect(awningsReadiness?.confidence).toBe(Confidence.BLOCKED);
      expect(awningsReadiness?.readyMonth).toBeNull();
      expect(awningsReadiness?.exceptions).toContain('MISSING_CONTRACT_SIGNED_DATE');
    });
  });

  describe('Pergotenda Readiness', () => {
    it('should calculate pergotenda with 7-week lead time from order date', () => {
      const orderDate = new Date('2026-01-15');
      const job: CanonicalJob = {
        Customer: 'Test Customer',
        JobCategory: '03: master - pergotenda project',
        IsThisACombinationJob: false,
        PergotendaMaterialStatus: 'Ordered',
        StruXureOrderDate: orderDate, // Note: using StruXureOrderDate as placeholder
      };

      const result = runReadinessEngine(job);
      const pergotendaReadiness = result.readiness.Pergotenda;

      expect(pergotendaReadiness).toBeDefined();
      expect(pergotendaReadiness?.confidence).toBe(Confidence.HARD);
      expect(pergotendaReadiness?.sourceLabel).toContain('Ordered +7w');
    });
  });

  describe('Permit Calculations', () => {
    it('should calculate permit approval date + 7 weeks', () => {
      const approvalDate = new Date('2026-02-15');
      const job: CanonicalJob = {
        Customer: 'Test Customer',
        JobCategory: '01: master - struxure project',
        IsThisACombinationJob: false,
        PermitStatus: 'Permit Received',
        PermitActualApprovalDate: approvalDate,
      };

      const result = runReadinessEngine(job);
      const struxureReadiness = result.readiness.StruXure;
      const expectedDate = addWeeks(approvalDate, 7);

      expect(struxureReadiness).toBeDefined();
      expect(struxureReadiness?.confidence).toBe(Confidence.HARD);
      expect(struxureReadiness?.readyMonth).toBe(formatYearMonth(expectedDate));
    });

    it('should add 10 business days for permit submission', () => {
      const submissionDate = new Date('2026-02-16'); // Monday
      const job: CanonicalJob = {
        Customer: 'Test Customer',
        JobCategory: '01: master - struxure project',
        IsThisACombinationJob: false,
        PermitStatus: 'Permit Submitted',
        PermitSubmissionDate: submissionDate,
      };

      const result = runReadinessEngine(job);
      const struxureReadiness = result.readiness.StruXure;

      expect(struxureReadiness).toBeDefined();
      expect(struxureReadiness?.confidence).toBe(Confidence.HARD);
      expect(struxureReadiness?.detailTrace).toContain('10 business days');
    });
  });

  describe('Job Category Detection', () => {
    it('should enable only screens for screen-only jobs', () => {
      const job: CanonicalJob = {
        Customer: 'Test Customer',
        JobCategory: '02: master - screen only',
        IsThisACombinationJob: false,
        ContractSignedDate: new Date('2026-02-01'),
      };

      const result = runReadinessEngine(job);

      expect(result.readiness.Screens).toBeDefined();
      expect(result.readiness.StruXure).toBeUndefined();
      expect(result.readiness.Pergotenda).toBeUndefined();
      expect(result.readiness.Awnings).toBeUndefined();
    });

    it('should enable struxure and screens for combination jobs', () => {
      const job: CanonicalJob = {
        Customer: 'Test Customer',
        JobCategory: '01: master - struxure project',
        IsThisACombinationJob: true,
        ContractSignedDate: new Date('2026-02-01'),
        StruXureMaterialStatus: 'Received',
        StruXureActualMaterialReceivedDate: new Date('2026-02-15'),
      };

      const result = runReadinessEngine(job);

      expect(result.readiness.StruXure).toBeDefined();
      expect(result.readiness.Screens).toBeDefined();
      expect(result.readiness.Pergotenda).toBeUndefined();
      expect(result.readiness.Awnings).toBeUndefined();
    });

    it('should enable only awnings for awning jobs', () => {
      const job: CanonicalJob = {
        Customer: 'Test Customer',
        JobCategory: '04: master - awning',
        IsThisACombinationJob: false,
        ContractSignedDate: new Date('2026-02-01'),
      };

      const result = runReadinessEngine(job);

      expect(result.readiness.Awnings).toBeDefined();
      expect(result.readiness.StruXure).toBeUndefined();
      expect(result.readiness.Screens).toBeUndefined();
      expect(result.readiness.Pergotenda).toBeUndefined();
    });
  });
});
