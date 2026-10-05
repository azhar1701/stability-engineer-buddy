import React, { useState, useEffect } from "react";
import { uid } from "@/lib/engine/defaults";
import type { Component, Project } from "@/lib/engine/types";
import { MATERIALS } from "@/lib/engine/master";
import type { ExtractedDimensions } from "@/lib/pdfExtractor";

interface Props {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onApply: (newComponents: Component[], newB?: number) => void;
  /** Optional: pre-fill with values extracted from PDF */
  extractedDimensions?: ExtractedDimensions;
}

type TemplateType = "BENDUNG_KP02" | "DINDING_TALUD" | "SALURAN_LINING";

export function ParametricProfileModal({ project, isOpen, onClose, onApply, extractedDimensions }: Props) {
  const [template, setTemplate] = useState<TemplateType>(
    project.type === "DND" ? "DINDING_TALUD" : project.type === "SLN" ? "SALURAN_LINING" : "BENDUNG_KP02"
  );

  // Parameter Template 1: Bendung KP-02
  const [bBendung, setBBendung] = useState<number>(extractedDimensions?.B ?? (project.B > 0 ? project.B : 6.0));
  const [tLantaiBendung, setTLantaiBendung] = useState<number>(extractedDimensions?.tBase ?? 1.0);
  const [bMercuBendung, setBMercuBendung] = useState<number>(extractedDimensions?.bTop ?? 2.0);
  const [hTubuhBendung, setHTubuhBendung] = useState<number>(
    extractedDimensions?.H ? Math.max(extractedDimensions.H - (extractedDimensions.tBase ?? 1.0), 1.0) : 2.0
  );
  const [xMercuBendung, setXMercuBendung] = useState<number>(1.5);
  const [matBendung, setMatBendung] = useState<string>("Beton bertulang");

  // Parameter Template 2: Dinding Talud / Kantilever
  const [bFooting, setBFooting] = useState<number>(extractedDimensions?.B ?? (project.B > 0 ? project.B : 3.0));
  const [tFooting, setTFooting] = useState<number>(extractedDimensions?.tBase ?? 0.6);
  const [hStem, setHStem] = useState<number>(
    extractedDimensions?.H ? Math.max(extractedDimensions.H - (extractedDimensions.tBase ?? 0.6), 1.0) : 3.5
  );
  const [tStemTop, setTStemTop] = useState<number>(extractedDimensions?.bTop ? Math.max(extractedDimensions.bTop * 0.5, 0.3) : 0.3);
  const [tStemBase, setTStemBase] = useState<number>(extractedDimensions?.bTop ?? 0.6);
  const [xStemPos, setXStemPos] = useState<number>(1.0);
  const [matDinding, setMatDinding] = useState<string>("Beton bertulang");

  // Parameter Template 3: Saluran Lining
  const [bSaluran, setBSaluran] = useState<number>(extractedDimensions?.B ?? (project.B > 0 ? project.B : 3.0));
  const [tDasarSaluran, setTDasarSaluran] = useState<number>(extractedDimensions?.tBase ?? 0.2);
  const [hDindingSaluran, setHDindingSaluran] = useState<number>(extractedDimensions?.H ?? 1.5);
  const [tDindingSaluran, setTDindingSaluran] = useState<number>(extractedDimensions?.bTop ?? 0.2);
  const [matSaluran, setMatSaluran] = useState<string>("Beton bertulang");

  // Sync values when extractedDimensions prop updates (e.g., new PDF applied)
  useEffect(() => {
    if (!extractedDimensions) return;
    const { B, tBase, bTop, H } = extractedDimensions;
    if (B && B > 0) { setBBendung(B); setBFooting(B); setBSaluran(B); }
    if (tBase && tBase > 0) {
      setTLantaiBendung(tBase);
      setTFooting(tBase);
      setTDasarSaluran(tBase);
    }
    if (bTop && bTop > 0) {
      setBMercuBendung(bTop);
      setTStemBase(bTop);
      setTStemTop(Math.max(bTop * 0.5, 0.3));
      setTDindingSaluran(bTop);
    }
    if (H && H > 0) {
      setHTubuhBendung(Math.max(H - (tBase ?? 1.0), 1.0));
      setHStem(Math.max(H - (tBase ?? 0.6), 1.0));
      setHDindingSaluran(H);
    }
  }, [extractedDimensions]);

  if (!isOpen) return null;

  const handleApply = () => {
    let comps: Component[] = [];
    let resultingB = project.B;

    if (template === "BENDUNG_KP02") {
      resultingB = bBendung;
      // 1. Lantai dasar fondasi (apron dasar)
      comps.push({
        id: uid(),
        name: "Lantai dasar fondasi",
        shape: "PERSEGI",
        b1: bBendung,
        b2: 0,
        h: tLantaiBendung,
        x0: 0,
        z0: 0,
        material: matBendung,
      });

      // 2. Badan bendung utama (trapesium lereng hilir: tegak hulu, miring hilir)
      const bDasarTubuh = Math.min(bBendung - xMercuBendung, bMercuBendung + 1.5 * hTubuhBendung);
      comps.push({
        id: uid(),
        name: "Badan bendung (lereng hilir)",
        shape: "TRAPESIUM_LERENG_HILIR",
        b1: bDasarTubuh,
        b2: bMercuBendung,
        h: hTubuhBendung,
        x0: xMercuBendung,
        z0: tLantaiBendung,
        material: matBendung,
      });

      // 3. Mercu / Ogee crest block
      comps.push({
        id: uid(),
        name: "Mercu bulat / ogee",
        shape: "PERSEGI",
        b1: bMercuBendung,
        b2: 0,
        h: 0.5,
        x0: xMercuBendung,
        z0: tLantaiBendung + hTubuhBendung,
        material: matBendung,
      });
    } else if (template === "DINDING_TALUD") {
      resultingB = bFooting;
      // 1. Footing pelat dasar
      comps.push({
        id: uid(),
        name: "Footing dasar dinding",
        shape: "PERSEGI",
        b1: bFooting,
        b2: 0,
        h: tFooting,
        x0: 0,
        z0: 0,
        material: matDinding,
      });

      // 2. Stem dinding penahan (trapesium lereng luar atau tegak)
      comps.push({
        id: uid(),
        name: "Stem dinding penahan",
        shape: "TRAPESIUM",
        b1: tStemBase,
        b2: tStemTop,
        h: hStem,
        x0: xStemPos,
        z0: tFooting,
        material: matDinding,
      });
    } else if (template === "SALURAN_LINING") {
      resultingB = bSaluran;
      // 1. Pelat dasar saluran
      comps.push({
        id: uid(),
        name: "Lining dasar saluran",
        shape: "PERSEGI",
        b1: bSaluran,
        b2: 0,
        h: tDasarSaluran,
        x0: 0,
        z0: 0,
        material: matSaluran,
      });

      // 2. Dinding kiri saluran
      comps.push({
        id: uid(),
        name: "Dinding kiri saluran",
        shape: "PERSEGI",
        b1: tDindingSaluran,
        b2: 0,
        h: hDindingSaluran,
        x0: 0,
        z0: tDasarSaluran,
        material: matSaluran,
      });

      // 3. Dinding kanan saluran
      comps.push({
        id: uid(),
        name: "Dinding kanan saluran",
        shape: "PERSEGI",
        b1: tDindingSaluran,
        b2: 0,
        h: hDindingSaluran,
        x0: Math.max(bSaluran - tDindingSaluran, 0),
        z0: tDasarSaluran,
        material: matSaluran,
      });
    }

    onApply(comps, resultingB);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-base">
              ✨
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Generator Penampang Otomatis dari Gambar PDF
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Pilih profil standar dan masukkan 4-5 dimensi kunci yang terbaca dari gambar rencana
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

        {/* Template Selector Tabs */}
        <div className="mt-4 flex rounded-lg border border-input bg-muted/40 p-1 text-xs">
          <button
            type="button"
            onClick={() => setTemplate("BENDUNG_KP02")}
            className={`flex-1 rounded-md py-1.5 font-medium transition-all ${
              template === "BENDUNG_KP02"
                ? "bg-card text-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Bendung On-Stream (KP-02)
          </button>
          <button
            type="button"
            onClick={() => setTemplate("DINDING_TALUD")}
            className={`flex-1 rounded-md py-1.5 font-medium transition-all ${
              template === "DINDING_TALUD"
                ? "bg-card text-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Dinding Penahan / Talud
          </button>
          <button
            type="button"
            onClick={() => setTemplate("SALURAN_LINING")}
            className={`flex-1 rounded-md py-1.5 font-medium transition-all ${
              template === "SALURAN_LINING"
                ? "bg-card text-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Saluran Terbuka
          </button>
        </div>

        {/* Template Form Inputs */}
        <div className="mt-4 space-y-4">
          {template === "BENDUNG_KP02" && (
            <div className="space-y-3">
              <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5 text-xs text-muted-foreground">
                <strong className="text-foreground">Profil Bendung Tetap Standar KP-02:</strong> Menghasilkan 3 komponen otomatis: Pelat Lantai Dasar, Tubuh Bendung (Lereng Hilir), dan Mercu Atas.
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    Lebar Fondasi Total B (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={bBendung}
                    onChange={(e) => setBBendung(parseFloat(e.target.value) || 0)}
                    className="num h-8 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground mt-1"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    Tebal Lantai Dasar tf (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={tLantaiBendung}
                    onChange={(e) => setTLantaiBendung(parseFloat(e.target.value) || 0)}
                    className="num h-8 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground mt-1"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    Lebar Mercu Atas b_mercu (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={bMercuBendung}
                    onChange={(e) => setBMercuBendung(parseFloat(e.target.value) || 0)}
                    className="num h-8 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground mt-1"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    Tinggi Tubuh Bendung H (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={hTubuhBendung}
                    onChange={(e) => setHTubuhBendung(parseFloat(e.target.value) || 0)}
                    className="num h-8 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground mt-1"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    Posisi Awal Tubuh dari Heel X0 (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={xMercuBendung}
                    onChange={(e) => setXMercuBendung(parseFloat(e.target.value) || 0)}
                    className="num h-8 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground mt-1"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    Material Konstruksi
                  </label>
                  <select
                    value={matBendung}
                    onChange={(e) => setMatBendung(e.target.value)}
                    className="h-8 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground mt-1"
                  >
                    {MATERIALS.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name} ({m.gamma} kN/m³)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {template === "DINDING_TALUD" && (
            <div className="space-y-3">
              <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5 text-xs text-muted-foreground">
                <strong className="text-foreground">Profil Dinding Penahan / Talud:</strong> Menghasilkan 2 komponen otomatis: Footing dasar dan Stem dinding penahan.
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    Lebar Footing Dasar B (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={bFooting}
                    onChange={(e) => setBFooting(parseFloat(e.target.value) || 0)}
                    className="num h-8 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground mt-1"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    Tebal Footing Dasar tf (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={tFooting}
                    onChange={(e) => setTFooting(parseFloat(e.target.value) || 0)}
                    className="num h-8 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground mt-1"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    Tinggi Stem Dinding H (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={hStem}
                    onChange={(e) => setHStem(parseFloat(e.target.value) || 0)}
                    className="num h-8 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground mt-1"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    Tebal Stem Bawah (m)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={tStemBase}
                    onChange={(e) => setTStemBase(parseFloat(e.target.value) || 0)}
                    className="num h-8 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground mt-1"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    Tebal Stem Atas (m)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={tStemTop}
                    onChange={(e) => setTStemTop(parseFloat(e.target.value) || 0)}
                    className="num h-8 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground mt-1"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    Posisi Stem dari Heel X0 (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={xStemPos}
                    onChange={(e) => setXStemPos(parseFloat(e.target.value) || 0)}
                    className="num h-8 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {template === "SALURAN_LINING" && (
            <div className="space-y-3">
              <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5 text-xs text-muted-foreground">
                <strong className="text-foreground">Profil Saluran Terbuka:</strong> Menghasilkan 3 komponen otomatis: Pelat dasar lining, dinding kiri, dan dinding kanan.
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    Lebar Luar Saluran B (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={bSaluran}
                    onChange={(e) => setBSaluran(parseFloat(e.target.value) || 0)}
                    className="num h-8 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground mt-1"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    Tinggi Dinding Lining H (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={hDindingSaluran}
                    onChange={(e) => setHDindingSaluran(parseFloat(e.target.value) || 0)}
                    className="num h-8 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground mt-1"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    Tebal Pelat Dasar tb (m)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={tDasarSaluran}
                    onChange={(e) => setTDasarSaluran(parseFloat(e.target.value) || 0)}
                    className="num h-8 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground mt-1"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    Tebal Dinding Saluran tw (m)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={tDindingSaluran}
                    onChange={(e) => setTDindingSaluran(parseFloat(e.target.value) || 0)}
                    className="num h-8 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground mt-1"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-between border-t border-border pt-3">
          <span className="text-[11px] text-muted-foreground">
            ⚠️ Mengganti komponen yang ada saat ini dengan template baru
          </span>
          <div className="flex items-center gap-2">
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
              Terapkan Penampang Ini ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
