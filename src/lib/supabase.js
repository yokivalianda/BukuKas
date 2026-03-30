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

// ─── AKUN (CHART OF ACCOUNTS) ─────────────────────────────────────────────────
export const AKUN_DEFAULT = [
  // ASET (1xx)
  { kode: '1-1000', nama: 'Kas', kelompok: 'Aset', normal: 'debit' },
  { kode: '1-1100', nama: 'Bank', kelompok: 'Aset', normal: 'debit' },
  { kode: '1-1200', nama: 'Piutang Usaha', kelompok: 'Aset', normal: 'debit' },
  { kode: '1-1300', nama: 'Persediaan Barang', kelompok: 'Aset', normal: 'debit' },
  { kode: '1-1400', nama: 'Perlengkapan', kelompok: 'Aset', normal: 'debit' },
  { kode: '1-2000', nama: 'Peralatan', kelompok: 'Aset', normal: 'debit' },
  { kode: '1-2100', nama: 'Akum. Penyusutan Peralatan', kelompok: 'Aset', normal: 'kredit' },
  { kode: '1-2200', nama: 'Kendaraan', kelompok: 'Aset', normal: 'debit' },
  { kode: '1-2300', nama: 'Akum. Penyusutan Kendaraan', kelompok: 'Aset', normal: 'kredit' },
  // LIABILITAS (2xx)
  { kode: '2-1000', nama: 'Utang Usaha', kelompok: 'Liabilitas', normal: 'kredit' },
  { kode: '2-1100', nama: 'Utang Bank', kelompok: 'Liabilitas', normal: 'kredit' },
  { kode: '2-1200', nama: 'Utang Pajak', kelompok: 'Liabilitas', normal: 'kredit' },
  { kode: '2-1300', nama: 'Pendapatan Diterima Dimuka', kelompok: 'Liabilitas', normal: 'kredit' },
  // EKUITAS (3xx)
  { kode: '3-1000', nama: 'Modal Pemilik', kelompok: 'Ekuitas', normal: 'kredit' },
  { kode: '3-1100', nama: 'Prive Pemilik', kelompok: 'Ekuitas', normal: 'debit' },
  { kode: '3-1200', nama: 'Laba Ditahan', kelompok: 'Ekuitas', normal: 'kredit' },
  // PENDAPATAN (4xx)
  { kode: '4-1000', nama: 'Pendapatan Penjualan', kelompok: 'Pendapatan', normal: 'kredit' },
  { kode: '4-1100', nama: 'Pendapatan Jasa', kelompok: 'Pendapatan', normal: 'kredit' },
  { kode: '4-1200', nama: 'Pendapatan Lain-lain', kelompok: 'Pendapatan', normal: 'kredit' },
  // BEBAN (5xx)
  { kode: '5-1000', nama: 'Beban Pokok Penjualan', kelompok: 'Beban', normal: 'debit' },
  { kode: '5-1100', nama: 'Beban Gaji', kelompok: 'Beban', normal: 'debit' },
  { kode: '5-1200', nama: 'Beban Sewa', kelompok: 'Beban', normal: 'debit' },
  { kode: '5-1300', nama: 'Beban Utilitas', kelompok: 'Beban', normal: 'debit' },
  { kode: '5-1400', nama: 'Beban Perlengkapan', kelompok: 'Beban', normal: 'debit' },
  { kode: '5-1500', nama: 'Beban Penyusutan', kelompok: 'Beban', normal: 'debit' },
  { kode: '5-1600', nama: 'Beban Pemasaran', kelompok: 'Beban', normal: 'debit' },
  { kode: '5-1700', nama: 'Beban Transportasi', kelompok: 'Beban', normal: 'debit' },
  { kode: '5-1800', nama: 'Beban Pajak', kelompok: 'Beban', normal: 'debit' },
  { kode: '5-1900', nama: 'Beban Lain-lain', kelompok: 'Beban', normal: 'debit' },
]

export const getAkun = async (userId) => {
  const { data, error } = await supabase
    .from('akun')
    .select('*')
    .eq('user_id', userId)
    .order('kode')
  if (error) throw error
  return data
}

export const initAkunDefault = async (userId) => {
  const existing = await getAkun(userId)
  if (existing.length > 0) return existing
  const rows = AKUN_DEFAULT.map(a => ({ ...a, user_id: userId }))
  const { data, error } = await supabase.from('akun').insert(rows).select()
  if (error) throw error
  return data
}

export const tambahAkun = async (akun) => {
  const { data, error } = await supabase.from('akun').insert(akun).select().single()
  if (error) throw error
  return data
}

