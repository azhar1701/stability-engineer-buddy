import { createFileRoute } from "@tanstack/react-router";
import { useProject } from "@/lib/useProject";
import { fmt, KV, PageHeader, Section } from "@/components/kit";
import { MATERIALS, typeById } from "@/lib/engine/master";
import { uid } from "@/lib/engine/defaults";
import type { Component, Shape } from "@/lib/engine/types";

export const Route = createFileRoute("/proyek/$id/geometri")({
  head: () => ({ meta: [{ title: "Geometri & Berat Sendiri — Stabilitas Bangunan Air" }] }),
  component: GeometriPage,
});

const SHAPES: { v: Shape; l: string }[] = [
  { v: "PERSEGI", l: "Persegi panjang" }, { v: "TRAPESIUM", l: "Trapesium simetris" },
  { v: "SEGITIGA_KANAN", l: "Segitiga (tegak hulu)" }, { v: "SEGITIGA_KIRI", l: "Segitiga (tegak hilir)" },
];
const cell = "h-8 w-full rounded-sm border border-input bg-card px-1.5 text-sm num";

function GeometriPage() {
  const { project: p, result: a, update } = useProject();
  const upd = (id: string, patch: Partial<Component>) => update((x) => ({ ...x, components: x.components.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const add = (name = "Komponen") => update((x) => ({ ...x, components: [...x.components, { id: uid(), name, shape: "PERSEGI", b1: 0, b2: 0, h: 0, x0: 0, z0: 0, material: "Beton bertulang" }] }));
  const del = (id: string) => update((x) => ({ ...x, components: x.components.filter((c) => c.id !== id) }));
  const num = (c: Component, k: keyof Component) => (
    <input type="number" step="any" className={cell} value={c[k] as number} onChange={(e) => upd(c.id, { [k]: parseFloat(e.target.value) || 0 })} />
  );
  return (
    <>
      <PageHeader code="11_GEOMETRI" title="Geometri dan Berat Sendiri" desc="Koordinat X diukur dari heel (hulu) ke arah toe (hilir); Z dari dasar fondasi. Lengan momen dihitung terhadap toe (x = B)." />
      <Section title="Komponen" aside={
        <div className="flex gap-2">
          <select className="h-7 rounded-sm border bg-card px-1 text-xs" value="" onChange={(e) => e.target.value && add(e.target.value)}>
            <option value="">+ dari profil {p.type}…</option>
            {typeById(p.type).components.map((n) => <option key={n}>{n}</option>)}
          </select>
          <button onClick={() => add()} className="rounded-sm bg-primary px-2 text-xs text-primary-foreground">+ Komponen</button>
        </div>
      }>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>{["Komponen", "Bentuk", "b1/dasar", "b2/atas", "h", "X0", "Z0", "Material", "A m²", "Xc", "Zc", "W kN", "M toe kNm", ""].map((h) => <th key={h} className="px-1 py-1 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {p.components.map((c, i) => {
                const r = a.comps[i]!;
                return (
                  <tr key={c.id} className="border-t">
                    <td className="p-1"><input className={cell + " font-sans"} value={c.name} onChange={(e) => upd(c.id, { name: e.target.value })} /></td>
                    <td className="p-1"><select className={cell + " font-sans"} value={c.shape} onChange={(e) => upd(c.id, { shape: e.target.value as Shape })}>{SHAPES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}</select></td>
                    <td className="w-20 p-1">{num(c, "b1")}</td>
                    <td className="w-20 p-1">{c.shape === "TRAPESIUM" ? num(c, "b2") : <span className="text-muted-foreground">—</span>}</td>
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
                    <td className="p-1"><button onClick={() => del(c.id)} className="text-xs text-destructive">✕</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Section title="Sketsa penampang"><Sketch /></Section>
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
    </>
  );
}

const MATERIAL_COLORS: Record<string, { fill: string; stroke: string }> = {
  "Beton bertulang": { fill: "oklch(0.78 0.02 245)", stroke: "oklch(0.35 0.04 245)" },
  "Beton polos": { fill: "oklch(0.85 0.015 240)", stroke: "oklch(0.40 0.03 245)" },
  "Pasangan batu mortar": { fill: "oklch(0.80 0.04 60)", stroke: "oklch(0.38 0.06 50)" },
  "Tanah urug": { fill: "oklch(0.75 0.08 70)", stroke: "oklch(0.45 0.08 60)" },
};

function Sketch() {
  const { project: p, result: a } = useProject();
  const polys = a.comps.map((c) => {
    const { b1, b2, h, x0, z0 } = c;
    switch (c.shape) {
      case "PERSEGI": return [[x0, z0], [x0 + b1, z0], [x0 + b1, z0 + h], [x0, z0 + h]];
      case "TRAPESIUM": { const o = (b1 - b2) / 2; return [[x0, z0], [x0 + b1, z0], [x0 + b1 - o, z0 + h], [x0 + o, z0 + h]]; }
      case "SEGITIGA_KANAN": return [[x0, z0], [x0 + b1, z0], [x0, z0 + h]];
      case "SEGITIGA_KIRI": return [[x0, z0], [x0 + b1, z0], [x0 + b1, z0 + h]];
    }
  });
  const pts = polys.flat() as number[][];
  const hu = a.wl.hu, hd = a.wl.hd;
  const dCutUp = p.seepage?.enabled ? p.seepage.dCutoffUp : 0;
  const dCutDown = p.seepage?.enabled ? p.seepage.dCutoffDown : 0;
  const maxDepth = Math.max(dCutUp, dCutDown, 0.5);

  const maxX = Math.max(a.B, ...pts.map((q) => q[0]!), 1);
  const maxZ = Math.max(...pts.map((q) => q[1]!), hu, 1);
  const pad = 1.8, W = 620, H = 320;
  const s = Math.min(W / (maxX + 2 * pad), (H - 50) / (maxZ + maxDepth + 0.5));
  const groundBaseY = H - (maxDepth + 0.8) * s;
  const X = (x: number) => (x + pad) * s;
  const Z = (z: number) => groundBaseY - z * s;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-md bg-muted/20 border border-border/80">
      <defs>
        <pattern id="ground-hatch" width="8" height="8" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="8" stroke="oklch(0.65 0.04 60 / 0.3)" strokeWidth="1" />
        </pattern>
        <linearGradient id="water-hulu-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.68 0.14 230 / 0.6)" />
          <stop offset="100%" stopColor="oklch(0.68 0.14 230 / 0.2)" />
        </linearGradient>
        <linearGradient id="water-hilir-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.68 0.14 230 / 0.5)" />
          <stop offset="100%" stopColor="oklch(0.68 0.14 230 / 0.15)" />
        </linearGradient>
      </defs>

      {/* Subsoil Hatch under foundation base */}
      <rect x={0} y={Z(0)} width={W} height={H - Z(0)} fill="url(#ground-hatch)" />

      {/* Water body hulu (upstream) */}
      {a.act.hu && hu > 0 && (
        <g>
          <rect x={X(-pad)} y={Z(hu)} width={pad * s} height={hu * s} fill="url(#water-hulu-grad)" />
          <line x1={X(-pad)} x2={X(0)} y1={Z(hu)} y2={Z(hu)} stroke="oklch(0.55 0.16 230)" strokeWidth={1.5} />
          <text x={X(-pad) + 6} y={Z(hu) - 5} className="fill-primary font-mono text-[10px] font-bold">M.A Hulu hu={hu}m</text>
        </g>
      )}

      {/* Water body hilir (downstream) */}
      {a.act.hd && hd > 0 && (
        <g>
          <rect x={X(a.B)} y={Z(hd)} width={(maxX + pad - a.B) * s} height={hd * s} fill="url(#water-hilir-grad)" />
          <line x1={X(a.B)} x2={W} y1={Z(hd)} y2={Z(hd)} stroke="oklch(0.55 0.16 230)" strokeWidth={1.5} />
          <text x={X(a.B) + 8} y={Z(hd) - 5} className="fill-primary font-mono text-[10px] font-bold">M.A Hilir hd={hd}m</text>
        </g>
      )}

      {/* Foundation interface line (z = 0) */}
      <line x1={0} x2={W} y1={Z(0)} y2={Z(0)} className="stroke-foreground/60" strokeWidth={1.5} strokeDasharray="6 3" />

      {/* Cutoff wall hulu & hilir penetrating downwards if defined */}
      {dCutUp > 0 && (
        <g>
          <rect x={X(0)} y={Z(0)} width={0.4 * s} height={dCutUp * s} fill="oklch(0.7 0.02 245)" stroke="oklch(0.35 0.04 245)" strokeWidth={1} />
          <text x={X(0) + 0.4 * s + 4} y={Z(0) + (dCutUp * s) / 2} className="fill-muted-foreground text-[8px] font-mono">Cutoff {dCutUp}m</text>
        </g>
      )}
      {dCutDown > 0 && (
        <g>
          <rect x={X(a.B) - 0.4 * s} y={Z(0)} width={0.4 * s} height={dCutDown * s} fill="oklch(0.7 0.02 245)" stroke="oklch(0.35 0.04 245)" strokeWidth={1} />
          <text x={X(a.B) - 0.4 * s - 42} y={Z(0) + (dCutDown * s) / 2} className="fill-muted-foreground text-[8px] font-mono">Cutoff {dCutDown}m</text>
        </g>
      )}

      {/* Structural component polygons */}
      {polys.map((poly, i) => {
        if (!poly || poly.length === 0) return null;
        const mat = a.comps[i]?.material ?? "Beton bertulang";
        const color = MATERIAL_COLORS[mat] ?? MATERIAL_COLORS["Beton bertulang"]!;
        return (
          <g key={i}>
            <polygon
              points={poly.map(([x, z]: number[]) => `${X(x!)},${Z(z!)}`).join(" ")}
              fill={color.fill}
              stroke={color.stroke}
              strokeWidth={1.5}
              className="transition-opacity hover:opacity-80"
            />
          </g>
        );
      })}

      {/* Center of composite gravity indicator (Xc, Zc) */}
      {a.W > 0 && (
        <g transform={`translate(${X(a.Xc_total)}, ${Z(a.Zc_total)})`}>
          <circle r={4.5} fill="none" stroke="oklch(0.44 0.16 250)" strokeWidth={1.5} />
          <circle r={2} fill="oklch(0.44 0.16 250)" />
          <text x={7} y={3} className="fill-primary font-mono text-[9px] font-bold">CG</text>
        </g>
      )}

      {/* Dimension Line for B at base */}
      <g transform={`translate(0, ${Z(0) + 18})`}>
        <line x1={X(0)} x2={X(a.B)} y1={0} y2={0} stroke="oklch(0.35 0.04 245)" strokeWidth={1.2} />
        <line x1={X(0)} x2={X(0)} y1={-4} y2={4} stroke="oklch(0.35 0.04 245)" strokeWidth={1.2} />
        <line x1={X(a.B)} x2={X(a.B)} y1={-4} y2={4} stroke="oklch(0.35 0.04 245)" strokeWidth={1.2} />
        <text x={(X(0) + X(a.B)) / 2 - 20} y={-4} className="fill-foreground font-mono text-[10px] font-semibold">B = {fmt(a.B)} m</text>
      </g>

      <text x={X(0)} y={Z(0) - 6} className="fill-foreground text-[10px] font-bold">Heel (0,0)</text>
      <text x={X(a.B) - 24} y={Z(0) - 6} className="fill-foreground text-[10px] font-bold">Toe (B,0)</text>
    </svg>
  );
}
