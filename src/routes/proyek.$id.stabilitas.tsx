import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useProject } from "@/lib/useProject";
import { fmt, Notice, PageHeader, Section, Status, StepNav } from "@/components/kit";
import { CaseTable, EnvelopeTable } from "@/components/results";
import { SoilReactionCanvas } from "@/components/SoilReactionCanvas";

export const Route = createFileRoute("/proyek/$id/stabilitas")({
  head: () => ({ meta: [{ title: "Stabilitas & Envelope — Stabilitas Bangunan Air" }] }),
  component: StabPage,
});

function StabPage() {
  const { project: p, result: a } = useProject();
  const e = a.envelope;
  const activeCases = a.cases.filter((c) => c.status !== "TIDAK AKTIF");
  const [selectedCaseId, setSelectedCaseId] = useState<string>(activeCases[0]?.id ?? "LC01");
  const currentCase = activeCases.find((c) => c.id === selectedCaseId) ?? activeCases[0] ?? a.cases[0]!;

  const card = (label: string, v: string, sub: string, ok: boolean | null, code: string) => (
    <div className={"relative overflow-hidden rounded-lg border bg-card p-4 shadow-xs transition-all hover:shadow-sm " + (ok === false ? "border-destructive/60 bg-destructive/5" : "border-border")}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="num text-[10px] text-muted-foreground/80">{code}</span>
      </div>
      <div className={"num mt-1.5 text-2xl font-bold tracking-tight " + (ok === false ? "text-destructive" : ok ? "text-success" : "text-foreground")}>{v}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      {/* Decorative accent bar at card bottom */}
      <div className={"absolute bottom-0 left-0 right-0 h-1 " + (ok === false ? "bg-destructive" : ok ? "bg-success" : "bg-muted")} />
    </div>
  );

  return (
    <>
      <PageHeader code="26_STABILITAS · 27_ENVELOPE" title="Pemeriksaan Stabilitas & Envelope" desc="Pemeriksaan faktor keamanan terhadap geser (FS geser ≥ min), guling (FS guling ≥ min), eksentrisitas resultan (|e| ≤ B/6), dan rasio tegangan kontak dasar tanah terhadap daya dukung izin." />
      {!a.ready && <Notice tone="destructive">Input wajib belum lengkap — status hasil BELUM LENGKAP.</Notice>}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {card("FS Geser Governing", fmt(e.slide?.c.fsSlide), e.slide ? `${e.slide.caseName} · min ${fmt(e.slide.c.fsSlideMin)}` : "—", e.slide ? e.slide.c.slideOk : null, "R / H")}
        {card("FS Guling Governing", fmt(e.over?.c.fsOverturn), e.over ? `${e.over.caseName} · min ${fmt(e.over.c.fsOverturnMin)}` : "—", e.over ? e.over.c.overturnOk : null, "ΣMr / ΣMo")}
        {card("|e| Maksimum", fmt(e.ecc?.value, 3) + " m", `B/6 = ${fmt(a.B / 6, 3)} m`, e.ecc ? e.ecc.value <= a.B / 6 : null, "B/2 − a")}
        {card("Rasio qmax / qizin", fmt(e.ratio?.value), `qizin = ${fmt(a.bearing.qa, 1)} kPa`, e.ratio ? e.ratio.value <= 1 : null, "SNI 8460")}
      </div>

      {/* Interactive Soil Reaction Diagram */}
      <Section title="Diagram Interaktif Tegangan Tanah Dasar Fondasi"
        aside={
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">Pilih Kasus:</span>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="h-7 rounded-md border border-input bg-card px-2 text-xs font-medium text-foreground outline-none focus:border-primary">
              {activeCases.map((c) => (
                <option key={c.id} value={c.id}>{c.id} — {c.name}</option>
              ))}
            </select>
          </div>
        }>
        <SoilReactionCanvas c={currentCase} B={a.B} qa={a.bearing.qa} />
      </Section>

      <Section title="Ringkasan Envelope Kasus Kritis" aside={<Status s={e.overall} />}><EnvelopeTable a={a} /></Section>
      <Section title="Hasil Lengkap Per Kasus Pembebanan"><CaseTable a={a} /></Section>

      <StepNav
        prev={{ to: "/proyek/$id/kasus", label: "07. Kasus Beban" }}
        next={{ to: "/proyek/$id/daya-dukung", label: "09. Daya Dukung Fondasi" }}
        projectId={p.id}
      />
    </>
  );
}
