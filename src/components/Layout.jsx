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
const IcoMenu = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/></svg>
const IcoClose = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>

// Bottom nav items (5 utama untuk mobile)
const bottomNavItems = [
  { to: '/', end: true, icon: IcoDashboard, label: 'Dashboard' },
  { to: '/transaksi', icon: IcoTransaksi, label: 'Transaksi' },
  { to: '/invoice', icon: IcoInvoice, label: 'Invoice' },
  { to: '/laporan', icon: IcoLaporan, label: 'Laporan' },
  { to: '/pengaturan', icon: IcoPengaturan, label: 'Lainnya' },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const namaUsaha = user?.user_metadata?.nama_usaha || 'Usaha Saya'
  const initials = namaUsaha.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const handleSignOut = async () => {
    await signOut()
    toast.success('Berhasil keluar')
    navigate('/auth')
  }

  // Page title from route
  const pageTitles = { '/': 'Dashboard', '/transaksi': 'Transaksi', '/invoice': 'Invoice', '/laporan': 'Laba Rugi', '/kontak': 'Kontak', '/pengaturan': 'Pengaturan' }
  const pageTitle = pageTitles[location.pathname] || 'BukuKas'

  return (
    <div className="app-layout">

      {/* ── DESKTOP SIDEBAR ─────────────────────────── */}
      <aside className="sidebar desktop-only">
        <div className="sidebar-logo">
          <div className="sidebar-logo-text">BukuKas</div>
          <div className="sidebar-logo-sub">Sistem Akuntansi</div>
        </div>

        <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <IcoDashboard size={17} /> Dashboard
        </NavLink>

        <div className="nav-section">Keuangan</div>
        <NavLink to="/transaksi" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <IcoTransaksi size={17} /> Transaksi
        </NavLink>
        <NavLink to="/invoice" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <IcoInvoice size={17} /> Invoice
        </NavLink>

        <div className="nav-section">Laporan</div>
        <NavLink to="/laporan" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <IcoLaporan size={17} /> Laba Rugi
        </NavLink>

        <div className="nav-section">Lainnya</div>
        <NavLink to="/kontak" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <IcoKontak size={17} /> Kontak
        </NavLink>
        <NavLink to="/pengaturan" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <IcoPengaturan size={17} /> Pengaturan
        </NavLink>

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
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
            <IcoMenu />
          </button>
          <span className="mobile-topbar-title">{pageTitle}</span>
        </div>
        <div className="mobile-topbar-logo">BukuKas</div>
      </div>

      {/* ── MOBILE DRAWER (slide-in sidebar) ────────── */}
      {sidebarOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`mobile-drawer ${sidebarOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-header">
          <div>
            <div className="sidebar-logo-text">BukuKas</div>
            <div className="sidebar-logo-sub">Sistem Akuntansi</div>
          </div>
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(false)} style={{ color: 'rgba(255,255,255,0.7)' }}>
            <IcoClose />
          </button>
        </div>

        <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
          <IcoDashboard size={17} /> Dashboard
        </NavLink>
        <div className="nav-section">Keuangan</div>
        <NavLink to="/transaksi" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
          <IcoTransaksi size={17} /> Transaksi
        </NavLink>
        <NavLink to="/invoice" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
          <IcoInvoice size={17} /> Invoice
        </NavLink>
        <div className="nav-section">Laporan</div>
        <NavLink to="/laporan" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
          <IcoLaporan size={17} /> Laba Rugi
        </NavLink>
        <div className="nav-section">Lainnya</div>
        <NavLink to="/kontak" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
          <IcoKontak size={17} /> Kontak
        </NavLink>
        <NavLink to="/pengaturan" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
          <IcoPengaturan size={17} /> Pengaturan
        </NavLink>

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
      <main className="main-content">
        <Outlet />
      </main>

      {/* ── MOBILE BOTTOM NAV ───────────────────────── */}
      <nav className="bottom-nav mobile-only">
        {bottomNavItems.map(({ to, end, icon: Icon, label }) => {
          const isActive = end ? location.pathname === to : location.pathname.startsWith(to)
          return (
            <NavLink key={to} to={to} end={end} className="bottom-nav-item" style={{ color: isActive ? 'var(--accent2)' : 'var(--muted)' }}>
              <div className={`bottom-nav-icon ${isActive ? 'active' : ''}`}>
                <Icon size={22} />
              </div>
              <span className="bottom-nav-label">{label}</span>
            </NavLink>
          )
        })}
      </nav>

    </div>
  )
}
