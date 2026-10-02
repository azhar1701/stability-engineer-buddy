import { P } from "./params";
import { CLASS_FACTOR, KECAMATAN, LOAD_CASES, MATERIALS, SOIL_PROFILES, typeById, type ForceKey } from "./master";
import type { Component, Project } from "./types";

const d2r = (d: number) => (d * Math.PI) / 180;
const pos = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);

// ---------- 11 Geometri ----------
export interface CompResult extends Component { A: number; xc: number; zc: number; gamma: number; W: number; armToe: number; M: number }
export function componentProps(c: Component, L: number, B: number): CompResult {
  const b1 = pos(c.b1), b2 = pos(c.b2), h = pos(c.h);
  let A = 0, xl = 0, zl = 0; // centroid local from x0,z0
  switch (c.shape) {
    case "PERSEGI": A = b1 * h; xl = b1 / 2; zl = h / 2; break;
    case "TRAPESIUM": // simetris, b1 dasar, b2 atas
      A = ((b1 + b2) / 2) * h; xl = b1 / 2;
      zl = b1 + b2 > 0 ? (h * (b1 + 2 * b2)) / (P.PEMBAGI_TITIK_BERAT_SEGITIGA * (b1 + b2)) : 0; break;
    case "SEGITIGA_KANAN": // sisi tegak di kiri (hulu)
      A = P.FAKTOR_SEGITIGA * b1 * h; xl = b1 / P.PEMBAGI_TITIK_BERAT_SEGITIGA; zl = h / P.PEMBAGI_TITIK_BERAT_SEGITIGA; break;
    case "SEGITIGA_KIRI":
      A = P.FAKTOR_SEGITIGA * b1 * h; xl = (2 * b1) / P.PEMBAGI_TITIK_BERAT_SEGITIGA; zl = h / P.PEMBAGI_TITIK_BERAT_SEGITIGA; break;
  }
  const gamma = c.material === "CUSTOM" ? pos(c.gammaCustom ?? 0) : MATERIALS.find((m) => m.name === c.material)?.gamma ?? 0;
  const xc = c.x0 + xl, zc = c.z0 + zl;
  const W = A * L * gamma;
  const armToe = B - xc;
  return { ...c, A, xc, zc, gamma, W, armToe, M: W * armToe };
}

export function analysisWidth(p: Project) { return p.analysisMode === "PER-METER" ? 1 : pos(p.actualWidth); }

// ---------- 12/13/14 Hidrologi & hidraulika ----------
export function designQ(p: Project) {
  const h = p.hydrology;
  return h.method === "RASIONAL" ? P.KOEF_RASIONAL * h.C * h.I * h.A : h.Q;
}
export function manningDepth(Q: number, b: number, z: number, n: number, S: number) {
  if (!(Q > 0 && n > 0 && S > 0 && (b > 0 || z > 0))) return 0;
  for (let y = P.STEP_MANNING; y <= P.MAX_Y_MANNING; y += P.STEP_MANNING) {
    const A = y * (b + z * y);
    const Pw = b + 2 * y * Math.sqrt(1 + z * z);
    const q = (1 / n) * A * Math.pow(A / Pw, P.EKSPONEN_PANGKAT_2_3) * Math.sqrt(S);
    if (q >= Q) return +y.toFixed(3);
  }
  return P.MAX_Y_MANNING;
}
export function waterLevels(p: Project) {
  const hy = p.hydraulics;
  if (hy.method === "MANNING") {
    const y = manningDepth(designQ(p), hy.b, hy.z, hy.n, hy.S);
    return { hu: y, hd: hy.hd, status: y > 0 ? "PENAPISAN" : "BELUM LENGKAP" };
  }
  return { hu: pos(hy.hu), hd: pos(hy.hd), status: hy.hu > 0 || hy.hd > 0 ? "FINAL" : "BELUM LENGKAP" };
}

// ---------- 15/16/17 Tanah ----------
export function soilParams(p: Project) {
  const profileId = KECAMATAN[p.kecamatan];
  const prof = SOIL_PROFILES.find((s) => s.id === profileId);
  if (p.soil.mode === "PROYEK") {
    const s = p.soil;
    const ok = s.gamma > 0 && s.phi > 0 && s.mu > 0;
    return { source: "DATA PROYEK" as const, profileId: "DATA_PROYEK", gamma: s.gamma, phi: s.phi, c: s.c, mu: s.mu, qa: s.qa, status: ok ? "LENGKAP" : "BELUM LENGKAP" };
  }
  if (!prof) return { source: "SCREENING" as const, profileId: "-", gamma: 0, phi: 0, c: 0, mu: 0, qa: 0, status: "BELUM LENGKAP" };
  return { source: "SCREENING" as const, profileId: prof.id, gamma: prof.gamma, phi: prof.phi, c: prof.c, mu: prof.mu, qa: prof.qa, status: "PENAPISAN" };
}

