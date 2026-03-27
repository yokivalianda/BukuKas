-- ============================================================
-- BUKUKAS - SUPABASE SQL SCHEMA
-- Jalankan ini di Supabase > SQL Editor > New Query
-- ============================================================

-- 1. TABEL TRANSAKSI
create table transaksi (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  jenis text check (jenis in ('pemasukan','pengeluaran','transfer')) not null,
  jumlah numeric not null,
  tanggal date not null,
  akun text,
  kategori text,
  keterangan text not null,
  kontak text,
  catatan text,
  created_at timestamptz default now()
);

-- 2. TABEL KONTAK
create table kontak (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  nama text not null,
  tipe text check (tipe in ('pelanggan','supplier','lainnya')) default 'pelanggan',
  email text,
  telepon text,
  alamat text,
  catatan text,
  created_at timestamptz default now()
);

-- 3. TABEL INVOICE
create table invoice (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  nomor text not null,
  tanggal date,
  jatuh_tempo date,
  klien_nama text not null,
  klien_email text,
  klien_alamat text,
  items jsonb,
  subtotal numeric default 0,
  catatan text,
  status text check (status in ('draft','sent','paid','overdue')) default 'draft',
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - Keamanan data per user
-- ============================================================

alter table transaksi enable row level security;
alter table kontak enable row level security;
alter table invoice enable row level security;

-- Policy: user hanya bisa akses data milik sendiri
create policy "Users can manage their own transaksi"
  on transaksi for all using (auth.uid() = user_id);

create policy "Users can manage their own kontak"
  on kontak for all using (auth.uid() = user_id);

create policy "Users can manage their own invoice"
  on invoice for all using (auth.uid() = user_id);

-- ============================================================
-- INDEX untuk performa query
-- ============================================================
create index on transaksi(user_id, tanggal desc);
create index on invoice(user_id, created_at desc);
create index on kontak(user_id, nama);
