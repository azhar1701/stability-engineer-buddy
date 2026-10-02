import type { CaseResult } from "@/lib/engine/compute";
import { fmt } from "./kit";

interface Props {
  c: CaseResult;
  B: number;
  qa: number;
}

export function SoilReactionCanvas({ c, B, qa }: Props) {
  const W = 620, H = 220;
  const padX = 60, padY = 30;
  const plotW = W - 2 * padX;
  const baseLineY = 90; // Y-coordinate of the foundation base interface

  const sx = (x: number) => padX + (Math.max(0, Math.min(x, B)) / Math.max(B, 0.1)) * plotW;
  const heelX = sx(0);
  const toeX = sx(B);

  const qMaxPlot = Math.max(c.qMax, qa * 1.1, 10);
  const sy = (qVal: number) => {
    const norm = Math.min(Math.max(qVal, 0) / qMaxPlot, 1);
    return baseLineY + norm * 85;
  };

  // Middle-third limit coordinates
  const mid1X = sx(B / 3);
  const mid2X = sx((2 * B) / 3);
  const centerBaseX = sx(B / 2);

  // Resultant line of action (a is from toe, so from heel it is B - a)
  const resultantX = sx(Math.max(B - c.a, 0));

  // Points for the soil pressure polygon
  let pressurePoints = "";
  let liftOffPolygon = "";

  if (c.regime === "KONTAK PENUH") {
    pressurePoints = `${heelX},${baseLineY} ${toeX},${baseLineY} ${toeX},${sy(c.qToe)} ${heelX},${sy(c.qHeel)}`;
  } else if (c.regime === "KONTAK PARSIAL TOE") {
    const contactStartX = sx(Math.max(B - 3 * c.a, 0));
    pressurePoints = `${contactStartX},${baseLineY} ${toeX},${baseLineY} ${toeX},${sy(c.qToe)}`;
    liftOffPolygon = `${heelX},${baseLineY} ${contactStartX},${baseLineY} ${contactStartX},${baseLineY + 20} ${heelX},${baseLineY + 20}`;
  } else if (c.regime === "KONTAK PARSIAL HEEL") {
    const contactEndX = sx(Math.min(3 * (B - c.a), B));
    pressurePoints = `${heelX},${baseLineY} ${contactEndX},${baseLineY} ${heelX},${sy(c.qHeel)}`;
    liftOffPolygon = `${contactEndX},${baseLineY} ${toeX},${baseLineY} ${toeX},${baseLineY + 20} ${contactEndX},${baseLineY + 20}`;
  }

  const qaY = sy(qa);

  return (
    <div className="overflow-hidden rounded-lg border bg-card p-4 shadow-xs">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-semibold text-foreground">Diagram Distribusi Tegangan Kontak Tanah ({c.name})</span>
        <span className="num text-muted-foreground">B = {fmt(B)} m · |e| = {fmt(Math.abs(c.e), 3)} m</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-md bg-muted/20">
        <defs>
          <pattern id="lift-off-pattern" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="6" stroke="oklch(0.55 0.22 25 / 0.4)" strokeWidth="1.5" />
          </pattern>
          <linearGradient id="pressure-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.44 0.16 250 / 0.4)" />
            <stop offset="100%" stopColor="oklch(0.44 0.16 250 / 0.08)" />
          </linearGradient>
        </defs>

        {/* Foundation footing block outline above base line */}
        <rect x={heelX} y={baseLineY - 35} width={plotW} height={35} className="fill-concrete/70 stroke-foreground/60" strokeWidth={1.5} />
        <text x={heelX + 8} y={baseLineY - 14} className="fill-foreground/70 text-[11px] font-medium">Dasar Struktur / Fondasi</text>

        {/* Resultant force arrows */}
        {c.N > 0 && (
          <g transform={`translate(${resultantX}, ${baseLineY - 40})`}>
            {/* Vertical N arrow pointing down */}
            <line x1={0} y1={-25} x2={0} y2={5} stroke="oklch(0.44 0.16 250)" strokeWidth={2.5} markerEnd="url(#arrow)" />
            <polygon points="0,5 -4,-3 4,-3" fill="oklch(0.44 0.16 250)" />
            <text x={6} y={-10} className="fill-primary font-mono text-[10px] font-bold">N={fmt(c.N, 0)} kN</text>
            {/* Horizontal H arrow pointing right */}
            {c.H > 0 && (
              <>
                <line x1={0} y1={0} x2={22} y2={0} stroke="oklch(0.55 0.22 25)" strokeWidth={2} />
                <polygon points="22,0 16,-3 16,3" fill="oklch(0.55 0.22 25)" />
                <text x={26} y={4} className="fill-destructive font-mono text-[9px] font-bold">H={fmt(c.H, 0)}</text>
              </>
            )}
          </g>
        )}

        {/* Foundation base interface line */}
        <line x1={heelX - 20} y1={baseLineY} x2={toeX + 20} y2={baseLineY} className="stroke-foreground" strokeWidth={2} />

        {/* Middle-third zone (Kern) */}
        <rect x={mid1X} y={baseLineY} width={mid2X - mid1X} height={90} className="fill-primary/5" />
        <line x1={mid1X} y1={baseLineY} x2={mid1X} y2={baseLineY + 90} stroke="oklch(0.44 0.16 250 / 0.3)" strokeDasharray="3 3" />
        <line x1={mid2X} y1={baseLineY} x2={mid2X} y2={baseLineY + 90} stroke="oklch(0.44 0.16 250 / 0.3)" strokeDasharray="3 3" />
        <line x1={centerBaseX} y1={baseLineY - 6} x2={centerBaseX} y2={baseLineY + 6} stroke="oklch(0.2 0.02 240 / 0.5)" />
        <text x={centerBaseX - 4} y={baseLineY - 10} className="fill-muted-foreground text-[9px]">CL</text>

        {/* Lift-off zone hatch if partial contact */}
        {liftOffPolygon && (
          <polygon points={liftOffPolygon} fill="url(#lift-off-pattern)" stroke="oklch(0.55 0.22 25 / 0.5)" strokeWidth={1} />
        )}

        {/* Pressure trapezoid / triangle */}
        {pressurePoints && (
          <polygon points={pressurePoints} fill="url(#pressure-gradient)" stroke="oklch(0.44 0.16 250)" strokeWidth={2} />
        )}

        {/* Allowable bearing capacity q_a limit line */}
        {qa > 0 && (
          <g>
            <line x1={heelX} y1={qaY} x2={toeX} y2={qaY} stroke="oklch(0.55 0.22 25 / 0.8)" strokeDasharray="5 4" strokeWidth={1.5} />
            <text x={toeX - 65} y={qaY - 4} className="fill-destructive text-[9px] font-semibold">q izin = {fmt(qa, 1)} kPa</text>
          </g>
        )}

        {/* Heel & Toe labels & stress values */}
        <text x={heelX} y={baseLineY + 16} className="fill-muted-foreground text-[10px] font-medium">Heel (hulu)</text>
        <text x={toeX - 35} y={baseLineY + 16} className="fill-muted-foreground text-[10px] font-medium">Toe (hilir)</text>

        <text x={heelX} y={Math.max(sy(c.qHeel) + 14, baseLineY + 30)} className="fill-foreground font-mono text-[11px] font-bold">
          {fmt(c.qHeel, 1)} kPa
        </text>
        <text x={toeX - 50} y={Math.max(sy(c.qToe) + 14, baseLineY + 30)} className="fill-foreground font-mono text-[11px] font-bold">
          {fmt(c.qToe, 1)} kPa
        </text>

        {/* Middle third explanation label */}
        <text x={mid1X + 4} y={baseLineY + 82} className="fill-primary/60 text-[9px] font-medium">Zona Inti (Kern: e ≤ B/6)</text>
      </svg>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Rezim Kontak:</span>
          <span className="font-semibold text-foreground">{c.regime}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">q maks: <b className="font-mono text-foreground">{fmt(c.qMax, 1)} kPa</b></span>
          <span className="text-muted-foreground">Rasio qmax/qizin: <b className={`font-mono ${c.qRatio > 1 ? "text-destructive" : "text-success"}`}>{fmt(c.qRatio)}</b></span>
        </div>
      </div>
    </div>
  );
}
