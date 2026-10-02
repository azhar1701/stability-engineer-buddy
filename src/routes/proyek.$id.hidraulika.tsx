import { createFileRoute } from "@tanstack/react-router";
import { useProject } from "@/lib/useProject";
import { fmt, Grid, KV, Notice, NumField, PageHeader, Section, SelectField, Status } from "@/components/kit";

export const Route = createFileRoute("/proyek/$id/hidraulika")({
  head: () => ({ meta: [{ title: "Hidrologi & Hidraulika — Stabilitas Bangunan Air" }] }),
  component: HidroPage,
});

function HidroPage() {
  const { project: p, result: a, patch } = useProject();
  const h = p.hydrology, hy = p.hydraulics;
  return (
    <>
      <PageHeader code="12_HIDROLOGI · 13_HIDRAULIKA · 14_HITUNG" title="Hidrologi dan Muka Air" desc="Muka air hulu (hu) dan hilir (hd) menjadi dasar gaya hidrostatik dan uplift. Faktor tiap kasus beban diterapkan di langkah Kasus Beban." />
      <Section title="Debit rencana">
        <Grid>
          <SelectField label="Metode debit" value={h.method} options={[{ value: "MANUAL", label: "Q MANUAL" }, { value: "RASIONAL", label: "RASIONAL — PENAPISAN" }] as const} onChange={(v) => patch("hydrology", { method: v })} />
          {h.method === "MANUAL" ? <NumField label="Debit rencana Q" unit="m³/s" value={h.Q} onChange={(v) => patch("hydrology", { Q: v })} /> : <>
            <NumField label="Koefisien limpasan C" value={h.C} onChange={(v) => patch("hydrology", { C: v })} />
            <NumField label="Intensitas hujan I" unit="mm/jam" value={h.I} onChange={(v) => patch("hydrology", { I: v })} />
            <NumField label="Luas DAS A" unit="km²" value={h.A} onChange={(v) => patch("hydrology", { A: v })} />
          </>}
        </Grid>
        <div className="mt-4 max-w-sm"><KV k="Q rencana" v={fmt(a.Q, 3)} unit="m³/s" /></div>
      </Section>
      <Section title="Muka air" aside={<Status s={a.wl.status} />}>
        <Grid>
          <SelectField label="Metode muka air" value={hy.method} options={[{ value: "MANUAL", label: "KEDALAMAN MANUAL" }, { value: "MANNING", label: "SALURAN MANNING (hu = yn)" }] as const} onChange={(v) => patch("hydraulics", { method: v })} />
          {hy.method === "MANUAL" && <NumField label="Kedalaman air hulu hu" unit="m" value={hy.hu} onChange={(v) => patch("hydraulics", { hu: v })} />}
          <NumField label="Kedalaman air hilir hd" unit="m" value={hy.hd} onChange={(v) => patch("hydraulics", { hd: v })} />
        </Grid>
        {hy.method === "MANNING" && <>
          <div className="my-4 border-t" />
          <Notice tone="info">Kedalaman normal dicari iteratif (langkah 0,02 m) sampai Q Manning ≥ Q rencana.</Notice>
          <Grid>
            <NumField label="Lebar dasar b" unit="m" value={hy.b} onChange={(v) => patch("hydraulics", { b: v })} />
            <NumField label="Kemiringan sisi z (H:V)" value={hy.z} onChange={(v) => patch("hydraulics", { z: v })} />
            <NumField label="Koefisien Manning n" value={hy.n} onChange={(v) => patch("hydraulics", { n: v })} />
            <NumField label="Kemiringan dasar S" value={hy.S} onChange={(v) => patch("hydraulics", { S: v })} />
          </Grid>
        </>}
        <div className="mt-4 max-w-sm">
          <KV k="hu efektif" v={fmt(a.wl.hu, 3)} unit="m" />
          <KV k="hd efektif" v={fmt(a.wl.hd, 3)} unit="m" />
          <KV k="Δh" v={fmt(Math.max(a.wl.hu - a.wl.hd, 0), 3)} unit="m" />
        </div>
      </Section>
    </>
  );
}
