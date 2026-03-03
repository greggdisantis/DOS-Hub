# Job Intelligence Module Design

## Overview

The Job Intelligence module analyzes open jobs from Service Fusion and calculates material readiness timelines for four product categories: StruXure, Screens, Pergotenda, and Awnings. It provides project supervisors and managers with visibility into when materials will be ready for installation.

## Data Model

### CanonicalJob
Represents a single job with all relevant fields:

**Identifiers:**
- Customer (required)
- Job Category (determines enabled products)
- Project Supervisor

**Dates:**
- Contract Signed Date
- Permit Submission Date
- Permit Estimated Approval Date
- Permit Actual Approval Date
- StruXure: Order Date
- StruXure: Estimated/Actual Material Receive Date
- Pre-Con Completed Date
- Screens: Estimated/Actual Material Receive Date
- Install Estimated Ready Month (manual override)

**Material Status & Configuration:**
- Permit Status (Permit Prep, Submitted, Hold, Variance Required, Approved, Received, Not Required, By Others)
- Permit Responsibility
- StruXure: Material Status, Square Footage, # of Zones, Material Waiver
- Screens: Material Status, Manufacturer (DOS Screens/MagnaTrack), Quantity
- Pergotenda: Material Status, Square Footage, Material Waiver
- Awning: Material Status
- Is this a combination job?

### ReadinessResult
Calculation output for each product:
- readyMonth: YYYY-MM format or null if blocked
- confidence: HARD (certain), FORECAST (estimated), BLOCKED (cannot proceed)
- sourceLabel: Human-readable source (e.g., "Material Received", "Ordered +7w", "Permit Submitted +10d +7w")
- detailTrace: Step-by-step calculation logic
- exceptions: List of issues/warnings

### ProcessedJob
Combines canonical job with readiness results for all enabled products.

## Product Category Logic

**Job Category Detection:**
- "02: master - screen only" → Screens only
- "01: master - struxure project" → StruXure (+ Screens if combination)
- "03: master - pergotenda project" → Pergotenda (+ Screens if combination)
- "04: master - awning" → Awnings only

## Readiness Calculation Rules

### StruXure & Pergotenda (Structure Products)

**Priority Order:**
1. **Manual Override**: If "Install Estimated Ready Month" is set, use it (HARD confidence)
2. **Material Received**: If status is "Received" or "Delivered", use current month (HARD)
3. **Already Ordered**: If Order Date exists, add 7 weeks (HARD)
4. **Ready to Order State**:
   - If Material Waiver is active: Use Pre-Con Completed Date + 7 weeks (HARD)
   - If Permit Submitted: Use Permit Submission Date + 10 business days + 7 weeks (HARD)
   - If Permit Approved/Received: Use Permit Approval Date + 7 weeks (HARD, exception: PERMIT_APPROVED_NOT_ORDERED)
   - If Permit Not Required/By Others: Use Pre-Con Date + 7 weeks (HARD)
   - If Permit in Prep/Hold/Variance: BLOCKED (exception: STRUCTURE_NOT_READY_TO_ORDER)
5. **Permit Status Evaluation**:
   - Permit Submitted: Submission Date + 10 business days + 7 weeks (HARD)
   - Permit Approved/Received: Approval Date + 7 weeks (HARD)
   - Permit Not Required/By Others: Pre-Con Date + 7 weeks (HARD)
   - Otherwise: BLOCKED

**Exceptions:**
- WAIVER_REQUIRES_PRECON: Material waiver active but Pre-Con date missing
- MISSING_PERMIT_SUBMISSION_DATE: Permit submitted but date missing
- MISSING_PERMIT_APPROVAL_DATE: Permit approved but date missing
- PERMIT_APPROVED_NOT_ORDERED: Permit approved but order not placed yet
- STRUCTURE_NOT_READY_TO_ORDER: Permit status blocking order

### Screens

**Lead Times:**
- DOS Screens: 3 weeks
- MagnaTrack: 7 weeks

**Logic:**
1. If combination job:
   - Depends on structure (StruXure or Pergotenda) readiness
   - Add screen lead time to structure ready month
   - Inherit confidence from structure
