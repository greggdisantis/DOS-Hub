/**
 * Client Meeting Report — Data Types
 *
 * Mirrors the "Consultants Weekly Sales Report" form (V1).
 * Designed for future HubSpot CRM integration (clientId field).
 */

export type AppointmentType = 'in-home' | 'showroom' | 'phone';
export type ClientType = 'residential' | 'commercial';
export type SourceType = 'marketing-in-home' | 'marketing-showroom' | 'self-generated';
export type DealStatus =
  | 'working-design'
  | 'proposal-presented'
  | 'actively-considering'
  | 'awaiting-financing'
  | 'waiting-design'
  | 'delayed'
  | 'lost';
export type CloseTimeline = '0-30' | '31-60' | '61-90' | '90+';
export type FinancingReaction = 'interested' | 'needs-followup' | 'declined';
export type ClientResponse = 'strong-alignment' | 'neutral' | 'price-focused' | 'comparing-online';
export type LeadQuality = 'excellent' | 'good' | 'average' | 'poor';
export type ExpectationAlignment = 'yes' | 'somewhat' | 'no';
export type BudgetAlignment = 'aligned' | 'slightly-below' | 'significantly-below';
export type NextAction =
  | 'followup-call'
  | 'design-revision'
  | 'financing-followup'
  | 'showroom-visit'
  | 'site-revisit';

export interface ProgressNote {
  id: string;          // uuid
  text: string;
  createdAt: string;   // ISO date-time
}

export interface ClientMeetingReport {
  id: string;
  createdAt: string;   // ISO date
  updatedAt: string;   // ISO date

  // ── Section 1: Client Info ────────────────────────────────────────────────
  consultantName: string;        // auto-populated from logged-in user
  consultantUserId: string;      // user.id
  weekOf: string;                // ISO date string (week start)
  source: SourceType | '';
  clientName: string;
  /** Future: HubSpot contact ID for CRM lookup */
  hubspotContactId?: string;
  appointmentDate: string;       // ISO date string
  address: string;
  clientType: ClientType | '';
  appointmentType: AppointmentType | '';
  convertedToInPerson: boolean;
  convertedDate?: string;
  convertedType?: AppointmentType;
  leadSources: string[];         // multi-select: 'google', 'meta', 'home-show', etc.
  leadSourceOther?: string;
  projectTypes: string[];        // multi-select: 'pergola-attached', 'motorized-screens', etc.
  projectTypeOther?: string;

  // ── Section 2: Deal Status ────────────────────────────────────────────────
  dealStatus: DealStatus | '';
  followUpDate?: string;
  noFollowUpReason?: string;
  proposalDate?: string;
  lostReason?: string;
  closeTimeline: CloseTimeline | '';
  lastConversationSummary: string;

  // ── Section 3: Purchase Confidence ───────────────────────────────────────
  purchaseConfidencePct: number;   // 0–100 (current, editable)
  /** Locked on first submission — never changes after initial save */
  originalPcPct?: number;
  /** Estimated contract value in USD (set at first meeting, editable in pipeline) */
  estimatedContractValue?: number;
  decisionMakers: string;
  mainMotivation: string;
  mainHesitation: string;
  pcNotes: string;                 // minimum 3 sentences

  // ── Section 4: Value & Objections ────────────────────────────────────────
  financingDiscussed: boolean | null;
  financingReaction: FinancingReaction | '';
  valueCommunicated: string[];     // multi-select
  clientResponse: ClientResponse | '';
  objections: string[];            // multi-select: 'price', 'timing', etc.
  objectionOther?: string;
  objectionNotes: string;

  // ── Pipeline Tracking ─────────────────────────────────────────────────────
  /** 'open' = active, 'sold' = marked as sold, 'lost' = marked as lost */
  outcome: 'open' | 'sold' | 'lost';
  soldAt?: string;    // ISO date when marked as sold/lost
  soldBy?: string;    // consultantUserId who marked it

  // ── Section 5: Next Steps & Marketing ────────────────────────────────────
  nextActions: NextAction[];

  // ── Section 6: Progress Notes ─────────────────────────────────────────────
  progressNotes: ProgressNote[];
  nextFollowUpDate?: string;
  // Marketing feedback (required for marketing leads)
  leadQuality: LeadQuality | '';
  expectationAlignment: ExpectationAlignment | '';
  messagingReferenced: string[];   // multi-select
  messagingOther?: string;
  budgetAlignment: BudgetAlignment | '';
  marketingNotes: string;
}

