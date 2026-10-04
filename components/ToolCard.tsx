import Link from "next/link";
import type { ReactNode } from "react";

export default function ToolCard({
  href,
  title,
  desc,
  icon,
  accent,
}: {
  href: string;
  title: string;
  desc: string;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
    >
      <span
        className="grid h-11 w-11 place-items-center rounded-xl text-white"
        style={{ background: accent }}
      >
        {icon}
      </span>
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm leading-snug text-slate-500">{desc}</p>
      </div>
      <span className="mt-auto text-sm font-medium text-brand-600 opacity-0 transition group-hover:opacity-100">
        Open tool →
      </span>
    </Link>
  );
}
