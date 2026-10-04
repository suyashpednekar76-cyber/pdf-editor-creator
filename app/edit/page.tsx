"use client";

import { useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ToolShell from "@/components/ToolShell";
import FileDropzone from "@/components/FileDropzone";
import Button from "@/components/Button";
import { renderPageToDataUrl, getPageCount } from "@/lib/pdfjs";
import { download } from "@/lib/utils";

type Page = {
  id: string;
  index: number; // original 0-based page index
  rotation: number; // degrees, multiple of 90
  thumb: string;
};

function Thumb({
  page,
  onRotate,
  onDelete,
}: {
  page: Page;
  onRotate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: page.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="group relative rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab overflow-hidden rounded-lg bg-slate-100 active:cursor-grabbing"
      >
        <img
          src={page.thumb}
          alt={`Page ${page.index + 1}`}
          style={{ transform: `rotate(${page.rotation}deg)` }}
          className="mx-auto max-h-44 w-auto transition-transform"
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">
          p.{page.index + 1}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => onRotate(page.id)}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Rotate"
            title="Rotate 90°"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(page.id)}
            className="rounded-md p-1 text-red-500 hover:bg-red-50"
            aria-label="Delete page"
            title="Delete page"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EditPage() {
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<ArrayBuffer | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const load = async (files: File[]) => {
    setError(null);
    setLoading(true);
    const f = files[0];
    try {
      const buf = await f.arrayBuffer();
      const count = await getPageCount(buf);
      const built: Page[] = [];
      for (let i = 1; i <= count; i++) {
        const thumb = await renderPageToDataUrl(buf, i, 0.4);
        built.push({ id: `p${i}`, index: i - 1, rotation: 0, thumb });
      }
      setFile(f);
      setBytes(buf);
      setPages(built);
    } catch (e) {
      setError("Could not open this PDF. It may be encrypted or corrupted.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setPages((prev) => {
      const from = prev.findIndex((p) => p.id === active.id);
      const to = prev.findIndex((p) => p.id === over.id);
      return arrayMove(prev, from, to);
    });
  };

  const rotate = (id: string) =>
    setPages((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p
      )
    );

  const del = (id: string) =>
    setPages((prev) => prev.filter((p) => p.id !== id));

  const save = async () => {
    if (!bytes || !pages.length) return;
    setBusy(true);
    setError(null);
    try {
      const src = await PDFDocument.load(bytes);
      const out = await PDFDocument.create();
      const copied = await out.copyPages(
        src,
        pages.map((p) => p.index)
      );
      copied.forEach((p, i) => {
        const base = src.getPage(pages[i].index).getRotation().angle;
        p.setRotation(degrees((base + pages[i].rotation) % 360));
        out.addPage(p);
      });
      const data = await out.save();
      download(data, (file?.name.replace(/\.pdf$/i, "") || "edited") + "-edited.pdf");
    } catch (e) {
      setError("Could not save changes. Please try again.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell
      title="Edit pages"
      description="Drag to reorder, rotate, or delete pages. Then export your new PDF."
    >
      {!file ? (
        <FileDropzone label="Drop a PDF here or click to browse" onFiles={load} />
      ) : loading ? (
        <p className="text-slate-500">Rendering page thumbnails…</p>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-sm">
              <span className="font-medium text-slate-800">{file.name}</span>{" "}
              <span className="text-slate-400">· {pages.length} pages</span>
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => { setFile(null); setBytes(null); setPages([]); }}>
                Change file
              </Button>
              <Button onClick={save} busy={busy} disabled={!pages.length}>
                Export PDF
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {pages.map((p) => (
                  <Thumb key={p.id} page={p} onRotate={rotate} onDelete={del} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {!pages.length && (
            <p className="text-sm text-slate-500">
              All pages deleted. Add the file again to start over.
            </p>
          )}
        </div>
      )}
    </ToolShell>
  );
}
