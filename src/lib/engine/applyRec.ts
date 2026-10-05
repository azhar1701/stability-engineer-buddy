import { analyze, type AnalysisResult } from "./compute";
import type { Project, AppliedRecEntry, AppliedRecDelta, SolverType } from "./types";
import type { Rec } from "./recommend";
import { uid } from "./defaults";

export interface ApplyResult {
  solverType: SolverType;
  converged: boolean;
  projectBefore: Project;
  projectAfter: Project;
  resultBefore: AnalysisResult;
  resultAfter: AnalysisResult;
  patch: Partial<Project>;
  delta: Record<string, AppliedRecDelta>;
  summary: string;
  warningMsg?: string;
  entry?: AppliedRecEntry;
}

/**
 * Helper to clone a Project safely
 */
function cloneProject(p: Project): Project {
  return JSON.parse(JSON.stringify(p));
}

/**
 * Solve wider base B to satisfy sliding, overturning, and bearing criteria.
 * Increases B by 0.05m steps up to maxIterations (default 200 = +10.0m).
 * Also proportionally widens the foundation base component at z0=0 (if exists).
 */
export function solveWiderBase(
  p: Project,
  opts?: { maxIterations?: number; step?: number }
): ApplyResult {
  const maxIterations = opts?.maxIterations ?? 200;
  const step = opts?.step ?? 0.05;

  const resultBefore = analyze(p);
  const initialB = p.B;

  // Find foundation base component (lowest component at z0 === 0)
  let baseCompIdx = p.components.findIndex((c) => c.z0 === 0 && c.x0 === 0);
  if (baseCompIdx === -1) {
    baseCompIdx = p.components.findIndex((c) => c.z0 === 0);
  }

  let converged = false;
  let pBest = cloneProject(p);
  let bestResult = resultBefore;
  let addedWidth = 0;

  for (let i = 1; i <= maxIterations; i++) {
    const deltaB = +(i * step).toFixed(2);
    const testB = +(initialB + deltaB).toFixed(2);

    const testProject = cloneProject(p);
    testProject.B = testB;

    if (baseCompIdx !== -1) {
      testProject.components[baseCompIdx].b1 = +(
        p.components[baseCompIdx].b1 + deltaB
      ).toFixed(2);
    }

    const testResult = analyze(testProject);
    const activeCases = testResult.cases.filter((c) => c.active && c.applies);

    const allSlideOk = activeCases.every((c) => c.slideOk);
    const allOverturnOk = activeCases.every((c) => c.overturnOk);
    const allBearingOk = activeCases.every(
      (c) => c.bearingOk && c.regime !== "RESULTAN DI LUAR DASAR"
    );
    const allKernOk = activeCases.every((c) => c.regime === "KONTAK PENUH");

    // Primary convergence: safety factors satisfied
    if (allSlideOk && allOverturnOk && allBearingOk) {
      converged = true;
      pBest = testProject;
      bestResult = testResult;
      addedWidth = deltaB;

      // If kern condition is also satisfied, stop immediately for optimal design
      if (allKernOk || i > 40) {
        break;
      }
    }
  }

  if (!converged || addedWidth <= 0) {
    return {
      solverType: "WIDEN_B",
      converged: false,
      projectBefore: p,
      projectAfter: p,
      resultBefore,
      resultAfter: resultBefore,
      patch: {},
      delta: {},
      summary: `Pencarian konvergensi pelebaran dasar B hingga +${(maxIterations * step).toFixed(2)} m belum memenuhi seluruh kriteria keamanan gabungan (geser, guling, daya dukung). Diperlukan kombinasi perbaikan tanah, reduksi gaya angkat (uplift) melalui tirai rembesan, atau modifikasi bentuk struktur.`,
      warningMsg: "Solusi otomatis tidak konvergen dengan pelebaran dasar saja.",
    };
  }

  const delta: Record<string, AppliedRecDelta> = {
    B: {
      from: initialB,
      to: pBest.B,
      label: "Lebar Fondasi Dasar (B)",
      unit: "m",
    },
  };

  if (baseCompIdx !== -1) {
    const compName = p.components[baseCompIdx].name || `Komponen #${baseCompIdx + 1}`;
    delta[`comp_${baseCompIdx}`] = {
      from: p.components[baseCompIdx].b1,
      to: pBest.components[baseCompIdx].b1,
      label: `Lebar ${compName} (b1)`,
      unit: "m",
    };
  }

  const patch: Partial<Project> = {
    B: pBest.B,
    components: pBest.components,
  };

  const summary = `Lebar dasar B ditingkatkan dari ${initialB.toFixed(2)} m menjadi ${pBest.B.toFixed(2)} m (+${addedWidth.toFixed(2)} m) untuk memulihkan angka keamanan geser, guling, dan daya dukung tanah.`;

  const entry: AppliedRecEntry = {
    id: uid(),
    recTitle: "Optimalisasi Lebar Dasar Fondasi (B)",
    appliedAt: Date.now(),
    patch,
    delta,
    solverType: "WIDEN_B",
    status: "APPLIED",
    summary,
  };

  return {
    solverType: "WIDEN_B",
    converged: true,
    projectBefore: p,
    projectAfter: pBest,
    resultBefore,
    resultAfter: bestResult,
    patch,
    delta,
    summary,
    entry,
  };
}

