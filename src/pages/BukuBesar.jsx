import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getBukuBesar, initAkunDefault } from '../lib/supabase'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import toast from 'react-hot-toast'

const fmt = (n) => new Intl.NumberFormat('id-ID').format(n || 0)
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const KELOMPOK_COLOR = { Aset: '#3b82f6', Liabilitas: '#ef4444', Ekuitas: '#8b5cf6', Pendapatan: '#10b981', Beban: '#f59e0b' }
const KELOMPOK_BG = { Aset: '#eff6ff', Liabilitas: '#fef2f2', Ekuitas: '#f5f3ff', Pendapatan: '#f0fdf4', Beban: '#fffbeb' }

export default function BukuBesar() {
  const { user } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [bulan, setBulan] = useState(new Date().getMonth() + 1)
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [filterKelompok, setFilterKelompok] = useState('Semua')
  const [expanded, setExpanded] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      await initAkunDefault(user.id)
      const hasil = await getBukuBesar(user.id, { bulan, tahun })
      setData(hasil)
      if (hasil.length > 0) setExpanded(hasil[0].akun?.id)
    } catch { toast.error('Gagal memuat buku besar') }
    finally { setLoading(false) }
  }, [user.id, bulan, tahun])

  useEffect(() => { load() }, [load])

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
  const kelompokList = ['Semua', 'Aset', 'Liabilitas', 'Ekuitas', 'Pendapatan', 'Beban']
  const filtered = filterKelompok === 'Semua' ? data : data.filter(d => d.akun?.kelompok === filterKelompok)

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Buku Besar</div>
      </div>
      <div className="page-topbar-mobile">
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>{filtered.length} akun aktif</span>
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
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {kelompokList.map(k => (
              <button key={k} onClick={() => setFilterKelompok(k)}
                style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: filterKelompok === k ? (KELOMPOK_COLOR[k] || 'var(--accent2)') : 'var(--surface2)',
                  color: filterKelompok === k ? '#fff' : 'var(--muted)' }}>
                {k}
              </button>
            ))}
          </div>
        </div>

        {loading ? <div className="loader"><div className="spinner" /></div>
          : filtered.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon">📚</div>
                <div className="empty-title">Belum ada mutasi akun</div>
                <div className="empty-sub">Buat jurnal transaksi terlebih dahulu</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map(item => {
                const ak = item.akun
                const isExp = expanded === ak?.id
                const saldo = item.totalDebit - item.totalKredit
                const warna = KELOMPOK_COLOR[ak?.kelompok] || 'var(--accent2)'
                const bg = KELOMPOK_BG[ak?.kelompok] || 'var(--surface2)'

                // Hitung saldo berjalan
                let saldoBerjalan = 0
                const mutasiWithSaldo = (item.mutasi || []).map(m => {
                  saldoBerjalan += (m.debit || 0) - (m.kredit || 0)
                  return { ...m, saldoBerjalan }
                })

                return (
                  <div key={ak?.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {/* Header akun */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: bg, cursor: 'pointer', borderBottom: isExp ? '1px solid var(--border)' : 'none' }}
                      onClick={() => setExpanded(isExp ? null : ak?.id)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 4, height: 36, borderRadius: 2, background: warna }} />
                        <div>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: warna, fontWeight: 700 }}>{ak?.kode}</div>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{ak?.nama}</div>
                        </div>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: warna, color: '#fff', fontWeight: 700 }}>{ak?.kelompok}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>DEBIT</div>
                          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent2)' }}>Rp {fmt(item.totalDebit)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>KREDIT</div>
                          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--red)' }}>Rp {fmt(item.totalKredit)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>SALDO</div>
                          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: saldo >= 0 ? 'var(--accent2)' : 'var(--red)', fontSize: 15 }}>
                            Rp {fmt(Math.abs(saldo))}
                          </div>
                        </div>
                        <span style={{ color: 'var(--muted)', fontSize: 18 }}>{isExp ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {/* Tabel mutasi */}
                    {isExp && (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Tanggal</th>
                              <th>Keterangan</th>
                              <th>Ref</th>
                              <th style={{ textAlign: 'right' }}>Debit</th>
                              <th style={{ textAlign: 'right' }}>Kredit</th>
                              <th style={{ textAlign: 'right' }}>Saldo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mutasiWithSaldo.length === 0 ? (
                              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>Tidak ada mutasi</td></tr>
                            ) : mutasiWithSaldo.map((m, mi) => (
                              <tr key={mi}>
                                <td style={{ fontSize: 12, color: 'var(--muted)' }}>{m.jurnal?.tanggal ? format(new Date(m.jurnal.tanggal), 'd MMM yyyy', { locale: idLocale }) : '—'}</td>
                                <td style={{ fontWeight: 500 }}>{m.jurnal?.keterangan}</td>
                                <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{m.jurnal?.referensi || '—'}</td>
                                <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: m.debit > 0 ? 700 : 400, color: m.debit > 0 ? 'var(--accent2)' : 'var(--muted)' }}>
                                  {m.debit > 0 ? `Rp ${fmt(m.debit)}` : '—'}
                                </td>
                                <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: m.kredit > 0 ? 700 : 400, color: m.kredit > 0 ? 'var(--red)' : 'var(--muted)' }}>
                                  {m.kredit > 0 ? `Rp ${fmt(m.kredit)}` : '—'}
                                </td>
                                <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: m.saldoBerjalan >= 0 ? 'var(--text)' : 'var(--red)' }}>
                                  Rp {fmt(Math.abs(m.saldoBerjalan))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr style={{ background: 'var(--surface2)', fontWeight: 700 }}>
                              <td colSpan={3} style={{ fontWeight: 700, color: 'var(--muted)', fontSize: 12 }}>TOTAL</td>
                              <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--accent2)' }}>Rp {fmt(item.totalDebit)}</td>
                              <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--red)' }}>Rp {fmt(item.totalKredit)}</td>
                              <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: saldo >= 0 ? 'var(--accent2)' : 'var(--red)' }}>Rp {fmt(Math.abs(saldo))}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
      </div>
    </>
  )
}
