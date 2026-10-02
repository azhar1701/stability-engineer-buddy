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
                const r = a.comps[i];
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
        </Section>
      </div>
    </>
  );
}

function Sketch() {
  const { result: a } = useProject();
  const polys = a.comps.map((c) => {
    const { b1, b2, h, x0, z0 } = c;
    switch (c.shape) {
      case "PERSEGI": return [[x0, z0], [x0 + b1, z0], [x0 + b1, z0 + h], [x0, z0 + h]];
      case "TRAPESIUM": { const o = (b1 - b2) / 2; return [[x0, z0], [x0 + b1, z0], [x0 + b1 - o, z0 + h], [x0 + o, z0 + h]]; }
      case "SEGITIGA_KANAN": return [[x0, z0], [x0 + b1, z0], [x0, z0 + h]];
      case "SEGITIGA_KIRI": return [[x0, z0], [x0 + b1, z0], [x0 + b1, z0 + h]];
    }
  });
  const pts = polys.flat();
  const hu = a.wl.hu, hd = a.wl.hd;
  const maxX = Math.max(a.B, ...pts.map((q) => q[0]), 1);
  const maxZ = Math.max(...pts.map((q) => q[1]), hu, 1);
  const pad = 1.5, W = 600, H = 300;
  const s = Math.min(W / (maxX + 2 * pad), H / (maxZ + pad));
  const X = (x: number) => (x + pad) * s, Z = (z: number) => H - (z + 0.3) * s;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-sm bg-muted/40">
      {a.act.hu && hu > 0 && <rect x={X(-pad)} y={Z(hu)} width={pad * s} height={hu * s} className="fill-water/40" />}
      {a.act.hd && hd > 0 && <rect x={X(maxX)} y={Z(hd)} width={pad * s} height={hd * s} className="fill-water/40" />}
      <line x1={0} x2={W} y1={Z(0)} y2={Z(0)} className="stroke-foreground/40" strokeDasharray="4 3" />
      {polys.map((poly, i) => poly && poly.length > 0 && (
        <polygon key={i} points={poly.map(([x, z]) => `${X(x)},${Z(z)}`).join(" ")} className="fill-concrete stroke-foreground/70" strokeWidth={1} />
      ))}
      <text x={X(0)} y={Z(0) + 14} className="fill-muted-foreground text-[10px]">heel</text>
      <text x={X(a.B) - 16} y={Z(0) + 14} className="fill-muted-foreground text-[10px]">toe</text>
      {hu > 0 && <text x={X(-pad) + 4} y={Z(hu) - 4} className="fill-primary text-[10px]">hu={hu}</text>}
      {hd > 0 && <text x={X(maxX) + 4} y={Z(hd) - 4} className="fill-primary text-[10px]">hd={hd}</text>}
    </svg>
  );
}
