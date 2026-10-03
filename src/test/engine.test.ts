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

  it("sinkronisasi nama kecamatan toleran huruf kecil dan spasi", () => {
    const pLower = { ...p, kecamatan: "  panawangan  " };
    const aLower = analyze(pLower);
    expect(aLower.soil.profileId).toBe("RESIDUAL_VULKANIK");
    expect(aLower.soil.gamma).toBe(18);
    expect(aLower.readiness.find((r) => r.step === "proyek" && r.label.includes("kecamatan"))?.ok).toBe(true);
  });

  it("titik berat uplift trapesium dan segitiga terbukti analitis", () => {
    // Pada uatSample: hu = 2.5, hd = 0.8, B = 6. pu = 9.81*2.5 = 24.525, pd = 9.81*0.8 = 7.848
    const fUplift = a.cases[0]!.forces.find((f) => f.id === "UPLIFT")!;
    expect(fUplift).toBeDefined();
    const pu = 9.81 * 2.5;
    const pd = 9.81 * 0.8;
    const expectedXFromHeel = (6 / 3) * ((pu + 2 * pd) / (pu + pd));
    const expectedArmToe = 6 - expectedXFromHeel;
    expect(fUplift.arm).toBeCloseTo(expectedArmToe, 4);

    // Kasus pengeringan hilir (segitiga murni: pd = 0)
    const pDryDown = { ...p, hydraulics: { ...p.hydraulics, hu: 3, hd: 0 } };
    const aDry = analyze(pDryDown);
    const fUpliftDry = aDry.cases[0]!.forces.find((f) => f.id === "UPLIFT")!;
    // Jika pd = 0, titik berat dari heel adalah B/3 = 2m, lengan ke toe adalah 6 - 2 = 4m
    expect(fUpliftDry.arm).toBeCloseTo(4.0, 4);
  });

  it("gaya hidrodinamis gempa hulu Westergaard (KP-02 Bagian 4.4)", () => {
    const pEq = {
      ...p,
      seismic: { enabled: true, kh: 0.12, kv: 0 },
    };
    const aEq = analyze(pEq);
    const eqCase = aEq.cases.find((c) => c.id === "LC09")!;
    const fWest = eqCase.forces.find((f) => f.id === "SEIS_HYDRO")!;
    expect(fWest).toBeDefined();
    // Pew = (7/12) * kh * gamma_w * hu^2 * L * fEq = (7/12) * 0.12 * 9.81 * 2.5^2 * 1 * 1
    const expectedPew = (7 / 12) * 0.12 * 9.81 * 2.5 * 2.5 * 1 * 1;
    expect(fWest.F).toBeCloseTo(expectedPew, 3);
    // Arm = 0.4 * hu = 0.4 * 2.5 = 1.0 m
    expect(fWest.arm).toBeCloseTo(0.4 * 2.5, 3);
  });

  it("titik berat trapesium lereng hilir (sisi tegak hulu, miring hilir)", () => {
    const comp = componentProps(
      { id: "test", name: "Tubuh Bendung", shape: "TRAPESIUM_LERENG_HILIR", b1: 4, b2: 1, h: 3, x0: 0, z0: 0, material: "Beton bertulang" },
      1,
      6
    );
    expect(comp.A).toBeCloseTo(0.5 * (4 + 1) * 3); // 7.5 m²
    // xl = (b1^2 + b1*b2 + b2^2) / (3 * (b1 + b2)) = (16 + 4 + 1) / (3 * 5) = 21 / 15 = 1.4 m
    expect(comp.xc).toBeCloseTo(1.4, 4);
    // zl = h * (b1 + 2*b2) / (3 * (b1 + b2)) = 3 * (4 + 2) / (3 * 5) = 6 / 5 = 1.2 m
    expect(comp.zc).toBeCloseTo(1.2, 4);
  });

  it("lengan momen surcharge tanah lateral terhitung lebih tinggi dari H/3", () => {
    const pDnd = {
      ...p,
      type: "DND" as const,
      Hsoil: 4,
      earth: { mode: "RANKINE AKTIF" as const, K: 0.33, surcharge: 10, hWaterSoil: 0 },
    };
    const aDnd = analyze(pDnd);
    const fSoil = aDnd.cases[0]!.forces.find((f) => f.id === "LAT_SOIL")!;
    expect(fSoil).toBeDefined();
    // Dengan adanya beban merata surcharge 10 kPa, titik tangkap resultan harus > H/3 (yaitu > 1.333 m)
    expect(fSoil.arm).toBeGreaterThan(4 / 3);
    expect(fSoil.arm).toBeLessThan(4 / 2);
  });

  it("analisis rembesan memperhitungkan apron hulu dan hilir (Lh = Lu + B + Ld)", () => {
    const pApron = {
      ...p,
      seepage: { enabled: true, dCutoffUp: 1.0, dCutoffDown: 1.5, lApronUp: 3.0, lApronDown: 5.0, soilType: "PASIR_SEDANG" },
    };
    const aApron = analyze(pApron);
    // Lh = 3.0 + 6.0 + 5.0 = 14.0 m
    expect(aApron.seepage.Lh).toBeCloseTo(14.0);
    // Lv = 2*1.0 + 2*1.5 = 5.0 m
    expect(aApron.seepage.Lv).toBeCloseTo(5.0);
    // LcreepLane = 5.0 + 14.0 / 3 = 9.667 m
    expect(aApron.seepage.LcreepLane).toBeCloseTo(5.0 + 14.0 / 3, 3);
  });
});
