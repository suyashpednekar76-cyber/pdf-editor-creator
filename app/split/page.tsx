"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import ToolShell from "@/components/ToolShell";
import FileDropzone from "@/components/FileDropzone";
import Button from "@/components/Button";
import { download, parseRanges } from "@/lib/utils";

type Mode = "ranges" | "each";

export default function SplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState<Mode>("ranges");
  const [ranges, setRanges] = useState("1-1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (files: File[]) => {
    setError(null);
    const f = files[0];
    const buf = await f.arrayBuffer();
    try {
      const doc = await PDFDocument.load(buf);
      setFile(f);
      setBytes(buf);
      setPageCount(doc.getPageCount());
      setRanges(`1-${doc.getPageCount()}`);
    } catch (e) {
      setError("Could not read this PDF. It may be encrypted or corrupted.");
    }
  };

  const extractTo = async (pages: number[]) => {
    const src = await PDFDocument.load(bytes!);
    const out = await PDFDocument.create();
    const copied = await out.copyPages(
      src,
      pages.map((p) => p - 1)
    );
    copied.forEach((p) => out.addPage(p));
    return out.save();
  };

  const run = async () => {
    if (!bytes || !file) return;
    setError(null);
    setBusy(true);
    try {
      const base = file.name.replace(/\.pdf$/i, "");
      if (mode === "each") {
        for (let i = 1; i <= pageCount; i++) {
          const data = await extractTo([i]);
          download(data, `${base}-page-${i}.pdf`);
        }
      } else {
        const pages = parseRanges(ranges, pageCount);
        if (!pages.length) {
          setError("No valid pages in that range.");
          return;
        }
        const data = await extractTo(pages);
        download(data, `${base}-extract.pdf`);
      }
    } catch (e) {
      setError("Split failed. Please try a different file.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell
      title="Split PDF"
      description="Extract specific pages into a new PDF, or split every page into its own file."
    >
      {!file ? (
        <FileDropzone label="Drop a PDF here or click to browse" onFiles={load} />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-sm">
              <span className="font-medium text-slate-800">{file.name}</span>{" "}
              <span className="text-slate-400">· {pageCount} pages</span>
            </p>
            <button
              onClick={() => {
                setFile(null);
                setBytes(null);
              }}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Change
            </button>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <label className="flex items-start gap-3">
              <input
                type="radio"
                checked={mode === "ranges"}
                onChange={() => setMode("ranges")}
                className="mt-1"
              />
              <div className="flex-1">
                <p className="font-medium text-slate-800">Extract page range</p>
                <p className="text-sm text-slate-500">
                  e.g. <code className="rounded bg-slate-100 px-1">1-3, 5, 8-10</code>
                </p>
                {mode === "ranges" && (
                  <input
                    value={ranges}
                    onChange={(e) => setRanges(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                    placeholder="1-3, 5"
                  />
                )}
              </div>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="radio"
                checked={mode === "each"}
                onChange={() => setMode("each")}
                className="mt-1"
              />
              <div>
                <p className="font-medium text-slate-800">Split into single pages</p>
                <p className="text-sm text-slate-500">
                  Download one PDF per page ({pageCount} files).
                </p>
              </div>
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button onClick={run} busy={busy}>
            {mode === "each" ? "Split all pages" : "Extract pages"}
          </Button>
        </div>
      )}
    </ToolShell>
  );
}
