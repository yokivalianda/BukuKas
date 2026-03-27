import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getKontak, tambahKontak } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function Kontak() {
  const { user } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ nama: '', tipe: 'pelanggan', email: '', telepon: '', alamat: '', catatan: '' })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [user])
  const load = async () => {
    try { const rows = await getKontak(user.id); setData(rows) }
    catch { toast.error('Gagal memuat kontak') }
    finally { setLoading(false) }
  }

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const submit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const added = await tambahKontak({ ...form, user_id: user.id })
      setData(d => [...d, added])
      toast.success('Kontak ditambahkan')
      setShowModal(false)
      setForm({ nama: '', tipe: 'pelanggan', email: '', telepon: '', alamat: '', catatan: '' })
    } catch { toast.error('Gagal menyimpan') }
    finally { setSaving(false) }
  }

  const filtered = data.filter(k => !search || k.nama.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      {/* Desktop topbar */}
      <div className="topbar">
        <div className="topbar-title">Kontak</div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Tambah Kontak</button>
      </div>
      {/* Mobile */}
      <div className="page-topbar-mobile">
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>{data.length} kontak</span>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Tambah</button>
      </div>
      <div className="page-content">
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <input className="field-input" placeholder="Cari nama kontak..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
          </div>
          {loading ? <div className="loader"><div className="spinner" /></div>
            : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <div className="empty-title">Belum ada kontak</div>
                <div className="empty-sub">Tambahkan pelanggan atau supplier Anda</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {filtered.map(k => (
                  <div key={k.id} style={{ background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: k.tipe === 'pelanggan' ? 'var(--accent-light)' : 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: k.tipe === 'pelanggan' ? 'var(--accent2)' : 'var(--blue)' }}>
                        {k.nama.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{k.nama}</div>
                        <span className={`badge ${k.tipe === 'pelanggan' ? 'badge-green' : 'badge-blue'}`}>{k.tipe}</span>
                      </div>
                    </div>
                    {k.email && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 3 }}>📧 {k.email}</div>}
                    {k.telepon && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 3 }}>📞 {k.telepon}</div>}
                    {k.alamat && <div style={{ fontSize: 12, color: 'var(--muted)' }}>📍 {k.alamat}</div>}
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Tambah Kontak</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submit}>
                <div className="form-grid">
                  <div className="field form-full">
                    <label className="field-label">Nama <span className="req">*</span></label>
                    <input name="nama" className="field-input" value={form.nama} onChange={handle} placeholder="Nama lengkap / perusahaan" required />
                  </div>
                  <div className="field form-full">
                    <label className="field-label">Tipe</label>
                    <select name="tipe" className="field-input" value={form.tipe} onChange={handle}>
                      <option value="pelanggan">Pelanggan</option>
                      <option value="supplier">Supplier</option>
                      <option value="lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label">Email</label>
                    <input name="email" type="email" className="field-input" value={form.email} onChange={handle} placeholder="email@..." />
                  </div>
                  <div className="field">
                    <label className="field-label">Telepon</label>
                    <input name="telepon" className="field-input" value={form.telepon} onChange={handle} placeholder="08xx..." />
                  </div>
                  <div className="field form-full">
                    <label className="field-label">Alamat</label>
                    <input name="alamat" className="field-input" value={form.alamat} onChange={handle} placeholder="Alamat lengkap..." />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Batal</button>
                  <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2, justifyContent: 'center' }}>
                    {saving ? 'Menyimpan...' : 'Simpan Kontak'}
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