export function earthK(p: Project, phi: number) {
  if (p.earth.mode === "MANUAL") return pos(p.earth.K);
  if (p.earth.mode === "DIAM K0") return 1 - Math.sin(d2r(phi));
  return Math.pow(Math.tan(d2r(45 - phi / 2)), 2);
}

// ---------- 28 Daya dukung ----------
export function bearingFactors(phi: number) {
  const t = Math.tan(d2r(phi));
  const Nq = Math.exp(Math.PI * t) * Math.pow(Math.tan(d2r(45 + phi / 2)), 2);
  const Nc = phi > 0 ? (Nq - 1) / t : 5.14;
  const Ng = 2 * (Nq + 1) * t;
  return { Nc, Nq, Ng };
}
export function allowableBearing(p: Project) {
  const s = soilParams(p);
  if (p.bearing.mode === "QIZIN") return { qa: s.qa, qu: s.qa * p.bearing.fs, ...bearingFactors(s.phi) };
  const f = bearingFactors(s.phi);
  const qu = s.c * f.Nc + s.gamma * pos(p.Df) * f.Nq + P.FAKTOR_SEGITIGA * s.gamma * pos(p.B) * f.Ng;
  return { qa: p.bearing.fs > 0 ? qu / p.bearing.fs : 0, qu, ...f };
}

// ---------- 24 Gaya aktif ----------
export function forceActive(p: Project, k: ForceKey) {
  const s = p.switches[k];
  return s === "OTOMATIS" ? typeById(p.type).autoForces[k] : s === "YA";
}
export function fsCriteria(p: Project) {
  const t = typeById(p.type);
  return p.fsOverride.enabled ? { slide: p.fsOverride.slide, overturn: p.fsOverride.overturn, bearing: t.fsBearing } : { slide: t.fsSlide, overturn: t.fsOverturn, bearing: t.fsBearing };
}

// ---------- 25/26 Kasus beban & stabilitas ----------
export interface Force { id: string; name: string; axis: "V" | "H"; dir: "BAWAH" | "ATAS" | "PENGGERAK" | "PENAHAN"; F: number; arm: number; Mr: number; Mo: number }
export type Regime = "KONTAK PENUH" | "KONTAK PARSIAL TOE" | "KONTAK PARSIAL HEEL" | "RESULTAN DI LUAR DASAR" | "TIDAK AKTIF";
export interface CaseResult {
  id: string; name: string; cls: string; active: boolean; applies: boolean;
  hu: number; hd: number; forces: Force[];
  N: number; H: number; Mr: number; Mo: number; R: number;
  fsSlide: number | null; fsOverturn: number | null; fsSlideMin: number; fsOverturnMin: number;
  a: number; e: number; regime: Regime; qToe: number; qHeel: number; qMax: number; qRatio: number;
  slideOk: boolean; overturnOk: boolean; bearingOk: boolean; status: "MEMENUHI" | "TIDAK MEMENUHI" | "PERLU TINJAU" | "BELUM LENGKAP" | "TIDAK AKTIF";
}

