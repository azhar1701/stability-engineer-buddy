import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useHydrated } from "@/lib/store";
import { useProject } from "@/lib/useProject";
import { Status } from "@/components/kit";
import { exportXlsx } from "@/lib/exportXlsx";

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

const STEPS = [
  { to: "/proyek/$id", code: "01", label: "Proyek & Kesiapan", key: "proyek" },
  { to: "/proyek/$id/geometri", code: "11", label: "Geometri", key: "geometri" },
  { to: "/proyek/$id/hidraulika", code: "12–14", label: "Hidrologi & Hidraulika", key: "hidraulika" },
  { to: "/proyek/$id/tanah", code: "15–17", label: "Tanah / Fondasi", key: "tanah" },
  { to: "/proyek/$id/uplift", code: "18–20", label: "Tekanan Tanah & Uplift", key: "uplift" },
  { to: "/proyek/$id/gaya", code: "24", label: "Gaya & Momen", key: "gaya" },
  { to: "/proyek/$id/kasus", code: "25/44", label: "Kasus Beban", key: "kasus" },
  { to: "/proyek/$id/stabilitas", code: "26/27", label: "Stabilitas & Envelope", key: "stabilitas" },
  { to: "/proyek/$id/daya-dukung", code: "28", label: "Daya Dukung", key: "daya" },
  { to: "/proyek/$id/rekomendasi", code: "32", label: "Rekomendasi", key: "rek" },
  { to: "/proyek/$id/laporan", code: "33", label: "Laporan", key: "lap" },
] as const;

function Layout() {
  const hydrated = useHydrated();
  if (!hydrated) return <div className="p-8 text-sm text-muted-foreground">Memuat proyek…</div>;
  return <Inner />;
}

function Inner() {
  const { project, result } = useProject();
  if (!project) return (
    <div className="p-8 text-sm">Proyek tidak ditemukan. <Link to="/" className="text-primary underline">Kembali ke daftar</Link></div>
  );
  const incomplete = (key: string) => result.readiness.some((r) => r.step === key && r.required && !r.ok);
  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <Link to="/" className="border-b border-sidebar-border px-4 py-4 text-xs hover:text-sidebar-accent-foreground">← Semua proyek</Link>
        <div className="border-b border-sidebar-border px-4 py-3">
          <div className="truncate text-sm font-semibold text-sidebar-accent-foreground">{project.name}</div>
          <div className="mt-1"><Status s={result.envelope.overall} /></div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {STEPS.map((s, i) => (
            <Link key={s.to} to={s.to} params={{ id: project.id }} activeOptions={{ exact: true }}
              className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary" }}>
              <span className="num w-5 text-xs text-sidebar-primary">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1">{s.label}</span>
              {incomplete(s.key) && <span className="h-2 w-2 rounded-full bg-destructive" title="Belum lengkap" />}
            </Link>
          ))}
        </nav>
        <button onClick={() => exportXlsx(project)} className="m-3 rounded-sm border border-sidebar-border px-3 py-2 text-xs hover:bg-sidebar-accent">Ekspor Excel</button>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="no-print flex gap-2 overflow-x-auto border-b bg-sidebar p-2 md:hidden">
          <Link to="/" className="px-2 text-xs text-sidebar-foreground">←</Link>
          {STEPS.map((s) => (
            <Link key={s.to} to={s.to} params={{ id: project.id }} activeOptions={{ exact: true }} className="whitespace-nowrap rounded-sm px-2 py-1 text-xs text-sidebar-foreground" activeProps={{ className: "bg-sidebar-accent" }}>{s.label}</Link>
          ))}
        </div>
        <main className="print-full mx-auto max-w-6xl px-6 py-8"><Outlet /></main>
      </div>
    </div>
  );
}
