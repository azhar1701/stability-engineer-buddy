import { createFileRoute } from "@tanstack/react-router";
import { useProject } from "@/lib/useProject";
import { fmt, Notice, PageHeader, Section } from "@/components/kit";
import { LOAD_CASES, type CaseClass } from "@/lib/engine/master";
import { defaultCases } from "@/lib/engine/defaults";
import type { CaseInput } from "@/lib/engine/types";

export const Route = createFileRoute("/proyek/$id/kasus")({
  head: () => ({ meta: [{ title: "Kasus Beban — Stabilitas Bangunan Air" }] }),
  component: KasusPage,
});

const F: { k: keyof CaseInput; l: string }[] = [
  { k: "fHu", l: "f hu" }, { k: "fHd", l: "f hd" }, { k: "fU", l: "f uplift" }, { k: "fSoil", l: "f tanah" }, { k: "fOtherH", l: "f H lain" }, { k: "fWater", l: "f air" },
];

function KasusPage() {
  const { project: p, result: a, update } = useProject();
  const upd = (id: string, patch: Partial<CaseInput>) => update((x) => ({ ...x, cases: x.cases.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  return (
    <>
      <PageHeader code="25_KASUS_BEBAN · 44_KRITERIA_KASUS" title="Kasus Beban dan Kriteria" desc="Faktor diterapkan pada muka air dan gaya dasar. Kasus yang tidak berlaku untuk jenis bangunan aktif otomatis nonaktif." />
      <Notice>Faktor kasus (selain Normal) adalah skenario sensitivitas, bukan faktor regulatif. Sesuaikan dengan data proyek.</Notice>
      <Section title="Matriks kasus" aside={<button className="text-xs text-primary hover:underline" onClick={() => update((x) => ({ ...x, cases: defaultCases() }))}>Reset ke default</button>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr>
              <th className="p-1">Aktif</th><th className="p-1">ID</th><th className="p-1">Kasus</th><th className="p-1">Kelas</th>
              {F.map((f) => <th key={f.k} className="p-1">{f.l}</th>)}
              <th className="p-1">FS geser min</th><th className="p-1">FS guling min</th>
            </tr></thead>
            <tbody>
              {p.cases.map((c, i) => {
                const r = a.cases[i];
                const def = LOAD_CASES.find((d) => d.id === c.id);
                return (
                  <tr key={c.id} className={"border-t " + (r.applies ? "" : "opacity-45")}>
                    <td className="p-1"><input type="checkbox" checked={c.active} disabled={!r.applies} onChange={(e) => upd(c.id, { active: e.target.checked })} /></td>
                    <td className="num p-1 text-xs">{c.id}</td>
                    <td className="p-1">{c.name}<div className="text-[11px] text-muted-foreground">{r.applies ? def?.note : "Tidak berlaku untuk jenis ini"}</div></td>
                    <td className="p-1">
                      <select className="h-8 rounded-sm border bg-card px-1 text-xs" value={c.cls} onChange={(e) => upd(c.id, { cls: e.target.value as CaseClass })}>
                        {["NORMAL", "SEMENTARA", "EKSTREM"].map((x) => <option key={x}>{x}</option>)}
                      </select>
                    </td>
                    {F.map((f) => (
                      <td key={f.k} className="w-20 p-1"><input type="number" step="0.05" className="num h-8 w-full rounded-sm border border-input bg-card px-1 text-sm" value={c[f.k] as number} onChange={(e) => upd(c.id, { [f.k]: parseFloat(e.target.value) || 0 })} /></td>
                    ))}
                    <td className="num p-1 text-right">{fmt(r.fsSlideMin)}</td>
                    <td className="num p-1 text-right">{fmt(r.fsOverturnMin)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
