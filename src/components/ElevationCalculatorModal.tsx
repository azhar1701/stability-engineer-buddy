import React, { useState, useEffect } from "react";
import { fmt } from "@/components/kit";
import type { Project } from "@/lib/engine/types";
import type { ExtractedElevations } from "@/lib/pdfExtractor";

interface Props {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onApply: (calculated: {
    hu: number;
    hd: number;
    pMercu: number;
    Hsoil: number;
    Df: number;
  }) => void;
  /** Optional: pre-fill inputs with elevations parsed from PDF */
  extractedElevations?: ExtractedElevations;
}

export function ElevationCalculatorModal({ project, isOpen, onClose, onApply, extractedElevations }: Props) {
  // Elevasi acuan dasar fondasi (datum z = 0)
  const [elBase, setElBase] = useState<number>(extractedElevations?.elBase ?? 100.0);
  // Elevasi-elevasi yang dibaca dari gambar PDF DED
  const [elMercu, setElMercu] = useState<number>(extractedElevations?.elMercu ?? 102.5);
  const [elWaterUp, setElWaterUp] = useState<number>(extractedElevations?.elWaterUp ?? 103.5);
  const [elWaterDown, setElWaterDown] = useState<number>(extractedElevations?.elWaterDown ?? 100.8);
  const [elSoil, setElSoil] = useState<number>(extractedElevations?.elSoil ?? 101.5);
  const [elGroundDown, setElGroundDown] = useState<number>(extractedElevations?.elGroundDown ?? 101.0);

  // Sync when a new PDF extraction is applied while modal may be open
  useEffect(() => {
    if (!extractedElevations) return;
    if (extractedElevations.elBase != null) setElBase(extractedElevations.elBase);
    if (extractedElevations.elMercu != null) setElMercu(extractedElevations.elMercu);
    if (extractedElevations.elWaterUp != null) setElWaterUp(extractedElevations.elWaterUp);
    if (extractedElevations.elWaterDown != null) setElWaterDown(extractedElevations.elWaterDown);
    if (extractedElevations.elSoil != null) setElSoil(extractedElevations.elSoil);
    if (extractedElevations.elGroundDown != null) setElGroundDown(extractedElevations.elGroundDown);
  }, [extractedElevations]);

  if (!isOpen) return null;

  // Selisih tinggi relatif terhadap datum dasar fondasi
  const calcHu = Math.max(+(elWaterUp - elBase).toFixed(3), 0);
  const calcHd = Math.max(+(elWaterDown - elBase).toFixed(3), 0);
  const calcPmercu = Math.max(+(elMercu - elBase).toFixed(3), 0);
  const calcHsoil = Math.max(+(elSoil - elBase).toFixed(3), 0);
  const calcDf = Math.max(+(elGroundDown - elBase).toFixed(3), 0);
  const calcDeltaH = Math.max(+(calcHu - calcHd).toFixed(3), 0);

  const handleApply = () => {
    onApply({
      hu: calcHu,
      hd: calcHd,
      pMercu: calcPmercu,
      Hsoil: calcHsoil,
      Df: calcDf,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-base">
              📐
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Kalkulator Notasi Elevasi Lapangan (+El. mdpl)
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Salin angka elevasi langsung dari notasi gambar kerja PDF DED bangunan air
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground text-sm"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Datum Dasar Fondasi */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <label className="block text-xs font-bold text-primary">
              Elevasi Datum Dasar Fondasi (z = 0,00 m)
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                value={elBase}
                onChange={(e) => setElBase(parseFloat(e.target.value) || 0)}
                className="num h-9 w-full rounded-md border border-input bg-card px-3 text-sm font-bold text-foreground outline-none focus:border-primary"
              />
              <span className="text-xs font-semibold text-muted-foreground shrink-0">+El. mdpl</span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Semua kedalaman teknis dihitung relatif terhadap elevasi dasar fondasi ini.
            </p>
          </div>

          {/* Grid Elevasi Input dari Gambar PDF */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground">
                +El. Mercu Pelimpah
              </label>
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.01"
                  value={elMercu}
                  onChange={(e) => setElMercu(parseFloat(e.target.value) || 0)}
                  className="num h-8 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground"
                />
                <span className="text-[10px] text-muted-foreground">mdpl</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground">
                +El. Muka Air Hulu (Banjir/Normal)
              </label>
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.01"
                  value={elWaterUp}
                  onChange={(e) => setElWaterUp(parseFloat(e.target.value) || 0)}
                  className="num h-8 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground"
                />
                <span className="text-[10px] text-muted-foreground">mdpl</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground">
                +El. Muka Air Hilir (Tailwater)
              </label>
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.01"
                  value={elWaterDown}
                  onChange={(e) => setElWaterDown(parseFloat(e.target.value) || 0)}
                  className="num h-8 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground"
                />
                <span className="text-[10px] text-muted-foreground">mdpl</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground">
                +El. Permukaan Tanah Tertahan
              </label>
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.01"
                  value={elSoil}
                  onChange={(e) => setElSoil(parseFloat(e.target.value) || 0)}
                  className="num h-8 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground"
                />
                <span className="text-[10px] text-muted-foreground">mdpl</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground">
                +El. Permukaan Tanah Hilir (untuk Df)
              </label>
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.01"
                  value={elGroundDown}
                  onChange={(e) => setElGroundDown(parseFloat(e.target.value) || 0)}
                  className="num h-8 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground"
                />
                <span className="text-[10px] text-muted-foreground">mdpl</span>
              </div>
            </div>
          </div>

          {/* Hasil Konversi Otomatis */}
          <div className="rounded-lg border border-border bg-muted/30 p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Hasil Konversi Otomatis ke Parameter Aplikasi
            </span>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded bg-card p-2 border border-border">
                <span className="text-[10px] text-muted-foreground">hu (air hulu)</span>
                <div className="num font-bold text-primary">{fmt(calcHu, 2)} m</div>
              </div>
              <div className="rounded bg-card p-2 border border-border">
                <span className="text-[10px] text-muted-foreground">hd (air hilir)</span>
                <div className="num font-bold text-foreground">{fmt(calcHd, 2)} m</div>
              </div>
              <div className="rounded bg-card p-2 border border-border">
                <span className="text-[10px] text-muted-foreground">Tinggi Mercu (p)</span>
                <div className="num font-bold text-foreground">{fmt(calcPmercu, 2)} m</div>
              </div>
              <div className="rounded bg-card p-2 border border-border">
                <span className="text-[10px] text-muted-foreground">H tanah tertahan</span>
                <div className="num font-bold text-foreground">{fmt(calcHsoil, 2)} m</div>
              </div>
              <div className="rounded bg-card p-2 border border-border">
                <span className="text-[10px] text-muted-foreground">Kedalaman Df</span>
                <div className="num font-bold text-foreground">{fmt(calcDf, 2)} m</div>
              </div>
              <div className="rounded bg-card p-2 border border-border">
                <span className="text-[10px] text-muted-foreground">Beda Tinggi ΔH</span>
                <div className="num font-bold text-primary">{fmt(calcDeltaH, 2)} m</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-end gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-input bg-card px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="rounded-md bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all"
          >
            Terapkan ke Proyek Ini ✓
          </button>
        </div>
      </div>
    </div>
  );
}
