# BebasHutang 🚀
**oleh Zeth Finance — Zeth Corporation**

> "Bebas dari hutang selangkah demi selangkah — secara privat, cerdas, dan tenang."

**BebasHutang** adalah aplikasi manajemen hutang personal yang dirancang khusus untuk membantu kamu mengelola, melacak, dan melunasi seluruh cicilan, pegadaian, hingga hutang personal secara terstruktur.

---

## Fitur Unggulan (Phase 1 – 5)

Aplikasi ini telah selesai dikembangkan melalui 5 fase iteratif:

### 1. Dashboard Utama & Pemantauan Kesehatan
- **Total Outstanding**: Menampilkan akumulasi total sisa hutang (pokok + bunga berjalan) secara real-time.
- **Rasio Cicilan (DSR)**: Menghitung Debt Service Ratio (DSR) otomatis (Total Cicilan Bulanan / Gaji Bulanan). Sistem memberikan warna dinamis (Hijau jika aman ≤35%, Merah 🔴 jika di atas 35% berbahaya).
- **Interactive Financial Sliders**: Fitur simulasi dinamis di mana kamu bisa menggeser estimasi gaji bulanan atau penambahan cicilan baru untuk melihat efek instannya ke persentase DSR.
- **Grafik Tren Recharts**: Area Chart interaktif yang memproyeksikan penurunan total hutang dari waktu ke waktu berdasarkan riwayat pembayaran yang sudah kamu catat.

### 2. Manajemen 3 Tipe Hutang Lokal
- **Cicilan Bulanan**: Cocok untuk paylater (Kredivo, Shopee PayLater), kartu kredit, KPR, atau kredit motor/mobil.
- **Gadai (Pegadaian)**: Perhitungan bunga berjalan per 15 hari dari pokok, lengkap dengan opsi *Perpanjang* atau *Tebus* gadai secara langsung.
- **Hutang Personal / Saudara**: Pinjaman tanpa bunga tetap yang fleksibel, di mana cicilan nominal bebas bisa dicatat kapan saja tanpa batas tenor yang kaku.

### 3. Kuis & Kalkulator Awal Interaktif
- **Landing Page Step-by-Step**: Sebelum masuk ke form login/daftar, user baru akan disajikan alur interaktif:
  1. *Tagline Relatable*: Tagline santai tentang masalah hutang lokal (pinjol & paylater).
  2. *Kuis Interaktif*: Pertanyaan santai seputar tipe hutang yang paling dipikirkan, rasio beban bulanan, dan gaya pelunasan yang disukai.
  3. *Kalkulator Bebas Hutang*: Estimator instan untuk menghitung jumlah bulan menuju bebas finansial berdasarkan total hutang dan kemampuan bayar bulanan.

### 4. Notifikasi Reminder Telegram & Ekspor Data
- **Reminder Telegram Bot**: Mengirim pesan reminder privat jatuh tempo (`7d`, `3d`, `1d`, dan `overdue`) dengan gaya bahasa santai dan interaktif langsung ke Telegram kamu.
- **Deduplikasi Log**: Menggunakan tabel `notifications_log` di database Supabase untuk memastikan bot tidak mengirim spam berulang-ulang pada saat reload halaman.
- **Ekspor Excel (XLSX)**: Membuat workbook multi-sheet (Ringkasan, Hutang Aktif, Riwayat Pembayaran) dengan lebar kolom otomatis (auto-width) agar data nominal Rupiah tidak terpotong.
- **Ekspor PDF Cetak Bersih**: Layout A4 bertema Light Mode (latar belakang putih bersih) untuk menghemat tinta printer, namun tetap premium dengan branding *BebasHutang*.

### 5. Zona Bahaya (Reset Database) & Validasi
- **Pembersihan Data Instan**: Opsi "Bersihkan Semua Data" di menu Pengaturan yang menghapus semua data transaksi milik user secara permanen dari server database Supabase.
- **State Cleanup Detik Itu Juga**: Menggunakan event system `debt-data-reset` untuk langsung mengosongkan cache dashboard/state saat data di-reset tanpa perlu me-refresh browser.
- **Validasi Input Ekstrem**: Pembatasan maksimal input Rp1 Triliun untuk mencegah crash database akibat numeric overflow.

---

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Styling**: Tailwind CSS + Premium Glassmorphism (Default Dark Mode)
- **Database & Auth**: Supabase (PostgreSQL with RLS Enabled)
- **Notifikasi**: Telegram Bot API
- **AI/OCR Engine**: Gemini Vision API (untuk scan tagihan otomatis via foto)
- **Export Engine**: jsPDF & SheetJS (xlsx)
