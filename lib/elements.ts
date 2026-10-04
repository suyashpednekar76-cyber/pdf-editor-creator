// Shared rich-element model + pdf-lib renderer used by both the Create PDF and
// Edit text modules. All geometry is in PDF points with a TOP-LEFT origin
// (y grows downward); drawElements converts to pdf-lib's bottom-left space.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { uid } from "./utils";

export type FontFamily = "Helvetica" | "Times" | "Courier";
export type Align = "left" | "center" | "right";
export type ListStyle = "none" | "bullet" | "number";

export type TextElement = {
  kind: "text";
  id: string;
  x: number;
  y: number;
  width: number;
  text: string;
  fontFamily: FontFamily;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  color: string;
  highlight: string; // "none" or hex
  align: Align;
  lineHeight: number; // multiplier
  list: ListStyle;
};

export type TableCell = {
  text: string;
  align: Align;
  bold: boolean;
  italic: boolean;
  color: string;
  fill: string; // "none" or hex
};

export type TableElement = {
  kind: "table";
  id: string;
  x: number;
  y: number;
  colWidths: number[];
  rowHeights: number[]; // minimum heights; grows to fit content
  cells: TableCell[][];
  borderWidth: number;
  borderColor: string;
  headerFill: string; // "none" or hex applied to first row
  fontFamily: FontFamily;
  fontSize: number;
  cellPadding: number;
};

export type RectElement = {
  kind: "rect";
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};

export type ImageElement = {
  kind: "image";
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
  mime: string;
};

export type Element = TextElement | TableElement | RectElement | ImageElement;

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

export function newText(x: number, y: number): TextElement {
  return {
    kind: "text",
    id: uid(),
    x,
    y,
    width: 240,
    text: "Type your text here. Use the toolbar to format it.",
    fontFamily: "Helvetica",
    fontSize: 14,
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    color: "#0f172a",
    highlight: "none",
    align: "left",
    lineHeight: 1.3,
    list: "none",
  };
}

export function newCell(text = ""): TableCell {
  return { text, align: "left", bold: false, italic: false, color: "#0f172a", fill: "none" };
}

export function newTable(x: number, y: number, rows = 3, cols = 3): TableElement {
  return {
    kind: "table",
    id: uid(),
    x,
    y,
    colWidths: Array.from({ length: cols }, () => 110),
    rowHeights: Array.from({ length: rows }, () => 26),
    cells: Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) =>
        newCell(r === 0 ? `Header ${c + 1}` : "")
      )
    ),
    borderWidth: 1,
    borderColor: "#cbd5e1",
    headerFill: "#eef2ff",
    fontFamily: "Helvetica",
    fontSize: 12,
    cellPadding: 6,
  };
}

export function newRect(x: number, y: number): RectElement {
  return { kind: "rect", id: uid(), x, y, width: 200, height: 100, color: "#3b6cff" };
}

// ---------------------------------------------------------------------------
// Fonts
// ---------------------------------------------------------------------------

export type FontSet = Record<
  FontFamily,
  { regular: PDFFont; bold: PDFFont; italic: PDFFont; boldItalic: PDFFont }
>;

export async function embedFontSet(doc: PDFDocument): Promise<FontSet> {
  const e = (f: StandardFonts) => doc.embedFont(f);
  return {
    Helvetica: {
      regular: await e(StandardFonts.Helvetica),
      bold: await e(StandardFonts.HelveticaBold),
      italic: await e(StandardFonts.HelveticaOblique),
      boldItalic: await e(StandardFonts.HelveticaBoldOblique),
    },
    Times: {
      regular: await e(StandardFonts.TimesRoman),
      bold: await e(StandardFonts.TimesRomanBold),
      italic: await e(StandardFonts.TimesRomanItalic),
      boldItalic: await e(StandardFonts.TimesRomanBoldItalic),
    },
    Courier: {
      regular: await e(StandardFonts.Courier),
      bold: await e(StandardFonts.CourierBold),
      italic: await e(StandardFonts.CourierOblique),
      boldItalic: await e(StandardFonts.CourierBoldOblique),
    },
  };
}

