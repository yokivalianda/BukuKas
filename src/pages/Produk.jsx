import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getProduk, tambahProduk, updateProduk, hapusProduk } from '../lib/supabase'
import toast from 'react-hot-toast'

const fmtFull = (n) => new Intl.NumberFormat('id-ID').format(n)

const emptyForm = {
  kode_sku: '',
  nama: '',
  kategori: '',
  harga_beli: '',
  harga_jual: '',
  stok: ''
}

export default function Produk() {
  const { user } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [user])

  const load = async () => {
    try {
      const rows = await getProduk(user.id)
      setData(rows)
    } catch { toast.error('Gagal memuat produk') }
    finally { setLoading(false) }
  }

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowModal(true) }
  const openEdit = (p) => {
    setForm({
      kode_sku: p.kode_sku || '',
      nama: p.nama,
      kategori: p.kategori || '',
      harga_beli: p.harga_beli || '',
      harga_jual: p.harga_jual || '',
      stok: p.stok || ''
    })
    setEditId(p.id)
    setShowModal(true)
  }

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const handleNumeric = (e) => {
    const raw = e.target.value.replace(/\D/g, '')
    setForm(f => ({ ...f, [e.target.name]: raw }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.nama || !form.harga_jual) { toast.error('Lengkapi data wajib (*)'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        harga_beli: Number(form.harga_beli) || 0,
        harga_jual: Number(form.harga_jual) || 0,
        stok: Number(form.stok) || 0,
        user_id: user.id
      }
      
      if (editId) {
        const updated = await updateProduk(editId, payload)
        setData(d => d.map(p => p.id === editId ? updated : p))
        toast.success('Produk diperbarui')
      } else {
        const added = await tambahProduk(payload)
        setData(d => [...d, added].sort((a,b) => a.nama.localeCompare(b.nama)))
        toast.success('Produk ditambahkan')
      }
      setShowModal(false)
    } catch { toast.error('Gagal menyimpan') }
    finally { setSaving(false) }
  }

  const hapus = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Hapus produk ini?')) return
    try {
      await hapusProduk(id)
      setData(d => d.filter(p => p.id !== id))
      toast.success('Produk dihapus')
    } catch { toast.error('Gagal menghapus') }
  }

  const filtered = data.filter(p => 
    !search || p.nama.toLowerCase().includes(search.toLowerCase()) || (p.kode_sku && p.kode_sku.toLowerCase().includes(search.toLowerCase()))
  )

  const totalAset = data.reduce((s, p) => s + (p.harga_beli * p.stok), 0)

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Data Produk</div>
        <button className="btn btn-primary" onClick={openAdd}>+ Tambah Produk</button>
      </div>
      <div className="page-content">
        
        {/* KPI Ringkasan Produk */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
          <div className="kpi-card">
            <div className="kpi-label">Total Produk (Jenis)</div>
            <div className="kpi-value" style={{ color: 'var(--blue)', fontSize: 18 }}>{data.length}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Total Stok (Pcs)</div>
            <div className="kpi-value" style={{ color: 'var(--accent2)', fontSize: 18 }}>{data.reduce((s, p) => s + p.stok, 0)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Estimasi Nilai Aset (Harga Beli)</div>
            <div className="kpi-value" style={{ color: 'var(--text)', fontSize: 18 }}>Rp {fmtFull(totalAset)}</div>
          </div>
        </div>

        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <input className="field-input" placeholder="Cari nama atau SKU produk..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 350 }} />
          </div>

          {loading ? <div className="loader"><div className="spinner" /></div>
            : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <div className="empty-title">Belum ada produk</div>
                <div className="empty-sub">Tambahkan daftar barang jualan Anda</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Info Produk</th>
                      <th>Kategori</th>
                      <th style={{ textAlign: 'right' }}>Harga Beli</th>
                      <th style={{ textAlign: 'right' }}>Harga Jual</th>
                      <th style={{ textAlign: 'center' }}>Stok</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr key={p.id} onClick={() => openEdit(p)} style={{ cursor: 'pointer' }}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{p.nama}</div>
                          {p.kode_sku && <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>SKU: {p.kode_sku}</div>}
                        </td>
                        <td><span className="badge badge-gray">{p.kategori || '—'}</span></td>
                        <td style={{ textAlign: 'right', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                          Rp {fmtFull(p.harga_beli)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent2)', fontFamily: 'var(--mono)' }}>
                          Rp {fmtFull(p.harga_jual)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${p.stok <= 5 ? 'badge-red' : 'badge-green'}`} style={{ fontSize: 13, fontWeight: 700 }}>
                            {p.stok}
                          </span>
                        </td>
                        <td onClick={e => e.stopPropagation()} style={{ textAlign: 'right' }}>
                          <button onClick={(e) => hapus(p.id, e)} className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', padding: '4px 8px' }}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 550 }}>
            <div className="modal-header">
              <div className="modal-title">{editId ? 'Edit Produk' : 'Tambah Produk'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submit}>
                <div className="form-grid">
                  <div className="field form-full">
                    <label className="field-label">Nama Produk <span className="req">*</span></label>
                    <input name="nama" className="field-input" value={form.nama} onChange={handle} placeholder="Mis: Kopi Susu Aren" required />
                  </div>
                  <div className="field">
                    <label className="field-label">SKU / Kode (Opsional)</label>
                    <input name="kode_sku" className="field-input" value={form.kode_sku} onChange={handle} placeholder="KOP-001" style={{ fontFamily: 'var(--mono)' }} />
                  </div>
                  <div className="field">
                    <label className="field-label">Kategori</label>
                    <input name="kategori" className="field-input" value={form.kategori} onChange={handle} placeholder="Minuman, Makanan..." />
                  </div>
                  
                  <div className="field">
                    <label className="field-label">Harga Beli / Modal</label>
                    <div className="amount-wrap">
                      <span className="amount-prefix">Rp</span>
                      <input name="harga_beli" className="field-input" value={form.harga_beli ? Number(form.harga_beli).toLocaleString('id-ID') : ''} onChange={handleNumeric} placeholder="0" inputMode="numeric" />
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Harga Jual <span className="req">*</span></label>
                    <div className="amount-wrap">
                      <span className="amount-prefix">Rp</span>
                      <input name="harga_jual" className="field-input" value={form.harga_jual ? Number(form.harga_jual).toLocaleString('id-ID') : ''} onChange={handleNumeric} placeholder="0" inputMode="numeric" required />
                    </div>
                  </div>
                  
                  <div className="field" style={{ gridColumn: 'span 2' }}>
                    <label className="field-label">Stok Awal</label>
                    <input name="stok" type="number" className="field-input" value={form.stok} onChange={handle} placeholder="0" min="0" style={{ maxWidth: 150 }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Batal</button>
                  <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2, justifyContent: 'center' }}>
                    {saving ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Simpan Produk'}
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
