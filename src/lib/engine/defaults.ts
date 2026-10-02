import { LOAD_CASES, typeById, type TypeId } from "./master";
import type { Component, Project } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 10);

export function defaultCases() {
  return LOAD_CASES.map((c) => ({
    id: c.id, name: c.name, cls: c.cls, active: true,
    fHu: c.fHu, fHd: c.fHd, fU: c.fU, fSoil: c.fSoil, fOtherH: c.fOtherH, fWater: c.fWater,
    fEq: c.fEq ?? 0,
  }));
}

export function componentsFor(type: TypeId): Component[] {
  return typeById(type).components.slice(0, 3).map((name) => ({ id: uid(), name, shape: "PERSEGI", b1: 0, b2: 0, h: 0, x0: 0, z0: 0, material: "Beton bertulang" }));
}

export function newProject(
  type: TypeId = "BND",
  meta?: Partial<Pick<Project, "name" | "location" | "kecamatan" | "desa" | "engineer">>
): Project {
  return {
    id: uid(),
    updatedAt: Date.now(),
    name: meta?.name?.trim() || "Proyek baru",
    location: meta?.location?.trim() || "Kabupaten Ciamis",
    engineer: meta?.engineer?.trim() || "",
    type,
    analysisMode: "SELURUH BANGUNAN",
    actualWidth: 1,
    kecamatan: meta?.kecamatan?.trim() || "",
    desa: meta?.desa?.trim() || "",
    B: 0,
    Df: 0,
    Hsoil: 0,
    switches: { hydroUp: "OTOMATIS", hydroDown: "OTOMATIS", uplift: "OTOMATIS", soilLat: "OTOMATIS", waterWeight: "OTOMATIS" },
    fsOverride: { enabled: false, slide: 2, overturn: 1.5 },
    criteriaMode: "PER KASUS",
    components: componentsFor(type),
    hydrology: { method: "MANUAL", Q: 0, C: 0.6, I: 0, A: 0 },
    hydraulics: { method: "MANUAL", hu: 0, hd: 0, b: 0, z: 0, n: 0.03, S: 0, pMercu: 2.5, Cd: 2.1, beff: 0 },
    soil: { mode: "SCREENING", gamma: 0, phi: 0, c: 0, mu: 0, qa: 0, slidingMode: "GESEK", caRatio: 0.67, submergedBase: true },
    earth: { mode: "RANKINE AKTIF", K: 0, surcharge: 0, hWaterSoil: 0 },
    uplift: { lambda: 1 },
    extra: { H: 0, armH: 0, V: 0, xV: 0, water: 0, xWater: 0 },
    bearing: { mode: "QIZIN", fs: 3, checkMeyerhof: false },
    seismic: { enabled: false, kh: 0.12, kv: 0 },
    seepage: { enabled: type === "BND", dCutoffUp: 1.0, dCutoffDown: 1.5, soilType: "PASIR_SEDANG" },
    cases: defaultCases(),
  };
}

// Sampel UAT 34_UJI_PENERIMAAN — Bendung Tetap, Panawangan/Cinyasag
export function uatSample(): Project {
  const p = newProject("BND");
  return {
    ...p, name: "Sampel UAT — Bendung Tetap (Panawangan)", kecamatan: "Panawangan", desa: "Cinyasag", B: 6, Df: 1, actualWidth: 1,
    components: [
      { id: uid(), name: "Lantai dasar", shape: "PERSEGI", b1: 6, b2: 0, h: 1, x0: 0, z0: 0, material: "Beton bertulang" },
      { id: uid(), name: "Badan bendung", shape: "TRAPESIUM", b1: 4, b2: 2, h: 2, x0: 1, z0: 1, material: "Beton bertulang" },
      { id: uid(), name: "Mercu / blok atas", shape: "PERSEGI", b1: 2, b2: 0, h: 0.5, x0: 2, z0: 3, material: "Beton bertulang" },
    ],
    hydrology: { ...p.hydrology, Q: 5 },
    hydraulics: { ...p.hydraulics, hu: 2.5, hd: 0.8 },
  };
}
