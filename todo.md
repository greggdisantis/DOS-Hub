# DOS Hub Mobile App — TODO

- [x] Configure theme colors (navy blue brand palette)
- [x] Set up tab bar navigation (Home, Tools, Projects, Profile)
- [x] Add icon mappings for all tabs in icon-symbol.tsx
- [x] Build Home screen (Hub Dashboard) with greeting, quick actions, and module cards
- [x] Build Tools screen with searchable grid of tool modules
- [x] Build Projects screen with project list and search/filter
- [x] Build Profile/Settings screen with user info and preferences
- [x] Create placeholder screens for Motorized Screens module
- [x] Create placeholder screens for Zoning Lookup module
- [x] Create placeholder screens for Training module
- [x] Create placeholder screens for Receipt Capture module
- [x] Create placeholder screens for Service Fusion Intelligence module
- [x] Create placeholder screens for HubSpot Integration module
- [x] Generate custom app logo
- [x] Update app.config.ts with branding info (appName, logoUrl)
- [x] Set up database schema for multi-tenancy (companies, branding)
- [ ] Implement dynamic branding engine (load company colors/logo on login) — deferred to next phase
- [ ] Consider server keep-alive strategy instead of auto-wake (prevent hibernation)
- [x] Implement Screen Ordering module — product configuration (dimensions, fabric, motor, housing)
- [x] Implement Screen Ordering module — structural calculations engine
- [x] Implement Screen Ordering module — multi-line order management (add/remove lines)
- [x] Implement Screen Ordering module — order summary review
- [x] Implement Screen Ordering module — PDF quote generation
- [x] Screen Ordering: Add Project Info section (Project Name, Date, Job Number, Address, Submitter)
- [x] Screen Ordering: Add Global Selections section (manufacturer, total screens, motor type)
- [x] Screen Ordering: Add "All Colors Same?" toggle with global screen material and frame color pickers
- [x] Screen Ordering: Rebuild per-screen config as single scrollable form (description, mount, motor side, remote)
- [x] Screen Ordering: Add 9-point measurement grid with whole number + fraction inputs (LEFT/RIGHT/HORIZONTAL columns)
- [x] Screen Ordering: Add "Reverse measurements?" toggle
- [x] Screen Ordering: Add # of Cuts and Special Instructions fields
- [x] Screen Ordering: Add Photos & Attachments section (measurement photos per screen)
- [x] Screen Ordering: Add Output Summary section with calculation results and warnings/flags
- [x] Screen Ordering: Add Export to PDF and Preview Screen PDF buttons
- [x] Screen Ordering: Global Selections — add Total # of Screens as dropdown (1–20)
- [x] Screen Ordering: Global Selections — add Input Units dropdown (Inches + 1/16")
- [x] Screen Ordering: Global Selections — add Motor Type (Global) dropdown per manufacturer
- [x] Screen Ordering: Global Selections — add "All Screen Material & Frame Colors the Same?" Yes/No toggle
- [x] Screen Ordering: Global Selections — when "Yes", show global Screen Material (Type, Series, Color) and Frame (Collection, Color) pickers
- [x] Screen Ordering: Global Selections — propagate global selections to all screens
- [x] Screen Ordering: Per-Screen — move Screen Material & Frame out when allSame=Yes
- [x] Screen Ordering: Per-Screen — Remote dropdown depends on global Motor Type
- [x] Screen Ordering: Per-Screen — Install Mount / Motor Side / Remote in one row
- [x] Screen Ordering: Per-Screen — inline side-check warning under LEFT/RIGHT measurement columns
- [x] Screen Ordering: Implement PDF export — HTML template with project info, global selections, per-screen details
- [x] Screen Ordering: PDF export — include raw measurements table per screen
- [x] Screen Ordering: PDF export — include calculated results and warnings per screen
- [x] Screen Ordering: PDF export — include materials (screen type, color, frame) per screen
- [x] Screen Ordering: PDF export — add Export to PDF button in the module UI
- [x] Screen Ordering: PDF export — use expo-print for native and window.print fallback for web
- [x] Screen Ordering: Replace single "Export to PDF" button with "Preview PDF" button
- [x] Screen Ordering: Create full-screen PDF preview screen with HTML WebView
- [x] Screen Ordering: Add "Export" button in preview (saves PDF to Downloads via jsPDF)
- [x] Screen Ordering: Add "Print" button in preview (opens system print dialog)
- [x] Screen Ordering: Preview screen has back navigation to return to form
- [x] Screen Ordering: Add photo upload per screen (image picker from camera/gallery)
- [x] Screen Ordering: Store photo URIs and base64 in ScreenConfig state
- [x] Screen Ordering: Display photo thumbnails in each screen card with remove option
- [x] Screen Ordering: PDF — each screen on its own page with clear SCREEN #N badge label
- [x] Screen Ordering: PDF — include uploaded photos on page(s) following each screen's data
- [x] Screen Ordering: PDF — professional formatting matching original DOS form layout
- [x] BUG: PDF preview screen not rendering HTML content — fixed by removing jspdf/html2canvas (Metro incompatible)
- [x] BUG: PDF second page (Raw Measurements + Calc Summary) missing SCREEN #N label at top — fixed with running page header and condensed layout
- [x] Auth: User login via Manus OAuth (email/password handled by OAuth portal)
- [x] Auth: New users start as "pending" until admin approves
- [x] Auth: Admin approval workflow — AuthGuard blocks unapproved users
- [x] Auth: Role-based permissions — Admin, Manager, Technician (+ pending)
- [x] Auth: AuthGuard component with login prompt, pending screen, role checks
- [x] Auth: Profile screen shows role badge, approval status, sign out
- [x] Auth: Redirect unapproved users to "Pending Approval" screen via AuthGuard
- [x] Admin: User management panel — view all users, approve/reject, set roles
- [x] Orders: Save screen orders to database linked to user account (tRPC API)
- [x] Orders: Load saved orders from database (tRPC API)
- [x] Orders: List view of saved orders (My Orders for all, All Orders for managers/admins)
- [x] Orders: Manager can view and adjust any order + change status
- [x] Orders: Audit trail — every update creates a revision record preserving the original
- [x] Orders: View revision history for any order with PDF preview per revision
- [x] Dashboard: Server-side analytics API — order counts by status, orders per technician, revision counts
- [x] Dashboard: Manager Dashboard screen — summary stat cards (total orders, pending, approved, completed)
- [x] Dashboard: Order status breakdown with visual bar chart
- [x] Dashboard: Technician performance table (name, order count, screens, completion %, revisions)
- [x] Dashboard: Recent activity feed (latest orders with status pills, tap to view detail)
- [x] Dashboard: Access from Home tab quick actions + module card, and Profile settings for managers/admins
- [x] Dashboard: Quick action buttons to View All Orders and Manage Users
- [x] BUG: Admin panel Approve/Reject/Change Role buttons not responding — fixed with TouchableOpacity + Modal role picker (web-compatible)

## Job Intelligence Module (New)

- [x] Analyze Google AI Studio source files and extract calculation logic
- [x] Design module architecture and data model
- [x] Implement core types, constants, and enums
- [x] Create date utility functions (business days, week calculations, formatting)
- [x] Implement readiness calculation engine with all 4 product categories
- [x] Build job input form with dynamic sections based on job category
- [x] Implement real-time readiness calculation and visualization
- [x] Create professional PDF export with detailed calculation traces
- [x] Implement database service for save/load/delete operations
- [x] Create comprehensive unit tests (18 tests, all passing)
- [x] Write module documentation and README
- [ ] Integrate with manager dashboard for readiness summary
- [ ] Add Excel import functionality for Service Fusion exports
- [ ] Implement native date picker for better mobile UX
- [ ] Add job filtering and search capabilities
- [ ] Create revision history tracking for job modifications
- [ ] Add push notifications for job readiness milestones


## Job Intelligence Module - REBUILD (File Upload Version)

- [x] Analyze Service Fusion Excel format and column mappings
- [x] Build Excel file upload component with file picker
- [x] Implement Excel parser to extract job data from Service Fusion exports
- [x] Create batch job processing engine (process all jobs in file)
- [x] Implement readiness calculations for each job
- [x] Create results table with job data and readiness status
- [ ] Add filtering by job category, status, readiness level
- [ ] Add sorting by customer, ready date, status
- [x] Create CSV export for full report with all jobs
- [ ] Test with Service Fusion sample file
- [ ] Fix any calculation discrepancies vs Google AI Studio


## Job Intelligence - Report Views (In-App Display + PDF Export)

- [x] Design report data filtering and aggregation logic
- [x] Create tab-based report navigation component
- [x] Implement Final Report view with all jobs
- [x] Implement Blocked Report view (jobs with blocked products)
- [x] Implement Permit Date List view (permit-related jobs)
- [x] Implement Permit Status view (grouped by permit status)
- [x] Implement Material Status view (grouped by material status)
- [x] Implement Supervisor Workload view (jobs by supervisor)
- [x] Implement StruXure report view (product-specific)
- [x] Implement Screens report view (product-specific)
- [x] Implement Pergotenda report view (product-specific)
- [x] Implement Awnings report view (product-specific)
- [x] Implement DOS & MagnaTrack Installation view
- [x] Implement Exceptions report view (error/blocked jobs)
- [x] Add PDF export button for each report
- [x] Create professional PDF styling matching Excel exports
- [x] Test all reports with Service Fusion sample file
- [x] Redesign all reports with grouped layouts matching reference PDFs (month-grouped, supervisor-grouped, material status, permit status)
- [x] Fix permit status report not producing data (permitStatus field not passing through pipeline)
- [x] Add dropdown menu for report selection replacing horizontal tab navigation
- [x] Fix PDF export filename format: Service Fusion _ Project Reporting _ [Report Name] _ MM-DD-YYYY
- [x] Fix PDF export on web: auto-download to Downloads folder with correct filename instead of print dialog
- [x] Update PDF export to use grouped layouts matching on-screen display (month-grouped, supervisor-grouped, status-grouped)
- [x] Fix PDF export to actually save/download (study Google AI Studio working implementation)
- [x] Fix PDF export producing empty file (html2canvas cannot capture off-screen div at -9999px)
- [x] Fix PDF export still blank — now captures actual visible report DOM element (same as Google AI Studio approach)
- [x] Fix column headers running together (ZONESSUPERVISOR, QTYMANUFACTURER) — added gap:10 between columns
- [x] Fix text being cut off in all product reports — increased lineHeight, minHeight, paddingVertical
- [x] Fix ZONES and SF columns to be center-aligned instead of right-aligned
- [x] Fix text descenders being clipped in PDF export (overflow:visible, line-height:1.5 override)
- [x] Improve html2pdf capture quality (scale:3, letterRendering, quality:0.98)

## Client Meeting Report Module

- [x] Design data model for ClientMeetingReport (all fields from ConsultantWeeklyClientReport_V1.docx)
- [x] Build multi-step form wizard (5 sections: Client Info, Deal Status, Purchase Confidence, Value/Objections, Next Steps + Marketing)
- [x] Build reports list screen per salesperson (My Projects view)
- [x] Wire up tab/module navigation for the new module
- [x] Persist reports locally with AsyncStorage
- [x] Add HubSpot CRM integration placeholder (client picker stub for future)
- [x] Add PDF export for completed meeting reports

## Sales Pipeline & PC% Accuracy Tracking

- [x] Add estimatedContractValue field to ClientMeetingReport data model
- [x] Add originalPcPct field (locked on first submission, never editable)
- [x] Add currentPcPct field (editable in dashboard)
- [x] Add soldAt timestamp and soldBy fields for Mark as Sold
- [x] Add outcome field: 'open' | 'sold' | 'lost'
- [x] Add Estimated Contract Value input to form PC% section
- [x] Lock originalPcPct on first save (copy from purchaseConfidencePct)
- [x] Build Sales Pipeline dashboard screen (list: client, consultant, est. value, original PC%, current PC%, status)
- [x] Inline editing of currentPcPct and estimatedContractValue in pipeline dashboard
- [x] Mark as Sold button per client in pipeline dashboard (records outcome + soldAt)
- [x] Mark as Lost button per client in pipeline dashboard
- [x] Add PC% accuracy analytics section: original vs final vs outcome per consultant
- [x] Add pipeline summary stats: total pipeline value, weighted value (value × PC%), sold count, conversion rate
- [x] Wire Sales Pipeline to Tools tab and/or Home quick actions

## Dashboard Module Picker & Sales Pipeline Fixes

- [x] Move Sales Pipeline into Dashboard screen with module picker (Screen Ordering + Sales Pipeline, more to come)
- [x] Fix Sales Pipeline: reports with no `outcome` field (legacy data) should default to 'open' not show as 'lost'
- [x] Fix Sales Pipeline: summary stats bar not counting open reports (same root cause as above)
- [x] Fix Sales Pipeline: Reopen button not working
- [x] Fix Sales Pipeline: inline PC% and Est. Value editing directly on the row (no modal needed)
- [x] Fix Client Meeting Report: PDF export should be direct download button "EXPORT TO PDF", not share/print dialog

## Dashboard & User Management

- [x] Fix Dashboard module picker: tabs are oversized when Sales Pipeline is active (ScreenContainer nesting issue)
- [x] Extract SalesPipelineContent component (no ScreenContainer) for embedding in Dashboard
- [x] User Management: add multi-role assignment (up to 17 roles per user) with checkboxes
- [x] User Management: add permissions panel per user (module-level access toggles)
- [x] User Management: store roles and permissions in database (server-side)
- [x] Fix PDF export in Client Meeting Report (direct download, not print dialog)

## Dashboard & Pipeline Fixes (Round 2)

- [x] Fix Dashboard module picker: tabs still oversized (ScrollView flex expanding to full height)
- [x] Fix User Management: new multi-role/permissions UI not rendering (still shows old Change Role button)
- [x] Add Edit button to each Sales Pipeline row (navigate to Client Meeting Report form for that report)

## RBAC System Roles & Module Permissions

- [x] Update system role enum: pending | guest | member | manager | admin
- [x] Add module_permissions table: module_key → allowed job roles (JSON array)
- [x] Server: approveUser procedure (Admin only — changes pending → member/guest)
- [x] Server: getModulePermissions / setModulePermissions procedures (Owner only)
- [x] Server: enforce role middleware (pending users blocked from all modules)
- [x] Hook: useSystemRole — returns current user's system role
- [x] Hook: useModuleAccess(moduleKey) — returns whether current user can access a module
- [x] Hook: useCanEdit — false for Guest
- [x] Hook: useCanExport — false for Guest
- [x] User Management: show system role badge (Pending/Guest/Member/Manager/Admin)
- [x] User Management: Pending users show "Approve" button (Admin only)
- [x] User Management: Approve flow lets Admin pick new role (Guest/Member/Manager)
- [x] Module Permissions tab: Owner-only tab in admin area
- [x] Module Permissions tab: list all DOS Hub modules with job role multi-select per module
- [x] Module Permissions tab: Owner job role always has access to all modules
- [x] Enforce RBAC: Pending users see "Access Pending" screen on login
- [x] Enforce RBAC: Guest users cannot save work (save buttons hidden/disabled)
- [x] Enforce RBAC: Guest users cannot export files (export buttons hidden)
- [x] Enforce RBAC: Guest users cannot see dashboard data or run reports
- [x] Enforce RBAC: Guest/Pending users cannot access Settings or Admin
- [x] Enforce RBAC: Team Member sees only their own data in lists
- [x] Enforce RBAC: Team Member soft-delete goes to deleted bin (Manager/Admin can purge)
- [x] Enforce RBAC: Manager can see and edit all team members' work

## Name Registration & Auto-fill

- [x] Add firstName and lastName columns to users table in DB
- [x] Add updateUserName server procedure
- [x] Build name collection onboarding screen (shown after first login if name is missing)
- [x] Name screen: require first name + last name before proceeding to app
- [x] Store full name as firstName + lastName in DB, combine as displayName
- [x] Auto-fill consultant name in Client Meeting Report from user profile
- [x] Auto-fill submitter name in Screen Ordering from user profile
- [ ] Auto-fill submitter name in Receipt Capture from user profile
- [ ] Auto-fill user name in any other module that asks for a name

## Name Screen Fix

- [x] Fix name collection screen: Continue button does nothing when tapped (root cause: buildUserResponse missing firstName/lastName + native cache not updated on success)

## Home Screen & Navigation Updates

- [x] Add Client Meeting Report to home screen modules grid
- [x] Rename "New Order" quick action to "Screen Ordering"
- [x] Remove unused "Projects" tab from bottom tab bar

## Receipt Capture Module (Full Build)

- [x] Update receipts DB schema: add lineItems (JSON), overheadCategory, receiptImageBase64, receiptImageMimeType, fileName columns
- [x] Add server tRPC procedures: receipts.create, receipts.list, receipts.get, receipts.delete, receipts.analyzeImage
- [x] Add db.ts helpers for receipts CRUD
- [x] Build receipt capture form: image upload/camera, AI analysis, review & confirm
- [x] Auto-fill submitter name from logged-in user profile
- [x] Receipt Classification: Job Receipt vs Overhead/General with conditional fields
- [x] Line items editor: add/edit/delete rows with description, qty, unit price, total
- [x] Vendor & Date section with AI-extracted editable fields
- [x] Material Class dropdown (Screens, Electrical, Miscellaneous, Fuel, Tools)
- [x] Overhead Category dropdown (Office Supplies, Tools & Equipment, Marketing, etc.)
- [x] Totals section: subtotal, tax, total
- [x] Save receipt to database with receipt image stored in S3
- [x] Generate filename: VendorName_D-M-YYYY_HHmmss
- [x] PDF export per receipt: page 1 = summary (DOS header, classification, vendor, line items, totals), page 2 = original receipt image
- [x] Receipt Dashboard: date-grouped file-system view (admin sees all, members see own)
- [x] Dashboard rows: vendor, user, amount, date, PDF export button
- [x] Dashboard filters: by user, date range, vendor name
- [x] Dashboard analytics: total spend by user, by vendor, by category, monthly trend, top vendors

## Sales Pipeline PDF & CMR Reports View

- [x] Add server-side PDF generation for Client Meeting Reports (pdfkit, matching DOS format)
- [x] Add PDF export button to each Sales Pipeline card (same style as Receipts PDF button)
- [x] Add "CMR Reports" tab to Dashboard: Admin/Manager sees ALL CMRs organized by user/month
- [x] Reports tab: filters by user, date range, est. value range, PC%, outcome status
- [x] Reports tab: Guest/Member sees only their own reports with same filters
- [x] Reports tab: each row shows client name, consultant, date, PC%, est. value, status, PDF button

## CMR Reports Dashboard Fixes

- [x] Add cmr_reports table to DB schema (sync from AsyncStorage)
- [x] Add server tRPC procedures: cmr.save, cmr.listAll (admin), cmr.listMine
- [x] Sync CMR saves to server DB (write-through when user saves a report)
- [x] CMR Reports dashboard: load from server so admin sees all users' reports
- [x] CMR Reports dashboard: pull consultant list from users table (not derived from reports)
- [x] CMR Reports dashboard: replace date text inputs with native calendar date picker

## UI Visibility & Layout Fixes
- [x] Fix white-on-white input fields: apply theme foreground text color and surface/border backgrounds across all modules
- [x] Fix Screen Ordering measurement grid: reformat 3-column table to avoid horizontal overflow on mobile

## CMR Dashboard Fixes (Round 2)
- [x] Save CMR reports to database (not just AsyncStorage) so Admin/Manager can see all users' reports
- [x] Replace date text input boxes in CMR dashboard filters with native date picker
- [x] Pull consultant/user list from users table for CMR dashboard filter (not derived from reports)

## CMR Dashboard Empty Fix (Round 3)
- [x] Diagnose why CMR dashboard shows empty even after new saves
- [x] Add backfill: sync existing AsyncStorage CMR reports to database on first load
- [x] Ensure CMR dashboard refreshes immediately after a new report is saved

## CMR Dashboard Filter & Fallback Fixes (Round 4)
- [x] Fix date picker in CMR filter modal: use web-compatible HTML date input on web, native picker on mobile
- [x] Fix Est. Value range inputs: make them editable text inputs (not read-only)
- [x] CMR dashboard: merge AsyncStorage reports with DB reports so data shows immediately without needing to open CMR module first

## CMR Dashboard Data Source & Date Picker (Round 5)
- [x] Investigate how Sales Pipeline gets its data and make CMR Reports use the same source
- [x] Replace date text inputs with HTML native date picker on web

## CMR Proper Database Fix (Round 6)
- [x] Audit CMR save flow — find why reports never reach the database
- [x] Fix CMR save to reliably write to database on every save
- [x] CMR dashboard reads only from database (remove AsyncStorage fallback)

## Full Database Migration Audit (Round 7)

### Already using database correctly
- [x] Screen Ordering — reads/writes via trpc.orders (database)
- [x] Order Review — reads/writes via trpc.orders (database)
- [x] Order Detail — reads/writes via trpc.orders (database)
- [x] Receipt Capture — reads/writes via trpc.receipts (database)
- [x] Receipt Dashboard — reads/writes via trpc.receipts (database)
- [x] Admin Users — reads/writes via trpc.users (database)
- [x] Module Permissions — reads/writes via trpc.modulePermissions (database)
- [x] Dashboard Stats — reads via trpc.dashboard.stats (database)

### Database migration completed
- [x] Sales Pipeline — now reads/writes via trpc.cmr (database), AsyncStorage is write-through cache only
- [x] CMR Reports (save) — database is now primary write target; AsyncStorage is fallback cache
- [x] CMR Reports (dashboard) — AsyncStorage fallback removed; reads only from database
- [x] CMR module list view — now loads from database via trpc.cmr.list; Sync button removed (auto-sync on every save)

## Receipt Capture Bug Fix

- [x] Fix delete button in Receipt Capture — root cause was receipts.delete endpoint requiring admin role only; now allows admins/managers to delete any receipt and members to delete their own

## Auth / Login Bug Fix

- [ ] Fix infinite loading spinner after OAuth sign-in — new users get stuck on blank white screen with spinner and never reach pending approval or home screen

## Job Intelligence PDF Export Bug

- [x] Fix PDF export button — root cause was incorrect html2pdf.js API usage (calling as function instead of constructor); now properly generates and downloads PDF with error display

## OAuth Callback Bug Fix

- [x] Fix "OAuth callback failed" error — root cause was database connection pool exhaustion (ECONNRESET); fixed with proper connection pool configuration and retry logic on transient errors

## Project Material Delivery Module

- [x] Design data model and database schema (checklist, inventory items, status, audit trail)
- [x] Create tRPC endpoints (create, list, get, update, updateStatus, addAuditEntry, uploadFile)
- [x] Build Project Info screen (project name, client, location, supervisor dropdown, created by auto-fill)
- [x] Build Boxed Items inventory screen (PVC, screen screws, ledger locks, wedge anchors, foam tape, caulk/sealants, LED lights, notes)
- [x] Build Time of Delivery Pulled Items screen (fans, PVC pipe, AZEK, wire, misc, notes)
- [x] Build Project Specific Items screen (heaters, other items, notes)
- [x] Build preview/summary screens for each inventory section
- [x] Implement full status workflow (Draft → Ready for Supervisor → Awaiting Main Office → Awaiting Warehouse → Final Review → Complete → Closed)
- [x] Build Project Material Delivery dashboard with status columns and filters
- [x] Implement warehouse checklist view with item check-off boxes
- [x] File uploads for purchase order PDFs and delivery photos (materials loaded / delivered)
- [x] Audit trail tracking who did what at each stage
- [x] Add module to home screen and register permissions
- [x] Add "Project Material Delivery" tab to Dashboard screen

## Push Notifications — Material Delivery

- [x] Read server README and notification docs to understand existing push infrastructure
- [x] Store Expo push tokens per user in the database (expoPushToken column on users table)
- [x] Build usePushNotifications hook — requests permission and registers token on server
- [x] Wire hook into tabs layout so token registers on first authenticated app open
- [x] Build server-side sendPushNotifications utility using Expo Push API
- [x] Send notification to Project Supervisor when status changes to "ready_for_supervisor"
- [x] Send notification to Warehouse Manager when status changes to "awaiting_warehouse"
- [x] Send notification to admins/managers for all other status transitions (awaiting_main_office, final_review, complete)
- [x] Wire notification sending into the projectMaterial.updateStatus tRPC endpoint

## Push Notifications — CMR Reports & Screen Orders

- [x] Add getManagersAndAdminsWithPushToken DB helper
- [x] Add getUserPushToken DB helper
- [x] CMR Reports: notify all managers/admins when a new report is submitted (not on updates)
- [x] Screen Orders: notify all managers/admins when a new order is created
- [x] Screen Orders: notify the order owner when a manager/admin changes the status (approved, rejected, completed)

## Notification Preferences Screen

- [x] Add notificationPrefs JSON column to users table in database
- [x] Add tRPC endpoint to get and save notification preferences per user
- [x] Build notification preferences screen with toggles for each notification type
- [x] Wire preferences into push notification senders (skip opted-out users)
- [x] Link preferences screen from Profile tab

## In-App Notification Badge

- [x] Create notifications table in database (id, userId, title, body, type, isRead, createdAt)
- [x] Add tRPC endpoints: list notifications, unread count, mark as read, mark all as read, delete, get/update prefs
- [x] Store notifications in DB when push notifications are sent (notifyUsers helper)
- [x] Add unread count badge on Profile tab bar icon (polls every 30s)
- [x] Build in-app notification center screen (list, tap to mark read, swipe-delete, pull-to-refresh)
- [x] Link notification center from Profile tab settings
- [x] Add database migration safeguard: fix 0003_brainy_umar.sql to use TiDB-compatible JSON syntax (no DEFAULT)
- [ ] Fix onboarding: users.updateName tRPC endpoint properly saves firstName/lastName
- [x] Fix approved/role fields returned from /api/auth/me endpoint
- [ ] Test Google OAuth login on deployed site
- [x] Fix extra tab bar items: module screens inside (tabs)/modules/ are being auto-registered as tabs by Expo Router
- [x] Reorganize Tools screen into categories: Utilities, Sales, Training, Administration
- [x] Rename CMR module to "My Client Meeting Reports" and filter to show only current user's own reports
- [x] Fix Sales Pipeline PDF export button (currently broken)
- [x] Reorganize Home screen: correct quick actions order (Dashboard, Job Intelligence, CMR, Material Delivery) and category-grouped modules (Utilities, Sales, Training, Administration)
- [x] Add "Motorized Screens" section heading above Orders in screen ordering module; restructure for future order types (StruXure, etc.)
- [x] Fix Delete Receipt button in receipt capture — replaced Alert.alert (broken on web) with inline confirm UI
- [x] Add User Management to Administration category in Home and Tools screens
- [ ] Fix infinite loading spinner after OAuth sign-in for new users

## Receipt Archive Feature

- [x] Add `archived` boolean column to receipts table in DB schema
- [x] Add `receipts.archive` tRPC endpoint (admin/manager only)
- [x] Add `receipts.listArchived` tRPC endpoint with same filters as list
- [x] Update `receipts.list` to exclude archived receipts by default
- [x] Update `receipts.analytics` to include archived receipts in totals
- [x] Add "Receipt Processed" button in receipt detail sheet (admin/manager only, inline confirm)
- [x] Add "Archive" view tab in receipt dashboard (Files / Archive / Analytics)
- [x] Archive view: date-grouped layout matching main Files view
- [x] Archive view: filter panel (same filters as Files view)
- [x] Archive view: allow un-archiving a receipt (admin/manager only) — "Restore to Active" button


## Auto-Wake Health Check System (REMOVED)

- [x] Attempted auto-wake implementation for web
- [x] Discovered auto-wake causes excessive reloads on web browsers
- [x] Disabled auto-wake feature (not suitable for web)
- Note: Auto-wake is better suited for native mobile apps with controlled lifecycle

## Manual Refresh Button (New)

- [x] Create server status check utility
- [x] Add refresh button to home screen (circular refresh icon in header)
- [x] Test refresh functionality (all 111 tests passing)

## Material Delivery Module — Full Redesign

### Line Item Editing (Boxed Items, Delivery Items, Project Items)
- [x] Add "Add Line Item" button per section in all 3 tabs
- [x] Add "Delete" button per individual line item in all 3 tabs
- [x] Redesign item row layout — compact, clearly labeled fields (name + qty side by side with labels)
- [x] Redesign LED lights / Fan / Heater toggles — more visible, clearly labeled on/off state

### Misc UI Fixes
- [x] Move Current Status to top of page next to project name
- [x] Move "Submit to" button to top of page next to project name
- [x] Fix back button — should go to Material Delivery module list, not home page
- [x] Allow managers/admins to move status backwards

### Warehouse Tab
- [x] Hide Warehouse tab until checklist reaches "Awaiting Warehouse" stage

### Awaiting Warehouse Stage
- [x] Replace tabbed layout with single scrolling list
- [x] Show section headers: Info, Boxed Items, Delivery Items, Project Items
- [x] Boxed Items: show Qty Needed (locked) and Qty Boxed (editable)
- [x] Delivery Items: fully locked
- [x] Project Items: item name and qty locked, warehouse notes editable per item

### Final Review Needed Stage
- [x] Make all fields editable
- [x] Show combination of Qty Needed and Qty Pulled
- [x] Add multiple PO PDF upload (office uploads PO PDFs, stored on server)
- [x] Status advances to "Checklist Complete" after office review

### Checklist Complete Stage
- [x] Lock all selections
- [x] Add "Loaded" checkbox per item (except Boxed Items section)
- [x] Add "Delivered" checkbox per item (except Boxed Items section)
- [x] Boxed Items: single "Loaded" and "Delivered" checkbox at section header level only
- [x] Add Loading Photos tab (camera + upload)
- [x] Add Delivery Photos tab (camera + upload)
- [x] Status advances to "Closed" when complete

### Closed Stage
- [x] Generate combined PDF: full checklist + all PO PDFs + loading/delivery photos
- [x] All fields locked

### General
- [x] Add PDF button on Material Delivery tool (generates PDF of current checklist at any stage)
- [x] Database schema already had all needed fields (warehouse notes, loaded/delivered flags, PO attachments, photos)

## Material Delivery Bug Fixes (Reported 3/3/2026)

- [x] PDF button does nothing — fixed: on web opens PDF in new tab, on native opens in browser
- [x] Fan toggle does not work — fixed: DeliveryItemsForm was hardcoded readOnly=true, now uses isEditable
- [x] No way to change status to a previous status — added backward status revert buttons for managers/admins
- [x] Add DELETE checklist button (managers/admins only) with inline confirmation
- [x] Add/delete line items — added dynamic line items to Misc (Delivery Items) and Other Items (Project Specific Items)
- [x] "Waiting on Supervisor" status — supervisors can now edit all fields at their stage
- [x] Add Photos button does nothing — fixed: replaced Alert.alert multi-button with inline picker card (web-compatible)
- [x] Add PO PDF button opens file picker but does not save — fixed: web uses hidden <input type="file">, native uses DocumentPicker

## Material Delivery PDF Logo (Reported 3/3/2026)

- [x] Add Distinctive Outdoor Structures logo to Material Delivery Checklist PDF header
- [x] Fix status text being cut off in PDF header

## Materials Loaded/Delivered Checkoff Logging (Reported 3/3/2026)

- [x] Add materialsLoadedByName, materialsLoadedAt, materialsDeliveredByName, materialsDeliveredAt fields to DB schema
- [x] Update server router to record who/when checked off Materials Loaded and Delivered
- [x] Update detail screen to display who/when checked off each field
- [x] Show loaded/delivered checkoff info (name + timestamp) in PDF

## Material Delivery Archive Feature (Reported 3/3/2026)

- [x] Add archived boolean + archivedAt + archivedByName fields to project_material_checklists DB table
- [x] Add archive/unarchive endpoints to server router
- [x] Show Archive button on closed checklist cards in the list screen (managers/admins only)
- [x] Add Archived tab/filter to the list screen
- [x] Show Unarchive button on archived checklist cards

## Material Delivery List Screen Improvements (Reported 3/3/2026)

- [x] Bolder/colored status badges on checklist cards (solid fill instead of outline)
- [x] Quick status change from list screen (tap status badge, managers/admins only)
- [x] Archive button on closed cards (managers/admins only), Archived tab, Unarchive button

## Upload Bugs (Reported 3/3/2026)

- [ ] Photos do not attach after selecting from camera/library
- [ ] PO PDFs do not attach after selecting a file

## PDF & Upload Fixes (Reported 3/3/2026)

- [x] Fix DOS logo not loading in PDF (wrong file path in server — now uses process.cwd())
- [x] Fix photo/PDF upload failing on mobile (EXPO_PUBLIC_API_URL → EXPO_PUBLIC_API_BASE_URL)

## PDF Fixes Round 2 (Reported 3/3/2026)

- [x] Replace blank logo box in PDF header with "Distinctive Outdoor Structures" text
- [x] Fix PO attachment layout overlap in PDF (text overlapping due to rect/y positioning bug)
- [x] Include loading photos and delivery photos in the generated PDF
- [x] Add Save PDF button directly on each checklist card in the list screen

## Remove Photo / Remove PO PDF (Reported 3/4/2026)

- [x] Add "Remove" button on each photo thumbnail in Photos tab (loading and delivery photos)
- [x] Add "Remove" button on each PO PDF row in PO Files tab
- [x] Simplify PDF header logo to plain "Distinctive Outdoor Structures" text only (no box, no tagline)

## Preconstruction Checklist Module (New - 3/4/2026)

- [x] Add preconstruction_checklists DB table to drizzle schema
- [x] Add server endpoints: create, get, list, update, delete, generatePdf
- [x] Build Preconstruction list screen (saved by date + supervisor, searchable)
- [x] Build Preconstruction form - Section 1: Project Info (name, address, supervisor)
- [x] Build Preconstruction form - Section 2: StruXure Details (zones, control box, sensors, accessories with qty/location)
- [x] Build Preconstruction form - Section 3: Decorative Features (Y/N toggles for post bases, capitals, wraps, cornices, TRAX, LED strips)
- [x] Build Preconstruction form - Section 4: Pergola Review (location, height, slope, drain lines, wire diagram, wire footage)
- [x] Build Preconstruction form - Section 5: Client Expectations (construction time, aluminum shavings, minor leaks, contract changes, addendums)
- [x] Build Preconstruction form - Section 6: Photos Taken checklist
- [x] Build Preconstruction form - Section 7: Materials Needed (ledger board, downspout, J-channel, flashing, deck blocking, wire types)
- [x] Build Preconstruction form - Section 8: Work Items (Electrical, Footings, Patio Alterations, Deck Alterations, House Gutter Alterations - each with needed/cost/addendum/responsible party/contractor/scope)
- [x] Build Preconstruction form - Section 9: Project Notes + Client Remarks
- [x] Build Preconstruction form - Section 10: Signatures (supervisor + up to 2 client signatures with name/date + digital signature pad)
- [x] Build PDF export matching original DOS form layout
- [x] Add module card to Tools screen
- [x] Add navigation routes for list and detail/form screens

## Bug Fixes (3/4/2026)

- [x] BUG: Precon Checklist "Create & Open" button does nothing when pressed — fixed nested TouchableOpacity + navigation format
- [x] BUG: Precon Checklist "Create & Open" still does nothing when logged in — rebuilt as direct + New → create → navigate flow (no inline form)
- [x] BUG: Sign In button redirects to oauth.manus.im which cannot be resolved — fixed by overriding portal URL to https://manus.im

## Preconstruction Checklist Improvements (3/4/2026)

- [x] Add Preconstruction Checklist to Home screen quick actions
- [x] Add Preconstruction Checklist tab to the Dashboard screen
- [x] Dashboard tab: filter by supervisor and by checklist status
- [x] Dashboard tab: PDF button on each checklist card (no need to open the form)
- [x] Dashboard tab: Archive button on each card (managers/admins only)
- [x] Dashboard tab: Archived tab/filter with Unarchive button
- [x] Add archived/archivedAt/archivedByName fields to preconstruction_checklists DB table
- [x] Add archive/unarchive tRPC endpoints for preconstruction checklists
- [x] Move "Mark Complete" button to top of Preconstruction form (next to status, not buried in Info section)
- [x] Add "Go to Dashboard" button inside the Preconstruction form that navigates to the Preconstruction Dashboard tab

## OAuth Sign-In Bug Fix (3/4/2026)

- [x] BUG: Sign In in Expo Go redirects to oauth.manus.im which cannot be resolved — fixed by overriding portal URL to https://manus.im

## Mobile Login Fix (3/4/2026)

- [x] BUG: Mobile login broken — oauth.manus.im unreachable on device — fixed by overriding EXPO_PUBLIC_OAUTH_PORTAL_URL to https://manus.im in constants/oauth.ts

## Preconstruction Dashboard Enhancements (3/4/2026)

- [x] Add delete button to each Preconstruction Dashboard card with confirmation modal
- [x] Add "New Checklist" button to Preconstruction Dashboard header

## Preconstruction Save Bug (3/4/2026)

- [x] BUG: Preconstruction checklists are not saving to the database — resolved (auto-save with 1.2s debounce working correctly)

## Preconstruction PDF Formatting (3/4/2026)

- [x] BUG: PDF formatting issues — fixed checkboxes, table alignment, date formatting, and spacing

## Materials Tab Removal (3/4/2026)

- [x] Remove Materials tab from Preconstruction Checklist form
- [x] Remove Materials section from Preconstruction PDF generation

## Dashboard Navigation Bug (3/4/2026)

- [x] BUG: "Dashboard →" button in Preconstruction Checklist form shows "Unmatched Route" error — fixed by changing route from "/(tabs)/modules/dashboard" to "/modules/dashboard"

## Photo Upload per Line Item (3/4/2026)

- [ ] Update Preconstruction database schema to store photos per line item (by section + line index)
- [ ] Implement photo upload UI for each checkbox line (camera/gallery picker)
- [ ] Display photo thumbnails next to each line with remove option
- [ ] Update PDF generation to show photos under each section heading
- [ ] Test photo upload and PDF rendering

## PDF Formatting Fixes (3/4/2026)

- [x] BUG: Body text running into letterhead — fixed by setting doc.y = HEADER_H + 12 after drawHeader
- [x] BUG: Section headers need more spacing from items below — increased moveDown from 0.3 to 0.5
- [x] BUG: Client Initials slammed against text — moved to bottom of each page (footerY = page.height - 50) with proper spacing

## CMR PDF Blank Issue (3/4/2026)

- [ ] BUG: CMR (Client Meeting Report) PDF export is blank — need to fix PDF generation

## Precon PDF Client Initials Bleed (3/4/2026)

- [x] BUG: Client Initials bleeding into next page — fixed by adjusting footerY from (page.height - 50) to (page.height - 70) to respect 60pt bottom margin

## Blank PDF Generation (3/4/2026)

- [x] BUG: CMR (Client Meeting Report) PDF export is blank — fixed by adding 100ms render delay and allowTaint option to html2canvas
- [x] BUG: Sales Pipeline PDF export is blank — same fix applied (both use exportMeetingReportPDF)

## Precon PDF Blank Pages 2-3 (3/4/2026)

- [x] BUG: Pages 2 and 3 are blank in Preconstruction PDF — fixed by explicitly setting doc.y = 90 + 12 after drawHeader() on each new page to ensure cursor is positioned below header

## Photo Picker Implementation (3/4/2026)

- [x] Implement expo-image-picker integration for photo upload — PhotoUploadSection component created
- [x] Support multiple photos per section with array storage — photoUris Record<string, string[]>
- [x] Add "Add More" button to upload additional photos — up to 5 photos per section
- [x] Add delete button for each uploaded photo — X button on each thumbnail
- [x] Display photo thumbnails in Photos tab —  80x80 grid with camera/gallery options
- [ ] Embed photos in PDF under each section

## Embed Photos in PDF (3/4/2026)

- [x] Pass photoUris from formData to PDF generator — read from fd.photoUris in precon-pdf.ts
- [x] Fetch/decode each photo URI as a buffer on the server — photos stored as base64 data URIs, decoded with Buffer.from()
- [x] Embed photos under each checklist item in the Photos section of the PDF — 3-per-row grid, 150x112pt each

## Photos Not Appearing in PDF (3/4/2026)

- [x] BUG: Photos uploaded in Photos tab are not appearing in the generated PDF
  - Root cause: formData JSON column has 65KB limit, base64 photos exceeded it silently
  - Fix: added photoData mediumtext column to DB, router extracts photoUris and stores in photoData
  - PDF generator reads photoData column and merges back into fd.photoUris before rendering

## Photo Pipeline Fix + Labeled Photo Pages (3/4/2026)

- [x] BUG: Photos still not saving/appearing in PDF — fixed: (1) precon get router now merges photoData back into formData.photoUris; (2) detail.tsx useEffect now reads photoUris from merged formData; (3) duplicate photoUris in defaultFormData removed; (4) PDF generator now tries both "photos.key" and bare "key" lookup formats
- [x] Add dedicated photo pages at end of PDF — one page per section that has photos, 2-column grid layout
- [x] Label each photo: "[Section Name] — Photo #N" (e.g. "Driveway & Access Conditions — Photo #1")

## AquaClean Receipt Capture Module (3/4/2026)

- [ ] Create aquaclean_receipts database table (same schema as receipts but separate)
- [ ] Create tRPC endpoints for AquaClean receipts (analyze, create, list, get, delete, generatePDF)
- [ ] Create AquaClean Receipt Capture form screen (app/modules/aquaclean-receipt-capture.tsx)
- [ ] Create AquaClean Receipt Capture dashboard screen (app/modules/aquaclean-receipt-dashboard.tsx)
- [ ] Create AquaClean Receipt Capture PDF generator (server/aquaclean-receipt-pdf.ts)
- [ ] Add AquaClean Receipt Capture to home screen quick actions and module cards
- [ ] Add AquaClean Receipt Capture to Tools screen module grid
- [ ] Test both Receipt Capture modules end-to-end with separate data

## Time Off Request Module (3/4/2026)

### Database
- [ ] Create time_off_policies table: userId, totalDaysAllowed, totalHoursAllowed, periodStartDate, periodEndDate, notes, createdAt, updatedAt
- [ ] Create time_off_requests table: id, userId, requestType (vacation/sick/personal/other), startDate, endDate, startTime, endTime, totalDays, totalHours, reason, status (pending/approved/denied), reviewedBy, reviewedAt, reviewNotes, periodYear, createdAt
- [ ] Run db:push migration

### Server
- [ ] tRPC time_off router: submitRequest, listMyRequests, getMyPolicy, cancelRequest (employee)
- [ ] tRPC time_off router: listAllRequests, approveRequest, denyRequest, listAllPolicies, upsertPolicy, getUserPolicy (admin/manager)
- [ ] DB functions: createTimeOffRequest, getUserTimeOffRequests, getAllTimeOffRequests, updateTimeOffRequestStatus, getUserTimeOffPolicy, upsertTimeOffPolicy, getUsedTimeOff (calculates used days/hours per period)

### Employee Screen (time-off.tsx)
- [ ] PTO balance card: shows total allowed, used, remaining for current period with countdown
- [ ] Submit new request form: type, start date, end date, start/end time, total days/hours (auto-calc), reason
- [ ] My requests list: pending (yellow), approved (green), denied (red) — filterable by year
- [ ] Year filter to see prior year balances

### Admin Dashboard (time-off-dashboard.tsx)
- [ ] Employee list with PTO balance summary per user
- [ ] Tap employee → see their requests and policy
- [ ] Pending requests queue: approve or deny with optional note
- [ ] Edit PTO policy per user: total days/hours allowed, period start date, period end date
- [ ] Filter by year/period

### Navigation
- [ ] Add "Time Off" module card to home screen (all users)
- [ ] Add "Time Off Dashboard" to admin dashboard module picker
- [ ] Add route app/modules/time-off.tsx and app/modules/time-off-dashboard.tsx

## Job Role: AquaClean (3/5/2026)
- [x] Add "AquaClean" to DOS_ROLES in module-permissions.tsx
- [x] Add "AquaClean" to job role dropdown in admin-users.tsx (user management)
- [x] Add "AquaClean" to any other role picker/selector in the app
- [x] Move "Time Off" module card from Utilities to Administration section on home screen and Tools screen

## Time Off Admin: Delete Request (3/5/2026)
- [x] Add deleteRequest tRPC endpoint (admin/manager only)
- [x] Add delete button (trash icon) to each request card in Time Off Admin dashboard
- [x] Confirm before delete with alert dialog

## BUG: Time Off Admin delete button not working (3/5/2026)
- [x] Fix delete button on request cards - tap does nothing (fixed: nested TouchableOpacity conflict resolved by separating card tap from delete button)

## BUG: Time Off Admin delete button still not working (3/5/2026)
- [x] Deep debug delete button - root cause was server auth guard checking ctx.user.role === 'admin' but users have system role 'approved'; fixed to also allow Owner/Operations Manager/Project Manager dosRoles

## isEmployee Toggle + Time Off Admin Employees Tab (3/5/2026)
- [x] Add isEmployee boolean column to users table in schema.ts
- [x] Add setIsEmployee tRPC endpoint to update the flag
- [x] Add listEmployees tRPC endpoint to get only employee users
- [x] Add getPolicyForUser tRPC endpoint to get PTO policy for a specific user
- [x] Add Employee toggle (Switch) to User Management panel (admin-only, in expanded card)
- [x] Show EMPLOYEE badge on user card header when isEmployee = true
- [x] Filter Time Off Admin Employees tab to only show users where isEmployee = true
- [x] Update Employees stat card count to reflect only employees
- [x] PTO policy configured per employee via Edit PTO / Set PTO button in Employees tab
- [x] Empty state in Employees tab guides admin to mark users as Employee in User Management

## Edit PTO Policy: Date Picker (3/5/2026)
- [x] Replace PERIOD START DATE and PERIOD END DATE text inputs with native date picker in EditPolicyModal (native DateTimePicker on iOS/Android, HTML date input on web)

## BUG: Date picker not working in Edit PTO Policy modal (3/5/2026)
- [x] Fix date picker - clicking does nothing on web (fixed: replaced overlay approach with direct HTML <input type="date"> rendered as the button on web; native DateTimePicker used on iOS/Android)

## DatePicker Skill (3/5/2026)
- [x] Extract DatePicker into shared component (components/ui/date-picker.tsx)
- [x] Create dos-hub-datepicker skill with SKILL.md documenting usage
- [x] Update time-off-admin.tsx to use the shared DatePicker component

## Time Off Admin: All Requests Filter Panel (3/5/2026)
- [x] Add Filter button (top-right of All Requests tab header) with active filter count badge
- [x] Build FilterSheet modal with: Employee chips, Request Type chips, Status chips, Date Range (from/to DatePicker), Period chips
- [x] Apply active filters to the All Requests list client-side (employee, type, status, date from/to, period)
- [x] Add Cancel / Clear / Apply Filters buttons in the sheet
- [x] Removed old period-only filter chips row (now handled inside FilterSheet)

## BUG: Delete button in All Requests not working (3/5/2026)
- [x] Replace broken trash icon delete with a proper "Delete" button matching Pre-Construction Checklist style (bordered button with loading state; also adds "Review" button for pending requests)

## BUG: Module Permissions Save button not saving (3/5/2026)
- [x] Diagnose and fix the Save button in Module Permissions so role selections are persisted (root cause: UPDATE silently failed for modules with no existing DB row; fixed by switching to INSERT ... ON DUPLICATE KEY UPDATE upsert; also added onError alert and passes moduleName for new rows)

## BUG: Delete button in All Requests broken - rebuild from scratch (3/5/2026)
- [x] Audit DB deleteTimeOffRequest function (correct, uses Drizzle delete with eq filter)
- [x] Audit tRPC timeOff.deleteRequest endpoint (correct, passes id to DB function)
- [x] Rebuild client delete mutation and button - extracted RequestCard component with its own isolated useMutation hook; each card now manages its own delete state independently, eliminating shared isPending bug

## Undo Delete Toast - Time Off Admin All Requests (3/5/2026)
- [x] Add deletedAt column to timeOffRequests schema for soft-delete
- [x] Add softDeleteTimeOffRequest and restoreTimeOffRequest DB functions
- [x] Add timeOff.softDelete and timeOff.restoreRequest tRPC endpoints
- [x] Build undo-toast in RequestCard (30s countdown, fade-in animation, hard-delete on expiry)
- [x] Wire undo toast into RequestCard: soft-delete on confirm, show toast, hard-delete after 30s or restore on Undo tap
- [x] Filter out soft-deleted requests from getAllRequests query

## Change Status After Approval - Time Off Admin (3/5/2026)
- [x] Add "Change Status" action button on all request cards in All Requests tab
- [x] Show status picker (Pending / Approved / Denied / Cancelled) for any request regardless of current status
- [x] Add timeOff.changeStatus tRPC endpoint

## Time Off Calendar (3/5/2026)
- [x] Create TimeOffCalendar screen with month/week/day view switcher
- [x] Assign unique colors to each employee (deterministic, from a palette of 10 colors)
- [x] Month view: grid of days, colored event bars per employee per day
- [x] Week view: 7-column grid with colored blocks spanning multi-day requests
- [x] Day view: list of all requests on selected day, grouped by employee
- [x] Employee toggle sidebar: show/hide individual employees
- [x] Filter panel: request type, status, date range
- [x] Wire Calendar button from Time Off Admin header to calendar screen
- [x] Add tRPC getCalendarRequests endpoint to fetch all requests for calendar
- [x] Native header back button navigates back to Time Off Admin

## BUG: My Time Off shows soft-deleted requests (3/5/2026)
- [x] Fix getUserRequests DB function to exclude soft-deleted records (deletedAt IS NULL)

## BUG: PTO balance "Used" still counts soft-deleted requests (3/5/2026)
- [x] Fix getUsedPTODays DB function to exclude soft-deleted records (deletedAt IS NULL)

## Calendar Button & Crash Fix (3/5/2026)
- [x] Move Calendar button to be a prominent 4th stat card in Time Off Admin (alongside Pending/Approved/Employees)
- [x] Fix uncaught error on Calendar screen: hooks[lastArg] is not a function (tRPC queryOptions() API mismatch)

## CMR Report Detail View (3/5/2026)
- [x] Wire "Open" button on CMR report cards to navigate to a full CMR detail/edit screen
- [x] Build CMR detail screen showing all report fields (customer, products, pricing, notes, status, etc.)
- [ ] Allow editing key fields from the detail screen (status, PC%, notes, est. value) — deferred, view-only for now
