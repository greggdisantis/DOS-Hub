# DOS Hub Mobile App — Interface Design

## Design Philosophy
The DOS Hub mobile app follows **Apple Human Interface Guidelines (HIG)** to feel like a first-party iOS app. It is designed for **mobile portrait orientation (9:16)** and **one-handed usage**. The app serves as a centralized "command center" for outdoor structure companies, providing quick access to specialized tools, resources, and training modules.

---

## Screen List

### 1. Home (Hub Dashboard)
The primary landing screen after login. Displays a personalized greeting with the company logo (white-label), quick-access module cards, and recent activity.

### 2. Tools
A grid/list of all available tool modules (Motorized Screens, Zoning Lookup, Receipt Capture, etc.). Each tool card shows an icon, name, and brief description. Tapping opens the tool's dedicated screen.

### 3. Projects
Displays a list of active and recent projects. Each project card shows the project name, status, associated HubSpot Deal, and last activity. Tapping opens a project detail view.

### 4. Profile / Settings
User profile, company branding preview, notification preferences, and subscription status. Admin users see additional options for managing team members and company settings.

---

## Primary Content and Functionality

### Home Screen
- **Company Logo & Greeting**: Dynamic logo and "Good morning, [Name]" based on the logged-in user's company branding.
- **Quick Actions Row**: Horizontally scrollable row of the most-used tools (e.g., "New Receipt", "Zoning Lookup", "Screen Order").
- **Module Cards Grid**: 2-column grid of all available modules with icons and labels.
- **Recent Activity Feed**: A short list of the user's most recent actions (e.g., "Receipt submitted for Job #1234", "Zoning lookup completed for 123 Main St").

### Tools Screen
- **Search Bar**: Filter tools by name or category.
- **Category Sections**: Tools grouped by category (Utilities, Engineering, Training, Admin).
- **Tool Cards**: Each card has an icon, title, and one-line description. Tap to navigate to the tool's dedicated screen.

### Projects Screen
- **Search & Filter**: Search by project name, job number, or address. Filter by status (Active, Completed, On Hold).
- **Project Cards**: Each card shows project name, status badge, customer name, and last updated date.
- **Project Detail**: Full project view with tabs for Overview, Documents, Activity, and Linked Records (HubSpot/Service Fusion).

### Profile / Settings Screen
- **User Info**: Avatar, name, email, role.
- **Company Branding**: Preview of the company logo and colors applied to the app.
- **Preferences**: Notification toggles, dark mode toggle.
- **Admin Section** (role-gated): Manage team members, view subscription status, edit company branding.

---

## Key User Flows

### Flow 1: Receipt Capture
1. User taps "Receipt Capture" on Home or Tools screen.
2. Camera opens for photo capture (or user selects from gallery).
3. AI analyzes the receipt and extracts data.
4. User reviews/edits extracted data, selects Job # via search.
5. User taps "Submit" → Receipt saved to database, linked to project.
6. Success confirmation with option to capture another.

### Flow 2: Zoning Lookup
1. User taps "Zoning Lookup" on Home or Tools screen.
2. User enters an address (or uses GPS for current location).
3. App queries GIS/Census APIs via backend.
4. Results displayed: Jurisdiction, Parcel ID, Zoning Code, Municipal Links.
5. User taps "Generate Permit Intake Summary" → AI generates PDF.
6. User taps "Send to HubSpot" → Backend uploads PDF and creates Deal note.

### Flow 3: Motorized Screens Order
1. User taps "Screen Ordering" on Home or Tools screen.
2. User selects manufacturer, enters dimensions, fabric, motor options.
3. App performs structural calculations in real-time.
4. User reviews the order summary and generated PDF.
5. User taps "Save" → Order saved to database and linked to project.

### Flow 4: Service Fusion Intelligence
1. User taps "Job Intelligence" on Home or Tools screen.
2. Dashboard displays real-time project readiness data.
3. User can filter by supervisor, status, or project type.
4. Tapping a project shows detailed readiness breakdown.
5. Push notifications alert users when project status changes.

---

## Color Choices

The DOS Hub uses a professional, construction-industry-appropriate palette that conveys trust, reliability, and precision.

| Token       | Light Mode | Dark Mode  | Usage                        |
|-------------|-----------|------------|------------------------------|
| primary     | #1E3A5F   | #4A90D9    | Brand accent, buttons, links |
| background  | #FFFFFF   | #0F1419    | Screen backgrounds           |
| surface     | #F4F6F8   | #1A1F25    | Cards, elevated surfaces     |
| foreground  | #1A1A2E   | #E8ECF0    | Primary text                 |
| muted       | #6B7280   | #8B95A1    | Secondary text, labels       |
| border      | #E2E8F0   | #2D3748    | Dividers, card borders       |
| success     | #10B981   | #34D399    | Confirmed, completed states  |
| warning     | #F59E0B   | #FBBF24    | Pending, attention needed    |
| error       | #EF4444   | #F87171    | Errors, blocked states       |

The **primary color (#1E3A5F)** is a deep navy blue, evoking professionalism and trust. In the white-label model, this color will be dynamically overridden by the subscribing company's brand color.

---

## Tab Bar Structure

| Tab       | Icon (SF Symbol)     | Screen          |
|-----------|---------------------|-----------------|
| Home      | house.fill          | Hub Dashboard   |
| Tools     | wrench.and.screwdriver.fill | Tools Grid |
| Projects  | folder.fill         | Projects List   |
| Profile   | person.circle.fill  | Settings/Profile|

---

## White-Label Dynamic Branding

When a user logs in, the app fetches their company's branding from the database:
- **Logo**: Displayed in the Home screen header and Profile screen.
- **Primary Color**: Applied to buttons, tab bar tint, and accent elements.
- **Company Name**: Displayed in the header and used in generated documents.

This ensures every subscribing company sees "their" app, while the core codebase remains unified.
