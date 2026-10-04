"use client";

// Centralised pdf.js loader. We configure the worker once, pointing at the
// worker file that ships with the installed pdfjs-dist version (served from a
// CDN matching that exact version to avoid API/worker mismatches).
import * as pdfjsLib from "pdfjs-dist";
import { uid } from "./utils";

let configured = false;

export function getPdfjs() {
  if (!configured) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    configured = true;
  }
  return pdfjsLib;
}

/** Render a single PDF page to a PNG data URL at the given scale. */
export async function renderPageToDataUrl(
  data: ArrayBuffer,
  pageNumber: number,
  scale = 1
): Promise<string> {
  const pdfjs = getPdfjs();
  const doc = await pdfjs.getDocument({ data: data.slice(0) }).promise;
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport }).promise;
  const url = canvas.toDataURL("image/png");
  doc.destroy();
  return url;
}

/** Get the number of pages in a PDF. */
export async function getPageCount(data: ArrayBuffer): Promise<number> {
  const pdfjs = getPdfjs();
  const doc = await pdfjs.getDocument({ data: data.slice(0) }).promise;
  const n = doc.numPages;
  doc.destroy();
  return n;
}

// ---------------------------------------------------------------------------
// Text editing support
// ---------------------------------------------------------------------------

export type FontFamily = "Helvetica" | "Times" | "Courier";

/** One editable line of text, with both PDF-space and helper geometry. */
export type EditLine = {
  id: string;
  text: string;
  original: string; // text as first extracted, used to detect edits
  xPdf: number; // left edge, PDF points (origin bottom-left)
  baselinePdf: number; // text baseline, PDF points from bottom
  fontSizePdf: number; // font size in PDF points
  widthPdf: number; // original line width, PDF points
  color: string; // hex
  font: FontFamily;
  bold: boolean;
  coverColor: string; // colour used to mask the original text on export
  loadedName?: string; // pdf.js id of the original embedded font (if any)
  psName?: string; // PostScript name of the original font (informational)
  isNew?: boolean; // added by the user (no original glyphs underneath)
  dirty?: boolean; // changed since extraction -> needs cover + redraw
};

export type PageExtract = {
  url: string; // page rendered to PNG (editor background)
  pdfWidth: number;
  pdfHeight: number;
  lines: EditLine[];
  // Raw bytes of embedded fonts found on the page, keyed by pdf.js loadedName.
  // Used at export time to redraw edited lines in the original typeface.
  fontData: Record<string, Uint8Array>;
};

/**
 * Render a page and extract its text grouped into editable lines. Geometry is
 * returned in PDF user-space (origin bottom-left) so it maps 1:1 back to
 * pdf-lib on export. Also captures embedded font programs so edited lines can
 * be redrawn in their original typeface when possible.
 */
export async function extractPageForEdit(
  data: ArrayBuffer,
  pageNumber: number,
  scale = 1.4
): Promise<PageExtract> {
  const pdfjs = getPdfjs();
  const doc = await pdfjs.getDocument({ data: data.slice(0) }).promise;
  const page = await doc.getPage(pageNumber);

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d")!;
  // Rendering resolves font programs into page.commonObjs so we can read them.
  await page.render({ canvasContext: ctx, viewport }).promise;
  const url = canvas.toDataURL("image/png");

  const base = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();

  // Resolve a pdf.js fontName -> { loadedName, psName, data } once each.
  const fontData: Record<string, Uint8Array> = {};
  const fontInfo: Record<string, { loadedName?: string; psName?: string }> = {};
  const resolveFont = (fontName: string) => {
    if (fontInfo[fontName]) return fontInfo[fontName];
    const info: { loadedName?: string; psName?: string } = {};
    try {
      const fo: any = page.commonObjs.get(fontName);
      if (fo) {
        info.loadedName = fo.loadedName || fontName;
        info.psName = fo.name;
        const d = fo.data;
        if (d && d.length && !fo.isType3Font) {
          fontData[info.loadedName as string] =
            d instanceof Uint8Array ? d : new Uint8Array(d);
        }
      }
    } catch {
      // font not resolved / not embedded — fall back later
    }
    fontInfo[fontName] = info;
    return info;
  };

  type Item = { str: string; x: number; f: number; fs: number; w: number; fn: string };
  const items: Item[] = [];
  for (const it of content.items as any[]) {
    if (typeof it.str !== "string" || it.str.length === 0) continue;
    const tr = it.transform as number[];
    const fs = Math.hypot(tr[2], tr[3]) || Math.hypot(tr[0], tr[1]) || 12;
    items.push({ str: it.str, x: tr[4], f: tr[5], fs, w: it.width, fn: it.fontName });
  }

  // Order top-to-bottom, then left-to-right.
  items.sort((a, b) => (Math.abs(a.f - b.f) > 2 ? b.f - a.f : a.x - b.x));

  const lines: EditLine[] = [];
  let group: Item[] = [];

  const flush = () => {
    if (!group.length) {
      group = [];
      return;
    }
    group.sort((a, b) => a.x - b.x);
    const fontSize = Math.max(...group.map((g) => g.fs));
    const xPdf = Math.min(...group.map((g) => g.x));
    const right = Math.max(...group.map((g) => g.x + g.w));
    const baseline = group[0].f;
    // Dominant font of the line = the run with the largest font size.
    const dom = group.reduce((a, b) => (b.fs > a.fs ? b : a), group[0]);
    let text = "";
    let prevRight: number | null = null;
    for (const g of group) {
      if (
        prevRight != null &&
        g.x - prevRight > fontSize * 0.25 &&
        !text.endsWith(" ") &&
        !g.str.startsWith(" ")
      ) {
        text += " ";
      }
      text += g.str;
      prevRight = g.x + g.w;
    }
    text = text.replace(/\s+/g, " ").trim();
    const fi = dom.fn ? resolveFont(dom.fn) : {};
    group = [];
    if (!text) return;
    lines.push({
      id: uid(),
      text,
      original: text,
      xPdf,
      baselinePdf: baseline,
      fontSizePdf: fontSize,
      widthPdf: Math.max(right - xPdf, fontSize),
      color: "#000000",
      font: "Helvetica",
      bold: false,
      coverColor: "#ffffff",
      loadedName: fi.loadedName,
      psName: fi.psName,
    });
  };

  let lastF: number | null = null;
  for (const it of items) {
    if (lastF != null && Math.abs(it.f - lastF) > Math.max(2, it.fs * 0.5)) {
      flush();
    }
    group.push(it);
    lastF = it.f;
  }
  flush();

  doc.destroy();
  return { url, pdfWidth: base.width, pdfHeight: base.height, lines, fontData };
}
