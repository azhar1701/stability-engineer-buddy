import React from "react";
import { cn } from "@/lib/utils";

export interface MathBlockProps {
  /** The mathematical formula as formatted HTML (uses sup, sub, times, frac, etc.) */
  eq: string;
  /** Brief description or method name */
  desc?: string;
  /** Computed result or expression substitution */
  result?: React.ReactNode;
  /** Standard/Code clause reference (e.g. "KP-02 §3.4" or "SNI 8460:2017 §7.3") */
  standardRef?: string;
  /** Optional custom CSS classes */
  className?: string;
}

export function MathBlock({ eq, desc, result, standardRef, className }: MathBlockProps) {
  return (
    <div
      className={cn(
        "my-3 overflow-hidden rounded-md border border-border/80 bg-muted/20 font-mono text-xs shadow-2xs transition-all",
        "print:border-slate-300 print:bg-slate-50 print:shadow-none print:break-inside-avoid",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between border-b border-border/50 bg-muted/40 px-3 py-1.5 text-[11px] font-sans print:border-slate-200 print:bg-slate-100">
        <span className="font-semibold text-foreground/80">{desc || "Formula Perhitungan"}</span>
        {standardRef && (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary print:border print:border-slate-400 print:bg-transparent print:text-black">
            {standardRef}
          </span>
        )}
      </div>

      <div className="p-3">
        <div
          className="overflow-x-auto text-[13px] leading-relaxed text-foreground print:text-black font-semibold tracking-wide"
          dangerouslySetInnerHTML={{ __html: eq }}
        />

        {result && (
          <div className="mt-2.5 flex items-center gap-2 border-t border-dashed border-border/60 pt-2 font-mono text-xs text-foreground/90 print:border-slate-300 print:text-black">
            <span className="font-sans text-[11px] font-medium text-muted-foreground print:text-slate-600">Substitusi & Hasil:</span>
            <span className="font-bold text-primary print:text-black">{result}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export interface FormulaStepProps {
  num: string;
  title: string;
  codeRef?: string;
  children: React.ReactNode;
}

export function FormulaStep({ num, title, codeRef, children }: FormulaStepProps) {
  return (
    <div className="mb-6 rounded-lg border border-border/70 bg-card p-4 shadow-2xs transition-all print:mb-4 print:border-slate-300 print:bg-white print:p-3 print:shadow-none print:break-inside-avoid">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 print:border-slate-300">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 font-mono text-[11px] font-bold text-primary print:border print:border-black print:bg-slate-200 print:text-black">
            {num}
          </span>
          <h4 className="font-sans text-xs font-bold uppercase tracking-wider text-foreground print:text-black">
            {title}
          </h4>
        </div>
        {codeRef && (
          <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground print:border print:border-slate-400 print:text-black">
            {codeRef}
          </span>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}
