import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useProject } from "@/lib/useProject";
import { fmt, Grid, KV, NumField, PageHeader, Section, StepNav, Table } from "@/components/kit";

export const Route = createFileRoute("/proyek/$id/gaya")({
  head: () => ({ meta: [{ title: "Gaya & Momen — Stabilitas Bangunan Air" }] }),
  component: GayaPage,
});

function GayaPage() {
  const { project: p, result: a, patch } = useProject();
  const [ci, setCi] = useState(0);
  const c = a.cases[ci] ?? a.cases[0]!;
  return (
    <>
      <PageHeader
        step={6}
        code="24_GAYA_MOMEN"
        title="Mesin Gaya dan Momen"
        desc="Momen terhadap toe. Gaya vertikal ke bawah dan gaya horizontal penahan memberi momen penahan; uplift dan gaya horizontal penggerak memberi momen pengguling."
      />
      <Section title="Gaya tambahan proyek (22_BEBAN_KHUSUS)">
        <Grid>
          <NumField label="Gaya horizontal lain H" unit="kN" value={p.extra.H} onChange={(v) => patch("extra", { H: v })} />
          <NumField label="Lengan H dari dasar" unit="m" value={p.extra.armH} onChange={(v) => patch("extra", { armH: v })} />
          <NumField label="Gaya vertikal lain V" unit="kN" value={p.extra.V} onChange={(v) => patch("extra", { V: v })} />
          <NumField label="Posisi V dari heel" unit="m" value={p.extra.xV} onChange={(v) => patch("extra", { xV: v })} />
          <NumField label="Berat air talang" unit="kN" value={p.extra.water} onChange={(v) => patch("extra", { water: v })} />
          <NumField label="Posisi air talang dari heel" unit="m" value={p.extra.xWater} onChange={(v) => patch("extra", { xWater: v })} />
        </Grid>
      </Section>
      <Section title="Rincian gaya per kasus" aside={
        <select className="h-7 rounded-sm border bg-card px-1 text-xs" value={ci} onChange={(e) => setCi(+e.target.value)}>
          {a.cases.map((x, i) => <option key={x.id} value={i}>{x.id} — {x.name}{x.applies ? "" : " (T/A)"}</option>)}
        </select>
      }>
        <Table head={["ID", "Gaya", "Sumbu", "Arah", "Besar kN", "Lengan m", "M penahan", "M pengguling"]}
          rows={c.forces.map((f) => [<span className="num text-xs">{f.id}</span>, f.name, f.axis, f.dir, <span className="num">{fmt(f.F)}</span>, <span className="num">{fmt(f.arm, 3)}</span>, <span className="num">{fmt(f.Mr)}</span>, <span className="num">{fmt(f.Mo)}</span>])} />
        <div className="mt-4 grid max-w-2xl gap-x-8 sm:grid-cols-2">
          <div><KV k="N (vertikal bersih)" v={fmt(c.N)} unit="kN" /><KV k="H (penggerak bersih)" v={fmt(c.H)} unit="kN" /></div>
          <div><KV k="ΣM penahan" v={fmt(c.Mr)} unit="kNm" /><KV k="ΣM pengguling" v={fmt(c.Mo)} unit="kNm" /></div>
        </div>
      </Section>
      <StepNav
        prev={{ to: "/proyek/$id/uplift", label: "05. Tekanan Tanah & Rembesan" }}
        next={{ to: "/proyek/$id/kasus", label: "07. Kasus Beban" }}
        projectId={p.id}
      />
    </>
  );
}
