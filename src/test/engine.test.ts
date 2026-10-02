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
    const f = a.cases[0]!.forces.find((x) => x.id === "HYDRO_UP")!;
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

  it("analisis rembesan Lane dan Bligh untuk bendung dengan cutoff", () => {
    const pSeep = { ...p, seepage: { enabled: true, dCutoffUp: 1.5, dCutoffDown: 2.0, soilType: "PASIR_KASAR" } };
    const aSeep = analyze(pSeep);
    expect(aSeep.seepage.enabled).toBe(true);
    // Lv = 2*1.5 + 2*2 = 7.0, Lh = 6.0, LcreepLane = 7.0 + 6.0/3 = 9.0
    expect(aSeep.seepage.Lv).toBeCloseTo(7.0);
    expect(aSeep.seepage.LcreepLane).toBeCloseTo(9.0);
    // deltaH = 2.5 - 0.8 = 1.7
    expect(aSeep.seepage.deltaH).toBeCloseTo(1.7);
    expect(aSeep.seepage.Cw).toBeCloseTo(9.0 / 1.7, 2);
    expect(aSeep.seepage.laneOk).toBe(true);
  });

  it("hidraulika pelimpah mercu bendung (Weir Crest Ogee)", () => {
    const pWeir = {
      ...p,
      hydraulics: { ...p.hydraulics, method: "WEIR_CREST" as const, pMercu: 2.0, Cd: 2.1, beff: 5 },
      hydrology: { ...p.hydrology, Q: 10 },
    };
    const aWeir = analyze(pWeir);
    // He = (10 / (2.1 * 5))^(2/3) = (10 / 10.5)^(2/3) = (0.95238)^(2/3) ~ 0.968 m
    // hu = 2.0 + 0.968 = 2.968 m
    expect(aWeir.wl.hu).toBeCloseTo(2.0 + Math.pow(10 / (2.1 * 5), 2 / 3), 2);
  });

  it("inersia gempa pseudostatik (k_h * W)", () => {
    const pEq = {
      ...p,
      seismic: { enabled: true, kh: 0.15, kv: 0 },
    };
    const aEq = analyze(pEq);
    const eqCase = aEq.cases.find((c) => c.id === "LC09")!;
    expect(eqCase).toBeDefined();
    const fSeis = eqCase.forces.find((f) => f.id === "SEIS_H")!;
    expect(fSeis).toBeDefined();
    expect(fSeis.F).toBeCloseTo(0.15 * aEq.W);
    expect(fSeis.arm).toBeCloseTo(aEq.Zc_total);
  });
});
