import { createFileRoute } from "@tanstack/react-router";
import { useProject } from "@/lib/useProject";
import { PageHeader, Section, StepNav, fmt } from "@/components/kit";
import { recommend } from "@/lib/engine/recommend";
import { RecApplyCard } from "@/components/RecApplyCard";
import type { AppliedRecEntry, Project } from "@/lib/engine/types";

export const Route = createFileRoute("/proyek/$id/rekomendasi")({
  head: () => ({ meta: [{ title: "Rekomendasi Teknis — Stabilitas Bangunan Air" }] }),
  component: RecPage,
});

function RecPage() {
  const { project: p, result: a, update } = useProject();
  const recs = recommend(a);

  // Filter out any stale 0-delta entries where nothing actually changed
  const isMeaningfulDelta = (entry: AppliedRecEntry) =>
    entry.delta &&
    Object.values(entry.delta).some((d) => Math.abs(d.to - d.from) > 0.001);

  const appliedList = (p.appliedRecs ?? []).filter(isMeaningfulDelta);
  const activeApplied = appliedList.filter((r) => r.status === "APPLIED");

  const handleApply = (entry: AppliedRecEntry) => {
    // Safety: only apply if delta is meaningful
    if (!isMeaningfulDelta(entry)) return;

    update((current) => {
      const prevApplied = (current.appliedRecs ?? []).filter(
        (r) => r.id !== entry.id && isMeaningfulDelta(r)
      );
      return {
        ...current,
        ...entry.patch,
        appliedRecs: [...prevApplied, entry],
        updatedAt: Date.now(),
      };
    });
  };

  const handleRevert = (entryId: string) => {
    update((current) => {
      const target = current.appliedRecs?.find((r) => r.id === entryId);
      if (!target) return current;

      const patchBack: Partial<Project> = {};
      if (target.delta.B) {
        patchBack.B = target.delta.B.from;
      }
      if (target.delta.Df) {
        patchBack.Df = target.delta.Df.from;
      }
      if (
        target.delta.dCutoffUp ||
        target.delta.dCutoffDown ||
        target.delta.lApronDown
      ) {
        patchBack.seepage = {
          ...(current.seepage ?? { enabled: true, soilType: "PASIR_SEDANG" }),
          dCutoffUp: target.delta.dCutoffUp
            ? target.delta.dCutoffUp.from
            : (current.seepage?.dCutoffUp ?? 1),
          dCutoffDown: target.delta.dCutoffDown
            ? target.delta.dCutoffDown.from
            : (current.seepage?.dCutoffDown ?? 1.5),
          lApronDown: target.delta.lApronDown
            ? target.delta.lApronDown.from
            : (current.seepage?.lApronDown ?? 0),
        };
      }
      if (current.components) {
        const comps = current.components.map((c, idx) => {
          const deltaKey = `comp_${idx}`;
          if (target.delta[deltaKey]) {
            return { ...c, b1: target.delta[deltaKey].from };
          }
          return c;
        });
        patchBack.components = comps;
      }

      const updatedApplied = (current.appliedRecs ?? []).map((r) =>
        r.id === entryId ? { ...r, status: "REVERTED" as const } : r
      );

      return {
        ...current,
        ...patchBack,
        appliedRecs: updatedApplied,
        updatedAt: Date.now(),
      };
    });
  };

  const kritisCount = recs.filter((r) => r.level === "KRITIS").length;
  const perhatianCount = recs.filter((r) => r.level === "PERHATIAN").length;

  return (
    <>
      <PageHeader
        step={10}
        code="31_ATURAN · 32_REKOMENDASI"
        title="Rekomendasi Teknis & Penerapan Proporsional"
        desc="Dihasilkan dari envelope stabilitas dan rembesan. Tinjau solusi proporsional, periksa visualisasi sketsa komparasi, dan terapkan langsung ke model stabilitas."
      />

      {/* Status Summary Banner */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">
                Status Evaluasi Stabilitas Keseluruhan:
              </span>
              <span
                className={`rounded-md px-2.5 py-0.5 text-xs font-bold ${
                  a.envelope.overall === "MEMENUHI"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : a.envelope.overall === "TIDAK MEMENUHI"
                    ? "bg-red-500/15 text-red-700 dark:text-red-300"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                }`}
              >
                {a.envelope.overall}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {kritisCount > 0
                ? `Ditemukan ${kritisCount} aspek kritis dan ${perhatianCount} aspek perhatian yang memerlukan perbaikan.`
                : perhatianCount > 0
                ? `Tidak ada aspek kritis. Ditemukan ${perhatianCount} aspek perhatian untuk pertimbangan optimasi.`
                : "Seluruh kriteria stabilitas (geser, guling, eksentrisitas, daya dukung, rembesan) terpenuhi."}
            </p>
          </div>

          {activeApplied.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <span>⚡ {activeApplied.length} Rekomendasi Aktif Diterapkan</span>
            </div>
          )}
        </div>
      </div>

      {/* Recommendation Cards */}
      <Section title={`${recs.length} Butir Rekomendasi Teknis`}>
        <div className="space-y-3">
          {recs.map((r, i) => {
            const matchedEntry = activeApplied.find((entry) => {
              const t = r.title.toLowerCase();
              if (t.includes("geser") || t.includes("guling")) return entry.solverType === "WIDEN_B";
              if (t.includes("piping") || t.includes("rembesan")) return entry.solverType === "ADD_CUTOFF" || entry.solverType === "EXTEND_APRON";
              if (t.includes("daya dukung")) return entry.solverType === "WIDEN_B" || entry.solverType === "DEEPER_DF";
              return false;
            });

            return (
              <RecApplyCard
                key={i}
                rec={r}
                project={p}
                appliedEntry={matchedEntry}
                onApply={handleApply}
                onRevert={handleRevert}
              />
            );
          })}
        </div>
      </Section>

      {/* Audit Trail Section: Riwayat Penerapan Rekomendasi */}
      {appliedList.length > 0 && (
        <Section title="Riwayat Penerapan Rekomendasi (Audit Trail)">
          <div className="rounded-xl border border-border overflow-hidden bg-card text-xs">
            <table className="w-full text-left">
              <thead className="bg-muted/60 text-muted-foreground font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Waktu</th>
                  <th className="py-2.5 px-4">Rekomendasi</th>
                  <th className="py-2.5 px-4">Perubahan Parameter (Δ)</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {appliedList.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/20">
                    <td className="py-3 px-4 font-mono text-muted-foreground whitespace-nowrap">
                      {new Date(entry.appliedAt).toLocaleDateString("id-ID")}{" "}
                      {new Date(entry.appliedAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground">{entry.recTitle}</div>
                      <div className="text-[11px] text-muted-foreground">{entry.summary}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <div className="space-y-1">
                        {Object.values(entry.delta).map((d, idx) => (
                          <div key={idx} className="text-[11px]">
                            <span className="text-muted-foreground">{d.label}: </span>
                            <span className="font-semibold text-foreground">
                              {fmt(d.from)} → {fmt(d.to)} {d.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {entry.status === "APPLIED" ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Dibatalkan
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {entry.status === "APPLIED" ? (
                        <button
                          type="button"
                          onClick={() => handleRevert(entry.id)}
                          className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          Batalkan
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApply(entry)}
                          className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                        >
                          Terapkan Ulang
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <StepNav
        prev={{ to: "/proyek/$id/daya-dukung", label: "09. Daya Dukung Fondasi" }}
        next={{ to: "/proyek/$id/laporan", label: "11. Laporan Teknis" }}
        projectId={p.id}
      />
    </>
  );
}
