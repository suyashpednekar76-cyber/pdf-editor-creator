"use client";

import { useEffect, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import ToolShell from "@/components/ToolShell";
import FileDropzone from "@/components/FileDropzone";
import Button from "@/components/Button";
import ElementsLayer from "@/components/elements/ElementsLayer";
import FormatToolbar from "@/components/elements/FormatToolbar";
import {
  extractPageForEdit,
  type EditLine,
  type FontFamily,
  type PageExtract,
} from "@/lib/pdfjs";
import {
  type Element,
  type TableElement,
  type TableCell,
  newText,
  newTable,
  newCell,
  embedFontSet,
  pickFont,
  hexToRgb,
  drawElements,
} from "@/lib/elements";
import { download, uid } from "@/lib/utils";

const SCALE = 1.4;

const cssFamily = (f: FontFamily) =>
  f === "Times"
    ? 'Georgia, "Times New Roman", serif'
    : f === "Courier"
    ? '"Courier New", monospace'
    : "Helvetica, Arial, sans-serif";

/** One editable existing-text line. Text is uncontrolled to keep the caret stable. */
function EditableLine({
  line,
  pdfHeight,
  selected,
  onSelect,
  onChange,
}: {
  line: EditLine;
  pdfHeight: number;
  selected: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<EditLine>) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerText !== line.text) ref.current.innerText = line.text;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fontPx = line.fontSizePdf * SCALE;
  const left = line.xPdf * SCALE;
  const top = (pdfHeight - line.baselinePdf - line.fontSizePdf) * SCALE;
  const minWidth = Math.max(line.widthPdf, line.fontSizePdf) * SCALE;

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onPointerDown={(e) => { e.stopPropagation(); onSelect(line.id); }}
      onFocus={() => onSelect(line.id)}
      onInput={(e) => onChange(line.id, { text: e.currentTarget.innerText, dirty: true })}
      className="absolute"
      style={{
        left,
        top,
        fontSize: fontPx,
        fontFamily: cssFamily(line.font),
        fontWeight: line.bold ? 700 : 400,
        color: line.color,
        background: line.coverColor,
        lineHeight: 1.15,
        whiteSpace: "pre",
        minWidth,
        padding: "0 1px",
        outline: selected ? "2px solid #0ea5e9" : "1px dashed rgba(14,165,233,0.35)",
      }}
    />
  );
}

