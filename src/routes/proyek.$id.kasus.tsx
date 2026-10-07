import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useProject } from "@/lib/useProject";
import { fmt, Notice, PageHeader, Section, StepNav, Status } from "@/components/kit";
import { LOAD_CASES, type CaseClass } from "@/lib/engine/master";
import { defaultCases } from "@/lib/engine/defaults";
import type { CaseInput } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/proyek/$id/kasus")({
  head: () => ({ meta: [{ title: "Kasus Beban — Stabilitas Bangunan Air" }] }),
  component: KasusPage,
});

const F: { k: keyof CaseInput; l: string }[] = [
  { k: "fHu", l: "f hu" }, { k: "fHd", l: "f hd" }, { k: "fU", l: "f uplift" }, { k: "fSoil", l: "f tanah" }, { k: "fOtherH", l: "f H lain" }, { k: "fWater", l: "f air" },
];

function KasusPage() {
  const { project: p, result: a, update } = useProject();
  const [customMode, setCustomMode] = useState(false);
  const upd = (id: string, patch: Partial<CaseInput>) => update((x) => ({ ...x, cases: x.cases.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));

  return (
    <>
      <PageHeader
        step={7}
        code="25_KASUS_BEBAN · 44_KRITERIA_KASUS"
        title="Kasus Beban dan Kriteria Keamanan"
        desc="Kombinasi pembebanan standar KP-02: Normal, Banjir Sementara, dan Kondisi Gempa Ekstrem dengan kriteria faktor keamanan masing-masing."
      />

      <Section
        title="Konfigurasi Kasus Beban"
        aside={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCustomMode(!customMode)}
              className={cn("rounded-md border px-3 py-1 text-xs font-medium transition-all", customMode ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-input hover:bg-muted")}
            >
              {customMode ? "✓ Mode Kustomisasi Aktif" : "⚙️ Kustomisasi Faktor Manual"}
            </button>
            {customMode && (
              <button
                type="button"
                className="text-xs text-primary hover:underline ml-1"
                onClick={() => update((x) => ({ ...x, cases: defaultCases() }))}
              >
                Reset Default KP-02
              </button>
            )}
          </div>
        }
      >
        {!customMode ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-3.5 text-xs text-muted-foreground flex items-center justify-between">
              <div>
                <strong className="text-foreground">Standar KP-02 Terintegrasi:</strong> Faktor pengali beban dan kriteria FS diatur otomatis berdasarkan kelas beban (Normal: 1.0x, Sementara: 0.9x, Ekstrem: 0.8x FS min).
              </div>
              <span className="rounded bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                KP-02 AKTIF
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {p.cases.map((c, i) => {
                const r = a.cases[i]!;
                const def = LOAD_CASES.find((d) => d.id === c.id);
                if (!r.applies) return null;

                return (
                  <div key={c.id} className="rounded-lg border bg-card p-4 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="num rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                            {c.id}
                          </span>
                          <span className="text-xs font-bold text-foreground">{c.name}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">{def?.note}</p>
                      </div>
                      <span className={cn("num rounded-full px-2 py-0.5 text-[10px] font-semibold", c.cls === "NORMAL" ? "bg-primary/10 text-primary" : c.cls === "SEMENTARA" ? "bg-warning/20 text-warning-foreground" : "bg-destructive/10 text-destructive")}>
                        {c.cls}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-dashed pt-2.5 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground">FS Geser Min</span>
                        <div className="num font-bold text-foreground">≥ {fmt(r.fsSlideMin)}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">FS Guling Min</span>
                        <div className="num font-bold text-foreground">≥ {fmt(r.fsOverturnMin)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Notice>Faktor pengali kasus beban diterapkan pada gaya dasar hidrostatik, uplift, dan tanah. Gunakan hanya jika memerlukan kalibrasi khusus.</Notice>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-1">Aktif</th>
                    <th className="p-1">ID</th>
                    <th className="p-1">Kasus</th>
                    <th className="p-1">Kelas</th>
                    {F.map((f) => <th key={f.k} className="p-1">{f.l}</th>)}
                    <th className="p-1 text-right">FS geser min</th>
                    <th className="p-1 text-right">FS guling min</th>
                  </tr>
                </thead>
                <tbody>
                  {p.cases.map((c, i) => {
                    const r = a.cases[i]!;
                    const def = LOAD_CASES.find((d) => d.id === c.id);
                    return (
                      <tr key={c.id} className={"border-t " + (r.applies ? "" : "opacity-45")}>
                        <td className="p-1">
                          <input type="checkbox" checked={c.active} disabled={!r.applies} onChange={(e) => upd(c.id, { active: e.target.checked })} />
                        </td>
                        <td className="num p-1 text-xs">{c.id}</td>
                        <td className="p-1">
                          {c.name}
                          <div className="text-[11px] text-muted-foreground">{r.applies ? def?.note : "Tidak berlaku untuk jenis ini"}</div>
                        </td>
                        <td className="p-1">
                          <select className="h-8 rounded-sm border bg-card px-1 text-xs" value={c.cls} onChange={(e) => upd(c.id, { cls: e.target.value as CaseClass })}>
                            {["NORMAL", "SEMENTARA", "EKSTREM"].map((x) => <option key={x}>{x}</option>)}
                          </select>
                        </td>
                        {F.map((f) => (
                          <td key={f.k} className="w-20 p-1">
                            <input type="number" step="0.05" className="num h-8 w-full rounded-sm border border-input bg-card px-1 text-sm" value={c[f.k] as number} onChange={(e) => upd(c.id, { [f.k]: parseFloat(e.target.value) || 0 })} />
                          </td>
                        ))}
                        <td className="num p-1 text-right">{fmt(r.fsSlideMin)}</td>
                        <td className="num p-1 text-right">{fmt(r.fsOverturnMin)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>

      <StepNav
        prev={{ to: "/proyek/$id/gaya", label: "06. Gaya-Gaya Bekerja" }}
        next={{ to: "/proyek/$id/stabilitas", label: "08. Kontrol Stabilitas" }}
        projectId={p.id}
      />
    </>
  );
}
