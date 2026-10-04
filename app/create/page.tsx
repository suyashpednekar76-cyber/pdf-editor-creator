"use client";

import { useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import ToolShell from "@/components/ToolShell";
import Button from "@/components/Button";
import ElementsLayer from "@/components/elements/ElementsLayer";
import FormatToolbar from "@/components/elements/FormatToolbar";
import {
  type Element,
  type TableElement,
  type TableCell,
  newText,
  newTable,
  newRect,
  newCell,
  embedFontSet,
  drawElements,
} from "@/lib/elements";
import { download, uid } from "@/lib/utils";

const PAGE_W = 595;
const PAGE_H = 842;
const SCALE = 1;

export default function CreatePage() {
  const [pages, setPages] = useState<Element[][]>([[]]);
  const [current, setCurrent] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const els = pages[current];
  const sel = els.find((e) => e.id === selectedId) || null;
  const selCell: TableCell | null =
    sel && sel.kind === "table" && selectedCell ? sel.cells[selectedCell[0]]?.[selectedCell[1]] || null : null;

  const setEls = (updater: (prev: Element[]) => Element[]) =>
    setPages((prev) => prev.map((p, i) => (i === current ? updater(p) : p)));

  const add = (el: Element) => {
    setEls((p) => [...p, el]);
    setSelectedId(el.id);
    setSelectedCell(null);
  };

  const update = (id: string, patch: Partial<Element>) =>
    setEls((p) => p.map((e) => (e.id === id ? ({ ...e, ...patch } as Element) : e)));

  const select = (id: string | null, cell?: [number, number] | null) => {
    setSelectedId(id);
    setSelectedCell(cell ?? null);
  };

  const onCellPatch = (patch: Partial<TableCell>) => {
    if (!sel || sel.kind !== "table" || !selectedCell) return;
    const [r, c] = selectedCell;
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
      const r = selectedCell ? selectedCell[0] : cells.length - 1;
      cells.splice(r, 1);
      rowHeights.splice(r, 1);
    } else if (op === "addCol") {
      cells = cells.map((row) => [...row, newCell()]);
      colWidths.push(110);
    } else if (op === "delCol" && colWidths.length > 1) {
      const c = selectedCell ? selectedCell[1] : colWidths.length - 1;
      cells = cells.map((row) => row.filter((_, i) => i !== c));
      colWidths.splice(c, 1);
    }
    update(t.id, { cells, colWidths, rowHeights } as Partial<Element>);
  };

  const del = () => {
    if (!selectedId) return;
    setEls((p) => p.filter((e) => e.id !== selectedId));
    select(null);
  };

  const addImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const maxW = 280;
        const s = Math.min(1, maxW / img.width);
        add({
          kind: "image",
          id: uid(),
          x: 80,
          y: 300,
          width: img.width * s,
          height: img.height * s,
          src,
          mime: file.type,
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const exportPdf = async () => {
    setBusy(true);
    try {
      const doc = await PDFDocument.create();
      const fonts = await embedFontSet(doc);
      for (const pageEls of pages) {
        const page = doc.addPage([PAGE_W, PAGE_H]);
        await drawElements(doc, page, PAGE_H, fonts, pageEls);
      }
      const data = await doc.save();
      download(data, "document.pdf");
    } catch (e) {
      console.error(e);
      alert("Export failed. If you added an image, try a JPG or PNG.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell
      title="Create PDF"
      description="Build a PDF from a blank page with rich text, tables, shapes and images. Format with the toolbar, then export."
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={() => add(newText(60, 80))}>+ Text</Button>
        <Button variant="ghost" onClick={() => add(newTable(60, 200))}>+ Table</Button>
        <Button variant="ghost" onClick={() => add(newRect(80, 160))}>+ Rectangle</Button>
        <Button variant="ghost" onClick={() => fileRef.current?.click()}>+ Image</Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) addImage(e.target.files[0]);
            e.target.value = "";
          }}
        />
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setPages((p) => [...p, []]);
              setCurrent(pages.length);
              select(null);
            }}
          >
            + Page
          </Button>
          <Button onClick={exportPdf} busy={busy}>Export PDF</Button>
        </div>
      </div>

      <FormatToolbar
        element={sel}
        cellCoords={selectedCell}
        cell={selCell}
        onPatch={(patch) => sel && update(sel.id, patch)}
        onCellPatch={onCellPatch}
        onTableOp={onTableOp}
        onDelete={del}
      />

      {pages.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); select(null); }}
              className={`rounded-lg px-3 py-1 text-sm font-medium ${
                i === current ? "bg-brand-500 text-white" : "border border-slate-300 bg-white text-slate-600"
              }`}
            >
              Page {i + 1}
            </button>
          ))}
          <button
            onClick={() => {
              if (pages.length <= 1) return;
              setPages((p) => p.filter((_, i) => i !== current));
              setCurrent((c) => Math.max(0, c - 1));
              select(null);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm text-red-600"
          >
            Delete page
          </button>
        </div>
      )}

      <div className="flex gap-6">
        <div className="flex flex-1 justify-center overflow-auto rounded-2xl bg-slate-200 p-6">
          <div
            onPointerDown={() => select(null)}
            className="relative shrink-0 bg-white shadow-lg"
            style={{ width: PAGE_W * SCALE, height: PAGE_H * SCALE }}
          >
            <ElementsLayer
              elements={els}
              scale={SCALE}
              selectedId={selectedId}
              selectedCell={selectedCell}
              onSelect={select}
              onChange={update}
            />
          </div>
        </div>

        {sel && (sel.kind === "rect" || sel.kind === "image") && (
          <aside className="w-56 shrink-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <h3 className="font-semibold text-slate-700">
              {sel.kind === "rect" ? "Rectangle" : "Image"}
            </h3>
            <label className="block">
              <span className="text-slate-500">Width: {Math.round(sel.width)}</span>
              <input
                type="range"
                min={20}
                max={PAGE_W}
                value={sel.width}
                onChange={(e) => {
                  const w = +e.target.value;
                  if (sel.kind === "image") {
                    const ratio = sel.height / sel.width;
                    update(sel.id, { width: w, height: w * ratio } as Partial<Element>);
                  } else {
                    update(sel.id, { width: w } as Partial<Element>);
                  }
                }}
                className="w-full"
              />
            </label>
            {sel.kind === "rect" && (
              <>
                <label className="block">
                  <span className="text-slate-500">Height: {Math.round(sel.height)}</span>
                  <input type="range" min={20} max={PAGE_H} value={sel.height} onChange={(e) => update(sel.id, { height: +e.target.value } as Partial<Element>)} className="w-full" />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-slate-500">Fill</span>
                  <input type="color" value={sel.color} onChange={(e) => update(sel.id, { color: e.target.value } as Partial<Element>)} />
                </label>
              </>
            )}
            <Button variant="danger" className="w-full" onClick={del}>Delete</Button>
          </aside>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Tip: drag the ✜ handle to move an element, the right edge to resize a text box,
        and column edges to resize table columns. Double-click into table cells to type.
      </p>
    </ToolShell>
  );
}
