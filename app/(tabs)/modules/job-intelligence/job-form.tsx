/**
 * Job Intelligence Module - Job Form Component
 * Single-page scrollable form for job data input and readiness calculation
 */

import React, { useState, useCallback, useMemo } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Switch, Alert } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { cn } from '@/lib/utils';
import { useColors } from '@/hooks/use-colors';
import type { CanonicalJob, ProcessedJob } from './types';
import { runReadinessEngine } from './readinessEngine';
import { JOB_CATEGORIES, PERMIT_STATUSES, MATERIAL_STATUSES, SCREEN_MANUFACTURERS, PERMIT_RESPONSIBILITIES, CONFIDENCE_COLORS, CONFIDENCE_LABELS } from './constants';
import { ProductCategory, Confidence } from './types';

interface JobFormProps {
  initialJob?: CanonicalJob;
  onSave?: (job: ProcessedJob) => void;
}

export function JobForm({ initialJob, onSave }: JobFormProps) {
  const colors = useColors();
  
  // Form state
  const [customer, setCustomer] = useState(initialJob?.Customer ?? '');
  const [projectSupervisor, setProjectSupervisor] = useState(initialJob?.ProjectSupervisor ?? '');
  const [jobCategory, setJobCategory] = useState(initialJob?.JobCategory ?? JOB_CATEGORIES[0]);
  const [isCombination, setIsCombination] = useState(initialJob?.IsThisACombinationJob ?? false);

  // Permit fields
  const [permitStatus, setPermitStatus] = useState(initialJob?.PermitStatus ?? PERMIT_STATUSES[0]);
  const [permitResponsibility, setPermitResponsibility] = useState(initialJob?.PermitResponsibility ?? PERMIT_RESPONSIBILITIES[1]);
  const [permitSubmissionDate, setPermitSubmissionDate] = useState(initialJob?.PermitSubmissionDate ? formatDateForInput(initialJob.PermitSubmissionDate) : '');
  const [permitEstimatedApprovalDate, setPermitEstimatedApprovalDate] = useState(initialJob?.PermitEstimatedApprovalDate ? formatDateForInput(initialJob.PermitEstimatedApprovalDate) : '');
  const [permitActualApprovalDate, setPermitActualApprovalDate] = useState(initialJob?.PermitActualApprovalDate ? formatDateForInput(initialJob.PermitActualApprovalDate) : '');

  // StruXure fields
  const [struxureMaterialStatus, setStruxureMaterialStatus] = useState(initialJob?.StruXureMaterialStatus ?? MATERIAL_STATUSES[0]);
  const [struxureSquareFootage, setStruxureSquareFootage] = useState(initialJob?.StruXureSquareFootage?.toString() ?? '');
  const [struxureNumberOfZones, setStruxureNumberOfZones] = useState(initialJob?.StruXureNumberOfZones?.toString() ?? '');
  const [struxureMaterialWaiver, setStruxureMaterialWaiver] = useState(initialJob?.StruXureMaterialWaiver ?? false);
  const [struxureOrderDate, setStruxureOrderDate] = useState(initialJob?.StruXureOrderDate ? formatDateForInput(initialJob.StruXureOrderDate) : '');
  const [struxureEstimatedReceiveDate, setStruxureEstimatedReceiveDate] = useState(initialJob?.StruXureEstimatedMaterialReceiveDate ? formatDateForInput(initialJob.StruXureEstimatedMaterialReceiveDate) : '');
  const [struxureActualReceiveDate, setStruxureActualReceiveDate] = useState(initialJob?.StruXureActualMaterialReceivedDate ? formatDateForInput(initialJob.StruXureActualMaterialReceivedDate) : '');

  // Screens fields
  const [screensMaterialStatus, setScreensMaterialStatus] = useState(initialJob?.ScreensMaterialStatus ?? MATERIAL_STATUSES[0]);
  const [screensManufacturer, setScreensManufacturer] = useState(initialJob?.ScreensManufacturer ?? SCREEN_MANUFACTURERS[0]);
  const [screensQuantity, setScreensQuantity] = useState(initialJob?.ScreensQuantity?.toString() ?? '');
  const [screensEstimatedReceiveDate, setScreensEstimatedReceiveDate] = useState(initialJob?.ScreensEstimatedMaterialReceiveDate ? formatDateForInput(initialJob.ScreensEstimatedMaterialReceiveDate) : '');
  const [screensActualReceiveDate, setScreensActualReceiveDate] = useState(initialJob?.ScreensActualMaterialReceivedDate ? formatDateForInput(initialJob.ScreensActualMaterialReceivedDate) : '');

  // Pergotenda fields
  const [pergotendaMaterialStatus, setPergotendaMaterialStatus] = useState(initialJob?.PergotendaMaterialStatus ?? MATERIAL_STATUSES[0]);
  const [pergotendaSquareFootage, setPergotendaSquareFootage] = useState(initialJob?.PergotendaSquareFootage?.toString() ?? '');
  const [pergotendaMaterialWaiver, setPergotendaMaterialWaiver] = useState(initialJob?.PergotendaMaterialWaiver ?? false);

  // Awning fields
  const [awningMaterialStatus, setAwningMaterialStatus] = useState(initialJob?.AwningMaterialStatus ?? MATERIAL_STATUSES[0]);

  // Pre-Con & Contract dates
  const [preConCompletedDate, setPreConCompletedDate] = useState(initialJob?.PreConCompletedDate ? formatDateForInput(initialJob.PreConCompletedDate) : '');
  const [contractSignedDate, setContractSignedDate] = useState(initialJob?.ContractSignedDate ? formatDateForInput(initialJob.ContractSignedDate) : '');
  const [installEstimatedReadyMonth, setInstallEstimatedReadyMonth] = useState(initialJob?.InstallEstimatedReadyMonth ?? '');

  // Build canonical job from form state
  const canonicalJob = useMemo(() => {
    const job: CanonicalJob = {
      Customer: customer,
      JobCategory: jobCategory,
      ProjectSupervisor: projectSupervisor,
      ContractSignedDate: contractSignedDate ? new Date(contractSignedDate) : null,
      PermitSubmissionDate: permitSubmissionDate ? new Date(permitSubmissionDate) : null,
      PermitEstimatedApprovalDate: permitEstimatedApprovalDate ? new Date(permitEstimatedApprovalDate) : null,
      PermitActualApprovalDate: permitActualApprovalDate ? new Date(permitActualApprovalDate) : null,
      StruXureOrderDate: struxureOrderDate ? new Date(struxureOrderDate) : null,
      StruXureEstimatedMaterialReceiveDate: struxureEstimatedReceiveDate ? new Date(struxureEstimatedReceiveDate) : null,
      StruXureActualMaterialReceivedDate: struxureActualReceiveDate ? new Date(struxureActualReceiveDate) : null,
      PreConCompletedDate: preConCompletedDate ? new Date(preConCompletedDate) : null,
      ScreensEstimatedMaterialReceiveDate: screensEstimatedReceiveDate ? new Date(screensEstimatedReceiveDate) : null,
      ScreensActualMaterialReceivedDate: screensActualReceiveDate ? new Date(screensActualReceiveDate) : null,
      PermitStatus: permitStatus,
      PermitResponsibility: permitResponsibility,
      StruXureMaterialStatus: struxureMaterialStatus,
      StruXureSquareFootage: struxureSquareFootage ? parseInt(struxureSquareFootage, 10) : null,
      StruXureNumberOfZones: struxureNumberOfZones ? parseInt(struxureNumberOfZones, 10) : null,
      StruXureMaterialWaiver: struxureMaterialWaiver,
      ScreensMaterialStatus: screensMaterialStatus,
      ScreensManufacturer: screensManufacturer,
      ScreensQuantity: screensQuantity ? parseInt(screensQuantity, 10) : null,
      PergotendaMaterialStatus: pergotendaMaterialStatus,
      PergotendaSquareFootage: pergotendaSquareFootage ? parseInt(pergotendaSquareFootage, 10) : null,
      PergotendaMaterialWaiver: pergotendaMaterialWaiver,
      AwningMaterialStatus: awningMaterialStatus,
      IsThisACombinationJob: isCombination,
      InstallEstimatedReadyMonth: installEstimatedReadyMonth,
    };
    return job;
  }, [
    customer, jobCategory, projectSupervisor, contractSignedDate, permitSubmissionDate,
    permitEstimatedApprovalDate, permitActualApprovalDate, struxureOrderDate,
    struxureEstimatedReceiveDate, struxureActualReceiveDate, preConCompletedDate,
    screensEstimatedReceiveDate, screensActualReceiveDate, permitStatus,
    permitResponsibility, struxureMaterialStatus, struxureSquareFootage,
    struxureNumberOfZones, struxureMaterialWaiver, screensMaterialStatus,
    screensManufacturer, screensQuantity, pergotendaMaterialStatus,
    pergotendaSquareFootage, pergotendaMaterialWaiver, awningMaterialStatus,
    isCombination, installEstimatedReadyMonth,
  ]);

  // Calculate readiness results
  const processedJob = useMemo(() => {
    return runReadinessEngine(canonicalJob);
  }, [canonicalJob]);

  // Determine which product sections to show
  const isScreenOnly = jobCategory.includes('02');
  const isStruxure = jobCategory.includes('01');
  const isPergotenda = jobCategory.includes('03');
  const isAwning = jobCategory.includes('04');

  const handleSave = useCallback(() => {
    if (!customer.trim()) {
      Alert.alert('Validation Error', 'Please enter a customer name');
      return;
    }
    onSave?.(processedJob);
  }, [customer, processedJob, onSave]);

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }} className="flex-1">
        <View className="p-4 gap-6">
          {/* Job Information Section */}
          <View className="gap-4">
            <Text className="text-lg font-semibold text-foreground">Job Information</Text>
            
            <View>
              <Text className="text-sm font-medium text-muted mb-1">Customer Name *</Text>
              <TextInput
                className="border border-border rounded-lg px-3 py-2 text-foreground bg-surface"
                placeholder="Enter customer name"
                placeholderTextColor={colors.muted}
                value={customer}
                onChangeText={setCustomer}
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-muted mb-1">Project Supervisor</Text>
              <TextInput
                className="border border-border rounded-lg px-3 py-2 text-foreground bg-surface"
                placeholder="Enter supervisor name"
                placeholderTextColor={colors.muted}
                value={projectSupervisor}
                onChangeText={setProjectSupervisor}
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-muted mb-1">Job Category</Text>
              <View className="flex-row flex-wrap gap-2">
                {JOB_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setJobCategory(cat)}
                    className={cn(
                      'px-3 py-2 rounded-lg border',
                      jobCategory === cat
                        ? 'bg-primary border-primary'
                        : 'bg-surface border-border'
                    )}
                  >
                    <Text className={cn(
                      'text-sm font-medium',
                      jobCategory === cat ? 'text-background' : 'text-foreground'
                    )}>
                      {cat.split(' - ')[1] || cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-muted">Combination Job?</Text>
              <Switch
                value={isCombination}
                onValueChange={setIsCombination}
              />
            </View>
          </View>

          {/* Permit Information Section */}
          <View className="gap-4">
            <Text className="text-lg font-semibold text-foreground">Permit Information</Text>
            
            <View>
              <Text className="text-sm font-medium text-muted mb-1">Permit Status</Text>
              <View className="flex-row flex-wrap gap-2">
                {PERMIT_STATUSES.map((status) => (
                  <TouchableOpacity
                    key={status}
                    onPress={() => setPermitStatus(status)}
                    className={cn(
                      'px-2 py-1 rounded border text-xs',
                      permitStatus === status
                        ? 'bg-primary border-primary'
                        : 'bg-surface border-border'
                    )}
                  >
                    <Text className={cn(
                      'text-xs font-medium',
                      permitStatus === status ? 'text-background' : 'text-foreground'
                    )}>
                      {status.replace('Permit ', '')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-sm font-medium text-muted mb-1">Permit Responsibility</Text>
              <View className="flex-row gap-2">
                {PERMIT_RESPONSIBILITIES.map((resp) => (
                  <TouchableOpacity
                    key={resp}
                    onPress={() => setPermitResponsibility(resp)}
                    className={cn(
                      'flex-1 px-3 py-2 rounded-lg border',
                      permitResponsibility === resp
                        ? 'bg-primary border-primary'
                        : 'bg-surface border-border'
                    )}
                  >
                    <Text className={cn(
                      'text-sm font-medium text-center',
                      permitResponsibility === resp ? 'text-background' : 'text-foreground'
                    )}>
                      {resp}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <DateInput
              label="Permit Submission Date"
              value={permitSubmissionDate}
              onChange={setPermitSubmissionDate}
              colors={colors}
            />

            <DateInput
              label="Permit Estimated Approval Date"
              value={permitEstimatedApprovalDate}
              onChange={setPermitEstimatedApprovalDate}
              colors={colors}
            />

            <DateInput
              label="Permit Actual Approval Date"
              value={permitActualApprovalDate}
              onChange={setPermitActualApprovalDate}
              colors={colors}
            />
          </View>

          {/* StruXure Section */}
          {isStruxure && (
            <ProductSection
              title="StruXure Configuration"
              materialStatus={struxureMaterialStatus}
              onMaterialStatusChange={setStruxureMaterialStatus}
              squareFootage={struxureSquareFootage}
              onSquareFootageChange={setStruxureSquareFootage}
              numberOfZones={struxureNumberOfZones}
              onNumberOfZonesChange={setStruxureNumberOfZones}
              materialWaiver={struxureMaterialWaiver}
              onMaterialWaiverChange={setStruxureMaterialWaiver}
              orderDate={struxureOrderDate}
              onOrderDateChange={setStruxureOrderDate}
              estimatedReceiveDate={struxureEstimatedReceiveDate}
              onEstimatedReceiveDateChange={setStruxureEstimatedReceiveDate}
              actualReceiveDate={struxureActualReceiveDate}
              onActualReceiveDateChange={setStruxureActualReceiveDate}
              colors={colors}
              showZones
            />
          )}

          {/* Screens Section */}
          {(isScreenOnly || (isStruxure && isCombination) || (isPergotenda && isCombination)) && (
            <ProductSection
              title="Screens Configuration"
              materialStatus={screensMaterialStatus}
              onMaterialStatusChange={setScreensMaterialStatus}
              quantity={screensQuantity}
              onQuantityChange={setScreensQuantity}
              manufacturer={screensManufacturer}
              onManufacturerChange={setScreensManufacturer}
              estimatedReceiveDate={screensEstimatedReceiveDate}
              onEstimatedReceiveDateChange={setScreensEstimatedReceiveDate}
              actualReceiveDate={screensActualReceiveDate}
              onActualReceiveDateChange={setScreensActualReceiveDate}
              colors={colors}
              showManufacturer
              showQuantity
            />
          )}

          {/* Pergotenda Section */}
          {isPergotenda && (
            <ProductSection
              title="Pergotenda Configuration"
              materialStatus={pergotendaMaterialStatus}
              onMaterialStatusChange={setPergotendaMaterialStatus}
              squareFootage={pergotendaSquareFootage}
              onSquareFootageChange={setPergotendaSquareFootage}
              materialWaiver={pergotendaMaterialWaiver}
              onMaterialWaiverChange={setPergotendaMaterialWaiver}
              colors={colors}
              showSquareFootage
              showWaiver
            />
          )}

          {/* Awning Section */}
          {isAwning && (
            <ProductSection
              title="Awning Configuration"
              materialStatus={awningMaterialStatus}
              onMaterialStatusChange={setAwningMaterialStatus}
              colors={colors}
            />
          )}

          {/* Pre-Con & Contract Dates Section */}
          <View className="gap-4">
            <Text className="text-lg font-semibold text-foreground">Key Dates</Text>
            
            <DateInput
              label="Pre-Con Completed Date"
              value={preConCompletedDate}
              onChange={setPreConCompletedDate}
              colors={colors}
            />

            <DateInput
              label="Contract Signed Date"
              value={contractSignedDate}
              onChange={setContractSignedDate}
              colors={colors}
            />

            <DateInput
              label="Install Estimated Ready Month (Manual Override)"
              value={installEstimatedReadyMonth}
              onChange={setInstallEstimatedReadyMonth}
              colors={colors}
              placeholder="YYYY-MM"
            />
          </View>

          {/* Readiness Results Section */}
          <View className="gap-4 bg-surface rounded-lg p-4">
            <Text className="text-lg font-semibold text-foreground">Material Readiness</Text>
            
            {Object.entries(processedJob.readiness).map(([product, result]) => {
              if (!result) return null;
              const bgColor = result.confidence === Confidence.HARD ? '#dcfce7' :
                             result.confidence === Confidence.FORECAST ? '#fef3c7' :
                             '#fee2e2';
              const textColor = result.confidence === Confidence.HARD ? '#166534' :
                               result.confidence === Confidence.FORECAST ? '#92400e' :
                               '#991b1b';
              
              return (
                <View key={product} className="gap-2 border border-border rounded-lg p-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-semibold text-foreground">{product}</Text>
                    <View style={{ backgroundColor: bgColor }} className="px-2 py-1 rounded">
                      <Text style={{ color: textColor }} className="text-xs font-semibold">
                        {CONFIDENCE_LABELS[result.confidence]}
                      </Text>
                    </View>
                  </View>
                  
                  {result.readyMonth && (
                    <Text className="text-sm text-foreground">
                      Ready: <Text className="font-semibold">{result.readyMonth}</Text>
                    </Text>
                  )}
                  
                  <Text className="text-xs text-muted">{result.sourceLabel}</Text>
                  
                  {result.exceptions.length > 0 && (
                    <View className="mt-2 gap-1">
                      <Text className="text-xs font-medium text-error">Issues:</Text>
                      {result.exceptions.map((exc, idx) => (
                        <Text key={idx} className="text-xs text-error">• {exc}</Text>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            className="bg-primary rounded-lg px-4 py-3 items-center"
          >
            <Text className="text-background font-semibold text-base">Save Job</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

/**
 * Product Configuration Section Component
 */
interface ProductSectionProps {
  title: string;
  materialStatus: string;
  onMaterialStatusChange: (status: string) => void;
  squareFootage?: string;
  onSquareFootageChange?: (value: string) => void;
  numberOfZones?: string;
  onNumberOfZonesChange?: (value: string) => void;
  quantity?: string;
  onQuantityChange?: (value: string) => void;
  manufacturer?: string;
  onManufacturerChange?: (value: string) => void;
  materialWaiver?: boolean;
  onMaterialWaiverChange?: (value: boolean) => void;
  orderDate?: string;
  onOrderDateChange?: (value: string) => void;
  estimatedReceiveDate?: string;
  onEstimatedReceiveDateChange?: (value: string) => void;
  actualReceiveDate?: string;
  onActualReceiveDateChange?: (value: string) => void;
  colors: any;
  showSquareFootage?: boolean;
  showZones?: boolean;
  showQuantity?: boolean;
  showManufacturer?: boolean;
  showWaiver?: boolean;
  showOrderDate?: boolean;
}

function ProductSection({
  title,
  materialStatus,
  onMaterialStatusChange,
  squareFootage,
  onSquareFootageChange,
  numberOfZones,
  onNumberOfZonesChange,
  quantity,
  onQuantityChange,
  manufacturer,
  onManufacturerChange,
  materialWaiver,
  onMaterialWaiverChange,
  orderDate,
  onOrderDateChange,
  estimatedReceiveDate,
  onEstimatedReceiveDateChange,
  actualReceiveDate,
  onActualReceiveDateChange,
  colors,
  showSquareFootage,
  showZones,
  showQuantity,
  showManufacturer,
  showWaiver,
  showOrderDate,
}: ProductSectionProps) {
  return (
    <View className="gap-4">
      <Text className="text-lg font-semibold text-foreground">{title}</Text>

      <View>
        <Text className="text-sm font-medium text-muted mb-1">Material Status</Text>
        <View className="flex-row flex-wrap gap-2">
          {MATERIAL_STATUSES.map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => onMaterialStatusChange(status)}
              className={cn(
                'px-2 py-1 rounded border text-xs',
                materialStatus === status
                  ? 'bg-primary border-primary'
                  : 'bg-surface border-border'
              )}
            >
              <Text className={cn(
                'text-xs font-medium',
                materialStatus === status ? 'text-background' : 'text-foreground'
              )}>
                {status.replace(/^[^-]+ - /, '')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {showManufacturer && manufacturer !== undefined && onManufacturerChange && (
        <View>
          <Text className="text-sm font-medium text-muted mb-1">Manufacturer</Text>
          <View className="flex-row gap-2">
            {SCREEN_MANUFACTURERS.map((mfg) => (
              <TouchableOpacity
                key={mfg}
                onPress={() => onManufacturerChange(mfg)}
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg border',
                  manufacturer === mfg
                    ? 'bg-primary border-primary'
                    : 'bg-surface border-border'
                )}
              >
                <Text className={cn(
                  'text-sm font-medium text-center',
                  manufacturer === mfg ? 'text-background' : 'text-foreground'
                )}>
                  {mfg}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {showSquareFootage && squareFootage !== undefined && onSquareFootageChange && (
        <View>
          <Text className="text-sm font-medium text-muted mb-1">Square Footage</Text>
          <TextInput
            className="border border-border rounded-lg px-3 py-2 text-foreground bg-surface"
            placeholder="Enter square footage"
            placeholderTextColor={colors.muted}
            value={squareFootage}
            onChangeText={onSquareFootageChange}
            keyboardType="number-pad"
          />
        </View>
      )}

      {showZones && numberOfZones !== undefined && onNumberOfZonesChange && (
        <View>
          <Text className="text-sm font-medium text-muted mb-1"># of Zones</Text>
          <TextInput
            className="border border-border rounded-lg px-3 py-2 text-foreground bg-surface"
            placeholder="Enter number of zones"
            placeholderTextColor={colors.muted}
            value={numberOfZones}
            onChangeText={onNumberOfZonesChange}
            keyboardType="number-pad"
          />
        </View>
      )}

      {showQuantity && quantity !== undefined && onQuantityChange && (
        <View>
          <Text className="text-sm font-medium text-muted mb-1">Quantity</Text>
          <TextInput
            className="border border-border rounded-lg px-3 py-2 text-foreground bg-surface"
            placeholder="Enter quantity"
            placeholderTextColor={colors.muted}
            value={quantity}
            onChangeText={onQuantityChange}
            keyboardType="number-pad"
          />
        </View>
      )}

      {showWaiver && materialWaiver !== undefined && onMaterialWaiverChange && (
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-muted">Material Waiver</Text>
          <Switch
            value={materialWaiver}
            onValueChange={onMaterialWaiverChange}
          />
        </View>
      )}

      {showOrderDate && orderDate !== undefined && onOrderDateChange && (
        <DateInput
          label="Order Date"
          value={orderDate}
          onChange={onOrderDateChange}
          colors={colors}
        />
      )}

      {estimatedReceiveDate !== undefined && onEstimatedReceiveDateChange && (
        <DateInput
          label="Estimated Material Receive Date"
          value={estimatedReceiveDate}
          onChange={onEstimatedReceiveDateChange}
          colors={colors}
        />
      )}

      {actualReceiveDate !== undefined && onActualReceiveDateChange && (
        <DateInput
          label="Actual Material Received Date"
          value={actualReceiveDate}
          onChange={onActualReceiveDateChange}
          colors={colors}
        />
      )}
    </View>
  );
}

/**
 * Date Input Component
 */
interface DateInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  colors: any;
  placeholder?: string;
}

function DateInput({ label, value, onChange, colors, placeholder }: DateInputProps) {
  return (
    <View>
      <Text className="text-sm font-medium text-muted mb-1">{label}</Text>
      <TextInput
        className="border border-border rounded-lg px-3 py-2 text-foreground bg-surface"
        placeholder={placeholder || 'YYYY-MM-DD'}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChange}
      />
    </View>
  );
}

/**
 * Helper function to format date for input
 */
function formatDateForInput(date: Date | null): string {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
