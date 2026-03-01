# PDF Debug Notes

## Problem
html2pdf.js produces a single blank white page. The container div has HTML content but html2canvas captures nothing.

## Root Cause Analysis
The issue is that `html2pdf.js` uses `html2canvas` which renders elements by reading their **computed styles**. When `opacity: 0` is set on the container, html2canvas respects that and renders everything as invisible.

## Solution Options
1. **Use an iframe** — Create a hidden iframe, write the HTML into it, then capture from the iframe's document. html2canvas can capture from iframe content.
2. **Use the Google approach exactly** — The Google version adds `pdf-export` class to the ACTUAL visible report element (not a hidden copy). It captures the real on-screen element.
3. **Open a new window** — Write HTML to a new window, capture from there.
4. **Use jsPDF directly** — Generate PDF programmatically without html2canvas.
5. **Temporarily make visible** — Set opacity to 1 just before capture, then back to 0 after.

## Best approach: Option 5 or use an iframe
Option 5 is simplest — briefly flash the container visible (opacity:1) during capture. The container is behind everything (z-index:-9999) so user won't see it. But html2canvas will.

Actually, the REAL Google approach (option 2) captures the actual visible DOM element. But in our React Native app, the report is rendered as RN Views, not HTML divs. So we can't do that.

Best: Use an iframe approach. Write HTML into iframe, capture from iframe body.
