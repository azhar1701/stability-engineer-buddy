import React, { forwardRef } from "react";
import { useProject } from "@/lib/useProject";
import { fmt } from "@/components/kit";
import type { Project } from "@/lib/engine/types";
import type { AnalysisResult } from "@/lib/engine/types";

export interface AnnotatedSketchProps {
  project?: Project;
  result?: AnalysisResult;
  annotate?: boolean;
  showLegend?: boolean;
  svgWidth?: number;
  svgHeight?: number;
  highlightIdx?: number;
  onClickComponent?: (idx: number) => void;
  className?: string;
}

export const MATERIAL_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  "Beton bertulang": { fill: "oklch(0.78 0.02 245)", stroke: "oklch(0.35 0.04 245)", label: "Beton bertulang" },
  "Beton polos": { fill: "oklch(0.85 0.015 240)", stroke: "oklch(0.40 0.03 245)", label: "Beton polos" },
  "Pasangan batu mortar": { fill: "oklch(0.80 0.04 60)", stroke: "oklch(0.38 0.06 50)", label: "Pasangan batu" },
  "Tanah urug": { fill: "oklch(0.75 0.08 70)", stroke: "oklch(0.45 0.08 60)", label: "Tanah urug" },
};

export const AnnotatedSketch = forwardRef<SVGSVGElement, AnnotatedSketchProps>(function AnnotatedSketch(
  {
    project: propProject,
    result: propResult,
    annotate = true,
    showLegend = true,
    svgWidth = 720,
    svgHeight = 380,
    highlightIdx,
    onClickComponent,
    className = "",
  },
  ref
) {
  // Can use hook if props not passed
  let hookContext: { project: Project; result: AnalysisResult } | null = null;
  try {
    hookContext = useProject();
  } catch {
    // ignore if outside provider
  }

  const p = propProject ?? hookContext?.project;
  const a = propResult ?? hookContext?.result;

  if (!p || !a) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
        Data proyek tidak tersedia untuk sketsa.
      </div>
    );
  }

  const polys = a.comps.map((c) => {
    const { b1, b2, h, x0, z0 } = c;
    switch (c.shape) {
      case "PERSEGI":
        return [
          [x0, z0],
          [x0 + b1, z0],
          [x0 + b1, z0 + h],
          [x0, z0 + h],
        ];
      case "TRAPESIUM": {
        const o = (b1 - b2) / 2;
        return [
          [x0, z0],
          [x0 + b1, z0],
          [x0 + b1 - o, z0 + h],
          [x0 + o, z0 + h],
        ];
      }
      case "TRAPESIUM_LERENG_HILIR":
        return [
          [x0, z0],
          [x0 + b1, z0],
          [x0 + b2, z0 + h],
          [x0, z0 + h],
        ];
      case "TRAPESIUM_LERENG_HULU":
        return [
          [x0, z0],
          [x0 + b1, z0],
          [x0 + b1, z0 + h],
          [x0 + b1 - b2, z0 + h],
        ];
      case "SEGITIGA_KANAN":
        return [
          [x0, z0],
          [x0 + b1, z0],
          [x0, z0 + h],
        ];
      case "SEGITIGA_KIRI":
        return [
          [x0, z0],
          [x0 + b1, z0],
          [x0 + b1, z0 + h],
        ];
    }
  });

  const pts = polys.flat() as number[][];
  const hu = a.wl.hu;
  const hd = a.wl.hd;
  const isSaluran = p.type === "SLN" || p.type === "TLG";
  const isDinding = p.type === "DND";
  const isBendung = p.type === "BND" || p.type === "BLK";

  // Channel (SLN / TLG) geometry identification
  const leftWall = a.comps.find(
    (c) => c.h > 0.2 && (c.x0 < a.B * 0.48 || c.name.toLowerCase().includes("kiri"))
  ) ?? (a.comps.length >= 2 ? a.comps[1] : undefined);

  const rightWall = a.comps.find(
    (c) => c.h > 0.2 && (c.x0 + c.b1 > a.B * 0.52 || c.name.toLowerCase().includes("kanan"))
  ) ?? (a.comps.length >= 3 ? a.comps[2] : undefined);

  const baseComp = a.comps.find(
    (c) => c.z0 === 0 && (c.b1 >= a.B * 0.5 || c.name.toLowerCase().includes("dasar") || c.name.toLowerCase().includes("lining"))
  );
  const zBed = baseComp ? baseComp.h : Math.min(...a.comps.map((c) => c.z0), 0);
  const hWaterSaluran = hu > 0 ? hu : (p.extra?.water > 0 ? p.extra.water : 0);
  const zWaterSaluran = zBed + hWaterSaluran;

  const getLeftInnerX = (z: number) => {
    if (!leftWall) return 0;
    const { x0, b1, b2, h, shape, z0 } = leftWall;
    const relZ = Math.min(Math.max(z - z0, 0), h);
    if (shape === "TRAPESIUM_LERENG_HILIR") {
      return h > 0 ? x0 + b1 - ((b1 - b2) * relZ) / h : x0 + b1;
    }
    if (shape === "TRAPESIUM_LERENG_HULU") {
      return x0 + b1;
    }
    if (shape === "TRAPESIUM") {
      const o = (b1 - b2) / 2;
      return h > 0 ? x0 + b1 - (o * relZ) / h : x0 + b1;
    }
    return x0 + b1;
  };

  const getRightInnerX = (z: number) => {
    if (!rightWall) return a.B;
    const { x0, b1, b2, h, shape, z0 } = rightWall;
    const relZ = Math.min(Math.max(z - z0, 0), h);
    if (shape === "TRAPESIUM_LERENG_HULU") {
      return h > 0 ? x0 + ((b1 - b2) * relZ) / h : x0;
    }
    if (shape === "TRAPESIUM_LERENG_HILIR") {
      return x0;
    }
    if (shape === "TRAPESIUM") {
      const o = (b1 - b2) / 2;
      return h > 0 ? x0 + (o * relZ) / h : x0;
    }
    return x0;
  };

  const dCutUp = p.seepage?.enabled ? p.seepage.dCutoffUp : 0;
  const dCutDown = p.seepage?.enabled ? p.seepage.dCutoffDown : 0;
  const lApronUp = p.seepage?.enabled ? (p.seepage.lApronUp ?? 0) : 0;
  const lApronDown = p.seepage?.enabled ? (p.seepage.lApronDown ?? 0) : 0;
  const maxDepth = Math.max(dCutUp, dCutDown, 0.6);

  const minX = Math.min(0, -lApronUp, ...pts.map((q) => q[0]!));
  const maxX = Math.max(a.B, a.B + lApronDown, ...pts.map((q) => q[0]!), 1);
  const maxZ = Math.max(
    ...pts.map((q) => q[1]!),
    isSaluran ? zWaterSaluran : hu,
    isDinding ? Math.max(p.Hsoil ?? 0, hd, hu) : 0,
    1
  );
  const spanX = maxX - minX;

  // Extra padding adapts to structure type:
  // Saluran doesn't need huge external padding, focusing cleanly on the canal profile
  const pad = isSaluran ? (annotate ? 0.9 : 0.5) : isDinding ? (annotate ? 1.8 : 1.3) : (annotate ? 2.4 : 1.8);
  const W = svgWidth;
  const H = svgHeight;
  const topReserve = annotate ? 45 : 30;
  const bottomReserve = annotate ? 65 : 45;

  const s = Math.min((W - 60) / (spanX + 2 * pad), (H - topReserve - bottomReserve) / (maxZ + maxDepth + 0.4));
  const groundBaseY = H - bottomReserve - maxDepth * s;
  const X = (x: number) => 30 + (x - minX + pad) * s;
  const Z = (z: number) => groundBaseY - z * s;

  // Unique materials used for legend
  const usedMaterials = Array.from(new Set(a.comps.map((c) => c.material)));

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${W} ${H}`}
      className={`w-full overflow-visible rounded-md border border-border/80 bg-muted/15 font-sans select-none ${className}`}
    >
      <defs>
        {/* Markers for dimension arrows */}
        <marker id="dim-arrow-end" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 L1.5,3 Z" fill="currentColor" className="text-slate-600 dark:text-slate-400" />
        </marker>
        <marker id="dim-arrow-start" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
          <path d="M6,0 L0,3 L6,6 L4.5,3 Z" fill="currentColor" className="text-slate-600 dark:text-slate-400" />
        </marker>
        <marker id="dim-arrow-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 L1.5,3 Z" fill="oklch(0.55 0.16 230)" />
        </marker>
        <marker id="dim-arrow-blue-start" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
          <path d="M6,0 L0,3 L6,6 L4.5,3 Z" fill="oklch(0.55 0.16 230)" />
        </marker>

        {/* Hatching patterns */}
        <pattern id="ground-hatch-ann" width="8" height="8" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="8" stroke="oklch(0.65 0.04 60 / 0.25)" strokeWidth="1" />
        </pattern>
        <pattern id="apron-hatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="6" stroke="oklch(0.5 0.04 245 / 0.3)" strokeWidth="0.8" />
        </pattern>
        <pattern id="soil-backfill-hatch" width="10" height="10" patternTransform="rotate(30 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="10" stroke="oklch(0.65 0.08 70 / 0.35)" strokeWidth="1.2" />
        </pattern>
        <linearGradient id="water-hulu-grad-ann" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.68 0.14 230 / 0.55)" />
          <stop offset="100%" stopColor="oklch(0.68 0.14 230 / 0.15)" />
        </linearGradient>
        <linearGradient id="water-hilir-grad-ann" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.68 0.14 230 / 0.45)" />
          <stop offset="100%" stopColor="oklch(0.68 0.14 230 / 0.12)" />
        </linearGradient>
      </defs>

      {/* Subsoil Hatch under foundation base */}
      <rect x={0} y={Z(0)} width={W} height={H - Z(0)} fill="url(#ground-hatch-ann)" />

      {/* Upstream Apron if present */}
      {lApronUp > 0 && (
        <g>
          <rect
            x={X(-lApronUp)}
            y={Z(0)}
            width={lApronUp * s}
            height={0.5 * s}
            fill="oklch(0.85 0.02 240)"
            stroke="oklch(0.45 0.04 245)"
            strokeWidth={1}
          />
          <text x={X(-lApronUp / 2)} y={Z(0) + 12} textAnchor="middle" className="fill-muted-foreground text-[8px] font-mono">
            Apron Hulu ({fmt(lApronUp)}m)
          </text>
        </g>
      )}

      {/* Downstream Apron if present */}
      {lApronDown > 0 && (
        <g>
          <rect
            x={X(a.B)}
            y={Z(0)}
            width={lApronDown * s}
            height={0.5 * s}
            fill="oklch(0.85 0.02 240)"
            stroke="oklch(0.45 0.04 245)"
            strokeWidth={1}
          />
          <text x={X(a.B + lApronDown / 2)} y={Z(0) + 12} textAnchor="middle" className="fill-muted-foreground text-[8px] font-mono">
            Apron Hilir ({fmt(lApronDown)}m)
          </text>
        </g>
      )}

      {/* 1. Saluran / Talang: Air berada di DALAM penampang saluran antara dinding kiri & kanan */}
      {isSaluran && hWaterSaluran > 0 && (
        <g>
          {/* Water body polygon inside the canal lining */}
          <polygon
            points={`
              ${X(getLeftInnerX(zBed))},${Z(zBed)}
              ${X(getRightInnerX(zBed))},${Z(zBed)}
              ${X(getRightInnerX(zWaterSaluran))},${Z(zWaterSaluran)}
              ${X(getLeftInnerX(zWaterSaluran))},${Z(zWaterSaluran)}
            `}
            fill="url(#water-hulu-grad-ann)"
          />
          {/* Water surface line */}
          <line
            x1={X(getLeftInnerX(zWaterSaluran))}
            x2={X(getRightInnerX(zWaterSaluran))}
            y1={Z(zWaterSaluran)}
            y2={Z(zWaterSaluran)}
            stroke="oklch(0.55 0.16 230)"
            strokeWidth={1.8}
          />
          {/* Triangle symbol at center of water surface */}
          {(() => {
            const xMid = (getLeftInnerX(zWaterSaluran) + getRightInnerX(zWaterSaluran)) / 2;
            const waterLabel = p.hydraulics.method === "MANNING"
              ? `M.A Saluran (yₙ = ${fmt(hWaterSaluran)} m)`
              : p.type === "TLG"
              ? `M.A Talang (h = ${fmt(hWaterSaluran)} m)`
              : `M.A Saluran (h = ${fmt(hWaterSaluran)} m)`;
            const xDim = getLeftInnerX(zBed) + (getRightInnerX(zBed) - getLeftInnerX(zBed)) * 0.28;

            return (
              <g>
                <polygon
                  points={`${X(xMid)},${Z(zWaterSaluran)} ${X(xMid) - 5},${Z(zWaterSaluran) - 7} ${X(xMid) + 5},${Z(zWaterSaluran) - 7}`}
                  fill="oklch(0.55 0.16 230)"
                />
                <text
                  x={X(xMid)}
                  y={Z(zWaterSaluran) - 9}
                  textAnchor="middle"
                  className="fill-primary font-mono text-[9.5px] font-bold"
                >
                  {waterLabel}
                </text>
                {annotate && (
                  <g className="text-sky-600 dark:text-sky-400">
                    <line
                      x1={X(xDim)}
                      y1={Z(zBed)}
                      x2={X(xDim)}
                      y2={Z(zWaterSaluran)}
                      stroke="currentColor"
                      strokeWidth={1}
                      markerStart="url(#dim-arrow-blue-start)"
                      markerEnd="url(#dim-arrow-blue)"
                    />
                    <text
                      x={X(xDim) - 4}
                      y={(Z(zBed) + Z(zWaterSaluran)) / 2 + 3}
                      textAnchor="end"
                      className="fill-sky-700 dark:fill-sky-300 font-mono text-[8.5px] font-bold"
                    >
                      h={fmt(hWaterSaluran)}m
                    </text>
                  </g>
                )}
              </g>
            );
          })()}
        </g>
      )}

      {/* 2. Dinding Penahan / Talud: Timbunan tanah belakang & muka air depan/saluran */}
      {isDinding && (
        <g>
          {/* Tanah timbunan di belakang dinding (heel side) */}
          {p.Hsoil > 0 && (() => {
            const stemComp = a.comps.find((c) => c.h > 0.5) || a.comps[1] || a.comps[0];
            const xStem = stemComp ? stemComp.x0 : 0.4 * a.B;
            const Hsoil = p.Hsoil;
            const hwSoil = p.earth?.hWaterSoil ?? 0;
            return (
              <g>
                <rect
                  x={X(-pad)}
                  y={Z(Hsoil)}
                  width={(pad + xStem) * s}
                  height={Hsoil * s}
                  fill="url(#soil-backfill-hatch)"
                  stroke="oklch(0.55 0.08 70 / 0.5)"
                  strokeDasharray="4 2"
                  strokeWidth={0.8}
                />
                <text
                  x={X(-pad / 2)}
                  y={Z(Hsoil) - 6}
                  textAnchor="middle"
                  className="fill-amber-800 dark:fill-amber-300 font-mono text-[9px] font-semibold"
                >
                  Timbunan Tanah (H={fmt(Hsoil)}m)
                </text>
                {/* Muka air tanah di timbunan */}
                {hwSoil > 0 && (
                  <g>
                    <line
                      x1={X(-pad)}
                      x2={X(xStem)}
                      y1={Z(hwSoil)}
                      y2={Z(hwSoil)}
                      stroke="oklch(0.55 0.16 230)"
                      strokeWidth={1.2}
                      strokeDasharray="3 3"
                    />
                    <polygon
                      points={`${X(-pad / 2)},${Z(hwSoil)} ${X(-pad / 2) - 4},${Z(hwSoil) - 6} ${X(-pad / 2) + 4},${Z(hwSoil) - 6}`}
                      fill="oklch(0.55 0.16 230)"
                    />
                    <text
                      x={X(-pad / 2)}
                      y={Z(hwSoil) - 7}
                      textAnchor="middle"
                      className="fill-sky-700 dark:fill-sky-300 font-mono text-[8.5px] font-medium"
                    >
                      M.A Pori Tanah (hw={fmt(hwSoil)}m)
                    </text>
                  </g>
                )}
              </g>
            );
          })()}

          {/* Air di depan dinding / kaki toe */}
          {(hd > 0 || hu > 0) && (() => {
            const hDepan = hd > 0 ? hd : hu;
            const xStart = a.B;
            const wWater = (maxX + pad - a.B) * s;
            const xMid = xStart + (maxX + pad - a.B) / 2;
            return (
              <g>
                <rect x={X(xStart)} y={Z(hDepan)} width={wWater} height={hDepan * s} fill="url(#water-hilir-grad-ann)" />
                <line x1={X(xStart)} x2={W - 10} y1={Z(hDepan)} y2={Z(hDepan)} stroke="oklch(0.55 0.16 230)" strokeWidth={1.5} />
                <polygon
                  points={`${X(xMid)},${Z(hDepan)} ${X(xMid) - 5},${Z(hDepan) - 7} ${X(xMid) + 5},${Z(hDepan) - 7}`}
                  fill="oklch(0.55 0.16 230)"
                />
                <text x={X(xMid)} y={Z(hDepan) - 8} textAnchor="middle" className="fill-primary font-mono text-[9.5px] font-bold">
                  M.A Depan Dinding (h={fmt(hDepan)}m)
                </text>
                {annotate && (
                  <g className="text-sky-600 dark:text-sky-400">
                    <line
                      x1={X(xStart + 0.4)}
                      y1={Z(0)}
                      x2={X(xStart + 0.4)}
                      y2={Z(hDepan)}
                      stroke="currentColor"
                      strokeWidth={1}
                      markerStart="url(#dim-arrow-blue-start)"
                      markerEnd="url(#dim-arrow-blue)"
                    />
                    <text
                      x={X(xStart + 0.4) + 5}
                      y={(Z(0) + Z(hDepan)) / 2 + 3}
                      textAnchor="start"
                      className="fill-sky-700 dark:fill-sky-300 font-mono text-[9px] font-medium"
                    >
                      h={fmt(hDepan)}
                    </text>
                  </g>
                )}
              </g>
            );
          })()}
        </g>
      )}

      {/* 3. Bendung & Blok Gravitasi: Muka air Hulu (x <= 0) & Hilir (x >= B) */}
      {!isSaluran && !isDinding && (
        <>
          {/* Water body hulu (upstream) */}
          {a.act.hu && hu > 0 && (() => {
            const xUpStart = -pad - (lApronUp > 0 ? lApronUp : 0);
            const xUpMid = xUpStart / 2;
            const xDim = xUpStart + 0.35 * pad;
            return (
              <g>
                <rect x={X(xUpStart)} y={Z(hu)} width={(-xUpStart) * s} height={hu * s} fill="url(#water-hulu-grad-ann)" />
                <line
                  x1={X(xUpStart)}
                  x2={X(0)}
                  y1={Z(hu)}
                  y2={Z(hu)}
                  stroke="oklch(0.55 0.16 230)"
                  strokeWidth={1.5}
                />
                <polygon
                  points={`${X(xUpMid)},${Z(hu)} ${X(xUpMid) - 5},${Z(hu) - 7} ${X(xUpMid) + 5},${Z(hu) - 7}`}
                  fill="oklch(0.55 0.16 230)"
                />
                <text x={X(xUpMid)} y={Z(hu) - 8} textAnchor="middle" className="fill-primary font-mono text-[9.5px] font-bold">
                  M.A Hulu (hᵤ = {fmt(hu)} m)
                </text>
                {annotate && (
                  <g className="text-sky-600 dark:text-sky-400">
                    <line
                      x1={X(xDim)}
                      y1={Z(0)}
                      x2={X(xDim)}
                      y2={Z(hu)}
                      stroke="currentColor"
                      strokeWidth={1}
                      markerStart="url(#dim-arrow-blue-start)"
                      markerEnd="url(#dim-arrow-blue)"
                    />
                    <text
                      x={X(xDim) - 5}
                      y={(Z(0) + Z(hu)) / 2 + 3}
                      textAnchor="end"
                      className="fill-sky-700 dark:fill-sky-300 font-mono text-[9px] font-medium"
                    >
                      hᵤ={fmt(hu)}
                    </text>
                  </g>
                )}
              </g>
            );
          })()}

          {/* Water body hilir (downstream) */}
          {a.act.hd && hd > 0 && (() => {
            const xDownEnd = maxX + pad + (lApronDown > 0 ? lApronDown : 0);
            const xDownMid = a.B + (xDownEnd - a.B) / 2;
            const xDim = a.B + 0.35 * pad;
            return (
              <g>
                <rect
                  x={X(a.B)}
                  y={Z(hd)}
                  width={(xDownEnd - a.B) * s}
                  height={hd * s}
                  fill="url(#water-hilir-grad-ann)"
                />
                <line x1={X(a.B)} x2={W - 10} y1={Z(hd)} y2={Z(hd)} stroke="oklch(0.55 0.16 230)" strokeWidth={1.5} />
                <polygon
                  points={`${X(xDownMid)},${Z(hd)} ${X(xDownMid) - 5},${Z(hd) - 7} ${X(xDownMid) + 5},${Z(hd) - 7}`}
                  fill="oklch(0.55 0.16 230)"
                />
                <text x={X(xDownMid)} y={Z(hd) - 8} textAnchor="middle" className="fill-primary font-mono text-[9.5px] font-bold">
                  M.A Hilir (h_d = {fmt(hd)} m)
                </text>
                {annotate && (
                  <g className="text-sky-600 dark:text-sky-400">
                    <line
                      x1={X(xDim)}
                      y1={Z(0)}
                      x2={X(xDim)}
                      y2={Z(hd)}
                      stroke="currentColor"
                      strokeWidth={1}
                      markerStart="url(#dim-arrow-blue-start)"
                      markerEnd="url(#dim-arrow-blue)"
                    />
                    <text
                      x={X(xDim) + 6}
                      y={(Z(0) + Z(hd)) / 2 + 3}
                      textAnchor="start"
                      className="fill-sky-700 dark:fill-sky-300 font-mono text-[9px] font-medium"
                    >
                      h_d={fmt(hd)}
                    </text>
                  </g>
                )}
              </g>
            );
          })()}
        </>
      )}

      {/* Foundation interface line (z = 0) */}
      <line
        x1={Math.max(10, X(minX - 0.5))}
        x2={Math.min(W - 10, X(maxX + 0.5))}
        y1={Z(0)}
        y2={Z(0)}
        className="stroke-foreground/60"
        strokeWidth={1.5}
        strokeDasharray="6 3"
      />

      {/* Middle-third Kern (Kern Inti B/3) on foundation base */}
      {annotate && a.B > 0 && (
        <g>
          <line
            x1={X(a.B / 3)}
            x2={X(a.B / 3)}
            y1={Z(0) - 4}
            y2={Z(0) + 4}
            stroke="oklch(0.5 0.15 150)"
            strokeWidth={1.5}
          />
          <line
            x1={X((2 * a.B) / 3)}
            x2={X((2 * a.B) / 3)}
            y1={Z(0) - 4}
            y2={Z(0) + 4}
            stroke="oklch(0.5 0.15 150)"
            strokeWidth={1.5}
          />
          <line
            x1={X(a.B / 3)}
            x2={X((2 * a.B) / 3)}
            y1={Z(0)}
            y2={Z(0)}
            stroke="oklch(0.5 0.15 150)"
            strokeWidth={2}
          />
          <text
            x={X(a.B / 2)}
            y={Z(0) - 5}
            textAnchor="middle"
            className="fill-emerald-700 dark:fill-emerald-400 font-mono text-[8px] font-semibold"
          >
            Inti Kern (B/3)
          </text>
        </g>
      )}

      {/* Cutoff wall hulu & hilir */}
      {dCutUp > 0 && (
        <g>
          <rect
            x={X(0)}
            y={Z(0)}
            width={0.4 * s}
            height={dCutUp * s}
            fill="oklch(0.7 0.02 245)"
            stroke="oklch(0.35 0.04 245)"
            strokeWidth={1}
          />
          {annotate && (
            <text x={X(0) + 0.4 * s + 4} y={Z(0) + (dCutUp * s) / 2 + 3} className="fill-muted-foreground text-[8px] font-mono">
              Cutoff {fmt(dCutUp)}m
            </text>
          )}
        </g>
      )}
      {dCutDown > 0 && (
        <g>
          <rect
            x={X(a.B) - 0.4 * s}
            y={Z(0)}
            width={0.4 * s}
            height={dCutDown * s}
            fill="oklch(0.7 0.02 245)"
            stroke="oklch(0.35 0.04 245)"
            strokeWidth={1}
          />
          {annotate && (
            <text x={X(a.B) - 0.4 * s - 4} y={Z(0) + (dCutDown * s) / 2 + 3} textAnchor="end" className="fill-muted-foreground text-[8px] font-mono">
              Cutoff {fmt(dCutDown)}m
            </text>
          )}
        </g>
      )}

      {/* Structural component polygons */}
      {polys.map((poly, i) => {
        if (!poly || poly.length === 0) return null;
        const comp = a.comps[i]!;
        const mat = comp.material ?? "Beton bertulang";
        const color = MATERIAL_COLORS[mat] ?? MATERIAL_COLORS["Beton bertulang"]!;
        const isHighlighted = highlightIdx === i;

        return (
          <g
            key={comp.id || i}
            onClick={() => onClickComponent?.(i)}
            className={onClickComponent ? "cursor-pointer" : ""}
          >
            <polygon
              points={poly.map(([x, z]: number[]) => `${X(x!)},${Z(z!)}`).join(" ")}
              fill={color.fill}
              stroke={isHighlighted ? "oklch(0.5 0.25 25)" : color.stroke}
              strokeWidth={isHighlighted ? 2.5 : 1.5}
              className="transition-all hover:brightness-95"
            />

            {/* Component label & Centroid */}
            <text
              x={X(comp.xc)}
              y={Z(comp.zc)}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-foreground font-sans text-[9px] font-semibold pointer-events-none drop-shadow-xs"
            >
              {comp.name || `Komp ${i + 1}`}
            </text>
            <text
              x={X(comp.xc)}
              y={Z(comp.zc) + 10}
              textAnchor="middle"
              className="fill-muted-foreground font-mono text-[7.5px] pointer-events-none"
            >
              {fmt(comp.A, 2)} m²
            </text>

            {/* Annotations: b1, h, coordinates */}
            {annotate && (
              <g className="text-slate-600 dark:text-slate-400 pointer-events-none">
                {/* Horizontal width dimension line at bottom of component */}
                {comp.b1 > 0 && comp.h > 0.4 && (
                  <g>
                    <line
                      x1={X(comp.x0)}
                      y1={Z(comp.z0) - 6}
                      x2={X(comp.x0 + comp.b1)}
                      y2={Z(comp.z0) - 6}
                      stroke="currentColor"
                      strokeWidth={0.9}
                      markerStart="url(#dim-arrow-start)"
                      markerEnd="url(#dim-arrow-end)"
                    />
                    <text
                      x={X(comp.x0 + comp.b1 / 2)}
                      y={Z(comp.z0) - 9}
                      textAnchor="middle"
                      className="fill-slate-700 dark:fill-slate-300 font-mono text-[8px] font-medium"
                    >
                      b={fmt(comp.b1)}m
                    </text>
                  </g>
                )}

                {/* Vertical height dimension line */}
                {comp.h > 0 && (
                  <g>
                    <line
                      x1={X(comp.x0 + comp.b1) + 6}
                      y1={Z(comp.z0)}
                      x2={X(comp.x0 + comp.b1) + 6}
                      y2={Z(comp.z0 + comp.h)}
                      stroke="currentColor"
                      strokeWidth={0.9}
                      markerStart="url(#dim-arrow-start)"
                      markerEnd="url(#dim-arrow-end)"
                    />
                    <text
                      x={X(comp.x0 + comp.b1) + 9}
                      y={Z(comp.z0 + comp.h / 2) + 3}
                      textAnchor="start"
                      className="fill-slate-700 dark:fill-slate-300 font-mono text-[8px] font-medium"
                    >
                      h={fmt(comp.h)}m
                    </text>
                  </g>
                )}
              </g>
            )}
          </g>
        );
      })}

      {/* Center of composite gravity indicator (Xc, Zc) */}
      {a.W > 0 && (
        <g transform={`translate(${X(a.Xc_total)}, ${Z(a.Zc_total)})`}>
          <circle r={5} fill="oklch(0.98 0 0)" stroke="oklch(0.44 0.16 250)" strokeWidth={1.5} />
          <path d="M -5,0 L 5,0 M 0,-5 L 0,5" stroke="oklch(0.44 0.16 250)" strokeWidth={1.2} />
          <circle r={1.5} fill="oklch(0.44 0.16 250)" />
          <text x={8} y={3} className="fill-primary font-mono text-[9px] font-bold">
            CG ({fmt(a.Xc_total, 2)}, {fmt(a.Zc_total, 2)})
          </text>
        </g>
      )}

      {/* Dimension Line for Foundation Base Width B */}
      <g transform={`translate(0, ${Z(0) + (annotate ? 22 : 18)})`}>
        <line
          x1={X(0)}
          x2={X(a.B)}
          y1={0}
          y2={0}
          stroke="oklch(0.35 0.04 245)"
          strokeWidth={1.3}
          markerStart="url(#dim-arrow-start)"
          markerEnd="url(#dim-arrow-end)"
        />
        <line x1={X(0)} x2={X(0)} y1={-6} y2={6} stroke="oklch(0.35 0.04 245)" strokeWidth={1.2} />
        <line x1={X(a.B)} x2={X(a.B)} y1={-6} y2={6} stroke="oklch(0.35 0.04 245)" strokeWidth={1.2} />
        <rect
          x={(X(0) + X(a.B)) / 2 - 35}
          y={-8}
          width={70}
          height={15}
          fill="var(--color-card, #fff)"
          rx={2}
          className="stroke-border/40"
          strokeWidth={0.5}
        />
        <text
          x={(X(0) + X(a.B)) / 2}
          y={3}
          textAnchor="middle"
          className="fill-foreground font-mono text-[10px] font-bold"
        >
          B = {fmt(a.B)} m
        </text>
      </g>

      {/* Heel & Toe points */}
      <g>
        <circle cx={X(0)} cy={Z(0)} r={3} fill="currentColor" className="text-foreground" />
        <text x={X(0)} y={Z(0) - 8} className="fill-foreground text-[10px] font-bold">
          Heel (0,0)
        </text>

        <circle cx={X(a.B)} cy={Z(0)} r={3} fill="currentColor" className="text-foreground" />
        <text x={X(a.B)} y={Z(0) - 8} textAnchor="end" className="fill-foreground text-[10px] font-bold">
          Toe (B,0)
        </text>
      </g>

      {/* Legend for materials in bottom left */}
      {showLegend && usedMaterials.length > 0 && (
        <g transform={`translate(15, ${H - 24})`} className="text-[9px]">
          {usedMaterials.map((mat, i) => {
            const c = MATERIAL_COLORS[mat] ?? MATERIAL_COLORS["Beton bertulang"]!;
            const offset = i * 115;
            return (
              <g key={mat} transform={`translate(${offset}, 0)`}>
                <rect x={0} y={-8} width={12} height={10} fill={c.fill} stroke={c.stroke} strokeWidth={1} rx={1} />
                <text x={16} y={0} className="fill-muted-foreground font-sans text-[8.5px]">
                  {c.label || mat}
                </text>
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
});

/** Helper to download the SVG as a file */
export function downloadSvg(svgElement: SVGSVGElement | null, fileName = "sketsa-bangunan-air.svg") {
  if (!svgElement) return;
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgElement);
  // Add xml namespace if not present
  if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
