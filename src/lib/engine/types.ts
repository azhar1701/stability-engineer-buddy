import type { CaseClass, ForceKey, Switch, TypeId } from "./master";

export type Shape = "PERSEGI" | "TRAPESIUM" | "TRAPESIUM_LERENG_HILIR" | "SEGITIGA_KANAN" | "SEGITIGA_KIRI";
export interface Component {
  id: string; name: string; shape: Shape;
  b1: number; b2: number; h: number; x0: number; z0: number; material: string; gammaCustom?: number;
}

export interface CaseInput {
  id: string; name: string; cls: CaseClass; active: boolean;
  fHu: number; fHd: number; fU: number; fSoil: number; fOtherH: number; fWater: number;
  fEq?: number;
}

export interface Project {
  id: string;
  updatedAt: number;
  name: string; location: string; engineer: string;
  type: TypeId;
  analysisMode: "SELURUH BANGUNAN" | "PER-METER";
  actualWidth: number;
  kecamatan: string; desa: string;
  B: number; Df: number; Hsoil: number;
  switches: Record<ForceKey, Switch>;
  fsOverride: { enabled: boolean; slide: number; overturn: number };
  criteriaMode: "PER KASUS" | "SERAGAM";
  components: Component[];
  hydrology: { method: "MANUAL" | "RASIONAL"; Q: number; C: number; I: number; A: number };
  hydraulics: {
    method: "MANUAL" | "MANNING" | "WEIR_CREST";
    hu: number; hd: number; b: number; z: number; n: number; S: number;
    pMercu?: number; Cd?: number; beff?: number;
  };
  soil: {
    mode: "SCREENING" | "PROYEK";
    gamma: number; phi: number; c: number; mu: number; qa: number;
    slidingMode: "GESEK" | "GESEK + KOHESI";
    caRatio?: number;
    submergedBase?: boolean;
  };
  earth: { mode: "RANKINE AKTIF" | "DIAM K0" | "MANUAL"; K: number; surcharge: number; hWaterSoil?: number };
  uplift: { lambda: number };
  extra: { H: number; armH: number; V: number; xV: number; water: number; xWater: number };
  bearing: { mode: "QIZIN" | "TERZAGHI"; fs: number; checkMeyerhof?: boolean };
  seismic?: { enabled: boolean; kh: number; kv: number };
  seepage?: { enabled: boolean; dCutoffUp: number; dCutoffDown: number; lApronUp?: number; lApronDown?: number; soilType: string };
  cases: CaseInput[];
  extractedPdfMeta?: {
    fileName: string;
    detectedType: TypeId;
    elevations?: Record<string, number | undefined>;
    dimensions?: Record<string, number | undefined>;
    calculated?: Record<string, number | undefined>;
  };
}
