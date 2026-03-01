# PDF Formatting Issues Found

## StruXure Report
1. **ZONESSUPERVISOR** — "ZONES" and "SUPERVISOR" column headers are merged with no space
2. **Text cut off** — Customer names are being cut off/blurred at the bottom of each row
3. Row height too small, causing text to be clipped vertically

## Screens Report
1. **QTYMANUFACTURER** — "QTY" and "MANUFACTURER" column headers merged with no space
2. Same text cut-off issue

## All Product Reports (StruXure, Screens, Pergotenda, Awnings, Final)
- Column headers running together
- Text in rows being cut off/clipped at bottom
- Row height needs increase
- Column widths need proper spacing/gaps

## Root Cause
The on-screen layout uses React Native View/Text with styles that:
1. Don't have enough gap/margin between adjacent columns
2. Have insufficient row height (lineHeight too small or row padding too tight)
3. Columns use flex without enough gap spacing

## Fix needed in reports-view.tsx
- Add proper gap/spacing between column headers
- Increase row height / padding
- Ensure text doesn't overflow/clip (numberOfLines + ellipsis)
- Separate ZONES and SUPERVISOR into distinct columns with gap
- Separate QTY and MANUFACTURER into distinct columns with gap
- Increase lineHeight on all text elements
