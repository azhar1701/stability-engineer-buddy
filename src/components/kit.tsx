import { useState, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export const fmt = (v: number | null | undefined, d = 2) =>
  v === null || v === undefined || !Number.isFinite(v) ? "—" : v.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });

export function PageHeader({
  code,
  step,
  totalSteps = 11,
  title,
  desc,
}: {
  code?: string;
  step?: number;
  totalSteps?: number;
  title: string;
  desc?: string;
}) {
  return (
    <div className="mb-6 border-b border-border/80 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {step !== undefined && (
            <span className="num inline-flex items-center rounded-md bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
              Langkah {step} dari {totalSteps}
            </span>
          )}
          {code && (
            <span className="num hidden sm:inline-block rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {code}
            </span>
          )}
          <span className="hidden md:inline-block text-[11px] uppercase tracking-wider text-muted-foreground/80">
            Standardized Engineering Workspace
          </span>
        </div>
        {step !== undefined && (
          <div className="flex items-center gap-1" aria-label={`Progress langkah ${step} dari ${totalSteps}`}>
            {Array.from({ length: totalSteps }, (_, i) => {
              const sNum = i + 1;
              const isPast = sNum < step;
              const isCurrent = sNum === step;
              return (
                <span
                  key={sNum}
                  title={`Langkah ${sNum}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    isCurrent
                      ? "w-5 bg-primary"
                      : isPast
                      ? "w-2 bg-primary/40"
                      : "w-1.5 bg-muted-foreground/20"
                  )}
                />
              );
            })}
          </div>
        )}
      </div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground lg:text-3xl">{title}</h1>
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

export function TextField({ label, value, onChange, hint, placeholder }: { label: string; value: string; onChange: (v: string) => void; hint?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-foreground/80">{label}</span>
      <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {hint && <span className="mt-1 block text-[11px] leading-tight text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function AutocompleteField({
  label,
  value,
  onChange,
  options,
  hint,
  placeholder,
  getBadge,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  hint?: string;
  placeholder?: string;
  getBadge?: (opt: string) => string | undefined;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Sync external value updates
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Compute portal dropdown position based on input element rect
  useLayoutEffect(() => {
    if (!isOpen || !inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const dropHeight = Math.min(240, options.length * 32 + 40);
    const openUpward = spaceBelow < dropHeight + 8 && rect.top > dropHeight + 8;
    setDropdownStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(openUpward
        ? { bottom: viewportHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }, [isOpen, options.length]);

  // Click outside listener (closes when clicking outside both input container and dropdown portal)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inContainer && !inDropdown) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = query.trim()
    ? options.filter((opt) => opt.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleSelect = (opt: string) => {
    onChange(opt);
    setQuery(opt);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery("");
    onChange("");
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
    } else if (e.key === "Enter" && isOpen && filteredOptions.length > 0) {
      e.preventDefault();
      handleSelect(filteredOptions[0]!);
    }
  };

  const dropdownPortal = isOpen
    ? createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="max-h-60 overflow-y-auto rounded-md border border-border bg-card p-1 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-100"
        >
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 mb-1 flex items-center justify-between">
            <span>Pilihan ({filteredOptions.length})</span>
            {filteredOptions.length < options.length && (
              <span className="text-[10px] font-semibold text-primary">Tersaring</span>
            )}
          </div>
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-center text-xs text-muted-foreground">
              Tidak ada pilihan yang cocok dengan &quot;{query}&quot;.
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.toLowerCase() === value.trim().toLowerCase();
              const badge = getBadge ? getBadge(opt) : undefined;
              return (
                <button
                  key={opt}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    "flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs transition-colors",
                    isSelected
                      ? "bg-primary/10 font-bold text-primary"
                      : "text-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={cn("text-xs", isSelected ? "text-primary font-bold" : "text-transparent")}>✓</span>
                    <span>{opt}</span>
                  </span>
                  {badge && (
                    <span className="rounded bg-muted/80 px-1.5 py-0.5 text-[9.5px] font-mono text-muted-foreground">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <div ref={containerRef} className="relative block">
      <label className="mb-1.5 block text-xs font-medium text-foreground/80">{label}</label>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          className={cn(inputCls, "pr-14")}
          value={query}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            onChange(v);
            if (!isOpen) setIsOpen(true);
          }}
          placeholder={placeholder ?? "Ketik atau pilih dari daftar…"}
        />
        <div className="absolute right-1.5 flex items-center gap-1">
          {query && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground text-[10px]"
              title="Hapus pilihan"
            >
              ✕
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              setIsOpen((prev) => !prev);
              inputRef.current?.focus();
            }}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground text-xs transition-colors"
            title="Tampilkan daftar pilihan"
          >
            ▾
          </button>
        </div>
      </div>
      {dropdownPortal}
      {hint && <span className="mt-1 block text-[11px] leading-tight text-muted-foreground">{hint}</span>}
    </div>
  );
}

export function AutosaveBadge({ saved }: { saved: boolean }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all duration-300",
        saved
          ? "bg-success/15 text-success opacity-100"
          : "bg-muted text-muted-foreground/60 opacity-60"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", saved ? "bg-success" : "bg-muted-foreground/40")} />
      {saved ? "Tersimpan" : "Menyimpan…"}
    </div>
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

export function Table({
  head,
  rows,
  rowClassNames,
  className,
}: {
  head: ReactNode[];
  rows: ReactNode[][];
  rowClassNames?: (string | undefined)[];
  className?: string;
}) {
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
            <tr key={i} className={cn("transition-colors hover:bg-muted/40", rowClassNames?.[i])}>
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
