import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export default function Pengaturan() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    nama_usaha: user?.user_metadata?.nama_usaha || '',
    email: user?.email || '',
  })
  const [saving, setSaving] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' })

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const saveProfile = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await supabase.auth.updateUser({ data: { nama_usaha: form.nama_usaha } })
      toast.success('Profil diperbarui')
    } catch { toast.error('Gagal menyimpan') }
    finally { setSaving(false) }
  }

  const handleLogout = async () => {
    await signOut()
    toast.success('Berhasil keluar')
    navigate('/auth')
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Pengaturan</div>
      </div>
      <div className="page-content" style={{ maxWidth: 600 }}>
        <div className="section-card">
          <div className="section-title"><div className="section-num">1</div>Profil Usaha</div>
          <form onSubmit={saveProfile}>
            <div className="form-grid">
              <div className="field form-full">
                <label className="field-label">Nama Usaha</label>
                <input name="nama_usaha" className="field-input" value={form.nama_usaha} onChange={handle} placeholder="Nama usaha Anda..." />
              </div>
              <div className="field form-full">
                <label className="field-label">Email</label>
                <input className="field-input" value={form.email} disabled style={{ color: 'var(--muted)', cursor: 'not-allowed' }} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: 16 }}>
              {saving ? 'Menyimpan...' : 'Simpan Profil'}
            </button>
          </form>
        </div>

        <div className="section-card">
          <div className="section-title"><div className="section-num">2</div>Informasi Akun</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
            <div style={{ marginBottom: 8 }}>
              <strong style={{ color: 'var(--text)' }}>User ID:</strong>{' '}
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{user?.id?.slice(0, 16)}...</span>
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong style={{ color: 'var(--text)' }}>Dibuat:</strong>{' '}
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '—'}
            </div>
            <div>
              <strong style={{ color: 'var(--text)' }}>Database:</strong>{' '}
              Supabase Cloud (data Anda aman dan terenkripsi)
            </div>
          </div>
        </div>

        <div className="section-card" style={{ borderColor: 'var(--red-light)' }}>
          <div className="section-title"><div className="section-num" style={{ background: 'var(--red)' }}>!</div>Zona Berbahaya</div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
            Keluar dari akun BukuKas. Data Anda tetap tersimpan di cloud dan bisa diakses kembali kapan saja.
          </p>
          <button className="btn btn-danger" onClick={handleLogout}>Keluar dari Akun</button>
        </div>
      </div>
    </>
  )
}
