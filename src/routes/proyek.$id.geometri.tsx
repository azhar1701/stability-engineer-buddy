import { useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useProject } from "@/lib/useProject";
import { useProjectHistory } from "@/lib/useProjectHistory";
import { fmt, KV, PageHeader, Section, StepNav, NumInput } from "@/components/kit";
import { MATERIALS, typeById } from "@/lib/engine/master";
import { uid } from "@/lib/engine/defaults";
import type { Component, Shape } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import { ParametricProfileModal } from "@/components/ParametricProfileModal";
import { AnnotatedSketch, downloadSvg } from "@/components/AnnotatedSketch";

export const Route = createFileRoute("/proyek/$id/geometri")({
  head: () => ({ meta: [{ title: "Geometri & Berat Sendiri — Stabilitas Bangunan Air" }] }),
  component: GeometriPage,
});

const SHAPES: { v: Shape; l: string }[] = [
  { v: "PERSEGI", l: "Persegi panjang" },
  { v: "TRAPESIUM", l: "Trapesium simetris" },
  { v: "TRAPESIUM_LERENG_HILIR", l: "Trapesium (tegak hulu/luar, lereng hilir/dalam)" },
  { v: "TRAPESIUM_LERENG_HULU", l: "Trapesium (lereng hulu/dalam, tegak hilir/luar)" },
  { v: "SEGITIGA_KANAN", l: "Segitiga (tegak hulu)" },
  { v: "SEGITIGA_KIRI", l: "Segitiga (tegak hilir)" },
];
const cell = "h-8.5 w-full rounded-md border border-input/70 bg-background px-2 text-xs font-mono num focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all";

function flipSlope(shape: Shape): Shape {
  if (shape === "TRAPESIUM_LERENG_HILIR") return "TRAPESIUM_LERENG_HULU";
  if (shape === "TRAPESIUM_LERENG_HULU") return "TRAPESIUM_LERENG_HILIR";
  if (shape === "SEGITIGA_KANAN") return "SEGITIGA_KIRI";
  if (shape === "SEGITIGA_KIRI") return "SEGITIGA_KANAN";
  return shape;
}