/**
 * Solve additional cutoff depth to prevent piping & fulfill Lane / Bligh creep criteria.
 * Increases dCutoffUp and dCutoffDown by 0.1m steps.
 * Primary criterion: Lane's Weighted Creep Ratio (KP-02 Subbab 5.4).
 */
export function solveAddCutoff(
  p: Project,
  opts?: { maxIterations?: number; step?: number }
): ApplyResult {
  const maxIterations = opts?.maxIterations ?? 150;
  const step = opts?.step ?? 0.1;

  const resultBefore = analyze(p);
  const initialUp = p.seepage?.dCutoffUp ?? 1.0;
  const initialDown = p.seepage?.dCutoffDown ?? 1.5;

  let converged = false;
  let pBest = cloneProject(p);
  let bestResult = resultBefore;
  let addedDepth = 0;

  for (let i = 1; i <= maxIterations; i++) {
    const deltaD = +(i * step).toFixed(2);
    const testProject = cloneProject(p);
    const tryUp = +(initialUp + deltaD * 0.55).toFixed(2);
    const tryDown = +(initialDown + deltaD * 0.45).toFixed(2);

    testProject.seepage = {
      ...(p.seepage ?? {
        soilType: "PASIR_SEDANG",
        lApronUp: 0,
        lApronDown: 0,
      }),
      enabled: true,
      dCutoffUp: tryUp,
      dCutoffDown: tryDown,
    };

    const testResult = analyze(testProject);

    // Primary condition: Lane Cw >= CwMin (Standard KP-02)
    if (testResult.seepage.laneOk) {
      // If Bligh is also ok or we have added sufficient depth (>= 3m), stop
      if (testResult.seepage.blighOk || deltaD >= 3.0 || i >= 80) {
        converged = true;
        pBest = testProject;
        bestResult = testResult;
        addedDepth = deltaD;
        break;
      }
      // Store candidate
      if (!converged) {
        converged = true;
        pBest = testProject;
        bestResult = testResult;
        addedDepth = deltaD;
      }
    }
  }

  if (!converged || addedDepth <= 0) {
    return {
      solverType: "ADD_CUTOFF",
      converged: false,
      projectBefore: p,
      projectAfter: p,
      resultBefore,
      resultAfter: resultBefore,
      patch: {},
      delta: {},
      summary: `Pencarian kedalaman cutoff hingga +${(maxIterations * step).toFixed(2)} m belum memenuhi kriteria rembesan Lane. Diperlukan penambahan lantai lindung (apron) hilir atau perbaikan fondasi tanah.`,
      warningMsg: "Panjang rayapan rembesan belum memenuhi syarat Lane.",
    };
  }

  const newUp = pBest.seepage?.dCutoffUp ?? initialUp;
  const newDown = pBest.seepage?.dCutoffDown ?? initialDown;

  const delta: Record<string, AppliedRecDelta> = {
    dCutoffUp: {
      from: initialUp,
      to: newUp,
      label: "Kedalaman Cutoff Hulu",
      unit: "m",
    },
    dCutoffDown: {
      from: initialDown,
      to: newDown,
      label: "Kedalaman Cutoff Hilir",
      unit: "m",
    },
  };

  const patch: Partial<Project> = {
    seepage: pBest.seepage,
  };

  const summary = `Kedalaman cutoff hulu ditambah menjadi ${newUp.toFixed(2)} m dan hilir menjadi ${newDown.toFixed(2)} m (total +${addedDepth.toFixed(2)} m) sehingga angka Lane Cw (${bestResult.seepage.Cw.toFixed(1)} ≥ ${bestResult.seepage.CwMin}) aman terhadap bahaya piping.`;

  const entry: AppliedRecEntry = {
    id: uid(),
    recTitle: "Penambahan Kedalaman Tirai / Cutoff Rembesan",
    appliedAt: Date.now(),
    patch,
    delta,
    solverType: "ADD_CUTOFF",
    status: "APPLIED",
    summary,
  };

  return {
    solverType: "ADD_CUTOFF",
    converged: true,
    projectBefore: p,
    projectAfter: pBest,
    resultBefore,
    resultAfter: bestResult,
    patch,
    delta,
    summary,
    entry,
  };
}

