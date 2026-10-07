import { useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useProject } from "@/lib/useProject";
import { useProjectHistory } from "@/lib/useProjectHistory";
import { fmt, KV, PageHeader, Section, StepNav } from "@/components/kit";
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
const cell = "h-8 w-full rounded-sm border border-input bg-card px-1.5 text-sm num";

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

  const upd = (id: string, patch: Partial<Component>) => safeUpdate((x) => ({ ...x, components: x.components.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const add = (name = "Komponen") => safeUpdate((x) => ({ ...x, components: [...x.components, { id: uid(), name, shape: "PERSEGI", b1: 0, b2: 0, h: 0, x0: 0, z0: 0, material: "Beton bertulang" }] }));
  const del = (id: string) => safeUpdate((x) => ({ ...x, components: x.components.filter((c) => c.id !== id) }));
  const num = (c: Component, k: keyof Component) => (
    <input type="number" step="any" className={cell} value={c[k] as number} onChange={(e) => upd(c.id, { [k]: parseFloat(e.target.value) || 0 })} />
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

  return (
    <>
      <PageHeader
        step={2}
        code="11_GEOMETRI"
        title="Geometri dan Berat Sendiri"
        desc="Koordinat X diukur dari heel (hulu) ke arah toe (hilir); Z dari dasar fondasi. Lengan momen dihitung terhadap toe (x = B)."
      />
      <Section
        title="Komponen Struktur Bangunan"
        aside={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 mr-1">
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                title="Undo perubahan (Ctrl+Z)"
                className="rounded border border-input bg-card px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 shadow-2xs"
              >
                <span>↶</span>
                <span className="hidden sm:inline text-[11px] font-medium">Undo</span>
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={!canRedo}
                title="Redo perubahan (Ctrl+Y)"
                className="rounded border border-input bg-card px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 shadow-2xs"
              >
                <span>↷</span>
                <span className="hidden sm:inline text-[11px] font-medium">Redo</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsParametricModalOpen(true)}
              className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/20 transition-all flex items-center gap-1.5"
            >
              <span>✨</span>
              <span>Templat dari Gambar PDF</span>
            </button>
            <div className="flex rounded-md border border-input bg-muted/50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("CARD")}
                className={cn("rounded px-2.5 py-1 font-medium transition-all", viewMode === "CARD" ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground")}
              >
                Form Kartu
              </button>
              <button
                type="button"
                onClick={() => setViewMode("TABLE")}
                className={cn("rounded px-2.5 py-1 font-medium transition-all", viewMode === "TABLE" ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground")}
              >
                Tabel Lanjutan
              </button>
            </div>
            <select className="h-7 rounded-sm border bg-card px-1 text-xs" value="" onChange={(e) => e.target.value && add(e.target.value)}>
              <option value="">+ dari profil {p.type}…</option>
              {typeById(p.type).components.map((n) => <option key={n}>{n}</option>)}
            </select>
            <button onClick={() => add()} className="rounded-sm bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">+ Komponen</button>
          </div>
        }
      >
        {viewMode === "CARD" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {p.components.map((c, i) => {
              const r = a.comps[i]!;
              const isZero = c.b1 <= 0 || c.h <= 0;
              const isOverB = p.B > 0 && c.x0 + c.b1 > p.B + 0.001;
              const isNegativeZ = c.z0 < 0;
              const isTrap = c.shape === "TRAPESIUM" || c.shape === "TRAPESIUM_LERENG_HILIR" || c.shape === "TRAPESIUM_LERENG_HULU";
              const canFlip = c.shape === "TRAPESIUM_LERENG_HILIR" || c.shape === "TRAPESIUM_LERENG_HULU" || c.shape === "SEGITIGA_KANAN" || c.shape === "SEGITIGA_KIRI";

              return (
                <div
                  key={c.id}
                  id={`comp-card-${i}`}
                  onClick={() => setSelectedCompIdx(i)}
                  className={cn(
                    "rounded-lg border p-4 transition-all bg-card shadow-xs cursor-pointer",
                    selectedCompIdx === i ? "ring-2 ring-primary border-primary shadow-sm" : "",
                    isOverB ? "border-destructive/60 bg-destructive/5" : "border-border"
                  )}
                >
                  <div className="flex items-center justify-between border-b pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="num flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <input
                        className="font-bold text-sm bg-transparent border-b border-dashed border-input focus:border-primary outline-none px-1"
                        value={c.name}
                        onChange={(e) => upd(c.id, { name: e.target.value })}
                        placeholder="Nama Komponen"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      {canFlip && (
                        <button
                          type="button"
                          onClick={() => flipSlopeInPlace(c)}
                          title="Balik arah lereng miring (tegak hulu ⇄ tegak hilir)"
                          className="rounded px-2 py-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-sky-200 dark:border-sky-800 transition-colors flex items-center gap-1"
                        >
                          <span>🪞</span>
                          <span>Balik Lereng</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => mirrorToOppositeSide(c)}
                        title="Cerminkan posisi ke sisi lawan saluran [x0 = B - (x0 + b1)] dan balik arah lereng"
                        className="rounded px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground border border-input transition-colors flex items-center gap-1"
                      >
                        <span>↔️</span>
                        <span>Cermin Posisi</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateAndMirror(c)}
                        title="Duplikasi dan cerminkan dinding ini ke sisi seberang"
                        className="rounded px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 border border-primary/20 transition-colors flex items-center gap-1"
                      >
                        <span>📋</span>
                        <span>Duplikasi & Cermin</span>
                      </button>
                      <button onClick={() => del(c.id)} title="Hapus komponen" className="rounded p-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors ml-1">
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="mt-3 grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <span className="text-[11px] font-medium text-muted-foreground">Bentuk Geometri</span>
                      <select className={cell + " mt-1 font-sans"} value={c.shape} onChange={(e) => upd(c.id, { shape: e.target.value as Shape })}>
                        {SHAPES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                      </select>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-muted-foreground">Material</span>
                      <select className={cell + " mt-1 font-sans"} value={c.material} onChange={(e) => upd(c.id, { material: e.target.value })}>
                        {MATERIALS.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
                        <option value="CUSTOM">Custom…</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[11px] font-medium text-muted-foreground">Lebar Bawah b1 (m)</span>
                      <div className="mt-1">{num(c, "b1")}</div>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {isTrap ? "Lebar Atas b2 (m)" : "Tinggi h (m)"}
                      </span>
                      <div className="mt-1">{isTrap ? num(c, "b2") : num(c, "h")}</div>
                    </div>

                    {isTrap && (
                      <div>
                        <span className="text-[11px] font-medium text-muted-foreground">Tinggi h (m)</span>
                        <div className="mt-1">{num(c, "h")}</div>
                      </div>
                    )}

                    <div>
                      <span className="text-[11px] font-medium text-muted-foreground">Posisi X0 dari Heel (m)</span>
                      <div className="mt-1">{num(c, "x0")}</div>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-muted-foreground">Posisi Z0 dari Dasar (m)</span>
                      <div className="mt-1">{num(c, "z0")}</div>
                    </div>

                    {c.material === "CUSTOM" && (
                      <div className="col-span-2">
                        <span className="text-[11px] font-medium text-muted-foreground">Berat Jenis Kustom γ (kN/m³)</span>
                        <input type="number" step="any" className={cell + " mt-1"} value={c.gammaCustom ?? 0} onChange={(e) => upd(c.id, { gammaCustom: parseFloat(e.target.value) || 0 })} />
                      </div>
                    )}
                  </div>

                  {/* Inline Validation Warnings */}
                  {isZero && (
                    <div className="mt-2.5 rounded bg-warning/15 px-2 py-1 text-[11px] text-warning-foreground font-medium">
                      ⚠️ Dimensi lebar b1 atau tinggi h belum diisi.
                    </div>
                  )}
                  {isOverB && (
                    <div className="mt-2 rounded bg-destructive/15 px-2 py-1 text-[11px] text-destructive font-medium">
                      ⚠️ Posisi ujung komponen (x0 + b1 = {fmt(c.x0 + c.b1)} m) melebihi lebar dasar B ({fmt(p.B)} m).
                    </div>
                  )}
                  {isNegativeZ && (
                    <div className="mt-2 rounded bg-destructive/15 px-2 py-1 text-[11px] text-destructive font-medium">
                      ⚠️ Ketinggian Z0 bernilai negatif (di bawah dasar fondasi).
                    </div>
                  )}

                  {/* Calculated summary */}
                  <div className="mt-3 flex items-center justify-between border-t border-dashed pt-2 text-[11px] text-muted-foreground">
                    <span>Luas: <strong className="num text-foreground">{fmt(r.A, 2)} m²</strong></span>
                    <span>Berat W: <strong className="num text-foreground">{fmt(r.W, 1)} kN</strong></span>
                    <span>Lengan toe: <strong className="num text-foreground">{fmt(r.armToe, 2)} m</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>{["Komponen", "Bentuk", "b1/dasar", "b2/atas", "h", "X0", "Z0", "Material", "A m²", "Xc", "Zc", "W kN", "M toe kNm", ""].map((h) => <th key={h} className="px-1 py-1 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {p.components.map((c, i) => {
                  const r = a.comps[i]!;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCompIdx(i)}
                      className={cn("border-t cursor-pointer transition-colors", selectedCompIdx === i ? "bg-primary/10 font-semibold" : "hover:bg-muted/40")}
                    >
                      <td className="p-1"><input className={cell + " font-sans"} value={c.name} onChange={(e) => upd(c.id, { name: e.target.value })} /></td>
                      <td className="p-1"><select className={cell + " font-sans"} value={c.shape} onChange={(e) => upd(c.id, { shape: e.target.value as Shape })}>{SHAPES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}</select></td>
                      <td className="w-20 p-1">{num(c, "b1")}</td>
                      <td className="w-20 p-1">{c.shape === "TRAPESIUM" || c.shape === "TRAPESIUM_LERENG_HILIR" || c.shape === "TRAPESIUM_LERENG_HULU" ? num(c, "b2") : <span className="text-muted-foreground">—</span>}</td>
                      <td className="w-20 p-1">{num(c, "h")}</td>
                      <td className="w-20 p-1">{num(c, "x0")}</td>
                      <td className="w-20 p-1">{num(c, "z0")}</td>
                      <td className="p-1">
                        <select className={cell + " font-sans"} value={c.material} onChange={(e) => upd(c.id, { material: e.target.value })}>
                          {MATERIALS.map((m) => <option key={m.name} value={m.name}>{m.name} ({m.gamma})</option>)}
                          <option value="CUSTOM">Custom…</option>
                        </select>
                        {c.material === "CUSTOM" && <input type="number" placeholder="γ kN/m³" className={cell + " mt-1"} value={c.gammaCustom ?? 0} onChange={(e) => upd(c.id, { gammaCustom: parseFloat(e.target.value) || 0 })} />}
                      </td>
                      <td className="num p-1 text-right">{fmt(r.A, 3)}</td>
                      <td className="num p-1 text-right">{fmt(r.xc, 3)}</td>
                      <td className="num p-1 text-right">{fmt(r.zc, 3)}</td>
                      <td className="num p-1 text-right font-medium">{fmt(r.W)}</td>
                      <td className="num p-1 text-right">{fmt(r.M)}</td>
                      <td className="p-1 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {(c.shape === "TRAPESIUM_LERENG_HILIR" || c.shape === "TRAPESIUM_LERENG_HULU" || c.shape === "SEGITIGA_KANAN" || c.shape === "SEGITIGA_KIRI") && (
                            <button
                              type="button"
                              onClick={() => flipSlopeInPlace(c)}
                              title="Balik orientasi lereng (🪞)"
                              className="rounded p-1 text-xs text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                            >
                              🪞
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => mirrorToOppositeSide(c)}
                            title="Cermin posisi ke sisi seberang saluran (↔️)"
                            className="rounded p-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            ↔️
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicateAndMirror(c)}
                            title="Duplikasi & Cerminkan Dinding (📋)"
                            className="rounded p-1 text-xs text-primary hover:bg-primary/10"
                          >
                            📋
                          </button>
                          <button onClick={() => del(c.id)} title="Hapus" className="rounded p-1 text-xs text-destructive hover:bg-destructive/10">✕</button>
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
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Section
          title="Sketsa penampang & Geometri Beranotasi"
          aside={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsInteractive((v) => !v)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium border transition-colors flex items-center gap-1.5",
                  isInteractive
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold"
                    : "bg-muted/50 border-input text-muted-foreground hover:text-foreground"
                )}
                title="Aktifkan/nonaktifkan drag & drop posisi komponen dan cutoff pada sketsa"
              >
                <span>{isInteractive ? "✨" : "🔒"}</span>
                <span>{isInteractive ? "Mode Drag Aktif" : "Mode Drag Mati"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAnnotations((v) => !v)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium border transition-colors",
                  showAnnotations
                    ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                    : "bg-muted/50 border-input text-muted-foreground hover:text-foreground"
                )}
              >
                {showAnnotations ? "✓ Anotasi Aktif" : "Anotasi Dimatikan"}
              </button>
              <button
                type="button"
                onClick={() => downloadSvg(sketchRef.current, `sketsa-geometri-${p.name || "proyek"}.svg`)}
                className="rounded border border-input bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-1"
                title="Unduh sketsa dalam format SVG vektor tajam"
              >
                <span>🗺️</span>
                <span>Ekspor SVG</span>
              </button>
            </div>
          }
        >
          {isInteractive && (
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-[11px] text-muted-foreground">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <span>💡</span> Tips Kustomisasi Visual:
                </span>
                <span>• <strong>Drag komponen</strong> untuk geser posisi X₀ / Z₀</span>
                <span>• <strong>Tarik handle ↕</strong> di dasar heel/toe untuk kedalaman Cutoff</span>
                <span>• <strong>Scroll roda mouse / tombol + −</strong> untuk Zoom</span>
              </div>
              <span className="text-[10px] italic text-muted-foreground">Tahan Shift untuk drag bebas tanpa snap</span>
            </div>
          )}
          <AnnotatedSketch
            ref={sketchRef}
            annotate={showAnnotations}
            showLegend={true}
            svgWidth={640}
            svgHeight={340}
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
        </Section>
        <Section title="Ringkasan">
          <KV k="Lebar analisis L" v={fmt(a.L)} unit="m" />
          <KV k="Lebar dasar B" v={fmt(a.B)} unit="m" />
          <KV k="Berat total W" v={fmt(a.W)} unit="kN" />
          <KV k="Momen W terhadap toe" v={fmt(a.MW)} unit="kNm" />
          <KV k="Lengan W ke toe" v={fmt(a.W > 0 ? a.MW / a.W : 0, 3)} unit="m" />
          <KV k="Xc gabungan dari heel" v={fmt(a.W > 0 ? a.B - a.MW / a.W : 0, 3)} unit="m" />
          <KV k="Zc gabungan dari dasar" v={fmt(a.Zc_total, 3)} unit="m" />
        </Section>
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

