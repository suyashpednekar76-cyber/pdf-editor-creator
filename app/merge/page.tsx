"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import ToolShell from "@/components/ToolShell";
import FileDropzone from "@/components/FileDropzone";
import Button from "@/components/Button";
import { download, formatBytes, uid } from "@/lib/utils";

type Item = { id: string; file: File };

export default function MergePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = (files: File[]) =>
    setItems((prev) => [...prev, ...files.map((file) => ({ id: uid(), file }))]);

  const move = (index: number, dir: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const remove = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const merge = async () => {
    setError(null);
    setBusy(true);
    try {
      const out = await PDFDocument.create();
      for (const { file } of items) {
        const bytes = await file.arrayBuffer();
        const src = await PDFDocument.load(bytes);
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      }
      const result = await out.save();
      download(result, "merged.pdf");
    } catch (e) {
      setError(
        "Could not merge these files. One may be encrypted or corrupted."
      );
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell
      title="Merge PDF"
      description="Combine multiple PDFs into one. Drag to add files, reorder, then merge."
    >
      <FileDropzone
        multiple
        label="Drop PDFs here or click to browse"
        hint="Add two or more files"
        onFiles={add}
      />

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li
              key={it.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-600">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {it.file.name}
                </p>
                <p className="text-xs text-slate-400">
                  {formatBytes(it.file.size)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                  aria-label="Move up"
                >
                  ▲
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                  aria-label="Move down"
                >
                  ▼
                </button>
                <button
                  onClick={() => remove(it.id)}
                  className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button onClick={merge} busy={busy} disabled={items.length < 2}>
          Merge {items.length > 0 ? `${items.length} files` : ""}
        </Button>
        {items.length > 0 && (
          <Button variant="ghost" onClick={() => setItems([])}>
            Clear
          </Button>
        )}
      </div>
    </ToolShell>
  );
}