/**
 * Solve extending apron length to prevent piping.
 * Increases lApronDown by 0.5m steps.
 */
export function solveExtendApron(
  p: Project,
  opts?: { maxIterations?: number; step?: number }
): ApplyResult {
  const maxIterations = opts?.maxIterations ?? 100;
  const step = opts?.step ?? 0.5;

  const resultBefore = analyze(p);
  const initialApron = p.seepage?.lApronDown ?? 0;

  let converged = false;
  let pBest = cloneProject(p);
  let bestResult = resultBefore;
  let addedApron = 0;

  for (let i = 1; i <= maxIterations; i++) {
    const deltaL = +(i * step).toFixed(2);
    const testProject = cloneProject(p);
    testProject.seepage = {
      ...(p.seepage ?? {
        soilType: "PASIR_SEDANG",
        dCutoffUp: 1.0,
        dCutoffDown: 1.5,
      }),
      enabled: true,
      lApronDown: +(initialApron + deltaL).toFixed(2),
    };

    const testResult = analyze(testProject);
    if (testResult.seepage.laneOk) {
      converged = true;
      pBest = testProject;
      bestResult = testResult;
      addedApron = deltaL;
      break;
    }
  }

  if (!converged || addedApron <= 0) {
    return {
      solverType: "EXTEND_APRON",
      converged: false,
      projectBefore: p,
      projectAfter: p,
      resultBefore,
      resultAfter: resultBefore,
      patch: {},
      delta: {},
      summary: `Panjang apron mencapai batas maksimum iterasi tanpa konvergensi rembesan.`,
      warningMsg: "Apron belum memenuhi syarat rayapan Lane.",
    };
  }

  const newApron = pBest.seepage?.lApronDown ?? initialApron;

  const delta: Record<string, AppliedRecDelta> = {
    lApronDown: {
      from: initialApron,
      to: newApron,
      label: "Panjang Lantai Lindung / Apron Hilir",
      unit: "m",
    },
  };

  const patch: Partial<Project> = {
    seepage: pBest.seepage,
  };

  const summary = `Panjang apron hilir diperpanjang dari ${initialApron.toFixed(2)} m menjadi ${newApron.toFixed(2)} m (+${addedApron.toFixed(2)} m) sehingga rasio rembesan Lane aman.`;

  const entry: AppliedRecEntry = {
    id: uid(),
    recTitle: "Perpanjangan Lantai Lindung / Apron Hilir",
    appliedAt: Date.now(),
    patch,
    delta,
    solverType: "EXTEND_APRON",
    status: "APPLIED",
    summary,
  };

  return {
    solverType: "EXTEND_APRON",
    converged: true,
    projectBefore: p,
    projectAfter: pBest,
    resultBefore,
    resultAfter: bestResult,
    patch,
    delta,
    summary,
    entry,
  };
}

