import { createFileRoute } from "@tanstack/react-router";
import { useProject } from "@/lib/useProject";
import { fmt, Grid, KV, Notice, NumField, PageHeader, Section, SelectField, Status, Table } from "@/components/kit";
import { SOIL_PROFILES } from "@/lib/engine/master";

export const Route = createFileRoute("/proyek/$id/tanah")({
  head: () => ({ meta: [{ title: "Tanah & Fondasi — Stabilitas Bangunan Air" }] }),
  component: TanahPage,
});

function TanahPage() {
  const { project: p, result: a, patch } = useProject();
  const s = p.soil;
  return (
    <>
      <PageHeader code="15_DB_TANAH · 16_ATURAN_TANAH · 17_TANAH" title="Tanah / Fondasi" desc="Mode otomatis memetakan kecamatan ke profil penapisan regional Ciamis. Gunakan data proyek terverifikasi untuk desain final." />
      {a.soil.source === "SCREENING" && <Notice>Parameter penapisan regional (kepercayaan RENDAH) — bukan hasil penyelidikan lokasi. Tidak menggantikan SNI 8460:2017.</Notice>}
      <Section title="Sumber parameter" aside={<Status s={a.soil.status} />}>
        <Grid>
          <SelectField label="Mode data tanah" value={s.mode} options={[{ value: "SCREENING", label: "OTOMATIS DESA — PENAPISAN" }, { value: "PROYEK", label: "DATA PROYEK" }] as const} onChange={(v) => {
            if (v === "PROYEK" && s.gamma === 0) patch("soil", { mode: v, gamma: a.soil.gamma, phi: a.soil.phi, c: a.soil.c, mu: a.soil.mu, qa: a.soil.qa });
            else patch("soil", { mode: v });
          }} />
          <SelectField label="Model tahanan geser" value={s.slidingMode} options={["GESEK", "GESEK + KOHESI"] as const} onChange={(v) => patch("soil", { slidingMode: v })} hint="R = μN (+ c'·B·L)" />
        </Grid>
        {s.mode === "PROYEK" && <div className="mt-4"><Grid>
          <NumField label="γ tanah" unit="kN/m³" value={s.gamma} onChange={(v) => patch("soil", { gamma: v })} />
          <NumField label="φ'" unit="°" value={s.phi} onChange={(v) => patch("soil", { phi: v })} />
          <NumField label="c'" unit="kPa" value={s.c} onChange={(v) => patch("soil", { c: v })} />
          <NumField label="μ interface" value={s.mu} onChange={(v) => patch("soil", { mu: v })} />
          <NumField label="q izin" unit="kPa" value={s.qa} onChange={(v) => patch("soil", { qa: v })} />
        </Grid></div>}
      </Section>
      <Section title="Parameter efektif">
        <div className="max-w-md">
          <KV k="Kecamatan" v={p.kecamatan || "—"} />
          <KV k="Profil" v={a.soil.profileId} />
          <KV k="γ tanah" v={fmt(a.soil.gamma)} unit="kN/m³" />
          <KV k="φ'" v={fmt(a.soil.phi, 1)} unit="°" />
          <KV k="c'" v={fmt(a.soil.c, 1)} unit="kPa" />
          <KV k="μ" v={fmt(a.soil.mu)} />
          <KV k="q izin" v={fmt(a.soil.qa, 1)} unit="kPa" />
        </div>
      </Section>
      <Section title="Basis aturan penapisan">
        <Table head={["Profil", "Deskripsi", "γ", "φ'", "c'", "μ", "qa", "Kepercayaan"]}
          rows={SOIL_PROFILES.map((x) => [<span className="num text-xs">{x.id}</span>, x.desc, <span className="num">{x.gamma}</span>, <span className="num">{x.phi}</span>, <span className="num">{x.c}</span>, <span className="num">{x.mu}</span>, <span className="num">{x.qa}</span>, x.confidence])} />
      </Section>
    </>
  );
}
