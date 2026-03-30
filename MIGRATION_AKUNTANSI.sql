-- ============================================================
-- BukuKas - Migrasi Akuntansi
-- Jalankan SQL ini di Supabase Dashboard > SQL Editor
-- ============================================================

-- Tabel akun (Chart of Accounts)
CREATE TABLE IF NOT EXISTS public.akun (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  kode        TEXT NOT NULL,
  nama        TEXT NOT NULL,
  kelompok    TEXT NOT NULL CHECK (kelompok IN ('Aset', 'Liabilitas', 'Ekuitas', 'Pendapatan', 'Beban')),
  normal      TEXT NOT NULL CHECK (normal IN ('debit', 'kredit')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel jurnal (header)
CREATE TABLE IF NOT EXISTS public.jurnal (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tanggal     DATE NOT NULL,
  keterangan  TEXT NOT NULL,
  referensi   TEXT,
  tipe        TEXT NOT NULL DEFAULT 'umum' CHECK (tipe IN ('umum', 'sync', 'penyesuaian')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel jurnal_detail (baris debit/kredit)
CREATE TABLE IF NOT EXISTS public.jurnal_detail (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  jurnal_id   UUID REFERENCES public.jurnal(id) ON DELETE CASCADE NOT NULL,
  akun_id     UUID REFERENCES public.akun(id) ON DELETE RESTRICT NOT NULL,
  debit       NUMERIC(15,2) DEFAULT 0,
  kredit      NUMERIC(15,2) DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_akun_user ON public.akun(user_id);
CREATE INDEX IF NOT EXISTS idx_jurnal_user ON public.jurnal(user_id);
CREATE INDEX IF NOT EXISTS idx_jurnal_tanggal ON public.jurnal(tanggal);
CREATE INDEX IF NOT EXISTS idx_jurnal_detail_jurnal ON public.jurnal_detail(jurnal_id);
CREATE INDEX IF NOT EXISTS idx_jurnal_detail_akun ON public.jurnal_detail(akun_id);

-- Row Level Security
ALTER TABLE public.akun ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurnal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurnal_detail ENABLE ROW LEVEL SECURITY;

-- Policy: user hanya bisa akses data miliknya sendiri
CREATE POLICY "akun_user_policy" ON public.akun
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "jurnal_user_policy" ON public.jurnal
  FOR ALL USING (auth.uid() = user_id);

-- jurnal_detail diakses via join ke jurnal (tidak langsung lewat user_id)
CREATE POLICY "jurnal_detail_policy" ON public.jurnal_detail
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.jurnal j
      WHERE j.id = jurnal_detail.jurnal_id
      AND j.user_id = auth.uid()
    )
  );

-- ============================================================
-- Selesai! Kembali ke aplikasi dan coba buka menu Jurnal Transaksi.
-- Akun default akan dibuat otomatis saat pertama kali dibuka.
-- ============================================================
