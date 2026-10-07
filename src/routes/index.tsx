import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useHydrated, useStore, uatSample, newProject } from "@/lib/store";
import { analyze } from "@/lib/engine/compute";
import { typeById, type TypeId } from "@/lib/engine/master";
import { fmt, Status } from "@/components/kit";
import { NewProjectWizard } from "@/components/NewProjectWizard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Daftar Proyek — Stabilitas Bangunan Air" },
      { name: "description", content: "Executive Engineering Hub: Analisis stabilitas bendung, saluran, dinding penahan, blok gravitasi, dan talang irigasi." },
      { property: "og:title", content: "Daftar Proyek — Stabilitas Bangunan Air" },
      { property: "og:description", content: "Analisis geser, guling, eksentrisitas, dan daya dukung bangunan air." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const hydrated = useHydrated();
  const { projects, create, remove, duplicate, importMany } = useStore();
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"GRID" | "TABLE">("GRID");
  const [wizardOpen, setWizardOpen] = useState(false);

  const go = (id: string) => nav({ to: "/proyek/$id", params: { id } });

  const onImport = async (f: File) => {
    try {
      const data = JSON.parse(await f.text());
      importMany(Array.isArray(data) ? data : [data]);
    } catch { alert("File JSON tidak valid."); }
  };

  const exportJson = (data: unknown, name: string) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
  };

  // Filtered projects
  const filtered = projects.filter((p) => {
    const matchType = filterType === "ALL" || p.type === filterType;
    const matchQuery = !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.kecamatan.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchQuery;
  });

  // Calculate high level stats
  const analyzedList = projects.map((p) => ({ project: p, res: analyze(p) }));
  const totalCount = projects.length;
  const passCount = analyzedList.filter((x) => x.res.envelope.overall === "MEMENUHI").length;
  const reviewCount = analyzedList.filter((x) => x.res.envelope.overall === "PERLU TINJAU" || x.res.envelope.overall === "TIDAK MEMENUHI").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header Banner */}
      <header className="relative border-b bg-sidebar text-sidebar-foreground shadow-sm">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="num rounded-full bg-sidebar-primary/20 px-2.5 py-0.5 text-xs font-semibold text-sidebar-primary">KP-02 · SNI 8460:2017</span>
                <span className="text-xs text-sidebar-foreground/70">Kabupaten Ciamis & Wilayah Sungai</span>
              </div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-sidebar-accent-foreground lg:text-4xl">Waterway Stability Hub</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sidebar-foreground/80">Platform terintegrasi analisis stabilitas gravitasi: geser, guling, eksentrisitas, daya dukung, rembesan piping, dan beban gempa pseudostatik.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setWizardOpen(true)} className="inline-flex items-center gap-1.5 rounded-md bg-sidebar-primary px-3.5 py-2 text-xs font-semibold text-sidebar-primary-foreground shadow-xs transition-all hover:bg-sidebar-primary/90">
                + Proyek Baru
              </button>
              <button onClick={() => go(create(uatSample()))} className="rounded-md border border-sidebar-border bg-sidebar-accent/50 px-3 py-2 text-xs font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                Sampel Bendung
              </button>
              <button onClick={() => fileRef.current?.click()} className="rounded-md border border-sidebar-border px-3 py-2 text-xs font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent">
                Impor JSON
              </button>
              {projects.length > 0 && (
                <button onClick={() => exportJson(projects, "semua-proyek-stabilitas.json")} className="rounded-md border border-sidebar-border px-3 py-2 text-xs font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent">
                  Cadangkan
                </button>
              )}
              <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
            </div>
          </div>

          {/* Quick Statistics Bar */}
          {hydrated && totalCount > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-3">
                <div className="text-[11px] font-medium text-sidebar-foreground/60">Total Proyek</div>
                <div className="num mt-1 text-2xl font-bold text-sidebar-accent-foreground">{totalCount}</div>
              </div>
              <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-3">
                <div className="text-[11px] font-medium text-sidebar-foreground/60">Memenuhi Syarat</div>
                <div className="num mt-1 text-2xl font-bold text-success">{passCount}</div>
              </div>
              <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-3">
                <div className="text-[11px] font-medium text-sidebar-foreground/60">Perlu Tinjauan / Kritis</div>
                <div className="num mt-1 text-2xl font-bold text-warning-foreground">{reviewCount}</div>
              </div>
              <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-3">
                <div className="text-[11px] font-medium text-sidebar-foreground/60">Standar Regulasi</div>
                <div className="mt-1 text-sm font-semibold text-sidebar-primary">KP-02 & SNI 8460</div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {!hydrated ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Memuat basis data proyek…</div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-12 text-center shadow-xs">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">📐</div>
            <h2 className="text-base font-bold text-foreground">Belum Ada Proyek Stabilitas</h2>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">Mulai analisis struktur air dengan membuat proyek baru atau membuka sampel benchmark UAT Bendung Panawangan.</p>
            <div className="mt-5 flex justify-center gap-3">
              <button onClick={() => go(create(newProject()))} className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90">
                + Buat Proyek Kosong
              </button>
              <button onClick={() => go(create(uatSample()))} className="rounded-md border border-input bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted">
                Buka Sampel UAT Bendung
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Filter and Search Bar */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: "ALL", label: "Semua Proyek" },
                  { id: "BND", label: "Bendung (BND)" },
                  { id: "DND", label: "Dinding (DND)" },
                  { id: "SLN", label: "Saluran (SLN)" },
                  { id: "BLK", label: "Blok (BLK)" },
                  { id: "TLG", label: "Talang (TLG)" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                      filterType === tab.id
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "border border-input bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}>
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Cari proyek / lokasi…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 rounded-md border border-input bg-card px-3 text-xs outline-none focus:border-primary w-48 sm:w-60"
                />
                <button
                  onClick={() => setViewMode(viewMode === "GRID" ? "TABLE" : "GRID")}
                  className="rounded-md border border-input bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                  title="Ganti tampilan Grid / Tabel">
                  {viewMode === "GRID" ? "Tabel" : "Grid"}
                </button>
              </div>
            </div>

            {/* Grid View of Project Cards */}
            {viewMode === "GRID" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((p) => {
                  const a = analyze(p);
                  const t = typeById(p.type);
                  return (
                    <div key={p.id} className="relative flex flex-col justify-between overflow-hidden rounded-lg border bg-card p-5 shadow-xs transition-all hover:border-primary/50 hover:shadow-md">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="num rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{p.type} · {t.name}</span>
                          <Status s={a.envelope.overall} />
                        </div>
                        <h3 className="mt-3 text-base font-bold tracking-tight text-foreground line-clamp-1">
                          <Link to="/proyek/$id" params={{ id: p.id }} className="hover:text-primary hover:underline">
                            {p.name}
                          </Link>
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{p.location || "Lokasi belum diatur"}{p.kecamatan && ` · Kec. ${p.kecamatan}`}</p>

                        <div className={`mt-4 grid ${a.seepage.enabled ? "grid-cols-4" : "grid-cols-3"} gap-1.5 rounded-md bg-muted/30 p-2.5 text-center`}>
                          <div>
                            <div className="text-[10px] text-muted-foreground">FS Geser</div>
                            <div className={`num font-bold text-xs ${a.envelope.slide?.c.slideOk ? "text-success" : "text-destructive"}`}>
                              {fmt(a.envelope.slide?.c.fsSlide)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground">FS Guling</div>
                            <div className={`num font-bold text-xs ${a.envelope.over?.c.overturnOk ? "text-success" : "text-destructive"}`}>
                              {fmt(a.envelope.over?.c.fsOverturn)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground">q/qizin</div>
                            <div className={`num font-bold text-xs ${(a.envelope.ratio?.value ?? 0) <= 1 ? "text-success" : "text-destructive"}`}>
                              {fmt(a.envelope.ratio?.value)}
                            </div>
                          </div>
                          {a.seepage.enabled && (
                            <div>
                              <div className="text-[10px] text-muted-foreground">Piping</div>
                              <div className={`num font-bold text-xs ${a.seepage.laneOk ? "text-success" : "text-destructive"}`}>
                                {a.seepage.laneOk ? "AMAN" : "BAHAYA"}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
                        <span className="num text-[11px] text-muted-foreground">
                          {new Date(p.updatedAt).toLocaleDateString("id-ID")}
                        </span>
                        <div className="flex gap-2 text-xs">
                          <button onClick={() => duplicate(p.id)} className="text-muted-foreground hover:text-foreground">Duplikat</button>
                          <button onClick={() => exportJson(p, `${p.name}.json`)} className="text-muted-foreground hover:text-foreground">JSON</button>
                          <button onClick={() => confirm(`Hapus proyek "${p.name}"?`) && remove(p.id)} className="text-destructive hover:underline">Hapus</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5">Proyek</th>
                      <th className="px-4 py-2.5">Jenis Struktur</th>
                      <th className="px-4 py-2.5">Lokasi</th>
                      <th className="px-4 py-2.5">FS Geser</th>
                      <th className="px-4 py-2.5">Status Envelope</th>
                      <th className="px-4 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((p) => {
                      const a = analyze(p);
                      return (
                        <tr key={p.id} className="transition-colors hover:bg-muted/30">
                          <td className="px-4 py-3 font-semibold text-foreground">
                            <Link to="/proyek/$id" params={{ id: p.id }} className="hover:text-primary hover:underline">{p.name}</Link>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            <span className="num font-bold text-foreground">{p.type}</span> · {typeById(p.type).name}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{p.kecamatan || "—"}</td>
                          <td className="num px-4 py-3 text-xs font-bold">
                            {fmt(a.envelope.slide?.c.fsSlide)}
                          </td>
                          <td className="px-4 py-3"><Status s={a.envelope.overall} /></td>
                          <td className="px-4 py-3 text-right text-xs">
                            <button className="mr-2 text-muted-foreground hover:text-foreground" onClick={() => duplicate(p.id)}>Duplikat</button>
                            <button className="text-destructive hover:underline" onClick={() => confirm(`Hapus "${p.name}"?`) && remove(p.id)}>Hapus</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        <p className="mt-8 text-xs text-muted-foreground">Penyimpanan aman lokal berbasis peramban (IndexedDB / LocalStorage). Gunakan fitur cadangan JSON untuk arsip jangka panjang.</p>
      </main>

      <NewProjectWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreate={(type, meta) => {
          const p = newProject(type, meta);
          const id = create(p);
          setWizardOpen(false);
          go(id);
        }}
      />
    </div>
  );
}
