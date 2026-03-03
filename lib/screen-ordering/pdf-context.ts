/**
 * Screen Ordering Module — PDF Preview Context
 * Shares the generated HTML between the form screen and the preview screen
 * without passing large strings through route params.
 */
import { createContext, useContext } from "react";

export interface PdfPreviewData {
  html: string;
  title: string;
  /** "all" for full order, or a screen index for single screen */
  mode: "all" | number;
}

interface PdfPreviewContextType {
  data: PdfPreviewData | null;
  setData: (data: PdfPreviewData | null) => void;
}

export const PdfPreviewContext = createContext<PdfPreviewContextType>({
  data: null,
  setData: () => {},
});

export function usePdfPreview() {
  return useContext(PdfPreviewContext);
}
