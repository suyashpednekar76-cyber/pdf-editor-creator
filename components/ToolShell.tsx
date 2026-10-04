import Link from "next/link";
import type { ReactNode } from "react";

export default function ToolShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm font-medium text-brand-600 hover:underline">
          ← All tools
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1 text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  );
}
