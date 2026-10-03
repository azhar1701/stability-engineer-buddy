import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  processPdfFile,
  generateComponentsFromExtracted,
  type ExtractedPdfData,
  type ExtractedDimensions,
  type ExtractedElevations,
} from "@/lib/pdfExtractor";
import { TYPES, type TypeId } from "@/lib/engine/master";
import { fmt } from "@/components/kit";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApplyExtracted?: (data: ExtractedPdfData) => void;
  currentProjectType?: TypeId;
}

export function PdfViewerDrawer({
  isOpen,
  onClose,
  onApplyExtracted,
  currentProjectType,
}: Props) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [width, setWidth] = useState<number>(580); // default drawer width in px
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(580);

  // Tab state: "VIEWER" | "INSPECTOR"
  const [activeTab, setActiveTab] = useState<"VIEWER" | "INSPECTOR">("VIEWER");

  // Extraction State
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractStep, setExtractStep] = useState<string>("");
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedPdfData | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  // Editable local copies of extracted data for fine-tuning
  const [selectedType, setSelectedType] = useState<TypeId>("BND");
  const [elevations, setElevations] = useState<ExtractedElevations>({});
  const [dimensions, setDimensions] = useState<ExtractedDimensions>({});

  // Clean up object URL when component unmounts or file changes
  useEffect(() => {
    if (pdfFile) {
      const url = URL.createObjectURL(pdfFile);
      setPdfUrl(url);
      handleProcessFile(pdfFile);
      return () => URL.revokeObjectURL(url);
    } else {
      setPdfUrl(null);
      setExtractedData(null);
      setAppliedSuccess(false);
    }
  }, [pdfFile]);

  const handleProcessFile = async (file: File) => {
    setIsExtracting(true);
    setExtractError(null);
    setAppliedSuccess(false);
    try {
      setExtractStep("1/4 Membaca lapisan teks gambar kerja...");
      await new Promise((r) => setTimeout(r, 200));

      setExtractStep("2/4 Mengidentifikasi tipologi struktur bangunan air...");
      await new Promise((r) => setTimeout(r, 200));

      setExtractStep("3/4 Menganalisis notasi elevasi (+El.) & dimensi linier...");
      const result = await processPdfFile(file);

      setExtractStep("4/4 Menyusun komponen geometri adaptif...");
      await new Promise((r) => setTimeout(r, 250));

      setExtractedData(result);
      setSelectedType(result.detectedType);
      setElevations(result.elevations);
      setDimensions(result.dimensions);
      // Auto switch to inspector tab to show extracted data immediately
      setActiveTab("INSPECTOR");
    } catch (err: unknown) {
      console.error("Gagal mengekstrak PDF:", err);
      setExtractError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat memproses file PDF."
      );
    } finally {
      setIsExtracting(false);
      setExtractStep("");
    }
  };

  // Recalculate derived engineering depths whenever elevations change
  const elBase = elevations.elBase ?? 100.0;
  const elMercu = elevations.elMercu ?? (elBase + (dimensions.H ?? 2.5));
  const elWaterUp = elevations.elWaterUp ?? (elMercu + 1.0);
  const elWaterDown = elevations.elWaterDown ?? (elBase + 0.8);
  const elSoil = elevations.elSoil ?? (elBase + 1.5);
  const elGroundDown = elevations.elGroundDown ?? (elBase + 1.0);

  const calcHu = Math.max(+(elWaterUp - elBase).toFixed(3), 0);
  const calcHd = Math.max(+(elWaterDown - elBase).toFixed(3), 0);
  const calcPmercu = Math.max(+(elMercu - elBase).toFixed(3), 0);
  const calcHsoil = Math.max(+(elSoil - elBase).toFixed(3), 0);
  const calcDf = Math.max(+(elGroundDown - elBase).toFixed(3), 0);
  const calcDeltaH = Math.max(+(calcHu - calcHd).toFixed(3), 0);

  // Dynamic preview of components based on active type & dimensions
  const liveComponents = generateComponentsFromExtracted(
    selectedType,
    dimensions,
    {
      hu: calcHu,
      hd: calcHd,
      pMercu: calcPmercu,
      Hsoil: calcHsoil,
      Df: calcDf,
      deltaH: calcDeltaH,
    }
  ).components;

  const handleApplyToProject = () => {
    if (!extractedData) return;

    const finalData: ExtractedPdfData = {
      ...extractedData,
      detectedType: selectedType,
      elevations,
      dimensions,
      calculated: {
        hu: calcHu,
        hd: calcHd,
        pMercu: calcPmercu,
        Hsoil: calcHsoil,
        Df: calcDf,
        deltaH: calcDeltaH,
      },
      suggestedComponents: liveComponents,
    };

    if (onApplyExtracted) {
      onApplyExtracted(finalData);
      setAppliedSuccess(true);
      setTimeout(() => setAppliedSuccess(false), 3000);
    }
  };

  // Handle drag to resize drawer
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = startXRef.current - e.clientX;
      const newWidth = Math.min(
        Math.max(startWidthRef.current + deltaX, 420),
        window.innerWidth - 300
      );
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleStartResize = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  if (!isOpen) return null;

  const detectedTypeMeta = TYPES.find((t) => t.id === selectedType);

  return (
    <aside
      className={cn(
        "no-print fixed top-0 right-0 z-40 flex h-screen flex-col border-l border-border bg-card shadow-2xl transition-transform duration-200 ease-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
      style={{ width: `${width}px` }}
    >
      {/* Resizer Handle on Left Edge */}
      <div
        onMouseDown={handleStartResize}
        className="absolute -left-1.5 top-0 bottom-0 w-3 cursor-col-resize hover:bg-primary/40 transition-colors z-50 group flex items-center justify-center"
        title="Geser untuk mengatur lebar panel PDF & Inspektur Variabel"
      >
        <div className="h-8 w-1 rounded-full bg-border group-hover:bg-primary transition-colors" />
      </div>

      {/* Drawer Header */}
      <div className="flex flex-col border-b border-border bg-muted/40">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/15 text-xs font-bold text-primary">
              PDF
            </span>
            <div className="truncate">
              <h3 className="text-xs font-bold text-foreground truncate">
                {pdfFile ? pdfFile.name : "Gambar Rencana Kerja DED Bangunan Air"}
              </h3>
              <p className="text-[10px] text-muted-foreground">
                {pdfFile
                  ? `${(pdfFile.size / 1024 / 1024).toFixed(2)} MB · Ekstraksi Variabel Cerdas`
                  : "Input data sekunder otomatis dari lembar gambar kerja"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="cursor-pointer rounded border border-input bg-card px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted transition-colors shadow-2xs">
              {pdfFile ? "Ganti PDF" : "Pilih PDF"}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) setPdfFile(e.target.files[0]);
                }}
              />
            </label>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm font-semibold"
              title="Tutup Panel PDF"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Selector & Extraction Indicator */}
        {pdfFile && (
          <div className="flex items-center justify-between border-t border-border px-4 py-1.5 bg-card/60 text-xs">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("VIEWER")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-all text-[11px] flex items-center gap-1.5",
                  activeTab === "VIEWER"
                    ? "bg-primary/10 text-primary font-bold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <span>🖼️</span>
                <span>Gambar PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("INSPECTOR")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-all text-[11px] flex items-center gap-1.5 relative",
                  activeTab === "INSPECTOR"
                    ? "bg-primary/10 text-primary font-bold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <span>⚡</span>
                <span>Variabel Terekstrak</span>
                {extractedData && (
                  <span className="flex h-4 items-center justify-center rounded-full bg-primary px-1.5 text-[9px] font-bold text-primary-foreground">
                    {selectedType}
                  </span>
                )}
              </button>
            </div>

            {/* Quick Extraction Trigger / Status */}
            <div>
              {isExtracting ? (
                <div className="flex items-center gap-1.5 text-[10px] text-primary font-medium">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="truncate max-w-[140px]">{extractStep}</span>
                </div>
              ) : extractedData ? (
                <button
                  type="button"
                  onClick={() => handleProcessFile(pdfFile)}
                  className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                  title="Ekstrak ulang dokumen"
                >
                  <span>🔄</span>
                  <span>Ekstrak Ulang</span>
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Progress banner during active extraction */}
      {isExtracting && (
        <div className="border-b border-primary/20 bg-primary/10 px-4 py-2 text-xs text-primary flex items-center gap-2 animate-pulse">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <span className="font-semibold">{extractStep}</span>
        </div>
      )}

      {/* Error Banner */}
      {extractError && (
        <div className="border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive flex items-center justify-between">
          <span>⚠️ {extractError}</span>
          <button
            type="button"
            onClick={() => setExtractError(null)}
            className="text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto bg-muted/10 relative">
        {!pdfUrl ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl text-primary mb-3 shadow-inner">
              📑
            </div>
            <h4 className="text-sm font-bold text-foreground">
              Input Variabel Dimensi Sekunder dari PDF
            </h4>
            <p className="mt-1.5 max-w-sm text-xs text-muted-foreground leading-relaxed">
              Unggah gambar rencana kerja DED (potongan melintang atau tampak bangunan air).
              Sistem akan membaca notasi elevasi (+El.), mengklasifikasi tipe struktur, dan
              menyelaraskan geometri fondasi secara adaptif.
            </p>

            <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all">
              <span>📂 Pilih File PDF Gambar Kerja</span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) setPdfFile(e.target.files[0]);
                }}
              />
            </label>

            <div className="mt-8 grid grid-cols-2 gap-2 text-left max-w-sm w-full">
              <div className="rounded-lg border border-border bg-card p-3 shadow-2xs">
                <div className="text-xs font-bold text-foreground">🔍 Deteksi Tipe Adaptif</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Mengenali Bendung Tetap, Saluran, Talud DPT, Talang, atau Blok Gravitasi.
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-3 shadow-2xs">
                <div className="text-xs font-bold text-foreground">📐 Notasi +El. mdpl</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Menghitung tinggi muka air (hu, hd) dan tinggi mercu relatif terhadap datum dasar.
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-md border border-dashed border-border bg-card/60 p-3 text-[11px] text-muted-foreground max-w-sm text-left">
              <strong className="text-foreground">🔒 Privasi Terjamin:</strong> Seluruh proses
              ekstraksi PDF dilakukan 100% di browser lokal Anda tanpa diunggah ke cloud/server
              eksternal mana pun.
            </div>
          </div>
        ) : activeTab === "VIEWER" ? (
          <div className="h-full w-full relative">
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=0`}
              title="Gambar Rencana PDF"
              className="h-full w-full border-none"
            />
            {/* Floating Action Badge to switch to extracted variables */}
            {extractedData && (
              <button
                type="button"
                onClick={() => setActiveTab("INSPECTOR")}
                className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-lg hover:bg-primary/90 transition-transform active:scale-95"
              >
                <span>⚡ Lihat Variabel Terekstrak</span>
                <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px]">
                  {selectedType}
                </span>
              </button>
            )}
          </div>
        ) : (
          /* INSPECTOR TAB: Extracted Variables Inspector & Sync Panel */
          <div className="p-4 space-y-4 pb-20">
            {/* Header Result Card */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                    ✓
                  </span>
                  <div>
                    <div className="text-xs font-bold text-foreground">
                      Hasil Ekstraksi Dokumen
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      File: {extractedData?.fileName} ({extractedData?.pageCount} halaman)
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                      extractedData?.typeConfidence === "TINGGI"
                        ? "bg-success/15 text-success"
                        : extractedData?.typeConfidence === "SEDANG"
                        ? "bg-warning/15 text-warning"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    Akurasi {extractedData?.typeConfidence ?? "SEDANG"}
                  </span>
                </div>
              </div>

              {/* Adaptive Structure Classification Selector */}
              <div className="mt-3 rounded-lg border border-border bg-card p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-foreground">
                    Klasifikasi Tipologi Struktur
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    {extractedData?.typeReason}
                  </span>
                </div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as TypeId)}
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-semibold text-foreground outline-none focus:border-primary"
                >
                  {TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id} — {t.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {detectedTypeMeta?.note}
                </p>
              </div>
            </div>

            {/* Section 1: Notasi Elevasi (+El. mdpl) */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">📐</span>
                  <h4 className="text-xs font-bold text-foreground">
                    Notasi Elevasi Gambar (+El. mdpl)
                  </h4>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Bisa disesuaikan manual
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground">
                    +El. Dasar Fondasi (Datum)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="num mt-1 h-8 w-full rounded border border-input bg-muted/20 px-2 text-xs font-semibold"
                    value={elevations.elBase ?? ""}
                    placeholder="100.00"
                    onChange={(e) =>
                      setElevations((prev) => ({
                        ...prev,
                        elBase: parseFloat(e.target.value) || undefined,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground">
                    +El. Mercu Pelimpah
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="num mt-1 h-8 w-full rounded border border-input bg-muted/20 px-2 text-xs font-semibold"
                    value={elevations.elMercu ?? ""}
                    placeholder="102.50"
                    onChange={(e) =>
                      setElevations((prev) => ({
                        ...prev,
                        elMercu: parseFloat(e.target.value) || undefined,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground">
                    +El. Muka Air Hulu (HWL)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="num mt-1 h-8 w-full rounded border border-input bg-muted/20 px-2 text-xs font-semibold"
                    value={elevations.elWaterUp ?? ""}
                    placeholder="103.50"
                    onChange={(e) =>
                      setElevations((prev) => ({
                        ...prev,
                        elWaterUp: parseFloat(e.target.value) || undefined,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground">
                    +El. Muka Air Hilir (TWL)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="num mt-1 h-8 w-full rounded border border-input bg-muted/20 px-2 text-xs font-semibold"
                    value={elevations.elWaterDown ?? ""}
                    placeholder="100.80"
                    onChange={(e) =>
                      setElevations((prev) => ({
                        ...prev,
                        elWaterDown: parseFloat(e.target.value) || undefined,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground">
                    +El. Muka Tanah Hulu
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="num mt-1 h-8 w-full rounded border border-input bg-muted/20 px-2 text-xs font-semibold"
                    value={elevations.elSoil ?? ""}
                    placeholder="101.50"
                    onChange={(e) =>
                      setElevations((prev) => ({
                        ...prev,
                        elSoil: parseFloat(e.target.value) || undefined,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground">
                    +El. Muka Tanah Hilir
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="num mt-1 h-8 w-full rounded border border-input bg-muted/20 px-2 text-xs font-semibold"
                    value={elevations.elGroundDown ?? ""}
                    placeholder="101.00"
                    onChange={(e) =>
                      setElevations((prev) => ({
                        ...prev,
                        elGroundDown: parseFloat(e.target.value) || undefined,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Derived Engineering Depths Chips */}
              <div className="mt-3.5 rounded-lg bg-muted/40 p-2.5">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Hasil Konversi Kedalaman Rekayasa
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded border border-border bg-card p-1.5">
                    <span className="text-[10px] text-muted-foreground block">Kedalaman hu</span>
                    <span className="num font-bold text-primary">{fmt(calcHu)} m</span>
                  </div>
                  <div className="rounded border border-border bg-card p-1.5">
                    <span className="text-[10px] text-muted-foreground block">Kedalaman hd</span>
                    <span className="num font-bold text-primary">{fmt(calcHd)} m</span>
                  </div>
                  <div className="rounded border border-border bg-card p-1.5">
                    <span className="text-[10px] text-muted-foreground block">Tinggi Mercu p</span>
                    <span className="num font-bold text-primary">{fmt(calcPmercu)} m</span>
                  </div>
                  <div className="rounded border border-border bg-card p-1.5">
                    <span className="text-[10px] text-muted-foreground block">Fondasi Df</span>
                    <span className="num font-bold text-primary">{fmt(calcDf)} m</span>
                  </div>
                  <div className="rounded border border-border bg-card p-1.5">
                    <span className="text-[10px] text-muted-foreground block">Tinggi Tanah Hsoil</span>
                    <span className="num font-bold text-primary">{fmt(calcHsoil)} m</span>
                  </div>
                  <div className="rounded border border-border bg-card p-1.5">
                    <span className="text-[10px] text-muted-foreground block">Beda Tinggi Δh</span>
                    <span className="num font-bold text-primary">{fmt(calcDeltaH)} m</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Dimensi Linier Bangunan */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">📏</span>
                  <h4 className="text-xs font-bold text-foreground">
                    Dimensi Geometri Utama
                  </h4>
                </div>
                <span className="text-[10px] text-muted-foreground">Parameter penampang</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground">
                    Lebar Dasar Fondasi B (m)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    className="num mt-1 h-8 w-full rounded border border-input bg-muted/20 px-2 text-xs font-semibold"
                    value={dimensions.B ?? ""}
                    placeholder="6.00"
                    onChange={(e) =>
                      setDimensions((prev) => ({
                        ...prev,
                        B: parseFloat(e.target.value) || undefined,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground">
                    Tinggi Total Bangunan H (m)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    className="num mt-1 h-8 w-full rounded border border-input bg-muted/20 px-2 text-xs font-semibold"
                    value={dimensions.H ?? ""}
                    placeholder="3.00"
                    onChange={(e) =>
                      setDimensions((prev) => ({
                        ...prev,
                        H: parseFloat(e.target.value) || undefined,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground">
                    Lebar Mercu / Puncak b_top (m)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    className="num mt-1 h-8 w-full rounded border border-input bg-muted/20 px-2 text-xs font-semibold"
                    value={dimensions.bTop ?? ""}
                    placeholder="2.00"
                    onChange={(e) =>
                      setDimensions((prev) => ({
                        ...prev,
                        bTop: parseFloat(e.target.value) || undefined,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground">
                    Tebal Lantai Dasar t_base (m)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    className="num mt-1 h-8 w-full rounded border border-input bg-muted/20 px-2 text-xs font-semibold"
                    value={dimensions.tBase ?? ""}
                    placeholder="1.00"
                    onChange={(e) =>
                      setDimensions((prev) => ({
                        ...prev,
                        tBase: parseFloat(e.target.value) || undefined,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Rembesan & Apron Parameters */}
              <div className="mt-3 pt-3 border-t border-dashed border-border">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Komponen Rembesan & Apron (Opsi)
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Panjang Apron Hulu Lu (m)</span>
                    <input
                      type="number"
                      step="0.1"
                      className="num mt-1 h-7 w-full rounded border border-input bg-muted/20 px-2 text-xs"
                      value={dimensions.lApronUp ?? ""}
                      placeholder="0.0"
                      onChange={(e) =>
                        setDimensions((prev) => ({
                          ...prev,
                          lApronUp: parseFloat(e.target.value) || undefined,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Panjang Apron Hilir Ld (m)</span>
                    <input
                      type="number"
                      step="0.1"
                      className="num mt-1 h-7 w-full rounded border border-input bg-muted/20 px-2 text-xs"
                      value={dimensions.lApronDown ?? ""}
                      placeholder="0.0"
                      onChange={(e) =>
                        setDimensions((prev) => ({
                          ...prev,
                          lApronDown: parseFloat(e.target.value) || undefined,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Komponen Geometri Terbentuk */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🧱</span>
                  <h4 className="text-xs font-bold text-foreground">
                    Komponen Geometri Terbentuk ({liveComponents.length})
                  </h4>
                </div>
                <span className="text-[10px] text-muted-foreground">Disusun otomatis</span>
              </div>

              <div className="mt-3 space-y-2">
                {liveComponents.map((c, idx) => (
                  <div
                    key={c.id || idx}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-foreground">{c.name}</span>
                      <div className="text-[10px] text-muted-foreground">
                        {c.shape} · b1: {fmt(c.b1)}m · h: {fmt(c.h)}m (x: {fmt(c.x0)}, z: {fmt(c.z0)})
                      </div>
                    </div>
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      {c.material}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sync Action Button */}
            <div className="sticky bottom-0 bg-card/95 backdrop-blur-xs pt-3 pb-1 border-t border-border -mx-4 px-4 shadow-lg">
              <button
                type="button"
                onClick={handleApplyToProject}
                className={cn(
                  "w-full rounded-xl py-3 text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2",
                  appliedSuccess
                    ? "bg-success text-success-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]"
                )}
              >
                <span>{appliedSuccess ? "✓" : "⚡"}</span>
                <span>
                  {appliedSuccess
                    ? "Berhasil Disinkronkan ke Seluruh Modul Proyek!"
                    : "Terapkan & Sinkronkan ke Proyek"}
                </span>
              </button>
              <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
                Memperbarui tipe struktur, lebar dasar B, muka air hu/hd, elevasi, dan komponen geometri.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Drawer Footer Tips */}
      {pdfUrl && (
        <div className="border-t border-border bg-card px-4 py-2 text-[10px] text-muted-foreground flex items-center justify-between">
          <span>💡 Tips: Geser tepi kiri panel untuk memperlebar tampilan</span>
          <button
            type="button"
            onClick={() => {
              setPdfFile(null);
              setExtractedData(null);
            }}
            className="text-destructive hover:underline text-[10px]"
          >
            Tutup File
          </button>
        </div>
      )}
    </aside>
  );
}