2. If standalone:
   - Requires Contract Signed Date
   - Contract Date + lead time weeks
   - HARD confidence

**Exceptions:**
- MISSING_CONTRACT_SIGNED_DATE: Standalone screen job but no contract date
- SCREENS_DEPEND_ON_STRUCTURE: Combination job but structure readiness cannot be determined

### Awnings

**Lead Time:** 3 weeks

**Logic:**
- Requires Contract Signed Date
- Contract Date + 3 weeks
- HARD confidence

**Exceptions:**
- MISSING_CONTRACT_SIGNED_DATE: No contract date provided

## Mobile App Architecture

### Screen Layout

**Single-page scrollable form with sections:**

1. **Job Information**
   - Customer name (text input)
   - Project Supervisor (text input)
   - Job Category (dropdown with 4 options)
   - Is this a combination job? (toggle)

2. **Permit Information**
   - Permit Status (dropdown)
   - Permit Responsibility (dropdown)
   - Permit Submission Date (date picker)
   - Permit Estimated Approval Date (date picker)
   - Permit Actual Approval Date (date picker)

3. **StruXure Configuration** (shown if enabled)
   - Material Status (dropdown)
   - Square Footage (number input)
   - # of Zones (number input)
   - Material Waiver (toggle)
   - Order Date (date picker)
   - Estimated Material Receive Date (date picker)
   - Actual Material Received Date (date picker)

4. **Screens Configuration** (shown if enabled)
   - Material Status (dropdown)
   - Manufacturer (dropdown: DOS Screens / MagnaTrack)
   - Quantity (number input)
   - Estimated Material Receive Date (date picker)
   - Actual Material Received Date (date picker)

5. **Pergotenda Configuration** (shown if enabled)
   - Material Status (dropdown)
   - Square Footage (number input)
   - Material Waiver (toggle)
   - Order Date (date picker)
   - Estimated Material Receive Date (date picker)
   - Actual Material Received Date (date picker)

6. **Awning Configuration** (shown if enabled)
   - Material Status (dropdown)

7. **Pre-Con & Contract Dates**
   - Pre-Con Completed Date (date picker)
   - Contract Signed Date (date picker)
   - Install Estimated Ready Month (date picker, manual override)

8. **Readiness Results** (read-only, auto-calculated)
   - For each enabled product: Ready Month, Confidence, Source Label, Detail Trace
   - Visual indicators: HARD (green), FORECAST (yellow), BLOCKED (red)
   - Expandable exception list

### Form Behavior

- **Dynamic visibility**: Sections appear/disappear based on Job Category and combination job toggle
- **Real-time calculation**: Readiness results update as user inputs data
- **Validation warnings**: Highlight missing required dates for active products
- **Save/Load**: Persist jobs to database with revision tracking
- **PDF Export**: Generate professional report with all job details and readiness analysis

## PDF Export Format

**Page 1: Job Summary**
- Header: Customer name, Project Supervisor, Job Category
- Job Information: All basic fields
- Permit Information: Status, responsibility, key dates

**Page 2+: Product Readiness Details** (one per enabled product)
- Product name & configuration
- Material status & key dates
- Readiness calculation result (ready month, confidence, source)
- Detailed trace of calculation logic
- Exceptions/warnings list

**Final Page: Calculation Summary**
- All products with their readiness status
- Visual status bar (HARD/FORECAST/BLOCKED breakdown)
- Export timestamp

## Integration Points

1. **Order Management**: Jobs link to orders in the database
2. **User Authentication**: Job supervisor field auto-populated from logged-in user
3. **Manager Dashboard**: Recent jobs and readiness summary displayed
4. **Revision History**: Track changes to job data over time
5. **Audit Trail**: Log all modifications with user and timestamp

## Success Criteria

- All calculation logic matches original Google AI Studio implementation
- Form supports all 4 product categories with proper visibility rules
- Readiness calculations produce correct results for test cases
- PDF export is professional and readable
- Save/load functionality preserves all job data
- Performance is smooth on mobile devices
- No TypeScript errors or console warnings
