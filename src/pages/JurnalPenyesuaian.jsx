import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getAkun, initAkunDefault, getJurnal, tambahJurnal, hapusJurnal } from '../lib/supabase'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import toast from 'react-hot-toast'

const fmt = (n) => new Intl.NumberFormat('id-ID').format(n || 0)
const TIPE_PENYESUAIAN = [
  { val: 'akrual_pendapatan', label: 'Akrual Pendapatan', icon: '📈', desc: 'Pendapatan yang sudah terjadi tapi belum dicatat' },
  { val: 'akrual_beban', label: 'Akrual Beban', icon: '📉', desc: 'Beban yang sudah terjadi tapi belum dibayar' },
  { val: 'depresiasi', label: 'Penyusutan Aset', icon: '🏭', desc: 'Penyusutan nilai aset tetap' },
  { val: 'perlengkapan', label: 'Pemakaian Perlengkapan', icon: '📦', desc: 'Perlengkapan yang sudah terpakai' },
  { val: 'diterima_dimuka', label: 'Pendapatan Diterima Dimuka', icon: '💰', desc: 'Pengakuan pendapatan dari uang muka' },
  { val: 'dibayar_dimuka', label: 'Beban Dibayar Dimuka', icon: '🗓️', desc: 'Alokasi beban yang sudah dibayar dimuka' },
  { val: 'manual', label: 'Manual / Lainnya', icon: '✏️', desc: 'Penyesuaian kustom lainnya' },
]

const emptyDetail = { akun_id: '', debit: '', kredit: '' }

