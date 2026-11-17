import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { EditorElement } from "../types/editor";

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function hexToColor(hex: string) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

/**
 * Bakes drawn ink, text boxes and images into the original PDF.
 * Element coordinates are in canvas pixel space (origin top-left); PDF points
 * use a bottom-left origin, so every y is flipped against the page's own height.
 */
export async function exportEditedPdf(
  originalBytes: ArrayBuffer,
  elements: EditorElement[],
  inkByPage: Record<number, string>,
  renderScale: number,
): Promise<Blob> {
  const pdfDoc = await PDFDocument.load(originalBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  for (let i = 0; i < pages.length; i++) {
    const pageNum = i + 1;
    const page = pages[i];
    const { height: pageHeightPt } = page.getSize();

    const ink = inkByPage[pageNum];
    if (ink) {
      const pngImage = await pdfDoc.embedPng(dataUrlToBytes(ink));
      page.drawImage(pngImage, { x: 0, y: 0, width: page.getWidth(), height: pageHeightPt });
    }

    for (const el of elements.filter((e) => e.page === pageNum)) {
      if (el.kind === "text") {
        if (!el.text.trim()) continue;
        page.drawText(el.text, {
          x: el.x / renderScale,
          y: pageHeightPt - el.y / renderScale - el.fontSize * 0.8,
          size: el.fontSize,
          font,
          color: hexToColor(el.color),
        });
      } else {
        const bytes = dataUrlToBytes(el.dataUrl);
        const embedded = el.dataUrl.startsWith("data:image/png")
          ? await pdfDoc.embedPng(bytes)
          : await pdfDoc.embedJpg(bytes);
        const pdfW = el.width / renderScale;
        const pdfH = el.height / renderScale;
        page.drawImage(embedded, {
          x: el.x / renderScale,
          y: pageHeightPt - el.y / renderScale - pdfH,
          width: pdfW,
          height: pdfH,
        });
      }
    }
  }

  const outBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(outBytes)], { type: "application/pdf" });
}
