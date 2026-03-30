import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getNeracaSaldo, getJurnal, initAkunDefault } from '../lib/supabase'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

const fmt = (n) => new Intl.NumberFormat('id-ID').format(n || 0)
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

export default function LaporanKeuangan() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [tab, setTab] = useState('lr') // lr | neraca | perubahan_ekuitas

  const namaUsaha = user?.user_metadata?.nama_usaha || 'Usaha Saya'
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      await initAkunDefault(user.id)
      const [ns, jurnalPenyesuaian] = await Promise.all([
        getNeracaSaldo(user.id),
        getJurnal(user.id, { tipe: 'penyesuaian' }),
      ])

      // Hitung penyesuaian
      const pMap = {}
      for (const j of jurnalPenyesuaian) {
        if (!j.tanggal || new Date(j.tanggal).getFullYear() !== tahun) continue
        for (const d of (j.jurnal_detail || [])) {
          if (!pMap[d.akun_id]) pMap[d.akun_id] = { debit: 0, kredit: 0 }
          pMap[d.akun_id].debit += d.debit || 0
          pMap[d.akun_id].kredit += d.kredit || 0
        }
      }

      // Saldo disesuaikan per akun
      const akunAdj = ns.map(row => {
        const p = pMap[row.akun?.id] || { debit: 0, kredit: 0 }
        const adjD = row.saldoDebit + p.debit - p.kredit
        const adjK = row.saldoKredit + p.kredit - p.debit
        return {
          akun: row.akun,
          saldo: adjD > adjK ? adjD - adjK : -(adjK - adjD),
        }
      })

      const byKel = (kel) => akunAdj.filter(a => a.akun?.kelompok === kel)

      // L/R
      const pendapatan = byKel('Pendapatan')
      const beban = byKel('Beban')
      const totalPendapatan = pendapatan.reduce((s, a) => s + Math.max(0, -a.saldo), 0) // kredit normal
      const totalPendapatanAlt = pendapatan.reduce((s, a) => s + (a.saldo < 0 ? -a.saldo : a.saldo), 0)
      // fix: pendapatan punya normal kredit, saldo negatif = credit balance
      const calcPendapatan = pendapatan.reduce((s, a) => {
        const akun = a.akun
        // normal kredit berarti saldo positif = lebih banyak kredit
        return s + (akun?.normal === 'kredit' ? Math.max(0, -a.saldo) || Math.abs(a.saldo) : 0)
      }, 0)
      const totalP = pendapatan.reduce((s, a) => s + Math.abs(a.saldo), 0)
      const totalB = beban.reduce((s, a) => s + Math.abs(a.saldo), 0)
      const labaKotor = totalP - totalB
      const labaUsaha = labaKotor

      // Neraca
      const aset = byKel('Aset')
      const liabilitas = byKel('Liabilitas')
      const ekuitas = byKel('Ekuitas')
      const totalAset = aset.reduce((s, a) => s + Math.abs(a.saldo), 0)
      const totalLiabilitas = liabilitas.reduce((s, a) => s + Math.abs(a.saldo), 0)
      const totalEkuitas = ekuitas.reduce((s, a) => s + Math.abs(a.saldo), 0) + labaUsaha

      setData({ pendapatan, beban, aset, liabilitas, ekuitas, totalP, totalB, labaUsaha, totalAset, totalLiabilitas, totalEkuitas })
    } catch (e) { toast.error('Gagal memuat laporan keuangan') }
    finally { setLoading(false) }
  }, [user.id, tahun])

  useEffect(() => { load() }, [load])

  // ─── EXPORT EXCEL ─────────────────────────────────────────────────────────────
  const exportExcel = () => {
    if (!data) return
    const wb = XLSX.utils.book_new()
    const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

    const createHeader = (judul, subjudul) => [
      [namaUsaha],
      [judul],
      [`Per 31 Desember ${tahun}`],
      ['(Dalam Rupiah)'],
      [],
      subjudul,
    ]

    // ── Sheet 1: Laporan Laba Rugi ───────────────────────────────────────────
    const lrRows = [
      ...createHeader('LAPORAN LABA RUGI', ['No.', 'Nama Akun', 'Jumlah']),
      ['', 'PENDAPATAN', ''],
      ...data.pendapatan.map((a, i) => [i + 1, a.akun?.nama, Math.abs(a.saldo)]),
      ['', 'Total Pendapatan', data.totalP],
      [],
      ['', 'BEBAN USAHA', ''],
      ...data.beban.map((a, i) => [i + 1, a.akun?.nama, Math.abs(a.saldo)]),
      ['', 'Total Beban', data.totalB],
      [],
      ['', data.labaUsaha >= 0 ? 'LABA BERSIH' : 'RUGI BERSIH', Math.abs(data.labaUsaha)],
    ]
    const wsLR = XLSX.utils.aoa_to_sheet(lrRows)
    wsLR['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 18 }]
    wsLR['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }, { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } }]
    XLSX.utils.book_append_sheet(wb, wsLR, 'Laporan Laba Rugi')

    // ── Sheet 2: Neraca ───────────────────────────────────────────────────────
    const neracaRows = [
      ...createHeader('NERACA', ['No.', 'Nama Akun', 'Jumlah']),
      ['', 'ASET', ''],
      ...data.aset.map((a, i) => [i + 1, a.akun?.nama, Math.abs(a.saldo)]),
      ['', 'Total Aset', data.totalAset],
      [],
      ['', 'LIABILITAS', ''],
      ...data.liabilitas.map((a, i) => [i + 1, a.akun?.nama, Math.abs(a.saldo)]),
      ['', 'Total Liabilitas', data.totalLiabilitas],
      [],
      ['', 'EKUITAS', ''],
      ...data.ekuitas.map((a, i) => [i + 1, a.akun?.nama, Math.abs(a.saldo)]),
      ['', data.labaUsaha >= 0 ? 'Laba Tahun Berjalan' : 'Rugi Tahun Berjalan', data.labaUsaha],
      ['', 'Total Ekuitas', data.totalEkuitas],
      [],
      ['', 'TOTAL LIABILITAS + EKUITAS', data.totalLiabilitas + data.totalEkuitas],
    ]
    const wsNeraca = XLSX.utils.aoa_to_sheet(neracaRows)
    wsNeraca['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, wsNeraca, 'Neraca')

    // ── Sheet 3: Neraca Saldo ─────────────────────────────────────────────────
    const allAkun = [...data.aset, ...data.liabilitas, ...data.ekuitas, ...data.pendapatan, ...data.beban]
    const nsRows = [
      ...createHeader('NERACA SALDO', ['No. Akun', 'Nama Akun', 'Kelompok', 'Saldo Debit', 'Saldo Kredit']),
      ...allAkun.map(a => [
        a.akun?.kode,
        a.akun?.nama,
        a.akun?.kelompok,
        Math.abs(a.saldo) > 0 && a.akun?.normal === 'debit' ? Math.abs(a.saldo) : '',
        Math.abs(a.saldo) > 0 && a.akun?.normal === 'kredit' ? Math.abs(a.saldo) : '',
      ]),
      ['', '', 'TOTAL', allAkun.filter(a => a.akun?.normal === 'debit').reduce((s, a) => s + Math.abs(a.saldo), 0), allAkun.filter(a => a.akun?.normal === 'kredit').reduce((s, a) => s + Math.abs(a.saldo), 0)],
    ]
    const wsNS = XLSX.utils.aoa_to_sheet(nsRows)
    wsNS['!cols'] = [{ wch: 10 }, { wch: 35 }, { wch: 14 }, { wch: 18 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, wsNS, 'Neraca Saldo')

    // ── Sheet 4: Perubahan Ekuitas ────────────────────────────────────────────
    const modalAwal = data.ekuitas.find(a => a.akun?.nama?.toLowerCase().includes('modal'))
    const prive = data.ekuitas.find(a => a.akun?.nama?.toLowerCase().includes('prive'))
    const modalAwalVal = modalAwal ? Math.abs(modalAwal.saldo) : 0
    const priveVal = prive ? Math.abs(prive.saldo) : 0
    const peRows = [
      ...createHeader('LAPORAN PERUBAHAN EKUITAS', ['Keterangan', 'Jumlah']),
      ['Modal Awal', modalAwalVal],
      [data.labaUsaha >= 0 ? '(+) Laba Bersih' : '(-) Rugi Bersih', data.labaUsaha],
      ['(-) Prive Pemilik', -priveVal],
      ['Modal Akhir', modalAwalVal + data.labaUsaha - priveVal],
    ]
    const wsPE = XLSX.utils.aoa_to_sheet(peRows)
    wsPE['!cols'] = [{ wch: 30 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, wsPE, 'Perubahan Ekuitas')

    // ── Write file ────────────────────────────────────────────────────────────
    XLSX.writeFile(wb, `Laporan_Keuangan_${namaUsaha.replace(/\s+/g, '_')}_${tahun}.xlsx`)
    toast.success('Laporan berhasil diexport ke Excel!')
  }

  const SeksiAkun = ({ judul, items, total, totalLabel, variant }) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', padding: '8px 0', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>{judul}</div>
      {items.map((a, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
          <span style={{ color: 'var(--muted)' }}>{a.akun?.nama}</span>
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>Rp {fmt(Math.abs(a.saldo))}</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 700, fontSize: 14, borderTop: '2px solid var(--border)', color: variant === 'debit' ? 'var(--accent2)' : variant === 'kredit' ? 'var(--red)' : 'var(--text)' }}>
        <span>{totalLabel}</span>
        <span style={{ fontFamily: 'var(--mono)' }}>Rp {fmt(total)}</span>
      </div>
    </div>
  )

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Laporan Keuangan</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="field-input" style={{ width: 'auto' }} value={tahun} onChange={e => setTahun(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-primary" onClick={exportExcel} disabled={loading || !data}>
            ⬇ Export Excel
          </button>
        </div>
      </div>
      <div className="page-topbar-mobile">
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>{tahun}</span>
        <button className="btn btn-primary btn-sm" onClick={exportExcel} disabled={!data}>⬇ Excel</button>
      </div>

      <div className="page-content">
        {/* Tab laporan */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface2)', borderRadius: 10, padding: 4, marginBottom: 16, width: 'fit-content' }}>
          {[['lr','📊 Laba Rugi'],['neraca','⚖️ Neraca'],['perubahan_ekuitas','🔄 Perubahan Ekuitas']].map(([key,label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: tab === key ? 'white' : 'transparent',
                color: tab === key ? 'var(--text)' : 'var(--muted)',
                boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,.1)' : 'none' }}>
              {label}
            </button>
          ))}
        </div>

        {loading ? <div className="loader"><div className="spinner" /></div>
          : !data ? (
            <div className="card"><div className="empty-state"><div className="empty-icon">📊</div><div className="empty-title">Belum ada data laporan</div></div></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 16 }}>

              {/* Kop surat */}
              <div className="card" style={{ padding: '20px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent2)' }}>{namaUsaha}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>
                  {tab === 'lr' ? 'LAPORAN LABA RUGI' : tab === 'neraca' ? 'NERACA' : 'LAPORAN PERUBAHAN EKUITAS'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Per 31 Desember {tahun}</div>
              </div>

              {/* Laporan L/R */}
              {tab === 'lr' && (
                <div className="card">
                  <SeksiAkun judul="Pendapatan" items={data.pendapatan} total={data.totalP} totalLabel="Total Pendapatan" variant="kredit" />
                  <SeksiAkun judul="Beban Usaha" items={data.beban} total={data.totalB} totalLabel="Total Beban" variant="debit" />
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: data.labaUsaha >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: 10, marginTop: 8, fontWeight: 800, fontSize: 16 }}>
                    <span style={{ color: data.labaUsaha >= 0 ? '#166534' : '#991b1b' }}>
                      {data.labaUsaha >= 0 ? '📈 LABA BERSIH' : '📉 RUGI BERSIH'}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', color: data.labaUsaha >= 0 ? '#166534' : '#991b1b' }}>
                      Rp {fmt(Math.abs(data.labaUsaha))}
                    </span>
                  </div>
                </div>
              )}

              {/* Neraca */}
              {tab === 'neraca' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="card">
                    <SeksiAkun judul="ASET" items={data.aset} total={data.totalAset} totalLabel="Total Aset" variant="debit" />
                  </div>
                  <div className="card">
                    <SeksiAkun judul="LIABILITAS" items={data.liabilitas} total={data.totalLiabilitas} totalLabel="Total Liabilitas" variant="kredit" />
                    <div style={{ height: 16 }} />
                    <SeksiAkun judul="EKUITAS" items={[...data.ekuitas, { akun: { nama: data.labaUsaha >= 0 ? 'Laba Tahun Berjalan' : 'Rugi Tahun Berjalan' }, saldo: data.labaUsaha }]} total={data.totalEkuitas} totalLabel="Total Ekuitas" variant="kredit" />
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontWeight: 800, fontSize: 15, borderTop: '2px solid var(--border)', marginTop: 8 }}>
                      <span>Total Liabilitas + Ekuitas</span>
                      <span style={{ fontFamily: 'var(--mono)', color: Math.abs(data.totalAset - (data.totalLiabilitas + data.totalEkuitas)) < 1 ? 'var(--accent2)' : 'var(--red)' }}>
                        Rp {fmt(data.totalLiabilitas + data.totalEkuitas)}
                      </span>
                    </div>
                    {Math.abs(data.totalAset - (data.totalLiabilitas + data.totalEkuitas)) < 1 ? (
                      <div style={{ fontSize: 12, color: '#166534', fontWeight: 600, textAlign: 'center', marginTop: 4 }}>✓ Neraca Seimbang</div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#991b1b', fontWeight: 600, textAlign: 'center', marginTop: 4 }}>⚠ Neraca Belum Seimbang</div>
                    )}
                  </div>
                </div>
              )}

              {/* Perubahan Ekuitas */}
              {tab === 'perubahan_ekuitas' && (() => {
                const modalAwal = data.ekuitas.find(a => a.akun?.nama?.toLowerCase().includes('modal'))
                const prive = data.ekuitas.find(a => a.akun?.nama?.toLowerCase().includes('prive'))
                const modalAwalVal = modalAwal ? Math.abs(modalAwal.saldo) : 0
                const priveVal = prive ? Math.abs(prive.saldo) : 0
                const modalAkhir = modalAwalVal + data.labaUsaha - priveVal
                return (
                  <div className="card">
                    {[
                      { label: 'Modal Awal', val: modalAwalVal, color: 'var(--text)' },
                      { label: data.labaUsaha >= 0 ? '(+) Laba Bersih' : '(-) Rugi Bersih', val: data.labaUsaha, color: data.labaUsaha >= 0 ? 'var(--accent2)' : 'var(--red)' },
                      { label: '(-) Prive Pemilik', val: -priveVal, color: 'var(--red)' },
                    ].map((row, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                        <span style={{ color: 'var(--muted)' }}>{row.label}</span>
                        <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: row.color }}>
                          {row.val < 0 ? '- ' : ''}Rp {fmt(Math.abs(row.val))}
                        </span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontWeight: 800, fontSize: 16 }}>
                      <span>Modal Akhir</span>
                      <span style={{ fontFamily: 'var(--mono)', color: modalAkhir >= 0 ? 'var(--accent2)' : 'var(--red)' }}>Rp {fmt(Math.abs(modalAkhir))}</span>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
      </div>
    </>
  )
}