export function pickFont(fonts: FontSet, fam: FontFamily, bold: boolean, italic: boolean): PDFFont {
  const set = fonts[fam] || fonts.Helvetica;
  if (bold && italic) return set.boldItalic;
  if (bold) return set.bold;
  if (italic) return set.italic;
  return set.regular;
}

export function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.replace(/(.)/g, "$1$1") : h;
  const n = parseInt(v, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function encodable(font: PDFFont, s: string, size: number) {
  try {
    font.widthOfTextAtSize(s, size);
    return true;
  } catch {
    return false;
  }
}
function safe(font: PDFFont, s: string, size: number) {
  return encodable(font, s, size) ? s : s.replace(/[^\x20-\x7E]/g, "?");
}
function widthOf(font: PDFFont, s: string, size: number) {
  return font.widthOfTextAtSize(safe(font, s, size), size);
}

/** Greedy word-wrap of a single paragraph to a max width. */
export function wrapParagraph(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  if (text === "") return [""];
  const words = text.split(/(\s+)/); // keep spaces
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line + w;
    if (widthOf(font, test, size) > maxWidth && line.trim() !== "") {
      lines.push(line.replace(/\s+$/, ""));
      line = w.replace(/^\s+/, "");
    } else {
      line = test;
    }
  }
  if (line.trim() !== "" || lines.length === 0) lines.push(line.replace(/\s+$/, ""));
  return lines;
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function alignX(x: number, boxW: number, lineW: number, align: Align) {
  if (align === "center") return x + (boxW - lineW) / 2;
  if (align === "right") return x + (boxW - lineW);
  return x;
}

/** Draw a text element. Returns the height consumed (points). */
export function drawTextElement(page: PDFPage, pageH: number, fonts: FontSet, el: TextElement): number {
  const font = pickFont(fonts, el.fontFamily, el.bold, el.italic);
  const size = el.fontSize;
  const lh = size * el.lineHeight;
  const color = hexToRgb(el.color);
  let cursorTop = pageH - el.y; // pdf-space y of the top of the box
  let baseline = cursorTop - size; // first baseline
  const paragraphs = el.text.split("\n");
  let counter = 1;

  for (const para of paragraphs) {
    const prefix = el.list === "bullet" ? "•  " : el.list === "number" ? `${counter}. ` : "";
    const prefixW = prefix ? widthOf(font, prefix, size) : 0;
    const wrapped = wrapParagraph(font, para, size, Math.max(el.width - prefixW, size));
    wrapped.forEach((ln, i) => {
      const content = (i === 0 ? prefix : "") + ln;
      const indent = i === 0 ? 0 : prefixW;
      const lineW = widthOf(font, content, size);
      const lx = alignX(el.x + indent, el.width - indent, lineW, el.align);
      if (el.highlight !== "none") {
        page.drawRectangle({
          x: lx - 1,
          y: baseline - size * 0.25,
          width: lineW + 2,
          height: size * 1.2,
          color: hexToRgb(el.highlight),
        });
      }
      page.drawText(safe(font, content, size), { x: lx, y: baseline, size, font, color });
      if (el.underline) {
        page.drawLine({
          start: { x: lx, y: baseline - size * 0.12 },
          end: { x: lx + lineW, y: baseline - size * 0.12 },
          thickness: Math.max(0.5, size * 0.05),
          color,
        });
      }
      if (el.strike) {
        page.drawLine({
          start: { x: lx, y: baseline + size * 0.28 },
          end: { x: lx + lineW, y: baseline + size * 0.28 },
          thickness: Math.max(0.5, size * 0.05),
          color,
        });
      }
      baseline -= lh;
    });
    if (el.list === "number") counter++;
  }
  return cursorTop - (baseline + lh) + lh;
}

/** Compute the rendered row heights of a table (max of min height and content). */
export function tableRowHeights(fonts: FontSet, el: TableElement): number[] {
  const base = pickFont(fonts, el.fontFamily, false, false);
  const lh = el.fontSize * 1.25;
  return el.rowHeights.map((minH, r) => {
    let needed = el.fontSize + el.cellPadding * 2;
    el.cells[r].forEach((cell, c) => {
      const f = pickFont(fonts, el.fontFamily, cell.bold, cell.italic);
      const lines = (cell.text || "").split("\n").flatMap((p) =>
        wrapParagraph(f, p, el.fontSize, el.colWidths[c] - el.cellPadding * 2)
      );
      needed = Math.max(needed, lines.length * lh + el.cellPadding * 2);
    });
    return Math.max(minH, needed);
  });
}

export function drawTableElement(page: PDFPage, pageH: number, fonts: FontSet, el: TableElement) {
  const heights = tableRowHeights(fonts, el);
  const lh = el.fontSize * 1.25;
  const xLefts: number[] = [];
  let acc = el.x;
  for (const w of el.colWidths) {
    xLefts.push(acc);
    acc += w;
  }
  const border = hexToRgb(el.borderColor);
  let topY = pageH - el.y;

  el.cells.forEach((row, r) => {
    const rowH = heights[r];
    const rowTop = topY;
    row.forEach((cell, c) => {
      const cx = xLefts[c];
      const cw = el.colWidths[c];
      const fillHex = cell.fill !== "none" ? cell.fill : r === 0 && el.headerFill !== "none" ? el.headerFill : null;
      if (fillHex) {
        page.drawRectangle({ x: cx, y: rowTop - rowH, width: cw, height: rowH, color: hexToRgb(fillHex) });
      }
      if (el.borderWidth > 0) {
        page.drawRectangle({
          x: cx,
          y: rowTop - rowH,
          width: cw,
          height: rowH,
          borderColor: border,
          borderWidth: el.borderWidth,
        });
      }
      const f = pickFont(fonts, el.fontFamily, cell.bold, cell.italic);
      const color = hexToRgb(cell.color);
      const lines = (cell.text || "").split("\n").flatMap((p) =>
        wrapParagraph(f, p, el.fontSize, cw - el.cellPadding * 2)
      );
      let baseline = rowTop - el.cellPadding - el.fontSize;
      for (const ln of lines) {
        const lineW = widthOf(f, ln, el.fontSize);
        const lx = alignX(cx + el.cellPadding, cw - el.cellPadding * 2, lineW, cell.align);
        page.drawText(safe(f, ln, el.fontSize), { x: lx, y: baseline, size: el.fontSize, font: f, color });
        baseline -= lh;
      }
    });
    topY -= rowH;
  });
}

export async function drawElements(doc: PDFDocument, page: PDFPage, pageH: number, fonts: FontSet, elements: Element[]) {
  for (const el of elements) {
    if (el.kind === "rect") {
      page.drawRectangle({
        x: el.x,
        y: pageH - el.y - el.height,
        width: el.width,
        height: el.height,
        color: hexToRgb(el.color),
      });
    } else if (el.kind === "text") {
      drawTextElement(page, pageH, fonts, el);
    } else if (el.kind === "table") {
      drawTableElement(page, pageH, fonts, el);
    } else if (el.kind === "image") {
      const bytes = await fetch(el.src).then((r) => r.arrayBuffer());
      const img = el.mime.includes("png") ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
      page.drawImage(img, { x: el.x, y: pageH - el.y - el.height, width: el.width, height: el.height });
    }
  }
}

/** Total table dimensions in points (using min row heights for layout helpers). */
export function tableSize(el: TableElement) {
  return {
    width: el.colWidths.reduce((a, b) => a + b, 0),
    height: el.rowHeights.reduce((a, b) => a + b, 0),
  };
}
