import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getNeracaSaldo, initAkunDefault } from '../lib/supabase'
import toast from 'react-hot-toast'

const fmt = (n) => new Intl.NumberFormat('id-ID').format(n || 0)
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const KELOMPOK_COLOR = { Aset: '#3b82f6', Liabilitas: '#ef4444', Ekuitas: '#8b5cf6', Pendapatan: '#10b981', Beban: '#f59e0b' }

export default function NeracaSaldo() {
  const { user } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterKelompok, setFilterKelompok] = useState('Semua')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      await initAkunDefault(user.id)
      const hasil = await getNeracaSaldo(user.id)
      setData(hasil)
    } catch { toast.error('Gagal memuat neraca saldo') }
    finally { setLoading(false) }
  }, [user.id])

  useEffect(() => { load() }, [load])

  const kelompokList = ['Semua', 'Aset', 'Liabilitas', 'Ekuitas', 'Pendapatan', 'Beban']
  const filtered = filterKelompok === 'Semua' ? data : data.filter(d => d.akun?.kelompok === filterKelompok)

  const totalD = filtered.reduce((s, d) => s + d.saldoDebit, 0)
  const totalK = filtered.reduce((s, d) => s + d.saldoKredit, 0)
  const seimbang = Math.abs(totalD - totalK) < 1

  // Group by kelompok
  const grouped = ['Aset', 'Liabilitas', 'Ekuitas', 'Pendapatan', 'Beban'].reduce((acc, kel) => {
    const items = filtered.filter(d => d.akun?.kelompok === kel)
    if (items.length > 0) acc[kel] = items
    return acc
  }, {})

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Neraca Saldo</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {seimbang && data.length > 0 && (
            <span style={{ fontSize: 13, fontWeight: 600, color: '#166534', background: '#dcfce7', padding: '4px 12px', borderRadius: 20 }}>✓ Seimbang</span>
          )}
          {!seimbang && data.length > 0 && (
            <span style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', background: '#fee2e2', padding: '4px 12px', borderRadius: 20 }}>⚠ Tidak Seimbang</span>
          )}
        </div>
      </div>
      <div className="page-topbar-mobile">
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Trial Balance</span>
      </div>

      <div className="page-content">
        {/* Filter kelompok */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {kelompokList.map(k => (
            <button key={k} onClick={() => setFilterKelompok(k)}
              style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: filterKelompok === k ? (KELOMPOK_COLOR[k] || 'var(--accent2)') : 'var(--surface2)',
                color: filterKelompok === k ? '#fff' : 'var(--muted)' }}>
              {k}
            </button>
          ))}
        </div>

        {/* KPI total */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Total Debit', val: totalD, color: 'var(--accent2)' },
            { label: 'Total Kredit', val: totalK, color: 'var(--red)' },
            { label: 'Selisih', val: Math.abs(totalD - totalK), color: seimbang ? '#166534' : '#991b1b' },
          ].map(k => (
            <div key={k.label} className="kpi-card">
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{ color: k.color, fontSize: 17 }}>Rp {fmt(k.val)}</div>
            </div>
          ))}
        </div>

        {loading ? <div className="loader"><div className="spinner" /></div>
          : data.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon">⚖️</div>
                <div className="empty-title">Belum ada data neraca saldo</div>
                <div className="empty-sub">Buat jurnal transaksi terlebih dahulu untuk melihat neraca saldo</div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 90 }}>No. Akun</th>
                      <th>Nama Akun</th>
                      <th style={{ width: 110 }}>Kelompok</th>
                      <th style={{ textAlign: 'right', width: 150 }}>Total Debit</th>
                      <th style={{ textAlign: 'right', width: 150 }}>Total Kredit</th>
                      <th style={{ textAlign: 'right', width: 150 }}>Saldo Debit</th>
                      <th style={{ textAlign: 'right', width: 150 }}>Saldo Kredit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterKelompok === 'Semua'
                      ? Object.entries(grouped).map(([kel, items]) => (
                        <>
                          <tr key={`kel-${kel}`} style={{ background: 'var(--surface2)' }}>
                            <td colSpan={7} style={{ fontWeight: 700, fontSize: 12, color: KELOMPOK_COLOR[kel] || 'var(--text)', padding: '8px 16px', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                              {kel}
                            </td>
                          </tr>
                          {items.map((row, ri) => (
                            <tr key={ri}>
                              <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{row.akun?.kode}</td>
                              <td style={{ fontWeight: 500 }}>{row.akun?.nama}</td>
                              <td>
                                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: KELOMPOK_COLOR[row.akun?.kelompok] + '20', color: KELOMPOK_COLOR[row.akun?.kelompok], fontWeight: 700 }}>
                                  {row.akun?.kelompok}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)' }}>{row.totalDebit > 0 ? `Rp ${fmt(row.totalDebit)}` : '—'}</td>
                              <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)' }}>{row.totalKredit > 0 ? `Rp ${fmt(row.totalKredit)}` : '—'}</td>
                              <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: row.saldoDebit > 0 ? 700 : 400, color: row.saldoDebit > 0 ? 'var(--accent2)' : 'var(--muted)' }}>
                                {row.saldoDebit > 0 ? `Rp ${fmt(row.saldoDebit)}` : '—'}
                              </td>
                              <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: row.saldoKredit > 0 ? 700 : 400, color: row.saldoKredit > 0 ? 'var(--red)' : 'var(--muted)' }}>
                                {row.saldoKredit > 0 ? `Rp ${fmt(row.saldoKredit)}` : '—'}
                              </td>
                            </tr>
                          ))}
                        </>
                      ))
                      : filtered.map((row, ri) => (
                        <tr key={ri}>
                          <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{row.akun?.kode}</td>
                          <td style={{ fontWeight: 500 }}>{row.akun?.nama}</td>
                          <td><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: KELOMPOK_COLOR[row.akun?.kelompok] + '20', color: KELOMPOK_COLOR[row.akun?.kelompok], fontWeight: 700 }}>{row.akun?.kelompok}</span></td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)' }}>{row.totalDebit > 0 ? `Rp ${fmt(row.totalDebit)}` : '—'}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)' }}>{row.totalKredit > 0 ? `Rp ${fmt(row.totalKredit)}` : '—'}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: row.saldoDebit > 0 ? 700 : 400, color: row.saldoDebit > 0 ? 'var(--accent2)' : 'var(--muted)' }}>{row.saldoDebit > 0 ? `Rp ${fmt(row.saldoDebit)}` : '—'}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: row.saldoKredit > 0 ? 700 : 400, color: row.saldoKredit > 0 ? 'var(--red)' : 'var(--muted)' }}>{row.saldoKredit > 0 ? `Rp ${fmt(row.saldoKredit)}` : '—'}</td>
                        </tr>
                      ))
                    }
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--surface2)', fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                      <td colSpan={3} style={{ fontWeight: 700, color: 'var(--muted)', fontSize: 12 }}>TOTAL</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>Rp {fmt(filtered.reduce((s, d) => s + d.totalDebit, 0))}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>Rp {fmt(filtered.reduce((s, d) => s + d.totalKredit, 0))}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent2)', fontSize: 14 }}>Rp {fmt(totalD)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--red)', fontSize: 14 }}>Rp {fmt(totalK)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
      </div>
    </>
  )
}
