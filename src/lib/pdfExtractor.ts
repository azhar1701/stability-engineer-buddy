import type { Component, Project, TypeId } from "./engine/types";
import { uid } from "./engine/defaults";

export interface ExtractedElevations {
  elBase?: number;
  elMercu?: number;
  elWaterUp?: number;
  elWaterDown?: number;
  elSoil?: number;
  elGroundDown?: number;
}

export interface ExtractedDimensions {
  B?: number;
  H?: number;
  bTop?: number;
  tBase?: number;
  slopeHilir?: number;
  lApronUp?: number;
  lApronDown?: number;
  dCutoffUp?: number;
  dCutoffDown?: number;
}

export interface ExtractedPdfData {
  fileName: string;
  pageCount: number;
  rawText: string;
  detectedType: TypeId;
  typeConfidence: "TINGGI" | "SEDANG" | "RENDAH";
  typeReason: string;
  elevations: ExtractedElevations;
  dimensions: ExtractedDimensions;
  calculated: {
    hu: number;
    hd: number;
    pMercu: number;
    Hsoil: number;
    Df: number;
    deltaH: number;
  };
  suggestedComponents: Component[];
}

/**
 * Ekstraksi teks dari PDF menggunakan pdfjs-dist di browser
 */
export async function extractTextFromPdf(file: File): Promise<{ text: string; pageCount: number }> {
  const arrayBuffer = await file.arrayBuffer();

  try {
    const pdfjsLib = await import("pdfjs-dist");
    
    // Set worker to avoid warnings; if running without external worker, fallback to in-thread
    if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    let fullText = "";

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter((str) => str.trim().length > 0);
      fullText += pageStrings.join(" ") + "\n";
    }

    return { text: fullText, pageCount };
  } catch (err) {
    console.warn("pdfjs-dist extraction fallback to raw text stream:", err);
    // Fallback: raw stream parsing for plain text strings in PDF
    const bytes = new Uint8Array(arrayBuffer);
    const latin1 = new TextDecoder("latin1").decode(bytes);
    const matches = latin1.match(/\(([^()]{2,100})\)\s*Tj/g) || [];
    const rawText = matches
      .map((m) => m.replace(/^\(/, "").replace(/\)\s*Tj$/, ""))
      .join(" ");
    return { text: rawText || "PDF Loaded (Raw Mode)", pageCount: 1 };
  }
}

/**
 * Classifier jenis struktur bangunan air berdasarkan konten teks gambar rencana DED
 */
