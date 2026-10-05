import React, { useState } from "react";
import type { Project, AppliedRecEntry } from "@/lib/engine/types";
import type { Rec } from "@/lib/engine/recommend";
import { solveRecommendation, type ApplyResult } from "@/lib/engine/applyRec";
import { Status, fmt } from "@/components/kit";
import { ApplyDiffPanel } from "./ApplyDiffPanel";

export interface RecApplyCardProps {
  rec: Rec;
  project: Project;
  appliedEntry?: AppliedRecEntry;
  onApply: (entry: AppliedRecEntry) => void;
  onRevert?: (entryId: string) => void;
}

export function RecApplyCard({
  rec,
  project,
  appliedEntry,
  onApply,
  onRevert,
}: RecApplyCardProps) {
  const [diffOpen, setDiffOpen] = useState(false);

  // Compute solver solution if not yet applied
  const solution: ApplyResult | null = React.useMemo(() => {
    if (appliedEntry && appliedEntry.status === "APPLIED") return null;
    return solveRecommendation(rec, project);
  }, [rec, project, appliedEntry]);

  const isApplied = appliedEntry && appliedEntry.status === "APPLIED";

  const handleConfirmApply = () => {
    if (solution) {
      onApply(solution.entry);
      setDiffOpen(false);
    }
  };

  return (
    <>
      <div className={`rounded-xl border p-4 transition-all ${
        isApplied
          ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10"
          : rec.level === "KRITIS"
          ? "border-red-500/30 bg-card hover:border-red-500/50"
          : rec.level === "PERHATIAN"
          ? "border-amber-500/30 bg-card hover:border-amber-500/50"
          : "border-border bg-card"
      }`}>
        <div className="flex flex-col md:flex-row items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-24 shrink-0 pt-0.5">
              <Status s={rec.level} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-foreground text-sm">{rec.title}</h4>
                {isApplied && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    ✓ Rekomendasi Telah Diterapkan
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{rec.detail}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
            {isApplied ? (
              <button
                type="button"
                onClick={() => onRevert?.(appliedEntry.id)}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                ↩ Batalkan / Kembalikan
              </button>
            ) : solution ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDiffOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
                >
                  👁 Preview Dampak & Sketsa
                </button>
                <button
                  type="button"
                  onClick={() => setDiffOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90"
                >
                  ✓ Terapkan Solusi
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Solver solution preview teaser */}
        {!isApplied && solution && (
          <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary">💡 Solusi Terhitung:</span>
                <span className="text-muted-foreground">
                  {solution.summary}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                {Object.values(solution.delta).map((d, i) => (
                  <span key={i} className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {d.label}: {fmt(d.from)} → {fmt(d.to)} {d.unit}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Applied record info */}
        {isApplied && appliedEntry && (
          <div className="mt-3 rounded-lg border border-emerald-500/20 bg-muted/40 p-3 text-xs flex items-center justify-between">
            <span className="text-muted-foreground">
              {appliedEntry.summary} (Diterapkan pada {new Date(appliedEntry.appliedAt).toLocaleTimeString("id-ID")})
            </span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
              Status: Aktif di Pemodelan
            </span>
          </div>
        )}
      </div>

      {solution && (
        <ApplyDiffPanel
          solution={solution}
          isOpen={diffOpen}
          onClose={() => setDiffOpen(false)}
          onConfirm={handleConfirmApply}
        />
      )}
    </>
  );
}
