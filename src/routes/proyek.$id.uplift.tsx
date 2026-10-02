import { createFileRoute } from "@tanstack/react-router";
import { useProject } from "@/lib/useProject";
import { fmt, Grid, KV, Notice, NumField, PageHeader, Section, SelectField, Status, StepNav } from "@/components/kit";
import { P } from "@/lib/engine/params";
import { SEEPAGE_CRITERIA } from "@/lib/engine/master";

export const Route = createFileRoute("/proyek/$id/uplift")({
  head: () => ({ meta: [{ title: "Tekanan Tanah, Uplift & Rembesan — Stabilitas Bangunan Air" }] }),
  component: UpliftPage,
});

function UpliftPage() {
  const { project: p, result: a, patch } = useProject();
  const pu = P.GAMMA_AIR * a.wl.hu * p.uplift.lambda, pd = P.GAMMA_AIR * a.wl.hd * p.uplift.lambda;
  const U = 0.5 * (pu + pd) * a.B * a.L;
  const Pa = 0.5 * a.K * a.soil.gamma * p.Hsoil ** 2 * a.L + a.K * p.earth.surcharge * p.Hsoil * a.L;
  const seep = a.seepage;

  return (
    <>
      <PageHeader code="18_TEKANAN_TANAH · 19_GAYA_ANGKAT · 20_REMBESAN_LANE" title="Tekanan Tanah Lateral, Gaya Angkat & Rembesan" desc="Nilai di bawah adalah kondisi dasar (faktor kasus = 1). Dilengkapi evaluasi bahaya piping (KP-02)." />
      <Section title="Tekanan tanah lateral" aside={<Status s={a.act.soil ? "AKTIF" : "T/A"} />}>
        <Grid>
          <SelectField label="Kondisi tekanan" value={p.earth.mode} options={["RANKINE AKTIF", "DIAM K0", "MANUAL"] as const} onChange={(v) => patch("earth", { mode: v })} hint="Ka = tan²(45−φ/2); K0 = 1 − sin φ" />
          {p.earth.mode === "MANUAL" && <NumField label="Koefisien K" value={p.earth.K} onChange={(v) => patch("earth", { K: v })} />}
          <NumField label="Beban permukaan q" unit="kPa" value={p.earth.surcharge} onChange={(v) => patch("earth", { surcharge: v })} />
          <NumField label="Tinggi muka air tanah timbunan" unit="m" value={p.earth.hWaterSoil ?? 0} onChange={(v) => patch("earth", { hWaterSoil: v })} hint="Hidrostatik tanah aktif jika hw > 0" />
        </Grid>
        <div className="mt-4 max-w-md">
          <KV k="K efektif" v={fmt(a.K, 4)} />
          <KV k="H tertahan" v={fmt(p.Hsoil)} unit="m" />
          <KV k="Pa dasar" v={fmt(Pa)} unit="kN" />
          <KV k="Lengan dari dasar" v={fmt(p.Hsoil / 3, 3)} unit="m" />
        </div>
      </Section>
      <Section title="Gaya angkat (linear hulu → hilir)" aside={<Status s={a.act.U ? "AKTIF" : "T/A"} />}>
        <Grid>
          <NumField label="Faktor gaya angkat λ" value={p.uplift.lambda} onChange={(v) => patch("uplift", { lambda: v })} hint="1 = tekanan penuh; < 1 bila ada drain/cutoff terverifikasi" />
        </Grid>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <KV k="pu = γw·hu·λ (heel)" v={fmt(pu)} unit="kPa" />
            <KV k="pd = γw·hd·λ (toe)" v={fmt(pd)} unit="kPa" />
            <KV k="U = ½(pu+pd)·B·L" v={fmt(U)} unit="kN" />
            <KV k="Titik berat dari heel" v={fmt(pu + pd > 0 ? (a.B / 3) * ((2 * pu + pd) / (pu + pd)) : a.B / 2, 3)} unit="m" />
          </div>
          <svg viewBox="0 0 300 120" className="w-full rounded-sm bg-muted/40">
            <line x1="20" x2="280" y1="20" y2="20" className="stroke-foreground" strokeWidth={2} />
            {pu + pd > 0 && <polygon points={`20,20 280,20 280,${20 + (pd / Math.max(pu, pd)) * 80} 20,${20 + (pu / Math.max(pu, pd)) * 80}`} className="fill-water/50 stroke-primary" />}
            <text x="20" y="114" className="fill-muted-foreground text-[10px]">heel · {fmt(pu, 1)} kPa</text>
            <text x="200" y="114" className="fill-muted-foreground text-[10px]">toe · {fmt(pd, 1)} kPa</text>
          </svg>
        </div>
      </Section>
      <Section title="Rembesan bawah tanah & bahaya piping (KP-02 · Lane & Bligh)" aside={<Status s={seep.status} />}>
        <div className="mb-3 flex items-center gap-2">
          <input type="checkbox" id="seepage-toggle" checked={p.seepage?.enabled ?? false} onChange={(e) => patch("seepage", { enabled: e.target.checked, dCutoffUp: p.seepage?.dCutoffUp ?? 1.5, dCutoffDown: p.seepage?.dCutoffDown ?? 2.0, soilType: p.seepage?.soilType ?? "PASIR_SEDANG" })} />
          <label htmlFor="seepage-toggle" className="text-sm font-medium">Aktifkan evaluasi angka rayapan (creep ratio) cutoff</label>
        </div>
        {p.seepage?.enabled && (
          <>
            <Grid>
              <SelectField label="Jenis material tanah dasar" value={p.seepage.soilType} options={SEEPAGE_CRITERIA.map((c) => ({ value: c.id, label: `${c.name} (Lane Cw ≥ ${c.laneCw})` }))} onChange={(v) => patch("seepage", { soilType: v })} />
              <NumField label="Kedalaman cutoff hulu" unit="m" value={p.seepage.dCutoffUp} onChange={(v) => patch("seepage", { dCutoffUp: v })} />
              <NumField label="Kedalaman cutoff hilir" unit="m" value={p.seepage.dCutoffDown} onChange={(v) => patch("seepage", { dCutoffDown: v })} />
            </Grid>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KV k="Panjang rayapan vertikal Lv" v={fmt(seep.Lv)} unit="m" />
              <KV k="Panjang rayapan horizontal Lh" v={fmt(seep.Lh)} unit="m" />
              <KV k="Beda tinggi energi ΔH" v={fmt(seep.deltaH)} unit="m" />
              <KV k="Lane weighted creep Lc" v={fmt(seep.LcreepLane)} unit="m" />
              <KV k="Lane Cw aktual" v={fmt(seep.Cw)} unit={`min ${seep.CwMin}`} />
              <KV k="Bligh C aktual" v={fmt(seep.C)} unit={`min ${seep.CMin}`} />
            </div>
            {!seep.laneOk && (
              <div className="mt-3">
                <Notice tone="destructive">Angka rayapan Lane Cw ({seep.Cw}) lebih kecil dari batas aman ({seep.CwMin}). Risiko piping/semburan pasir tinggi. Perdalam cutoff atau perpanjang apron!</Notice>
              </div>
            )}
          </>
        )}
      </Section>
      <StepNav
        prev={{ to: "/proyek/$id/tanah", label: "04. Geoteknik & Parameter Tanah" }}
        next={{ to: "/proyek/$id/gaya", label: "06. Gaya-Gaya Bekerja" }}
        projectId={p.id}
      />
    </>
  );
}
