import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getNeracaSaldo, getJurnal, initAkunDefault } from '../lib/supabase'
import toast from 'react-hot-toast'

const fmt = (n) => new Intl.NumberFormat('id-ID').format(n || 0)
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

export default function KertasKerja() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [tahun, setTahun] = useState(new Date().getFullYear())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      await initAkunDefault(user.id)
      // Ambil neraca saldo & jurnal penyesuaian
      const [ns, jurnalPenyesuaian] = await Promise.all([
        getNeracaSaldo(user.id),
        getJurnal(user.id, { tipe: 'penyesuaian' }),
      ])

      // Hitung penyesuaian per akun
      const penyesuaianMap = {}
      for (const j of jurnalPenyesuaian) {
        if (!j.tanggal || new Date(j.tanggal).getFullYear() !== tahun) continue
        for (const d of (j.jurnal_detail || [])) {
          if (!penyesuaianMap[d.akun_id]) penyesuaianMap[d.akun_id] = { debit: 0, kredit: 0 }
          penyesuaianMap[d.akun_id].debit += d.debit || 0
          penyesuaianMap[d.akun_id].kredit += d.kredit || 0
        }
      }

      // Bangun baris kertas kerja
      const result = ns.map(row => {
        const aid = row.akun?.id
        const p = penyesuaianMap[aid] || { debit: 0, kredit: 0 }

        // NS Disesuaikan
        const nsD = row.saldoDebit + p.debit - p.kredit
        const nsK = row.saldoKredit + p.kredit - p.debit
        const nsDAdj = nsD > 0 ? nsD : 0
        const nsKAdj = nsK > 0 ? nsK : 0

        // Alokasi ke L/R atau Neraca
        const kelompok = row.akun?.kelompok
        const isLR = kelompok === 'Pendapatan' || kelompok === 'Beban'
        const lrD = isLR ? nsDAdj : 0
        const lrK = isLR ? nsKAdj : 0
        const neracaD = !isLR ? nsDAdj : 0
        const neracaK = !isLR ? nsKAdj : 0

        return {
          akun: row.akun,
          ns: { debit: row.saldoDebit, kredit: row.saldoKredit },
          penyesuaian: p,
          nsAdj: { debit: nsDAdj, kredit: nsKAdj },
          lr: { debit: lrD, kredit: lrK },
          neraca: { debit: neracaD, kredit: neracaK },
        }
      })

      setRows(result)
    } catch (e) { toast.error('Gagal memuat kertas kerja') }
    finally { setLoading(false) }
  }, [user.id, tahun])

  useEffect(() => { load() }, [load])

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  const total = (field, col) => rows.reduce((s, r) => s + (r[field]?.[col] || 0), 0)

  const totalLRD = total('lr', 'debit')
  const totalLRK = total('lr', 'kredit')
  const labaRugi = totalLRK - totalLRD
  const isLaba = labaRugi >= 0

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Kertas Kerja (Worksheet)</div>
        {!loading && rows.length > 0 && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 20, background: isLaba ? '#dcfce7' : '#fee2e2', color: isLaba ? '#166534' : '#991b1b' }}>
              {isLaba ? '📈 Laba' : '📉 Rugi'}: Rp {fmt(Math.abs(labaRugi))}
            </span>
          </div>
        )}
      </div>
      <div className="page-topbar-mobile">
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>10 Kolom</span>
      </div>

      <div className="page-content">
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          <select className="field-input" style={{ width: 'auto' }} value={tahun} onChange={e => setTahun(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Tahun Buku</span>
        </div>

        {loading ? <div className="loader"><div className="spinner" /></div>
          : rows.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <div className="empty-title">Belum ada data kertas kerja</div>
                <div className="empty-sub">Buat jurnal transaksi untuk mengisi kertas kerja</div>
              </div>
            </div>
          ) : (
            <>
              {/* Ringkasan L/R */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Total Pendapatan', val: total('lr', 'kredit'), color: 'var(--accent2)' },
                  { label: 'Total Beban', val: total('lr', 'debit'), color: 'var(--red)' },
                  { label: isLaba ? 'Laba Bersih' : 'Rugi Bersih', val: Math.abs(labaRugi), color: isLaba ? '#166534' : '#991b1b' },
                  { label: 'Total Aset (Neraca)', val: total('neraca', 'debit'), color: '#3b82f6' },
                ].map(k => (
                  <div key={k.label} className="kpi-card">
                    <div className="kpi-label">{k.label}</div>
                    <div className="kpi-value" style={{ color: k.color, fontSize: 16 }}>Rp {fmt(k.val)}</div>
                  </div>
                ))}
              </div>

              {/* Tabel 10 kolom */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ minWidth: 1100, borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface2)' }}>
                        <th rowSpan={2} style={{ textAlign: 'left', padding: '10px 14px', width: 80, borderBottom: '2px solid var(--border)', fontSize: 11 }}>No.</th>
                        <th rowSpan={2} style={{ textAlign: 'left', padding: '10px 14px', borderBottom: '2px solid var(--border)', fontSize: 11 }}>Nama Akun</th>
                        {[
                          ['Neraca Saldo', 2],
                          ['Penyesuaian', 2],
                          ['NS Disesuaikan', 2],
                          ['Laba / Rugi', 2],
                          ['Neraca', 2],
                        ].map(([label, span]) => (
                          <th key={label} colSpan={span} style={{ textAlign: 'center', padding: '8px 4px', borderBottom: '1px solid var(--border)', borderLeft: '1px solid var(--border)', fontSize: 11, fontWeight: 700 }}>{label}</th>
                        ))}
                      </tr>
                      <tr style={{ background: 'var(--surface2)' }}>
                        {['D','K','D','K','D','K','D','K','D','K'].map((col, i) => (
                          <th key={i} style={{ textAlign: 'right', padding: '6px 10px', borderBottom: '2px solid var(--border)', borderLeft: i % 2 === 0 ? '1px solid var(--border)' : 'none', fontSize: 11, fontWeight: 700, color: col === 'D' ? 'var(--accent2)' : 'var(--red)', width: 110 }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, ri) => (
                        <tr key={ri} style={{ borderBottom: '1px solid var(--border)', background: ri % 2 === 0 ? 'transparent' : 'var(--surface2)' }}>
                          <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{row.akun?.kode}</td>
                          <td style={{ padding: '8px 14px', fontWeight: 500, fontSize: 13 }}>{row.akun?.nama}</td>
                          {[
                            [row.ns.debit, row.ns.kredit],
                            [row.penyesuaian.debit, row.penyesuaian.kredit],
                            [row.nsAdj.debit, row.nsAdj.kredit],
                            [row.lr.debit, row.lr.kredit],
                            [row.neraca.debit, row.neraca.kredit],
                          ].map(([d, k], ci) => (
                            <>
                              <td key={`${ri}-d${ci}`} style={{ textAlign: 'right', padding: '8px 10px', fontFamily: 'var(--mono)', fontSize: 12, borderLeft: '1px solid var(--border)', color: d > 0 ? 'var(--accent2)' : 'var(--muted)' }}>
                                {d > 0 ? fmt(d) : '—'}
                              </td>
                              <td key={`${ri}-k${ci}`} style={{ textAlign: 'right', padding: '8px 10px', fontFamily: 'var(--mono)', fontSize: 12, color: k > 0 ? 'var(--red)' : 'var(--muted)' }}>
                                {k > 0 ? fmt(k) : '—'}
                              </td>
                            </>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      {/* Laba/Rugi row */}
                      {labaRugi !== 0 && (
                        <tr style={{ background: isLaba ? '#f0fdf4' : '#fef2f2', borderTop: '1px solid var(--border)', fontWeight: 700 }}>
                          <td colSpan={2} style={{ padding: '8px 14px', fontWeight: 700, color: isLaba ? '#166534' : '#991b1b', fontSize: 13 }}>
                            {isLaba ? '📈 Laba Bersih' : '📉 Rugi Bersih'}
                          </td>
                          {/* NS, Penyesuaian, NS Adj: kosong */}
                          <td colSpan={6} />
                          {/* L/R: laba masuk sisi yg menyeimbangkan */}
                          <td style={{ textAlign: 'right', padding: '8px 10px', fontFamily: 'var(--mono)', fontWeight: 700, borderLeft: '1px solid var(--border)', color: isLaba ? '#166534' : '#991b1b' }}>
                            {isLaba ? fmt(labaRugi) : '—'}
                          </td>
                          <td style={{ textAlign: 'right', padding: '8px 10px', fontFamily: 'var(--mono)', fontWeight: 700, color: !isLaba ? '#991b1b' : 'var(--muted)' }}>
                            {!isLaba ? fmt(Math.abs(labaRugi)) : '—'}
                          </td>
                          {/* Neraca: sisi berlawanan */}
                          <td style={{ textAlign: 'right', padding: '8px 10px', fontFamily: 'var(--mono)', fontWeight: 700, borderLeft: '1px solid var(--border)', color: !isLaba ? '#991b1b' : 'var(--muted)' }}>
                            {!isLaba ? fmt(Math.abs(labaRugi)) : '—'}
                          </td>
                          <td style={{ textAlign: 'right', padding: '8px 10px', fontFamily: 'var(--mono)', fontWeight: 700, color: isLaba ? '#166534' : 'var(--muted)' }}>
                            {isLaba ? fmt(labaRugi) : '—'}
                          </td>
                        </tr>
                      )}
                      {/* Total row */}
                      <tr style={{ background: 'var(--surface2)', fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                        <td colSpan={2} style={{ padding: '10px 14px', fontWeight: 700, fontSize: 13 }}>TOTAL</td>
                        {[
                          [total('ns','debit'), total('ns','kredit')],
                          [total('penyesuaian','debit'), total('penyesuaian','kredit')],
                          [total('nsAdj','debit'), total('nsAdj','kredit')],
                          [totalLRD + (isLaba ? labaRugi : 0), totalLRK + (!isLaba ? Math.abs(labaRugi) : 0)],
                          [total('neraca','debit') + (!isLaba ? Math.abs(labaRugi) : 0), total('neraca','kredit') + (isLaba ? labaRugi : 0)],
                        ].map(([d, k], ci) => (
                          <>
                            <td key={`tot-d${ci}`} style={{ textAlign: 'right', padding: '10px 10px', fontFamily: 'var(--mono)', fontWeight: 700, borderLeft: '1px solid var(--border)', color: 'var(--accent2)', fontSize: 13 }}>{fmt(d)}</td>
                            <td key={`tot-k${ci}`} style={{ textAlign: 'right', padding: '10px 10px', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--red)', fontSize: 13 }}>{fmt(k)}</td>
                          </>
                        ))}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
      </div>
    </>
  )
}
