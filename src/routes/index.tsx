import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { useHydrated, useStore, uatSample, newProject } from "@/lib/store";
import { analyze } from "@/lib/engine/compute";
import { typeById } from "@/lib/engine/master";
import { Status } from "@/components/kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Daftar Proyek — Stabilitas Bangunan Air" },
      { name: "description", content: "Kelola proyek analisis stabilitas bendung, saluran, dinding, blok gravitasi, dan talang irigasi." },
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

  return (
    <div className="min-h-screen">
      <header className="bg-sidebar text-sidebar-foreground">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="num text-xs text-sidebar-primary">KP-02 · SNI 8460:2017 · Kabupaten Ciamis</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-sidebar-accent-foreground">Stabilitas Bangunan Air</h1>
          <p className="mt-2 max-w-2xl text-sm">Analisis geser, guling, eksentrisitas, dan daya dukung untuk bendung, saluran, dinding penahan, blok gravitasi, dan talang irigasi.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button onClick={() => go(create(newProject()))} className="rounded-sm bg-sidebar-primary px-4 py-2 text-sm font-medium text-sidebar-primary-foreground">+ Proyek baru</button>
            <button onClick={() => go(create(uatSample()))} className="rounded-sm border border-sidebar-border px-4 py-2 text-sm hover:bg-sidebar-accent">Muat sampel UAT bendung</button>
            <button onClick={() => fileRef.current?.click()} className="rounded-sm border border-sidebar-border px-4 py-2 text-sm hover:bg-sidebar-accent">Impor JSON</button>
            {projects.length > 0 && <button onClick={() => exportJson(projects, "semua-proyek.json")} className="rounded-sm border border-sidebar-border px-4 py-2 text-sm hover:bg-sidebar-accent">Ekspor semua</button>}
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        {!hydrated ? <p className="text-sm text-muted-foreground">Memuat…</p> : projects.length === 0 ? (
          <div className="rounded-md border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">Belum ada proyek. Buat proyek baru atau muat sampel UAT untuk mencoba.</div>
        ) : (
          <div className="overflow-hidden rounded-md border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-2">Proyek</th><th className="px-4 py-2">Jenis</th><th className="px-4 py-2">Lokasi</th><th className="px-4 py-2">Status envelope</th><th className="px-4 py-2">Diubah</th><th /></tr></thead>
              <tbody>
                {projects.map((p) => {
                  const a = analyze(p);
                  return (
                    <tr key={p.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3"><Link to="/proyek/$id" params={{ id: p.id }} className="font-medium text-primary hover:underline">{p.name}</Link></td>
                      <td className="px-4 py-3"><span className="num text-xs">{p.type}</span> {typeById(p.type).name}</td>
                      <td className="px-4 py-3">{p.kecamatan || "—"}</td>
                      <td className="px-4 py-3"><Status s={a.envelope.overall} /></td>
                      <td className="num px-4 py-3 text-xs text-muted-foreground">{new Date(p.updatedAt).toLocaleString("id-ID")}</td>
                      <td className="px-4 py-3 text-right text-xs">
                        <button className="mr-3 hover:underline" onClick={() => duplicate(p.id)}>Duplikat</button>
                        <button className="mr-3 hover:underline" onClick={() => exportJson(p, `${p.name}.json`)}>JSON</button>
                        <button className="text-destructive hover:underline" onClick={() => confirm(`Hapus "${p.name}"?`) && remove(p.id)}>Hapus</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-6 text-xs text-muted-foreground">Data tersimpan di browser ini. Gunakan ekspor JSON untuk cadangan.</p>
      </main>
    </div>
  );
}