export const EMPTY_REPORT = (): ClientMeetingReport => ({
  id: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  consultantName: '',
  consultantUserId: '',
  weekOf: getWeekStart(),
  source: '',
  clientName: '',
  appointmentDate: new Date().toISOString().split('T')[0],
  address: '',
  clientType: '',
  appointmentType: '',
  convertedToInPerson: false,
  leadSources: [],
  projectTypes: [],
  dealStatus: '',
  closeTimeline: '',
  lastConversationSummary: '',
  purchaseConfidencePct: 50,
  estimatedContractValue: undefined,
  originalPcPct: undefined,
  outcome: 'open',
  decisionMakers: '',
  mainMotivation: '',
  mainHesitation: '',
  pcNotes: '',
  financingDiscussed: null,
  financingReaction: '',
  valueCommunicated: [],
  clientResponse: '',
  objections: [],
  objectionNotes: '',
  nextActions: [],
  progressNotes: [],
  leadQuality: '',
  expectationAlignment: '',
  messagingReferenced: [],
  budgetAlignment: '',
  marketingNotes: '',
});

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

// ── Display labels ────────────────────────────────────────────────────────────

export const LEAD_SOURCE_OPTIONS = [
  { value: 'google', label: 'Google' },
  { value: 'meta', label: 'Meta' },
  { value: 'home-show', label: 'Home Show' },
  { value: 'sales-rep', label: 'Sales Rep' },
  { value: 'tv', label: 'TV' },
  { value: 'struxure-corp', label: 'StruXure Corp' },
  { value: 'progressive', label: 'Progressive' },
  { value: 'corradi-usa', label: 'Corradi USA' },
  { value: 'contractor-ref', label: 'Contractor Ref' },
  { value: 'client-ref', label: 'Client Ref' },
  { value: 'other', label: 'Other' },
];

export const PROJECT_TYPE_OPTIONS = [
  { value: 'pergola-attached', label: 'Pergola (Attached)' },
  { value: 'pergola-freestanding', label: 'Pergola (Freestanding)' },
  { value: 'pergotenda', label: 'Pergotenda' },
  { value: 'pavilion', label: 'Pavilion' },
  { value: 'motorized-screens', label: 'Motorized Screens' },
  { value: 'retractable-awning', label: 'Retractable Awning' },
  { value: 'umbrella', label: 'Umbrella' },
  { value: 'cabana', label: 'Cabana' },
  { value: 'deck', label: 'Deck' },
  { value: 'patio', label: 'Patio' },
  { value: 'other', label: 'Other' },
];

export const VALUE_COMMUNICATED_OPTIONS = [
  { value: 'years-in-business', label: 'Years in Business' },
  { value: 'full-service', label: 'Full-Service Design/Permit/Install' },
  { value: 'experienced-install', label: 'Experienced Install Team' },
  { value: 'permit-dept', label: 'Permit Department' },
  { value: 'showroom', label: 'Showroom Experience' },
  { value: 'stability', label: 'Stability vs Online Sellers' },
  { value: 'product-quality', label: 'Product Quality' },
];

export const OBJECTION_OPTIONS = [
  { value: 'price', label: 'Price' },
  { value: 'timing', label: 'Timing' },
  { value: 'financing', label: 'Financing' },
  { value: 'competitors', label: 'Competitors' },
  { value: 'hoa-permits', label: 'HOA/Permits' },
  { value: 'decision-maker', label: 'Decision Maker Not Present' },
  { value: 'other', label: 'Other' },
];

export const MESSAGING_OPTIONS = [
  { value: 'price-promotion', label: 'Price Promotion' },
  { value: 'financing-offer', label: 'Financing Offer' },
  { value: 'product-type', label: 'Product Type' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'other', label: 'Other' },
];

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  'working-design': 'Working on Design / Proposal',
  'proposal-presented': 'Proposal Presented/Sent',
  'actively-considering': 'Actively Considering',
  'awaiting-financing': 'Awaiting Financing',
  'waiting-design': 'Waiting on Design',
  'delayed': 'Delayed',
  'lost': 'Lost',
};
