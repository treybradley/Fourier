import type { ReactNode } from "react";

export function Section({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-10">
      <header className="max-w-2xl space-y-3">
        <h1 className="text-2xl md:text-3xl font-medium text-white/90 tracking-tight">
          {title}
        </h1>
        <p className="text-sm text-white/45 leading-relaxed">{lead}</p>
      </header>
      {children}
    </div>
  );
}

export function Block({
  id,
  title,
  description,
  why,
  source,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  why?: string;
  source?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="space-y-4 scroll-mt-24">
      <div className="space-y-1.5 max-w-2xl">
        <h2 className="text-sm font-medium tracking-widest uppercase text-white/80">
          {title}
        </h2>
        {description ? (
          <p className="text-xs text-white/40 leading-relaxed">{description}</p>
        ) : null}
        {why ? (
          <p className="text-[11px] font-mono text-white/30 leading-relaxed">
            Why · {why}
          </p>
        ) : null}
      </div>
      {children}
      {source ? (
        <p className="text-[10px] font-mono tracking-wider text-white/20">
          {source}
        </p>
      ) : null}
    </section>
  );
}

export function CalloutGrid({
  items,
}: {
  items: { title: string; body: string }[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {items.map((item) => (
        <div
          key={item.title}
          className="rounded-sm border border-white/10 bg-white/[0.03] p-4 space-y-2"
        >
          <h3 className="text-[11px] font-mono tracking-widest uppercase text-white/70">
            {item.title}
          </h3>
          <p className="text-xs text-white/40 leading-relaxed">{item.body}</p>
        </div>
      ))}
    </div>
  );
}

export function SpecTable({
  rows,
}: {
  rows: { role: string; detail: string; note?: string }[];
}) {
  return (
    <div className="overflow-x-auto rounded-sm border border-white/10">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-white/10 text-[10px] font-mono tracking-widest uppercase text-white/35">
            <th className="px-3 py-2.5 font-normal">Role</th>
            <th className="px-3 py-2.5 font-normal">Detail</th>
            <th className="px-3 py-2.5 font-normal hidden sm:table-cell">Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.role} className="border-b border-white/5 last:border-0">
              <td className="px-3 py-2.5 text-white/75 whitespace-nowrap">
                {row.role}
              </td>
              <td className="px-3 py-2.5 text-white/45">{row.detail}</td>
              <td className="px-3 py-2.5 text-white/30 hidden sm:table-cell">
                {row.note ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Swatch({
  label,
  hex,
  cssVar,
  mono,
}: {
  label: string;
  hex: string;
  cssVar?: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-2 min-w-[5.5rem]">
      <div
        className="h-14 rounded-sm border border-white/10"
        style={{ background: mono ? "#111111" : hex }}
      />
      <div className="space-y-0.5">
        <div className="text-[11px] text-white/75">{label}</div>
        <div className="text-[10px] font-mono text-white/35">
          {mono ? "#111111" : hex}
        </div>
        {cssVar ? (
          <div className="text-[9px] font-mono text-white/25">{cssVar}</div>
        ) : null}
      </div>
    </div>
  );
}