export function analyze(p: Project) {
  const L = analysisWidth(p);
  const B = pos(p.B);
  const comps = p.components.map((c) => componentProps(c, L, B));
  const W = comps.reduce((s, c) => s + c.W, 0);
  const MW = comps.reduce((s, c) => s + c.M, 0);
  const wl = waterLevels(p);
  const soil = soilParams(p);
  const K = earthK(p, soil.phi);
  const bearing = allowableBearing(p);
  const crit = fsCriteria(p);
  const gw = P.GAMMA_AIR;
  const T3 = P.PEMBAGI_TITIK_BERAT_SEGITIGA;
  const act = {
    hu: forceActive(p, "hydroUp"), hd: forceActive(p, "hydroDown"), U: forceActive(p, "uplift"),
    soil: forceActive(p, "soilLat"), water: forceActive(p, "waterWeight"),
  };

  const readiness = readinessChecks(p, { W, wl, soil, B, L });
  const ready = readiness.every((r) => r.ok || !r.required);

  const cases: CaseResult[] = p.cases.map((cs) => {
    const def = LOAD_CASES.find((d) => d.id === cs.id);
    const applies = def ? def.applies.includes(p.type) : true;
    const on = cs.active && applies;
    const hu = wl.hu * cs.fHu, hd = wl.hd * cs.fHd;
    const forces: Force[] = [];
    const push = (f: Omit<Force, "Mr" | "Mo">, resisting: boolean) =>
      forces.push({ ...f, Mr: resisting ? f.F * f.arm : 0, Mo: resisting ? 0 : f.F * f.arm });

    push({ id: "SELF_WEIGHT", name: "Berat sendiri", axis: "V", dir: "BAWAH", F: W, arm: W > 0 ? MW / W : 0 }, true);
    if (act.hu && hu > 0) push({ id: "HYDRO_UP", name: "Hidrostatik hulu", axis: "H", dir: "PENGGERAK", F: P.FAKTOR_SEGITIGA * gw * hu * hu * L, arm: hu / T3 }, false);
    if (act.hd && hd > 0) push({ id: "HYDRO_DOWN", name: "Hidrostatik hilir", axis: "H", dir: "PENAHAN", F: P.FAKTOR_SEGITIGA * gw * hd * hd * L, arm: hd / T3 }, true);
    if (act.U && cs.fU > 0 && B > 0) {
      const pu = gw * hu * p.uplift.lambda * cs.fU, pd = gw * hd * p.uplift.lambda * cs.fU;
      const U = P.FAKTOR_SEGITIGA * (pu + pd) * B * L;
      const xFromHeel = pu + pd > 0 ? (B / T3) * ((2 * pu + pd) / (pu + pd)) : B / 2;
      if (U > 0) push({ id: "UPLIFT", name: "Gaya angkat", axis: "V", dir: "ATAS", F: U, arm: B - xFromHeel }, false);
    }
    if (act.soil && p.Hsoil > 0 && cs.fSoil > 0) {
      const H = p.Hsoil;
      const Pa = (P.FAKTOR_SEGITIGA * K * soil.gamma * H * H + K * pos(p.earth.surcharge) * H) * L * cs.fSoil;
      push({ id: "LAT_SOIL", name: "Tekanan tanah lateral", axis: "H", dir: "PENGGERAK", F: Pa, arm: H / T3 }, false);
    }
    if (p.extra.H > 0 && cs.fOtherH > 0) push({ id: "OTHER_H", name: "Gaya horizontal lain", axis: "H", dir: "PENGGERAK", F: p.extra.H * cs.fOtherH, arm: p.extra.armH }, false);
    if (p.extra.V > 0) push({ id: "OTHER_V", name: "Gaya vertikal lain", axis: "V", dir: "BAWAH", F: p.extra.V, arm: B - p.extra.xV }, true);
    if (act.water && p.extra.water > 0 && cs.fWater > 0) push({ id: "WATER_WEIGHT", name: "Berat air dalam talang", axis: "V", dir: "BAWAH", F: p.extra.water * cs.fWater, arm: B - p.extra.xWater }, true);

    const sum = (pred: (f: Force) => boolean) => forces.filter(pred).reduce((s, f) => s + f.F, 0);
    const N = Math.max(sum((f) => f.dir === "BAWAH") - sum((f) => f.dir === "ATAS"), 0);
    const H = Math.max(sum((f) => f.dir === "PENGGERAK") - sum((f) => f.dir === "PENAHAN"), 0);
    const Mr = forces.reduce((s, f) => s + f.Mr, 0);
    const Mo = forces.reduce((s, f) => s + f.Mo, 0);
    const R = soil.mu * N + (p.soil.slidingMode === "GESEK + KOHESI" ? soil.c * B * L : 0);
    const fsSlide = on && H > 0 ? R / H : null;
    const fsOverturn = on && Mo > 0 ? Mr / Mo : null;
    const factor = p.criteriaMode === "SERAGAM" ? 1 : CLASS_FACTOR[cs.cls];
    const fsSlideMin = crit.slide * factor, fsOverturnMin = crit.overturn * factor;
    const a = on && N > 0 ? (Mr - Mo) / N : 0;
    const e = B / 2 - a;
    let regime: Regime = "TIDAK AKTIF";
    let qToe = 0, qHeel = 0;
    if (on) {
      if (a <= 0 || a >= B) regime = "RESULTAN DI LUAR DASAR";
      else if (Math.abs(e) <= B / P.PEMBAGI_TENGAH_SEPERTIGA) regime = "KONTAK PENUH";
      else regime = e > 0 ? "KONTAK PARSIAL TOE" : "KONTAK PARSIAL HEEL";
      const Ab = B * L;
      if (regime === "KONTAK PENUH") {
        qToe = (N / Ab) * (1 + (P.PEMBAGI_TENGAH_SEPERTIGA * e) / B);
        qHeel = (N / Ab) * (1 - (P.PEMBAGI_TENGAH_SEPERTIGA * e) / B);
      } else if (regime === "KONTAK PARSIAL TOE") qToe = (P.FAKTOR_Q_SEGITIGA * N) / (P.FAKTOR_LEBAR_KONTAK * a * L);
      else if (regime === "KONTAK PARSIAL HEEL") qHeel = (P.FAKTOR_Q_SEGITIGA * N) / (P.FAKTOR_LEBAR_KONTAK * (B - a) * L);
    }
    const qMax = Math.max(qToe, qHeel);
    const qRatio = bearing.qa > 0 ? qMax / bearing.qa : 0;
    const slideOk = fsSlide === null || fsSlide >= fsSlideMin;
    const overturnOk = fsOverturn === null || fsOverturn >= fsOverturnMin;
    const bearingOk = regime !== "RESULTAN DI LUAR DASAR" && qMax <= bearing.qa;
    let status: CaseResult["status"] = "TIDAK AKTIF";
    if (on) {
      if (!ready) status = "BELUM LENGKAP";
      else if (!slideOk || !overturnOk || !bearingOk) status = "TIDAK MEMENUHI";
      else if (regime.startsWith("KONTAK PARSIAL")) status = "PERLU TINJAU";
      else status = "MEMENUHI";
    }
    return { id: cs.id, name: cs.name, cls: cs.cls, active: cs.active, applies, hu, hd, forces, N, H, Mr, Mo, R, fsSlide, fsOverturn, fsSlideMin, fsOverturnMin, a, e, regime, qToe, qHeel, qMax, qRatio, slideOk, overturnOk, bearingOk, status };
  });

  const envelope = buildEnvelope(cases);
  return { L, B, comps, W, MW, wl, soil, K, bearing, crit, act, cases, envelope, readiness, ready, Q: designQ(p) };
}

