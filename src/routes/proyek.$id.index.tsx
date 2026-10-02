import { createFileRoute, Link } from "@tanstack/react-router";
import { useProject } from "@/lib/useProject";
import { Grid, NumField, PageHeader, Section, SelectField, Status, TextField, Notice } from "@/components/kit";
import { KECAMATAN, TYPES, typeById, type ForceKey, type Switch, type TypeId } from "@/lib/engine/master";
import { componentsFor } from "@/lib/engine/defaults";
import { forceActive } from "@/lib/engine/compute";

export const Route = createFileRoute("/proyek/$id/")({
  head: () => ({ meta: [{ title: "Pengaturan Proyek — Stabilitas Bangunan Air" }] }),
  component: ProyekPage,
});

const FORCE_LABEL: Record<ForceKey, string> = {
  hydroUp: "Hidrostatik hulu", hydroDown: "Hidrostatik hilir", uplift: "Gaya angkat (uplift)", soilLat: "Tekanan tanah lateral", waterWeight: "Berat air dalam talang",
};
const STEP_PATH = { proyek: "/proyek/$id", geometri: "/proyek/$id/geometri", hidraulika: "/proyek/$id/hidraulika", tanah: "/proyek/$id/tanah", gaya: "/proyek/$id/gaya" } as const;

