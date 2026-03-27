import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { getStatsDashboard, getTransaksi } from '../lib/supabase'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { id } from 'date-fns/locale'

const fmt = (n) => new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
const fmtFull = (n) => new Intl.NumberFormat('id-ID').format(n)

const COLORS = ['#2D6A4F', '#E67E22', '#2471A3', '#C0392B', '#8E44AD', '#27AE60']

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ pemasukan: 0, pengeluaran: 0, saldo: 0 })
  const [chartData, setChartData] = useState([])
  const [pieData, setPieData] = useState([])
  const [recentTx, setRecentTx] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    try {
      const tahun = new Date().getFullYear()
      const allData = await getStatsDashboard(user.id, tahun)
      const recent = await getTransaksi(user.id)

      // KPI bulan ini
      const now = new Date()
      const bulanIni = allData.filter(t => {
        const d = new Date(t.tanggal)
        return d >= startOfMonth(now) && d <= endOfMonth(now)
      })
      const pemasukan = bulanIni.filter(t => t.jenis === 'pemasukan').reduce((s, t) => s + t.jumlah, 0)
      const pengeluaran = bulanIni.filter(t => t.jenis === 'pengeluaran').reduce((s, t) => s + t.jumlah, 0)
      setStats({ pemasukan, pengeluaran, saldo: pemasukan - pengeluaran })

      // Chart 6 bulan
      const months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i))
      const chart = months.map(m => {
        const bulanData = allData.filter(t => {
          const d = new Date(t.tanggal)
          return d >= startOfMonth(m) && d <= endOfMonth(m)
        })
        return {
          name: format(m, 'MMM', { locale: id }),
          pemasukan: bulanData.filter(t => t.jenis === 'pemasukan').reduce((s, t) => s + t.jumlah, 0),
          pengeluaran: bulanData.filter(t => t.jenis === 'pengeluaran').reduce((s, t) => s + t.jumlah, 0),
        }
      })
      setChartData(chart)

      // Pie — kategori pengeluaran bulan ini
      const katMap = {}
      bulanIni.filter(t => t.jenis === 'pengeluaran').forEach(t => {
        katMap[t.kategori] = (katMap[t.kategori] || 0) + t.jumlah
      })
      setPieData(Object.entries(katMap).map(([name, value]) => ({ name, value })))

      setRecentTx(recent.slice(0, 8))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="loader"><div className="spinner" /></div>

  const bulan = format(new Date(), 'MMMM yyyy', { locale: id })

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Dashboard</div>
        <div className="topbar-right">
          <span style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 20, padding: '5px 14px', fontWeight: 600 }}>
            📅 {bulan}
          </span>
        </div>
      </div>

      <div className="page-content">
        {/* KPI */}
        <div className="kpi-grid">
          <div className="kpi-card primary">
            <div className="kpi-label">Saldo Bersih</div>
            <div className="kpi-value" style={{ color: '#fff' }}>Rp {fmt(stats.saldo)}</div>
            <div className="kpi-bar" style={{ background: '#52B788' }} />
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Total Pemasukan</div>
            <div className="kpi-value" style={{ color: 'var(--accent2)' }}>Rp {fmt(stats.pemasukan)}</div>
            <div className="kpi-bar" style={{ background: 'var(--accent2)' }} />
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Total Pengeluaran</div>
            <div className="kpi-value" style={{ color: 'var(--red)' }}>Rp {fmt(stats.pengeluaran)}</div>
            <div className="kpi-bar" style={{ background: 'var(--red)' }} />
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Transaksi Bulan Ini</div>
            <div className="kpi-value" style={{ color: 'var(--blue)' }}>{recentTx.length}</div>
            <div className="kpi-bar" style={{ background: 'var(--blue)' }} />
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, fontSize: 14, fontWeight: 700, flex: '1 1 auto', minWidth: 160, maxWidth: 260 }}
            onClick={() => navigate('/pos')}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a1 1 0 000 2h12a1 1 0 100-2H4zM3 8a1 1 0 011-1h12a1 1 0 011 1v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 100 2h4a1 1 0 100-2H8z"/></svg>
            Buka POS Kasir
          </button>
          <button
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, fontSize: 14, border: '1px solid var(--border)', flex: '1 1 auto', minWidth: 140, maxWidth: 200 }}
            onClick={() => navigate('/produk')}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4zM3 9a1 1 0 000 2h.01a1 1 0 000-2H3zm4 0a1 1 0 000 2h6a1 1 0 000-2H7zm6 0a1 1 0 000 2h.01a1 1 0 000-2H13zM3 14a1 1 0 000 2h.01a1 1 0 000-2H3zm4 0a1 1 0 000 2h6a1 1 0 000-2H7zm6 0a1 1 0 000 2h.01a1 1 0 000-2H13z"/></svg>
            Kelola Produk
          </button>
          <button
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, fontSize: 14, border: '1px solid var(--border)', flex: '1 1 auto', minWidth: 140, maxWidth: 200 }}
            onClick={() => navigate('/transaksi')}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/></svg>
            Catat Transaksi
          </button>
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 16, marginBottom: 20 }} className="chart-grid-2col">
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Arus Kas 6 Bulan</div>
                <div className="card-sub">Pemasukan vs Pengeluaran</div>
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                {[['#2D6A4F', 'Pemasukan'], ['#B7E4C7', 'Pengeluaran']].map(([c, l]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
                    {l}
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(v) => [`Rp ${fmtFull(v)}`, '']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }} />
                <Bar dataKey="pemasukan" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pengeluaran" fill="#B7E4C7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Kategori Pengeluaran</div>
                <div className="card-sub">Bulan ini</div>
              </div>
            </div>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" stroke="none">
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`Rp ${fmtFull(v)}`, '']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ marginTop: 8 }}>
                  {pieData.slice(0, 4).map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                        <span style={{ color: 'var(--text)', fontWeight: 500 }}>{d.name || 'Lainnya'}</span>
                      </div>
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)', fontSize: 11 }}>Rp {fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <div className="empty-sub">Belum ada data</div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Transaksi Terbaru</div>
              <div className="card-sub">{recentTx.length} transaksi terakhir</div>
            </div>
            <a href="/transaksi" className="btn btn-ghost btn-sm">Lihat semua</a>
          </div>
          {recentTx.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">Belum ada transaksi</div>
              <div className="empty-sub">Mulai catat transaksi pertama Anda</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Keterangan</th>
                    <th>Tanggal</th>
                    <th>Kategori</th>
                    <th style={{ textAlign: 'right' }}>Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTx.map(tx => (
                    <tr key={tx.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: tx.jenis === 'pemasukan' ? 'var(--accent-light)' : 'var(--red-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                            {tx.jenis === 'pemasukan' ? '↑' : '↓'}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{tx.keterangan}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: 12 }}>
                        {format(new Date(tx.tanggal), 'd MMM yyyy', { locale: id })}
                      </td>
                      <td>
                        <span className="badge badge-gray">{tx.kategori || '—'}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600, color: tx.jenis === 'pemasukan' ? 'var(--accent2)' : 'var(--red)', fontSize: 13 }}>
                        {tx.jenis === 'pemasukan' ? '+' : '-'}Rp {fmtFull(tx.jumlah)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
