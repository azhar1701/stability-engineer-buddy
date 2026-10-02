import { createFileRoute } from "@tanstack/react-router";
import { useProject } from "@/lib/useProject";
import { fmt, KV, Section, Status, StepNav, Table } from "@/components/kit";
import { CaseTable, EnvelopeTable } from "@/components/results";
import { SOURCES, typeById } from "@/lib/engine/master";
import { recommend } from "@/lib/engine/recommend";
import { exportXlsx } from "@/lib/exportXlsx";

export const Route = createFileRoute("/proyek/$id/laporan")({
  head: () => ({ meta: [{ title: "Laporan Stabilitas — Stabilitas Bangunan Air" }] }),
  component: ReportPage,
});

function ReportPage() {
  const { project: p, result: a } = useProject();
  const recs = recommend(a);
  return (
    <div className="text-sm">
      <div className="no-print mb-4 flex justify-end gap-2">
        <button onClick={() => exportXlsx(p)} className="rounded-sm border px-3 py-1.5 text-xs">Ekspor Excel</button>
        <button onClick={() => window.print()} className="rounded-sm bg-primary px-3 py-1.5 text-xs text-primary-foreground">Cetak / Simpan PDF</button>
      </div>
      <header className="mb-6 border-b-2 border-foreground pb-3">
        <div className="num text-xs text-muted-foreground">LAPORAN STABILITAS BANGUNAN AIR</div>
        <h1 className="text-2xl font-semibold">{p.name}</h1>
        <div className="mt-1 text-muted-foreground">{typeById(p.type).name} · {p.location}{p.kecamatan && ` · Kec. ${p.kecamatan}`}{p.desa && `, ${p.desa}`}</div>
        <div className="mt-2 flex items-center gap-3"><Status s={a.envelope.overall} /><span className="num text-xs text-muted-foreground">{new Date().toLocaleDateString("id-ID")}{p.engineer && ` · ${p.engineer}`}</span></div>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        <Section title="1. Data masukan">
          <KV k="Mode analisis" v={p.analysisMode} /><KV k="Lebar analisis L" v={fmt(a.L)} unit="m" />
          <KV k="B / Df" v={`${fmt(p.B)} / ${fmt(p.Df)}`} unit="m" /><KV k="hu / hd" v={`${fmt(a.wl.hu)} / ${fmt(a.wl.hd)}`} unit="m" />
          <KV k="Berat sendiri W" v={fmt(a.W)} unit="kN" />
        </Section>
        <Section title="2. Tanah">
          <KV k="Sumber" v={a.soil.source} /><KV k="Profil" v={a.soil.profileId} />
          <KV k="γ / φ' / c'" v={`${fmt(a.soil.gamma, 1)} / ${fmt(a.soil.phi, 0)}° / ${fmt(a.soil.c, 1)}`} />
          <KV k="μ" v={fmt(a.soil.mu)} /><KV k="q izin" v={fmt(a.bearing.qa, 1)} unit="kPa" />
        </Section>
      </div>
      <Section title="3. Geometri">
        <Table head={["Komponen", "Bentuk", "A m²", "Material", "W kN", "Lengan toe m"]}
          rows={a.comps.map((c) => [c.name, c.shape, <span className="num">{fmt(c.A, 3)}</span>, c.material, <span className="num">{fmt(c.W)}</span>, <span className="num">{fmt(c.armToe, 3)}</span>])} />
      </Section>
      {a.seepage.enabled && (
        <Section title="4. Evaluasi Rembesan & Bahaya Piping (KP-02 · Lane & Bligh)">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KV k="Material tanah dasar" v={a.seepage.soilType} />
            <KV k="Beda energi ΔH" v={fmt(a.seepage.deltaH)} unit="m" />
            <KV k="Lane Cw aktual" v={fmt(a.seepage.Cw)} unit={`min ${a.seepage.CwMin}`} />
            <KV k="Status rembesan" v={a.seepage.status} />
          </div>
        </Section>
      )}
      <Section title={a.seepage.enabled ? "5. Hasil per kasus beban" : "4. Hasil per kasus beban"}><CaseTable a={a} /></Section>
      <Section title={a.seepage.enabled ? "6. Envelope" : "5. Envelope"}><EnvelopeTable a={a} /></Section>
      <Section title={a.seepage.enabled ? "7. Rekomendasi teknis" : "6. Rekomendasi"}>
        <ul className="list-disc space-y-1 pl-5">{recs.map((r, i) => <li key={i}><b>[{r.level}]</b> {r.title}. {r.detail}</li>)}</ul>
      </Section>
      <Section title={a.seepage.enabled ? "8. Sumber & batasan regulatif" : "7. Sumber & batasan"}>
        <ul className="space-y-1">{SOURCES.map((s) => <li key={s.id}><span className="num text-xs">{s.id}</span> — {s.name}: {s.use}</li>)}</ul>
        <p className="mt-3 text-xs text-muted-foreground">Hasil analisis berbasis data masukan, penyelidikan geoteknik, dan standar teknis KP-02 & SNI 8460:2017. Laporan ini merupakan nota desain teknis dan wajib diverifikasi oleh Professional Engineer (IPU/IPT) sebelum tahap konstruksi.</p>
      </Section>
      <div className="no-print">
        <StepNav
          prev={{ to: "/proyek/$id/rekomendasi", label: "10. Rekomendasi Teknis" }}
          projectId={p.id}
        />
      </div>
    </div>
  );
}
