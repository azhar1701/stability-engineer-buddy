// Data master diekstrak dari Workbook Stabilitas Bangunan Air Ciamis v14 (02, 09, 15, 16, 44, 05)
export type TypeId = "BND" | "SLN" | "DND" | "BLK" | "TLG";
export type Switch = "OTOMATIS" | "YA" | "TIDAK";
export type ForceKey = "hydroUp" | "hydroDown" | "uplift" | "soilLat" | "waterWeight";

export interface StructureType {
  id: TypeId;
  name: string;
  profile: string;
  components: string[];
  fsSlide: number;
  fsOverturn: number;
  fsBearing: number;
  autoForces: Record<ForceKey, boolean>;
  note: string;
}

export const TYPES: StructureType[] = [
  {
    id: "BND", name: "Bendung Tetap On-Stream", profile: "BENDUNG_UTAMA",
    components: ["Lantai dasar", "Badan bendung", "Mercu", "Apron hulu", "Apron hilir", "Cutoff hulu", "Cutoff hilir", "End sill"],
    fsSlide: 2, fsOverturn: 1.5, fsBearing: 3,
    autoForces: { hydroUp: true, hydroDown: true, uplift: true, soilLat: false, waterWeight: false },
    note: "Bangunan utama on-stream; hidrostatik dan uplift aktif.",
  },
  {
    id: "SLN", name: "Saluran Terbuka Gravitasi", profile: "SALURAN_GRAVITASI",
    components: ["Dasar lining", "Dinding kiri", "Dinding kanan", "Toe kiri", "Toe kanan", "Joint/pengaku"],
    fsSlide: 2, fsOverturn: 1.5, fsBearing: 3,
    autoForces: { hydroUp: true, hydroDown: false, uplift: false, soilLat: false, waterWeight: false },
    note: "Geometri lining/dinding saluran.",
  },
  {
    id: "DND", name: "Dinding Saluran/Talud", profile: "DINDING_PENAHAN",
    components: ["Stem dinding", "Footing", "Heel", "Toe", "Shear key", "Drain/filter"],
    fsSlide: 1.5, fsOverturn: 2, fsBearing: 3,
    autoForces: { hydroUp: false, hydroDown: false, uplift: false, soilLat: true, waterWeight: false },
    note: "Tekanan tanah lateral menjadi komponen utama.",
  },
  {
    id: "BLK", name: "Blok Gravitasi", profile: "BLOK_GRAVITASI",
    components: ["Blok utama", "Lantai dasar", "Key/anker", "Pelindung dasar"],
    fsSlide: 2, fsOverturn: 1.5, fsBearing: 3,
    autoForces: { hydroUp: true, hydroDown: true, uplift: true, soilLat: false, waterWeight: false },
    note: "Struktur gravitasi generik.",
  },
  {
    id: "TLG", name: "Talang Irigasi", profile: "TALANG_SUPPORT",
    components: ["Slab dasar talang", "Dinding kiri", "Dinding kanan", "Cap/dudukan", "Pier", "Footing pier", "Pengikat"],
    fsSlide: 2, fsOverturn: 1.5, fsBearing: 3,
    autoForces: { hydroUp: false, hydroDown: false, uplift: false, soilLat: false, waterWeight: true },
    note: "Stabilitas diarahkan ke fondasi support (pier/footing).",
  },
];
export const typeById = (id: TypeId) => TYPES.find((t) => t.id === id)!;

export interface Material { name: string; gamma: number; source: string }
export const MATERIALS: Material[] = [
  { name: "Beton bertulang", gamma: 23.53, source: "Kepmen PUPR No. 05/2022" },
  { name: "Beton polos", gamma: 22.04, source: "Kepmen PUPR No. 05/2022" },
  { name: "Pasangan batu mortar", gamma: 22.07, source: "Referensi internal workbook" },
  { name: "Tanah urug", gamma: 16.67, source: "Kepmen PUPR No. 05/2022" },
];