function ProyekPage() {
  const { project: p, result: a, set, update } = useProject();
  const t = typeById(p.type);
  const changeType = (type: TypeId) => {
    const hasGeom = p.components.some((c) => c.b1 > 0 || c.h > 0);
    update((x) => ({ ...x, type, components: hasGeom ? x.components : componentsFor(type) }));
  };
  return (
    <>
      <PageHeader code="01_PROYEK · 03_PROFIL_AKTIF" title="Pengaturan Proyek & Kesiapan Input" desc="Sakelar utama jenis bangunan menentukan komponen geometri, gaya aktif, kasus beban yang berlaku, dan kriteria FS." />
      <Section title="Identitas">
        <Grid>
          <TextField label="Nama proyek" value={p.name} onChange={(v) => set("name", v)} />
          <TextField label="Lokasi / ruas" value={p.location} onChange={(v) => set("location", v)} />
          <TextField label="Engineer" value={p.engineer} onChange={(v) => set("engineer", v)} />
          <SelectField label="Kecamatan (Kab. Ciamis)" value={p.kecamatan} options={[{ value: "", label: "— pilih —" }, ...Object.keys(KECAMATAN).map((k) => ({ value: k, label: k }))]} onChange={(v) => set("kecamatan", v)} />
          <TextField label="Desa / Kelurahan" value={p.desa} onChange={(v) => set("desa", v)} />
        </Grid>
      </Section>
      <Section title="Jenis bangunan & mode analisis">
        <Grid>
          <SelectField label="Jenis bangunan" value={p.type} options={TYPES.map((x) => ({ value: x.id, label: `${x.id} — ${x.name}` }))} onChange={changeType} hint={t.note} />
          <SelectField label="Mode analisis" value={p.analysisMode} options={["SELURUH BANGUNAN", "PER-METER"] as const} onChange={(v) => set("analysisMode", v)} />
          <NumField label="Lebar aktual bangunan" unit="m" value={p.actualWidth} onChange={(v) => set("actualWidth", v)} hint={`Lebar analisis efektif: ${a.L} m`} />
          <NumField label="Lebar dasar fondasi B" unit="m" value={p.B} onChange={(v) => set("B", v)} />
          <NumField label="Kedalaman fondasi Df" unit="m" value={p.Df} onChange={(v) => set("Df", v)} />
          <NumField label="Tinggi tanah tertahan H" unit="m" value={p.Hsoil} onChange={(v) => set("Hsoil", v)} />
        </Grid>
      </Section>
      <Section title="Sakelar gaya (24_GAYA_MOMEN)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(FORCE_LABEL) as ForceKey[]).map((k) => (
            <div key={k} className="flex items-end gap-2">
              <div className="flex-1"><SelectField label={FORCE_LABEL[k]} value={p.switches[k]} options={["OTOMATIS", "YA", "TIDAK"] as Switch[]} onChange={(v) => update((x) => ({ ...x, switches: { ...x.switches, [k]: v } }))} /></div>
              <div className="pb-2"><Status s={forceActive(p, k) ? "AKTIF" : "T/A"} /></div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Kriteria FS minimum">
        <Grid>
          <SelectField label="Mode kriteria" value={p.criteriaMode} options={[{ value: "PER KASUS", label: "PER KASUS — KP-02 (Normal 1.0 / Sementara 0.9 / Ekstrem 0.8)" }, { value: "SERAGAM", label: "SERAGAM" }] as const} onChange={(v) => set("criteriaMode", v)} />
          <SelectField label="Sumber FS" value={p.fsOverride.enabled ? "OVERRIDE" : "MASTER"} options={[{ value: "MASTER", label: `Master jenis (geser ${t.fsSlide}, guling ${t.fsOverturn})` }, { value: "OVERRIDE", label: "Override proyek" }]} onChange={(v) => update((x) => ({ ...x, fsOverride: { ...x.fsOverride, enabled: v === "OVERRIDE" } }))} />
          {p.fsOverride.enabled && <>
            <NumField label="FS geser" value={p.fsOverride.slide} onChange={(v) => update((x) => ({ ...x, fsOverride: { ...x.fsOverride, slide: v } }))} />
            <NumField label="FS guling" value={p.fsOverride.overturn} onChange={(v) => update((x) => ({ ...x, fsOverride: { ...x.fsOverride, overturn: v } }))} />
          </>}
        </Grid>
      </Section>
      <Section title="Analisis Gempa Pseudostatik (SNI 1726 / KP-02)">
        <div className="mb-3 flex items-center gap-2">
          <input type="checkbox" id="seismic-toggle" checked={p.seismic?.enabled ?? false} onChange={(e) => patch("seismic", { enabled: e.target.checked, kh: p.seismic?.kh ?? 0.12, kv: p.seismic?.kv ?? 0 })} />
          <label htmlFor="seismic-toggle" className="text-sm font-medium">Aktifkan gaya inersia gempa (Feq = kh · W)</label>
        </div>
        {p.seismic?.enabled && (
          <Grid>
            <NumField label="Koefisien percepatan horizontal kh" value={p.seismic.kh} onChange={(v) => patch("seismic", { kh: v })} hint="Wilayah Jawa Barat / Ciamis: 0.10 - 0.15" />
            <NumField label="Koefisien percepatan vertikal kv" value={p.seismic.kv} onChange={(v) => patch("seismic", { kv: v })} hint="Opsional, umum diambil 0 atau 0.5 kh" />
          </Grid>
        )}
      </Section>
      <Section title="Kesiapan input (requirement engine)" aside={<Status s={a.ready ? "LENGKAP" : "BELUM LENGKAP"} />}>
        {!a.ready && <Notice>Hasil stabilitas berstatus BELUM LENGKAP sampai semua item WAJIB terpenuhi.</Notice>}
        <ul className="divide-y text-sm">
          {a.readiness.map((r) => (
            <li key={r.label} className="flex items-center justify-between gap-3 py-2">
              <div>
                <span className={r.required ? "" : "text-muted-foreground"}>{r.label}</span>
                <span className="num ml-2 text-[11px] text-muted-foreground">{r.required ? "WAJIB" : "KONDISIONAL"}</span>
                {r.note && <div className="text-xs text-muted-foreground">{r.note}</div>}
              </div>
              <div className="flex items-center gap-3">
                {!r.ok && STEP_PATH[r.step as keyof typeof STEP_PATH] && <Link to={STEP_PATH[r.step as keyof typeof STEP_PATH]} params={{ id: p.id }} className="text-xs text-primary hover:underline">Lengkapi →</Link>}
                <Status s={r.ok ? "LENGKAP" : r.required ? "BELUM LENGKAP" : "PERHATIAN"} />
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
