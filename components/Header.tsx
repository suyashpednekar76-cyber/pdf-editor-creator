import Link from "next/link";
import UserMenu from "@/components/UserMenu";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-line bg-white/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-white shadow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
          </span>
          <span className="text-lg font-semibold tracking-tight text-ink">
            <span className="text-brand-500">PDF Studio</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <nav className="hidden gap-1 text-sm font-medium text-ink-soft md:flex">
            <Link href="/merge" className="rounded-md px-3 py-1.5 hover:bg-brand-50 hover:text-brand-600">Merge</Link>
            <Link href="/split" className="rounded-md px-3 py-1.5 hover:bg-brand-50 hover:text-brand-600">Split</Link>
            <Link href="/edit-text" className="rounded-md px-3 py-1.5 hover:bg-brand-50 hover:text-brand-600">Edit text</Link>
            <Link href="/edit" className="rounded-md px-3 py-1.5 hover:bg-brand-50 hover:text-brand-600">Pages</Link>
            <Link href="/create" className="rounded-md px-3 py-1.5 hover:bg-brand-50 hover:text-brand-600">Create</Link>
          </nav>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
