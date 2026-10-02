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
  KOEF_ADHESI_DEFAULT: 0.67, // rasio ca/c' sesuai SNI 8460
  GAMMA_SUB_MIN: 7.5, // batas bawah berat isi tanah terendam (kN/m³)
  CD_PELIMPAH_OGEE: 2.1, // koefisien debit mercu bulat/ogee (KP-02)
  KP_REDUKSI_PASIF: 0.5, // faktor reduksi tahanan pasif konservatif (KP-02)
  LANE_CW_DEFAULT: 5.0, // angka rayapan Lane aman default
  BLIGH_C_DEFAULT: 12.0, // angka rayapan Bligh aman default
} as const;