/**
 * Solve deeper foundation Df for Terzaghi bearing capacity mode.
 * Increases Df by 0.1m steps.
 */
export function solveDeeperDf(
  p: Project,
  opts?: { maxIterations?: number; step?: number }
): ApplyResult {
  const maxIterations = opts?.maxIterations ?? 100;
  const step = opts?.step ?? 0.1;

  const resultBefore = analyze(p);
  const initialDf = p.Df;

  let converged = false;
  let pBest = cloneProject(p);
  let bestResult = resultBefore;
  let addedDf = 0;

  for (let i = 1; i <= maxIterations; i++) {
    const deltaDf = +(i * step).toFixed(2);
    const testProject = cloneProject(p);
    testProject.Df = +(initialDf + deltaDf).toFixed(2);

    const testResult = analyze(testProject);
    const activeCases = testResult.cases.filter((c) => c.active && c.applies);
    if (activeCases.every((c) => c.bearingOk)) {
      converged = true;
      pBest = testProject;
      bestResult = testResult;
      addedDf = deltaDf;
      break;
    }
  }

  if (!converged || addedDf <= 0) {
    return {
      solverType: "DEEPER_DF",
      converged: false,
      projectBefore: p,
      projectAfter: p,
      resultBefore,
      resultAfter: resultBefore,
      patch: {},
      delta: {},
      summary: `Penambahan Df belum mencukupi batas daya dukung izin. Disarankan memperlebar dasar fondasi (B).`,
      warningMsg: "Df belum mencukupi batas daya dukung.",
    };
  }

  const delta: Record<string, AppliedRecDelta> = {
    Df: {
      from: initialDf,
      to: pBest.Df,
      label: "Kedalaman Tertanam Fondasi (Df)",
      unit: "m",
    },
  };

  const patch: Partial<Project> = {
    Df: pBest.Df,
  };

  const summary = `Kedalaman fondasi Df diperdalam dari ${initialDf.toFixed(2)} m menjadi ${pBest.Df.toFixed(2)} m (+${addedDf.toFixed(2)} m) untuk meningkatkan daya dukung izin Terzaghi.`;

  const entry: AppliedRecEntry = {
    id: uid(),
    recTitle: "Pendalaman Fondasi (Df)",
    appliedAt: Date.now(),
    patch,
    delta,
    solverType: "DEEPER_DF",
    status: "APPLIED",
    summary,
  };

  return {
    solverType: "DEEPER_DF",
    converged: true,
    projectBefore: p,
    projectAfter: pBest,
    resultBefore,
    resultAfter: bestResult,
    patch,
    delta,
    summary,
    entry,
  };
}

/**
 * Dispatcher: matches a recommendation to its appropriate solver function.
 * Returns null if the recommendation is purely informational or has no auto-solver.
 */
export function solveRecommendation(rec: Rec, p: Project): ApplyResult | null {
  const title = rec.title.toLowerCase();

  // Sliding failure
  if (title.includes("fs geser") || title.includes("geser tidak memenuhi")) {
    return solveWiderBase(p);
  }

  // Overturning failure
  if (title.includes("fs guling") || title.includes("guling tidak memenuhi")) {
    return solveWiderBase(p);
  }

  // Eccentricity / kern
  if (title.includes("resultan di luar dasar") || title.includes("eksentrisitas melebihi")) {
    return solveWiderBase(p);
  }

  // Bearing capacity exceeded
  if (title.includes("daya dukung terlampaui") || title.includes("daya dukung mendekati")) {
    if (p.bearing.mode === "TERZAGHI") {
      const dfTry = solveDeeperDf(p);
      if (dfTry.converged) return dfTry;
    }
    return solveWiderBase(p);
  }

  // Seepage / Piping
  if (title.includes("piping") || title.includes("rembesan")) {
    return solveAddCutoff(p);
  }

  return null;
}
