import type { analyze } from "./compute";

type A = ReturnType<typeof analyze>;
export interface Rec { level: "KRITIS" | "PERHATIAN" | "INFO"; title: string; detail: string }

// 31_ATURAN_REKOMENDASI — basis aturan teknis
export function recommend(a: A): Rec[] {
  const r: Rec[] = [];
  if (!a.ready) r.push({ level: "KRITIS", title: "Input wajib belum lengkap", detail: "Lengkapi item WAJIB pada panel kesiapan sebelum hasil dapat digunakan." });
  const { slide, over, ecc, ratio } = a.envelope;
  if (slide && slide.c.fsSlide !== null && !slide.c.slideOk)
    r.push({ level: "KRITIS", title: `FS geser tidak memenuhi (${slide.caseName})`, detail: "Opsi: tambah shear key/cutoff, perpanjang lantai dasar untuk menambah N, perbesar μ melalui perbaikan dasar, atau kurangi gaya horizontal (drainase, penurunan muka air)." });
  if (over && over.c.fsOverturn !== null && !over.c.overturnOk)
    r.push({ level: "KRITIS", title: `FS guling tidak memenuhi (${over.caseName})`, detail: "Opsi: perlebar dasar ke arah toe, tambah massa di sisi hulu/heel, atau kurangi uplift dengan drain/cutoff hulu." });
  if (ecc && ecc.c.regime === "RESULTAN DI LUAR DASAR")
    r.push({ level: "KRITIS", title: "Resultan di luar dasar fondasi", detail: "Struktur tidak stabil terhadap guling pada kasus ini; geometri harus direvisi." });
  else if (ecc && ecc.c.regime.startsWith("KONTAK PARSIAL"))
    r.push({ level: "PERHATIAN", title: `Eksentrisitas melebihi B/6 (${ecc.caseName})`, detail: "Terjadi kontak parsial (tegangan tarik diabaikan). Perlebar B atau geser pusat massa agar e ≤ B/6." });
  if (ratio && ratio.value > 1)
    r.push({ level: "KRITIS", title: `Daya dukung terlampaui (qmax/qizin = ${ratio.value.toFixed(2)})`, detail: "Opsi: perlebar fondasi, perdalam Df, perbaikan tanah, atau verifikasi q izin dengan uji lapangan (SPT/sondir)." });
  else if (ratio && ratio.value > 0.85)
    r.push({ level: "PERHATIAN", title: "Daya dukung mendekati batas", detail: `Rasio qmax/qizin = ${ratio.value.toFixed(2)}. Pertimbangkan margin tambahan.` });
  if (a.soil.source === "SCREENING")
    r.push({ level: "PERHATIAN", title: "Parameter tanah dari penapisan regional", detail: "Tingkat kepercayaan RENDAH. Lakukan penyelidikan geoteknik (bor, SPT, uji laboratorium) sebelum desain final sesuai SNI 8460:2017." });
  if (a.wl.status === "PENAPISAN")
    r.push({ level: "INFO", title: "Muka air dari estimasi Manning", detail: "Verifikasi dengan data hidrologi/hidraulika proyek." });
  if (r.length === 0 || (a.envelope.overall === "MEMENUHI" && !r.some((x) => x.level === "KRITIS")))
    r.push({ level: "INFO", title: "Seluruh kasus aktif memenuhi kriteria", detail: "Lanjutkan ke engineering review dan verifikasi data lapangan." });
  return r;
}
