import { createFileRoute } from "@tanstack/react-router";
import { useProject } from "@/lib/useProject";
import { fmt, Grid, KV, NumField, PageHeader, Section, SelectField, Status } from "@/components/kit";

export const Route = createFileRoute("/proyek/$id/daya-dukung")({
  head: () => ({ meta: [{ title: "Daya Dukung Fondasi — Stabilitas Bangunan Air" }] }),
  component: BearingPage,
});

function BearingPage() {
  const { project: p, result: a, patch } = useProject();
  const b = a.bearing;
  const q = a.envelope.q;
  return (
    <>
      <PageHeader code="28_GEOTEKNIK_FONDASI" title="Daya Dukung Fondasi" desc="q izin dari data tanah, atau dihitung dengan faktor kapasitas (fondasi menerus): qu = c'Nc + γDfNq + ½γBNγ." />
      <Section title="Metode">
        <Grid>
          <SelectField label="Mode daya dukung" value={p.bearing.mode} options={[{ value: "QIZIN", label: "q IZIN PROYEK / PENAPISAN" }, { value: "TERZAGHI", label: "FAKTOR KAPASITAS (Nc, Nq, Nγ)" }] as const} onChange={(v) => patch("bearing", { mode: v })} />
          <NumField label="FS daya dukung" value={p.bearing.fs} onChange={(v) => patch("bearing", { fs: v })} />
        </Grid>
      </Section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Kapasitas">
          <KV k="φ'" v={fmt(a.soil.phi, 1)} unit="°" />
          <KV k="Nc" v={fmt(b.Nc)} /><KV k="Nq" v={fmt(b.Nq)} /><KV k="Nγ (Vesic)" v={fmt(b.Ng)} />
          <KV k="Df" v={fmt(p.Df)} unit="m" /><KV k="B" v={fmt(p.B)} unit="m" />
          <KV k="qu" v={fmt(b.qu, 1)} unit="kPa" />
          <KV k="q izin" v={fmt(b.qa, 1)} unit="kPa" />
        </Section>
        <Section title="Pemeriksaan" aside={<Status s={a.envelope.ratio ? (a.envelope.ratio.value <= 1 ? "MEMENUHI" : "TIDAK MEMENUHI") : "T/A"} />}>
          <KV k="q maks governing" v={fmt(q?.value, 1)} unit="kPa" />
          <KV k="Kasus" v={q?.caseName ?? "—"} />
          <KV k="Rasio qmax/qizin" v={fmt(a.envelope.ratio?.value)} />
          <div className="mt-4 h-3 overflow-hidden rounded-sm bg-muted">
            <div className={"h-full " + ((a.envelope.ratio?.value ?? 0) > 1 ? "bg-destructive" : "bg-success")} style={{ width: `${Math.min((a.envelope.ratio?.value ?? 0) * 100, 100)}%` }} />
          </div>
        </Section>
      </div>
    </>
  );
}
