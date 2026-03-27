import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getInvoice, tambahInvoice, updateInvoice } from '../lib/supabase'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import toast from 'react-hot-toast'

const fmtFull = (n) => new Intl.NumberFormat('id-ID').format(n)

const emptyForm = {
  nomor: '',
  tanggal: new Date().toISOString().split('T')[0],
  jatuh_tempo: '',
  klien_nama: '',
  klien_email: '',
  klien_alamat: '',
  items: [{ deskripsi: '', qty: 1, harga: '' }],
  catatan: '',
  status: 'draft',
}

export default function Invoice() {
  const { user } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [user])

  const load = async () => {
    try {
      const rows = await getInvoice(user.id)
      setData(rows)
    } catch { toast.error('Gagal memuat invoice') }
    finally { setLoading(false) }
  }

  const openAdd = () => {
    const count = data.length + 1
    setForm({ ...emptyForm, nomor: `INV-${String(count).padStart(3, '0')}` })
    setShowModal(true)
  }

  const handleItem = (i, field, val) => {
    setForm(f => {
      const items = [...f.items]
      items[i] = { ...items[i], [field]: val }
      return { ...f, items }
    })
  }

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { deskripsi: '', qty: 1, harga: '' }] }))
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))

  const subtotal = form.items.reduce((s, item) => s + (Number(item.qty) * Number(item.harga || 0)), 0)

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, subtotal, user_id: user.id, items: JSON.stringify(form.items) }
      const added = await tambahInvoice(payload)
      setData(d => [added, ...d])
      toast.success('Invoice dibuat')
      setShowModal(false)
    } catch { toast.error('Gagal membuat invoice') }
    finally { setSaving(false) }
  }

  const updateStatus = async (id, status) => {
    try {
      const updated = await updateInvoice(id, { status })
      setData(d => d.map(inv => inv.id === id ? { ...inv, status } : inv))
      toast.success('Status diperbarui')
    } catch { toast.error('Gagal update status') }
  }

  const statusBadge = (s) => {
    const map = { draft: ['badge-gray', 'Draft'], sent: ['badge-blue', 'Terkirim'], paid: ['badge-green', 'Lunas'], overdue: ['badge-red', 'Jatuh Tempo'] }
    const [cls, label] = map[s] || ['badge-gray', s]
    return <span className={`badge ${cls}`}>{label}</span>
  }

  return (
    <>
      {/* Desktop topbar */}
      <div className="topbar">
        <div className="topbar-title">Invoice</div>
        <button className="btn btn-primary" onClick={openAdd}>+ Buat Invoice</button>
      </div>
      {/* Mobile */}
      <div className="page-topbar-mobile">
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>{data.length} invoice</span>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Buat</button>
      </div>

      <div className="page-content">
        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Total Invoice', val: data.length, isCount: true, color: 'var(--text)' },
            { label: 'Belum Dibayar', val: data.filter(i => i.status === 'sent').reduce((s, i) => s + (i.subtotal || 0), 0), color: 'var(--amber)' },
            { label: 'Lunas', val: data.filter(i => i.status === 'paid').reduce((s, i) => s + (i.subtotal || 0), 0), color: 'var(--accent2)' },
            { label: 'Jatuh Tempo', val: data.filter(i => i.status === 'overdue').length, isCount: true, color: 'var(--red)' },
          ].map(s => (
            <div key={s.label} className="kpi-card">
              <div className="kpi-label">{s.label}</div>
              <div className="kpi-value" style={{ color: s.color, fontSize: 18 }}>
                {s.isCount ? s.val : `Rp ${fmtFull(s.val)}`}
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          {loading ? <div className="loader"><div className="spinner" /></div>
            : data.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🧾</div>
                <div className="empty-title">Belum ada invoice</div>
                <div className="empty-sub">Buat invoice profesional dan kirim ke klien</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>No. Invoice</th>
                      <th>Klien</th>
                      <th>Tanggal</th>
                      <th>Jatuh Tempo</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map(inv => (
                      <tr key={inv.id}>
                        <td style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 13 }}>{inv.nomor}</td>
                        <td style={{ fontWeight: 600 }}>{inv.klien_nama}</td>
                        <td style={{ color: 'var(--muted)', fontSize: 12 }}>{inv.tanggal ? format(new Date(inv.tanggal), 'd MMM yyyy', { locale: idLocale }) : '—'}</td>
                        <td style={{ color: 'var(--muted)', fontSize: 12 }}>{inv.jatuh_tempo ? format(new Date(inv.jatuh_tempo), 'd MMM yyyy', { locale: idLocale }) : '—'}</td>
                        <td>{statusBadge(inv.status)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 13 }}>Rp {fmtFull(inv.subtotal || 0)}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <select className="field-input btn-sm" value={inv.status} onChange={e => updateStatus(inv.id, e.target.value)} style={{ width: 'auto', fontSize: 12, padding: '4px 28px 4px 8px' }}>
                            <option value="draft">Draft</option>
                            <option value="sent">Terkirim</option>
                            <option value="paid">Lunas</option>
                            <option value="overdue">Jatuh Tempo</option>
                          </select>
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
          <div className="modal" style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <div className="modal-title">Buat Invoice Baru</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submit}>
                <div className="form-grid" style={{ marginBottom: 16 }}>
                  <div className="field">
                    <label className="field-label">No. Invoice</label>
                    <input className="field-input" value={form.nomor} onChange={e => setForm(f => ({ ...f, nomor: e.target.value }))} style={{ fontFamily: 'var(--mono)' }} />
                  </div>
                  <div className="field">
                    <label className="field-label">Tanggal</label>
                    <input type="date" className="field-input" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} />
                  </div>
                  <div className="field">
                    <label className="field-label">Nama Klien <span className="req">*</span></label>
                    <input className="field-input" value={form.klien_nama} onChange={e => setForm(f => ({ ...f, klien_nama: e.target.value }))} placeholder="PT / CV / Nama..." required />
                  </div>
                  <div className="field">
                    <label className="field-label">Jatuh Tempo</label>
                    <input type="date" className="field-input" value={form.jatuh_tempo} onChange={e => setForm(f => ({ ...f, jatuh_tempo: e.target.value }))} />
                  </div>
                  <div className="field form-full">
                    <label className="field-label">Email Klien</label>
                    <input type="email" className="field-input" value={form.klien_email} onChange={e => setForm(f => ({ ...f, klien_email: e.target.value }))} placeholder="email@klien.com" />
                  </div>
                </div>

                {/* Items */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>ITEM / LAYANAN</div>
                  {form.items.map((item, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 140px auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                      <input className="field-input" value={item.deskripsi} onChange={e => handleItem(i, 'deskripsi', e.target.value)} placeholder="Deskripsi..." />
                      <input className="field-input" type="number" value={item.qty} onChange={e => handleItem(i, 'qty', e.target.value)} placeholder="Qty" min={1} />
                      <div className="amount-wrap">
                        <span className="amount-prefix">Rp</span>
                        <input className="field-input" value={item.harga ? Number(item.harga).toLocaleString('id-ID') : ''} onChange={e => handleItem(i, 'harga', e.target.value.replace(/\D/g, ''))} placeholder="0" inputMode="numeric" />
                      </div>
                      <button type="button" onClick={() => removeItem(i)} className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', padding: '5px 8px' }} disabled={form.items.length === 1}>✕</button>
                    </div>
                  ))}
                  <button type="button" onClick={addItem} className="btn btn-ghost btn-sm">+ Tambah Item</button>
                </div>

                {/* Subtotal */}
                <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Total</span>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 18, color: 'var(--accent2)' }}>Rp {fmtFull(subtotal)}</span>
                </div>

                <div className="field" style={{ marginBottom: 16 }}>
                  <label className="field-label">Catatan</label>
                  <textarea className="field-input" value={form.catatan} onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))} placeholder="Syarat pembayaran, terima kasih, dll..." style={{ minHeight: 60 }} />
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Batal</button>
                  <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2, justifyContent: 'center' }}>
                    {saving ? 'Menyimpan...' : 'Buat Invoice'}
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