export function classifyStructureType(text: string): { type: TypeId; confidence: "TINGGI" | "SEDANG" | "RENDAH"; reason: string } {
  const t = text.toUpperCase();

  const bendungKeywords = ["BENDUNG", "WEIR", "PELIMPAH", "MERCU", "OGEE", "SPILLWAY", "APRON HULU", "KOLAM OLAK", "STILLING BASIN", "AMBANG LEBAR"];
  const taludKeywords = ["TALUD", "DINDING PENAHAN", "RETAINING WALL", "DPT", "KANTILEVER", "GRAVITASI TANAH", "BRONJONG", "STEM DINDING"];
  const saluranKeywords = ["SALURAN", "LINING", "DRAINASE", "CANAL", "IRIGASI", "SALURAN PRIMER", "SALURAN SEKUNDER", "TRAPESIUM"];
  const talangKeywords = ["TALANG", "AQUEDUCT", "FLUME", "SIPON", "PIER TALANG"];
  const blokKeywords = ["BLOK GRAVITASI", "CHECK DAM", "GROUNDSILL", "KONSOLIDASI"];

  const countMatches = (keys: string[]) => keys.reduce((acc, k) => acc + (t.includes(k) ? 1 : 0), 0);

  const bndScore = countMatches(bendungKeywords);
  const dndScore = countMatches(taludKeywords);
  const slnScore = countMatches(saluranKeywords);
  const tlgScore = countMatches(talangKeywords);
  const blkScore = countMatches(blokKeywords);

  if (bndScore >= 2 || (bndScore === 1 && t.includes("MERCU"))) {
    return { type: "BND", confidence: bndScore >= 3 ? "TINGGI" : "SEDANG", reason: `Ditemukan kata kunci bendung: ${bendungKeywords.filter(k => t.includes(k)).join(", ")}` };
  }
  if (dndScore >= 2 || (dndScore === 1 && t.includes("TALUD"))) {
    return { type: "DND", confidence: dndScore >= 2 ? "TINGGI" : "SEDANG", reason: `Ditemukan kata kunci dinding/talud: ${taludKeywords.filter(k => t.includes(k)).join(", ")}` };
  }
  if (slnScore >= 2 || (slnScore === 1 && t.includes("LINING"))) {
    return { type: "SLN", confidence: slnScore >= 2 ? "TINGGI" : "SEDANG", reason: `Ditemukan kata kunci saluran irigasi: ${saluranKeywords.filter(k => t.includes(k)).join(", ")}` };
  }
  if (tlgScore >= 1) {
    return { type: "TLG", confidence: "SEDANG", reason: `Ditemukan kata kunci talang/aqueduct: ${talangKeywords.filter(k => t.includes(k)).join(", ")}` };
  }
  if (blkScore >= 1) {
    return { type: "BLK", confidence: "SEDANG", reason: `Ditemukan kata kunci blok gravitasi: ${blokKeywords.filter(k => t.includes(k)).join(", ")}` };
  }

  // Default jika tidak ditemukan kata kunci khusus
  return { type: "BND", confidence: "RENDAH", reason: "Tipe default Bendung (kata kunci spesifik tidak terdeteksi jelas pada teks)" };
}

/**
 * Parser notasi elevasi lapangan (+El. mdpl) dari teks PDF
 */
export function parseElevations(text: string): ExtractedElevations {
  const elevs: ExtractedElevations = {};

  const cleanNum = (str: string) => {
    const s = str.replace(",", ".").replace(/[^\d.-]/g, "");
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : undefined;
  };

  // 1. Elevasi Mercu / Puncak
  const mercuMatch = text.match(/(?:EL(?:EV)?\.?|ELEVASI)?\s*(?:MERCU|CREST|PELIMPAH|TOP)\s*[:=]?\s*[\+]?\s*(\d{1,4}[.,]\d{1,3})/i)
    || text.match(/(?:MERCU|PELIMPAH)\s*[\+\=]?\s*(\d{1,4}[.,]\d{1,3})/i);
  if (mercuMatch?.[1]) elevs.elMercu = cleanNum(mercuMatch[1]);

  // 2. Elevasi Dasar Fondasi / Bed
  const baseMatch = text.match(/(?:EL(?:EV)?\.?|ELEVASI)?\s*(?:DASAR|FONDASI|FOUNDATION|BED|APRON)\s*[:=]?\s*[\+]?\s*(\d{1,4}[.,]\d{1,3})/i)
    || text.match(/(?:DASAR\s*FONDASI|ELEVASI\s*DASAR)\s*[\+\=]?\s*(\d{1,4}[.,]\d{1,3})/i);
  if (baseMatch?.[1]) elevs.elBase = cleanNum(baseMatch[1]);

  // 3. Elevasi Air Hulu (MAB / HWL / Normal)
  const upMatch = text.match(/(?:EL(?:EV)?\.?|ELEVASI)?\s*(?:MAB|HWL|BANJIR|AIR\s*HULU|HULU|MANG)\s*[:=]?\s*[\+]?\s*(\d{1,4}[.,]\d{1,3})/i)
    || text.match(/(?:MAB|HWL)\s*[\+\=]?\s*(\d{1,4}[.,]\d{1,3})/i);
  if (upMatch?.[1]) elevs.elWaterUp = cleanNum(upMatch[1]);

  // 4. Elevasi Air Hilir (TWL / MAN / Surut)
  const downMatch = text.match(/(?:EL(?:EV)?\.?|ELEVASI)?\s*(?:MAN|TWL|HILIR|AIR\s*HILIR|SURUT)\s*[:=]?\s*[\+]?\s*(\d{1,4}[.,]\d{1,3})/i)
    || text.match(/(?:MAN|TWL)\s*[\+\=]?\s*(\d{1,4}[.,]\d{1,3})/i);
  if (downMatch?.[1]) elevs.elWaterDown = cleanNum(downMatch[1]);

  // 5. Elevasi Tanah
  const soilMatch = text.match(/(?:EL(?:EV)?\.?|ELEVASI)?\s*(?:TANAH|GROUND|TMB|ASLI|TIMBUNAN)\s*[:=]?\s*[\+]?\s*(\d{1,4}[.,]\d{1,3})/i);
  if (soilMatch?.[1]) elevs.elSoil = cleanNum(soilMatch[1]);

  // Fallback pattern untuk angka elevasi dengan tanda plus: "+ 124.50"
  if (!elevs.elBase || !elevs.elMercu) {
    const genericElevs = [...text.matchAll(/\+\s*(\d{2,4}[.,]\d{2,3})/g)]
      .map((m) => cleanNum(m[1]!))
      .filter((n): n is number => n !== undefined);
    
    if (genericElevs.length >= 2) {
      const sorted = [...new Set(genericElevs)].sort((a, b) => a - b);
      if (!elevs.elBase && sorted[0]) elevs.elBase = sorted[0];
      if (!elevs.elMercu && sorted.length > 1) elevs.elMercu = sorted[Math.floor(sorted.length / 2)]!;
      if (!elevs.elWaterUp && sorted.length > 2) elevs.elWaterUp = sorted[sorted.length - 1]!;
    }
  }

  return elevs;
}

