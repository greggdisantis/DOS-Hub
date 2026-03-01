/**
 * Client Meeting Report — Multi-Step Form Wizard
 * 5 sections: Client Info → Deal Status → Purchase Confidence → Value & Objections → Next Steps
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, StyleSheet, Switch, Alert,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  ClientMeetingReport, LEAD_SOURCE_OPTIONS, PROJECT_TYPE_OPTIONS,
  VALUE_COMMUNICATED_OPTIONS, OBJECTION_OPTIONS, MESSAGING_OPTIONS,
  DEAL_STATUS_LABELS, DealStatus, SourceType, ClientType, AppointmentType,
  CloseTimeline, FinancingReaction, ClientResponse, LeadQuality,
  ExpectationAlignment, BudgetAlignment, NextAction,
} from './types';

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  const colors = useColors();
  return (
    <View style={[styles.sectionHeader, { borderBottomColor: colors.primary }]}>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>{children}</Text>
    </View>
  );
}

function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  const colors = useColors();
  return (
    <Text style={[styles.fieldLabel, { color: colors.muted }]}>
      {children}{required && <Text style={{ color: colors.error }}> *</Text>}
    </Text>
  );
}

function StyledInput({
  value, onChangeText, placeholder, multiline, numberOfLines, keyboardType,
}: {
  value: string; onChangeText: (v: string) => void; placeholder?: string;
  multiline?: boolean; numberOfLines?: number; keyboardType?: any;
}) {
  const colors = useColors();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder ?? ''}
      placeholderTextColor={colors.muted}
      multiline={multiline}
      numberOfLines={numberOfLines}
      keyboardType={keyboardType}
      returnKeyType={multiline ? 'default' : 'done'}
      style={[
        styles.input,
        { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border },
        multiline && { height: (numberOfLines ?? 3) * 22 + 16, textAlignVertical: 'top' },
      ]}
    />
  );
}

function OptionButton({
  label, selected, onPress,
}: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionBtn,
        { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + '18' : colors.surface },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.optionBtnText, { color: selected ? colors.primary : colors.foreground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function MultiSelect({
  options, selected, onChange,
}: { options: { value: string; label: string }[]; selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };
  return (
    <View style={styles.multiSelectWrap}>
      {options.map((o) => (
        <OptionButton key={o.value} label={o.label} selected={selected.includes(o.value)} onPress={() => toggle(o.value)} />
      ))}
    </View>
  );
}

function SingleSelect<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T | ''; onChange: (v: T) => void }) {
  return (
    <View style={styles.multiSelectWrap}>
      {options.map((o) => (
        <OptionButton key={o.value} label={o.label} selected={value === o.value} onPress={() => onChange(o.value)} />
      ))}
    </View>
  );
}

function PCSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const colors = useColors();
  const steps = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  return (
    <View>
      <View style={styles.pcRow}>
        {steps.map((s) => (
          <Pressable
            key={s}
            onPress={() => onChange(s)}
            style={[
              styles.pcStep,
              { backgroundColor: value === s ? colors.primary : colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.pcStepText, { color: value === s ? '#fff' : colors.muted }]}>{s}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.pcLabel, { color: colors.primary }]}>
        {value}% — {value >= 80 ? 'Very Likely' : value >= 60 ? 'Likely' : value >= 40 ? 'Possible' : value >= 20 ? 'Unlikely' : 'Very Unlikely'}
      </Text>
    </View>
  );
}

// ── Step renderers ────────────────────────────────────────────────────────────

function StepClientInfo({ report, update }: { report: ClientMeetingReport; update: (p: Partial<ClientMeetingReport>) => void }) {
  const colors = useColors();
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      <SectionTitle>Client Information</SectionTitle>

      <FieldLabel>Consultant</FieldLabel>
      <StyledInput value={report.consultantName} onChangeText={(v) => update({ consultantName: v })} placeholder="Your name (auto-filled)" />

      <FieldLabel required>Week Of</FieldLabel>
      <StyledInput value={report.weekOf} onChangeText={(v) => update({ weekOf: v })} placeholder="YYYY-MM-DD" />

      <FieldLabel required>Source</FieldLabel>
      <SingleSelect<SourceType>
        options={[
          { value: 'marketing-in-home', label: 'Marketing – In-Home' },
          { value: 'marketing-showroom', label: 'Marketing – Showroom' },
          { value: 'self-generated', label: 'Self-Generated' },
        ]}
        value={report.source}
        onChange={(v) => update({ source: v })}
      />

      <FieldLabel required>Client Name</FieldLabel>
      <View style={[styles.hubspotRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <IconSymbol name="link" size={16} color={colors.muted} />
        <Text style={[styles.hubspotNote, { color: colors.muted }]}>HubSpot integration coming soon</Text>
      </View>
      <StyledInput value={report.clientName} onChangeText={(v) => update({ clientName: v })} placeholder="Client full name" />

      <FieldLabel>Address</FieldLabel>
      <StyledInput value={report.address} onChangeText={(v) => update({ address: v })} placeholder="Project address" />

      <FieldLabel>Client Type</FieldLabel>
      <SingleSelect<ClientType>
        options={[{ value: 'residential', label: 'Residential' }, { value: 'commercial', label: 'Commercial' }]}
        value={report.clientType}
        onChange={(v) => update({ clientType: v })}
      />

      <FieldLabel required>Appointment Date</FieldLabel>
      <StyledInput value={report.appointmentDate} onChangeText={(v) => update({ appointmentDate: v })} placeholder="YYYY-MM-DD" />

      <FieldLabel required>Appointment Type</FieldLabel>
      <SingleSelect<AppointmentType>
        options={[{ value: 'in-home', label: 'In-Home' }, { value: 'showroom', label: 'Showroom' }, { value: 'phone', label: 'Phone' }]}
        value={report.appointmentType}
        onChange={(v) => update({ appointmentType: v })}
      />

      {report.appointmentType === 'phone' && (
        <>
          <FieldLabel>Converted to In-Person?</FieldLabel>
          <View style={styles.switchRow}>
            <Switch value={report.convertedToInPerson} onValueChange={(v) => update({ convertedToInPerson: v })} />
            <Text style={[styles.switchLabel, { color: colors.foreground }]}>
              {report.convertedToInPerson ? 'Yes' : 'No'}
            </Text>
          </View>
          {report.convertedToInPerson && (
            <>
              <FieldLabel>Converted Date</FieldLabel>
              <StyledInput value={report.convertedDate ?? ''} onChangeText={(v) => update({ convertedDate: v })} placeholder="YYYY-MM-DD" />
              <FieldLabel>Converted Type</FieldLabel>
              <SingleSelect<AppointmentType>
                options={[{ value: 'in-home', label: 'In-Home' }, { value: 'showroom', label: 'Showroom' }]}
                value={report.convertedType ?? ''}
                onChange={(v) => update({ convertedType: v })}
              />
            </>
          )}
        </>
      )}

      <FieldLabel>Lead Source(s)</FieldLabel>
      <MultiSelect options={LEAD_SOURCE_OPTIONS} selected={report.leadSources} onChange={(v) => update({ leadSources: v })} />
      {report.leadSources.includes('other') && (
        <StyledInput value={report.leadSourceOther ?? ''} onChangeText={(v) => update({ leadSourceOther: v })} placeholder="Specify other lead source" />
      )}

      <FieldLabel>Project Type(s)</FieldLabel>
      <MultiSelect options={PROJECT_TYPE_OPTIONS} selected={report.projectTypes} onChange={(v) => update({ projectTypes: v })} />
      {report.projectTypes.includes('other') && (
        <StyledInput value={report.projectTypeOther ?? ''} onChangeText={(v) => update({ projectTypeOther: v })} placeholder="Specify other project type" />
      )}
    </ScrollView>
  );
}

function StepDealStatus({ report, update }: { report: ClientMeetingReport; update: (p: Partial<ClientMeetingReport>) => void }) {
  const colors = useColors();
  const dealOptions = (Object.entries(DEAL_STATUS_LABELS) as [DealStatus, string][]).map(([value, label]) => ({ value, label }));
  const timelineOptions: { value: CloseTimeline; label: string }[] = [
    { value: '0-30', label: '0–30 days' },
    { value: '31-60', label: '31–60 days' },
    { value: '61-90', label: '61–90 days' },
    { value: '90+', label: '90+ days' },
  ];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      <SectionTitle>Deal Status</SectionTitle>

      <FieldLabel required>Current Status</FieldLabel>
      <SingleSelect<DealStatus> options={dealOptions} value={report.dealStatus} onChange={(v) => update({ dealStatus: v })} />

      {report.dealStatus === 'working-design' && (
        <>
          <FieldLabel>Follow-Up Date</FieldLabel>
          <StyledInput value={report.followUpDate ?? ''} onChangeText={(v) => update({ followUpDate: v })} placeholder="YYYY-MM-DD" />
          <FieldLabel>If no follow-up date, reason</FieldLabel>
          <StyledInput value={report.noFollowUpReason ?? ''} onChangeText={(v) => update({ noFollowUpReason: v })} placeholder="Reason for no follow-up date" />
        </>
      )}

      {report.dealStatus === 'proposal-presented' && (
        <>
          <FieldLabel>Proposal Date</FieldLabel>
          <StyledInput value={report.proposalDate ?? ''} onChangeText={(v) => update({ proposalDate: v })} placeholder="YYYY-MM-DD" />
        </>
      )}

      {report.dealStatus === 'lost' && (
        <>
          <FieldLabel>Lost Reason</FieldLabel>
          <StyledInput value={report.lostReason ?? ''} onChangeText={(v) => update({ lostReason: v })} placeholder="Why was this deal lost?" multiline numberOfLines={3} />
        </>
      )}

      <FieldLabel>Estimated Close Timeline</FieldLabel>
      <SingleSelect<CloseTimeline> options={timelineOptions} value={report.closeTimeline} onChange={(v) => update({ closeTimeline: v })} />

      <FieldLabel required>Summary of Last Conversation</FieldLabel>
      <Text style={[styles.hint, { color: colors.muted }]}>What was discussed? What are their priorities?</Text>
      <StyledInput
        value={report.lastConversationSummary}
        onChangeText={(v) => update({ lastConversationSummary: v })}
        placeholder="Summarize the conversation..."
        multiline
        numberOfLines={5}
      />
    </ScrollView>
  );
}

function StepPurchaseConfidence({ report, update }: { report: ClientMeetingReport; update: (p: Partial<ClientMeetingReport>) => void }) {
  const colors = useColors();
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      <SectionTitle>Purchase Confidence</SectionTitle>

      <FieldLabel required>PC % (Purchase Confidence)</FieldLabel>
      <PCSlider value={report.purchaseConfidencePct} onChange={(v) => update({ purchaseConfidencePct: v })} />

      <FieldLabel required>Who are the decision makers?</FieldLabel>
      <StyledInput value={report.decisionMakers} onChangeText={(v) => update({ decisionMakers: v })} placeholder="e.g., Husband and wife both present" />

      <FieldLabel required>Main Motivation / Urgency</FieldLabel>
      <StyledInput value={report.mainMotivation} onChangeText={(v) => update({ mainMotivation: v })} placeholder="What is driving this purchase?" multiline numberOfLines={3} />

      <FieldLabel required>Main Hesitation / Objection</FieldLabel>
      <StyledInput value={report.mainHesitation} onChangeText={(v) => update({ mainHesitation: v })} placeholder="What is holding them back?" multiline numberOfLines={3} />

      <FieldLabel required>PC Notes (minimum 3 sentences)</FieldLabel>
      <Text style={[styles.hint, { color: colors.muted }]}>
        Explain your confidence rating. Include context about their timeline, budget, and engagement level.
      </Text>
      <StyledInput
        value={report.pcNotes}
        onChangeText={(v) => update({ pcNotes: v })}
        placeholder="Explain your PC rating in detail..."
        multiline
        numberOfLines={6}
      />
    </ScrollView>
  );
}

function StepValueObjections({ report, update }: { report: ClientMeetingReport; update: (p: Partial<ClientMeetingReport>) => void }) {
  const colors = useColors();
  const responseOptions: { value: ClientResponse; label: string }[] = [
    { value: 'strong-alignment', label: 'Strong Alignment' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'price-focused', label: 'Price-Focused' },
    { value: 'comparing-online', label: 'Comparing Online / Low-Cost' },
  ];
  const reactionOptions: { value: FinancingReaction; label: string }[] = [
    { value: 'interested', label: 'Interested' },
    { value: 'needs-followup', label: 'Needs Follow-Up' },
    { value: 'declined', label: 'Declined' },
  ];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      <SectionTitle>Value Communicated &amp; Objections</SectionTitle>

      <FieldLabel>Was Financing Discussed?</FieldLabel>
      <View style={styles.switchRow}>
        <Switch
          value={report.financingDiscussed === true}
          onValueChange={(v) => update({ financingDiscussed: v })}
        />
        <Text style={[styles.switchLabel, { color: colors.foreground }]}>
          {report.financingDiscussed === true ? 'Yes' : report.financingDiscussed === false ? 'No' : 'Not set'}
        </Text>
      </View>

      {report.financingDiscussed === true && (
        <>
          <FieldLabel>Client Reaction to Financing</FieldLabel>
          <SingleSelect<FinancingReaction> options={reactionOptions} value={report.financingReaction} onChange={(v) => update({ financingReaction: v })} />
        </>
      )}

      <FieldLabel>Value Points Communicated</FieldLabel>
      <MultiSelect options={VALUE_COMMUNICATED_OPTIONS} selected={report.valueCommunicated} onChange={(v) => update({ valueCommunicated: v })} />

      <FieldLabel>Client Response to Value</FieldLabel>
      <SingleSelect<ClientResponse> options={responseOptions} value={report.clientResponse} onChange={(v) => update({ clientResponse: v })} />

      <FieldLabel>Objections Raised</FieldLabel>
      <MultiSelect options={OBJECTION_OPTIONS} selected={report.objections} onChange={(v) => update({ objections: v })} />
      {report.objections.includes('other') && (
        <StyledInput value={report.objectionOther ?? ''} onChangeText={(v) => update({ objectionOther: v })} placeholder="Describe other objection" />
      )}

      <FieldLabel>Objection Notes</FieldLabel>
      <StyledInput
        value={report.objectionNotes}
        onChangeText={(v) => update({ objectionNotes: v })}
        placeholder="How did you handle the objections?"
        multiline
        numberOfLines={4}
      />
    </ScrollView>
  );
}

function StepNextSteps({ report, update }: { report: ClientMeetingReport; update: (p: Partial<ClientMeetingReport>) => void }) {
  const colors = useColors();
  const isMarketingLead = report.source === 'marketing-in-home' || report.source === 'marketing-showroom';

  const nextActionOptions: { value: NextAction; label: string }[] = [
    { value: 'followup-call', label: 'Follow-Up Call' },
    { value: 'design-revision', label: 'Design Revision' },
    { value: 'financing-followup', label: 'Financing Follow-Up' },
    { value: 'showroom-visit', label: 'Showroom Visit' },
    { value: 'site-revisit', label: 'Site Revisit' },
  ];

  const qualityOptions: { value: LeadQuality; label: string }[] = [
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'average', label: 'Average' },
    { value: 'poor', label: 'Poor' },
  ];

  const alignmentOptions: { value: ExpectationAlignment; label: string }[] = [
    { value: 'yes', label: 'Yes – Aligned' },
    { value: 'somewhat', label: 'Somewhat' },
    { value: 'no', label: 'No – Mismatch' },
  ];

  const budgetOptions: { value: BudgetAlignment; label: string }[] = [
    { value: 'aligned', label: 'Aligned' },
    { value: 'slightly-below', label: 'Slightly Below Range' },
    { value: 'significantly-below', label: 'Significantly Below Range' },
  ];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      <SectionTitle>Next Steps</SectionTitle>

      <FieldLabel required>Next Action(s)</FieldLabel>
      <View style={styles.multiSelectWrap}>
        {nextActionOptions.map((o) => (
          <OptionButton
            key={o.value}
            label={o.label}
            selected={report.nextActions.includes(o.value)}
            onPress={() => {
              const updated = report.nextActions.includes(o.value)
                ? report.nextActions.filter((a) => a !== o.value)
                : [...report.nextActions, o.value];
              update({ nextActions: updated });
            }}
          />
        ))}
      </View>

      <FieldLabel>Next Follow-Up Date</FieldLabel>
      <StyledInput value={report.nextFollowUpDate ?? ''} onChangeText={(v) => update({ nextFollowUpDate: v })} placeholder="YYYY-MM-DD" />

      {isMarketingLead && (
        <>
          <SectionTitle>Marketing Feedback</SectionTitle>
          <Text style={[styles.hint, { color: colors.muted }]}>Required for all marketing-sourced leads.</Text>

          <FieldLabel>Lead Quality</FieldLabel>
          <SingleSelect<LeadQuality> options={qualityOptions} value={report.leadQuality} onChange={(v) => update({ leadQuality: v })} />

          <FieldLabel>Were Expectations Aligned with Reality?</FieldLabel>
          <SingleSelect<ExpectationAlignment> options={alignmentOptions} value={report.expectationAlignment} onChange={(v) => update({ expectationAlignment: v })} />

          <FieldLabel>Marketing Messaging Referenced</FieldLabel>
          <MultiSelect options={MESSAGING_OPTIONS} selected={report.messagingReferenced} onChange={(v) => update({ messagingReferenced: v })} />
          {report.messagingReferenced.includes('other') && (
            <StyledInput value={report.messagingOther ?? ''} onChangeText={(v) => update({ messagingOther: v })} placeholder="Specify other messaging" />
          )}

          <FieldLabel>Budget Alignment</FieldLabel>
          <SingleSelect<BudgetAlignment> options={budgetOptions} value={report.budgetAlignment} onChange={(v) => update({ budgetAlignment: v })} />

          <FieldLabel>Marketing Notes</FieldLabel>
          <StyledInput
            value={report.marketingNotes}
            onChangeText={(v) => update({ marketingNotes: v })}
            placeholder="Additional feedback for the marketing team..."
            multiline
            numberOfLines={4}
          />
        </>
      )}
    </ScrollView>
  );
}

// ── Main wizard component ─────────────────────────────────────────────────────

const STEPS = [
  { key: 'client-info', title: 'Client Info', icon: 'person.circle.fill' as const },
  { key: 'deal-status', title: 'Deal Status', icon: 'chart.bar.fill' as const },
  { key: 'purchase-confidence', title: 'PC %', icon: 'checkmark.circle.fill' as const },
  { key: 'value-objections', title: 'Value', icon: 'bolt.fill' as const },
  { key: 'next-steps', title: 'Next Steps', icon: 'paperplane.fill' as const },
];

interface FormWizardProps {
  report: ClientMeetingReport;
  onUpdate: (partial: Partial<ClientMeetingReport>) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function ClientMeetingFormWizard({ report, onUpdate, onSave, onCancel, isSaving }: FormWizardProps) {
  const colors = useColors();
  const [step, setStep] = useState(0);

  const canGoNext = step < STEPS.length - 1;
  const canGoPrev = step > 0;

  const handleNext = useCallback(() => {
    if (canGoNext) setStep((s) => s + 1);
  }, [canGoNext]);

  const handlePrev = useCallback(() => {
    if (canGoPrev) setStep((s) => s - 1);
  }, [canGoPrev]);

  const handleSave = useCallback(() => {
    if (!report.clientName.trim()) {
      Alert.alert('Missing Info', 'Please enter a client name before saving.');
      return;
    }
    onSave();
  }, [report.clientName, onSave]);

  const renderStep = () => {
    switch (step) {
      case 0: return <StepClientInfo report={report} update={onUpdate} />;
      case 1: return <StepDealStatus report={report} update={onUpdate} />;
      case 2: return <StepPurchaseConfidence report={report} update={onUpdate} />;
      case 3: return <StepValueObjections report={report} update={onUpdate} />;
      case 4: return <StepNextSteps report={report} update={onUpdate} />;
      default: return null;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Step indicator */}
      <View style={[styles.stepBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {STEPS.map((s, i) => (
          <Pressable
            key={s.key}
            onPress={() => setStep(i)}
            style={[styles.stepDot, { borderBottomColor: i === step ? colors.primary : 'transparent', borderBottomWidth: i === step ? 2 : 0 }]}
          >
            <IconSymbol name={s.icon} size={18} color={i === step ? colors.primary : i < step ? colors.success : colors.muted} />
            <Text style={[styles.stepDotLabel, { color: i === step ? colors.primary : i < step ? colors.success : colors.muted }]}>
              {s.title}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Step content */}
      <View style={{ flex: 1 }}>
        {renderStep()}
      </View>

      {/* Navigation buttons */}
      <View style={[styles.navBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <Pressable
          onPress={canGoPrev ? handlePrev : onCancel}
          style={({ pressed }) => [styles.navBtn, styles.navBtnSecondary, { borderColor: colors.border, backgroundColor: colors.surface }, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.navBtnText, { color: colors.foreground }]}>{canGoPrev ? '← Back' : 'Cancel'}</Text>
        </Pressable>

        {canGoNext ? (
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [styles.navBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.8 }]}
          >
            <Text style={[styles.navBtnText, { color: '#fff' }]}>Next →</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [styles.navBtn, { backgroundColor: colors.success }, pressed && { opacity: 0.8 }]}
          >
            <Text style={[styles.navBtnText, { color: '#fff' }]}>{isSaving ? 'Saving…' : '✓ Save Report'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  stepBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingTop: 8,
    paddingBottom: 4,
  },
  stepDot: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 6,
    gap: 2,
  },
  stepDotLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  stepContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    borderBottomWidth: 1.5,
    paddingBottom: 4,
    marginBottom: 14,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 12,
  },
  hint: {
    fontSize: 11,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  multiSelectWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  optionBtn: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  optionBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  switchLabel: {
    fontSize: 14,
  },
  pcRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  pcStep: {
    width: 44,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pcStepText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pcLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  hubspotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  hubspotNote: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  navBar: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderTopWidth: 1,
  },
  navBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnSecondary: {
    borderWidth: 1,
  },
  navBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
