import React, { useState } from "react";
import type { Project, AnalysisResult } from "@/lib/engine/types";
import { fmt } from "@/components/kit";
import { MATERIAL_COLORS } from "./AnnotatedSketch";

export interface ComparativeSketchProps {
  projectBefore: Project;
  projectAfter: Project;
  resultBefore: AnalysisResult;
  resultAfter: AnalysisResult;
  changedFields?: string[];
  svgWidth?: number;
  svgHeight?: number;
  className?: string;
}

export function ComparativeSketch({
  projectBefore: pB,
  projectAfter: pA,
  resultBefore: rB,
  resultAfter: rA,
  svgWidth = 860,
  svgHeight = 380,
  className = "",
}: ComparativeSketchProps) {
  const [mode, setMode] = useState<"side-by-side" | "superimpose">("side-by-side");

  // Geometry helper for component polygons
  const getPolys = (comps: Project["components"]) =>
    comps.map((c) => {
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

  const polysB = getPolys(pB.components);
  const polysA = getPolys(pA.components);
  const ptsB = polysB.flat() as number[][];
  const ptsA = polysA.flat() as number[][];
  const allPts = [...ptsB, ...ptsA];

  const hu = Math.max(rB.wl.hu, rA.wl.hu);
  const dCutUpB = pB.seepage?.enabled ? pB.seepage.dCutoffUp : 0;
  const dCutDownB = pB.seepage?.enabled ? pB.seepage.dCutoffDown : 0;
  const dCutUpA = pA.seepage?.enabled ? pA.seepage.dCutoffUp : 0;
  const dCutDownA = pA.seepage?.enabled ? pA.seepage.dCutoffDown : 0;

  const lApronUpB = pB.seepage?.enabled ? (pB.seepage.lApronUp ?? 0) : 0;
  const lApronDownB = pB.seepage?.enabled ? (pB.seepage.lApronDown ?? 0) : 0;
  const lApronUpA = pA.seepage?.enabled ? (pA.seepage.lApronUp ?? 0) : 0;
  const lApronDownA = pA.seepage?.enabled ? (pA.seepage.lApronDown ?? 0) : 0;

  const maxDepth = Math.max(dCutUpB, dCutDownB, dCutUpA, dCutDownA, 0.6);

  const minX = Math.min(0, -lApronUpB, -lApronUpA, ...allPts.map((q) => q[0]!));
  const maxX = Math.max(
    rB.B,
    rA.B,
    rB.B + lApronDownB,
    rA.B + lApronDownA,
    ...allPts.map((q) => q[0]!),
    1
  );
  const maxZ = Math.max(...allPts.map((q) => q[1]!), hu, 1);
  const spanX = maxX - minX;

  const pad = 1.6;
  const topReserve = 45;
  const bottomReserve = 55;

  // Single panel scale calculation
  const panelW = mode === "side-by-side" ? (svgWidth - 24) / 2 : svgWidth;
  const s = Math.min(
    (panelW - 50) / (spanX + 2 * pad),
    (svgHeight - topReserve - bottomReserve) / (maxZ + maxDepth + 0.4)
  );

  const groundBaseY = svgHeight - bottomReserve - maxDepth * s;

  const getCoordFns = (offsetX: number) => ({
    X: (x: number) => offsetX + 25 + (x - minX + pad) * s,
    Z: (z: number) => groundBaseY - z * s,
  });

  const renderPanel = (
    proj: Project,
    res: AnalysisResult,
    polys: number[][][],
    offsetX: number,
    label: string,
    isRec: boolean
  ) => {
    const { X, Z } = getCoordFns(offsetX);
    const B_val = proj.B;
    const lUp = proj.seepage?.enabled ? (proj.seepage.lApronUp ?? 0) : 0;
    const lDown = proj.seepage?.enabled ? (proj.seepage.lApronDown ?? 0) : 0;
    const dUp = proj.seepage?.enabled ? proj.seepage.dCutoffUp : 0;
    const dDown = proj.seepage?.enabled ? proj.seepage.dCutoffDown : 0;

    const bDelta = pA.B - pB.B;

    return (
      <g>
        {/* Panel background & header */}
        <rect
          x={offsetX + 4}
          y={4}
          width={panelW - 8}
          height={svgHeight - 8}
          rx={8}
          className="fill-card/40 stroke-border/60"
          strokeWidth={1}
        />

        {/* Panel Badge */}
        <g transform={`translate(${offsetX + 14}, 14)`}>
          <rect
            x={0}
            y={0}
            width={panelW - 28}
            height={26}
            rx={4}
            fill={isRec ? "oklch(0.92 0.04 150)" : "oklch(0.92 0.01 240)"}
            className="dark:fill-slate-800"
          />
          <text
            x={10}
            y={17}
            className={`text-[11px] font-bold ${
              isRec ? "fill-emerald-700 dark:fill-emerald-400" : "fill-slate-700 dark:fill-slate-300"
            }`}
          >
            {label}
          </text>
          <text
            x={panelW - 38}
            y={17}
            textAnchor="end"
            className="fill-muted-foreground text-[10px] font-mono"
          >
            B = {fmt(B_val)} m {isRec && bDelta > 0 ? `(+${fmt(bDelta)} m)` : ""}
          </text>
        </g>

        {/* Subsoil hatch */}
        <rect
          x={offsetX + 6}
          y={Z(0)}
          width={panelW - 12}
          height={svgHeight - 8 - Z(0)}
          fill="url(#comp-ground-hatch)"
        />

        {/* Upstream / Downstream Apron */}
        {lUp > 0 && (
          <rect
            x={X(-lUp)}
            y={Z(0)}
            width={lUp * s}
            height={0.4 * s}
            fill="oklch(0.85 0.02 240)"
            stroke="oklch(0.45 0.04 245)"
            strokeWidth={1}
          />
        )}
        {lDown > 0 && (
          <rect
            x={X(B_val)}
            y={Z(0)}
            width={lDown * s}
            height={0.4 * s}
            fill="oklch(0.85 0.02 240)"
            stroke="oklch(0.45 0.04 245)"
            strokeWidth={1}
          />
        )}

        {/* Cutoff Upstream */}
        {dUp > 0 && (
          <g>
            <rect
              x={X(0) - 0.25 * s}
              y={Z(0)}
              width={0.5 * s}
              height={dUp * s}
              fill="oklch(0.75 0.03 245)"
              stroke="oklch(0.35 0.04 245)"
              strokeWidth={1}
            />
            <text
              x={X(0)}
              y={Z(0) + dUp * s + 10}
              textAnchor="middle"
              className="fill-muted-foreground text-[8px] font-mono"
            >
              d={fmt(dUp)}m
            </text>
          </g>
        )}

        {/* Cutoff Downstream */}
        {dDown > 0 && (
          <g>
            <rect
              x={X(B_val) - 0.25 * s}
              y={Z(0)}
              width={0.5 * s}
              height={dDown * s}
              fill="oklch(0.75 0.03 245)"
              stroke="oklch(0.35 0.04 245)"
              strokeWidth={1}
            />
            <text
              x={X(B_val)}
              y={Z(0) + dDown * s + 10}
              textAnchor="middle"
              className="fill-muted-foreground text-[8px] font-mono"
            >
              d={fmt(dDown)}m
            </text>
          </g>
        )}

        {/* Structural Polygons */}
        {polys.map((poly, idx) => {
          const comp = proj.components[idx];
          const mat =
            MATERIAL_COLORS[comp?.material ?? "Beton bertulang"] ??
            MATERIAL_COLORS["Beton bertulang"]!;
          const pathD =
            poly.map((p, i) => `${i === 0 ? "M" : "L"} ${X(p[0])} ${Z(p[1])}`).join(" ") + " Z";

          return (
            <path
              key={idx}
              d={pathD}
              fill={mat.fill}
              stroke={mat.stroke}
              strokeWidth={1.4}
              className="transition-opacity"
            />
          );
        })}

        {/* If this is the recommendation panel and B expanded, highlight the delta block */}
        {isRec && bDelta > 0 && (
          <g>
            {/* Highlighted Delta hatch */}
            <rect
              x={X(pB.B)}
              y={Z(pA.components[0]?.h ?? 1)}
              width={bDelta * s}
              height={(pA.components[0]?.h ?? 1) * s}
              fill="url(#comp-diff-hatch)"
              stroke="oklch(0.65 0.18 55)"
              strokeWidth={1.5}
              strokeDasharray="3 2"
            />
            <text
              x={X(pB.B + bDelta / 2)}
              y={Z((pA.components[0]?.h ?? 1) / 2)}
              textAnchor="middle"
              className="fill-amber-700 dark:fill-amber-300 text-[9px] font-bold"
            >
              +ΔB {fmt(bDelta)}m
            </text>
          </g>
        )}

        {/* Kern indicator (B/3 central zone) */}
        <g opacity={0.7}>
          <rect
            x={X(B_val / 3)}
            y={Z(0) - 3}
            width={(B_val / 3) * s}
            height={6}
            fill="oklch(0.6 0.16 150 / 0.3)"
            stroke="oklch(0.45 0.16 150)"
            strokeWidth={0.8}
            strokeDasharray="2 1"
          />
          <text
            x={X(B_val / 2)}
            y={Z(0) + 12}
            textAnchor="middle"
            className="fill-emerald-700 dark:fill-emerald-400 text-[8px] font-mono"
          >
            Kern B/3
          </text>
        </g>

        {/* Center of Gravity (CG) marker */}
        <g transform={`translate(${X(res.Xc_total)}, ${Z(res.Zc_total)})`}>
          <circle r={5} fill="none" stroke="oklch(0.5 0.2 25)" strokeWidth={1.5} />
          <line x1={-7} y1={0} x2={7} y2={0} stroke="oklch(0.5 0.2 25)" strokeWidth={1} />
          <line x1={0} y1={-7} x2={0} y2={7} stroke="oklch(0.5 0.2 25)" strokeWidth={1} />
          <text
            x={8}
            y={-4}
            className="fill-red-600 dark:fill-red-400 text-[8px] font-bold font-mono"
          >
            CG ({fmt(res.Xc_total)}, {fmt(res.Zc_total)})
          </text>
        </g>

        {/* Dimension Line B */}
        <g>
          const dimY = Z(0) + 24;
          <line
            x1={X(0)}
            y1={Z(0) + 26}
            x2={X(B_val)}
            y2={Z(0) + 26}
            stroke="currentColor"
            strokeWidth={1}
            className="text-slate-600 dark:text-slate-400"
            markerStart="url(#comp-arrow-start)"
            markerEnd="url(#comp-arrow-end)"
          />
          <line
            x1={X(0)}
            y1={Z(0) + 2}
            x2={X(0)}
            y2={Z(0) + 30}
            stroke="currentColor"
            strokeWidth={0.6}
            strokeDasharray="2 2"
            className="text-slate-400"
          />
          <line
            x1={X(B_val)}
            y1={Z(0) + 2}
            x2={X(B_val)}
            y2={Z(0) + 30}
            stroke="currentColor"
            strokeWidth={0.6}
            strokeDasharray="2 2"
            className="text-slate-400"
          />
          <text
            x={X(B_val / 2)}
            y={Z(0) + 38}
            textAnchor="middle"
            className="fill-foreground text-[10px] font-mono font-semibold"
          >
            B = {fmt(B_val)} m
          </text>
        </g>
      </g>
    );
  };

  const renderSuperimpose = () => {
    const { X, Z } = getCoordFns(10);
    const bDelta = pA.B - pB.B;

    return (
      <g>
        {/* Background */}
        <rect
          x={4}
          y={4}
          width={svgWidth - 8}
          height={svgHeight - 8}
          rx={8}
          className="fill-card/40 stroke-border/60"
          strokeWidth={1}
        />

        {/* Header */}
        <g transform="translate(14, 14)">
          <rect
            x={0}
            y={0}
            width={svgWidth - 28}
            height={26}
            rx={4}
            className="fill-muted/60"
          />
          <text x={10} y={17} className="text-[11px] font-bold fill-foreground">
            Superimpose Overlay: Eksisting (Garis Putus-Putus Abu) vs Rekomendasi (Warna Penuh)
          </text>
          <text
            x={svgWidth - 38}
            y={17}
            textAnchor="end"
            className="fill-emerald-600 dark:fill-emerald-400 text-[10px] font-mono font-semibold"
          >
            ΔB = +{fmt(bDelta)} m
          </text>
        </g>

        {/* Subsoil hatch */}
        <rect
          x={6}
          y={Z(0)}
          width={svgWidth - 12}
          height={svgHeight - 8 - Z(0)}
          fill="url(#comp-ground-hatch)"
        />

        {/* Existing outline (dashed) */}
        {polysB.map((poly, idx) => {
          const pathD =
            poly.map((p, i) => `${i === 0 ? "M" : "L"} ${X(p[0])} ${Z(p[1])}`).join(" ") + " Z";
          return (
            <path
              key={`b-${idx}`}
              d={pathD}
              fill="none"
              stroke="oklch(0.5 0.02 240)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          );
        })}

        {/* Recommended filled polygons */}
        {polysA.map((poly, idx) => {
          const comp = pA.components[idx];
          const mat =
            MATERIAL_COLORS[comp?.material ?? "Beton bertulang"] ??
            MATERIAL_COLORS["Beton bertulang"]!;
          const pathD =
            poly.map((p, i) => `${i === 0 ? "M" : "L"} ${X(p[0])} ${Z(p[1])}`).join(" ") + " Z";
          return (
            <path
              key={`a-${idx}`}
              d={pathD}
              fill={mat.fill}
              fillOpacity={0.65}
              stroke={mat.stroke}
              strokeWidth={1.4}
            />
          );
        })}

        {/* Highlighted Delta Segment */}
        {bDelta > 0 && (
          <g>
            <rect
              x={X(pB.B)}
              y={Z(pA.components[0]?.h ?? 1)}
              width={bDelta * s}
              height={(pA.components[0]?.h ?? 1) * s}
              fill="url(#comp-diff-hatch)"
              stroke="oklch(0.65 0.18 55)"
              strokeWidth={1.6}
            />
            <text
              x={X(pB.B + bDelta / 2)}
              y={Z((pA.components[0]?.h ?? 1) / 2)}
              textAnchor="middle"
              className="fill-amber-700 dark:fill-amber-300 text-[10px] font-bold"
            >
              +ΔB = {fmt(bDelta)} m (Segmen Tambahan)
            </text>
          </g>
        )}

        {/* Dimension Lines comparing B before and B after */}
        <g>
          {/* B before */}
          <line
            x1={X(0)}
            y1={Z(0) + 16}
            x2={X(pB.B)}
            y2={Z(0) + 16}
            stroke="oklch(0.5 0.02 240)"
            strokeWidth={1}
            strokeDasharray="3 2"
            markerStart="url(#comp-arrow-start)"
            markerEnd="url(#comp-arrow-end)"
          />
          <text
            x={X(pB.B / 2)}
            y={Z(0) + 12}
            textAnchor="middle"
            className="fill-slate-500 text-[9px] font-mono"
          >
            B Eksisting = {fmt(pB.B)} m
          </text>

          {/* B after */}
          <line
            x1={X(0)}
            y1={Z(0) + 32}
            x2={X(pA.B)}
            y2={Z(0) + 32}
            stroke="oklch(0.45 0.16 150)"
            strokeWidth={1.2}
            markerStart="url(#comp-arrow-start)"
            markerEnd="url(#comp-arrow-end)"
          />
          <text
            x={X(pA.B / 2)}
            y={Z(0) + 44}
            textAnchor="middle"
            className="fill-emerald-700 dark:fill-emerald-400 text-[10px] font-mono font-bold"
          >
            B Rekomendasi = {fmt(pA.B)} m
          </text>
        </g>
      </g>
    );
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-muted-foreground">
          Visualisasi Sketsa Proporsional Komparatif (Skala Seragam 1:{fmt(1 / s, 1)})
        </span>
        <div className="inline-flex rounded-md border border-border/80 bg-background p-0.5">
          <button
            type="button"
            onClick={() => setMode("side-by-side")}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              mode === "side-by-side"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Berdampingan
          </button>
          <button
            type="button"
            onClick={() => setMode("superimpose")}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              mode === "superimpose"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Tumpuk (Superimpose)
          </button>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full overflow-visible rounded-lg border border-border bg-card/60 select-none shadow-sm"
      >
        <defs>
          <marker id="comp-arrow-end" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 L1.5,3 Z" fill="currentColor" className="text-slate-600 dark:text-slate-400" />
          </marker>
          <marker id="comp-arrow-start" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
            <path d="M6,0 L0,3 L6,6 L4.5,3 Z" fill="currentColor" className="text-slate-600 dark:text-slate-400" />
          </marker>
          <pattern
            id="comp-ground-hatch"
            width="8"
            height="8"
            patternTransform="rotate(-45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="8" stroke="oklch(0.65 0.04 60 / 0.25)" strokeWidth="1" />
          </pattern>
          <pattern
            id="comp-diff-hatch"
            width="6"
            height="6"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="6" stroke="oklch(0.65 0.18 55 / 0.7)" strokeWidth="1.2" />
          </pattern>
        </defs>

        {mode === "side-by-side" ? (
          <>
            {renderPanel(pB, rB, polysB, 0, "EKSISTING", false)}
            {renderPanel(pA, rA, polysA, panelW + 8, "REKOMENDASI (PROPOSIONAL)", true)}
          </>
        ) : (
          renderSuperimpose()
        )}
      </svg>
    </div>
  );
}
