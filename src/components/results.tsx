import type { analyze } from "@/lib/engine/compute";
import { fmt, Status, Table } from "./kit";

type A = ReturnType<typeof analyze>;

export function CaseTable({ a }: { a: A }) {
  const on = a.cases.filter((c) => c.status !== "TIDAK AKTIF");
  return (
    <Table
      head={["Kasus", "N kN", "H kN", "FS geser", "min", "FS guling", "min", "e m", "Rezim", "q maks kPa", "q/qizin", "Status"]}
      rowClassNames={on.map((c) =>
        !c.slideOk || !c.overturnOk || c.qRatio > 1 || c.status === "TIDAK MEMENUHI"
          ? "bg-destructive/5 hover:bg-destructive/10"
          : undefined
      )}
      rows={on.map((c) => {
        const isCritical = !c.slideOk || !c.overturnOk || c.qRatio > 1 || c.status === "TIDAK MEMENUHI";
        return [
          <span className="flex items-center gap-1.5 font-medium">
            {isCritical && <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" title="Kasus tidak memenuhi kriteria" />}
            <span className="num text-xs text-muted-foreground">{c.id}</span>
            <span>{c.name}</span>
          </span>,
          <span className="num">{fmt(c.N)}</span>, <span className="num">{fmt(c.H)}</span>,
          <span className={"num " + (c.slideOk ? "text-success font-semibold" : "font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded")}>{fmt(c.fsSlide)}</span>, <span className="num text-muted-foreground">{fmt(c.fsSlideMin)}</span>,
          <span className={"num " + (c.overturnOk ? "text-success font-semibold" : "font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded")}>{fmt(c.fsOverturn)}</span>, <span className="num text-muted-foreground">{fmt(c.fsOverturnMin)}</span>,
          <span className="num">{fmt(c.e, 3)}</span>, <Status s={c.regime} />,
          <span className="num">{fmt(c.qMax, 1)}</span>, <span className={"num " + (c.qRatio > 1 ? "font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded" : "")}>{fmt(c.qRatio)}</span>,
          <Status s={c.status} />,
        ];
      })}
    />
  );
}

export function EnvelopeTable({ a }: { a: A }) {
  const e = a.envelope;
  const lim = a.B / 6;
  return (
    <Table head={["Metrik", "Nilai governing", "Kriteria", "Kasus governing", "Status"]}
      rows={[
        ["FS geser", <span className="num">{fmt(e.slide?.c.fsSlide)}</span>, <span className="num">≥ {fmt(e.slide?.c.fsSlideMin)}</span>, e.slide?.caseName ?? "—", <Status s={e.slide ? (e.slide.c.slideOk ? "MEMENUHI" : "TIDAK MEMENUHI") : "T/A"} />],
        ["FS guling", <span className="num">{fmt(e.over?.c.fsOverturn)}</span>, <span className="num">≥ {fmt(e.over?.c.fsOverturnMin)}</span>, e.over?.caseName ?? "—", <Status s={e.over ? (e.over.c.overturnOk ? "MEMENUHI" : "TIDAK MEMENUHI") : "T/A"} />],
        ["|e| maksimum", <span className="num">{fmt(e.ecc?.value, 3)} m</span>, <span className="num">≤ B/6 = {fmt(lim, 3)}</span>, e.ecc?.caseName ?? "—", <Status s={e.ecc ? (e.ecc.value <= lim ? "MEMENUHI" : "PERLU TINJAU") : "T/A"} />],
        ["q maksimum", <span className="num">{fmt(e.q?.value, 1)} kPa</span>, <span className="num">≤ {fmt(a.bearing.qa, 1)}</span>, e.q?.caseName ?? "—", <Status s={e.ratio ? (e.ratio.value <= 1 ? "MEMENUHI" : "TIDAK MEMENUHI") : "T/A"} />],
        ["Status envelope", "", "", "", <Status s={e.overall} />],
      ]} />
  );
}