export interface SoilProfile {
  id: string; desc: string; gamma: number; phi: number; c: number; mu: number; qa: number; confidence: string;
}
export const SOIL_PROFILES: SoilProfile[] = [
  { id: "DATARAN_ALUVIAL", desc: "Dataran aluvial selatan; lempung-lanau aluvial", gamma: 17.5, phi: 28, c: 5, mu: 0.45, qa: 100, confidence: "RENDAH" },
  { id: "RESIDUAL_VULKANIK", desc: "Tanah residual vulkanik/perbukitan utara", gamma: 18, phi: 30, c: 10, mu: 0.5, qa: 150, confidence: "RENDAH" },
  { id: "PERBUKITAN_CAMPURAN", desc: "Perbukitan campuran/residual", gamma: 17.8, phi: 29, c: 7, mu: 0.47, qa: 125, confidence: "RENDAH" },
];

export const KECAMATAN: Record<string, string> = {
  Banjaranyar: "DATARAN_ALUVIAL", Banjarsari: "DATARAN_ALUVIAL", Baregbeg: "PERBUKITAN_CAMPURAN",
  Ciamis: "PERBUKITAN_CAMPURAN", Cidolog: "PERBUKITAN_CAMPURAN", Cihaurbeuti: "RESIDUAL_VULKANIK",
  Cijeungjing: "PERBUKITAN_CAMPURAN", Cikoneng: "PERBUKITAN_CAMPURAN", Cimaragas: "PERBUKITAN_CAMPURAN",
  Cipaku: "RESIDUAL_VULKANIK", Cisaga: "PERBUKITAN_CAMPURAN", Jatinagara: "RESIDUAL_VULKANIK",
  Kawali: "RESIDUAL_VULKANIK", Lakbok: "DATARAN_ALUVIAL", Lumbung: "RESIDUAL_VULKANIK",
  Pamarican: "DATARAN_ALUVIAL", Panawangan: "RESIDUAL_VULKANIK", Panjalu: "RESIDUAL_VULKANIK",
  Panumbangan: "RESIDUAL_VULKANIK", Purwadadi: "DATARAN_ALUVIAL", Rajadesa: "PERBUKITAN_CAMPURAN",
  Rancah: "PERBUKITAN_CAMPURAN", Sadananya: "PERBUKITAN_CAMPURAN", Sindangkasih: "PERBUKITAN_CAMPURAN",
  Sukadana: "PERBUKITAN_CAMPURAN", Sukamantri: "RESIDUAL_VULKANIK", Tambaksari: "PERBUKITAN_CAMPURAN",
};

export interface SeepageCriterion {
  id: string;
  name: string;
  blighC: number;
  laneCw: number;
}
export const SEEPAGE_CRITERIA: SeepageCriterion[] = [
  { id: "PASIR_SANGAT_HALUS", name: "Pasir sangat halus / Lanau", blighC: 18, laneCw: 8.5 },
  { id: "PASIR_HALUS", name: "Pasir halus", blighC: 15, laneCw: 7.0 },
  { id: "PASIR_SEDANG", name: "Pasir sedang", blighC: 12, laneCw: 6.0 },
  { id: "PASIR_KASAR", name: "Pasir kasar", blighC: 12, laneCw: 5.0 },
  { id: "KERIKIL_PASIR", name: "Kerikil dan pasir", blighC: 9, laneCw: 3.5 },
  { id: "LEMPUNG_LUNAK", name: "Lempung lunak", blighC: 8, laneCw: 3.0 },
  { id: "LEMPUNG_SEDANG", name: "Lempung sedang", blighC: 6, laneCw: 2.0 },
  { id: "LEMPUNG_KERAS", name: "Lempung keras / Batu", blighC: 4, laneCw: 1.6 },
];

export type CaseClass = "NORMAL" | "SEMENTARA" | "EKSTREM";
export const CLASS_FACTOR: Record<CaseClass, number> = { NORMAL: 1, SEMENTARA: 0.9, EKSTREM: 0.8 };

