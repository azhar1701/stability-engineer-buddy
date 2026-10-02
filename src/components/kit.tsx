import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export const fmt = (v: number | null | undefined, d = 2) =>
  v === null || v === undefined || !Number.isFinite(v) ? "—" : v.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });

export function PageHeader({ code, title, desc }: { code: string; title: string; desc?: string }) {
  return (
    <div className="mb-6 border-b pb-4">
      <div className="flex items-center gap-2">
        <span className="num rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">{code}</span>
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Standardized Engineering Workspace</span>
      </div>
      <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground lg:text-3xl">{title}</h1>
      {desc && <p className="mt-1.5 max-w-4xl text-sm leading-relaxed text-muted-foreground">{desc}</p>}
    </div>
  );
}

export function Section({ title, children, aside, className }: { title: string; children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <section className={cn("mb-6 overflow-hidden rounded-lg border bg-card shadow-xs transition-shadow hover:shadow-sm", className)}>
      <div className="flex items-center justify-between border-b bg-muted/40 px-5 py-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground/80">{title}</h2>
        {aside}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

const inputCls = "h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-input/80";

export function NumField({ label, unit, value, onChange, step = "any", hint }: { label: string; unit?: string; value: number; onChange: (v: number) => void; step?: string; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-foreground/80">{label}</span>
      <div className="flex">
        <input type="number" step={step} className={cn(inputCls, "num", unit && "rounded-r-none border-r-0")} value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))} />
        {unit && <span className="num flex items-center rounded-r-md border border-input bg-muted px-2.5 text-xs font-medium text-muted-foreground">{unit}</span>}
      </div>
      {hint && <span className="mt-1 block text-[11px] leading-tight text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function TextField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-foreground/80">{label}</span>
      <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <span className="mt-1 block text-[11px] leading-tight text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function SelectField<T extends string>({ label, value, options, onChange, hint }: { label: string; value: T; options: readonly (T | { value: T; label: string })[]; onChange: (v: T) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-foreground/80">{label}</span>
      <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
      {hint && <span className="mt-1 block text-[11px] leading-tight text-muted-foreground">{hint}</span>}
    </label>
  );
}

const statusTone: Record<string, string> = {
  MEMENUHI: "bg-success/15 text-success border border-success/30",
  AMAN: "bg-success/15 text-success border border-success/30",
  LENGKAP: "bg-success/15 text-success border border-success/30",
  FINAL: "bg-success/15 text-success border border-success/30",
  "KONTAK PENUH": "bg-success/15 text-success border border-success/30",
  AKTIF: "bg-success/15 text-success border border-success/30",
  "PERLU TINJAU": "bg-warning/20 text-warning-foreground border border-warning/40",
  PENAPISAN: "bg-warning/20 text-warning-foreground border border-warning/40",
  SCREENING: "bg-warning/20 text-warning-foreground border border-warning/40",
  PERHATIAN: "bg-warning/20 text-warning-foreground border border-warning/40",
  "KONTAK PARSIAL TOE": "bg-warning/20 text-warning-foreground border border-warning/40",
  "KONTAK PARSIAL HEEL": "bg-warning/20 text-warning-foreground border border-warning/40",
  "TIDAK MEMENUHI": "bg-destructive/15 text-destructive border border-destructive/30",
  "BAHAYA PIPING": "bg-destructive/15 text-destructive border border-destructive/30 animate-pulse-subtle",
  KRITIS: "bg-destructive/15 text-destructive border border-destructive/30 animate-pulse-subtle",
  "RESULTAN DI LUAR DASAR": "bg-destructive/15 text-destructive border border-destructive/30 animate-pulse-subtle",
  "BELUM LENGKAP": "bg-muted text-muted-foreground border border-border",
};

export function Status({ s }: { s: string }) {
  const isCritical = s === "TIDAK MEMENUHI" || s === "KRITIS" || s === "BAHAYA PIPING" || s === "RESULTAN DI LUAR DASAR";
  const isOk = s === "MEMENUHI" || s === "AMAN" || s === "LENGKAP";
  return (
    <span className={cn("num inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide", statusTone[s] ?? "bg-muted text-muted-foreground border border-border")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", isCritical ? "bg-destructive animate-ping" : isOk ? "bg-success" : "bg-muted-foreground/60")} />
      {s}
    </span>
  );
}

export function Notice({ tone = "warning", children }: { tone?: "warning" | "info" | "destructive"; children: ReactNode }) {
  return (
    <div className={cn("mb-5 flex items-start gap-3 rounded-lg border-l-4 p-3.5 text-sm",
      tone === "warning" ? "border-warning bg-warning/10 text-foreground" :
      tone === "destructive" ? "border-destructive bg-destructive/10 text-destructive font-medium" :
      "border-primary bg-primary/5 text-foreground")}>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function Table({ head, rows, className }: { head: ReactNode[]; rows: ReactNode[][]; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-md border", className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {head.map((h, i) => <th key={i} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r, i) => (
            <tr key={i} className="transition-colors hover:bg-muted/40">
              {r.map((c, j) => <td key={j} className="px-3 py-2.5 align-middle">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function KV({ k, v, unit }: { k: string; v: ReactNode; unit?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-border/80 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="num font-medium text-foreground text-right">{v}{unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>}</span>
    </div>
  );
}

export function StepNav({ prev, next, projectId }: { prev?: { to: string; label: string }; next?: { to: string; label: string }; projectId: string }) {
  return (
    <div className="no-print mt-10 flex items-center justify-between border-t border-border pt-5">
      {prev ? (
        <Link to={prev.to} params={{ id: projectId }} className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-xs font-medium text-foreground transition-all hover:bg-muted">
          ← {prev.label}
        </Link>
      ) : <div />}
      {next && (
        <Link to={next.to} params={{ id: projectId }} className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 hover:shadow-sm">
          Lanjut: {next.label} →
        </Link>
      )}
    </div>
  );
}
