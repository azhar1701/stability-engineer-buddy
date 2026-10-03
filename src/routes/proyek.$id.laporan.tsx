import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useProject } from "@/lib/useProject";
import { fmt, KV, PageHeader, Section, Status, StepNav, Table } from "@/components/kit";
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

  const [included, setIncluded] = useState({
    input: true,
    geometri: true,
    seepage: true,
    envelope: true,
    cases: true,
    recs: true,
    sources: true,
  });

  const toggle = (k: keyof typeof included) => setIncluded((s) => ({ ...s, [k]: !s[k] }));

  return (
    <div className="text-sm">
      <div className="no-print">
        <PageHeader
          step={11}
          code="34_LAPORAN_DESAIN"
          title="Laporan Nota Desain Stabilitas"
          desc="Format cetak dokumen resmi analisis stabilitas struktur air sesuai standar KP-02 dan SNI 8460:2017."
        />

        {/* Section toggles & Actions toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3.5 shadow-xs">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-foreground">Sertakan Bagian:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={included.input} onChange={() => toggle("input")} />
              <span>Input & Tanah</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={included.geometri} onChange={() => toggle("geometri")} />
              <span>Geometri</span>
            </label>
            {a.seepage.enabled && (
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={included.seepage} onChange={() => toggle("seepage")} />
                <span>Rembesan</span>
              </label>
            )}
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={included.envelope} onChange={() => toggle("envelope")} />
              <span>Envelope</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={included.cases} onChange={() => toggle("cases")} />
              <span>Matriks Kasus</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={included.recs} onChange={() => toggle("recs")} />
              <span>Rekomendasi</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={included.sources} onChange={() => toggle("sources")} />
              <span>Regulasi</span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportXlsx(p)}
              className="rounded-md border border-input bg-card px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              Ekspor Excel (.xlsx)
            </button>
            <button
              onClick={() => window.print()}
              className="rounded-md bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all"
            >
              Cetak / Simpan PDF 🖨️
            </button>
          </div>
        </div>
      </div>

      {/* Official Report Header */}
      <header className="mb-6 border-b-2 border-foreground pb-3">
        <div className="num text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          LAPORAN RESMI STABILITAS STRUKTUR AIR · KP-02 & SNI 8460:2017
        </div>
        <h1 className="mt-1 text-2xl font-bold text-foreground">{p.name}</h1>
        <div className="mt-1 text-xs text-muted-foreground">
          {typeById(p.type).name} · {p.location}
          {p.kecamatan && ` · Kec. ${p.kecamatan}`}
          {p.desa && `, Desa ${p.desa}`}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-3">
          <Status s={a.envelope.overall} />
          <span className="num text-xs text-muted-foreground">
            Tanggal: {new Date().toLocaleDateString("id-ID")}
            {p.engineer && ` · Perekayasa: ${p.engineer}`}
          </span>
        </div>
      </header>

      {/* 1. Input & Tanah */}
      {included.input && (
        <div className="mb-6 grid gap-6 md:grid-cols-2">
          <Section title="1. Parameter Struktur & Muka Air">
            <KV k="Mode analisis" v={p.analysisMode} />
            <KV k="Lebar analisis efektif L" v={fmt(a.L)} unit="m" />
            <KV k="Lebar dasar B / Kedalaman Df" v={`${fmt(p.B)} / ${fmt(p.Df)}`} unit="m" />
            <KV k="Muka air hulu hu / hilir hd" v={`${fmt(a.wl.hu)} / ${fmt(a.wl.hd)}`} unit="m" />
            <KV k="Berat sendiri total W" v={fmt(a.W)} unit="kN" />
          </Section>
          <Section title="2. Geoteknik & Fondasi">
            <KV k="Sumber data tanah" v={a.soil.source} />
            <KV k="Profil tanah" v={a.soil.profileId} />
            <KV k="Berat isi γ / Geser dalam φ' / Kohesi c'" v={`${fmt(a.soil.gamma, 1)} kN/m³ / ${fmt(a.soil.phi, 0)}° / ${fmt(a.soil.c, 1)} kPa`} />
            <KV k="Koefisien gesek dasar μ" v={fmt(a.soil.mu)} />
            <KV k="Daya dukung tanah izin q_izin" v={fmt(a.bearing.qa, 1)} unit="kPa" />
          </Section>
        </div>
      )}

      {/* 2. Geometri */}
      {included.geometri && (
        <Section title="3. Rincian Geometri Komponen Bangunan">
          <Table
            head={["Komponen", "Bentuk", "Luas A (m²)", "Material", "Berat W (kN)", "Lengan ke Toe (m)"]}
            rows={a.comps.map((c) => [
              c.name,
              c.shape,
              <span className="num">{fmt(c.A, 3)}</span>,
              c.material,
              <span className="num">{fmt(c.W)}</span>,
              <span className="num">{fmt(c.armToe, 3)}</span>,
            ])}
          />
        </Section>
      )}

      {/* 3. Rembesan */}
      {included.seepage && a.seepage.enabled && (
        <Section title="4. Evaluasi Rembesan & Bahaya Piping (KP-02 · Lane & Bligh)">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KV k="Material tanah dasar" v={a.seepage.soilType} />
            <KV k="Panjang rayapan Lv / Lh" v={`${fmt(a.seepage.Lv)} / ${fmt(a.seepage.Lh)}`} unit="m" />
            <KV k="Beda energi ΔH" v={fmt(a.seepage.deltaH)} unit="m" />
            <KV k="Lane Cw aktual" v={fmt(a.seepage.Cw)} unit={`min ${a.seepage.CwMin}`} />
            <KV k="Bligh C aktual" v={fmt(a.seepage.C)} unit={`min ${a.seepage.CMin}`} />
            <KV k="Status rembesan" v={<Status s={a.seepage.status} />} />
          </div>
        </Section>
      )}

      {/* 4. Envelope */}
      {included.envelope && (
        <Section title="5. Ringkasan Kasus Kritis (Governing Envelope)">
          <EnvelopeTable a={a} />
        </Section>
      )}

      {/* 5. Kasus Beban */}
      {included.cases && (
        <Section title="6. Hasil Lengkap Per Kasus Pembebanan">
          <CaseTable a={a} />
        </Section>
      )}

      {/* 6. Rekomendasi */}
      {included.recs && (
        <Section title="7. Rekomendasi Teknis">
          <ul className="list-disc space-y-1.5 pl-5">
            {recs.map((r, i) => (
              <li key={i}>
                <strong>[{r.level}] {r.title}:</strong> {r.detail}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 7. Regulasi & Legalitas */}
      {included.sources && (
        <Section title="8. Dasar Standar & Batasan Tanggung Jawab">
          <ul className="space-y-1 text-xs">
            {SOURCES.map((s) => (
              <li key={s.id}>
                <span className="num font-semibold text-foreground">{s.id}</span> — {s.name}: {s.use}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground border-t pt-2">
            Hasil perhitungan berbasis rumus hidraulika dan mekanika tanah standar KP-02 Irigasi dan SNI 8460:2017. Laporan ini merupakan nota desain teknis awal dan wajib ditinjau serta disahkan oleh Tenaga Ahli Teknik Sumber Daya Air / Geoteknik (SKA/SKK IPU/IPT) sebelum tahap pelaksanaan konstruksi.
          </p>
        </Section>
      )}

      <div className="no-print">
        <StepNav
          prev={{ to: "/proyek/$id/rekomendasi", label: "10. Rekomendasi Teknis" }}
          projectId={p.id}
        />
      </div>
    </div>
  );
}
