# PDF Formatting Issues - Round 2

## Issues Found in StruXure PDF:
1. **ZONES and SUPERVISOR headers still touching** — "ZONES SUPERVISOR" looks like "ZONES  SUPERVISOR" but the gap between them is minimal. The gap:10 helped but ZONES column is right-aligned and SUPERVISOR starts immediately after.
2. **Text is still being cut off at bottom of rows** — Customer names like "Ballard, Christy" have the bottom of letters clipped (descenders cut). The issue is that html2canvas is cutting off the bottom of text.
3. **ZONES numbers are right-aligned** — should be centered in the column
4. **SF numbers are right-aligned** — should be centered in the column
5. **Column header text appears blurry/pixelated** — "CUSTOMER", "SF", "ZONES", "SUPERVISOR" are hard to read

## Root Causes:
- The `align: 'right'` on SF and Zones columns pushes numbers to the far right edge
- Need `align: 'center'` for SF and Zones columns
- Text clipping is likely a html2canvas rendering issue with lineHeight vs actual text rendering
- Need to increase scale in html2pdf options for better quality
- May need to add extra paddingBottom to text elements to prevent descender clipping
