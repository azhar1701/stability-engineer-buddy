# App Stabilitas Bangunan Air (berbasis Workbook Ciamis v14)

Versi pertama mencakup inti analisis stabilitas. Hanya untuk satu pengguna, tanpa login. Data disimpan di browser, dengan ekspor dan impor proyek dalam format JSON. Hasil bisa diekspor ke Excel dan PDF. Seluruh antarmuka berbahasa Indonesia.

## Alur kerja (mengikuti urutan sheet)

```text
Proyek -> Geometri -> Hidraulika -> Tanah -> Uplift -> Gaya & Momen
       -> Kasus Beban -> Stabilitas & Envelope -> Daya Dukung -> Rekomendasi -> Laporan
```

Navigasi samping berbentuk langkah-langkah. Setiap langkah punya status: Lengkap, Belum lengkap, atau T/A.

## Halaman

1. **Dasbor**: daftar proyek, tombol buat baru, duplikat, impor/ekspor JSON, dan contoh sampel UAT Bendung.
2. **Proyek (01/03)**: identitas proyek, lokasi (kecamatan/desa Ciamis), dan jenis bangunan (BND, SLN, DND, BLK, TLG). Juga mode analisis (seluruh bangunan atau per-meter), mode tanah, dan sakelar gaya (hidrostatik hulu/hilir, uplift, tekanan tanah). Panel kesiapan menampilkan input WAJIB dan KONDISIONAL sesuai matriks 02_MASTER_JENIS.
3. **Geometri (11)**: tabel komponen (persegi panjang, trapesium, segitiga) dengan dimensi, material, dan lengan terhadap toe. Hitungannya otomatis: luas, berat, momen, dan titik berat. Ada sketsa penampang SVG.
4. **Hidraulika (12/13/14)**: kedalaman hulu/hilir manual, atau estimasi Manning untuk saluran. Debit dimasukkan manual atau dihitung dengan metode Rasional.
5. **Tanah (15/16/17)**: penapisan otomatis per desa ke profil tanah (gamma, phi', c', q izin), dengan override data proyek. Ada label peringatan "screening, bukan data lokasi".
6. **Tekanan tanah & Uplift (18/19/20)**: Rankine aktif, K0, atau koefisien manual. Uplift linear otomatis atau per stasiun, dengan faktor lambda.
7. **Gaya & Momen (24)**: tabel gaya vertikal dan horizontal, momen penahan dan pengguling. Status setiap gaya mengikuti sakelar dan jenis bangunan.
8. **Kasus Beban (25/44)**: kasus normal, banjir, dan lainnya dengan faktor hu/hd/uplift serta kriteria FS per kasus.
9. **Stabilitas & Envelope (26/27)**: FS geser, FS guling, eksentrisitas e terhadap B/6, serta qmax/qmin. Untuk distribusi kontak parsial, qmax = 2N/(b'L). Envelope menampilkan kasus governing. Status AMAN/TIDAK AMAN ditandai warna.
10. **Daya Dukung (28)**: q izin proyek atau metode faktor kapasitas (Nc, Nq, Ngamma), dibandingkan dengan qmax.
11. **Rekomendasi (31/32)**: rekomendasi otomatis berbasis aturan, misalnya perpanjang lantai, tambah berat, atau perbaiki tanah.
12. **Laporan (33)**: laporan siap cetak berisi ringkasan input, tabel gaya, hasil per kasus, envelope, dan daftar sumber (05). Bisa diekspor ke PDF dan Excel.

## Prinsip teknik yang dipertahankan

- Semua konstanta (gamma air, faktor 0.5, B/6, dan lainnya) berada di satu modul parameter pusat, sesuai prinsip "no magic number".
- Setiap nilai menyimpan asal-usulnya: dari input, screening, atau default. Hasil yang memakai data screening diberi tanda.
- Mesin hitung divalidasi terhadap sampel UAT (34_UJI_PENERIMAAN). Nilai FS hasil app harus sama dengan workbook.

## Arah desain

Tampilan teknis yang rapat seperti lembar hitung, tetapi bersih. Huruf mono untuk angka, warna netral dengan aksen biru air, dan status ditandai hijau, kuning, atau merah.

## Detail teknis

- Mesin hitung ditulis sebagai fungsi TypeScript murni di `src/lib/engine/`: geometry, hydraulics, soil, uplift, earthPressure, forces, loadCases, stability, bearing, recommend. Disertai unit test vitest dengan angka sampel UAT dari workbook.
- Data master (jenis bangunan, matriks parameter, DB tanah Ciamis, material, sumber) diekstrak sekali dari workbook ke file JSON/TS statis.
- State dikelola dengan Zustand plus persist ke localStorage. Skema input divalidasi dengan Zod.
- Setiap langkah punya halaman sendiri, misalnya `/proyek/$id/geometri`.
- Ekspor Excel memakai SheetJS (xlsx). Laporan PDF memakai halaman cetak (print CSS).
- Modul lanjutan (frekuensi hidrologi, kolam olak, Lane/Bligh, gempa, parametric, QA/QC) ditunda ke fase berikutnya. Strukturnya sudah disiapkan agar mudah ditambahkan.
