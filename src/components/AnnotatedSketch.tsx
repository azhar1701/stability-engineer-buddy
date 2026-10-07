import React, { forwardRef, useState, useRef, useEffect } from "react";
import { useProject } from "@/lib/useProject";
import { fmt } from "@/components/kit";
import type { Project, AnalysisResult, Component } from "@/lib/engine/types";

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
  interactive?: boolean;
  allowDrag?: boolean;
  allowZoom?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onUpdateComponent?: (id: string, patch: Partial<Component>) => void;
  onUpdateCutoff?: (type: "up" | "down", depth: number) => void;
  onUpdateApron?: (type: "up" | "down", length: number) => void;
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
    interactive = false,
    allowDrag = false,
    allowZoom = true,
    canUndo = false,
    canRedo = false,
    onUndo,
    onRedo,
    onUpdateComponent,
    onUpdateCutoff,
    onUpdateApron,
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

  // Viewport Zoom & Pan State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Drag previews for real-time smooth interaction
  const [previewComp, setPreviewComp] = useState<{ id: string; x0: number; z0: number; name: string } | null>(null);
  const [previewCutoff, setPreviewCutoff] = useState<{ type: "up" | "down"; depth: number } | null>(null);
  const [previewApron, setPreviewApron] = useState<{ type: "up" | "down"; length: number } | null>(null);
  const [dragHud, setDragHud] = useState<{ screenX: number; screenY: number; text: string; subtext?: string } | null>(null);

  const svgInternalRef = useRef<SVGSVGElement | null>(null);
  const viewportGroupRef = useRef<SVGGElement | null>(null);
  const panStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number } | null>(null);

  const dragCompRef = useRef<{
    compId: string;
    startWorldX: number;
    startWorldZ: number;
    origX0: number;
    origZ0: number;
    startClientX: number;
    startClientY: number;
    hasMoved: boolean;
  } | null>(null);

  const dragCutoffRef = useRef<{
    type: "up" | "down";
    startGroupY: number;
    origDepth: number;
    startClientX: number;
    startClientY: number;
  } | null>(null);

  const dragApronRef = useRef<{
    type: "up" | "down";
    origLength: number;
    startClientX: number;
    startClientY: number;
    startWorldX: number;
  } | null>(null);

  // Sync ref with external forwarded ref
  const setSvgRef = (node: SVGSVGElement | null) => {
    svgInternalRef.current = node;
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      (ref as React.MutableRefObject<SVGSVGElement | null>).current = node;
    }
  };

  // Wheel zoom handler with non-passive preventDefault
  useEffect(() => {
    const el = svgInternalRef.current;
    if (!el || !allowZoom) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      setZoom((z) => {
        const next = Math.min(Math.max(z * factor, 0.5), 4.0);
        return Math.round(next * 100) / 100;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [allowZoom]);

  if (!p || !a) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
        Data proyek tidak tersedia untuk sketsa.
      </div>
    );
  }

  // Active components list applying live dragging preview
  const activeComps = a.comps.map((c) => {
    if (previewComp && previewComp.id === c.id) {
      return { ...c, x0: previewComp.x0, z0: previewComp.z0 };
    }
    return c;
  });

  const makePolys = (compsList: typeof a.comps) =>
    compsList.map((c) => {
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

  const polys = makePolys(activeComps);
  const origPolys = makePolys(a.comps);

  const pts = origPolys.flat() as number[][];
  const hu = a.wl.hu;
  const hd = a.wl.hd;
  const isSaluran = p.type === "SLN" || p.type === "TLG";
  const isDinding = p.type === "DND";

  // Channel (SLN / TLG) geometry identification
  const leftWall = activeComps.find(
    (c) => c.h > 0.2 && (c.x0 < a.B * 0.48 || c.name.toLowerCase().includes("kiri"))
  ) ?? (activeComps.length >= 2 ? activeComps[1] : undefined);

  const rightWall = activeComps.find(
    (c) => c.h > 0.2 && (c.x0 + c.b1 > a.B * 0.52 || c.name.toLowerCase().includes("kanan"))
  ) ?? (activeComps.length >= 3 ? activeComps[2] : undefined);

  const baseComp = activeComps.find(
    (c) => c.z0 === 0 && (c.b1 >= a.B * 0.5 || c.name.toLowerCase().includes("dasar") || c.name.toLowerCase().includes("lining"))
  );
  const zBed = baseComp ? baseComp.h : Math.min(...activeComps.map((c) => c.z0), 0);
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

  // Cutoff depths (live preview during drag)
  const baseCutUp = p.seepage?.enabled ? p.seepage.dCutoffUp : 0;
  const baseCutDown = p.seepage?.enabled ? p.seepage.dCutoffDown : 0;
  const dCutUp = previewCutoff && previewCutoff.type === "up" ? previewCutoff.depth : baseCutUp;
  const dCutDown = previewCutoff && previewCutoff.type === "down" ? previewCutoff.depth : baseCutDown;

  const baseApronUp = p.seepage?.enabled ? (p.seepage.lApronUp ?? 0) : 0;
  const baseApronDown = p.seepage?.enabled ? (p.seepage.lApronDown ?? 0) : 0;
  const lApronUp = previewApron && previewApron.type === "up" ? previewApron.length : baseApronUp;
  const lApronDown = previewApron && previewApron.type === "down" ? previewApron.length : baseApronDown;
  // Use stable maxDepth and minX/maxX for scale calculation to keep coordinate system rock-solid during dragging
  const maxDepth = Math.max(baseCutUp, baseCutDown, 0.6);

  const minX = Math.min(0, -baseApronUp - (allowDrag ? 0.6 : 0), ...pts.map((q) => q[0]!));
  const maxX = Math.max(a.B, a.B + baseApronDown + (allowDrag ? 0.6 : 0), ...pts.map((q) => q[0]!), 1);
  const maxZ = Math.max(
    ...pts.map((q) => q[1]!),
    isSaluran ? zWaterSaluran : hu,
    isDinding ? Math.max(p.Hsoil ?? 0, hd, hu) : 0,
    1
  );
  const spanX = maxX - minX;

  // Extra padding adapts to structure type:
  const pad = isSaluran ? (annotate ? 0.9 : 0.5) : isDinding ? (annotate ? 1.8 : 1.3) : (annotate ? 2.4 : 1.8);
  const W = svgWidth;
  const H = svgHeight;
  const topReserve = annotate ? 45 : 30;
  const bottomReserve = annotate ? 65 : 45;

  const s = Math.min((W - 60) / (spanX + 2 * pad), (H - topReserve - bottomReserve) / (maxZ + maxDepth + 0.4));
  const groundBaseY = H - bottomReserve - maxDepth * s;
  const X = (x: number) => 30 + (x - minX + pad) * s;
  const Z = (z: number) => groundBaseY - z * s;

  // Coordinate conversion from screen clientX/clientY to World meters (x, z)
  const getWorldCoords = (clientX: number, clientY: number) => {
    const svgEl = svgInternalRef.current;
    const groupEl = viewportGroupRef.current;
    if (!svgEl || !groupEl) return { worldX: 0, worldZ: 0, groupX: 0, groupY: 0 };

    if (typeof svgEl.createSVGPoint !== "function" || typeof groupEl.getScreenCTM !== "function") {
      const rect = svgEl.getBoundingClientRect?.() ?? { left: 0, top: 0 };
      const groupX = clientX - rect.left;
      const groupY = clientY - rect.top;
      const worldX = (groupX - 30) / (s || 1) + minX - pad;
      const worldZ = (groundBaseY - groupY) / (s || 1);
      return { worldX, worldZ, groupX, groupY };
    }

    const pt = svgEl.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;

    const ctm = groupEl.getScreenCTM();
    if (!ctm) return { worldX: 0, worldZ: 0, groupX: 0, groupY: 0 };

    const groupP = pt.matrixTransform(ctm.inverse());
    const groupX = groupP.x;
    const groupY = groupP.y;

    const worldX = (groupX - 30) / s + minX - pad;
    const worldZ = (groundBaseY - groupY) / s;

    return { worldX, worldZ, groupX, groupY };
  };

  // Zoom toolbar handlers
  const handleZoomIn = () => {
    setZoom((z) => Math.min(Math.round((z + 0.25) * 100) / 100, 4.0));
  };
  const handleZoomOut = () => {
    setZoom((z) => Math.max(Math.round((z - 0.25) * 100) / 100, 0.5));
  };
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Background pan handlers
  const handleBgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!allowZoom && !allowDrag) return;
    const target = e.target as HTMLElement;
    if (target.getAttribute("data-bg") !== "true" && e.target !== e.currentTarget) return;

    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {}

    setIsPanning(true);
    panStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleBgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isPanning || !panStartRef.current) return;
    const dx = e.clientX - panStartRef.current.clientX;
    const dy = e.clientY - panStartRef.current.clientY;
    setPan({
      x: panStartRef.current.panX + dx,
      y: panStartRef.current.panY + dy,
    });
  };

  const handleBgPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
      try {
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Component Drag Handlers
  const handleCompPointerDown = (e: React.PointerEvent, comp: Component, idx: number) => {
    if (!interactive || !allowDrag) {
      onClickComponent?.(idx);
      return;
    }
    e.stopPropagation();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {}

    const coords = getWorldCoords(e.clientX, e.clientY);
    dragCompRef.current = {
      compId: comp.id,
      startWorldX: coords.worldX,
      startWorldZ: coords.worldZ,
      origX0: comp.x0,
      origZ0: comp.z0,
      startClientX: e.clientX,
      startClientY: e.clientY,
      hasMoved: false,
    };

    setPreviewComp({ id: comp.id, x0: comp.x0, z0: comp.z0, name: comp.name });
    setDragHud({
      screenX: e.clientX,
      screenY: e.clientY,
      text: `${comp.name}: X₀ = ${fmt(comp.x0)} m · Z₀ = ${fmt(comp.z0)} m`,
      subtext: "Geser mouse untuk atur posisi",
    });
  };

  const handleCompPointerMove = (e: React.PointerEvent, comp: Component) => {
    if (!dragCompRef.current || dragCompRef.current.compId !== comp.id) return;

    const distPixel = Math.hypot(
      e.clientX - dragCompRef.current.startClientX,
      e.clientY - dragCompRef.current.startClientY
    );
    if (distPixel > 3) {
      dragCompRef.current.hasMoved = true;
    }

    const coords = getWorldCoords(e.clientX, e.clientY);
    const deltaX = coords.worldX - dragCompRef.current.startWorldX;
    const deltaZ = coords.worldZ - dragCompRef.current.startWorldZ;

    let newX0 = dragCompRef.current.origX0 + deltaX;
    let newZ0 = dragCompRef.current.origZ0 + deltaZ;

    // Snapping logic if shift key is not held
    if (!e.shiftKey) {
      newX0 = Math.round(newX0 * 20) / 20;
      newZ0 = Math.round(newZ0 * 20) / 20;

      // Ground snap
      if (Math.abs(newZ0) < 0.08) newZ0 = 0;
      // Heel snap
      if (Math.abs(newX0) < 0.08) newX0 = 0;
      // Toe snap
      if (Math.abs(newX0 + comp.b1 - a.B) < 0.08) {
        newX0 = +(a.B - comp.b1).toFixed(4);
      }

      // Snap to adjacent components
      for (const other of a.comps) {
        if (other.id === comp.id) continue;
        if (Math.abs(newX0 - (other.x0 + other.b1)) < 0.08) {
          newX0 = +(other.x0 + other.b1).toFixed(4);
        }
        if (Math.abs(newX0 + comp.b1 - other.x0) < 0.08) {
          newX0 = +(other.x0 - comp.b1).toFixed(4);
        }
        if (Math.abs(newZ0 - (other.z0 + other.h)) < 0.08) {
          newZ0 = +(other.z0 + other.h).toFixed(4);
        }
      }
    }

    newZ0 = Math.max(0, newZ0);
    newX0 = Math.max(0, newX0);

    setPreviewComp({ id: comp.id, x0: newX0, z0: newZ0, name: comp.name });

    const dx = +(newX0 - dragCompRef.current.origX0).toFixed(2);
    const dz = +(newZ0 - dragCompRef.current.origZ0).toFixed(2);

    setDragHud({
      screenX: e.clientX,
      screenY: e.clientY,
      text: `${comp.name}: X₀ = ${fmt(newX0)} m, Z₀ = ${fmt(newZ0)} m`,
      subtext: `ΔX: ${dx >= 0 ? "+" : ""}${dx} m · ΔZ: ${dz >= 0 ? "+" : ""}${dz} m ${newZ0 === 0 ? "(Dasar Fondasi)" : ""}`,
    });
  };

  const handleCompPointerUp = (e: React.PointerEvent, comp: Component, idx: number) => {
    if (!dragCompRef.current || dragCompRef.current.compId !== comp.id) return;
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {}

    const hasMoved = dragCompRef.current.hasMoved;
    const finalX0 = previewComp?.x0 ?? comp.x0;
    const finalZ0 = previewComp?.z0 ?? comp.z0;

    dragCompRef.current = null;
    setPreviewComp(null);
    setDragHud(null);

    if (hasMoved) {
      onUpdateComponent?.(comp.id, { x0: finalX0, z0: finalZ0 });
    } else {
      onClickComponent?.(idx);
    }
  };

  // Cutoff Drag Handlers
  const handleCutoffPointerDown = (
    e: React.PointerEvent,
    type: "up" | "down",
    currentDepth: number
  ) => {
    if (!interactive || !allowDrag) return;
    e.stopPropagation();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {}

    const clientX = Number.isFinite(e.clientX) ? e.clientX : 0;
    const clientY = Number.isFinite(e.clientY) ? e.clientY : 0;
    const coords = getWorldCoords(clientX, clientY);
    dragCutoffRef.current = {
      type,
      startGroupY: coords.groupY,
      origDepth: currentDepth,
      startClientX: clientX,
      startClientY: clientY,
    };
    setPreviewCutoff({ type, depth: currentDepth });
    setDragHud({
      screenX: clientX,
      screenY: clientY,
      text: `Cutoff ${type === "up" ? "Hulu" : "Hilir"}: ${fmt(currentDepth)} m`,
      subtext: "Tarik ke bawah untuk menambah kedalaman",
    });
  };

  const handleCutoffPointerMove = (e: React.PointerEvent) => {
    if (!dragCutoffRef.current) return;
    const clientX = Number.isFinite(e.clientX) ? e.clientX : 0;
    const clientY = Number.isFinite(e.clientY) ? e.clientY : 0;
    const coords = getWorldCoords(clientX, clientY);

    // Depth extends downwards from groundBaseY
    const rawDepth = Math.max(0, (coords.groupY - groundBaseY) / s);
    const targetDepth = Math.min(Math.max(0, Math.round(rawDepth * 10) / 10), 12.0);

    setPreviewCutoff({ type: dragCutoffRef.current.type, depth: targetDepth });

    const curUp = dragCutoffRef.current.type === "up" ? targetDepth : dCutUp;
    const curDown = dragCutoffRef.current.type === "down" ? targetDepth : dCutDown;
    const Lv = 2 * curUp + 2 * curDown;
    const Lh = lApronUp + a.B + lApronDown;
    const LcreepLane = Lv + (1 / 3) * Lh;
    const deltaH = Math.max(hu - hd, 0);
    const liveCw = deltaH > 0 ? +(LcreepLane / deltaH).toFixed(2) : 999;
    const isOk = liveCw >= 5.0;

    setDragHud({
      screenX: clientX,
      screenY: clientY,
      text: `Cutoff ${dragCutoffRef.current.type === "up" ? "Hulu" : "Hilir"}: d = ${fmt(targetDepth)} m`,
      subtext: deltaH > 0 ? `Lane Cw ≈ ${liveCw} (${isOk ? "AMAN ✓" : "RAWAN PIPING ⚠️"})` : "Tarik untuk atur kedalaman",
    });
  };

  const handleCutoffPointerUp = (e: React.PointerEvent) => {
    if (!dragCutoffRef.current) return;
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {}

    const finalType = dragCutoffRef.current.type;
    const clientX = Number.isFinite(e.clientX) ? e.clientX : dragCutoffRef.current.startClientX;
    const clientY = Number.isFinite(e.clientY) ? e.clientY : dragCutoffRef.current.startClientY;
    const distPixel = Math.hypot(
      clientX - dragCutoffRef.current.startClientX,
      clientY - dragCutoffRef.current.startClientY
    );
    let finalDepth = previewCutoff?.depth ?? dragCutoffRef.current.origDepth;
    if (distPixel <= 4 && dragCutoffRef.current.origDepth === 0 && finalDepth === 0) {
      finalDepth = 1.5;
    }

    dragCutoffRef.current = null;
    setPreviewCutoff(null);
    setDragHud(null);

    onUpdateCutoff?.(finalType, finalDepth);
  };

  // Apron Drag Handlers
  const handleApronPointerDown = (
    e: React.PointerEvent,
    type: "up" | "down",
    currentLength: number
  ) => {
    if (!interactive || !allowDrag) return;
    e.stopPropagation();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {}

    const clientX = Number.isFinite(e.clientX) ? e.clientX : 0;
    const clientY = Number.isFinite(e.clientY) ? e.clientY : 0;
    const coords = getWorldCoords(clientX, clientY);
    dragApronRef.current = {
      type,
      origLength: currentLength,
      startClientX: clientX,
      startClientY: clientY,
      startWorldX: coords.worldX,
    };
    setPreviewApron({ type, length: currentLength });
    setDragHud({
      screenX: clientX,
      screenY: clientY,
      text: `Apron ${type === "up" ? "Hulu (Lu)" : "Hilir (Ld)"}: ${fmt(currentLength)} m`,
      subtext: "Tarik horizontal untuk atur panjang apron",
    });
  };

  const handleApronPointerMove = (e: React.PointerEvent) => {
    if (!dragApronRef.current) return;
    const clientX = Number.isFinite(e.clientX) ? e.clientX : 0;
    const clientY = Number.isFinite(e.clientY) ? e.clientY : 0;
    const coords = getWorldCoords(clientX, clientY);
    const deltaWorldX = coords.worldX - dragApronRef.current.startWorldX;

    let targetLength = 0;
    if (dragApronRef.current.type === "up") {
      const rawLength = Math.max(0, dragApronRef.current.origLength - deltaWorldX);
      targetLength = Math.min(Math.max(0, Math.round(rawLength * 10) / 10), 30.0);
    } else {
      const rawLength = Math.max(0, dragApronRef.current.origLength + deltaWorldX);
      targetLength = Math.min(Math.max(0, Math.round(rawLength * 10) / 10), 30.0);
    }

    setPreviewApron({ type: dragApronRef.current.type, length: targetLength });

    const curUp = dragApronRef.current.type === "up" ? targetLength : lApronUp;
    const curDown = dragApronRef.current.type === "down" ? targetLength : lApronDown;
    const Lv = 2 * dCutUp + 2 * dCutDown;
    const Lh = curUp + a.B + curDown;
    const LcreepLane = Lv + (1 / 3) * Lh;
    const deltaH = Math.max(hu - hd, 0);
    const liveCw = deltaH > 0 ? +(LcreepLane / deltaH).toFixed(2) : 999;
    const isOk = liveCw >= 5.0;

    setDragHud({
      screenX: clientX,
      screenY: clientY,
      text: `Apron ${dragApronRef.current.type === "up" ? "Hulu (Lu)" : "Hilir (Ld)"}: L = ${fmt(targetLength)} m`,
      subtext: deltaH > 0 ? `Lh = ${fmt(Lh)}m · Lane Cw ≈ ${liveCw} (${isOk ? "AMAN ✓" : "RAWAN PIPING ⚠️"})` : "Tarik horizontal untuk atur panjang apron",
    });
  };

  const handleApronPointerUp = (e: React.PointerEvent) => {
    if (!dragApronRef.current) return;
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {}

    const finalType = dragApronRef.current.type;
    const clientX = Number.isFinite(e.clientX) ? e.clientX : dragApronRef.current.startClientX;
    const clientY = Number.isFinite(e.clientY) ? e.clientY : dragApronRef.current.startClientY;
    const distPixel = Math.hypot(
      clientX - dragApronRef.current.startClientX,
      clientY - dragApronRef.current.startClientY
    );
    let finalLength = previewApron?.length ?? dragApronRef.current.origLength;

    if (distPixel <= 4 && dragApronRef.current.origLength === 0 && finalLength === 0) {
      finalLength = 3.0;
    }

    dragApronRef.current = null;
    setPreviewApron(null);
    setDragHud(null);

    onUpdateApron?.(finalType, finalLength);
  };

  // Unique materials used for legend
  const usedMaterials = Array.from(new Set(activeComps.map((c) => c.material)));

  return (
    <div className={`relative overflow-hidden rounded-md border border-border/80 bg-muted/15 select-none ${className}`}>
      {/* Floating Zoom & Pan Controls */}
      {allowZoom && (
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 rounded-md border border-border/70 bg-background/90 px-1.5 py-1 backdrop-blur-md shadow-xs">
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out (-)"
            className="flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all"
          >
            −
          </button>
          <span className="min-w-[42px] text-center font-mono text-[11px] font-semibold text-foreground select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In (+)"
            className="flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all"
          >
            +
          </button>
          <div className="h-3.5 w-px bg-border/60 mx-0.5" />
          <button
            type="button"
            onClick={handleResetView}
            title="Reset Zoom & Pan (100% & Center)"
            className="flex h-6 w-6 items-center justify-center rounded text-xs text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all"
          >
            ⟲
          </button>
          {onUndo && (
            <>
              <div className="h-3.5 w-px bg-border/60 mx-0.5" />
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo Riwayat Modifikasi (Ctrl+Z)"
                className="flex h-6 w-6 items-center justify-center rounded text-xs text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                ↶
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                title="Redo Riwayat Modifikasi (Ctrl+Y)"
                className="flex h-6 w-6 items-center justify-center rounded text-xs text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                ↷
              </button>
            </>
          )}
        </div>
      )}

      {/* Interactive Mode Badge */}
      {interactive && (
        <div className="absolute top-2.5 left-2.5 z-20 hidden sm:flex items-center gap-2 rounded-md border border-border/60 bg-background/85 px-2.5 py-1 text-[10px] text-muted-foreground backdrop-blur-md shadow-xs pointer-events-none">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-foreground">Kanvas Interaktif</span>
          <span className="text-muted-foreground/80">• Drag Komponen / Cutoff • Scroll Wheel Zoom</span>
        </div>
      )}

      {/* SVG Canvas */}
      <svg
        ref={setSvgRef}
        viewBox={`0 0 ${W} ${H}`}
        className={`w-full overflow-hidden font-sans select-none ${isPanning ? "cursor-grabbing" : allowZoom || allowDrag ? "cursor-grab" : "cursor-default"}`}
        onPointerDown={handleBgPointerDown}
        onPointerMove={handleBgPointerMove}
        onPointerUp={handleBgPointerUp}
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

      {/* Background catch-rect for panning */}
      <rect x={-4000} y={-4000} width={W + 8000} height={H + 8000} fill="transparent" data-bg="true" />

      {/* Viewport Zoom & Pan Transformation Group */}
      <g
        ref={viewportGroupRef}
        transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
        style={{
          transformOrigin: `${W / 2}px ${H / 2}px`,
          transition: isPanning || previewComp || previewCutoff || previewApron ? "none" : "transform 0.15s ease-out",
        }}
      >
        {/* Subsoil Hatch under foundation base */}
        <rect x={-3000} y={Z(0)} width={6000} height={3000} fill="url(#ground-hatch-ann)" />

      {/* Upstream Apron if present */}
      {lApronUp > 0 && (
        <g
          className={interactive && allowDrag ? (previewApron?.type === "up" ? "cursor-grabbing" : "cursor-grab") : undefined}
          onPointerDown={interactive && allowDrag ? (e) => handleApronPointerDown(e, "up", lApronUp) : undefined}
          onPointerMove={interactive && allowDrag ? handleApronPointerMove : undefined}
          onPointerUp={interactive && allowDrag ? handleApronPointerUp : undefined}
        >
          <rect
            x={X(-lApronUp)}
            y={Z(0)}
            width={lApronUp * s}
            height={0.5 * s}
            fill={previewApron?.type === "up" ? "oklch(0.80 0.05 240)" : "oklch(0.85 0.02 240)"}
            stroke={previewApron?.type === "up" ? "oklch(0.45 0.25 240)" : "oklch(0.45 0.04 245)"}
            strokeWidth={previewApron?.type === "up" ? 2 : 1}
            className="transition-colors hover:brightness-95"
          />
          <rect
            x={X(-lApronUp)}
            y={Z(0)}
            width={lApronUp * s}
            height={0.5 * s}
            fill="url(#apron-hatch)"
            className="pointer-events-none"
          />
          <text
            x={X(-lApronUp / 2)}
            y={Z(0) + 0.25 * s + 3.5}
            textAnchor="middle"
            className="fill-muted-foreground text-[8px] font-mono select-none pointer-events-none"
          >
            Apron Hulu ({fmt(lApronUp)}m)
          </text>
          {annotate && lApronUp > 0 && (
            <g className="text-slate-600 dark:text-slate-400 pointer-events-none">
              <line
                x1={X(-lApronUp)}
                y1={Z(0) - 7}
                x2={X(0)}
                y2={Z(0) - 7}
                stroke="currentColor"
                strokeWidth={0.9}
                markerStart="url(#dim-arrow-start)"
                markerEnd="url(#dim-arrow-end)"
              />
              <text
                x={X(-lApronUp / 2)}
                y={Z(0) - 10}
                textAnchor="middle"
                className="fill-slate-700 dark:fill-slate-300 font-mono text-[8px] font-semibold"
              >
                Lu = {fmt(lApronUp)}m
              </text>
            </g>
          )}
        </g>
      )}

      {/* Downstream Apron if present */}
      {lApronDown > 0 && (
        <g
          className={interactive && allowDrag ? (previewApron?.type === "down" ? "cursor-grabbing" : "cursor-grab") : undefined}
          onPointerDown={interactive && allowDrag ? (e) => handleApronPointerDown(e, "down", lApronDown) : undefined}
          onPointerMove={interactive && allowDrag ? handleApronPointerMove : undefined}
          onPointerUp={interactive && allowDrag ? handleApronPointerUp : undefined}
        >
          <rect
            x={X(a.B)}
            y={Z(0)}
            width={lApronDown * s}
            height={0.5 * s}
            fill={previewApron?.type === "down" ? "oklch(0.80 0.05 240)" : "oklch(0.85 0.02 240)"}
            stroke={previewApron?.type === "down" ? "oklch(0.45 0.25 240)" : "oklch(0.45 0.04 245)"}
            strokeWidth={previewApron?.type === "down" ? 2 : 1}
            className="transition-colors hover:brightness-95"
          />
          <rect
            x={X(a.B)}
            y={Z(0)}
            width={lApronDown * s}
            height={0.5 * s}
            fill="url(#apron-hatch)"
            className="pointer-events-none"
          />
          <text
            x={X(a.B + lApronDown / 2)}
            y={Z(0) + 0.25 * s + 3.5}
            textAnchor="middle"
            className="fill-muted-foreground text-[8px] font-mono select-none pointer-events-none"
          >
            Apron Hilir ({fmt(lApronDown)}m)
          </text>
          {annotate && lApronDown > 0 && (
            <g className="text-slate-600 dark:text-slate-400 pointer-events-none">
              <line
                x1={X(a.B)}
                y1={Z(0) - 7}
                x2={X(a.B + lApronDown)}
                y2={Z(0) - 7}
                stroke="currentColor"
                strokeWidth={0.9}
                markerStart="url(#dim-arrow-start)"
                markerEnd="url(#dim-arrow-end)"
              />
              <text
                x={X(a.B + lApronDown / 2)}
                y={Z(0) - 10}
                textAnchor="middle"
                className="fill-slate-700 dark:fill-slate-300 font-mono text-[8px] font-semibold"
              >
                Ld = {fmt(lApronDown)}m
              </text>
            </g>
          )}
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
                <rect x={X(xUpStart)} y={Z(hu)} width={(-xUpStart) * s} height={hu * s} fill="url(#water-hulu-grad-ann)" className="pointer-events-none" />
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
                  className="pointer-events-none"
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

      {/* Cutoff wall hulu (Upstream) */}
      {dCutUp > 0 && (
        <g>
          <rect
            x={X(0)}
            y={Z(0)}
            width={0.4 * s}
            height={dCutUp * s}
            fill="oklch(0.7 0.02 245)"
            stroke={previewCutoff?.type === "up" ? "oklch(0.45 0.25 240)" : "oklch(0.35 0.04 245)"}
            strokeWidth={previewCutoff?.type === "up" ? 2 : 1}
          />
          {annotate && (
            <text x={X(0) + 0.4 * s + 4} y={Z(0) + (dCutUp * s) / 2 + 3} className="fill-muted-foreground text-[8px] font-mono select-none pointer-events-none">
              Cutoff Hulu {fmt(dCutUp)}m
            </text>
          )}
        </g>
      )}

      {/* Cutoff wall hilir (Downstream) */}
      {dCutDown > 0 && (
        <g>
          <rect
            x={X(a.B) - 0.4 * s}
            y={Z(0)}
            width={0.4 * s}
            height={dCutDown * s}
            fill="oklch(0.7 0.02 245)"
            stroke={previewCutoff?.type === "down" ? "oklch(0.45 0.25 240)" : "oklch(0.35 0.04 245)"}
            strokeWidth={previewCutoff?.type === "down" ? 2 : 1}
          />
          {annotate && (
            <text x={X(a.B) - 0.4 * s - 4} y={Z(0) + (dCutDown * s) / 2 + 3} textAnchor="end" className="fill-muted-foreground text-[8px] font-mono select-none pointer-events-none">
              Cutoff Hilir {fmt(dCutDown)}m
            </text>
          )}
        </g>
      )}

      {/* Upstream Cutoff Interactive Handle */}
      {interactive && allowDrag && (
        <g
          className="cursor-ns-resize group"
          role="button"
          aria-label="Cutoff Hulu Handle"
          onPointerDown={(e) => handleCutoffPointerDown(e, "up", dCutUp)}
          onPointerMove={handleCutoffPointerMove}
          onPointerUp={handleCutoffPointerUp}
        >
          {dCutUp > 0 ? (
            <g transform={`translate(${X(0) + 0.2 * s}, ${Z(0) + dCutUp * s})`}>
              <rect
                x={-24}
                y={-5}
                width={48}
                height={14}
                rx={7}
                fill="oklch(0.35 0.12 245)"
                className="stroke-background transition-transform group-hover:scale-110 shadow-md"
                strokeWidth={1.5}
              />
              <text
                x={0}
                y={4}
                textAnchor="middle"
                fill="#ffffff"
                className="font-mono text-[8.5px] font-bold select-none pointer-events-none"
              >
                ↕ {fmt(dCutUp)}m
              </text>
            </g>
          ) : (
            <g transform={`translate(${X(0) + 0.2 * s}, ${Z(0)})`}>
              <rect
                x={-36}
                y={3}
                width={72}
                height={16}
                rx={8}
                fill="oklch(0.9 0.05 240 / 0.85)"
                stroke="oklch(0.5 0.15 240)"
                strokeWidth={1}
                strokeDasharray="3 2"
                className="transition-transform group-hover:scale-105"
              />
              <text
                x={0}
                y={14}
                textAnchor="middle"
                fill="oklch(0.35 0.12 240)"
                className="font-sans text-[8px] font-bold select-none pointer-events-none"
              >
                + Cutoff Hulu ↕
              </text>
            </g>
          )}
        </g>
      )}

      {/* Downstream Cutoff Interactive Handle */}
      {interactive && allowDrag && (
        <g
          className="cursor-ns-resize group"
          role="button"
          aria-label="Cutoff Hilir Handle"
          onPointerDown={(e) => handleCutoffPointerDown(e, "down", dCutDown)}
          onPointerMove={handleCutoffPointerMove}
          onPointerUp={handleCutoffPointerUp}
        >
          {dCutDown > 0 ? (
            <g transform={`translate(${X(a.B) - 0.2 * s}, ${Z(0) + dCutDown * s})`}>
              <rect
                x={-24}
                y={-5}
                width={48}
                height={14}
                rx={7}
                fill="oklch(0.35 0.12 245)"
                className="stroke-background transition-transform group-hover:scale-110 shadow-md"
                strokeWidth={1.5}
              />
              <text
                x={0}
                y={4}
                textAnchor="middle"
                fill="#ffffff"
                className="font-mono text-[8.5px] font-bold select-none pointer-events-none"
              >
                ↕ {fmt(dCutDown)}m
              </text>
            </g>
          ) : (
            <g transform={`translate(${X(a.B) - 0.2 * s}, ${Z(0)})`}>
              <rect
                x={-36}
                y={3}
                width={72}
                height={16}
                rx={8}
                fill="oklch(0.9 0.05 240 / 0.85)"
                stroke="oklch(0.5 0.15 240)"
                strokeWidth={1}
                strokeDasharray="3 2"
                className="transition-transform group-hover:scale-105"
              />
              <text
                x={0}
                y={14}
                textAnchor="middle"
                fill="oklch(0.35 0.12 240)"
                className="font-sans text-[8px] font-bold select-none pointer-events-none"
              >
                + Cutoff Hilir ↕
              </text>
            </g>
          )}
        </g>
      )}

      {/* Upstream Apron Interactive Handle */}
      {interactive && allowDrag && (
        <g
          className="cursor-ew-resize group"
          role="button"
          aria-label="Apron Hulu Handle"
          onPointerDown={(e) => handleApronPointerDown(e, "up", lApronUp)}
          onPointerMove={handleApronPointerMove}
          onPointerUp={handleApronPointerUp}
        >
          {lApronUp > 0 ? (
            <g transform={`translate(${X(-lApronUp)}, ${Z(0) + 0.25 * s})`}>
              <rect
                x={-26}
                y={-8}
                width={52}
                height={16}
                rx={8}
                fill="oklch(0.35 0.12 245)"
                className="stroke-background transition-transform group-hover:scale-110 shadow-md"
                strokeWidth={1.5}
              />
              <text
                x={0}
                y={3.5}
                textAnchor="middle"
                fill="#ffffff"
                className="font-mono text-[8.5px] font-bold select-none pointer-events-none"
              >
                ↔ Lu {fmt(lApronUp)}m
              </text>
            </g>
          ) : (
            <g transform={`translate(${X(0) - 44}, ${Z(0) + 0.25 * s})`}>
              <rect
                x={-40}
                y={-9}
                width={80}
                height={18}
                rx={9}
                fill="oklch(0.92 0.04 240 / 0.9)"
                stroke="oklch(0.5 0.15 240)"
                strokeWidth={1}
                strokeDasharray="3 2"
                className="transition-transform group-hover:scale-105 shadow-2xs"
              />
              <text
                x={0}
                y={3.5}
                textAnchor="middle"
                fill="oklch(0.35 0.12 240)"
                className="font-sans text-[8px] font-bold select-none pointer-events-none"
              >
                + Apron Hulu ↔
              </text>
            </g>
          )}
        </g>
      )}

      {/* Downstream Apron Interactive Handle */}
      {interactive && allowDrag && (
        <g
          className="cursor-ew-resize group"
          role="button"
          aria-label="Apron Hilir Handle"
          onPointerDown={(e) => handleApronPointerDown(e, "down", lApronDown)}
          onPointerMove={handleApronPointerMove}
          onPointerUp={handleApronPointerUp}
        >
          {lApronDown > 0 ? (
            <g transform={`translate(${X(a.B + lApronDown)}, ${Z(0) + 0.25 * s})`}>
              <rect
                x={-26}
                y={-8}
                width={52}
                height={16}
                rx={8}
                fill="oklch(0.35 0.12 245)"
                className="stroke-background transition-transform group-hover:scale-110 shadow-md"
                strokeWidth={1.5}
              />
              <text
                x={0}
                y={3.5}
                textAnchor="middle"
                fill="#ffffff"
                className="font-mono text-[8.5px] font-bold select-none pointer-events-none"
              >
                ↔ Ld {fmt(lApronDown)}m
              </text>
            </g>
          ) : (
            <g transform={`translate(${X(a.B) + 44}, ${Z(0) + 0.25 * s})`}>
              <rect
                x={-40}
                y={-9}
                width={80}
                height={18}
                rx={9}
                fill="oklch(0.92 0.04 240 / 0.9)"
                stroke="oklch(0.5 0.15 240)"
                strokeWidth={1}
                strokeDasharray="3 2"
                className="transition-transform group-hover:scale-105 shadow-2xs"
              />
              <text
                x={0}
                y={3.5}
                textAnchor="middle"
                fill="oklch(0.35 0.12 240)"
                className="font-sans text-[8px] font-bold select-none pointer-events-none"
              >
                + Apron Hilir ↔
              </text>
            </g>
          )}
        </g>
      )}

      {/* Structural component polygons */}
      {polys.map((poly, i) => {
        if (!poly || poly.length === 0) return null;
        const comp = activeComps[i]!;
        const mat = comp.material ?? "Beton bertulang";
        const color = MATERIAL_COLORS[mat] ?? MATERIAL_COLORS["Beton bertulang"]!;
        const isHighlighted = highlightIdx === i;
        const isDragging = previewComp?.id === comp.id;

        return (
          <g
            key={comp.id || i}
            onClick={() => onClickComponent?.(i)}
            onPointerDown={(e) => handleCompPointerDown(e, comp, i)}
            onPointerMove={(e) => handleCompPointerMove(e, comp)}
            onPointerUp={(e) => handleCompPointerUp(e, comp, i)}
            className={
              interactive && allowDrag
                ? isDragging
                  ? "cursor-grabbing"
                  : "cursor-grab"
                : onClickComponent
                ? "cursor-pointer"
                : ""
            }
          >
            {/* Ghost outline showing original position when dragging */}
            {isDragging && origPolys[i] && (
              <polygon
                points={origPolys[i]!.map(([x, z]: number[]) => `${X(x!)},${Z(z!)}`).join(" ")}
                fill="none"
                stroke="oklch(0.5 0.2 250)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                opacity={0.6}
              />
            )}

            <polygon
              points={poly.map(([x, z]: number[]) => `${X(x!)},${Z(z!)}`).join(" ")}
              fill={color.fill}
              stroke={isDragging ? "oklch(0.45 0.25 240)" : isHighlighted ? "oklch(0.5 0.25 25)" : color.stroke}
              strokeWidth={isDragging ? 2.5 : isHighlighted ? 2.5 : 1.5}
              filter={isDragging ? "drop-shadow(0 4px 6px rgba(0,0,0,0.25))" : undefined}
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
          <text x={8} y={3} className="fill-primary font-mono text-[9px] font-bold select-none pointer-events-none">
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
          className="fill-foreground font-mono text-[10px] font-bold select-none pointer-events-none"
        >
          B = {fmt(a.B)} m
        </text>
      </g>

      {/* Heel & Toe points */}
      <g>
        <circle cx={X(0)} cy={Z(0)} r={3} fill="currentColor" className="text-foreground" />
        <text x={X(0)} y={Z(0) - 8} className="fill-foreground text-[10px] font-bold select-none pointer-events-none">
          Heel (0,0)
        </text>

        <circle cx={X(a.B)} cy={Z(0)} r={3} fill="currentColor" className="text-foreground" />
        <text x={X(a.B)} y={Z(0) - 8} textAnchor="end" className="fill-foreground text-[10px] font-bold select-none pointer-events-none">
          Toe (B,0)
        </text>
      </g>
    </g>

    {/* Legend for materials in bottom left (Fixed outside zoom group) */}
    {showLegend && usedMaterials.length > 0 && (
      <g transform={`translate(15, ${H - 24})`} className="text-[9px] select-none pointer-events-none">
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

  {/* Floating HUD Tooltip during dragging */}
  {dragHud && (
    <div
      style={{ left: dragHud.screenX + 16, top: dragHud.screenY - 38 }}
      className="pointer-events-none fixed z-50 rounded-md bg-slate-900/95 text-white px-2.5 py-1.5 text-[11px] font-mono shadow-xl border border-slate-700/80 backdrop-blur-sm transition-opacity flex flex-col gap-0.5"
    >
      <span className="font-semibold text-sky-300">{dragHud.text}</span>
      {dragHud.subtext && <span className="text-[10px] text-slate-300">{dragHud.subtext}</span>}
    </div>
  )}
</div>
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
