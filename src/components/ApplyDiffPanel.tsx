import React, { useState } from "react";
import type { ApplyResult } from "@/lib/engine/applyRec";
import { ComparativeSketch } from "./ComparativeSketch";
import { fmt } from "./kit";

export interface ApplyDiffPanelProps {
  solution: ApplyResult;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ApplyDiffPanel({
  solution,
  isOpen,
  onClose,
  onConfirm,
}: ApplyDiffPanelProps) {
  const [activeTab, setActiveTab] = useState<"params" | "sketch" | "metrics">("sketch");

  if (!isOpen) return null;
  if (!solution.entry) return null;

  const { projectBefore: pB, projectAfter: pA, resultBefore: rB, resultAfter: rA, delta, summary } =
    solution;

  // Stability envelope comparisons
  const slideB = rB.envelope.slide?.c.fsSlide ?? 0;
  const slideA = rA.envelope.slide?.c.fsSlide ?? 0;
  const slideMin = rB.envelope.slide?.c.fsSlideMin ?? 1.5;

  const overB = rB.envelope.over?.c.fsOverturn ?? 0;
  const overA = rA.envelope.over?.c.fsOverturn ?? 0;
  const overMin = rB.envelope.over?.c.fsOverturnMin ?? 1.5;

  const qRatioB = rB.envelope.ratio?.value ?? 0;
  const qRatioA = rA.envelope.ratio?.value ?? 0;

  const laneB = rB.seepage.enabled ? rB.seepage.Cw : null;
  const laneA = rA.seepage.enabled ? rA.seepage.Cw : null;
  const laneMin = rB.seepage.enabled ? rB.seepage.CwMin : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4 bg-muted/30">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                Penerapan Proporsional
              </span>
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                {solution.entry.recTitle}
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{summary}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border px-6 pt-2 bg-muted/10">
          <button
            type="button"
            onClick={() => setActiveTab("sketch")}
            className={`border-b-2 px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === "sketch"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            🗺 Sketsa Komparasi Proporsional
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("params")}
            className={`border-b-2 px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === "params"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            📋 Perubahan Parameter & Dimensi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("metrics")}
            className={`border-b-2 px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === "metrics"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            📊 Evaluasi Metrik Stabilitas (FS)
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: SKETSA */}
          {activeTab === "sketch" && (
            <div className="space-y-3">
              <ComparativeSketch
                projectBefore={pB}
                projectAfter={pA}
                resultBefore={rB}
                resultAfter={rA}
                svgWidth={820}
                svgHeight={360}
              />
              <div className="flex items-center gap-4 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="inline-block h-3 w-5 rounded border border-amber-600 bg-amber-500/30" />
                  Segmen perubahan proporsional (arsir jingga)
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="inline-block h-3 w-5 rounded border border-emerald-600 bg-emerald-500/30" />
                  Zona Inti Kern B/3
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="inline-block h-2 w-2 rounded-full border border-red-500 bg-red-500" />
                  Titik Berat Struktur (CG)
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: PARAMETER */}
          {activeTab === "params" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/60 text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Parameter Geometri / Tanah</th>
                      <th className="py-2.5 px-4">Nilai Eksisting</th>
                      <th className="py-2.5 px-4">Nilai Rekomendasi</th>
                      <th className="py-2.5 px-4">Selisih Perubahan (Δ)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {Object.entries(delta).map(([k, item]) => {
                      const diff = item.to - item.from;
                      const percent = item.from > 0 ? (diff / item.from) * 100 : 0;
                      return (
                        <tr key={k} className="hover:bg-muted/20">
                          <td className="py-3 px-4 font-medium text-foreground">{item.label}</td>
                          <td className="py-3 px-4 font-mono text-muted-foreground">
                            {fmt(item.from)} {item.unit}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {fmt(item.to)} {item.unit}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold">
                            <span
                              className={`rounded px-1.5 py-0.5 ${
                                diff >= 0
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "bg-red-500/10 text-red-600"
                              }`}
                            >
                              {diff >= 0 ? "+" : ""}
                              {fmt(diff)} {item.unit} ({diff >= 0 ? "+" : ""}
                              {fmt(percent, 1)}%)
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {solution.warningMsg && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                  ⚠️ <strong>Catatan Teknis:</strong> {solution.warningMsg}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: METRICS */}
          {activeTab === "metrics" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* FS Geser */}
                <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-foreground">Angka Keamanan Geser (FS Slide)</span>
                    <span className="font-mono text-muted-foreground">Batas Izin ≥ {fmt(slideMin)}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-muted-foreground">Eksisting:</span>
                      <span
                        className={`font-bold ${
                          slideB >= slideMin ? "text-emerald-600" : "text-red-500"
                        }`}
                      >
                        {fmt(slideB, 2)} ({slideB >= slideMin ? "AMAN" : "TIDAK AMAN"})
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full ${
                          slideB >= slideMin ? "bg-emerald-500" : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min((slideB / (slideMin * 1.5)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1 pt-1 border-t border-border/40">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-foreground font-medium">Setelah Rekomendasi:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {fmt(slideA, 2)} (AMAN)
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${Math.min((slideA / (slideMin * 1.5)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* FS Guling */}
                <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-foreground">Angka Keamanan Guling (FS Overturn)</span>
                    <span className="font-mono text-muted-foreground">Batas Izin ≥ {fmt(overMin)}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-muted-foreground">Eksisting:</span>
                      <span
                        className={`font-bold ${
                          overB >= overMin ? "text-emerald-600" : "text-red-500"
                        }`}
                      >
                        {fmt(overB, 2)} ({overB >= overMin ? "AMAN" : "TIDAK AMAN"})
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full ${
                          overB >= overMin ? "bg-emerald-500" : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min((overB / (overMin * 1.5)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1 pt-1 border-t border-border/40">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-foreground font-medium">Setelah Rekomendasi:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {fmt(overA, 2)} (AMAN)
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${Math.min((overA / (overMin * 1.5)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Rasio Daya Dukung */}
                <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-foreground">Rasio Daya Dukung (qmax / qizin)</span>
                    <span className="font-mono text-muted-foreground">Batas Aman ≤ 1.00</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Eksisting:</span>
                    <span className={qRatioB <= 1 ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                      {fmt(qRatioB, 2)} {qRatioB <= 1 ? "≤ 1.00 (AMAN)" : "> 1.00 (TERLAMPAUI)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-border/40">
                    <span className="text-foreground font-medium">Setelah Rekomendasi:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {fmt(qRatioA, 2)} ≤ 1.00 (AMAN)
                    </span>
                  </div>
                </div>

                {/* Rembesan & Lane Cw (if applicable) */}
                {laneB !== null && (
                  <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-foreground">Panjang Rayapan Lane (Cw)</span>
                      <span className="font-mono text-muted-foreground">Batas Minimum ≥ {laneMin}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-muted-foreground">Eksisting:</span>
                      <span className={laneB >= (laneMin ?? 0) ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                        Cw = {fmt(laneB, 1)} {laneB >= (laneMin ?? 0) ? "(AMAN)" : "(BAHAYA PIPING)"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-border/40">
                      <span className="text-foreground font-medium">Setelah Rekomendasi:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        Cw = {fmt(laneA, 1)} (AMAN)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Tutup
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow hover:opacity-90"
            >
              ✓ Konfirmasi & Terapkan Perubahan ke Proyek
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
