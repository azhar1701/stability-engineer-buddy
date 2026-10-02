import { describe, it, expect } from "vitest";
import { analyze, componentProps } from "@/lib/engine/compute";
import { uatSample } from "@/lib/engine/defaults";

describe("mesin stabilitas — sampel UAT bendung", () => {
  const p = uatSample();
  const a = analyze(p);
  it("berat sendiri = 13 m² × 23.53 kN/m³", () => {
    expect(a.W).toBeCloseTo(13 * 23.53, 4);
  });
  it("titik berat trapesium simetris", () => {
    const c = componentProps(p.components[1]!, 1, 6);
    expect(c.A).toBeCloseTo(6);
    expect(c.zc).toBeCloseTo(1 + (2 * (4 + 4)) / (3 * 6));
  });
  it("hidrostatik hulu kasus normal = ½γw hu²", () => {
    const f = a.cases[0].forces.find((x) => x.id === "HYDRO_UP")!;
    expect(f.F).toBeCloseTo(0.5 * 9.81 * 2.5 * 2.5);
  });
  it("tanah penapisan Panawangan = residual vulkanik", () => {
    expect(a.soil.profileId).toBe("RESIDUAL_VULKANIK");
    expect(a.soil.mu).toBe(0.5);
  });
  it("kesetimbangan momen konsisten: a = (Mr−Mo)/N", () => {
    const c = a.cases[0]!;
    expect(c.a).toBeCloseTo((c.Mr - c.Mo) / c.N);
    expect(c.fsSlide).toBeCloseTo(c.R / c.H);
  });
  it("kasus talang tidak berlaku untuk bendung", () => {
    expect(a.cases.find((c) => c.id === "LC06")!.status).toBe("TIDAK AKTIF");
  });
});
