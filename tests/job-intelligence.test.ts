/**
 * Job Intelligence Module Tests
 * Tests for Excel parser and readiness calculator
 */

import { describe, it, expect } from 'vitest';
import { calculateJobReadiness } from '../app/(tabs)/modules/job-intelligence/readiness-calculator';
import type { ParsedJob } from '../app/(tabs)/modules/job-intelligence/excel-parser';

describe('Job Intelligence - Readiness Calculator', () => {
  describe('StruXure Readiness', () => {
    it('should calculate readiness from permit approval + 7 weeks', () => {
      const job: ParsedJob = {
        jobStartDate: null,
        status: 'OPEN',
        jobCategory: '01: MASTER - StruXure Project',
        customer: 'Test Customer',
        serviceLocation: '123 Main St',
        contractDate: new Date('2026-02-01'),
        salesRep: 'John Doe',
        projectSupervisor: 'Jane Doe',
        isCombinationJob: false,
        permitStatus: 'Permit Received',
        permitResponsibility: 'Permit by DOS',
        permitEstimatedApprovalDate: null,
        permitActualApprovalDate: new Date('2026-02-15'),
        permitSubmissionDate: null,
        struXureMaterialWaiver: false,
        struXureSF: 500,
        struXureNumberOfZones: 2,
        struXureMaterialStatus: 'Not Yet Ordered',
        struXureOrderDate: null,
        struXureEstimatedMaterialReceiveDate: null,
        struXureActualMaterialReceivedDate: null,
        struXureEstimatedReadyMonth: '',
        screensManufacturer: '',
        screensQuantity: null,
        screensMaterialStatus: '',
        screensOrderDate: null,
        screensEstimatedMaterialReceiveDate: null,
        screensActualMaterialReceivedDate: null,
        screensEstimatedReadyMonth: '',
        pergotendaSF: null,
        pergotendaMaterialStatus: '',
        pergotendaOrderDate: null,
        pergotendaEstimatedMaterialReceiveDate: null,
        pergotendaActualMaterialReceivedDate: null,
        pergotendaEstimatedReadyMonth: '',
        awningMaterialStatus: '',
        awningOrderDate: null,
        awningActualMaterialReceivedDate: null,
        awningEstimatedReadyMonth: '',
        preConDate: null,
        finalWalkThruStruXure: null,
        finalWalkThruScreens: null,
        finalWalkThruPergotenda: null,
        finalWalkThruAwning: null,
      };

      const result = calculateJobReadiness(job);

      expect(result.struXure).toBeDefined();
      expect(result.struXure?.confidence).toBe('HARD');
      expect(result.struXure?.readyMonth).toBe('2026-04');
    });

    it('should block if permit status is "Permit Prep"', () => {
      const job: ParsedJob = {
        jobStartDate: null,
        status: 'OPEN',
        jobCategory: '01: MASTER - StruXure Project',
        customer: 'Test Customer',
        serviceLocation: '123 Main St',
        contractDate: new Date('2026-02-01'),
        salesRep: 'John Doe',
        projectSupervisor: 'Jane Doe',
        isCombinationJob: false,
        permitStatus: 'Permit Prep',
        permitResponsibility: 'Permit by DOS',
        permitEstimatedApprovalDate: null,
        permitActualApprovalDate: null,
        permitSubmissionDate: null,
        struXureMaterialWaiver: false,
        struXureSF: 500,
        struXureNumberOfZones: 2,
        struXureMaterialStatus: 'Not Yet Ordered',
        struXureOrderDate: null,
        struXureEstimatedMaterialReceiveDate: null,
        struXureActualMaterialReceivedDate: null,
        struXureEstimatedReadyMonth: '',
        screensManufacturer: '',
        screensQuantity: null,
        screensMaterialStatus: '',
        screensOrderDate: null,
        screensEstimatedMaterialReceiveDate: null,
        screensActualMaterialReceivedDate: null,
        screensEstimatedReadyMonth: '',
        pergotendaSF: null,
        pergotendaMaterialStatus: '',
        pergotendaOrderDate: null,
        pergotendaEstimatedMaterialReceiveDate: null,
        pergotendaActualMaterialReceivedDate: null,
        pergotendaEstimatedReadyMonth: '',
        awningMaterialStatus: '',
        awningOrderDate: null,
        awningActualMaterialReceivedDate: null,
        awningEstimatedReadyMonth: '',
        preConDate: null,
        finalWalkThruStruXure: null,
        finalWalkThruScreens: null,
        finalWalkThruPergotenda: null,
        finalWalkThruAwning: null,
      };

      const result = calculateJobReadiness(job);

      expect(result.struXure).toBeDefined();
      expect(result.struXure?.confidence).toBe('BLOCKED');
      expect(result.struXure?.readyMonth).toBeNull();
    });

    it('should calculate from material received date', () => {
      const job: ParsedJob = {
        jobStartDate: null,
        status: 'OPEN',
        jobCategory: '01: MASTER - StruXure Project',
        customer: 'Test Customer',
        serviceLocation: '123 Main St',
        contractDate: new Date('2026-02-01'),
        salesRep: 'John Doe',
        projectSupervisor: 'Jane Doe',
        isCombinationJob: false,
        permitStatus: 'Permit Not Required',
        permitResponsibility: '',
        permitEstimatedApprovalDate: null,
        permitActualApprovalDate: null,
        permitSubmissionDate: null,
        struXureMaterialWaiver: false,
        struXureSF: 500,
        struXureNumberOfZones: 2,
        struXureMaterialStatus: 'Material Received',
        struXureOrderDate: null,
        struXureEstimatedMaterialReceiveDate: null,
        struXureActualMaterialReceivedDate: new Date('2026-02-20'),
        struXureEstimatedReadyMonth: '',
        screensManufacturer: '',
        screensQuantity: null,
        screensMaterialStatus: '',
        screensOrderDate: null,
        screensEstimatedMaterialReceiveDate: null,
        screensActualMaterialReceivedDate: null,
        screensEstimatedReadyMonth: '',
        pergotendaSF: null,
        pergotendaMaterialStatus: '',
        pergotendaOrderDate: null,
        pergotendaEstimatedMaterialReceiveDate: null,
        pergotendaActualMaterialReceivedDate: null,
        pergotendaEstimatedReadyMonth: '',
        awningMaterialStatus: '',
        awningOrderDate: null,
        awningActualMaterialReceivedDate: null,
        awningEstimatedReadyMonth: '',
        preConDate: null,
        finalWalkThruStruXure: null,
        finalWalkThruScreens: null,
        finalWalkThruPergotenda: null,
        finalWalkThruAwning: null,
      };

      const result = calculateJobReadiness(job);

      expect(result.struXure).toBeDefined();
      expect(result.struXure?.confidence).toBe('HARD');
      expect(result.struXure?.readyMonth).toBe('2026-02');
    });
  });

  describe('Screens Readiness', () => {
    it('should calculate DOS screens with 3-week lead time', () => {
      const job: ParsedJob = {
        jobStartDate: null,
        status: 'OPEN',
        jobCategory: '02: MASTER - Screen Only',
        customer: 'Test Customer',
        serviceLocation: '123 Main St',
        contractDate: new Date('2026-02-01'),
        salesRep: 'John Doe',
        projectSupervisor: '',
        isCombinationJob: false,
        permitStatus: '',
        permitResponsibility: '',
        permitEstimatedApprovalDate: null,
        permitActualApprovalDate: null,
        permitSubmissionDate: null,
        struXureMaterialWaiver: false,
        struXureSF: null,
        struXureNumberOfZones: null,
        struXureMaterialStatus: '',
        struXureOrderDate: null,
        struXureEstimatedMaterialReceiveDate: null,
        struXureActualMaterialReceivedDate: null,
        struXureEstimatedReadyMonth: '',
        screensManufacturer: 'DOS Screens',
        screensQuantity: 2,
        screensMaterialStatus: 'Not Yet Ordered',
        screensOrderDate: null,
        screensEstimatedMaterialReceiveDate: null,
        screensActualMaterialReceivedDate: null,
        screensEstimatedReadyMonth: '',
        pergotendaSF: null,
        pergotendaMaterialStatus: '',
        pergotendaOrderDate: null,
        pergotendaEstimatedMaterialReceiveDate: null,
        pergotendaActualMaterialReceivedDate: null,
        pergotendaEstimatedReadyMonth: '',
        awningMaterialStatus: '',
        awningOrderDate: null,
        awningActualMaterialReceivedDate: null,
        awningEstimatedReadyMonth: '',
        preConDate: null,
        finalWalkThruStruXure: null,
        finalWalkThruScreens: null,
        finalWalkThruPergotenda: null,
        finalWalkThruAwning: null,
      };

      const result = calculateJobReadiness(job);

      expect(result.screens).toBeDefined();
      expect(result.screens?.confidence).toBe('HARD');
      expect(result.screens?.readyMonth).toBe('2026-02');
    });

    it('should calculate MagnaTrack screens with 7-week lead time', () => {
      const job: ParsedJob = {
        jobStartDate: null,
        status: 'OPEN',
        jobCategory: '02: MASTER - Screen Only',
        customer: 'Test Customer',
        serviceLocation: '123 Main St',
        contractDate: new Date('2026-02-01'),
        salesRep: 'John Doe',
        projectSupervisor: '',
        isCombinationJob: false,
        permitStatus: '',
        permitResponsibility: '',
        permitEstimatedApprovalDate: null,
        permitActualApprovalDate: null,
        permitSubmissionDate: null,
        struXureMaterialWaiver: false,
        struXureSF: null,
        struXureNumberOfZones: null,
        struXureMaterialStatus: '',
        struXureOrderDate: null,
        struXureEstimatedMaterialReceiveDate: null,
        struXureActualMaterialReceivedDate: null,
        struXureEstimatedReadyMonth: '',
        screensManufacturer: 'MagnaTrack',
        screensQuantity: 2,
        screensMaterialStatus: 'Not Yet Ordered',
        screensOrderDate: null,
        screensEstimatedMaterialReceiveDate: null,
        screensActualMaterialReceivedDate: null,
        screensEstimatedReadyMonth: '',
        pergotendaSF: null,
        pergotendaMaterialStatus: '',
        pergotendaOrderDate: null,
        pergotendaEstimatedMaterialReceiveDate: null,
        pergotendaActualMaterialReceivedDate: null,
        pergotendaEstimatedReadyMonth: '',
        awningMaterialStatus: '',
        awningOrderDate: null,
        awningActualMaterialReceivedDate: null,
        awningEstimatedReadyMonth: '',
        preConDate: null,
        finalWalkThruStruXure: null,
        finalWalkThruScreens: null,
        finalWalkThruPergotenda: null,
        finalWalkThruAwning: null,
      };

      const result = calculateJobReadiness(job);

      expect(result.screens).toBeDefined();
      expect(result.screens?.confidence).toBe('HARD');
      expect(result.screens?.readyMonth).toBe('2026-03');
    });
  });

  describe('Awning Readiness', () => {
    it('should calculate awnings with 3-week lead time from contract', () => {
      const job: ParsedJob = {
        jobStartDate: null,
        status: 'OPEN',
        jobCategory: '04: MASTER - Awning',
        customer: 'Test Customer',
        serviceLocation: '123 Main St',
        contractDate: new Date('2026-02-25'),
        salesRep: 'John Doe',
        projectSupervisor: '',
        isCombinationJob: false,
        permitStatus: 'Permit Prep',
        permitResponsibility: 'Permit by DOS',
        permitEstimatedApprovalDate: null,
        permitActualApprovalDate: null,
        permitSubmissionDate: null,
        struXureMaterialWaiver: false,
        struXureSF: null,
        struXureNumberOfZones: null,
        struXureMaterialStatus: '',
        struXureOrderDate: null,
        struXureEstimatedMaterialReceiveDate: null,
        struXureActualMaterialReceivedDate: null,
        struXureEstimatedReadyMonth: '',
        screensManufacturer: '',
        screensQuantity: null,
        screensMaterialStatus: '',
        screensOrderDate: null,
        screensEstimatedMaterialReceiveDate: null,
        screensActualMaterialReceivedDate: null,
        screensEstimatedReadyMonth: '',
        pergotendaSF: null,
        pergotendaMaterialStatus: '',
        pergotendaOrderDate: null,
        pergotendaEstimatedMaterialReceiveDate: null,
        pergotendaActualMaterialReceivedDate: null,
        pergotendaEstimatedReadyMonth: '',
        awningMaterialStatus: 'Not Yet Ordered',
        awningOrderDate: null,
        awningActualMaterialReceivedDate: null,
        awningEstimatedReadyMonth: '',
        preConDate: null,
        finalWalkThruStruXure: null,
        finalWalkThruScreens: null,
        finalWalkThruPergotenda: null,
        finalWalkThruAwning: null,
      };

      const result = calculateJobReadiness(job);

      expect(result.awning).toBeDefined();
      expect(result.awning?.confidence).toBe('HARD');
      expect(result.awning?.readyMonth).toBe('2026-03');
    });
  });
});