function GeometriPage() {
  const { project: p, result: a, update } = useProject();
  const { canUndo, canRedo, undo, redo, recordAction } = useProjectHistory();
  const [viewMode, setViewMode] = useState<"CARD" | "TABLE">("CARD");
  const [isParametricModalOpen, setIsParametricModalOpen] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [isInteractive, setIsInteractive] = useState(true);
  const [selectedCompIdx, setSelectedCompIdx] = useState<number | null>(null);
  const sketchRef = useRef<SVGSVGElement>(null);

  const safeUpdate = (fn: (x: typeof p) => typeof p) => {
    recordAction();
    update(fn);
  };

  const upd = (id: string, patch: Partial<Component>) =>
    safeUpdate((x) => ({ ...x, components: x.components.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const add = (name = "Komponen") =>
    safeUpdate((x) => ({
      ...x,
      components: [
        ...x.components,
        { id: uid(), name, shape: "PERSEGI", b1: 0, b2: 0, h: 0, x0: 0, z0: 0, material: "Beton bertulang" },
      ],
    }));
  const del = (id: string) => safeUpdate((x) => ({ ...x, components: x.components.filter((c) => c.id !== id) }));
  const num = (c: Component, k: keyof Component) => (
    <NumInput className={cell} value={c[k] as number} onChange={(val) => upd(c.id, { [k]: val })} />
  );

  const flipSlopeInPlace = (c: Component) => {
    upd(c.id, { shape: flipSlope(c.shape) });
  };

  const mirrorToOppositeSide = (c: Component) => {
    const newX0 = Math.max(0, +(p.B - (c.x0 + c.b1)).toFixed(4));
    const newShape = flipSlope(c.shape);
    let newName = c.name;
    if (newName.toLowerCase().includes("kiri")) {
      newName = newName.replace(/kiri/i, (m) => (m === "Kiri" ? "Kanan" : m === "KIRI" ? "KANAN" : "kanan"));
    } else if (newName.toLowerCase().includes("kanan")) {
      newName = newName.replace(/kanan/i, (m) => (m === "Kanan" ? "Kiri" : m === "KANAN" ? "KIRI" : "kiri"));
    }
    upd(c.id, { x0: newX0, shape: newShape, name: newName });
  };

  const duplicateAndMirror = (c: Component) => {
    let newName = c.name;
    if (newName.toLowerCase().includes("kiri")) {
      newName = newName.replace(/kiri/i, (m) => (m === "Kiri" ? "Kanan" : m === "KIRI" ? "KANAN" : "kanan"));
    } else if (newName.toLowerCase().includes("kanan")) {
      newName = newName.replace(/kanan/i, (m) => (m === "Kanan" ? "Kiri" : m === "KANAN" ? "KIRI" : "kiri"));
    } else if (newName.toLowerCase().includes("hulu")) {
      newName = newName.replace(/hulu/i, (m) => (m === "Hilir" ? "Hulu" : m === "HILIR" ? "HULU" : "hilir"));
    } else if (newName.toLowerCase().includes("hilir")) {
      newName = newName.replace(/hilir/i, (m) => (m === "Hulu" ? "Hilir" : m === "HULU" ? "HILIR" : "hilir"));
    } else {
      newName = `${newName} (Mirror)`;
    }

    const newX0 = Math.max(0, +(p.B - (c.x0 + c.b1)).toFixed(4));
    const newShape = flipSlope(c.shape);

    safeUpdate((x) => ({
      ...x,
      components: [
        ...x.components,
        {
          ...c,
          id: uid(),
          name: newName,
          x0: newX0,
          shape: newShape,
        },
      ],
    }));
  };

  // Kern limit calculations
  const kernMin = a.B / 3;
  const kernMax = (2 * a.B) / 3;
  const xc = a.W > 0 ? a.B - a.MW / a.W : 0;
  const isInsideKern = a.B > 0 && a.W > 0 && xc >= kernMin - 0.001 && xc <= kernMax + 0.001;

  return (
    <>
      <PageHeader
        step={2}
        code="11_GEOMETRI"
        title="Geometri dan Berat Sendiri"
        desc="Koordinat X diukur dari heel (hulu) ke arah toe (hilir); Z dari dasar fondasi. Lengan momen dihitung terhadap toe (x = B)."
      />

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Kolom Kiri: Form & Editor Komponen */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-5">
          <Section
            title="Komponen Struktur Bangunan"
            aside={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsParametricModalOpen(true)}
                  className="h-7.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-all flex items-center gap-1.5 shadow-2xs"
                  title="Gunakan profil parametrik siap pakai"
                >
                  <span>✨</span>
                  <span>Templat</span>
                </button>
                <button
                  type="button"
                  onClick={() => add()}
                  className="h-7.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs flex items-center gap-1"
                >
                  <span>+</span>
                  <span>Tambah</span>
                </button>
              </div>
            }
          >
            {/* Control Bar: Undo/Redo, View Mode, Presets */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/30 p-2 text-xs">
              <div className="flex items-center gap-2">
                {/* Undo / Redo */}
                <div className="flex items-center gap-0.5 rounded-md border border-input/60 bg-card p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={undo}
                    disabled={!canUndo}
                    title="Undo perubahan (Ctrl+Z)"
                    className="h-6 w-6 rounded text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center"
                  >
                    ↶
                  </button>
                  <button
                    type="button"
                    onClick={redo}
                    disabled={!canRedo}
                    title="Redo perubahan (Ctrl+Y)"
                    className="h-6 w-6 rounded text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center"
                  >
                    ↷
                  </button>
                </div>

                {/* View Mode Toggle */}
                <div className="flex h-7 rounded-md border border-input/60 bg-card p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setViewMode("CARD")}
                    className={cn(
                      "rounded px-2.5 text-[11px] font-medium transition-all",
                      viewMode === "CARD"
                        ? "bg-muted text-foreground font-semibold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Kartu ({p.components.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("TABLE")}
                    className={cn(
                      "rounded px-2.5 text-[11px] font-medium transition-all",
                      viewMode === "TABLE"
                        ? "bg-muted text-foreground font-semibold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Tabel
                  </button>
                </div>
              </div>

              {/* Preset Selector */}
              <div className="flex items-center gap-1.5">
                <select
                  className="h-7 rounded-md border border-input/60 bg-card px-2 text-xs text-foreground/80 focus:border-primary outline-none shadow-2xs max-w-[180px]"
                  value=""
                  onChange={(e) => e.target.value && add(e.target.value)}
                >
                  <option value="">+ Profil {p.type}…</option>
                  {typeById(p.type).components.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Empty State */}
            {p.components.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-8 text-center bg-card/50">
                <div className="text-3xl mb-2">📐</div>
                <h3 className="text-sm font-semibold text-foreground">Belum ada komponen struktur</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                  Tambahkan balok/dinding penampang baru atau gunakan templat parametrik untuk mengimpor bentuk standar.
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsParametricModalOpen(true)}
                    className="h-8 rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/20 transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>✨</span>
                    <span>Pilih Templat Parametrik</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => add()}
                    className="h-8 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-1 shadow-xs"
                  >
                    <span>+</span>
                    <span>Tambah Komponen</span>
                  </button>
                </div>
              </div>
            ) : viewMode === "CARD" ? (
              /* Card View: Single-column stack with generous width & clean row grouping */
              <div className="flex flex-col gap-3.5">
                {p.components.map((c, i) => {
                  const r = a.comps[i]!;
                  const isZero = c.b1 <= 0 || c.h <= 0;
                  const isOverB = p.B > 0 && c.x0 + c.b1 > p.B + 0.001;
                  const isNegativeZ = c.z0 < 0;
                  const isTrap =
                    c.shape === "TRAPESIUM" ||
                    c.shape === "TRAPESIUM_LERENG_HILIR" ||
                    c.shape === "TRAPESIUM_LERENG_HULU";
                  const canFlip =
                    c.shape === "TRAPESIUM_LERENG_HILIR" ||
                    c.shape === "TRAPESIUM_LERENG_HULU" ||
                    c.shape === "SEGITIGA_KANAN" ||
                    c.shape === "SEGITIGA_KIRI";

                  return (
                    <div
                      key={c.id}
                      id={`comp-card-${i}`}
                      onClick={() => setSelectedCompIdx(i)}
                      className={cn(
                        "group rounded-xl border p-4 transition-all bg-card shadow-2xs cursor-pointer",
                        selectedCompIdx === i
                          ? "border-primary/80 ring-2 ring-primary/20 bg-primary/[0.015] shadow-xs"
                          : "border-border hover:border-border/90 hover:shadow-xs",
                        isOverB ? "border-destructive/60 bg-destructive/5" : ""
                      )}
                    >
                      {/* Card Header: Index, Name, Micro-Actions */}
                      <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
                        <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                          <span
                            className={cn(
                              "num flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold font-mono transition-colors",
                              selectedCompIdx === i
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {i + 1}
                          </span>
                          <input
                            className="font-bold text-sm bg-transparent border-b border-transparent hover:border-input focus:border-primary focus:bg-background outline-none px-1 rounded-xs transition-colors flex-1 min-w-[100px] text-foreground"
                            value={c.name}
                            onChange={(e) => upd(c.id, { name: e.target.value })}
                            placeholder="Nama Komponen"
                          />
                        </div>

                        {/* Actions button group */}
                        <div className="flex items-center gap-1 shrink-0">
                          {canFlip && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                flipSlopeInPlace(c);
                              }}
                              title="Balik arah lereng miring (tegak hulu ⇄ tegak hilir)"
                              className="h-6.5 px-2 rounded-md text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 border border-sky-500/25 transition-colors flex items-center gap-1 shadow-2xs"
                            >
                              <span>🪞</span>
                              <span className="hidden sm:inline text-[10px]">Balik</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              mirrorToOppositeSide(c);
                            }}
                            title="Cerminkan posisi ke sisi lawan saluran [x0 = B - (x0 + b1)] dan balik arah lereng"
                            className="h-6.5 px-2 rounded-md text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground border border-input/60 transition-colors flex items-center gap-1 shadow-2xs"
                          >
                            <span>↔️</span>
                            <span className="hidden sm:inline text-[10px]">Cermin</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateAndMirror(c);
                            }}
                            title="Duplikasi dan cerminkan dinding ini ke sisi seberang"
                            className="h-6.5 px-2 rounded-md text-[11px] font-medium text-primary hover:bg-primary/10 border border-primary/25 transition-colors flex items-center gap-1 shadow-2xs"
                          >
                            <span>📋</span>
                            <span className="hidden sm:inline text-[10px]">Duplikasi</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              del(c.id);
                            }}
                            title="Hapus komponen"
                            className="h-6.5 w-6.5 rounded-md text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 border border-transparent transition-colors flex items-center justify-center ml-0.5"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Card Body: Form Fields */}
                      <div className="mt-3 space-y-2.5 text-xs">
                        {/* Baris 1: Bentuk Geometri & Material */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                              Bentuk Geometri
                            </label>
                            <select
                              className={cell + " font-sans"}
                              value={c.shape}
                              onChange={(e) => upd(c.id, { shape: e.target.value as Shape })}
                            >
                              {SHAPES.map((s) => (
                                <option key={s.v} value={s.v}>
                                  {s.l}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                              Material Konstruksi
                            </label>
                            <select
                              className={cell + " font-sans"}
                              value={c.material}
                              onChange={(e) => upd(c.id, { material: e.target.value })}
                            >
                              {MATERIALS.map((m) => (
                                <option key={m.name} value={m.name}>
                                  {m.name} ({m.gamma} kN/m³)
                                </option>
                              ))}
                              <option value="CUSTOM">Custom Berat Jenis…</option>
                            </select>
                          </div>
                        </div>

                        {/* Baris 2: Dimensi Fisik (b1, b2 jika trapesium, h) */}
                        <div className={cn("grid gap-2.5", isTrap ? "grid-cols-3" : "grid-cols-2")}>
                          <div>
                            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                              Lebar Bawah b₁ <span className="text-muted-foreground/60 font-mono">(m)</span>
                            </label>
                            {num(c, "b1")}
                          </div>
                          {isTrap && (
                            <div>
                              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                                Lebar Atas b₂ <span className="text-muted-foreground/60 font-mono">(m)</span>
                              </label>
                              {num(c, "b2")}
                            </div>
                          )}
                          <div>
                            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                              Tinggi h <span className="text-muted-foreground/60 font-mono">(m)</span>
                            </label>
                            {num(c, "h")}
                          </div>
                        </div>

                        {/* Baris 3: Posisi Koordinat Acuan */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                              Posisi X₀ dari Heel <span className="text-muted-foreground/60 font-mono">(m)</span>
                            </label>
                            {num(c, "x0")}
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                              Posisi Z₀ dari Dasar <span className="text-muted-foreground/60 font-mono">(m)</span>
                            </label>
                            {num(c, "z0")}
                          </div>
                        </div>

                        {/* Kustom Berat Jenis jika Material CUSTOM */}
                        {c.material === "CUSTOM" && (
                          <div className="rounded-md border border-primary/25 bg-primary/5 p-2.5">
                            <label className="text-[11px] font-medium text-primary block mb-1">
                              Berat Jenis Kustom γ (kN/m³)
                            </label>
                            <NumInput
                              className={cell}
                              value={c.gammaCustom ?? 0}
                              onChange={(val) => upd(c.id, { gammaCustom: val })}
                            />
                          </div>
                        )}
                      </div>

                      {/* Inline Validation Warnings */}
                      {isZero && (
                        <div className="mt-2.5 flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/25 px-2.5 py-1.5 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                          <span>⚠️</span>
                          <span>Dimensi lebar b₁ atau tinggi h belum diisi (&gt; 0).</span>
                        </div>
                      )}
                      {isOverB && (
                        <div className="mt-2 flex items-center gap-1.5 rounded-md bg-destructive/10 border border-destructive/25 px-2.5 py-1.5 text-[11px] text-destructive font-medium">
                          <span>⚠️</span>
                          <span>
                            Ujung komponen (X₀ + b₁ = {fmt(c.x0 + c.b1)} m) melebihi lebar dasar B ({fmt(p.B)} m).
                          </span>
                        </div>
                      )}
                      {isNegativeZ && (
                        <div className="mt-2 flex items-center gap-1.5 rounded-md bg-destructive/10 border border-destructive/25 px-2.5 py-1.5 text-[11px] text-destructive font-medium">
                          <span>⚠️</span>
                          <span>Ketinggian Z₀ bernilai negatif (di bawah dasar fondasi).</span>
                        </div>
                      )}

                      {/* Calculated summary footer */}
                      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-dashed border-border/80 pt-2.5 text-[11px] text-muted-foreground">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground/80">Luas A</span>
                          <span className="font-semibold num text-foreground">{fmt(r.A, 2)} m²</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground/80">Berat W</span>
                          <span className="font-semibold num text-foreground">{fmt(r.W, 1)} kN</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground/80">Lengan ke Toe</span>
                          <span className="font-semibold num text-foreground">{fmt(r.armToe, 2)} m</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Table View */
              <div className="overflow-x-auto rounded-lg border border-border/70 bg-card shadow-2xs">
                <table className="w-full min-w-[960px] text-xs">
                  <thead className="border-b bg-muted/60 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="px-2.5 py-2">Komponen</th>
                      <th className="px-2 py-2">Bentuk</th>
                      <th className="w-20 px-2 py-2">b₁ (m)</th>
                      <th className="w-20 px-2 py-2">b₂ (m)</th>
                      <th className="w-20 px-2 py-2">h (m)</th>
                      <th className="w-20 px-2 py-2">X₀ (m)</th>
                      <th className="w-20 px-2 py-2">Z₀ (m)</th>
                      <th className="px-2 py-2">Material</th>
                      <th className="px-2 py-2 text-right">A (m²)</th>
                      <th className="px-2 py-2 text-right">Xc (m)</th>
                      <th className="px-2 py-2 text-right">Zc (m)</th>
                      <th className="px-2 py-2 text-right">W (kN)</th>
                      <th className="px-2 py-2 text-right">M toe (kNm)</th>
                      <th className="w-24 px-2 py-2 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {p.components.map((c, i) => {
                      const r = a.comps[i]!;
                      const isTrap =
                        c.shape === "TRAPESIUM" ||
                        c.shape === "TRAPESIUM_LERENG_HILIR" ||
                        c.shape === "TRAPESIUM_LERENG_HULU";
                      const canFlip =
                        c.shape === "TRAPESIUM_LERENG_HILIR" ||
                        c.shape === "TRAPESIUM_LERENG_HULU" ||
                        c.shape === "SEGITIGA_KANAN" ||
                        c.shape === "SEGITIGA_KIRI";

                      return (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedCompIdx(i)}
                          className={cn(
                            "cursor-pointer transition-colors",
                            selectedCompIdx === i ? "bg-primary/10 font-semibold" : "hover:bg-muted/40"
                          )}
                        >
                          <td className="p-1.5">
                            <input
                              className={cell + " font-sans"}
                              value={c.name}
                              onChange={(e) => upd(c.id, { name: e.target.value })}
                            />
                          </td>
                          <td className="p-1.5">
                            <select
                              className={cell + " font-sans"}
                              value={c.shape}
                              onChange={(e) => upd(c.id, { shape: e.target.value as Shape })}
                            >
                              {SHAPES.map((s) => (
                                <option key={s.v} value={s.v}>
                                  {s.l}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="w-20 p-1.5">{num(c, "b1")}</td>
                          <td className="w-20 p-1.5">{isTrap ? num(c, "b2") : <span className="text-muted-foreground">—</span>}</td>
                          <td className="w-20 p-1.5">{num(c, "h")}</td>
                          <td className="w-20 p-1.5">{num(c, "x0")}</td>
                          <td className="w-20 p-1.5">{num(c, "z0")}</td>
                          <td className="p-1.5">
                            <select
                              className={cell + " font-sans"}
                              value={c.material}
                              onChange={(e) => upd(c.id, { material: e.target.value })}
                            >
                              {MATERIALS.map((m) => (
                                <option key={m.name} value={m.name}>
                                  {m.name} ({m.gamma})
                                </option>
                              ))}
                              <option value="CUSTOM">Custom…</option>
                            </select>
                            {c.material === "CUSTOM" && (
                              <NumInput
                                className={cell + " mt-1"}
                                value={c.gammaCustom ?? 0}
                                onChange={(val) => upd(c.id, { gammaCustom: val })}
                              />
                            )}
                          </td>
                          <td className="num p-1.5 text-right">{fmt(r.A, 3)}</td>
                          <td className="num p-1.5 text-right">{fmt(r.xc, 3)}</td>
                          <td className="num p-1.5 text-right">{fmt(r.zc, 3)}</td>
                          <td className="num p-1.5 text-right font-medium">{fmt(r.W, 1)}</td>
                          <td className="num p-1.5 text-right">{fmt(r.M, 1)}</td>
                          <td className="p-1.5 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-1">
                              {canFlip && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    flipSlopeInPlace(c);
                                  }}
                                  title="Balik arah lereng"
                                  className="rounded p-1 text-xs text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                                >
                                  🪞
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  mirrorToOppositeSide(c);
                                }}
                                title="Cermin ke sisi seberang"
                                className="rounded p-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                ↔️
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  duplicateAndMirror(c);
                                }}
                                title="Duplikasi & Cermin"
                                className="rounded p-1 text-xs text-primary hover:bg-primary/10"
                              >
                                📋
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  del(c.id);
                                }}
                                title="Hapus komponen"
                                className="rounded p-1 text-xs text-destructive hover:bg-destructive/10"
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>

        {/* Kolom Kanan: Kanvas Studio Interaktif (Sticky) & Ringkasan */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-5 lg:sticky lg:top-4 lg:self-start">
          <Section
            title="Sketsa Penampang & Geometri Interaktif"
            aside={
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsInteractive((v) => !v)}
                  className={cn(
                    "h-7.5 px-2.5 rounded-md text-xs font-semibold border transition-all flex items-center gap-1.5 shadow-2xs",
                    isInteractive
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                      : "bg-muted/40 border-input/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  title="Aktifkan/nonaktifkan drag & drop posisi komponen dan cutoff pada sketsa"
                >
                  <span>{isInteractive ? "✨" : "🔒"}</span>
                  <span>{isInteractive ? "Drag: On" : "Drag: Off"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAnnotations((v) => !v)}
                  className={cn(
                    "h-7.5 px-2.5 rounded-md text-xs font-semibold border transition-all shadow-2xs",
                    showAnnotations
                      ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                      : "bg-muted/40 border-input/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  title={showAnnotations ? "Sembunyikan anotasi dimensi" : "Tampilkan anotasi dimensi"}
                >
                  {showAnnotations ? "Anotasi: On" : "Anotasi: Off"}
                </button>
                <button
                  type="button"
                  onClick={() => downloadSvg(sketchRef.current, `sketsa-geometri-${p.name || "proyek"}.svg`)}
                  className="h-7.5 px-2.5 rounded-md border border-input/60 bg-card text-xs font-medium text-foreground hover:bg-muted transition-all flex items-center gap-1 shadow-2xs"
                  title="Unduh sketsa dalam format SVG vektor tajam"
                >
                  <span>↓</span>
                  <span>SVG</span>
                </button>
              </div>
            }
          >
            <AnnotatedSketch
              ref={sketchRef}
              annotate={showAnnotations}
              showLegend={true}
              svgWidth={700}
              svgHeight={360}
              interactive={isInteractive}
              allowDrag={isInteractive}
              allowZoom={true}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              highlightIdx={selectedCompIdx ?? undefined}
              onClickComponent={(idx) => {
                setSelectedCompIdx(idx);
                const cardEl = document.getElementById(`comp-card-${idx}`);
                cardEl?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              onUpdateComponent={(id, patch) => upd(id, patch)}
              onUpdateCutoff={(type, depth) => {
                safeUpdate((x) => ({
                  ...x,
                  seepage: {
                    enabled: true,
                    soilType: x.seepage?.soilType ?? "PASIR_SEDANG",
                    dCutoffUp: type === "up" ? depth : (x.seepage?.dCutoffUp ?? 1.5),
                    dCutoffDown: type === "down" ? depth : (x.seepage?.dCutoffDown ?? 2.0),
                    lApronUp: x.seepage?.lApronUp ?? 0,
                    lApronDown: x.seepage?.lApronDown ?? 0,
                  },
                }));
              }}
            />

            {/* Quick helper footer below sketch */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 border border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <span>💡</span> Panduan Studio:
                </span>
                <span><strong>Drag balok</strong> geser X₀/Z₀</span>
                <span>• <strong>Handle ↕</strong> kedalaman Cutoff</span>
                <span>• <strong>Scroll roda</strong> Zoom</span>
              </div>
              <span className="text-[10px] text-muted-foreground/80">Klik balok untuk sorot kartu</span>
            </div>
          </Section>

          {/* Ringkasan Parameter Geometri & Titik Berat */}
          <Section title="Ringkasan Parameter Geometri & Titik Berat">
            {/* 4 Metric Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="rounded-lg border border-border/70 bg-card p-3 shadow-2xs">
                <div className="text-[11px] font-medium text-muted-foreground">Lebar Dasar (B)</div>
                <div className="text-lg font-bold num text-foreground mt-0.5">{fmt(a.B)} m</div>
                <div className="text-[10px] text-muted-foreground/80 mt-0.5">Analisis L = {fmt(a.L)} m</div>
              </div>
              <div className="rounded-lg border border-border/70 bg-card p-3 shadow-2xs">
                <div className="text-[11px] font-medium text-muted-foreground">Berat Total (W)</div>
                <div className="text-lg font-bold num text-foreground mt-0.5">{fmt(a.W, 1)} kN</div>
                <div className="text-[10px] text-muted-foreground/80 mt-0.5">{p.components.length} komponen</div>
              </div>
              <div className="rounded-lg border border-border/70 bg-card p-3 shadow-2xs">
                <div className="text-[11px] font-medium text-muted-foreground">Momen ke Toe (Mw)</div>
                <div className="text-lg font-bold num text-foreground mt-0.5">{fmt(a.MW, 1)} kNm</div>
                <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                  Lengan = {fmt(a.W > 0 ? a.MW / a.W : 0, 3)} m
                </div>
              </div>
              <div className="rounded-lg border border-border/70 bg-card p-3 shadow-2xs">
                <div className="text-[11px] font-medium text-muted-foreground">Titik Berat (Xc, Zc)</div>
                <div className="text-lg font-bold num text-foreground mt-0.5">
                  {fmt(xc, 2)}, {fmt(a.Zc_total, 2)}
                </div>
                <div className="text-[10px] text-muted-foreground/80 mt-0.5">Koordinat meter</div>
              </div>
            </div>

            {/* Detailed KV List */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1 text-xs">
              <KV k="Lebar analisis L" v={fmt(a.L)} unit="m" />
              <KV k="Lebar dasar fondasi B" v={fmt(a.B)} unit="m" />
              <KV k="Berat total konstruksi W" v={fmt(a.W, 2)} unit="kN" />
              <KV k="Momen guling terhadap toe (Mw)" v={fmt(a.MW, 2)} unit="kNm" />
              <KV k="Lengan resultant W terhadap toe" v={fmt(a.W > 0 ? a.MW / a.W : 0, 3)} unit="m" />
              <KV k="Koordinat Xc gabungan (dari heel)" v={fmt(xc, 3)} unit="m" />
              <KV k="Koordinat Zc gabungan (dari dasar)" v={fmt(a.Zc_total, 3)} unit="m" />
            </div>

            {/* Civil Engineering Kern Evaluation */}
            <div
              className={cn(
                "mt-3 flex items-start gap-2 rounded-lg border p-2.5 text-xs",
                isInsideKern
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-300"
                  : "bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-300"
              )}
            >
              <span className="text-base leading-none">{isInsideKern ? "✓" : "⚠️"}</span>
              <div className="leading-relaxed">
                <span className="font-semibold">
                  {isInsideKern ? "Resultan Beban Mati dalam Teras Dasar (Kern)" : "Resultan di Luar Teras Dasar (Kern)"}:
                </span>{" "}
                <span>
                  Xc = {fmt(xc, 3)} m {isInsideKern ? "berada" : "di luar rentang"} Kern [{fmt(kernMin, 2)} s/d {fmt(kernMax, 2)} m].{" "}
                  {isInsideKern
                    ? "Kondisi beban sendiri aman dari tegangan tarik pada bidang kontak fondasi."
                    : "Perhatikan eksentrisitas resultan saat struktur dalam kondisi kosong/tanpa air."}
                </span>
              </div>
            </div>
          </Section>
        </div>
      </div>

      <StepNav
        prev={{ to: "/proyek/$id", label: "01. Proyek & Kesiapan" }}
        next={{ to: "/proyek/$id/hidraulika", label: "03. Hidrologi & Muka Air" }}
        projectId={p.id}
      />

      <ParametricProfileModal
        project={p}
        isOpen={isParametricModalOpen}
        onClose={() => setIsParametricModalOpen(false)}
        extractedDimensions={
          p.extractedPdfMeta?.dimensions
            ? (p.extractedPdfMeta.dimensions as import("@/lib/pdfExtractor").ExtractedDimensions)
            : undefined
        }
        onApply={(newComps, newB) => {
          safeUpdate((x) => ({
            ...x,
            components: newComps,
            ...(newB !== undefined && newB > 0 ? { B: newB } : {}),
          }));
        }}
      />
    </>
  );
}