export default function JurnalPenyesuaian() {
  const { user } = useAuth()
  const [akun, setAkun] = useState([])
  const [jurnal, setJurnal] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [expanded, setExpanded] = useState(null)
  const [form, setForm] = useState({
    tipe_penyesuaian: 'akrual_beban',
    tanggal: new Date().toISOString().split('T')[0],
    keterangan: '',
    referensi: '',
    detail: [{ ...emptyDetail }, { ...emptyDetail }],
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [a, j] = await Promise.all([
        initAkunDefault(user.id),
        getJurnal(user.id, { tipe: 'penyesuaian' }),
      ])
      setAkun(a)
      setJurnal(j.filter(j => j.tanggal && new Date(j.tanggal).getFullYear() === tahun))
    } catch { toast.error('Gagal memuat jurnal penyesuaian') }
    finally { setLoading(false) }
  }, [user.id, tahun])

  useEffect(() => { load() }, [load])

  const addDetailRow = () => setForm(f => ({ ...f, detail: [...f.detail, { ...emptyDetail }] }))
  const removeDetail = (i) => setForm(f => ({ ...f, detail: f.detail.filter((_, idx) => idx !== i) }))
  const setDetail = (i, field, val) => setForm(f => {
    const detail = [...f.detail]
    detail[i] = { ...detail[i], [field]: val }
    return { ...f, detail }
  })

  const totalDebit = form.detail.reduce((s, d) => s + (Number(d.debit) || 0), 0)
  const totalKredit = form.detail.reduce((s, d) => s + (Number(d.kredit) || 0), 0)
  const balanced = totalDebit === totalKredit && totalDebit > 0

  const submit = async (e) => {
    e.preventDefault()
    if (!balanced) return toast.error('Total debit harus sama dengan kredit!')
    const detail = form.detail.filter(d => d.akun_id && (Number(d.debit) > 0 || Number(d.kredit) > 0))
    if (detail.length < 2) return toast.error('Minimal 2 baris jurnal')
    setSaving(true)
    try {
      await tambahJurnal(user.id, {
        tanggal: form.tanggal,
        keterangan: form.keterangan,
        referensi: form.referensi || `JP-${Date.now()}`,
        tipe: 'penyesuaian',
        detail: detail.map(d => ({ akun_id: d.akun_id, debit: Number(d.debit) || 0, kredit: Number(d.kredit) || 0 })),
      })
      toast.success('Jurnal penyesuaian disimpan')
      setShowModal(false)
      setForm({ tipe_penyesuaian: 'akrual_beban', tanggal: new Date().toISOString().split('T')[0], keterangan: '', referensi: '', detail: [{ ...emptyDetail }, { ...emptyDetail }] })
      await load()
    } catch { toast.error('Gagal menyimpan') }
    finally { setSaving(false) }
  }

  const handleHapus = async (id) => {
    if (!confirm('Hapus jurnal penyesuaian ini?')) return
    try {
      await hapusJurnal(id)
      toast.success('Berhasil dihapus')
      setJurnal(j => j.filter(x => x.id !== id))
    } catch { toast.error('Gagal menghapus') }
  }

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
  const tipeLabel = (keterangan) => {
    for (const t of TIPE_PENYESUAIAN) {
      if (keterangan?.toLowerCase().includes(t.label.toLowerCase())) return t
    }
    return TIPE_PENYESUAIAN[6]
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Jurnal Penyesuaian</div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Penyesuaian Baru</button>
      </div>
      <div className="page-topbar-mobile">
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>{jurnal.length} penyesuaian</span>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Baru</button>
      </div>

      <div className="page-content">
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          <select className="field-input" style={{ width: 'auto' }} value={tahun} onChange={e => setTahun(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Tahun Buku</span>
        </div>

        {/* Panduan tipe penyesuaian */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 20 }}>
          {TIPE_PENYESUAIAN.slice(0, 6).map(t => (
            <div key={t.val} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', border: '1px solid var(--border)' }}
              onClick={() => { setForm(f => ({ ...f, tipe_penyesuaian: t.val, keterangan: t.label })); setShowModal(true) }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{t.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{t.label}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{t.desc}</div>
            </div>
          ))}
        </div>

        <div className="card">
          {loading ? <div className="loader"><div className="spinner" /></div>
            : jurnal.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✏️</div>
                <div className="empty-title">Belum ada jurnal penyesuaian</div>
                <div className="empty-sub">Pilih tipe penyesuaian di atas untuk memulai</div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 110px 110px 60px', gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                  <div>Tanggal</div><div>Keterangan</div><div>Tipe</div><div style={{ textAlign: 'right' }}>Debit</div><div style={{ textAlign: 'right' }}>Kredit</div><div></div>
                </div>
                {jurnal.map(j => {
                  const jD = (j.jurnal_detail || []).reduce((s, d) => s + d.debit, 0)
                  const jK = (j.jurnal_detail || []).reduce((s, d) => s + d.kredit, 0)
                  const isExp = expanded === j.id
                  const tipe = tipeLabel(j.keterangan)
                  return (
                    <div key={j.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 110px 110px 60px', gap: 8, padding: '12px 16px', cursor: 'pointer', alignItems: 'center' }}
                        onClick={() => setExpanded(isExp ? null : j.id)}>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{j.tanggal ? format(new Date(j.tanggal), 'd MMM yyyy', { locale: idLocale }) : '—'}</div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{j.keterangan}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{tipe.icon} {tipe.label}</div>
                        <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent2)', fontSize: 13 }}>Rp {fmt(jD)}</div>
                        <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--red)', fontSize: 13 }}>Rp {fmt(jK)}</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); handleHapus(j.id) }} style={{ color: 'var(--red)', padding: '3px 7px' }}>✕</button>
                          <span style={{ color: 'var(--muted)', fontSize: 16 }}>{isExp ? '▲' : '▼'}</span>
                        </div>
                      </div>
                      {isExp && (
                        <div style={{ background: 'var(--surface2)', borderTop: '1px solid var(--border)', padding: '10px 24px 14px' }}>
                          {(j.jurnal_detail || []).map((d, di) => (
                            <div key={di} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px 120px', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{d.akun?.kode}</div>
                              <div style={{ fontSize: 13, fontWeight: 600, paddingLeft: d.kredit > 0 ? 20 : 0 }}>{d.akun?.nama}</div>
                              <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13, color: d.debit > 0 ? 'var(--accent2)' : 'var(--muted)' }}>{d.debit > 0 ? `Rp ${fmt(d.debit)}` : '—'}</div>
                              <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13, color: d.kredit > 0 ? 'var(--red)' : 'var(--muted)' }}>{d.kredit > 0 ? `Rp ${fmt(d.kredit)}` : '—'}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <div className="modal-title">Jurnal Penyesuaian</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submit}>
                <div className="form-grid" style={{ marginBottom: 16 }}>
                  <div className="field">
                    <label className="field-label">Tipe Penyesuaian</label>
                    <select className="field-input" value={form.tipe_penyesuaian} onChange={e => setForm(f => ({ ...f, tipe_penyesuaian: e.target.value }))}>
                      {TIPE_PENYESUAIAN.map(t => <option key={t.val} value={t.val}>{t.icon} {t.label}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label">Tanggal Penyesuaian</label>
                    <input type="date" className="field-input" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} required />
                  </div>
                  <div className="field form-full">
                    <label className="field-label">Keterangan <span className="req">*</span></label>
                    <input className="field-input" value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))} placeholder="Deskripsi penyesuaian..." required />
                  </div>
                  <div className="field">
                    <label className="field-label">No. Referensi</label>
                    <input className="field-input" value={form.referensi} onChange={e => setForm(f => ({ ...f, referensi: e.target.value }))} placeholder="JP-001" style={{ fontFamily: 'var(--mono)' }} />
                  </div>
                </div>

                {/* Baris detail */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 150px 150px 36px', gap: 8, fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                    <div>No. Akun</div><div>Nama Akun</div><div style={{ textAlign: 'right' }}>Debit</div><div style={{ textAlign: 'right' }}>Kredit</div><div></div>
                  </div>
                  {form.detail.map((d, i) => {
                    const sel = akun.find(a => a.id === d.akun_id)
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 150px 150px 36px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{sel?.kode || '—'}</div>
                        <select className="field-input" value={d.akun_id} onChange={e => setDetail(i, 'akun_id', e.target.value)}>
                          <option value="">— Pilih Akun —</option>
                          {['Aset','Liabilitas','Ekuitas','Pendapatan','Beban'].map(kel => (
                            <optgroup key={kel} label={kel}>
                              {akun.filter(a => a.kelompok === kel).map(a => <option key={a.id} value={a.id}>{a.kode} — {a.nama}</option>)}
                            </optgroup>
                          ))}
                        </select>
                        <input className="field-input" type="number" min="0" value={d.debit}
                          onChange={e => { setDetail(i, 'debit', e.target.value); if (e.target.value) setDetail(i, 'kredit', '') }}
                          placeholder="0" style={{ textAlign: 'right', fontFamily: 'var(--mono)' }} />
                        <input className="field-input" type="number" min="0" value={d.kredit}
                          onChange={e => { setDetail(i, 'kredit', e.target.value); if (e.target.value) setDetail(i, 'debit', '') }}
                          placeholder="0" style={{ textAlign: 'right', fontFamily: 'var(--mono)' }} />
                        <button type="button" onClick={() => removeDetail(i)} className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} disabled={form.detail.length <= 2}>✕</button>
                      </div>
                    )
                  })}
                  <button type="button" onClick={addDetailRow} className="btn btn-ghost btn-sm">+ Tambah Baris</button>
                </div>

                <div style={{ background: balanced ? '#f0fdf4' : '#fef2f2', border: `1px solid ${balanced ? '#bbf7d0' : '#fecaca'}`, borderRadius: 8, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: balanced ? '#166534' : '#991b1b' }}>
                    {balanced ? '✓ Seimbang' : '⚠ Belum seimbang'}
                  </span>
                  <div style={{ display: 'flex', gap: 20, fontFamily: 'var(--mono)', fontSize: 13 }}>
                    <span>D: Rp {fmt(totalDebit)}</span>
                    <span>K: Rp {fmt(totalKredit)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Batal</button>
                  <button type="submit" className="btn btn-primary" disabled={saving || !balanced} style={{ flex: 2, justifyContent: 'center' }}>
                    {saving ? 'Menyimpan...' : 'Simpan Penyesuaian'}
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
