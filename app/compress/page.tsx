"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import ToolShell from "@/components/ToolShell";
import FileDropzone from "@/components/FileDropzone";
import Button from "@/components/Button";
import { getPdfjs } from "@/lib/pdfjs";
import { download, formatBytes } from "@/lib/utils";

type Level = "low" | "medium" | "high";

const presets: Record<Level, { scale: number; quality: number; label: string }> = {
  low: { scale: 1.5, quality: 0.8, label: "Light — best quality" },
  medium: { scale: 1.2, quality: 0.6, label: "Recommended — balanced" },
  high: { scale: 0.9, quality: 0.45, label: "Strong — smallest size" },
};

export default function CompressPage() {
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<ArrayBuffer | null>(null);
  const [level, setLevel] = useState<Level>("medium");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ data: Uint8Array; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (files: File[]) => {
    setError(null);
    setResult(null);
    const f = files[0];
    setFile(f);
    setBytes(await f.arrayBuffer());
  };

  const compress = async () => {
    if (!bytes) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const { scale, quality } = presets[level];
      const pdfjs = getPdfjs();
      const src = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;
      const out = await PDFDocument.create();

      for (let i = 1; i <= src.numPages; i++) {
        const page = await src.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;

        const jpeg = canvas.toDataURL("image/jpeg", quality);
        const jpegBytes = await fetch(jpeg).then((r) => r.arrayBuffer());
        const img = await out.embedJpg(jpegBytes);
        // Keep original page dimensions (points) so layout is preserved.
        const base = page.getViewport({ scale: 1 });
        const p = out.addPage([base.width, base.height]);
        p.drawImage(img, { x: 0, y: 0, width: base.width, height: base.height });
      }
      src.destroy();

      const data = await out.save();
      setResult({ data, size: data.byteLength });
    } catch (e) {
      console.error(e);
      setError("Compression failed. The PDF may be encrypted or corrupted.");
    } finally {
      setBusy(false);
    }
  };

  const saved =
    result && file ? 1 - result.size / file.size : 0;

  return (
    <ToolShell
      title="Compress PDF"
      description="Shrink large or scanned PDFs by re-encoding pages as optimized images."
    >
      {!file ? (
        <FileDropzone label="Drop a PDF here or click to browse" onFiles={load} />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-sm">
              <span className="font-medium text-slate-800">{file.name}</span>{" "}
              <span className="text-slate-400">· {formatBytes(file.size)}</span>
            </p>
            <button
              onClick={() => { setFile(null); setBytes(null); setResult(null); }}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Change
            </button>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
            {(Object.keys(presets) as Level[]).map((lv) => (
              <label key={lv} className="flex items-center gap-3">
                <input type="radio" checked={level === lv} onChange={() => setLevel(lv)} />
                <span className="text-sm text-slate-700">{presets[lv].label}</span>
              </label>
            ))}
            <p className="pt-1 text-xs text-slate-400">
              Note: text becomes part of the page image, so this is best for scanned
              or image-heavy documents.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {result ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm text-slate-700">
                Compressed to <strong>{formatBytes(result.size)}</strong>{" "}
                {saved > 0 ? (
                  <span className="font-semibold text-green-700">
                    ({Math.round(saved * 100)}% smaller)
                  </span>
                ) : (
                  <span className="text-slate-500">
                    (already optimized — try a stronger level)
                  </span>
                )}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  onClick={() =>
                    download(result.data, file.name.replace(/\.pdf$/i, "") + "-compressed.pdf")
                  }
                >
                  Download
                </Button>
                <Button variant="ghost" onClick={compress} busy={busy}>
                  Re-run
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={compress} busy={busy}>
              Compress PDF
            </Button>
          )}
        </div>
      )}
    </ToolShell>
  );
}
