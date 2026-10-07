import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { fmt } from "@/components/kit";
import { cn } from "@/lib/utils";
import type { Project, AnalysisResult } from "@/lib/engine/types";
import { useProject } from "@/lib/useProject";

export interface StickyStabilityBarProps {
  project?: Project;
  result?: AnalysisResult;
  className?: string;
}

export function StickyStabilityBar({
  project: propProject,
  result: propResult,
  className = "",
}: StickyStabilityBarProps) {
  let hookContext: { project: Project; result: AnalysisResult } | null = null;
  try {
    hookContext = useProject();
  } catch {
    // outside provider fallback
  }

  const p = propProject ?? hookContext?.project;
  const a = propResult ?? hookContext?.result;

  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!p || !a) return null;

  const env = a.envelope;
  const seep = a.seepage;
  const overall = env.overall;

  // Status visual themes
  const statusConfig = {
    MEMENUHI: {
      label: "STABIL & AMAN",
      badgeClass: "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
      icon: "✓",
      dotClass: "bg-emerald-500",
    },
    "TIDAK MEMENUHI": {
      label: "RAWAN KRITIS",
      badgeClass: "bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400",
      icon: "✕",
      dotClass: "bg-rose-500 animate-pulse",
    },
    "PERLU TINJAU": {
      label: "PERLU TINJAU",
      badgeClass: "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400",
      icon: "⚠️",
      dotClass: "bg-amber-500",
    },
    "BELUM LENGKAP": {
      label: "DATA BELUM LENGKAP",
      badgeClass: "bg-slate-500/15 border-slate-500/30 text-slate-600 dark:text-slate-400",
      icon: "⏳",
      dotClass: "bg-slate-400",
    },
    "TIDAK AKTIF": {
      label: "TIDAK AKTIF",
      badgeClass: "bg-muted border-border text-muted-foreground",
      icon: "—",
      dotClass: "bg-muted-foreground",
    },
  }[overall] ?? {
    label: overall,
    badgeClass: "bg-muted border-border text-muted-foreground",
    icon: "ℹ️",
    dotClass: "bg-muted-foreground",
  };

  // Governing load cases
  const slideCase = env.slide?.c;
  const overCase = env.over?.c;
  const bearingCase = env.ratio?.c;

  // Minimized Floating Pill
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-40 no-print animate-in fade-in slide-in-from-bottom-2">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className={cn(
            "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-md transition-all hover:scale-105",
            statusConfig.badgeClass,
            "bg-background/90"
          )}
          title="Klik untuk membuka Status Evaluasi Stabilitas Melayang"
        >
          <span className={cn("h-2 w-2 rounded-full", statusConfig.dotClass)} />
          <span>Stabilitas: {statusConfig.label}</span>
          <span className="text-[10px] opacity-75">▲</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 no-print transition-all duration-200",
        className
      )}
    >
      {/* Expanded Breakdown Drawer */}
      {isExpanded && (
        <div className="border-t border-border/80 bg-background/95 backdrop-blur-xl px-4 py-4 shadow-2xl transition-all max-h-80 overflow-y-auto animate-in slide-in-from-bottom-4">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">Kombinasi Kasus Pembebanan Stabilitas</span>
                <span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-semibold", statusConfig.badgeClass)}>
                  {statusConfig.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/proyek/$id/stabilitas"
                  params={{ id: p.id }}
                  className="rounded-md bg-primary/10 border border-primary/25 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                >
                  Buka Analisis Stabilitas Lengkap →
                </Link>
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="rounded-md p-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-muted-foreground border-b">
                  <tr>
                    <th className="py-1.5 px-2">Kombinasi Kasus</th>
                    <th className="py-1.5 px-2 text-right">M.A Hulu / Hilir</th>
                    <th className="py-1.5 px-2 text-right">SF Geser (min)</th>
                    <th className="py-1.5 px-2 text-right">SF Guling (min)</th>
                    <th className="py-1.5 px-2 text-right">Tegangan qMax</th>
                    <th className="py-1.5 px-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {a.cases.map((cs) => {
                    const isSlideGov = cs.id === env.slide?.caseId;
                    const isOverGov = cs.id === env.over?.caseId;
                    return (
                      <tr key={cs.id} className={cn("hover:bg-muted/30 transition-colors", cs.status === "TIDAK MEMENUHI" ? "bg-destructive/5" : "")}>
                        <td className="py-1.5 px-2 font-sans font-medium text-foreground flex items-center gap-1.5">
                          {cs.name}
                          {(isSlideGov || isOverGov) && (
                            <span className="rounded bg-primary/10 text-primary px-1 text-[9px] font-bold">Kritis</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-right text-muted-foreground">
                          {fmt(cs.hu)}m / {fmt(cs.hd)}m
                        </td>
                        <td className={cn("py-1.5 px-2 text-right font-bold", cs.slideOk ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                          {cs.fsSlide !== null ? fmt(cs.fsSlide, 2) : "—"} <span className="text-[10px] text-muted-foreground font-normal">({fmt(cs.fsSlideMin, 2)})</span>
                        </td>
                        <td className={cn("py-1.5 px-2 text-right font-bold", cs.overturnOk ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                          {cs.fsOverturn !== null ? fmt(cs.fsOverturn, 2) : "—"} <span className="text-[10px] text-muted-foreground font-normal">({fmt(cs.fsOverturnMin, 2)})</span>
                        </td>
                        <td className={cn("py-1.5 px-2 text-right font-medium", cs.bearingOk ? "text-foreground" : "text-rose-600 dark:text-rose-400")}>
                          {fmt(cs.qMax, 1)} kPa
                        </td>
                        <td className="py-1.5 px-2 text-center font-sans font-semibold">
                          <span
                            className={cn(
                              "inline-block rounded px-1.5 py-0.5 text-[10px]",
                              cs.status === "MEMENUHI" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                              cs.status === "TIDAK MEMENUHI" ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" :
                              "bg-muted text-muted-foreground"
                            )}
                          >
                            {cs.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Sticky Bar */}
      <div className="border-t border-border/80 bg-background/90 px-4 py-2.5 backdrop-blur-xl shadow-lg">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-xs">
          {/* Status Badge & Title */}
          <div className="flex items-center gap-2.5">
            <div className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold shadow-xs", statusConfig.badgeClass)}>
              <span className={cn("h-2 w-2 rounded-full", statusConfig.dotClass)} />
              <span>{statusConfig.label}</span>
            </div>
            <span className="hidden md:inline text-muted-foreground text-[11px]">
              Evaluasi Stabilitas Waktu-Nyata
            </span>
          </div>

          {/* Metric Pills */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-mono text-[11.5px]">
            {/* SF Geser */}
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2.5 py-1 bg-card/60 transition-colors shadow-2xs",
                slideCase?.slideOk
                  ? "border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "border-rose-500/30 text-rose-700 dark:text-rose-300 bg-rose-500/5 font-bold"
              )}
              title={`SF Geser Minimum: ${slideCase ? `${fmt(slideCase.fsSlide, 2)} (min ${fmt(slideCase.fsSlideMin, 2)}) pada ${slideCase.name}` : "-"}`}
            >
              <span className="font-sans text-[10.5px] text-muted-foreground">SF Geser:</span>
              <span className="font-bold">
                {slideCase?.fsSlide != null ? fmt(slideCase.fsSlide, 2) : "—"}
              </span>
              <span className="text-[10px] text-muted-foreground font-normal">
                (≥{fmt(slideCase?.fsSlideMin ?? 1.5, 2)})
              </span>
              <span>{slideCase?.slideOk ? "✓" : "✕"}</span>
            </div>

            {/* SF Guling */}
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2.5 py-1 bg-card/60 transition-colors shadow-2xs",
                overCase?.overturnOk
                  ? "border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "border-rose-500/30 text-rose-700 dark:text-rose-300 bg-rose-500/5 font-bold"
              )}
              title={`SF Guling Minimum: ${overCase ? `${fmt(overCase.fsOverturn, 2)} (min ${fmt(overCase.fsOverturnMin, 2)}) pada ${overCase.name}` : "-"}`}
            >
              <span className="font-sans text-[10.5px] text-muted-foreground">SF Guling:</span>
              <span className="font-bold">
                {overCase?.fsOverturn != null ? fmt(overCase.fsOverturn, 2) : "—"}
              </span>
              <span className="text-[10px] text-muted-foreground font-normal">
                (≥{fmt(overCase?.fsOverturnMin ?? 1.5, 2)})
              </span>
              <span>{overCase?.overturnOk ? "✓" : "✕"}</span>
            </div>

            {/* Daya Dukung */}
            <div
              className={cn(
                "hidden sm:flex items-center gap-1.5 rounded-md border px-2.5 py-1 bg-card/60 transition-colors shadow-2xs",
                bearingCase?.bearingOk
                  ? "border-border text-foreground"
                  : "border-rose-500/30 text-rose-700 dark:text-rose-300 bg-rose-500/5 font-bold"
              )}
              title={`Tegangan Maksimum: ${bearingCase ? `${fmt(bearingCase.qMax, 1)} kPa` : "-"}`}
            >
              <span className="font-sans text-[10.5px] text-muted-foreground">qMax:</span>
              <span>{bearingCase ? fmt(bearingCase.qMax, 1) : "—"} kPa</span>
              <span>{bearingCase?.bearingOk ? "✓" : "✕"}</span>
            </div>

            {/* Rembesan Lane */}
            {seep?.enabled && (
              <div
                className={cn(
                  "hidden lg:flex items-center gap-1.5 rounded-md border px-2.5 py-1 bg-card/60 transition-colors shadow-2xs",
                  seep.laneOk
                    ? "border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                    : "border-rose-500/30 text-rose-700 dark:text-rose-300 bg-rose-500/5 font-bold"
                )}
                title={`Angka Rayapan Lane Cw: ${fmt(seep.Cw, 2)} (Batas Aman: ${seep.CwMin})`}
              >
                <span className="font-sans text-[10.5px] text-muted-foreground">Lane Cw:</span>
                <span>{fmt(seep.Cw, 1)}</span>
                <span className="text-[10px] text-muted-foreground font-normal">(≥{seep.CwMin})</span>
                <span>{seep.laneOk ? "✓" : "⚠️"}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="rounded-md border border-input bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-1"
            >
              <span>{isExpanded ? "Tutup Detail" : "Detail Kasus"}</span>
              <span className="text-[10px]">{isExpanded ? "▾" : "▴"}</span>
            </button>
            <Link
              to="/proyek/$id/stabilitas"
              params={{ id: p.id }}
              className="hidden sm:inline-flex rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
            >
              Evaluasi →
            </Link>
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              title="Kecilkan bar ke pojok bawah"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
