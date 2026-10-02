import { useState } from "react";
import { TYPES, KECAMATAN, type TypeId } from "@/lib/engine/master";
import { AutocompleteField, TextField } from "@/components/kit";
import type { Project } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

interface WizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (type: TypeId, meta: Partial<Pick<Project, "name" | "location" | "kecamatan" | "desa" | "engineer">>) => void;
}

const TYPE_ICONS: Record<TypeId, { icon: string; badge: string; desc: string; checks: string[] }> = {
  BND: {
    icon: "M3 17h18M3 17l4-9h6l4 9M7 17v4m10-4v4M9 8V4h6v4",
    badge: "KP-02 / SNI 8460",
    desc: "Pelimpah bendung tetap on-stream sungai dengan beban uplift komprehensif, rembesan Lane/Bligh, & muka air banjir.",
    checks: ["Gaya Angkat (Uplift)", "Rembesan & Bahaya Piping", "Hidrostatik Hulu/Hilir"],
  },
  DND: {
    icon: "M4 20h16M7 20V5l5 2v13M12 20h5",
    badge: "Rankine / SNI 8460",
    desc: "Dinding penahan tanah / talud saluran gravitasi atau kantilever menahan desakan tanah aktif & muka air pori.",
    checks: ["Tekanan Tanah Lateral", "Momen Guling Toe", "Daya Dukung Dasar"],
  },
  SLN: {
    icon: "M3 6l4 12h10l4-12H3z",
    badge: "KP-03 Saluran",
    desc: "Saluran terbuka gravitasi trapesium / persegi lining beton/pasangan batu penahan tekanan air & tanah samping.",
    checks: ["Tekanan Air Saluran", "Stabilitas Dinding Saluran", "Geser Dasar"],
  },
  BLK: {
    icon: "M5 7h14v13H5zM9 7V4h6v3",
    badge: "Gravitasi Murni",
    desc: "Bangunan bagi, sadap, ambang dasar, krib atau blok pelindung tebing penahan resultan kombinasi beban.",
    checks: ["Berat Sendiri W", "Eksentrisitas Resultan", "Tegangan Kontak"],
  },
  TLG: {
    icon: "M3 8h18v6H3zM7 14v6m10-6v6M4 5h16",
    badge: "KP-04 Bangunan",
    desc: "Struktur flume / talang irigasi melayang pembawa air menyeberang lembah dengan beban air operasional & pilar support.",
    checks: ["Berat Air Dalam Flume", "Stabilitas Pilar / Pier", "Eksentrisitas Dasar"],
  },
};

export function NewProjectWizard({ isOpen, onClose, onCreate }: WizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<TypeId>("BND");
  const [form, setForm] = useState({
    name: "",
    location: "Kabupaten Ciamis",
    kecamatan: "",
    desa: "",
    engineer: "",
  });

  if (!isOpen) return null;

  const handleNext = () => setStep(2);
  const handleBack = () => setStep(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(selectedType, {
      name: form.name.trim() || `Analisis ${TYPES.find((t) => t.id === selectedType)?.name || "Bangunan"}`,
      location: form.location.trim() || "Kabupaten Ciamis",
      kecamatan: form.kecamatan.trim(),
      desa: form.desa.trim(),
      engineer: form.engineer.trim(),
    });
  };

  const selectedMeta = TYPES.find((t) => t.id === selectedType);
  const typeExtra = TYPE_ICONS[selectedType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b bg-muted/40 px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="num rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                Wizard Proyek Baru · Langkah {step} dari 2
              </span>
            </div>
            <h2 className="mt-1 text-lg font-bold text-foreground">
              {step === 1 ? "Pilih Tipe Struktur Bangunan Air" : "Identitas & Lokasi Pekerjaan"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 ? (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Pilih jenis konstruksi yang akan dianalisis. Mesin kalkulasi akan otomatis menyiapkan komponen geometri,
                kombinasi beban KP-02, dan kriteria faktor keamanan (FS) yang sesuai.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {TYPES.map((t) => {
                  const info = TYPE_ICONS[t.id];
                  const isSelected = selectedType === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedType(t.id)}
                      className={cn(
                        "group relative cursor-pointer rounded-lg border p-3.5 transition-all",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary"
                          : "border-border/80 bg-card hover:border-primary/50 hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-md border text-xs font-bold",
                              isSelected
                                ? "border-primary/30 bg-primary text-primary-foreground"
                                : "border-border bg-muted text-foreground"
                            )}
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              viewBox="0 0 24 24"
                            >
                              <path d={info.icon} />
                            </svg>
                          </div>
                          <div>
                            <span className="font-semibold text-xs tracking-tight text-foreground">{t.name}</span>
                            <div className="num text-[10px] text-muted-foreground">{info.badge}</div>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                        {info.desc}
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {info.checks.slice(0, 2).map((c) => (
                          <span
                            key={c}
                            className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d={typeExtra?.icon || "M4 6h16M4 12h16M4 18h16"} />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-foreground">{selectedMeta?.name}</span>
                    <span className="num rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                      {selectedType}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{typeExtra?.desc}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <TextField
                    label="Nama Proyek / Bangunan"
                    value={form.name}
                    onChange={(v) => setForm((s) => ({ ...s, name: v }))}
                    placeholder={`e.g. ${selectedType === "BND" ? "Bendung Cikaso Ruas Hulu" : "Dinding Penahan Tebing Blok B"}`}
                    hint="Nama atau identitas unik proyek ini"
                  />
                </div>
                <TextField
                  label="Kabupaten / Wilayah"
                  value={form.location}
                  onChange={(v) => setForm((s) => ({ ...s, location: v }))}
                  placeholder="Kabupaten Ciamis"
                />
                <AutocompleteField
                  label="Kecamatan (Kab. Ciamis)"
                  value={form.kecamatan}
                  onChange={(v) => setForm((s) => ({ ...s, kecamatan: v }))}
                  options={Object.keys(KECAMATAN)}
                  placeholder="Ketik nama kecamatan..."
                  hint="Digunakan untuk pemetaan profil tanah regional Ciamis"
                />
                <TextField
                  label="Desa / Kelurahan"
                  value={form.desa}
                  onChange={(v) => setForm((s) => ({ ...s, desa: v }))}
                  placeholder="Nama desa atau lokasi tapak"
                />
                <TextField
                  label="Nama Perekayasa / Engineer"
                  value={form.engineer}
                  onChange={(v) => setForm((s) => ({ ...s, engineer: v }))}
                  placeholder="Nama engineer penanggung jawab"
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t bg-muted/20 px-6 py-4 flex items-center justify-between">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-input bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all"
              >
                Lanjut: Identitas Proyek →
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleBack}
                className="rounded-md border border-input bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                ← Kembali
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all"
              >
                Mulai Analisis Stabilitas →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
