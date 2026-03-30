-- ============================================================
-- BUKUKAS - SUPABASE SQL SCHEMA (LENGKAP + FIX POS)
-- Jalankan semua ini di Supabase > SQL Editor > New Query
-- ============================================================

-- 1. TABEL TRANSAKSI
create table if not exists transaksi (
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
create table if not exists kontak (
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
create table if not exists invoice (
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

-- 4. TABEL PRODUK
create table if not exists produk (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  nama text not null,
  kode_sku text,
  harga_beli numeric default 0,
  harga_jual numeric not null,
  stok integer default 0,
  satuan text default 'pcs',
  kategori text,
  deskripsi text,
  aktif boolean default true,
  created_at timestamptz default now()
);

-- 5. TABEL POS_ITEM (detail item setiap transaksi kasir)
create table if not exists pos_item (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  transaksi_id uuid references transaksi(id) on delete cascade not null,
  produk_id uuid references produk(id) on delete set null,
  qty integer not null,
  harga_satuan numeric not null,
  subtotal numeric not null,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table transaksi enable row level security;
alter table kontak    enable row level security;
alter table invoice   enable row level security;
alter table produk    enable row level security;
alter table pos_item  enable row level security;

drop policy if exists "Users can manage their own transaksi" on transaksi;
drop policy if exists "Users can manage their own kontak"    on kontak;
drop policy if exists "Users can manage their own invoice"   on invoice;
drop policy if exists "Users can manage their own produk"    on produk;
drop policy if exists "Users can manage their own pos_item"  on pos_item;

create policy "Users can manage their own transaksi"
  on transaksi for all using (auth.uid() = user_id);

create policy "Users can manage their own kontak"
  on kontak for all using (auth.uid() = user_id);

create policy "Users can manage their own invoice"
  on invoice for all using (auth.uid() = user_id);

create policy "Users can manage their own produk"
  on produk for all using (auth.uid() = user_id);

create policy "Users can manage their own pos_item"
  on pos_item for all using (auth.uid() = user_id);

-- ============================================================
-- INDEX untuk performa
-- ============================================================
create index if not exists idx_transaksi_user_tanggal on transaksi(user_id, tanggal desc);
create index if not exists idx_invoice_user            on invoice(user_id, created_at desc);
create index if not exists idx_kontak_user             on kontak(user_id, nama);
create index if not exists idx_produk_user             on produk(user_id, nama);
create index if not exists idx_pos_item_transaksi      on pos_item(transaksi_id);
create index if not exists idx_pos_item_user           on pos_item(user_id);

-- ============================================================
-- FUNCTION: decrement_stok (atomic stok update untuk POS)
-- Ini mencegah race condition saat 2 transaksi bersamaan
-- ============================================================
create or replace function decrement_stok(p_produk_id uuid, p_qty integer)
returns void
language sql
security definer
as $$
  update produk
  set stok = greatest(0, stok - p_qty)
  where id = p_produk_id
    and user_id = auth.uid();
$$;
