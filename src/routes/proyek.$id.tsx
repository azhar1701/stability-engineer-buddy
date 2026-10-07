import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useHydrated } from "@/lib/store";
import { useProject } from "@/lib/useProject";
import { Status, AutosaveBadge } from "@/components/kit";
import { exportXlsx } from "@/lib/exportXlsx";
import { PdfViewerDrawer } from "@/components/PdfViewerDrawer";
import { StickyStabilityBar } from "@/components/StickyStabilityBar";
import type { ExtractedPdfData } from "@/lib/pdfExtractor";

export const Route = createFileRoute("/proyek/$id")({
  head: () => ({
    meta: [
      { title: "Analisis Proyek — Stabilitas Bangunan Air" },
      { name: "description", content: "Alur kerja analisis stabilitas bangunan air langkah demi langkah." },
      { property: "og:title", content: "Analisis Proyek — Stabilitas Bangunan Air" },
      { property: "og:description", content: "Alur kerja analisis stabilitas bangunan air langkah demi langkah." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Layout,
});

export const STAGES = [
  {
    title: "I. Profil & Geometri",
    steps: [
      { to: "/proyek/$id", code: "01", label: "Proyek & Kesiapan", key: "proyek" },
      { to: "/proyek/$id/geometri", code: "02", label: "Geometri Komponen", key: "geometri" },
    ],
  },
  {
    title: "II. Beban Hidraulika & Tanah",
    steps: [
      { to: "/proyek/$id/hidraulika", code: "03", label: "Hidrologi & Muka Air", key: "hidraulika" },
      { to: "/proyek/$id/tanah", code: "04", label: "Tanah / Fondasi", key: "tanah" },
      { to: "/proyek/$id/uplift", code: "05", label: "Tekanan & Rembesan", key: "uplift" },
      { to: "/proyek/$id/gaya", code: "06", label: "Beban Tambahan", key: "gaya" },
    ],
  },
  {
    title: "III. Analisis Stabilitas",
    steps: [
      { to: "/proyek/$id/kasus", code: "07", label: "Kasus Beban", key: "kasus" },
      { to: "/proyek/$id/stabilitas", code: "08", label: "Stabilitas & Envelope", key: "stabilitas" },
      { to: "/proyek/$id/daya-dukung", code: "09", label: "Daya Dukung", key: "daya" },
    ],
  },
  {
    title: "IV. Rekomendasi & Laporan",
    steps: [
      { to: "/proyek/$id/rekomendasi", code: "10", label: "Rekomendasi Teknis", key: "rek" },
      { to: "/proyek/$id/laporan", code: "11", label: "Laporan Nota Desain", key: "lap" },
    ],
  },
] as const;

export const ALL_STEPS: { to: string; code: string; label: string; key: string }[] = STAGES.flatMap((s) => s.steps as unknown as { to: string; code: string; label: string; key: string }[]);

function Layout() {
  const hydrated = useHydrated();
  if (!hydrated) return <div className="p-8 text-sm text-muted-foreground">Memuat proyek…</div>;
  return <Inner />;
}

function Inner() {
  const { project, result, update } = useProject();
  const [saved, setSaved] = useState(true);
  const [isPdfDrawerOpen, setIsPdfDrawerOpen] = useState(false);
  const prevUpdatedRef = useRef(project?.updatedAt);
  const isLaporan = useRouterState({
    select: (s) => s.location.pathname.endsWith("/laporan"),
  });

  const handleApplyExtracted = (data: ExtractedPdfData) => {
    update((p) => ({
      ...p,
      // Adapt structure type to detected PDF classification
      type: data.detectedType,
      // Foundation geometry from PDF dimensions
      ...(data.dimensions.B && data.dimensions.B > 0 ? { B: data.dimensions.B } : {}),
      ...(data.calculated.Df > 0 ? { Df: data.calculated.Df } : {}),
      ...(data.calculated.Hsoil > 0 ? { Hsoil: data.calculated.Hsoil } : {}),
      // Hydraulics: water levels & weir crest height from elevations
      hydraulics: {
        ...p.hydraulics,
        ...(data.calculated.hu > 0 ? { hu: data.calculated.hu } : {}),
        ...(data.calculated.hd > 0 ? { hd: data.calculated.hd } : {}),
        ...(data.calculated.pMercu > 0 ? { pMercu: data.calculated.pMercu } : {}),
      },
      // Geometry components auto-generated from PDF dimensions
      ...(data.suggestedComponents.length > 0
        ? { components: data.suggestedComponents }
        : {}),
      // Seepage apron parameters if present in PDF
      seepage: {
        ...p.seepage,
        enabled: p.seepage?.enabled ?? data.detectedType === "BND",
        soilType: p.seepage?.soilType ?? "PASIR_SEDANG",
        dCutoffUp: p.seepage?.dCutoffUp ?? 1.0,
        dCutoffDown: p.seepage?.dCutoffDown ?? 1.5,
        ...(data.dimensions.lApronUp != null ? { lApronUp: data.dimensions.lApronUp } : {}),
        ...(data.dimensions.lApronDown != null ? { lApronDown: data.dimensions.lApronDown } : {}),
      },
      // Persist PDF metadata for cross-step reference
      extractedPdfMeta: {
        fileName: data.fileName,
        detectedType: data.detectedType,
        elevations: data.elevations as Record<string, number | undefined>,
        dimensions: data.dimensions as Record<string, number | undefined>,
        calculated: data.calculated as Record<string, number | undefined>,
      },
    }));
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (project?.updatedAt && project.updatedAt !== prevUpdatedRef.current) {
      prevUpdatedRef.current = project.updatedAt;
      setSaved(false);
      timer = setTimeout(() => setSaved(true), 600);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [project?.updatedAt]);

  if (!project) return (
    <div className="p-8 text-sm">Proyek tidak ditemukan. <Link to="/" className="text-primary underline">Kembali ke daftar</Link></div>
  );
  const incomplete = (key: string) => result.readiness.some((r) => r.step === key && r.required && !r.ok);
  const completedReqCount = result.readiness.filter((r) => r.required && r.ok).length;
  const totalReqCount = result.readiness.filter((r) => r.required).length;
  const progressPct = totalReqCount > 0 ? Math.round((completedReqCount / totalReqCount) * 100) : 100;

  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 hidden h-screen w-72 shrink-0 flex-col bg-sidebar text-sidebar-foreground shadow-lg md:flex">
        <div className="border-b border-sidebar-border px-5 py-3.5">
          <div className="flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-sidebar-foreground/70 transition-colors hover:text-sidebar-accent-foreground">
              ← Semua proyek
            </Link>
            <AutosaveBadge saved={saved} />
          </div>
          <div className="mt-2.5">
            <div className="truncate text-base font-bold text-sidebar-accent-foreground">{project.name}</div>
            <div className="mt-1 flex items-center justify-between">
              <Status s={result.envelope.overall} />
              <span className="num text-[11px] text-sidebar-foreground/60">{progressPct}% input siap</span>
            </div>
            {/* Input Progress Bar */}
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sidebar-border">
              <div className="h-full bg-sidebar-primary transition-all duration-300" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          {/* Quick PDF Plan Drawer Toggle Button */}
          <button
            type="button"
            onClick={() => setIsPdfDrawerOpen(!isPdfDrawerOpen)}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-all ${
              isPdfDrawerOpen
                ? "border-primary bg-primary text-primary-foreground shadow-xs"
                : "border-sidebar-border bg-sidebar-accent/60 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <span>📑</span>
            <span>{isPdfDrawerOpen ? "Tutup Gambar PDF" : "Buka Gambar Rencana PDF"}</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {STAGES.map((stage) => (
            <div key={stage.title} className="mb-4">
              <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-sidebar-primary/80">
                {stage.title}
              </div>
              <div className="space-y-0.5">
                {stage.steps.map((s) => (
                  <Link key={s.to} to={s.to as string} params={{ id: project.id }} activeOptions={{ exact: true }}
                    className="flex items-center gap-2.5 rounded-md px-3 py-1.5 text-xs font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs" }}>
                    <span className="num w-4 text-[11px] text-sidebar-primary">{s.code}</span>
                    <span className="flex-1 truncate">{s.label}</span>
                    {incomplete(s.key) ? (
                      <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" title="Input wajib belum lengkap" />
                    ) : (
                      <span className="text-[10px] text-success font-semibold">✓</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <button onClick={() => exportXlsx(project)} className="w-full rounded-md border border-sidebar-border bg-sidebar-accent/50 px-3 py-2 text-xs font-medium text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            Ekspor Kalkulasi Excel
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 bg-background">
        <div className="no-print flex items-center justify-between gap-2 overflow-x-auto border-b bg-sidebar p-2.5 md:hidden">
          <div className="flex items-center gap-2">
            <Link to="/" className="px-2 text-xs text-sidebar-foreground">← Beranda</Link>
            <button
              type="button"
              onClick={() => setIsPdfDrawerOpen(!isPdfDrawerOpen)}
              className="whitespace-nowrap rounded-md bg-primary/20 px-2.5 py-1 text-xs font-bold text-primary"
            >
              📑 PDF
            </button>
            {ALL_STEPS.map((s) => (
              <Link key={s.to} to={s.to as string} params={{ id: project.id }} activeOptions={{ exact: true }} className="whitespace-nowrap rounded-md px-2.5 py-1 text-xs text-sidebar-foreground" activeProps={{ className: "bg-sidebar-accent font-semibold" }}>{s.label}</Link>
            ))}
          </div>
          <div className="shrink-0 pl-2">
            <AutosaveBadge saved={saved} />
          </div>
        </div>
        <main className="print-full mx-auto max-w-6xl px-6 py-8 pb-24">
          <Outlet />
        </main>
        {!isLaporan && (
          <StickyStabilityBar
            project={project}
            result={result}
            className="md:left-72"
          />
        )}
      </div>

      {/* Slide-out Split Screen PDF Viewer Drawer */}
      <PdfViewerDrawer
        isOpen={isPdfDrawerOpen}
        onClose={() => setIsPdfDrawerOpen(false)}
        onApplyExtracted={handleApplyExtracted}
        currentProjectType={project.type}
      />
    </div>
  );
}
