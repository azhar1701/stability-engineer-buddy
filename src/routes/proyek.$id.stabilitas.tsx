import { createFileRoute } from "@tanstack/react-router";
import { useProject } from "@/lib/useProject";
import { fmt, Notice, PageHeader, Section, Status } from "@/components/kit";
import { CaseTable, EnvelopeTable } from "@/components/results";

export const Route = createFileRoute("/proyek/$id/stabilitas")({
  head: () => ({ meta: [{ title: "Stabilitas & Envelope — Stabilitas Bangunan Air" }] }),
  component: StabPage,
});

function StabPage() {
  const { result: a } = useProject();
  const e = a.envelope;
  const card = (label: string, v: string, sub: string, ok: boolean | null) => (
    <div className={"rounded-md border bg-card p-4 " + (ok === false ? "border-destructive" : "")}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={"num mt-1 text-2xl font-semibold " + (ok === false ? "text-destructive" : ok ? "text-success" : "")}>{v}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
  return (
    <>
      <PageHeader code="26_STABILITAS · 27_ENVELOPE" title="Pemeriksaan Stabilitas & Envelope" desc="FS geser = R/H; FS guling = ΣMr/ΣMo; a = (ΣMr−ΣMo)/N dari toe; e = B/2 − a. Kontak parsial: qmax = 2N/(3a·L)." />
      {!a.ready && <Notice>Input wajib belum lengkap — status hasil BELUM LENGKAP.</Notice>}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {card("FS geser governing", fmt(e.slide?.c.fsSlide), e.slide ? `${e.slide.caseName} · min ${fmt(e.slide.c.fsSlideMin)}` : "—", e.slide ? e.slide.c.slideOk : null)}
        {card("FS guling governing", fmt(e.over?.c.fsOverturn), e.over ? `${e.over.caseName} · min ${fmt(e.over.c.fsOverturnMin)}` : "—", e.over ? e.over.c.overturnOk : null)}
        {card("|e| maks", fmt(e.ecc?.value, 3) + " m", `B/6 = ${fmt(a.B / 6, 3)} m`, e.ecc ? e.ecc.value <= a.B / 6 : null)}
        {card("qmax / qizin", fmt(e.ratio?.value), `qizin = ${fmt(a.bearing.qa, 1)} kPa`, e.ratio ? e.ratio.value <= 1 : null)}
      </div>
      <Section title="Envelope" aside={<Status s={e.overall} />}><EnvelopeTable a={a} /></Section>
      <Section title="Hasil per kasus beban"><CaseTable a={a} /></Section>
    </>
  );
}
