import { describe, it, expect } from "vitest";
import { classifyStructureType, parseElevations, parseDimensions, generateComponentsFromExtracted } from "@/lib/pdfExtractor";

describe("pdfExtractor — Civil Structure Classifier & Heuristic Parsers", () => {
  it("mengklasifikasikan jenis bendung dengan benar dari teks DED", () => {
    const textBendung = `
      KEMENTERIAN PEKERJAAN UMUM DAN PERUMAHAN RAKYAT
      DIREKTORAT JENDERAL SUMBER DAYA AIR
      GAMBAR RENCANA DED BENDUNG TETAP SUNGAI CITANDUY
      POTONGAN MELINTANG TUBUH BENDUNG & MERCU OGEE
      EL. MERCU +124.50 M, EL. DASAR +121.00 M
      LEBAR FONDASI B = 6.00 M
    `;
    const res = classifyStructureType(textBendung);
    expect(res.type).toBe("BND");
    expect(res.confidence).toBe("TINGGI");
  });

  it("mengklasifikasikan jenis dinding penahan tanah / talud secara adaptif", () => {
    const textTalud = `
      PEMERINTAH KABUPATEN CIAMIS
      GAMBAR KERJA DPT KANTILEVER / TALUD PENAHAN TEBING
      RETAINING WALL DETAIL SECTION A-A
      TINGGI H = 4.00 M, LEBAR DASAR B = 2.50 M
    `;
    const res = classifyStructureType(textTalud);
    expect(res.type).toBe("DND");
    expect(res.confidence).toBe("TINGGI");
  });

  it("mengklasifikasikan saluran irigasi lining secara adaptif", () => {
    const textSaluran = `
      JARINGAN IRIGASI DAERAH IRIGASI LAKBOK
      SALURAN SEKUNDER TRAPESIUM LINING BETON
      POTONGAN NORMAL SALURAN
    `;
    const res = classifyStructureType(textSaluran);
    expect(res.type).toBe("SLN");
  });

  it("mengekstrak notasi elevasi lapangan (+El. mdpl) dengan akurat", () => {
    const textElev = `
      DETAIL POTONGAN BENDUNG
      EL. MERCU : + 124.50
      EL. DASAR FONDASI : + 121.00
      EL. MAB : + 126.85
      EL. TWL : + 121.80
      EL. TANAH ASLI : + 122.50
    `;
    const elevs = parseElevations(textElev);
    expect(elevs.elMercu).toBeCloseTo(124.50);
    expect(elevs.elBase).toBeCloseTo(121.00);
    expect(elevs.elWaterUp).toBeCloseTo(126.85);
    expect(elevs.elWaterDown).toBeCloseTo(121.80);
    expect(elevs.elSoil).toBeCloseTo(122.50);
  });

  it("mengekstrak variabel dimensi linier B, H, b, t, dan slope", () => {
    const textDim = `
      LEBAR FONDASI B = 6.50 M
      TINGGI TOTAL H = 3.50 M
      LEBAR MERCU b = 2.00 M
      TEBAL LANTAI t = 1.00 M
      KEMIRINGAN 1 : 0.80
      APRON HULU = 3.00
      APRON HILIR = 5.00
      CUTOFF HULU = 1.50
      CUTOFF HILIR = 2.00
    `;
    const dims = parseDimensions(textDim);
    expect(dims.B).toBeCloseTo(6.50);
    expect(dims.H).toBeCloseTo(3.50);
    expect(dims.bTop).toBeCloseTo(2.00);
    expect(dims.tBase).toBeCloseTo(1.00);
    expect(dims.slopeHilir).toBeCloseTo(0.80);
    expect(dims.lApronUp).toBeCloseTo(3.00);
    expect(dims.lApronDown).toBeCloseTo(5.00);
    expect(dims.dCutoffUp).toBeCloseTo(1.50);
    expect(dims.dCutoffDown).toBeCloseTo(2.00);
  });

  it("men-generate komponen penampang otomatis sesuai dimensi hasil ekstraksi", () => {
    const dims = { B: 7.0, H: 4.0, bTop: 2.0, tBase: 1.2, slopeHilir: 1.0 };
    const calc = { hu: 3.0, pMercu: 2.8 };
    const { components, resultingB } = generateComponentsFromExtracted("BND", dims, calc);
    expect(resultingB).toBe(7.0);
    expect(components.length).toBe(3);
    expect(components[0]!.name).toContain("Lantai dasar");
    expect(components[0]!.b1).toBe(7.0);
    expect(components[0]!.h).toBe(1.2);
    expect(components[1]!.shape).toBe("TRAPESIUM_LERENG_HILIR");
  });
});
