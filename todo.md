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
