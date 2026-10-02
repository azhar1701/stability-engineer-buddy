import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const fmt = (v: number | null | undefined, d = 2) =>
  v === null || v === undefined || !Number.isFinite(v) ? "—" : v.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });

export function PageHeader({ code, title, desc }: { code: string; title: string; desc?: string }) {
  return (
    <div className="mb-6 border-b pb-4">
      <div className="num text-xs text-muted-foreground">{code}</div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {desc && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{desc}</p>}
    </div>
  );
}

export function Section({ title, children, aside, className }: { title: string; children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <section className={cn("mb-6 rounded-md border bg-card", className)}>
      <div className="flex items-center justify-between border-b bg-muted/60 px-4 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
        {aside}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

const inputCls = "h-9 w-full rounded-sm border border-input bg-card px-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring";

export function NumField({ label, unit, value, onChange, step = "any", hint }: { label: string; unit?: string; value: number; onChange: (v: number) => void; step?: string; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex">
        <input type="number" step={step} className={cn(inputCls, "num", unit && "rounded-r-none")} value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))} />
        {unit && <span className="num flex items-center rounded-r-sm border border-l-0 border-input bg-muted px-2 text-xs text-muted-foreground">{unit}</span>}
      </div>
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function SelectField<T extends string>({ label, value, options, onChange, hint }: { label: string; value: T; options: readonly (T | { value: T; label: string })[]; onChange: (v: T) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

const statusTone: Record<string, string> = {
  MEMENUHI: "bg-success text-success-foreground", AMAN: "bg-success text-success-foreground", LENGKAP: "bg-success text-success-foreground", FINAL: "bg-success text-success-foreground", "KONTAK PENUH": "bg-success text-success-foreground", AKTIF: "bg-success text-success-foreground",
  "PERLU TINJAU": "bg-warning text-warning-foreground", PENAPISAN: "bg-warning text-warning-foreground", SCREENING: "bg-warning text-warning-foreground", PERHATIAN: "bg-warning text-warning-foreground",
  "KONTAK PARSIAL TOE": "bg-warning text-warning-foreground", "KONTAK PARSIAL HEEL": "bg-warning text-warning-foreground",
  "TIDAK MEMENUHI": "bg-destructive text-destructive-foreground", KRITIS: "bg-destructive text-destructive-foreground", "RESULTAN DI LUAR DASAR": "bg-destructive text-destructive-foreground", "BELUM LENGKAP": "bg-destructive/15 text-destructive",
};
export function Status({ s }: { s: string }) {
  return <span className={cn("num inline-block whitespace-nowrap rounded-sm px-1.5 py-0.5 text-[11px] font-medium", statusTone[s] ?? "bg-muted text-muted-foreground")}>{s}</span>;
}

export function Notice({ tone = "warning", children }: { tone?: "warning" | "info"; children: ReactNode }) {
  return (
    <div className={cn("mb-4 rounded-sm border-l-4 px-3 py-2 text-sm", tone === "warning" ? "border-warning bg-warning/10" : "border-primary bg-accent")}>{children}</div>
  );
}

export function Table({ head, rows, className }: { head: ReactNode[]; rows: ReactNode[][]; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-sm">
        <thead><tr>{head.map((h, i) => <th key={i} className="border-b bg-muted/60 px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-b last:border-0 hover:bg-muted/30">{r.map((c, j) => <td key={j} className="px-2 py-1.5 align-middle">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function KV({ k, v, unit }: { k: string; v: ReactNode; unit?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="num text-right">{v}{unit && <span className="ml-1 text-xs text-muted-foreground">{unit}</span>}</span>
    </div>
  );
}
