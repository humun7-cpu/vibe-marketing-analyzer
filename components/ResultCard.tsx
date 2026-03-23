import type { ReactNode } from "react";

type ResultCardProps = {
  title: string;
  emoji: string;
  children: ReactNode;
};

export default function ResultCard({ title, emoji, children }: ResultCardProps) {
  return (
    <article className="rounded-xl border border-slate-100 bg-white p-6 shadow-md shadow-slate-200/60 transition hover:shadow-lg">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
        <span className="text-2xl leading-none" aria-hidden>
          {emoji}
        </span>
        {title}
      </h2>
      <div className="max-w-none text-[15px] leading-relaxed text-slate-700">
        {children}
      </div>
    </article>
  );
}