/**
 * Parser dimensi geometri linier dari teks PDF
 */
export function parseDimensions(text: string): ExtractedDimensions {
  const dims: ExtractedDimensions = {};

  const cleanNum = (str: string) => {
    const s = str.replace(",", ".").replace(/[^\d.-]/g, "");
    const n = parseFloat(s);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  // Lebar dasar B
  const bMatch = text.match(/(?:LEBAR\s*DASAR|LEBAR\s*FONDASI|BASE\s*WIDTH)\s*[:=]?\s*(\d+[.,]?\d*)/i)
    || text.match(/\bB\s*[:=]\s*(\d+[.,]?\d*)/);
  if (bMatch?.[1]) dims.B = cleanNum(bMatch[1]);

  // Tinggi H
  const hMatch = text.match(/(?:TINGGI(?:\s*TOTAL)?|HEIGHT)\s*[:=]?\s*(\d+[.,]?\d*)/i)
    || text.match(/\bH\s*[:=]\s*(\d+[.,]?\d*)/);
  if (hMatch?.[1]) dims.H = cleanNum(hMatch[1]);

  // Lebar atas / mercu b
  const bTopMatch = text.match(/(?:LEBAR\s*MERCU|LEBAR\s*ATAS|TOP\s*WIDTH)\s*[:=]?\s*(\d+[.,]?\d*)/i)
    || text.match(/\bb\s*[:=]\s*(\d+[.,]?\d*)/);
  if (bTopMatch?.[1]) dims.bTop = cleanNum(bTopMatch[1]);

  // Tebal lantai dasar / footing t
  const tMatch = text.match(/(?:TEBAL\s*LANTAI|TEBAL\s*FOOTING|TEBAL)\s*[:=]?\s*(\d+[.,]?\d*)/i)
    || text.match(/\bt\s*[:=]\s*(\d+[.,]?\d*)/);
  if (tMatch?.[1]) dims.tBase = cleanNum(tMatch[1]);

  // Kemiringan talud / slope hilir (misal 1:1 atau 1:0.8)
  const slopeMatch = text.match(/(?:KEMIRINGAN|SLOPE|TALUD)?\s*1\s*:\s*(\d+[.,]?\d*)/i);
  if (slopeMatch?.[1]) dims.slopeHilir = cleanNum(slopeMatch[1]);

  // Apron hulu dan hilir
  const apronUpMatch = text.match(/(?:APRON\s*HULU|LANTAI\s*HULU)\s*[:=]?\s*(\d+[.,]?\d*)/i);
  if (apronUpMatch?.[1]) dims.lApronUp = cleanNum(apronUpMatch[1]);

  const apronDownMatch = text.match(/(?:APRON\s*HILIR|KOLAM\s*OLAK|LANTAI\s*HILIR)\s*[:=]?\s*(\d+[.,]?\d*)/i);
  if (apronDownMatch?.[1]) dims.lApronDown = cleanNum(apronDownMatch[1]);

  // Cutoff hulu dan hilir
  const cutoffUpMatch = text.match(/(?:CUTOFF\s*HULU|KEDALAMAN\s*CUTOFF\s*HULU)\s*[:=]?\s*(\d+[.,]?\d*)/i);
  if (cutoffUpMatch?.[1]) dims.dCutoffUp = cleanNum(cutoffUpMatch[1]);

  const cutoffDownMatch = text.match(/(?:CUTOFF\s*HILIR|KEDALAMAN\s*CUTOFF\s*HILIR)\s*[:=]?\s*(\d+[.,]?\d*)/i);
  if (cutoffDownMatch?.[1]) dims.dCutoffDown = cleanNum(cutoffDownMatch[1]);

  return dims;
}

/**
 * Generator komponen geometri adaptif berdasarkan hasil ekstraksi teks PDF
 */
export function generateComponentsFromExtracted(
  type: TypeId,
  dims: ExtractedDimensions,
  calc: { hu: number; pMercu: number }
): { components: Component[]; resultingB: number } {
  const comps: Component[] = [];
  const B = dims.B && dims.B > 0 ? dims.B : type === "BND" ? 6.0 : type === "DND" ? 3.0 : 3.0;

  if (type === "BND") {
    const tBase = dims.tBase ?? 1.0;
    const bMercu = dims.bTop ?? 2.0;
    const hBody = dims.H && dims.H > tBase ? dims.H - tBase : calc.pMercu > tBase ? calc.pMercu - tBase : 2.0;
    const xMercu = Math.max(0.2 * B, 1.0);

    // 1. Lantai dasar
    comps.push({
      id: uid(),
      name: "Lantai dasar fondasi",
      shape: "PERSEGI",
      b1: B,
      b2: 0,
      h: tBase,
      x0: 0,
      z0: 0,
      material: "Beton bertulang",
    });

    // 2. Tubuh bendung lereng hilir
    const bTubuh = Math.min(B - xMercu, bMercu + (dims.slopeHilir ?? 1.0) * hBody);
    comps.push({
      id: uid(),
      name: "Badan bendung (lereng hilir)",
      shape: "TRAPESIUM_LERENG_HILIR",
      b1: bTubuh,
      b2: bMercu,
      h: hBody,
      x0: xMercu,
      z0: tBase,
      material: "Beton bertulang",
    });

    // 3. Mercu pelimpah
    comps.push({
      id: uid(),
      name: "Mercu bulat / ogee",
      shape: "PERSEGI",
      b1: bMercu,
      b2: 0,
      h: 0.5,
      x0: xMercu,
      z0: tBase + hBody,
      material: "Beton bertulang",
    });
  } else if (type === "DND") {
    const tFooting = dims.tBase ?? 0.6;
    const hStem = dims.H && dims.H > tFooting ? dims.H - tFooting : 3.5;
    const tStemBase = dims.bTop ? Math.max(dims.bTop, 0.5) : 0.6;
    const tStemTop = Math.max(tStemBase * 0.5, 0.3);
    const xStem = Math.max(0.3 * B, 0.8);

    comps.push({
      id: uid(),
      name: "Footing dasar dinding",
      shape: "PERSEGI",
      b1: B,
      b2: 0,
      h: tFooting,
      x0: 0,
      z0: 0,
      material: "Beton bertulang",
    });

    comps.push({
      id: uid(),
      name: "Stem dinding penahan",
      shape: "TRAPESIUM",
      b1: tStemBase,
      b2: tStemTop,
      h: hStem,
      x0: xStem,
      z0: tFooting,
      material: "Beton bertulang",
    });
  } else if (type === "SLN") {
    const tLining = dims.tBase ?? 0.2;
    const hSaluran = dims.H ?? 1.5;

    comps.push({
      id: uid(),
      name: "Lining dasar saluran",
      shape: "PERSEGI",
      b1: B,
      b2: 0,
      h: tLining,
      x0: 0,
      z0: 0,
      material: "Beton bertulang",
    });

    comps.push({
      id: uid(),
      name: "Dinding kiri saluran",
      shape: "PERSEGI",
      b1: tLining,
      b2: 0,
      h: hSaluran,
      x0: 0,
      z0: tLining,
      material: "Beton bertulang",
    });

    comps.push({
      id: uid(),
      name: "Dinding kanan saluran",
      shape: "PERSEGI",
      b1: tLining,
      b2: 0,
      h: hSaluran,
      x0: Math.max(B - tLining, 0),
      z0: tLining,
      material: "Beton bertulang",
    });
  } else {
    // Blok gravitasi generik
    comps.push({
      id: uid(),
      name: "Blok utama",
      shape: "PERSEGI",
      b1: B,
      b2: 0,
      h: dims.H ?? 2.0,
      x0: 0,
      z0: 0,
      material: "Beton bertulang",
    });
  }

  return { components: comps, resultingB: B };
}

/**
 * Main Pipeline: Menerima file PDF dan mengembalikan data variabel rekayasa siap pakai
 */
export async function processPdfFile(file: File): Promise<ExtractedPdfData> {
  const { text, pageCount } = await extractTextFromPdf(file);
  const { type: detectedType, confidence: typeConfidence, reason: typeReason } = classifyStructureType(text);
  const elevations = parseElevations(text);
  const dimensions = parseDimensions(text);

  // Perhitungan turunan elevasi
  const elBase = elevations.elBase ?? 100.0;
  const elMercu = elevations.elMercu ?? (elBase + (dimensions.H ?? 2.5));
  const elWaterUp = elevations.elWaterUp ?? (elMercu + 1.0);
  const elWaterDown = elevations.elWaterDown ?? (elBase + 0.8);
  const elSoil = elevations.elSoil ?? (elBase + 1.5);
  const elGroundDown = elevations.elGroundDown ?? (elBase + 1.0);

  const hu = Math.max(+(elWaterUp - elBase).toFixed(3), 0);
  const hd = Math.max(+(elWaterDown - elBase).toFixed(3), 0);
  const pMercu = Math.max(+(elMercu - elBase).toFixed(3), 0);
  const Hsoil = Math.max(+(elSoil - elBase).toFixed(3), 0);
  const Df = Math.max(+(elGroundDown - elBase).toFixed(3), 0);
  const deltaH = Math.max(+(hu - hd).toFixed(3), 0);

  const calculated = { hu, hd, pMercu, Hsoil, Df, deltaH };
  const { components: suggestedComponents } = generateComponentsFromExtracted(detectedType, dimensions, calculated);

  return {
    fileName: file.name,
    pageCount,
    rawText: text.slice(0, 1500),
    detectedType,
    typeConfidence,
    typeReason,
    elevations,
    dimensions,
    calculated,
    suggestedComponents,
  };
}
