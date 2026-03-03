# Receipt Capture Module - Design Notes

## PDF Output Format (from Google AI Studio)
Page 1: Receipt Summary Report
- Header: "Distinctive Outdoor Structures" + "Receipt Summary Report"
- Classification Info: Submitted By, Type (Job Receipt / Overhead/General), Category
- Purchase Details: Vendor, Location, Material Class, Date
- Line Items table: Description | Qty | Unit | Total
- Totals: Tax + Grand Total

Page 2: Original Receipt Image (full page scan)

## File Naming Convention
VendorName_D-M-YYYY_HHmmss
Example: HomeDepot_3-1-2026_130245

## Form Fields (from Google AI Studio)
### Receipt Classification
- Submitter's Name (auto-fill from logged-in user)
- Receipt Type: Job Receipt | Overhead / General
  - If Job Receipt: Job Name*, Job Number/Work Order*, PO Number (optional)
  - If Overhead/General: Category* (dropdown)
    - Office Supplies, Tools & Equipment, Marketing, Fuel (Non-job),
      Software/Subscriptions, Training, Meals, Misc Overhead

### Receipt Image
- Take Photo (camera)
- Upload Image (gallery/file picker)
- Remove Image

### Vendor & Date (AI-extracted, editable)
- Vendor Name*
- Purchase Date*
- Material Class dropdown: Screens, Electrical, Miscellaneous, Fuel, Tools

### Line Items (AI-extracted, editable)
- Description, Qty, Unit Price, Total per line
- Add Line Item / Delete line item

### Totals (AI-extracted, editable)
- Subtotal, Tax, Total*

### Receipt Notes (optional)

## Dashboard Requirements
- Admin: ALL receipts visible, file-system style by date
- Each row shows: Vendor, User, Amount
- PDF Export button per receipt
- Reports by: User, Date Range, Vendor Name
- Finance-useful analytics:
  - Total spend by user
  - Total spend by vendor
  - Total spend by category (Job vs Overhead)
  - Monthly spend trend
  - Top vendors by spend

## Data Model
```
Receipt {
  id: string
  userId: string
  submitterName: string
  vendorName: string
  vendorLocation: string
  purchaseDate: string (YYYY-MM-DD)
  receiptType: 'job' | 'overhead'
  // Job fields
  jobName?: string
  workOrderNumber?: string
  poNumber?: string
  // Overhead fields
  overheadCategory?: string
  // Common
  materialCategory: string
  lineItems: LineItem[]
  subtotal: number
  tax: number
  total: number
  notes: string
  receiptImageBase64: string (stored in DB or S3)
  receiptImageMimeType: string
  fileName: string (VendorName_D-M-YYYY_HHmmss)
  createdAt: Date
}
```
