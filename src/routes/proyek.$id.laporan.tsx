import { useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useProject } from "@/lib/useProject";
import { fmt, KV, PageHeader, Section, Status, StepNav, Table } from "@/components/kit";
import { CaseTable, EnvelopeTable } from "@/components/results";
import { SOURCES, typeById } from "@/lib/engine/master";
import { recommend } from "@/lib/engine/recommend";
import { exportXlsx } from "@/lib/exportXlsx";
import { AnnotatedSketch, downloadSvg } from "@/components/AnnotatedSketch";
import { MathBlock, FormulaStep } from "@/components/MathBlock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/proyek/$id/laporan")({
  head: () => ({ meta: [{ title: "Laporan Stabilitas — Stabilitas Bangunan Air" }] }),
  component: ReportPage,
});

function ReportPage() {
  const { project: p, result: a } = useProject();
  const recs = recommend(a);
  const sketchRef = useRef<SVGSVGElement>(null);

  const [paperSize, setPaperSize] = useState<"A4" | "A4-L" | "LETTER">("A4");
  const [included, setIncluded] = useState({
    cover: true,
    input: true,
    geometri: true,
    metodologi: true,
    seepage: true,
    envelope: true,
    cases: true,
    recs: true,
    sources: true,
  });

  const toggle = (k: keyof typeof included) => setIncluded((s) => ({ ...s, [k]: !s[k] }));

  // Critical governing case for numerical substitution in methodology
  const govCase = a.envelope.slide?.c ?? a.cases.find((c) => c.active) ?? a.cases[0];

  // Specific force extractions for governing case
  const fHydUp = govCase?.forces.find((f) => f.key === "hydroUp");
  const fHydDown = govCase?.forces.find((f) => f.key === "hydroDown");
  const fUplift = govCase?.forces.find((f) => f.key === "uplift");
  const fSoil = govCase?.forces.find((f) => f.key === "soilLat");
  const fEqH = govCase?.forces.find((f) => f.key === "eqH");

  return (
    <div className={cn("text-sm print-container", paperSize === "A4-L" ? "paper-landscape" : "paper-portrait")}>
      {/* Screen Toolbar (hidden in print) */}
      <div className="no-print">
        <PageHeader
          step={11}
          code="34_LAPORAN_DESAIN"
          title="Laporan Nota Desain Stabilitas"
          desc="Format cetak dokumen resmi analisis stabilitas struktur air sesuai standar KP-02 dan SNI 8460:2017."
        />

        {/* Section toggles & Actions toolbar */}
        <div className="mb-6 rounded-lg border bg-card p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-bold text-foreground">Sertakan Bagian:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={included.cover} onChange={() => toggle("cover")} />
                <span>Sampul / Cover</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={included.input} onChange={() => toggle("input")} />
                <span>Input & Tanah</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={included.geometri} onChange={() => toggle("geometri")} />
                <span>Geometri & Sketsa</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={included.metodologi} onChange={() => toggle("metodologi")} />
                <span className="font-semibold text-primary">Metodologi & Rumus</span>
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
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Ukuran:</span>
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value as any)}
                  className="h-8 rounded border border-input bg-background px-2 text-xs font-medium text-foreground"
                >
                  <option value="A4">A4 Portrait</option>
                  <option value="A4-L">A4 Landscape</option>
                  <option value="LETTER">Letter</option>
                </select>
              </label>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadSvg(sketchRef.current, `sketsa-${p.name || "laporan"}.svg`)}
                className="rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
                title="Unduh sketsa dalam format SVG vektor"
              >
                <span>🗺️</span>
                <span>Ekspor Sketsa SVG</span>
              </button>
              <button
                type="button"
                onClick={() => exportXlsx(p)}
                className="rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
              >
                <span>📊</span>
                <span>Ekspor Excel (.xlsx)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-md bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all flex items-center gap-1.5"
              title="Cetak atau simpan dokumen ke file PDF report-ready (Disarankan browser Chrome/Edge)"
            >
              <span>🖨️</span>
              <span>Cetak / Simpan PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* COVER / TITLE HEADER PAGE */}
      {included.cover && (
        <section className="report-cover report-section mb-8 rounded-lg border-2 border-border/80 bg-card p-6 shadow-xs print:m-0 print:border-black print:p-8">
          <div className="flex items-center justify-between border-b-2 border-foreground/30 pb-4 print:border-black">
            <div>
              <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground print:text-black">
                DOKUMEN RESMI NOTA TEKNIS PERHITUNGAN STABILITAS
              </div>
              <div className="text-xs font-medium text-muted-foreground print:text-slate-600">
                Kriteria Perencanaan Bangunan Air KP-02 & SNI 8460:2017
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs font-bold text-primary print:text-black">
                STABILITY-ENGINEER-BUDDY
              </span>
            </div>
          </div>

          <div className="my-6">
            <span className="inline-block rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary print:border print:border-black print:bg-slate-100 print:text-black">
              {typeById(p.type).name.toUpperCase()}
            </span>
            <h1 className="report-title mt-2 text-3xl font-extrabold tracking-tight text-foreground print:text-black print:text-2xl">
              {p.name || "Perhitungan Stabilitas Bangunan Air"}
            </h1>
            <div className="mt-2 text-sm text-muted-foreground print:text-slate-700">
              Lokasi Proyek: {p.location || "—"}
              {p.kecamatan && ` · Kecamatan ${p.kecamatan}`}
              {p.desa && `, Desa ${p.desa}`}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-b border-border/60 py-4 text-xs sm:grid-cols-4 print:border-black">
            <div>
              <span className="block text-muted-foreground print:text-slate-600">Perekayasa / Ahli:</span>
              <strong className="text-foreground print:text-black">{p.engineer || "Tenaga Ahli Geoteknik"}</strong>
            </div>
            <div>
              <span className="block text-muted-foreground print:text-slate-600">Tanggal Analisis:</span>
              <strong className="text-foreground font-mono print:text-black">
                {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </strong>
            </div>
            <div>
              <span className="block text-muted-foreground print:text-slate-600">Metode Analisis:</span>
              <strong className="text-foreground print:text-black">{p.analysisMode} (L = {fmt(a.L)} m)</strong>
            </div>
            <div>
              <span className="block text-muted-foreground print:text-slate-600">Status Stabilitas:</span>
              <div className="mt-0.5">
                <Status s={a.envelope.overall} />
              </div>
            </div>
          </div>

          <div className="mt-4 text-[11px] leading-relaxed text-muted-foreground print:text-slate-600">
            Dokumen ini memuat detail dimensi, kombinasi pembebanan (Gaya Normal, Gaya Geser, Momen Penahan, Momen Guling), rincian matematis langkah-demi-langkah, evaluasi rembesan, dan verifikasi daya dukung tanah fondasi.
          </div>
        </section>
      )}

      {/* 1. Input & Tanah */}
      {included.input && (
        <div className="report-section mb-6 grid gap-6 md:grid-cols-2">
          <Section title="1. Parameter Struktur & Muka Air">
            <KV k="Mode analisis struktur" v={p.analysisMode} />
            <KV k="Lebar analisis efektif L" v={fmt(a.L)} unit="m" />
            <KV k="Lebar dasar B / Kedalaman Df" v={`${fmt(p.B)} / ${fmt(p.Df)}`} unit="m" />
            <KV k="Tinggi tanah tertahan H_soil" v={fmt(p.Hsoil)} unit="m" />
            <KV k="Muka air hulu hu / hilir hd" v={`${fmt(a.wl.hu)} / ${fmt(a.wl.hd)}`} unit="m" />
            <KV k="Berat sendiri total W" v={fmt(a.W)} unit="kN" />
            <KV k="Momen penahan berat M_W" v={fmt(a.MW)} unit="kNm" />
          </Section>
          <Section title="2. Parameter Geoteknik & Fondasi">
            <KV k="Sumber data tanah" v={a.soil.source} />
            <KV k="Profil tanah dasar" v={a.soil.profileId} />
            <KV k="Berat volume tanah γ" v={fmt(a.soil.gamma, 1)} unit="kN/m³" />
            <KV k="Sudut geser dalam φ'" v={fmt(a.soil.phi, 0)} unit="°" />
            <KV k="Kohesi efektif c'" v={fmt(a.soil.c, 1)} unit="kPa" />
            <KV k="Koefisien gesek dasar μ" v={fmt(a.soil.mu)} />
            <KV k="Daya dukung tanah izin q_izin" v={fmt(a.bearing.qa, 1)} unit="kPa" />
          </Section>
        </div>
      )}

      {/* 2. Geometri & Sketsa */}
      {included.geometri && (
        <div className="report-section mb-6">
          <Section title="3. Rincian Geometri Komponen Bangunan Air">
            <div className="mb-4">
              <Table
                head={["Komponen", "Bentuk", "Luas A (m²)", "Material", "Berat W (kN)", "Lengan ke Toe (m)", "Momen Toe (kNm)"]}
                rows={a.comps.map((c) => [
                  c.name,
                  c.shape,
                  <span className="num">{fmt(c.A, 3)}</span>,
                  c.material,
                  <span className="num font-semibold">{fmt(c.W, 1)}</span>,
                  <span className="num">{fmt(c.armToe, 3)}</span>,
                  <span className="num">{fmt(c.M, 1)}</span>,
                ])}
              />
            </div>

            <div className="mt-4 rounded border bg-card p-3 print:border-slate-300">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-foreground print:text-black">
                  Sketsa Penampang Melintang Bangunan Air (Terukur & Teranotasi)
                </span>
                <span className="text-[10px] text-muted-foreground print:text-slate-600 font-mono">
                  B = {fmt(a.B)} m · W = {fmt(a.W)} kN
                </span>
              </div>
              <div className="flex justify-center">
                <AnnotatedSketch
                  ref={sketchRef}
                  annotate={false}
                  showLegend={true}
                  svgWidth={620}
                  svgHeight={310}
                />
              </div>
              <p className="mt-2 text-center text-[11px] italic text-muted-foreground print:text-slate-600">
                Gambar 1: Profil Melintang Penampang Bangunan Air, Muka Air Desain Hulu & Hilir, serta Titik Berat Struktur (CG).
              </p>
            </div>
          </Section>
        </div>
      )}

      {/* 3. Metodologi Perhitungan & Persamaan Matematis Step-by-Step */}
      {included.metodologi && (
        <div className="report-section report-section-break mb-6">
          <Section
            title="4. Metodologi Analisis, Persamaan Matematis & Substitusi Nilai"
            aside={
              <span className="text-[11px] font-mono font-medium text-muted-foreground print:text-black">
                Standar Rujukan: KP-02 & SNI 8460:2017
              </span>
            }
          >
            <div className="mb-4 rounded bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground print:border print:border-slate-300 print:bg-slate-50 print:text-slate-800">
              Bagian ini menyajikan formulasi teoritis matematis dan langkah-demi-langkah perhitungan yang diterapkan pada mesin komputasi, dengan substitusi nilai numerik berdasarkan kasus pembebanan kritis penentu (governing case: <strong>{govCase?.name || "Kondisi Operasi"}</strong>).
            </div>

            {/* B.2.1 Berat Sendiri & Geometri */}
            <FormulaStep num="4.1" title="Berat Sendiri Struktur & Titik Berat (KP-02 §3.3)" codeRef="KP-02 IRIGASI §3.3">
              <MathBlock
                eq="W<sub>i</sub> = A<sub>i</sub> &times; L &times; &gamma;<sub>i</sub> &emsp;&emsp; M<sub>i</sub> = W<sub>i</sub> &times; (B - x<sub>c,i</sub>) &emsp;&emsp; W<sub>tot</sub> = &sum; W<sub>i</sub>"
                desc="Persamaan Luas, Berat Komponen, dan Momen terhadap Toe"
                result={`W = ${fmt(a.W, 1)} kN ; M_W = ${fmt(a.MW, 1)} kNm ; Lengan = ${fmt(a.W > 0 ? a.MW / a.W : 0, 3)} m`}
                standardRef="KP-02 §3.3"
              />
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                <KV k="Lebar analisis L" v={fmt(a.L)} unit="m" />
                <KV k="Lebar dasar B" v={fmt(a.B)} unit="m" />
                <KV k="Titik berat Xc dari Heel" v={fmt(a.Xc_total, 3)} unit="m" />
                <KV k="Titik berat Zc dari dasar" v={fmt(a.Zc_total, 3)} unit="m" />
              </div>
            </FormulaStep>

            {/* B.2.2 Muka Air & Hidraulika */}
            <FormulaStep num="4.2" title="Muka Air & Kapasitas Hidraulika (KP-02 §4.2)" codeRef="KP-02 IRIGASI §4.2">
              <MathBlock
                eq={
                  p.hydraulics.method === "WEIR_CREST"
                    ? "H<sub>e</sub> = [ Q / (C<sub>d</sub> &times; b<sub>eff</sub>) ]<sup>2/3</sup> &emsp;&emsp; h<sub>u</sub> = p + H<sub>e</sub>"
                    : p.hydraulics.method === "MANNING"
                    ? "Q = <sup>1</sup>/<sub>n</sub> &times; A &times; R<sup>2/3</sup> &times; S<sup>1/2</sup> &emsp;&emsp; (Iterasi kedalaman normal y)"
                    : "h<sub>u</sub> = h<sub>u,input</sub> &emsp;&emsp; h<sub>d</sub> = h<sub>d,input</sub>"
                }
                desc={
                  p.hydraulics.method === "WEIR_CREST"
                    ? "Persamaan Aliran Melalui Mercu Pelimpah (Ogee / Crest)"
                    : p.hydraulics.method === "MANNING"
                    ? "Persamaan Manning Aliran Seragam Saluran Terbuka"
                    : "Metode Input Manual Muka Air Hulu dan Hilir"
                }
                result={`Q = ${fmt(a.Q, 2)} m³/s ; hu = ${fmt(a.wl.hu, 2)} m ; hd = ${fmt(a.wl.hd, 2)} m`}
                standardRef="KP-02 §4.2"
              />
            </FormulaStep>

            {/* B.2.3 Tekanan Hidrostatik & Uplift */}
            <FormulaStep num="4.3" title="Tekanan Hidrostatik & Gaya Angkat Uplift (KP-02 §5.2)" codeRef="KP-02 IRIGASI §5.2">
              <MathBlock
                eq="P<sub>u</sub> = &frac12; &times; &gamma;<sub>w</sub> &times; h<sub>u</sub><sup>2</sup> &times; L &emsp;&emsp; P<sub>d</sub> = &frac12; &times; &gamma;<sub>w</sub> &times; h<sub>d</sub><sup>2</sup> &times; L"
                desc="Gaya Tekanan Hidrostatik Horizontal Hulu & Hilir"
                result={
                  fHydUp
                    ? `P_u = ${fmt(fHydUp.H, 1)} kN (arm = ${fmt(fHydUp.z, 2)} m) ; P_d = ${fmt(fHydDown?.H ?? 0, 1)} kN`
                    : "—"
                }
                standardRef="KP-02 §5.2.1"
              />
              <MathBlock
                eq="U = &frac12; &times; (p<sub>u</sub> + p<sub>d</sub>) &times; B &times; L &times; &lambda; &emsp;&emsp; x<sub>U</sub> = <sup>B</sup>/<sub>3</sub> &times; [ (p<sub>u</sub> + 2&middot;p<sub>d</sub>) / (p<sub>u</sub> + p<sub>d</sub>) ]"
                desc="Gaya Angkat Uplift (Distribusi Trapesium Dasar Fondasi)"
                result={
                  fUplift
                    ? `U = ${fmt(fUplift.V, 1)} kN (x_dari_heel = ${fmt(fUplift.x, 2)} m ; Momen_guling = ${fmt(fUplift.Mo, 1)} kNm)`
                    : "Uplift dinonaktifkan"
                }
                standardRef="KP-02 §5.2.4"
              />
            </FormulaStep>

            {/* B.2.4 Tekanan Tanah Lateral */}
            <FormulaStep num="4.4" title="Tekanan Tanah Lateral Aktif (Rankine & KP-02 §5.3)" codeRef="KP-02 IRIGASI §5.3">
              <MathBlock
                eq="K<sub>a</sub> = tan<sup>2</sup>(45&deg; - &phi;'/2) &emsp;&emsp; P<sub>a</sub> = &frac12; &times; K<sub>a</sub> &times; &gamma; &times; H<sub>soil</sub><sup>2</sup> &times; L"
                desc="Koefisien Tekanan Tanah Aktif Rankine & Total Gaya Dorong Tanah"
                result={`Ka = ${fmt(a.K, 3)} ; phi = ${fmt(a.soil.phi, 0)}° ; Pa = ${fmt(fSoil?.H ?? 0, 1)} kN`}
                standardRef="Rankine / KP-02"
              />
            </FormulaStep>

            {/* B.2.5 Gaya Gempa Pseudostatik */}
            {p.seismic?.enabled && (
              <FormulaStep num="4.5" title="Beban Gempa Pseudostatik (Westergaard & KP-02 §7)" codeRef="KP-02 IRIGASI §7.2">
                <MathBlock
                  eq="F<sub>eq,H</sub> = k<sub>h</sub> &times; W &emsp;&emsp; P<sub>Westergaard</sub> = 0.726 &times; k<sub>h</sub> &times; &gamma;<sub>w</sub> &times; h<sub>u</sub><sup>2</sup> &times; L"
                  desc="Gaya Inersia Struktur & Gaya Hidrodinamis Westergaard"
                  result={`kh = ${fmt(p.seismic.kh, 3)} ; F_eq,H = ${fmt(fEqH?.H ?? 0, 1)} kN`}
                  standardRef="KP-02 §7.2"
                />
              </FormulaStep>
            )}

            {/* B.2.6 Stabilitas Geser & Guling */}
            <FormulaStep num="4.6" title="Stabilitas Geser & Guling (SNI 8460:2017 & KP-02 §6.1)" codeRef="SNI 8460:2017 §7.3">
              <MathBlock
                eq="R = &mu; &times; N + c<sub>a</sub> &times; B<sub>eff</sub> &times; L &emsp;&emsp; FS<sub>geser</sub> = R / H<sub>net</sub> &ge; FS<sub>izin,geser</sub>"
                desc="Kapasitas Tahanan Geser Dasar Fondasi & Faktor Keamanan Geser"
                result={
                  govCase
                    ? `R = ${fmt(govCase.R, 1)} kN ; H_net = ${fmt(govCase.H, 1)} kN ; FS_geser = ${fmt(govCase.fsSlide, 2)} (min ${fmt(govCase.fsSlideMin, 2)}) &rarr; ${govCase.slideOk ? "MEMENUHI" : "TIDAK MEMENUHI"}`
                    : "—"
                }
                standardRef="SNI 8460:2017"
              />
              <MathBlock
                eq="FS<sub>guling</sub> = &sum; M<sub>r</sub> / &sum; M<sub>o</sub> &ge; FS<sub>izin,guling</sub> &emsp;&emsp; a = (&sum; M<sub>r</sub> - &sum; M<sub>o</sub>) / N &emsp;&emsp; e = <sup>B</sup>/<sub>2</sub> - a"
                desc="Keseimbangan Momen terhadap Toe, Posisi Resultan a, dan Eksentrisitas e"
                result={
                  govCase
                    ? `Mr = ${fmt(govCase.Mr, 1)} kNm ; Mo = ${fmt(govCase.Mo, 1)} kNm ; FS_guling = ${fmt(govCase.fsOverturn, 2)} (min ${fmt(govCase.fsOverturnMin, 2)}) ; a = ${fmt(govCase.a, 3)} m ; e = ${fmt(govCase.e, 3)} m`
                    : "—"
                }
                standardRef="KP-02 §6.1.2"
              />
            </FormulaStep>

            {/* B.2.7 Tegangan Dasar Fondasi */}
            <FormulaStep num="4.7" title="Tegangan Kontak Dasar Fondasi & Eksentrisitas (Meyerhof)" codeRef="SNI 8460:2017 & KP-02">
              <MathBlock
                eq={
                  govCase && Math.abs(govCase.e) <= a.B / 6
                    ? "q<sub>toe,heel</sub> = <sup>N</sup>/<sub>(B&middot;L)</sub> &times; [ 1 &plusmn; <sup>(6&middot;e)</sup>/<sub>B</sub> ] &emsp;&emsp; (|e| &le; B/6 : Kontak Penuh)"
                    : "q<sub>toe</sub> = <sup>(2&middot;N)</sup>/<sub>(3&middot;a&middot;L)</sub> &emsp;&emsp; (|e| &gt; B/6 : Kontak Parsial Toe)"
                }
                desc="Tegangan Kontak Tanah Dasar Fondasi Berdasarkan Rejim Eksentrisitas"
                result={
                  govCase
                    ? `Rejim: ${govCase.regime} ; q_toe = ${fmt(govCase.qToe, 1)} kPa ; q_heel = ${fmt(govCase.qHeel, 1)} kPa ; q_izin = ${fmt(a.bearing.qa, 1)} kPa &rarr; ${govCase.bearingOk ? "MEMENUHI" : "TIDAK MEMENUHI"}`
                    : "—"
                }
                standardRef="Meyerhof / SNI 8460"
              />
            </FormulaStep>

            {/* B.2.8 Rembesan & Bahaya Piping */}
            {a.seepage.enabled && (
              <FormulaStep num="4.8" title="Evaluasi Rembesan Bawah Tanah & Piping (Lane & Bligh)" codeRef="KP-02 IRIGASI §8.3">
                <MathBlock
                  eq="C<sub>w,Lane</sub> = [ L<sub>v</sub> + <sup>L<sub>h</sub></sup>/<sub>3</sub> ] / &Delta;H &ge; C<sub>w,min</sub> &emsp;&emsp; C<sub>Bligh</sub> = (L<sub>v</sub> + L<sub>h</sub>) / &Delta;H &ge; C<sub>min</sub>"
                  desc="Angka Rembesan Tertimbang Lane (Weighted Creep Ratio) & Angka Rembesan Bligh"
                  result={`Lv = ${fmt(a.seepage.Lv, 2)} m ; Lh = ${fmt(a.seepage.Lh, 2)} m ; ΔH = ${fmt(a.seepage.deltaH, 2)} m ; Cw = ${fmt(a.seepage.Cw, 2)} (min ${a.seepage.CwMin}) ; C = ${fmt(a.seepage.C, 2)} (min ${a.seepage.CMin})`}
                  standardRef="KP-02 §8.3"
                />
              </FormulaStep>
            )}
          </Section>
        </div>
      )}

      {/* 4. Rembesan */}
      {included.seepage && a.seepage.enabled && (
        <div className="report-section mb-6">
          <Section title="5. Evaluasi Rembesan & Bahaya Piping (KP-02 · Lane & Bligh)">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KV k="Material tanah dasar" v={a.seepage.soilType} />
              <KV k="Panjang rayapan Lv / Lh" v={`${fmt(a.seepage.Lv)} / ${fmt(a.seepage.Lh)}`} unit="m" />
              <KV k="Beda tinggi energi ΔH" v={fmt(a.seepage.deltaH)} unit="m" />
              <KV k="Lane Cw aktual / izin" v={`${fmt(a.seepage.Cw)} / min ${a.seepage.CwMin}`} />
              <KV k="Bligh C aktual / izin" v={`${fmt(a.seepage.C)} / min ${a.seepage.CMin}`} />
              <KV k="Status keamanan rembesan" v={<Status s={a.seepage.status} />} />
            </div>
          </Section>
        </div>
      )}

      {/* 5. Envelope */}
      {included.envelope && (
        <div className="report-section mb-6">
          <Section title="6. Ringkasan Kasus Kritis (Governing Envelope)">
            <EnvelopeTable a={a} />
          </Section>
        </div>
      )}

      {/* 6. Kasus Beban */}
      {included.cases && (
        <div className="report-section report-section-break mb-6">
          <Section title="7. Hasil Lengkap Matriks Kasus Pembebanan">
            <CaseTable a={a} />
          </Section>
        </div>
      )}

      {/* 7. Rekomendasi */}
      {included.recs && (
        <div className="report-section mb-6">
          <Section title="8. Rekomendasi & Catatan Rekayasa">
            <ul className="list-disc space-y-1.5 pl-5">
              {recs.map((r, i) => (
                <li key={i} className="text-xs">
                  <strong>[{r.level}] {r.title}:</strong> {r.detail}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}

      {/* 8. Regulasi & Legalitas */}
      {included.sources && (
        <div className="report-section mb-6">
          <Section title="9. Acuan Standar & Batasan Tanggung Jawab Teknis">
            <ul className="space-y-1 text-xs">
              {SOURCES.map((s) => (
                <li key={s.id}>
                  <span className="num font-semibold text-foreground print:text-black">{s.id}</span> — {s.name}: {s.use}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground border-t pt-2 print:border-slate-300 print:text-slate-700">
              Hasil perhitungan berbasis rumus hidraulika dan mekanika tanah standar KP-02 Irigasi dan SNI 8460:2017. Laporan ini merupakan nota desain teknis awal dan wajib ditinjau serta disahkan oleh Tenaga Ahli Teknik Sumber Daya Air / Geoteknik (SKA/SKK IPU/IPT) sebelum tahap pelaksanaan konstruksi fisik di lapangan.
            </p>

            <div className="mt-8 hidden print:grid grid-cols-2 gap-8 text-center text-xs">
              <div className="border-t border-black pt-2">
                <p className="font-semibold">Diverifikasi & Disetujui Oleh:</p>
                <div className="h-16" />
                <p className="font-bold underline">{p.engineer || "(Nama Tenaga Ahli)"}</p>
                <p className="text-[10px] text-slate-600">Ahli Sumber Daya Air / Geoteknik</p>
              </div>
              <div className="border-t border-black pt-2">
                <p className="font-semibold">Mengetahui / Pengguna Jasa:</p>
                <div className="h-16" />
                <p className="font-bold underline">PPK / Instansi Pemberi Tugas</p>
                <p className="text-[10px] text-slate-600">NIP. ........................................</p>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* Step Navigation in screen mode */}
      <div className="no-print">
        <StepNav
          prev={{ to: "/proyek/$id/rekomendasi", label: "10. Rekomendasi Teknis" }}
          projectId={p.id}
        />
      </div>
    </div>
  );
}
