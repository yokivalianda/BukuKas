import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [tab, setTab] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', password: '', namaUsaha: '' })

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (tab === 'login') {
        await signIn(form.email, form.password)
        toast.success('Selamat datang kembali!')
      } else {
        if (!form.namaUsaha.trim()) { setError('Nama usaha wajib diisi'); setLoading(false); return }
        await signUp(form.email, form.password, form.namaUsaha)
        toast.success('Akun berhasil dibuat! Silakan login.')
        setTab('login')
      }
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Email atau password salah'
        : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">BukuKas</div>
        <div className="auth-tagline">Sistem akuntansi digital untuk UMKM Indonesia</div>

        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError('') }}>Masuk</button>
          <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setError('') }}>Daftar</button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tab === 'register' && (
            <div className="field">
              <label className="field-label">Nama Usaha <span className="req">*</span></label>
              <input name="namaUsaha" value={form.namaUsaha} onChange={handle} className="field-input" placeholder="Contoh: Toko Berkah Jaya" required />
            </div>
          )}
          <div className="field">
            <label className="field-label">Email <span className="req">*</span></label>
            <input name="email" type="email" value={form.email} onChange={handle} className="field-input" placeholder="email@usaha.com" required />
          </div>
          <div className="field">
            <label className="field-label">Password <span className="req">*</span></label>
            <input name="password" type="password" value={form.password} onChange={handle} className="field-input" placeholder="Min. 6 karakter" required minLength={6} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 4, justifyContent: 'center', padding: '11px' }}>
            {loading ? 'Memproses...' : tab === 'login' ? 'Masuk' : 'Buat Akun'}
          </button>
        </form>

        <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginTop: 20 }}>
          Data tersimpan aman di cloud Supabase
        </p>
      </div>
    </div>
  )
}
