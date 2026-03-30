import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── TRANSAKSI ────────────────────────────────────────────────────────────────
export const getTransaksi = async (userId, { bulan, tahun } = {}) => {
  let query = supabase
    .from('transaksi')
    .select('*')
    .eq('user_id', userId)
    .order('tanggal', { ascending: false })

  if (bulan && tahun) {
    const start = `${tahun}-${String(bulan).padStart(2, '0')}-01`
    const end = new Date(tahun, bulan, 0).toISOString().split('T')[0]
    query = query.gte('tanggal', start).lte('tanggal', end)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export const tambahTransaksi = async (transaksi) => {
  const { data, error } = await supabase
    .from('transaksi')
    .insert(transaksi)
    .select()
    .single()
  if (error) throw error
  return data
}

export const hapusTransaksi = async (id) => {
  const { error } = await supabase.from('transaksi').delete().eq('id', id)
  if (error) throw error
}

export const updateTransaksi = async (id, updates) => {
  const { data, error } = await supabase
    .from('transaksi')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── KONTAK ───────────────────────────────────────────────────────────────────
export const getKontak = async (userId) => {
  const { data, error } = await supabase
    .from('kontak')
    .select('*')
    .eq('user_id', userId)
    .order('nama')
  if (error) throw error
  return data
}

export const tambahKontak = async (kontak) => {
  const { data, error } = await supabase.from('kontak').insert(kontak).select().single()
  if (error) throw error
  return data
}

// ─── INVOICE ──────────────────────────────────────────────────────────────────
export const getInvoice = async (userId) => {
  const { data, error } = await supabase
    .from('invoice')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const tambahInvoice = async (invoice) => {
  const { data, error } = await supabase.from('invoice').insert(invoice).select().single()
  if (error) throw error
  return data
}

export const updateInvoice = async (id, updates) => {
  const { data, error } = await supabase
    .from('invoice')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── STATISTIK DASHBOARD ─────────────────────────────────────────────────────
export const getStatsDashboard = async (userId, tahun) => {
  const { data, error } = await supabase
    .from('transaksi')
    .select('jumlah, jenis, tanggal, kategori')
    .eq('user_id', userId)
    .gte('tanggal', `${tahun}-01-01`)
    .lte('tanggal', `${tahun}-12-31`)
  if (error) throw error
  return data
}

// ─── PRODUK ───────────────────────────────────────────────────────────────────
export const getProduk = async (userId) => {
  const { data, error } = await supabase
    .from('produk')
    .select('*')
    .eq('user_id', userId)
    .order('nama')
  if (error) throw error
  return data
}

export const tambahProduk = async (produk) => {
  const { data, error } = await supabase
    .from('produk')
    .insert(produk)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateProduk = async (id, updates) => {
  const { data, error } = await supabase
    .from('produk')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const hapusProduk = async (id) => {
  const { error } = await supabase.from('produk').delete().eq('id', id)
  if (error) throw error
}

// ─── POS CHECKOUT ─────────────────────────────────────────────────────────────
export const posCheckout = async ({ p_user_id, p_total, p_uang_diterima, p_kembalian, p_items }) => {
  // Simpan transaksi penjualan
  const { data: tx, error: txError } = await supabase
    .from('transaksi')
    .insert({
      user_id: p_user_id,
      jenis: 'pemasukan',
      jumlah: p_total,
      kategori: 'Penjualan POS',
      keterangan: `Penjualan ${p_items.length} item`,
      tanggal: new Date().toISOString().split('T')[0],
    })
    .select()
    .single()
  if (txError) throw txError

  // Simpan detail item penjualan
  const itemRows = p_items.map(item => ({
    user_id: p_user_id,
    transaksi_id: tx.id,
    produk_id: item.produk_id,
    qty: item.qty,
    harga_satuan: item.harga_satuan,
    subtotal: item.subtotal,
  }))

  const { error: itemError } = await supabase.from('pos_item').insert(itemRows)
  if (itemError) throw itemError

  // Kurangi stok produk
  for (const item of p_items) {
    const { data: produk, error: getErr } = await supabase
      .from('produk')
      .select('stok')
      .eq('id', item.produk_id)
      .single()
    if (getErr) throw getErr

    const { error: stokErr } = await supabase
      .from('produk')
      .update({ stok: produk.stok - item.qty })
      .eq('id', item.produk_id)
    if (stokErr) throw stokErr
  }

  return tx
}
