"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import ToolShell from "@/components/ToolShell";
import FileDropzone from "@/components/FileDropzone";
import Button from "@/components/Button";
import { download, uid } from "@/lib/utils";

type Item = { id: string; file: File; url: string };
type Fit = "fit" | "fill";

const A4 = { w: 595, h: 842 };

export default function ImageToPdfPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [fit, setFit] = useState<Fit>("fit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = (files: File[]) =>
    setItems((prev) => [
      ...prev,
      ...files
        .filter((f) => f.type.startsWith("image/"))
        .map((file) => ({ id: uid(), file, url: URL.createObjectURL(file) })),
    ]);

  const move = (i: number, dir: -1 | 1) =>
    setItems((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const remove = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const build = async () => {
    setBusy(true);
    setError(null);
    try {
      const doc = await PDFDocument.create();
      for (const { file } of items) {
        const bytes = await file.arrayBuffer();
        const img = file.type.includes("png")
          ? await doc.embedPng(bytes)
          : await doc.embedJpg(bytes);
        const page = doc.addPage([A4.w, A4.h]);
        const scale =
          fit === "fit"
            ? Math.min(A4.w / img.width, A4.h / img.height)
            : Math.max(A4.w / img.width, A4.h / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        page.drawImage(img, {
          x: (A4.w - w) / 2,
          y: (A4.h - h) / 2,
          width: w,
          height: h,
        });
      }
      const data = await doc.save();
      download(data, "images.pdf");
    } catch (e) {
      console.error(e);
      setError("Could not convert. Use JPG or PNG images only.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell
      title="Images to PDF"
      description="Combine JPG and PNG images into a single PDF, one image per A4 page."
    >
      <FileDropzone
        accept="image/png,image/jpeg"
        multiple
        label="Drop images here or click to browse"
        hint="JPG and PNG"
        onFiles={add}
      />

      {items.length > 0 && (
        <>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">Layout:</span>
            <label className="flex items-center gap-1">
              <input type="radio" checked={fit === "fit"} onChange={() => setFit("fit")} />
              Fit (whole image)
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={fit === "fill"} onChange={() => setFit("fill")} />
              Fill page
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {items.map((it, i) => (
              <div key={it.id} className="group relative rounded-lg border border-slate-200 bg-white p-1">
                <img src={it.url} alt="" className="h-24 w-full rounded object-contain" />
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-xs text-white">{i + 1}</span>
                <div className="mt-1 flex justify-center gap-1">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="px-1 text-xs text-slate-500 disabled:opacity-30">◀</button>
                  <button onClick={() => remove(it.id)} className="px-1 text-xs text-red-500">✕</button>
                  <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="px-1 text-xs text-slate-500 disabled:opacity-30">▶</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button onClick={build} busy={busy} disabled={!items.length}>
        Create PDF
      </Button>
    </ToolShell>
  );
}
