import type { Project } from "./engine/types";
import { analyze } from "./engine/compute";
import { typeById } from "./engine/master";

export async function exportXlsx(p: Project) {
  const XLSX = await import("xlsx");
  const a = analyze(p);
  const wb = XLSX.utils.book_new();
  const add = (name: string, rows: (string | number | null)[][]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  const r = (v: number | null, d = 3) => (v === null || !Number.isFinite(v) ? null : +v.toFixed(d));

  add("01_PROYEK", [
    ["Parameter", "Nilai", "Satuan"],
    ["Nama proyek", p.name, "-"], ["Jenis bangunan", typeById(p.type).name, "-"], ["Mode analisis", p.analysisMode, "-"],
    ["Lebar analisis", a.L, "m"], ["Kecamatan", p.kecamatan, "-"], ["Desa", p.desa, "-"],
    ["B", p.B, "m"], ["Df", p.Df, "m"], ["H tanah tertahan", p.Hsoil, "m"],
    ["hu efektif", a.wl.hu, "m"], ["hd efektif", a.wl.hd, "m"],
    ["γ tanah", a.soil.gamma, "kN/m³"], ["φ'", a.soil.phi, "°"], ["c'", a.soil.c, "kPa"], ["μ", a.soil.mu, "-"], ["q izin", r(a.bearing.qa), "kPa"],
    ["Sumber tanah", a.soil.source, "-"],
  ]);
  add("11_GEOMETRI", [
    ["Komponen", "Bentuk", "b1", "b2", "h", "X0", "Z0", "Material", "γ", "A (m²)", "Xc", "Zc", "W (kN)", "Lengan toe", "M (kNm)"],
    ...a.comps.map((c) => [c.name, c.shape, c.b1, c.b2, c.h, c.x0, c.z0, c.material, c.gamma, r(c.A), r(c.xc), r(c.zc), r(c.W), r(c.armToe), r(c.M)]),
    ["TOTAL", "", "", "", "", "", "", "", "", "", "", "", r(a.W), "", r(a.MW)],
  ]);
  if (a.seepage.enabled) {
    add("21_REMBESAN", [
      ["Parameter Rembesan / Piping", "Nilai", "Satuan / Keterangan"],
      ["Jenis tanah dasar", a.seepage.soilType, "-"],
      ["Kedalaman cutoff hulu", p.seepage?.dCutoffUp ?? 0, "m"],
      ["Kedalaman cutoff hilir", p.seepage?.dCutoffDown ?? 0, "m"],
      ["Panjang rayapan vertikal (Lv)", a.seepage.Lv, "m"],
      ["Panjang rayapan horizontal (Lh)", a.seepage.Lh, "m"],
      ["Beda tinggi energi (ΔH)", a.seepage.deltaH, "m"],
      ["Panjang rayapan Lane (Lc)", a.seepage.LcreepLane, "m"],
      ["Angka rayapan Lane (Cw)", a.seepage.Cw, "-"],
      ["Batas aman Lane (Cw min)", a.seepage.CwMin, "-"],
      ["Angka rayapan Bligh (C)", a.seepage.C, "-"],
      ["Batas aman Bligh (C min)", a.seepage.CMin, "-"],
      ["Status keamanan piping", a.seepage.status, "-"],
    ]);
  }
  add("25_KASUS_BEBAN", [
    ["ID", "Kasus", "Kelas", "hu", "hd", "N (kN)", "H (kN)", "Mr (kNm)", "Mo (kNm)", "R (kN)", "FS geser", "FS geser min", "FS guling", "FS guling min", "a (m)", "e (m)", "Rezim", "q toe", "q heel", "q maks", "qmax/qizin", "Status"],
    ...a.cases.map((c) => [c.id, c.name, c.cls, r(c.hu), r(c.hd), r(c.N), r(c.H), r(c.Mr), r(c.Mo), r(c.R), r(c.fsSlide), r(c.fsSlideMin), r(c.fsOverturn), r(c.fsOverturnMin), r(c.a), r(c.e), c.regime, r(c.qToe), r(c.qHeel), r(c.qMax), r(c.qRatio), c.status]),
  ]);
  const e = a.envelope;
  add("27_ENVELOPE", [
    ["Metrik", "Nilai", "Kasus governing"],
    ["FS geser (governing)", r(e.slide?.c.fsSlide ?? null), e.slide?.caseName ?? "-"],
    ["FS guling (governing)", r(e.over?.c.fsOverturn ?? null), e.over?.caseName ?? "-"],
    ["|e| maks", r(e.ecc?.value ?? null), e.ecc?.caseName ?? "-"],
    ["q maks", r(e.q?.value ?? null), e.q?.caseName ?? "-"],
    ["qmax/qizin maks", r(e.ratio?.value ?? null), e.ratio?.caseName ?? "-"],
    ["Status envelope", e.overall, ""],
  ]);
  XLSX.writeFile(wb, `Stabilitas_${p.name.replace(/[^\w]+/g, "_").slice(0, 40)}.xlsx`);
}
