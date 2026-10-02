import { createFileRoute } from "@tanstack/react-router";
import { useProject } from "@/lib/useProject";
import { PageHeader, Section, Status, StepNav } from "@/components/kit";
import { recommend } from "@/lib/engine/recommend";

export const Route = createFileRoute("/proyek/$id/rekomendasi")({
  head: () => ({ meta: [{ title: "Rekomendasi Teknis — Stabilitas Bangunan Air" }] }),
  component: RecPage,
});

function RecPage() {
  const { project: p, result: a } = useProject();
  const recs = recommend(a);
  return (
    <>
      <PageHeader code="31_ATURAN · 32_REKOMENDASI" title="Rekomendasi Teknis Otomatis" desc="Dihasilkan dari envelope dan status data. Tidak menggantikan engineering review; app tidak melakukan redesign otomatis." />
      <Section title={`${recs.length} rekomendasi`}>
        <ul className="divide-y">
          {recs.map((r, i) => (
            <li key={i} className="flex gap-4 py-3">
              <div className="w-24 shrink-0"><Status s={r.level} /></div>
              <div><div className="font-medium">{r.title}</div><p className="text-sm text-muted-foreground">{r.detail}</p></div>
            </li>
          ))}
        </ul>
      </Section>
      <StepNav
        prev={{ to: "/proyek/$id/daya-dukung", label: "09. Daya Dukung Fondasi" }}
        next={{ to: "/proyek/$id/laporan", label: "11. Laporan Teknis" }}
        projectId={p.id}
      />
    </>
  );
}
