import ToolCard from "@/components/ToolCard";
import {
  MergeIcon,
  SplitIcon,
  EditIcon,
  TextIcon,
  CreateIcon,
  ImageIcon,
  ExportImageIcon,
  CompressIcon,
} from "@/components/icons";

const tools = [
  {
    href: "/merge",
    title: "Merge PDF",
    desc: "Combine several PDFs into a single document, in any order.",
    icon: <MergeIcon />,
    accent: "#e14504",
  },
  {
    href: "/split",
    title: "Split PDF",
    desc: "Extract page ranges or break a PDF into individual pages.",
    icon: <SplitIcon />,
    accent: "#9e3103",
  },
  {
    href: "/edit-text",
    title: "Edit text",
    desc: "Click any line to change the words in place, restyle, add or erase text.",
    icon: <TextIcon />,
    accent: "#0ea5e9",
  },
  {
    href: "/edit",
    title: "Organize pages",
    desc: "Reorder, rotate and delete pages with live thumbnails.",
    icon: <EditIcon />,
    accent: "#6366f1",
  },
  {
    href: "/create",
    title: "Create PDF",
    desc: "Start from a blank canvas — add text, shapes and images.",
    icon: <CreateIcon />,
    accent: "#16a34a",
  },
  {
    href: "/image-to-pdf",
    title: "Images to PDF",
    desc: "Turn JPG and PNG images into a clean, ordered PDF.",
    icon: <ImageIcon />,
    accent: "#f59e0b",
  },
  {
    href: "/pdf-to-image",
    title: "PDF to images",
    desc: "Render each page to a high-quality PNG you can download.",
    icon: <ExportImageIcon />,
    accent: "#ef4444",
  },
  {
    href: "/compress",
    title: "Compress PDF",
    desc: "Reduce file size by re-encoding images and stripping bloat.",
    icon: <CompressIcon />,
    accent: "#0d9488",
  },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-ink-line bg-white px-6 py-12 text-center shadow-sm sm:px-12">
        <h1 className="text-3xl font-bold tracking-tight text-brand-500 sm:text-4xl">
          Every tool you need to work with PDFs
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-black">
          Merge, split, edit, create, convert and compress — all in your browser.
          Files are processed locally and never uploaded.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Tools
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((t) => (
            <ToolCard key={t.href} {...t} />
          ))}
        </div>
      </section>
    </div>
  );
}
