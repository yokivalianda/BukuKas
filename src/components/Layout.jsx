import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const IcoDashboard = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/></svg>
const IcoTransaksi = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/></svg>
const IcoInvoice = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/></svg>
const IcoLaporan = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>
const IcoKontak = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
const IcoPengaturan = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/></svg>
const IcoPOS = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a1 1 0 000 2h12a1 1 0 100-2H4zM3 8a1 1 0 011-1h12a1 1 0 011 1v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 100 2h4a1 1 0 100-2H8z"/></svg>
const IcoProduk = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4zM3 9a1 1 0 000 2h.01a1 1 0 000-2H3zm4 0a1 1 0 000 2h6a1 1 0 000-2H7zm6 0a1 1 0 000 2h.01a1 1 0 000-2H13zM3 14a1 1 0 000 2h.01a1 1 0 000-2H3zm4 0a1 1 0 000 2h6a1 1 0 000-2H7zm6 0a1 1 0 000 2h.01a1 1 0 000-2H13z"/></svg>
const IcoMenu = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/></svg>
const IcoClose = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
const IcoJurnal = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 1a1 1 0 000 2h8a1 1 0 100-2H6zm0 4a1 1 0 000 2h8a1 1 0 100-2H6zm0 4a1 1 0 000 2h4a1 1 0 100-2H6z" clipRule="evenodd"/></svg>

const bottomNavItems = [
  { to: '/', end: true, icon: IcoDashboard, label: 'Dashboard' },
  { to: '/pos', icon: IcoPOS, label: 'Kasir' },
  { to: '/transaksi', icon: IcoTransaksi, label: 'Transaksi' },
  { to: '/jurnal', icon: IcoJurnal, label: 'Jurnal' },
  { to: '/pengaturan', icon: IcoPengaturan, label: 'Lainnya' },
]

const NavItem = ({ to, end, icon: Icon, label, onClick }) => (
  <NavLink to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClick}>
    <Icon size={17} /> {label}
  </NavLink>
)

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const close = () => setSidebarOpen(false)

  const namaUsaha = user?.user_metadata?.nama_usaha || 'Usaha Saya'
  const initials = namaUsaha.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const handleSignOut = async () => {
    await signOut()
    toast.success('Berhasil keluar')
    navigate('/auth')
  }

  const pageTitles = {
    '/': 'Dashboard', '/pos': 'POS Kasir', '/produk': 'Produk', '/transaksi': 'Transaksi',
    '/invoice': 'Invoice', '/laporan': 'Laba Rugi', '/kontak': 'Kontak', '/pengaturan': 'Pengaturan',
    '/jurnal': 'Jurnal Transaksi', '/buku-besar': 'Buku Besar', '/neraca-saldo': 'Neraca Saldo',
    '/jurnal-penyesuaian': 'Jurnal Penyesuaian', '/kertas-kerja': 'Kertas Kerja', '/laporan-keuangan': 'Laporan Keuangan',
  }
  const pageTitle = pageTitles[location.pathname] || 'BukuKas'

  const SidebarContent = ({ onNav }) => (
    <>
      <NavItem to="/" end icon={IcoDashboard} label="Dashboard" onClick={onNav} />

      <div className="nav-section">Kasir</div>
      <NavItem to="/pos" icon={IcoPOS} label="POS Kasir" onClick={onNav} />
      <NavItem to="/produk" icon={IcoProduk} label="Produk" onClick={onNav} />

      <div className="nav-section">Keuangan</div>
      <NavItem to="/transaksi" icon={IcoTransaksi} label="Transaksi" onClick={onNav} />
      <NavItem to="/invoice" icon={IcoInvoice} label="Invoice" onClick={onNav} />

      <div className="nav-section">Akuntansi</div>
      <NavItem to="/jurnal" icon={IcoJurnal} label="Jurnal Transaksi" onClick={onNav} />
      <NavItem to="/buku-besar" icon={IcoJurnal} label="Buku Besar" onClick={onNav} />
      <NavItem to="/neraca-saldo" icon={IcoLaporan} label="Neraca Saldo" onClick={onNav} />
      <NavItem to="/jurnal-penyesuaian" icon={IcoJurnal} label="Jurnal Penyesuaian" onClick={onNav} />
      <NavItem to="/kertas-kerja" icon={IcoLaporan} label="Kertas Kerja" onClick={onNav} />

      <div className="nav-section">Laporan</div>
      <NavItem to="/laporan-keuangan" icon={IcoLaporan} label="Laporan Keuangan" onClick={onNav} />
      <NavItem to="/laporan" icon={IcoLaporan} label="Laba Rugi Cepat" onClick={onNav} />

      <div className="nav-section">Lainnya</div>
      <NavItem to="/kontak" icon={IcoKontak} label="Kontak" onClick={onNav} />
      <NavItem to="/pengaturan" icon={IcoPengaturan} label="Pengaturan" onClick={onNav} />
    </>
  )

  return (
    <div className="app-layout">
      {/* ── DESKTOP SIDEBAR ─────────────────────────── */}
      <aside className="sidebar desktop-only">
        <div className="sidebar-logo">
          <div className="sidebar-logo-text">BukuKas</div>
          <div className="sidebar-logo-sub">Sistem Akuntansi</div>
        </div>
        <SidebarContent onNav={null} />
        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div>
              <div className="sidebar-name">{namaUsaha}</div>
              <div className="sidebar-role" style={{ cursor: 'pointer' }} onClick={handleSignOut}>Keluar →</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MOBILE TOPBAR ───────────────────────────── */}
      <div className="mobile-topbar mobile-only">
        <div className="mobile-topbar-left">
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}><IcoMenu /></button>
          <span className="mobile-topbar-title">{pageTitle}</span>
        </div>
        <div className="mobile-topbar-logo">BukuKas</div>
      </div>

      {/* ── MOBILE DRAWER ────────── */}
      {sidebarOpen && <div className="mobile-drawer-overlay" onClick={close} />}
      <aside className={`mobile-drawer ${sidebarOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-header">
          <div>
            <div className="sidebar-logo-text">BukuKas</div>
            <div className="sidebar-logo-sub">Sistem Akuntansi</div>
          </div>
          <button className="mobile-menu-btn" onClick={close} style={{ color: 'rgba(255,255,255,0.7)' }}><IcoClose /></button>
        </div>
        <SidebarContent onNav={close} />
        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div>
              <div className="sidebar-name">{namaUsaha}</div>
              <div className="sidebar-role" style={{ cursor: 'pointer' }} onClick={handleSignOut}>Keluar →</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────── */}
      <main className="main-content"><Outlet /></main>

      {/* ── MOBILE BOTTOM NAV ───────────────────────── */}
      <nav className="bottom-nav mobile-only">
        {bottomNavItems.map(({ to, end, icon: Icon, label }) => {
          const isActive = end ? location.pathname === to : location.pathname.startsWith(to)
          return (
            <NavLink key={to} to={to} end={end} className="bottom-nav-item" style={{ color: isActive ? 'var(--accent2)' : 'var(--muted)' }}>
              <div className={`bottom-nav-icon ${isActive ? 'active' : ''}`}><Icon size={22} /></div>
              <span className="bottom-nav-label">{label}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
