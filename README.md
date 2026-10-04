# Xtreme PDF Studio

A free, in-browser PDF toolkit by Xtreme Media, inspired by iLovePDF. Every operation runs **entirely in your browser** using `pdf-lib` and `pdf.js` — no files are ever uploaded to a server.

## Tools

| Tool | What it does |
|------|--------------|
| **Merge** | Combine multiple PDFs into one, reorder before merging |
| **Split** | Extract page ranges (`1-3, 5`) or split into single-page files |
| **Edit pages** | Drag to reorder, rotate, and delete pages with live thumbnails |
| **Create** | Blank-canvas editor — add text, shapes, and images, multi-page, export to PDF |
| **Images → PDF** | Turn JPG/PNG images into an A4 PDF (fit or fill) |
| **PDF → Images** | Render each page to a downloadable PNG at chosen quality |
| **Compress** | Re-encode pages as optimized images to shrink large/scanned PDFs |

## Tech stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** for styling
- **pdf-lib** for creating/manipulating PDFs
- **pdf.js** (`pdfjs-dist`) for rendering pages to thumbnails/images
- **@dnd-kit** for drag-and-drop page reordering

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Build for production:

```bash
npm run build
npm start
```

## How it works

All processing is client-side:

- **pdf-lib** loads, copies pages between, rotates, and saves PDF documents.
- **pdf.js** rasterizes pages onto a `<canvas>` — used for thumbnails (Edit), PNG export (PDF → Images), and the Compress tool (which re-embeds each page as a JPEG).
- The pdf.js worker is loaded from a CDN matching the installed `pdfjs-dist` version (see `lib/pdfjs.ts`).

## Project structure

```
app/
  page.tsx            # home / tool grid
  merge/              # each tool is its own route
  split/
  edit/
  create/
  image-to-pdf/
  pdf-to-image/
  compress/
components/           # Header, FileDropzone, Button, ToolShell, ToolCard, icons
lib/
  pdfjs.ts            # pdf.js loader + render helpers
  utils.ts            # download, byte formatting, range parsing
```

## Notes & next steps

- **Compress** rasterizes pages, so text becomes part of the page image — best for scanned/image-heavy documents. A future version could use object-stream compression to preserve selectable text.
- **Create** uses pdf-lib standard fonts (Helvetica). Add custom font embedding for more typefaces.
- Possible additions: add text/annotations onto an existing PDF, page numbers/watermarks, password protect, and PDF → Word.

## Microsoft SSO

Optional single-tenant Microsoft (Entra ID) sign-in via MSAL — no backend needed. See **AUTH_SETUP.md** and copy `.env.local.example` to `.env.local` with your Azure client/tenant IDs.
