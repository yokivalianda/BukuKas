import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getAkun, initAkunDefault, getJurnal, tambahJurnal, hapusJurnal,
  getTransaksi, syncJurnalFromTransaksi
} from '../lib/supabase'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import toast from 'react-hot-toast'

const fmt = (n) => new Intl.NumberFormat('id-ID').format(n || 0)
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const KELOMPOK_COLOR = { Aset: 'badge-blue', Liabilitas: 'badge-red', Ekuitas: 'badge-green', Pendapatan: 'badge-green', Beban: 'badge-red' }

const emptyDetail = { akun_id: '', debit: '', kredit: '' }

export default function JurnalTransaksi() {
  const { user } = useAuth()
  const [akun, setAkun] = useState([])
  const [jurnal, setJurnal] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bulan, setBulan] = useState(new Date().getMonth() + 1)
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [tab, setTab] = useState('semua') // semua | umum | sync | penyesuaian
  const [expanded, setExpanded] = useState(null)
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    keterangan: '',
    referensi: '',
    tipe: 'umum',
    detail: [{ ...emptyDetail }, { ...emptyDetail }],
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [a, j] = await Promise.all([
        initAkunDefault(user.id),
        getJurnal(user.id, { bulan, tahun }),
      ])
      setAkun(a)
      setJurnal(j)
    } catch { toast.error('Gagal memuat jurnal') }
    finally { setLoading(false) }
  }, [user.id, bulan, tahun])

  useEffect(() => { load() }, [load])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const transaksi = await getTransaksi(user.id)
      let synced = 0
      for (const trx of transaksi) {
        const result = await syncJurnalFromTransaksi(user.id, trx)
        if (result) synced++
      }
      toast.success(synced > 0 ? `${synced} transaksi disinkron` : 'Semua transaksi sudah tersinkron')
      await load()
    } catch { toast.error('Gagal sinkronisasi') }
    finally { setSyncing(false) }
  }

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
      await tambahJurnal(user.id, { ...form, detail: detail.map(d => ({ akun_id: d.akun_id, debit: Number(d.debit) || 0, kredit: Number(d.kredit) || 0 })) })
      toast.success('Jurnal disimpan')
      setShowModal(false)
      setForm({ tanggal: new Date().toISOString().split('T')[0], keterangan: '', referensi: '', tipe: 'umum', detail: [{ ...emptyDetail }, { ...emptyDetail }] })
      await load()
    } catch { toast.error('Gagal menyimpan jurnal') }
    finally { setSaving(false) }
  }

  const handleHapus = async (id) => {
    if (!confirm('Hapus jurnal ini?')) return
    try {
      await hapusJurnal(id)
      toast.success('Jurnal dihapus')
      setJurnal(j => j.filter(x => x.id !== id))
    } catch { toast.error('Gagal menghapus') }
  }

  const filtered = tab === 'semua' ? jurnal : jurnal.filter(j => j.tipe === tab)

  const totalDebitAll = filtered.reduce((s, j) => s + (j.jurnal_detail || []).reduce((ss, d) => ss + d.debit, 0), 0)
  const totalKreditAll = filtered.reduce((s, j) => s + (j.jurnal_detail || []).reduce((ss, d) => ss + d.kredit, 0), 0)

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Jurnal Transaksi</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={handleSync} disabled={syncing}>
            {syncing ? '⟳ Sinkron...' : '⟳ Sync Transaksi'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Entri Jurnal</button>
        </div>
      </div>
      <div className="page-topbar-mobile">
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>{filtered.length} jurnal</span>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Entri</button>
      </div>

      <div className="page-content">
        {/* Filter */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="field-input" style={{ width: 'auto' }} value={bulan} onChange={e => setBulan(Number(e.target.value))}>
            {BULAN.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
          </select>
          <select className="field-input" style={{ width: 'auto' }} value={tahun} onChange={e => setTahun(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface2)', borderRadius: 8, padding: 4 }}>
            {[['semua','Semua'],['umum','Manual'],['sync','Otomatis'],['penyesuaian','Penyesuaian']].map(([key,label]) => (
              <button key={key} onClick={() => setTab(key)}
                style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: tab === key ? 'var(--accent2)' : 'transparent',
                  color: tab === key ? '#fff' : 'var(--muted)' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Total Jurnal', val: filtered.length, isCount: true },
            { label: 'Total Debit', val: totalDebitAll, color: 'var(--accent2)' },
            { label: 'Total Kredit', val: totalKreditAll, color: 'var(--red)' },
          ].map(k => (
            <div key={k.label} className="kpi-card">
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{ color: k.color || 'var(--text)', fontSize: 17 }}>
                {k.isCount ? k.val : `Rp ${fmt(k.val)}`}
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          {loading ? <div className="loader"><div className="spinner" /></div>
            : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📒</div>
                <div className="empty-title">Belum ada jurnal</div>
                <div className="empty-sub">Buat entri jurnal manual atau sync dari transaksi</div>
              </div>
            ) : (
              <div>
                {/* Header tabel */}
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 100px 120px 120px 60px', gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                  <div>Tanggal</div><div>Keterangan</div><div>Ref</div><div style={{ textAlign: 'right' }}>Debit</div><div style={{ textAlign: 'right' }}>Kredit</div><div></div>
                </div>
                {filtered.map(j => {
                  const jDebit = (j.jurnal_detail || []).reduce((s, d) => s + d.debit, 0)
                  const jKredit = (j.jurnal_detail || []).reduce((s, d) => s + d.kredit, 0)
                  const isExpanded = expanded === j.id
                  return (
                    <div key={j.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 100px 120px 120px 60px', gap: 8, padding: '12px 16px', cursor: 'pointer', alignItems: 'center' }}
                        onClick={() => setExpanded(isExpanded ? null : j.id)}>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{j.tanggal ? format(new Date(j.tanggal), 'd MMM yyyy', { locale: idLocale }) : '—'}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{j.keterangan}</div>
                          <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: j.tipe === 'sync' ? 'var(--surface2)' : j.tipe === 'penyesuaian' ? '#fef3c7' : '#ede9fe', color: 'var(--muted)', fontWeight: 600 }}>
                            {j.tipe === 'sync' ? '⟳ Otomatis' : j.tipe === 'penyesuaian' ? '✏ Penyesuaian' : '✎ Manual'}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{j.referensi || '—'}</div>
                        <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 13, color: 'var(--accent2)' }}>Rp {fmt(jDebit)}</div>
                        <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 13, color: 'var(--red)' }}>Rp {fmt(jKredit)}</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); handleHapus(j.id) }} style={{ color: 'var(--red)', padding: '3px 7px', fontSize: 12 }}>✕</button>
                          <span style={{ color: 'var(--muted)', fontSize: 16 }}>{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {/* Detail baris jurnal */}
                      {isExpanded && (
                        <div style={{ background: 'var(--surface2)', borderTop: '1px solid var(--border)', padding: '10px 24px 14px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 130px 130px', gap: 8, fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                            <div>No. Akun</div><div>Nama Akun</div><div>Kelompok</div><div style={{ textAlign: 'right' }}>Debit</div><div style={{ textAlign: 'right' }}>Kredit</div>
                          </div>
                          {(j.jurnal_detail || []).map((d, di) => (
                            <div key={di} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 130px 130px', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{d.akun?.kode}</div>
                              <div style={{ fontSize: 13, fontWeight: 600, paddingLeft: d.kredit > 0 ? 20 : 0 }}>{d.akun?.nama}</div>
                              <div><span className={`badge ${KELOMPOK_COLOR[d.akun?.kelompok] || 'badge-gray'}`}>{d.akun?.kelompok}</span></div>
                              <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: d.debit > 0 ? 700 : 400, color: d.debit > 0 ? 'var(--accent2)' : 'var(--muted)' }}>
                                {d.debit > 0 ? `Rp ${fmt(d.debit)}` : '—'}
                              </div>
                              <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: d.kredit > 0 ? 700 : 400, color: d.kredit > 0 ? 'var(--red)' : 'var(--muted)' }}>
                                {d.kredit > 0 ? `Rp ${fmt(d.kredit)}` : '—'}
                              </div>
                            </div>
                          ))}
                          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 130px 130px', gap: 8, marginTop: 8, fontWeight: 700, fontSize: 13 }}>
                            <div /><div /><div style={{ textAlign: 'right', color: 'var(--muted)', fontSize: 12 }}>Total</div>
                            <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--accent2)' }}>Rp {fmt(jDebit)}</div>
                            <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--red)' }}>Rp {fmt(jKredit)}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
        </div>
      </div>

      {/* Modal entri jurnal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <div className="modal-title">Entri Jurnal Umum</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submit}>
                <div className="form-grid" style={{ marginBottom: 16 }}>
                  <div className="field">
                    <label className="field-label">Tanggal <span className="req">*</span></label>
                    <input type="date" className="field-input" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} required />
                  </div>
                  <div className="field">
                    <label className="field-label">No. Referensi</label>
                    <input className="field-input" value={form.referensi} onChange={e => setForm(f => ({ ...f, referensi: e.target.value }))} placeholder="JU-001" style={{ fontFamily: 'var(--mono)' }} />
                  </div>
                  <div className="field form-full">
                    <label className="field-label">Keterangan <span className="req">*</span></label>
                    <input className="field-input" value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))} placeholder="Deskripsi transaksi..." required />
                  </div>
                  <div className="field">
                    <label className="field-label">Tipe Jurnal</label>
                    <select className="field-input" value={form.tipe} onChange={e => setForm(f => ({ ...f, tipe: e.target.value }))}>
                      <option value="umum">Jurnal Umum</option>
                      <option value="penyesuaian">Jurnal Penyesuaian</option>
                    </select>
                  </div>
                </div>

                {/* Detail baris */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 150px 150px 36px', gap: 8, fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6, padding: '0 4px' }}>
                    <div>No. Akun</div><div>Nama Akun</div><div style={{ textAlign: 'right' }}>Debit (Rp)</div><div style={{ textAlign: 'right' }}>Kredit (Rp)</div><div></div>
                  </div>
                  {form.detail.map((d, i) => {
                    const selectedAkun = akun.find(a => a.id === d.akun_id)
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 150px 150px 36px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)', padding: '0 4px' }}>{selectedAkun?.kode || '—'}</div>
                        <select className="field-input" value={d.akun_id} onChange={e => setDetail(i, 'akun_id', e.target.value)} required={i < 2}>
                          <option value="">— Pilih Akun —</option>
                          {['Aset','Liabilitas','Ekuitas','Pendapatan','Beban'].map(kel => (
                            <optgroup key={kel} label={kel}>
                              {akun.filter(a => a.kelompok === kel).map(a => (
                                <option key={a.id} value={a.id}>{a.kode} — {a.nama}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <input className="field-input" type="number" min="0" step="1" value={d.debit}
                          onChange={e => { setDetail(i, 'debit', e.target.value); if (e.target.value) setDetail(i, 'kredit', '') }}
                          placeholder="0" style={{ textAlign: 'right', fontFamily: 'var(--mono)' }} />
                        <input className="field-input" type="number" min="0" step="1" value={d.kredit}
                          onChange={e => { setDetail(i, 'kredit', e.target.value); if (e.target.value) setDetail(i, 'debit', '') }}
                          placeholder="0" style={{ textAlign: 'right', fontFamily: 'var(--mono)' }} />
                        <button type="button" onClick={() => removeDetail(i)} className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--red)', padding: '5px 8px' }} disabled={form.detail.length <= 2}>✕</button>
                      </div>
                    )
                  })}
                  <button type="button" onClick={addDetailRow} className="btn btn-ghost btn-sm">+ Tambah Baris</button>
                </div>

                {/* Balance check */}
                <div style={{ background: balanced ? '#f0fdf4' : '#fef2f2', border: `1px solid ${balanced ? '#bbf7d0' : '#fecaca'}`, borderRadius: 8, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: balanced ? '#166534' : '#991b1b' }}>
                    {balanced ? '✓ Jurnal seimbang' : '⚠ Jurnal belum seimbang'}
                  </span>
                  <div style={{ display: 'flex', gap: 20, fontFamily: 'var(--mono)', fontSize: 13 }}>
                    <span>D: Rp {fmt(totalDebit)}</span>
                    <span>K: Rp {fmt(totalKredit)}</span>
                    {!balanced && <span style={{ color: '#991b1b' }}>Selisih: Rp {fmt(Math.abs(totalDebit - totalKredit))}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Batal</button>
                  <button type="submit" className="btn btn-primary" disabled={saving || !balanced} style={{ flex: 2, justifyContent: 'center' }}>
                    {saving ? 'Menyimpan...' : 'Simpan Jurnal'}
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
