import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "PDF Studio — Edit & Create PDFs",
  description:
    "Free in-browser PDF toolkit: merge, split, edit pages, edit text, create from scratch, convert and compress. Your files never leave your device.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <Header />
          <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6">
            {children}
          </main>
          <footer className="border-t border-ink-line bg-white/60 py-6 text-center text-sm text-ink-muted">
            PDF Studio · All processing happens locally in your browser — nothing is uploaded.
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
