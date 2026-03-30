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
import POS from './pages/POS'
import Produk from './pages/Produk'
import JurnalTransaksi from './pages/JurnalTransaksi'
import BukuBesar from './pages/BukuBesar'
import NeracaSaldo from './pages/NeracaSaldo'
import JurnalPenyesuaian from './pages/JurnalPenyesuaian'
import KertasKerja from './pages/KertasKerja'
import LaporanKeuangan from './pages/LaporanKeuangan'

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
        <Route path="pos" element={<POS />} />
        <Route path="produk" element={<Produk />} />
        <Route path="transaksi" element={<Transaksi />} />
        <Route path="invoice" element={<Invoice />} />
        <Route path="kontak" element={<Kontak />} />
        <Route path="laporan" element={<LaporanLabaRugi />} />
        <Route path="jurnal" element={<JurnalTransaksi />} />
        <Route path="buku-besar" element={<BukuBesar />} />
        <Route path="neraca-saldo" element={<NeracaSaldo />} />
        <Route path="jurnal-penyesuaian" element={<JurnalPenyesuaian />} />
        <Route path="kertas-kerja" element={<KertasKerja />} />
        <Route path="laporan-keuangan" element={<LaporanKeuangan />} />
        <Route path="pengaturan" element={<Pengaturan />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
