// 04_PARAMETER_PUSAT — single source of truth (no magic numbers)
export const P = {
  GAMMA_AIR: 9.81, // kN/m³
  KOEF_RASIONAL: 0.278, // Q = 0.278 C I A
  FAKTOR_SEGITIGA: 0.5,
  PEMBAGI_TITIK_BERAT_SEGITIGA: 3,
  EKSPONEN_PANGKAT_2_3: 2 / 3,
  PEMBAGI_TENGAH_SEPERTIGA: 6, // e ≤ B/6
  FAKTOR_Q_SEGITIGA: 2, // qmax = 2N/(b'L)
  FAKTOR_LEBAR_KONTAK: 3, // b' = 3a
  STEP_MANNING: 0.02,
  MAX_Y_MANNING: 10,
} as const;
