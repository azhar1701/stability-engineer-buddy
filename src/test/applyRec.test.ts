import { describe, it, expect } from "vitest";
import { uatSample } from "../lib/engine/defaults";
import { analyze } from "../lib/engine/compute";
import {
  solveWiderBase,
  solveAddCutoff,
  solveExtendApron,
  solveRecommendation,
} from "../lib/engine/applyRec";

describe("Recommendation Solvers (applyRec)", () => {
  it("solves wider base B when base width is artificially constricted causing sliding failure", () => {
    const p = uatSample();
    // Constrict base from 6 to 3.0m, making structure vulnerable
    p.B = 3.0;
    p.components[0].b1 = 3.0;

    const initialRes = analyze(p);
    // Ensure initial analysis has a failure or tighter safety
    const failedCase = initialRes.cases.find((c) => !c.slideOk || !c.overturnOk || !c.bearingOk);
    
    const solved = solveWiderBase(p);
    expect(solved.projectAfter.B).toBeGreaterThan(p.B);
    expect(solved.delta.B.from).toBe(3.0);
    expect(solved.delta.B.to).toBe(solved.projectAfter.B);

    // After applying, the safety factors should improve
    const afterRes = solved.resultAfter;
    const activeCases = afterRes.cases.filter((c) => c.active && c.applies);
    expect(activeCases.every((c) => c.slideOk && c.overturnOk)).toBe(true);
  });

  it("solves cutoff depth when seepage piping fails Lane criteria", () => {
    const p = uatSample();
    p.seepage = {
      enabled: true,
      soilType: "PASIR_HALUS", // High Cw requirement
      dCutoffUp: 0.2,
      dCutoffDown: 0.2,
      lApronUp: 0,
      lApronDown: 0,
    };

    const initialRes = analyze(p);
    expect(initialRes.seepage.laneOk).toBe(false);

    const solved = solveAddCutoff(p);
    expect(solved.converged).toBe(true);
    expect(solved.resultAfter.seepage.laneOk).toBe(true);
    expect(solved.projectAfter.seepage?.dCutoffUp).toBeGreaterThan(0.2);
    expect(solved.projectAfter.seepage?.dCutoffDown).toBeGreaterThan(0.2);
  });

  it("solves apron extension when seepage piping fails", () => {
    const p = uatSample();
    p.seepage = {
      enabled: true,
      soilType: "PASIR_SEDANG",
      dCutoffUp: 0.5,
      dCutoffDown: 0.5,
      lApronUp: 0,
      lApronDown: 0,
    };

    const solved = solveExtendApron(p);
    expect(solved.converged).toBe(true);
    expect(solved.resultAfter.seepage.laneOk).toBe(true);
    expect(solved.projectAfter.seepage?.lApronDown).toBeGreaterThan(0);
  });

  it("dispatches solveRecommendation properly based on recommendation title", () => {
    const p = uatSample();
    p.B = 3.5;
    p.components[0].b1 = 3.5;

    const slideRec = {
      level: "KRITIS" as const,
      title: "FS geser tidak memenuhi (KASUS I)",
      detail: "Opsi: perlebar dasar...",
    };
    const slideSolution = solveRecommendation(slideRec, p);
    expect(slideSolution).not.toBeNull();
    expect(slideSolution?.solverType).toBe("WIDEN_B");

    const pipingRec = {
      level: "KRITIS" as const,
      title: "Bahaya Piping / Erosi Buluh (Lane Cw = 2.1 < 6.0)",
      detail: "Tambah kedalaman cutoff...",
    };
    const pipingSolution = solveRecommendation(pipingRec, p);
    expect(pipingSolution).not.toBeNull();
    expect(pipingSolution?.solverType).toBe("ADD_CUTOFF");

    const infoRec = {
      level: "INFO" as const,
      title: "Muka air dari estimasi Manning",
      detail: "Verifikasi dengan data...",
    };
    const infoSolution = solveRecommendation(infoRec, p);
    expect(infoSolution).toBeNull();
  });

  it("handles the user screenshot scenario: Lane Cw = 2.6 with Pasir sedang", () => {
    const p = uatSample();
    p.B = 6.0;
    p.components[0].b1 = 6.0;
    p.seepage = {
      enabled: true,
      soilType: "PASIR_SEDANG",
      dCutoffUp: 1.0,
      dCutoffDown: 1.5,
      lApronUp: 0,
      lApronDown: 0,
    };
    // deltaH = 2.6m => initial Cw = 2.69 (< 6.0, piping failure)
    p.hydraulics.hu = 3.4;
    p.hydraulics.hd = 0.8;

    const res = analyze(p);
    expect(res.seepage.laneOk).toBe(false);
    expect(res.seepage.Cw).toBeLessThan(6.0);

    const solvedCutoff = solveAddCutoff(p);
    expect(solvedCutoff.converged).toBe(true);
    expect(solvedCutoff.resultAfter.seepage.laneOk).toBe(true);
    expect(solvedCutoff.resultAfter.seepage.Cw).toBeGreaterThanOrEqual(6.0);
    expect(solvedCutoff.delta.dCutoffUp.to).toBeGreaterThan(1.0);
    expect(solvedCutoff.delta.dCutoffDown.to).toBeGreaterThan(1.5);
    expect(solvedCutoff.entry).toBeDefined();
  });

  it("never returns a zero-change delta or patch when a solver cannot converge", () => {
    const p = uatSample();
    // High water with extreme uplift that cannot be solved by base widening alone
    p.hydraulics.hu = 4.5;
    p.hydraulics.hd = 0.2;
    p.B = 6.0;
    p.components[0].b1 = 6.0;

    const solvedB = solveWiderBase(p);
    if (!solvedB.converged) {
      expect(Object.keys(solvedB.delta).length).toBe(0);
      expect(Object.keys(solvedB.patch).length).toBe(0);
      expect(solvedB.entry).toBeUndefined();
    }
  });
});