export default function EditTextPage() {
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<ArrayBuffer | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pages, setPages] = useState<Record<number, PageExtract>>({});
  const [overlay, setOverlay] = useState<Record<number, Element[]>>({});
  const [current, setCurrent] = useState(1);
  const [selLine, setSelLine] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [selCellPos, setSelCellPos] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const page = pages[current];
  const els = overlay[current] || [];
  const lineSel = page?.lines.find((l) => l.id === selLine) || null;
  const sel = els.find((e) => e.id === selId) || null;
  const selCell: TableCell | null =
    sel && sel.kind === "table" && selCellPos ? sel.cells[selCellPos[0]]?.[selCellPos[1]] || null : null;

  const deselectAll = () => { setSelLine(null); setSelId(null); setSelCellPos(null); };

  const loadPage = async (buf: ArrayBuffer, n: number) => {
    setLoading(true);
    try {
      const extract = await extractPageForEdit(buf, n, SCALE);
      setPages((prev) => ({ ...prev, [n]: extract }));
    } catch (e) {
      console.error(e);
      setError("Could not read text from this page.");
    } finally {
      setLoading(false);
    }
  };

  const onFiles = async (files: File[]) => {
    setError(null);
    const f = files[0];
    try {
      const buf = await f.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      setFile(f);
      setBytes(buf);
      setNumPages(doc.getPageCount());
      setCurrent(1);
      setPages({});
      setOverlay({});
      await loadPage(buf, 1);
    } catch (e) {
      console.error(e);
      setError("Could not open this PDF. It may be encrypted or corrupted.");
    }
  };

  const goto = async (n: number) => {
    if (n < 1 || n > numPages) return;
    deselectAll();
    setCurrent(n);
    if (!pages[n] && bytes) await loadPage(bytes, n);
  };

  // ---- line editing ----
  const updateLine = (id: string, patch: Partial<EditLine>) =>
    setPages((prev) => ({
      ...prev,
      [current]: {
        ...prev[current],
        lines: prev[current].lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      },
    }));

  const eraseLine = () => {
    if (!lineSel) return;
    updateLine(lineSel.id, { text: "", dirty: true, coverColor: "#ffffff" });
  };

  // ---- overlay elements ----
  const setEls = (updater: (prev: Element[]) => Element[]) =>
    setOverlay((prev) => ({ ...prev, [current]: updater(prev[current] || []) }));

  const addElement = (el: Element) => {
    setEls((p) => [...p, el]);
    setSelLine(null);
    setSelId(el.id);
    setSelCellPos(null);
  };

  const update = (id: string, patch: Partial<Element>) =>
    setEls((p) => p.map((e) => (e.id === id ? ({ ...e, ...patch } as Element) : e)));

  const selectElement = (id: string | null, cell?: [number, number] | null) => {
    setSelLine(null);
    setSelId(id);
    setSelCellPos(cell ?? null);
  };

  const onCellPatch = (patch: Partial<TableCell>) => {
    if (!sel || sel.kind !== "table" || !selCellPos) return;
    const [r, c] = selCellPos;
    const cells = sel.cells.map((row) => row.slice());
    cells[r][c] = { ...cells[r][c], ...patch };
    update(sel.id, { cells } as Partial<Element>);
  };

  const onTableOp = (op: "addRow" | "delRow" | "addCol" | "delCol") => {
    if (!sel || sel.kind !== "table") return;
    const t = sel as TableElement;
    let cells = t.cells.map((r) => r.slice());
    let colWidths = [...t.colWidths];
    let rowHeights = [...t.rowHeights];
    if (op === "addRow") {
      cells.push(colWidths.map(() => newCell()));
      rowHeights.push(26);
    } else if (op === "delRow" && cells.length > 1) {
      const r = selCellPos ? selCellPos[0] : cells.length - 1;
      cells.splice(r, 1);
      rowHeights.splice(r, 1);
    } else if (op === "addCol") {
      cells = cells.map((row) => [...row, newCell()]);
      colWidths.push(110);
    } else if (op === "delCol" && colWidths.length > 1) {
      const c = selCellPos ? selCellPos[1] : colWidths.length - 1;
      cells = cells.map((row) => row.filter((_, i) => i !== c));
      colWidths.splice(c, 1);
    }
    update(t.id, { cells, colWidths, rowHeights } as Partial<Element>);
  };

  const delElement = () => {
    if (!selId) return;
    setEls((p) => p.filter((e) => e.id !== selId));
    setSelId(null);
  };

  // ---- export ----
  const safeStr = (font: any, s: string, size: number) => {
    try {
      font.widthOfTextAtSize(s, size);
      return s;
    } catch {
      return s.replace(/[^\x20-\x7E]/g, "?");
    }
  };

  const exportPdf = async () => {
    if (!bytes) return;
    setBusy(true);
    setError(null);
    try {
      const fontkit = (await import("@pdf-lib/fontkit")).default as any;
      const doc = await PDFDocument.load(bytes);
      doc.registerFontkit(fontkit);
      const fonts = await embedFontSet(doc);
      const docPages = doc.getPages();
      const keys = new Set<number>([
        ...Object.keys(pages).map(Number),
        ...Object.keys(overlay).map(Number),
      ]);

      for (const pageNo of keys) {
        const p = docPages[pageNo - 1];
        if (!p) continue;
        const ph = p.getHeight();
        const extract = pages[pageNo];

        // Re-embed this page's original fonts so edited lines can keep their
        // typeface. Each entry pairs the pdf-lib font with a fontkit handle used
        // to check whether the new text's glyphs actually exist in the font.
        const embedded: Record<string, { font: any; fk: any } | null> = {};
        const getEmbedded = async (loadedName?: string) => {
          if (!loadedName || !extract) return null;
          if (loadedName in embedded) return embedded[loadedName];
          let res: { font: any; fk: any } | null = null;
          const data = extract.fontData[loadedName];
          if (data) {
            try {
              const fk = fontkit.create(data);
              const font = await doc.embedFont(data, { subset: true });
              res = { font, fk };
            } catch {
              res = null;
            }
          }
          embedded[loadedName] = res;
          return res;
        };
        const covers = (fk: any, text: string) => {
          for (const ch of text) {
            if (ch === "\n") continue;
            const cp = ch.codePointAt(0)!;
            try {
              if (!fk.hasGlyphForCodePoint(cp)) return false;
            } catch {
              return false;
            }
          }
          return true;
        };

        // 1) edited existing-text lines: mask original + redraw
        if (extract) {
          for (const line of extract.lines) {
            if (!line.dirty && !line.isNew) continue;
            const size = line.fontSizePdf;
            const sublines = line.text.split("\n");

            // Prefer the original embedded font when it can render the new text.
            let font = pickFont(fonts, line.font, line.bold, false);
            const emb = await getEmbedded(line.loadedName);
            if (emb && covers(emb.fk, line.text)) font = emb.font;

            const measure = (s: string) => {
              try {
                return font.widthOfTextAtSize(safeStr(font, s, size), size);
              } catch {
                return line.widthPdf;
              }
            };
            const textWidth = Math.max(line.widthPdf, ...sublines.map(measure));

            if (!line.isNew && line.coverColor !== "transparent") {
              p.drawRectangle({
                x: line.xPdf - 1,
                y: line.baselinePdf - size * 0.28,
                width: textWidth + 2,
                height: size * 1.28 + (sublines.length - 1) * size * 1.15,
                color: hexToRgb(line.coverColor),
              });
            }
            sublines.forEach((s, i) => {
              const str = safeStr(font, s, size);
              if (!str) return;
              const y = line.baselinePdf - i * size * 1.15;
              try {
                p.drawText(str, { x: line.xPdf, y, size, font, color: hexToRgb(line.color) });
              } catch {
                const fb = pickFont(fonts, line.font, line.bold, false);
                p.drawText(safeStr(fb, s, size), { x: line.xPdf, y, size, font: fb, color: hexToRgb(line.color) });
              }
            });
          }
        }

        // 2) overlay elements (text boxes + tables + shapes/images)
        const overlayEls = overlay[pageNo] || [];
        if (overlayEls.length) await drawElements(doc, p, ph, fonts, overlayEls);
      }

      const out = await doc.save();
      download(out, (file?.name.replace(/\.pdf$/i, "") || "document") + "-edited.pdf");
    } catch (e) {
      console.error(e);
      setError("Export failed. The PDF may be encrypted or use unsupported features.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell
      title="Edit text"
      description="Edit existing lines in place, or insert formatted text boxes and tables. Untouched text stays crisp and selectable."
    >
      {!file ? (
        <FileDropzone label="Drop a PDF here or click to browse" onFiles={onFiles} />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
            <span className="truncate text-sm font-medium text-slate-800">{file.name}</span>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => goto(current - 1)} disabled={current <= 1} className="rounded-md border border-slate-300 px-2 py-1 text-sm disabled:opacity-40">‹</button>
              <span className="text-sm text-slate-500">Page {current} / {numPages}</span>
              <button onClick={() => goto(current + 1)} disabled={current >= numPages} className="rounded-md border border-slate-300 px-2 py-1 text-sm disabled:opacity-40">›</button>
              <Button variant="ghost" disabled={!page} onClick={() => page && addElement(newText(page.pdfWidth * 0.12, page.pdfHeight * 0.12))}>+ Text box</Button>
              <Button variant="ghost" disabled={!page} onClick={() => page && addElement(newTable(page.pdfWidth * 0.12, page.pdfHeight * 0.2))}>+ Table</Button>
              <Button variant="ghost" onClick={() => { setFile(null); setBytes(null); setPages({}); setOverlay({}); }}>Change</Button>
              <Button onClick={exportPdf} busy={busy}>Export PDF</Button>
            </div>
          </div>

          <FormatToolbar
            element={sel}
            cellCoords={selCellPos}
            cell={selCell}
            onPatch={(patch) => sel && update(sel.id, patch)}
            onCellPatch={onCellPatch}
            onTableOp={onTableOp}
            onDelete={delElement}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="flex flex-1 justify-center overflow-auto rounded-2xl bg-slate-200 p-6">
              {loading || !page ? (
                <p className="py-20 text-slate-500">Rendering page…</p>
              ) : (
                <div
                  onPointerDown={deselectAll}
                  className="relative shrink-0 bg-white shadow-lg"
                  style={{ width: page.pdfWidth * SCALE, height: page.pdfHeight * SCALE }}
                >
                  <img src={page.url} alt={`Page ${current}`} className="pointer-events-none absolute inset-0 h-full w-full select-none" draggable={false} />
                  {page.lines.map((l) => (
                    <EditableLine
                      key={l.id}
                      line={l}
                      pdfHeight={page.pdfHeight}
                      selected={l.id === selLine}
                      onSelect={(id) => { setSelId(null); setSelLine(id); }}
                      onChange={updateLine}
                    />
                  ))}
                  <ElementsLayer
                    elements={els}
                    scale={SCALE}
                    selectedId={selId}
                    selectedCell={selCellPos}
                    onSelect={selectElement}
                    onChange={update}
                  />
                </div>
              )}
            </div>

            <aside className="w-full shrink-0 space-y-4 lg:w-64">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-700">Selected line</h3>
                {!lineSel ? (
                  <p className="mt-2 text-sm text-slate-400">
                    Click existing text to edit it here, or use the toolbar above for
                    inserted text boxes and tables.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3 text-sm">
                    <label className="block">
                      <span className="text-slate-500">Content</span>
                      <textarea value={lineSel.text} onChange={(e) => updateLine(lineSel.id, { text: e.target.value, dirty: true })} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5" />
                    </label>
                    <label className="block">
                      <span className="text-slate-500">Size: {Math.round(lineSel.fontSizePdf)}</span>
                      <input type="range" min={6} max={72} value={lineSel.fontSizePdf} onChange={(e) => updateLine(lineSel.id, { fontSizePdf: +e.target.value, dirty: true })} className="w-full" />
                    </label>
                    <label className="block">
                      <span className="text-slate-500">Font</span>
                      <select value={lineSel.font} onChange={(e) => updateLine(lineSel.id, { font: e.target.value as FontFamily, dirty: true })} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5">
                        <option value="Helvetica">Helvetica</option>
                        <option value="Times">Times</option>
                        <option value="Courier">Courier</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={lineSel.bold} onChange={(e) => updateLine(lineSel.id, { bold: e.target.checked, dirty: true })} />
                      <span className="text-slate-500">Bold</span>
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-slate-500">Text colour</span>
                      <input type="color" value={lineSel.color} onChange={(e) => updateLine(lineSel.id, { color: e.target.value, dirty: true })} />
                    </label>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Mask colour</span>
                        <input
                          type="color"
                          disabled={lineSel.coverColor === "transparent"}
                          value={lineSel.coverColor === "transparent" ? "#ffffff" : lineSel.coverColor}
                          onChange={(e) => updateLine(lineSel.id, { coverColor: e.target.value, dirty: true })}
                          className={lineSel.coverColor === "transparent" ? "opacity-40" : ""}
                        />
                      </div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={lineSel.coverColor === "transparent"}
                          onChange={(e) =>
                            updateLine(lineSel.id, {
                              coverColor: e.target.checked ? "transparent" : "#ffffff",
                              dirty: true,
                            })
                          }
                        />
                        <span className="text-slate-500">Transparent (no mask)</span>
                      </label>
                    </div>
                    <Button variant="danger" className="w-full" onClick={eraseLine}>Erase text</Button>
                  </div>
                )}
              </div>
              <p className="px-1 text-xs text-slate-400">
                Inserted text boxes &amp; tables export with full formatting. Edited lines
                are masked and redrawn; untouched lines keep their original vector text.
              </p>
            </aside>
          </div>
        </div>
      )}
    </ToolShell>
  );
}
