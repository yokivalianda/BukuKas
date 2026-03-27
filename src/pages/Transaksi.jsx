import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getTransaksi, tambahTransaksi, hapusTransaksi, updateTransaksi } from '../lib/supabase'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import toast from 'react-hot-toast'

const fmtFull = (n) => new Intl.NumberFormat('id-ID').format(n)

const KATEGORI = {
  pemasukan: ['Penjualan', 'Pendapatan Jasa', 'Piutang Diterima', 'Modal Masuk', 'Pinjaman', 'Pendapatan Lain'],
  pengeluaran: ['Bahan Baku', 'Gaji Karyawan', 'Operasional', 'Sewa', 'Utilitas', 'Transportasi', 'Pemasaran', 'Pajak', 'Cicilan', 'Pengeluaran Lain'],
  transfer: ['Transfer Antar Akun'],
}

const AKUN = ['Kas Tangan', 'Bank BCA', 'Bank Mandiri', 'GoPay', 'OVO', 'QRIS', 'Lainnya']

const emptyForm = {
  jenis: 'pemasukan',
  jumlah: '',
  tanggal: new Date().toISOString().split('T')[0],
  akun: '',
  kategori: '',
  keterangan: '',
  kontak: '',
  catatan: '',
}

export default function Transaksi() {
  const { user } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('semua')
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [user])

  const load = async () => {
    try {
      const rows = await getTransaksi(user.id)
      setData(rows)
    } catch { toast.error('Gagal memuat data') }
    finally { setLoading(false) }
  }

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowModal(true) }
  const openEdit = (tx) => {
    setForm({ jenis: tx.jenis, jumlah: String(tx.jumlah), tanggal: tx.tanggal, akun: tx.akun || '', kategori: tx.kategori || '', keterangan: tx.keterangan, kontak: tx.kontak || '', catatan: tx.catatan || '' })
    setEditId(tx.id); setShowModal(true)
  }

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleJumlah = (e) => {
    const raw = e.target.value.replace(/\D/g, '')
    setForm(f => ({ ...f, jumlah: raw }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.jumlah || !form.keterangan || !form.tanggal) { toast.error('Lengkapi data wajib'); return }
    setSaving(true)
    try {
      const payload = { ...form, jumlah: Number(form.jumlah), user_id: user.id }
      if (editId) {
        const updated = await updateTransaksi(editId, payload)
        setData(d => d.map(t => t.id === editId ? updated : t))
        toast.success('Transaksi diperbarui')
      } else {
        const added = await tambahTransaksi(payload)
        setData(d => [added, ...d])
        toast.success('Transaksi tersimpan')
      }
      setShowModal(false)
    } catch { toast.error('Gagal menyimpan') }
    finally { setSaving(false) }
  }

  const hapus = async (id) => {
    if (!confirm('Hapus transaksi ini?')) return
    try {
      await hapusTransaksi(id)
      setData(d => d.filter(t => t.id !== id))
      toast.success('Transaksi dihapus')
    } catch { toast.error('Gagal menghapus') }
  }

  const filtered = data.filter(t => {
    if (filter !== 'semua' && t.jenis !== filter) return false
    if (search && !t.keterangan.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalPemasukan = filtered.filter(t => t.jenis === 'pemasukan').reduce((s, t) => s + t.jumlah, 0)
  const totalPengeluaran = filtered.filter(t => t.jenis === 'pengeluaran').reduce((s, t) => s + t.jumlah, 0)

  return (
    <>
      {/* Desktop topbar */}
      <div className="topbar">
        <div className="topbar-title">Transaksi</div>
        <button className="btn btn-primary" onClick={openAdd}>+ Tambah Transaksi</button>
      </div>
      {/* Mobile sticky action bar */}
      <div className="page-topbar-mobile">
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>{data.length} transaksi</span>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Tambah</button>
      </div>

      <div className="page-content">
        {/* Summary strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Total Pemasukan', val: totalPemasukan, color: 'var(--accent2)' },
            { label: 'Total Pengeluaran', val: totalPengeluaran, color: 'var(--red)' },
            { label: 'Selisih', val: totalPemasukan - totalPengeluaran, color: totalPemasukan >= totalPengeluaran ? 'var(--accent2)' : 'var(--red)' },
          ].map(s => (
            <div key={s.label} className="kpi-card">
              <div className="kpi-label">{s.label}</div>
              <div className="kpi-value" style={{ color: s.color, fontSize: 18 }}>Rp {fmtFull(Math.abs(s.val))}</div>
            </div>
          ))}
        </div>

        <div className="card">
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 8, padding: 3, gap: 3, border: '1px solid var(--border)' }}>
              {['semua', 'pemasukan', 'pengeluaran'].map(f => (
                <button key={f} onClick={() => setFilter(f)} className="btn btn-sm" style={{ background: filter === f ? 'var(--surface)' : 'none', border: 'none', color: filter === f ? 'var(--text)' : 'var(--muted)', textTransform: 'capitalize', boxShadow: filter === f ? '0 1px 4px rgba(0,0,0,0.07)' : 'none' }}>
                  {f === 'semua' ? 'Semua' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <input
              className="field-input"
              placeholder="Cari keterangan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 180, maxWidth: 280 }}
            />
          </div>

          {loading ? (
            <div className="loader"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">Belum ada transaksi</div>
              <div className="empty-sub">Klik "+ Tambah Transaksi" untuk mulai mencatat</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Keterangan</th>
                    <th>Tanggal</th>
                    <th>Kategori</th>
                    <th>Akun</th>
                    <th style={{ textAlign: 'right' }}>Jumlah</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(tx => (
                    <tr key={tx.id} onClick={() => openEdit(tx)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 7, background: tx.jenis === 'pemasukan' ? 'var(--accent-light)' : 'var(--red-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, color: tx.jenis === 'pemasukan' ? 'var(--accent2)' : 'var(--red)', fontWeight: 700 }}>
                            {tx.jenis === 'pemasukan' ? '↑' : '↓'}
                          </div>
                          <span style={{ fontWeight: 600 }}>{tx.keterangan}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: 12 }}>{format(new Date(tx.tanggal), 'd MMM yyyy', { locale: idLocale })}</td>
                      <td><span className="badge badge-gray">{tx.kategori || '—'}</span></td>
                      <td style={{ color: 'var(--muted)', fontSize: 12 }}>{tx.akun || '—'}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600, color: tx.jenis === 'pemasukan' ? 'var(--accent2)' : 'var(--red)', fontSize: 13 }}>
                        {tx.jenis === 'pemasukan' ? '+' : '-'}Rp {fmtFull(tx.jumlah)}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <button onClick={() => hapus(tx.id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', padding: '4px 8px' }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editId ? 'Edit Transaksi' : 'Tambah Transaksi'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Type toggle */}
              <div className="type-toggle">
                {['pemasukan', 'pengeluaran', 'transfer'].map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, jenis: t, kategori: '' }))}
                    className={`type-btn ${form.jenis === t ? (t === 'pemasukan' ? 'active-in' : t === 'pengeluaran' ? 'active-out' : 'active-tf') : ''}`}>
                    {t === 'pemasukan' ? '↑ Pemasukan' : t === 'pengeluaran' ? '↓ Pengeluaran' : '⇄ Transfer'}
                  </button>
                ))}
              </div>

              <form onSubmit={submit}>
                <div className="form-grid">
                  <div className="field form-full">
                    <label className="field-label">Jumlah <span className="req">*</span></label>
                    <div className="amount-wrap">
                      <span className="amount-prefix">Rp</span>
                      <input className="field-input" value={form.jumlah ? Number(form.jumlah).toLocaleString('id-ID') : ''} onChange={handleJumlah} placeholder="0" inputMode="numeric" required />
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Tanggal <span className="req">*</span></label>
                    <input name="tanggal" type="date" className="field-input" value={form.tanggal} onChange={handle} required />
                  </div>
                  <div className="field">
                    <label className="field-label">Akun</label>
                    <select name="akun" className="field-input" value={form.akun} onChange={handle}>
                      <option value="">Pilih akun...</option>
                      {AKUN.map(a => <option key={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label">Kategori</label>
                    <select name="kategori" className="field-input" value={form.kategori} onChange={handle}>
                      <option value="">Pilih kategori...</option>
                      {(KATEGORI[form.jenis] || []).map(k => <option key={k}>{k}</option>)}
                    </select>
                  </div>
                  <div className="field form-full">
                    <label className="field-label">Keterangan <span className="req">*</span></label>
                    <input name="keterangan" className="field-input" value={form.keterangan} onChange={handle} placeholder="Deskripsi singkat transaksi..." required />
                  </div>
                  <div className="field">
                    <label className="field-label">Kontak</label>
                    <input name="kontak" className="field-input" value={form.kontak} onChange={handle} placeholder="Pelanggan / Supplier..." />
                  </div>
                  <div className="field">
                    <label className="field-label">Catatan</label>
                    <input name="catatan" className="field-input" value={form.catatan} onChange={handle} placeholder="Opsional..." />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Batal</button>
                  <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2, justifyContent: 'center' }}>
                    {saving ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Simpan Transaksi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
