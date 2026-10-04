"use client";

import { useState } from "react";
import ToolShell from "@/components/ToolShell";
import FileDropzone from "@/components/FileDropzone";
import Button from "@/components/Button";
import { getPageCount, renderPageToDataUrl } from "@/lib/pdfjs";
import { download } from "@/lib/utils";

type Rendered = { page: number; url: string };

export default function PdfToImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [images, setImages] = useState<Rendered[]>([]);
  const [loading, setLoading] = useState(false);
  const [scale, setScale] = useState(2);
  const [error, setError] = useState<string | null>(null);

  const load = async (files: File[], s = scale) => {
    setError(null);
    setLoading(true);
    const f = files[0];
    try {
      const buf = await f.arrayBuffer();
      const count = await getPageCount(buf);
      const out: Rendered[] = [];
      for (let i = 1; i <= count; i++) {
        out.push({ page: i, url: await renderPageToDataUrl(buf, i, s) });
      }
      setFile(f);
      setImages(out);
    } catch (e) {
      console.error(e);
      setError("Could not render this PDF. It may be encrypted or corrupted.");
    } finally {
      setLoading(false);
    }
  };

  const dataUrlToBytes = (url: string) => {
    const b64 = url.split(",")[1];
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  };

  const base = file?.name.replace(/\.pdf$/i, "") || "page";

  return (
    <ToolShell
      title="PDF to images"
      description="Render each page to a PNG. Choose quality, then download pages individually."
    >
      {!file ? (
        <>
          <div className="mb-3 flex items-center gap-3 text-sm">
            <span className="text-slate-500">Quality:</span>
            {[1, 2, 3].map((s) => (
              <label key={s} className="flex items-center gap-1">
                <input type="radio" checked={scale === s} onChange={() => setScale(s)} />
                {s === 1 ? "Standard" : s === 2 ? "High" : "Max"}
              </label>
            ))}
          </div>
          <FileDropzone label="Drop a PDF here or click to browse" onFiles={(f) => load(f)} />
        </>
      ) : loading ? (
        <p className="text-slate-500">Rendering pages…</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-sm">
              <span className="font-medium text-slate-800">{file.name}</span>{" "}
              <span className="text-slate-400">· {images.length} pages</span>
            </p>
            <button
              onClick={() => { setFile(null); setImages([]); }}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Change
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {images.map((img) => (
              <div key={img.page} className="rounded-xl border border-slate-200 bg-white p-2">
                <img src={img.url} alt={`Page ${img.page}`} className="w-full rounded" />
                <Button
                  variant="ghost"
                  className="mt-2 w-full"
                  onClick={() => download(dataUrlToBytes(img.url), `${base}-${img.page}.png`, "image/png")}
                >
                  Download p.{img.page}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </ToolShell>
  );
}
