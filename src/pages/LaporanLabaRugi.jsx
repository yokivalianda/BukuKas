import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getStatsDashboard } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { format, startOfMonth, endOfMonth, subMonths, getMonth, getYear } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

const fmtFull = (n) => new Intl.NumberFormat('id-ID').format(n)
const fmt = (n) => new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

export default function LaporanLabaRugi() {
  const { user } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [bulanFilter, setBulanFilter] = useState('semua')

  useEffect(() => { load() }, [user, tahun])

  const load = async () => {
    setLoading(true)
    try {
      const rows = await getStatsDashboard(user.id, tahun)
      setData(rows)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  // Monthly breakdown
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const monthData = data.filter(t => {
      const d = new Date(t.tanggal)
      return getMonth(d) === i && getYear(d) === tahun
    })
    const pemasukan = monthData.filter(t => t.jenis === 'pemasukan').reduce((s, t) => s + t.jumlah, 0)
    const pengeluaran = monthData.filter(t => t.jenis === 'pengeluaran').reduce((s, t) => s + t.jumlah, 0)
    return { name: BULAN[i].slice(0, 3), bulan: i, pemasukan, pengeluaran, laba: pemasukan - pengeluaran }
  })

  // Filtered data
  const filtered = bulanFilter === 'semua'
    ? data
    : data.filter(t => getMonth(new Date(t.tanggal)) === Number(bulanFilter))

  const pemasukan = filtered.filter(t => t.jenis === 'pemasukan').reduce((s, t) => s + t.jumlah, 0)
  const pengeluaran = filtered.filter(t => t.jenis === 'pengeluaran').reduce((s, t) => s + t.jumlah, 0)
  const laba = pemasukan - pengeluaran
  const margin = pemasukan > 0 ? ((laba / pemasukan) * 100).toFixed(1) : 0

  // Kategori breakdown
  const katPemasukan = {}
  const katPengeluaran = {}
  filtered.forEach(t => {
    if (t.jenis === 'pemasukan') katPemasukan[t.kategori || 'Lainnya'] = (katPemasukan[t.kategori || 'Lainnya'] || 0) + t.jumlah
    else katPengeluaran[t.kategori || 'Lainnya'] = (katPengeluaran[t.kategori || 'Lainnya'] || 0) + t.jumlah
  })

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Laporan Laba Rugi</div>
        <div className="topbar-right">
          <select className="field-input" value={tahun} onChange={e => setTahun(Number(e.target.value))} style={{ width: 'auto', padding: '6px 30px 6px 10px' }}>
            {[2023, 2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
          </select>
          <select className="field-input" value={bulanFilter} onChange={e => setBulanFilter(e.target.value)} style={{ width: 'auto', padding: '6px 30px 6px 10px' }}>
            <option value="semua">Semua Bulan</option>
            {BULAN.map((b, i) => <option key={i} value={i}>{b}</option>)}
          </select>
        </div>
      </div>

      <div className="page-content">
        {/* KPI */}
        <div className="kpi-grid">
          <div className="kpi-card primary">
            <div className="kpi-label">Laba Bersih</div>
            <div className="kpi-value" style={{ color: '#fff' }}>Rp {fmt(laba)}</div>
            <div className="kpi-bar" style={{ background: laba >= 0 ? '#52B788' : '#E74C3C' }} />
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Total Pendapatan</div>
            <div className="kpi-value" style={{ color: 'var(--accent2)' }}>Rp {fmt(pemasukan)}</div>
            <div className="kpi-bar" style={{ background: 'var(--accent2)' }} />
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Total Beban</div>
            <div className="kpi-value" style={{ color: 'var(--red)' }}>Rp {fmt(pengeluaran)}</div>
            <div className="kpi-bar" style={{ background: 'var(--red)' }} />
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Margin Laba</div>
            <div className="kpi-value" style={{ color: Number(margin) >= 0 ? 'var(--accent2)' : 'var(--red)' }}>{margin}%</div>
            <div className="kpi-bar" style={{ background: 'var(--blue)' }} />
          </div>
        </div>

        {/* Trend chart */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div><div className="card-title">Tren Bulanan {tahun}</div><div className="card-sub">Laba bersih per bulan</div></div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickFormatter={v => `${fmt(v)}`} axisLine={false} tickLine={false} width={55} />
              <Tooltip formatter={v => [`Rp ${fmtFull(v)}`, '']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }} />
              <Line dataKey="pemasukan" stroke="#2D6A4F" strokeWidth={2} dot={false} name="Pendapatan" />
              <Line dataKey="pengeluaran" stroke="#C0392B" strokeWidth={2} dot={false} name="Beban" />
              <Line dataKey="laba" stroke="#2471A3" strokeWidth={2} strokeDasharray="5 3" dot={false} name="Laba" />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 8 }}>
            {[['#2D6A4F', 'Pendapatan'], ['#C0392B', 'Beban'], ['#2471A3', 'Laba']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
                <div style={{ width: 20, height: 2, background: c }} /> {l}
              </div>
            ))}
          </div>
        </div>

        {/* Laporan table */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }} className="chart-grid-2col">
          {/* Pendapatan */}
          <div className="card">
            <div className="card-header"><div className="card-title" style={{ color: 'var(--accent2)' }}>↑ Pendapatan</div></div>
            {Object.keys(katPemasukan).length === 0 ? (
              <div className="empty-state" style={{ padding: 20 }}><div className="empty-sub">Belum ada data</div></div>
            ) : (
              <>
                {Object.entries(katPemasukan).sort((a, b) => b[1] - a[1]).map(([kat, val]) => (
                  <div key={kat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text)' }}>{kat}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent2)' }}>Rp {fmtFull(val)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontWeight: 700, fontSize: 14 }}>
                  <span>Total Pendapatan</span>
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--accent2)' }}>Rp {fmtFull(pemasukan)}</span>
                </div>
              </>
            )}
          </div>

          {/* Beban */}
          <div className="card">
            <div className="card-header"><div className="card-title" style={{ color: 'var(--red)' }}>↓ Beban / Pengeluaran</div></div>
            {Object.keys(katPengeluaran).length === 0 ? (
              <div className="empty-state" style={{ padding: 20 }}><div className="empty-sub">Belum ada data</div></div>
            ) : (
              <>
                {Object.entries(katPengeluaran).sort((a, b) => b[1] - a[1]).map(([kat, val]) => (
                  <div key={kat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text)' }}>{kat}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--red)' }}>Rp {fmtFull(val)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontWeight: 700, fontSize: 14 }}>
                  <span>Total Beban</span>
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--red)' }}>Rp {fmtFull(pengeluaran)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Laba bersih footer */}
        <div style={{ background: laba >= 0 ? 'var(--accent)' : 'var(--red)', borderRadius: 'var(--r)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600 }}>
            {bulanFilter === 'semua' ? `Laba Bersih Tahun ${tahun}` : `Laba Bersih ${BULAN[Number(bulanFilter)]}`}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: -1 }}>
            {laba < 0 ? '-' : '+'}Rp {fmtFull(Math.abs(laba))}
          </div>
        </div>
      </div>
    </>
  )
}