export const updateAkun = async (id, updates) => {
  const { data, error } = await supabase.from('akun').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export const hapusAkun = async (id) => {
  const { error } = await supabase.from('akun').delete().eq('id', id)
  if (error) throw error
}

// ─── JURNAL ───────────────────────────────────────────────────────────────────
export const getJurnal = async (userId, { bulan, tahun, tipe } = {}) => {
  let query = supabase
    .from('jurnal')
    .select('*, jurnal_detail(*, akun(kode, nama, kelompok))')
    .eq('user_id', userId)
    .order('tanggal', { ascending: false })
    .order('created_at', { ascending: false })

  if (tipe) query = query.eq('tipe', tipe)
  if (bulan && tahun) {
    const start = `${tahun}-${String(bulan).padStart(2, '0')}-01`
    const end = new Date(tahun, bulan, 0).toISOString().split('T')[0]
    query = query.gte('tanggal', start).lte('tanggal', end)
  }
  const { data, error } = await query
  if (error) throw error
  return data
}

export const tambahJurnal = async (userId, { tanggal, keterangan, referensi, tipe = 'umum', detail }) => {
  const { data: jurnal, error: jErr } = await supabase
    .from('jurnal')
    .insert({ user_id: userId, tanggal, keterangan, referensi, tipe })
    .select()
    .single()
  if (jErr) throw jErr

  const rows = detail.map(d => ({ jurnal_id: jurnal.id, akun_id: d.akun_id, debit: d.debit || 0, kredit: d.kredit || 0 }))
  const { error: dErr } = await supabase.from('jurnal_detail').insert(rows)
  if (dErr) throw dErr
  return jurnal
}

export const hapusJurnal = async (id) => {
  await supabase.from('jurnal_detail').delete().eq('jurnal_id', id)
  const { error } = await supabase.from('jurnal').delete().eq('id', id)
  if (error) throw error
}

export const getJurnalDetail = async (userId) => {
  const { data, error } = await supabase
    .from('jurnal_detail')
    .select('*, akun(kode, nama, kelompok, normal), jurnal(tanggal, keterangan, referensi, tipe, user_id)')
    .eq('jurnal.user_id', userId)
    .order('created_at')
  if (error) throw error
  return (data || []).filter(d => d.jurnal)
}

// Sync jurnal dari transaksi
export const syncJurnalFromTransaksi = async (userId, transaksi) => {
  // Cek apakah sudah ada jurnal untuk transaksi ini
  const { data: existing } = await supabase
    .from('jurnal')
    .select('id')
    .eq('referensi', `TRX-${transaksi.id}`)
    .eq('user_id', userId)
  if (existing && existing.length > 0) return null

  // Ambil akun default
  const akun = await getAkun(userId)
  const findAkun = (nama) => akun.find(a => a.nama.toLowerCase().includes(nama.toLowerCase()))

  let detail = []
  if (transaksi.jenis === 'pemasukan') {
    const kas = findAkun('kas') || akun[0]
    const pendapatan = findAkun('pendapatan penjualan') || akun.find(a => a.kelompok === 'Pendapatan')
    if (kas && pendapatan) {
      detail = [
        { akun_id: kas.id, debit: transaksi.jumlah, kredit: 0 },
        { akun_id: pendapatan.id, debit: 0, kredit: transaksi.jumlah },
      ]
    }
  } else if (transaksi.jenis === 'pengeluaran') {
    const kas = findAkun('kas') || akun[0]
    const beban = findAkun('beban lain') || akun.find(a => a.kelompok === 'Beban')
    if (kas && beban) {
      detail = [
        { akun_id: beban.id, debit: transaksi.jumlah, kredit: 0 },
        { akun_id: kas.id, debit: 0, kredit: transaksi.jumlah },
      ]
    }
  }

  if (detail.length === 0) return null

  return tambahJurnal(userId, {
    tanggal: transaksi.tanggal,
    keterangan: transaksi.keterangan || transaksi.kategori,
    referensi: `TRX-${transaksi.id}`,
    tipe: 'sync',
    detail,
  })
}

// Buku Besar: saldo per akun dengan mutasi
export const getBukuBesar = async (userId, { bulan, tahun } = {}) => {
  const akun = await getAkun(userId)
  let query = supabase
    .from('jurnal_detail')
    .select('*, akun(id, kode, nama, kelompok, normal), jurnal(tanggal, keterangan, referensi, tipe, user_id)')
    .order('jurnal(tanggal)')

  const { data: details, error } = await query
  if (error) throw error

  const filtered = (details || []).filter(d => {
    if (!d.jurnal || d.jurnal.user_id !== userId) return false
    if (bulan && tahun) {
      const tgl = new Date(d.jurnal.tanggal)
      if (tgl.getMonth() + 1 !== bulan || tgl.getFullYear() !== tahun) return false
    }
    return true
  })

  // Group by akun
  const byAkun = {}
  for (const d of filtered) {
    const aid = d.akun_id
    if (!byAkun[aid]) byAkun[aid] = { akun: d.akun, mutasi: [], totalDebit: 0, totalKredit: 0 }
    byAkun[aid].mutasi.push(d)
    byAkun[aid].totalDebit += d.debit
    byAkun[aid].totalKredit += d.kredit
  }

  return Object.values(byAkun).sort((a, b) => (a.akun?.kode || '').localeCompare(b.akun?.kode || ''))
}

// Neraca Saldo
export const getNeracaSaldo = async (userId) => {
  const buku = await getBukuBesar(userId)
  return buku.map(b => ({
    akun: b.akun,
    totalDebit: b.totalDebit,
    totalKredit: b.totalKredit,
    saldoDebit: b.totalDebit > b.totalKredit ? b.totalDebit - b.totalKredit : 0,
    saldoKredit: b.totalKredit > b.totalDebit ? b.totalKredit - b.totalDebit : 0,
  }))
}