function buildEnvelope(cases: CaseResult[]) {
  const on = cases.filter((c) => c.status !== "TIDAK AKTIF");
  const minBy = (f: (c: CaseResult) => number | null) => {
    let best: CaseResult | null = null, v = Infinity;
    for (const c of on) { const x = f(c); if (x !== null && x < v) { v = x; best = c; } }
    return best ? { value: v, caseId: best.id, caseName: best.name, c: best } : null;
  };
  const maxBy = (f: (c: CaseResult) => number) => {
    let best: CaseResult | null = null, v = -Infinity;
    for (const c of on) { const x = f(c); if (x > v) { v = x; best = c; } }
    return best ? { value: v, caseId: best.id, caseName: best.name, c: best } : null;
  };
  // governing slide = minimum margin FS/FSmin
  const slide = minBy((c) => (c.fsSlide === null ? null : c.fsSlide / c.fsSlideMin));
  const over = minBy((c) => (c.fsOverturn === null ? null : c.fsOverturn / c.fsOverturnMin));
  const ecc = maxBy((c) => Math.abs(c.e));
  const q = maxBy((c) => c.qMax);
  const ratio = maxBy((c) => c.qRatio);
  const statuses = on.map((c) => c.status);
  const overall = on.length === 0 ? "TIDAK AKTIF" : statuses.includes("BELUM LENGKAP") ? "BELUM LENGKAP" : statuses.includes("TIDAK MEMENUHI") ? "TIDAK MEMENUHI" : statuses.includes("PERLU TINJAU") ? "PERLU TINJAU" : "MEMENUHI";
  return { slide, over, ecc, q, ratio, overall };
}

// ---------- 03 Profil aktif / readiness ----------
export interface Check { label: string; ok: boolean; required: boolean; step: string; note?: string }
function readinessChecks(p: Project, ctx: { W: number; wl: ReturnType<typeof waterLevels>; soil: ReturnType<typeof soilParams>; B: number; L: number }): Check[] {
  const hyd = forceActive(p, "hydroUp") || forceActive(p, "hydroDown") || forceActive(p, "uplift");
  return [
    { label: "Nama proyek", ok: p.name.trim().length > 0, required: true, step: "proyek" },
    { label: "Lebar analisis > 0", ok: ctx.L > 0, required: true, step: "proyek" },
    { label: "Lebar dasar fondasi B > 0", ok: ctx.B > 0, required: true, step: "proyek" },
    { label: "Lokasi kecamatan (untuk penapisan tanah)", ok: !!KECAMATAN[p.kecamatan] || p.soil.mode === "PROYEK", required: true, step: "proyek" },
    { label: "Geometri: berat sendiri > 0", ok: ctx.W > 0, required: true, step: "geometri" },
    { label: "Muka air hulu/hilir", ok: ctx.wl.status !== "BELUM LENGKAP", required: hyd, step: "hidraulika" },
    { label: "Parameter tanah (γ, φ', μ)", ok: ctx.soil.status !== "BELUM LENGKAP", required: true, step: "tanah" },
    { label: "Tinggi tanah tertahan H", ok: p.Hsoil > 0, required: forceActive(p, "soilLat"), step: "proyek" },
    { label: "Berat air talang", ok: p.extra.water > 0, required: forceActive(p, "waterWeight"), step: "gaya" },
    { label: "Data tanah terverifikasi (bukan screening)", ok: ctx.soil.source === "DATA PROYEK", required: false, step: "tanah", note: "Penapisan regional tidak menggantikan penyelidikan tanah (SNI 8460:2017)" },
  ];
}
