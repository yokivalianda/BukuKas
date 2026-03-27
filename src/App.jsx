import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import Transaksi from './pages/Transaksi'
import Invoice from './pages/Invoice'
import Kontak from './pages/Kontak'
import LaporanLabaRugi from './pages/LaporanLabaRugi'
import Pengaturan from './pages/Pengaturan'

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="loader"><div className="spinner" /></div>
  return user ? children : <Navigate to="/auth" replace />
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <div className="loader" style={{ minHeight: '100vh' }}><div className="spinner" /></div>

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="transaksi" element={<Transaksi />} />
        <Route path="invoice" element={<Invoice />} />
        <Route path="kontak" element={<Kontak />} />
        <Route path="laporan" element={<LaporanLabaRugi />} />
        <Route path="pengaturan" element={<Pengaturan />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