export interface LoadCaseDef {
  id: string; name: string; cls: CaseClass;
  fHu: number; fHd: number; fU: number; fSoil: number; fOtherH: number; fWater: number;
  fEq?: number;
  applies: TypeId[]; note: string;
}
export const LOAD_CASES: LoadCaseDef[] = [
  { id: "LC01", name: "Normal", cls: "NORMAL", fHu: 1, fHd: 1, fU: 1, fSoil: 1, fOtherH: 1, fWater: 1, fEq: 0, applies: ["BND", "SLN", "DND", "BLK", "TLG"], note: "Skenario dasar" },
  { id: "LC02", name: "Banjir Hulu Tinggi", cls: "SEMENTARA", fHu: 1.25, fHd: 1, fU: 1, fSoil: 1, fOtherH: 1, fWater: 1, fEq: 0, applies: ["BND", "SLN", "DND"], note: "Sensitivitas; ganti dengan data proyek" },
  { id: "LC03", name: "Muka Air Hilir Rendah", cls: "SEMENTARA", fHu: 1, fHd: 0.25, fU: 1, fSoil: 1, fOtherH: 1, fWater: 1, fEq: 0, applies: ["BND", "SLN"], note: "Sensitivitas tailwater" },
  { id: "LC04", name: "Pengeringan / Konstruksi", cls: "SEMENTARA", fHu: 0, fHd: 0, fU: 0, fSoil: 1, fOtherH: 1, fWater: 0, fEq: 0, applies: ["BND", "SLN", "DND", "BLK", "TLG"], note: "Kondisi tanpa air" },
  { id: "LC05", name: "Ekstrem", cls: "EKSTREM", fHu: 1.35, fHd: 0.5, fU: 1, fSoil: 1.1, fOtherH: 1.25, fWater: 1, fEq: 0.5, applies: ["BND", "SLN", "DND", "BLK", "TLG"], note: "Sensitivitas; bukan faktor regulatif universal" },
  { id: "LC06", name: "Talang Penuh", cls: "NORMAL", fHu: 0, fHd: 0, fU: 0, fSoil: 1, fOtherH: 1, fWater: 1, fEq: 0, applies: ["TLG"], note: "Berat air tributari aktif" },
  { id: "LC07", name: "Talang Kosong", cls: "SEMENTARA", fHu: 0, fHd: 0, fU: 0, fSoil: 1, fOtherH: 1, fWater: 0, fEq: 0, applies: ["TLG"], note: "Berat air = 0" },
  { id: "LC08", name: "Tekanan Tanah Maksimum", cls: "SEMENTARA", fHu: 0, fHd: 0, fU: 0, fSoil: 1.25, fOtherH: 1, fWater: 0, fEq: 0, applies: ["DND"], note: "Sensitivitas dinding/talud" },
  { id: "LC09", name: "Gempa saat Air Normal", cls: "EKSTREM", fHu: 1, fHd: 1, fU: 1, fSoil: 1, fOtherH: 1, fWater: 1, fEq: 1, applies: ["BND", "SLN", "DND", "BLK", "TLG"], note: "Kombinasi gempa operasional KP-02 (fEq = 1)" },
];

export const SOURCES = [
  { id: "REF-01", name: "Kepmen PUPR No. 05 Tahun 2022", use: "Berat isi material konstruksi" },
  { id: "REF-02", name: "SNI 8460:2017", use: "Prinsip kebutuhan data geoteknik, daya dukung, & stabilitas fondasi" },
  { id: "REF-03", name: "KP-02 Bangunan Utama", use: "Metodologi bendung, kriteria FS, rembesan Lane/Bligh, & gempa" },
  { id: "REF-04", name: "KP-03 Saluran", use: "Metodologi saluran / Manning" },
  { id: "REF-05", name: "SNI 1726 / SNI 2833", use: "Beban gempa perencanaan infrastruktur air" },
  { id: "ARCH-01", name: "Workbook Ciamis v14 — Parameter Pusat", use: "Konstanta fisik/metode terpusat" },
];
