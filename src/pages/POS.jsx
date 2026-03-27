import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getProduk, posCheckout } from '../lib/supabase'
import toast from 'react-hot-toast'

const fmtFull = (n) => new Intl.NumberFormat('id-ID').format(n)

export default function POS() {
  const { user } = useAuth()
  const [produk, setProduk] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  // Cart state
  const [cart, setCart] = useState([])
  
  // Payment modal state
  const [showPayModal, setShowPayModal] = useState(false)
  const [uangDiterima, setUangDiterima] = useState('')
  const [saving, setSaving] = useState(false)
  const [cartExpand, setCartExpand] = useState(false)

  useEffect(() => { load() }, [user])

  const load = async () => {
    try {
      const rows = await getProduk(user.id)
      setProduk(rows)
    } catch { toast.error('Gagal memuat produk') }
    finally { setLoading(false) }
  }

  const filteredProduk = produk.filter(p => 
    !search || p.nama.toLowerCase().includes(search.toLowerCase()) || (p.kode_sku && p.kode_sku.toLowerCase().includes(search.toLowerCase()))
  )

  const addToCart = (p) => {
    if (p.stok <= 0) {
      toast.error('Stok habis!')
      return
    }
    setCart(prev => {
      const exist = prev.find(item => item.produk_id === p.id)
      if (exist) {
        if (exist.qty >= p.stok) {
          toast.error('Maksimal stok tercapai')
          return prev
        }
        return prev.map(item => item.produk_id === p.id ? { ...item, qty: item.qty + 1 } : item)
      }
      return [...prev, {
        produk_id: p.id,
        nama: p.nama,
        harga_satuan: p.harga_jual,
        qty: 1,
        stok_tersedia: p.stok
      }]
    })
  }

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.produk_id === id) {
        const newQty = item.qty + delta
        if (newQty > item.stok_tersedia) {
          toast.error('Maksimal stok tercapai')
          return item
        }
        return { ...item, qty: newQty }
      }
      return item
    }).filter(item => item.qty > 0))
  }

  const total = cart.reduce((s, item) => s + (item.harga_satuan * item.qty), 0)
  const totalItem = cart.reduce((s, item) => s + item.qty, 0)
  const numUangDiterima = Number(uangDiterima) || 0
  const kembalian = numUangDiterima - total

  const handlePay = async (e) => {
    e.preventDefault()
    if (numUangDiterima < total) {
      toast.error('Uang kurang!')
      return
    }
    setSaving(true)
    try {
      // Format items based on schema expectations
      const itemsPayload = cart.map(item => ({
        produk_id: item.produk_id,
        qty: item.qty,
        harga_satuan: item.harga_satuan,
        subtotal: item.harga_satuan * item.qty
      }))

      await posCheckout({
        p_user_id: user.id,
        p_total: total,
        p_uang_diterima: numUangDiterima,
        p_kembalian: kembalian,
        p_items: itemsPayload
      })

      toast.success('Pembayaran berhasil!')
      setCart([])
      setShowPayModal(false)
      setUangDiterima('')
      load() // Reload stok produk
    } catch (err) {
      console.error(err)
      toast.error('Gagal memproses pembayaran')
    } finally {
      setSaving(false)
    }
  }

  const UangPasBtn = ({ val, label }) => (
    <button type="button" className="btn btn-ghost btn-sm" style={{ border: '1px solid var(--border)' }} onClick={() => setUangDiterima(String(val))}>
      {label || `Rp ${fmtFull(val)}`}
    </button>
  )

  if (loading) return <div className="loader"><div className="spinner" /></div>

  return (
    <>
      {/* Hide standard layout components logic is usually done via CSS media print or specific fullscreen layout, but here we embed in standard layout. */}
      {/* Kustom CSS inline untuk mengatur tinggi container POS agar pas 1 layar dan scrollable */}
      <style>{`
        .pos-container { display: flex; height: calc(100vh - 40px); gap: 16px; margin: -10px; padding: 10px; }
        .pos-products { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .pos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; overflow-y: auto; padding-right: 8px; padding-bottom: 20px; align-content: start; }
        .pos-item-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 10px; cursor: pointer; transition: all 0.2s; user-select: none; display: flex; flex-direction: column; height: 100%; justify-content: space-between; }
        .pos-item-card:hover { border-color: var(--accent2); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .pos-item-card.disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; border-color: var(--border); }
        .pos-cart { width: 340px; background: var(--surface); border-radius: 12px; border: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0; }
        .cart-header { padding: 16px; border-bottom: 1px solid var(--border); font-weight: 700; display: flex; justify-content: space-between; align-items: center; background: var(--surface2); }
        .cart-items { flex: 1; overflow-y: auto; padding: 12px 16px; }
        .cart-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px dashed var(--border); }
        .cart-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .qty-controls { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
        .qty-btn { width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface2); cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 600; }
        .qty-btn:hover { background: var(--border); }
        .cart-footer { padding: 16px; background: var(--surface2); border-top: 1px solid var(--border); }
        .cart-summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }

        @media (max-width: 768px) {
          .pos-container { flex-direction: column; height: auto; overflow: visible; padding-bottom: 80px; }
          .pos-products { height: 50vh; overflow: hidden; }
          .pos-cart { width: 100%; flex-shrink: 1; border-top: 3px solid var(--accent2); border-radius: 20px 20px 0 0; position: fixed; bottom: 0; left: 0; z-index: 80; height: 60vh; transform: translateY(calc(60vh - 60px)); transition: transform 0.3s ease; box-shadow: 0 -4px 15px rgba(0,0,0,0.1); }
          .pos-cart.expand { transform: translateY(0); }
          .cart-header { cursor: pointer; padding: 10px 16px; min-height: 60px; }
          .cart-header::before { content: ''; width: 40px; height: 4px; background: var(--border); border-radius: 2px; position: absolute; top: 8px; left: 50%; transform: translateX(-50%); }
        }
      `}</style>
      
      <div className="pos-container">
        
        {/* Left: Products Grid */}
        <div className="pos-products">
          <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
            <input 
              className="field-input" 
              placeholder="🔍 Cari produk (Nama / SKU)..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              autoFocus
              style={{ flex: 1, fontSize: 16, padding: '12px 16px' }}
            />
          </div>

          <div className="pos-grid">
            {filteredProduk.map(p => (
              <div key={p.id} className={`pos-item-card ${p.stok <= 0 ? 'disabled' : ''}`} onClick={() => addToCart(p)}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3, marginBottom: 4, color: 'var(--text)' }}>{p.nama}</div>
                  {p.kode_sku && <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 8 }}>{p.kode_sku}</div>}
                </div>
                <div>
                  <div style={{ color: 'var(--accent2)', fontWeight: 700, fontFamily: 'var(--mono)', fontSize: 15, marginBottom: 4 }}>
                    Rp {fmtFull(p.harga_jual)}
                  </div>
                  <div style={{ fontSize: 11, color: p.stok <= 5 ? 'var(--red)' : 'var(--muted)', fontWeight: 600 }}>
                    Stok: {p.stok}
                  </div>
                </div>
              </div>
            ))}
            {filteredProduk.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                Tidak ada produk yang cocok.
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart */}
        <div className={`pos-cart ${cartExpand ? 'expand' : ''}`}>
          <div className="cart-header" onClick={() => setCartExpand(!cartExpand)}>
            <span>Keranjang</span>
            <span className="badge badge-blue">{totalItem} Item</span>
          </div>
          
          <div className="cart-items">
            {cart.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 10, opacity: 0.2 }}>🛒</div>
                <div>Belum ada pesanan<br/><span style={{ fontSize: 12 }}>Klik produk di sebelah kiri</span></div>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.produk_id} className="cart-row">
                  <div style={{ flex: 1, paddingRight: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{item.nama}</div>
                    <div style={{ color: 'var(--accent2)', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600 }}>Rp {fmtFull(item.harga_satuan)}</div>
                    <div className="qty-controls">
                      <button className="qty-btn" onClick={() => updateQty(item.produk_id, -1)}>−</button>
                      <span style={{ fontSize: 14, fontWeight: 600, width: 24, textAlign: 'center' }}>{item.qty}</span>
                      <button className="qty-btn" onClick={() => updateQty(item.produk_id, 1)}>+</button>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14 }}>
                    Rp {fmtFull(item.harga_satuan * item.qty)}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="cart-footer">
            <div className="cart-summary-row">
              <span style={{ color: 'var(--muted)' }}>Subtotal</span>
              <span style={{ fontFamily: 'var(--mono)' }}>Rp {fmtFull(total)}</span>
            </div>
            <div className="cart-summary-row" style={{ marginTop: 12, marginBottom: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>Total</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent2)', fontFamily: 'var(--mono)' }}>Rp {fmtFull(total)}</span>
            </div>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', height: 48, fontSize: 16 }} 
              disabled={cart.length === 0}
              onClick={() => setShowPayModal(true)}
            >
              Bayar Sekarang
            </button>
            {cart.length > 0 && (
              <button 
                className="btn btn-ghost" 
                style={{ width: '100%', marginTop: 8, color: 'var(--red)' }}
                onClick={() => { if(confirm('Kosongkan keranjang?')) setCart([]) }}
              >
                Batalkan
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPayModal(false)}>
          <div className="modal" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <div className="modal-title">Pembayaran</div>
              <button className="modal-close" onClick={() => setShowPayModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--surface2)', padding: '16px 20px', borderRadius: 8, marginBottom: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>TOTAL TAGIHAN</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent2)', fontFamily: 'var(--mono)' }}>
                  Rp {fmtFull(total)}
                </div>
              </div>

              <form onSubmit={handlePay}>
                <div className="field">
                  <label className="field-label">Uang Diterima (Cash)</label>
                  <div className="amount-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span className="amount-prefix" style={{ fontSize: 20, top: 11 }}>Rp</span>
                      <input 
                        type="text"
                        inputMode="numeric"
                        className="field-input" 
                        style={{ fontSize: 24, fontWeight: 700, padding: '12px 12px 12px 45px', height: 'auto', fontFamily: 'var(--mono)' }}
                        value={uangDiterima ? Number(uangDiterima).toLocaleString('id-ID') : ''} 
                        onChange={e => setUangDiterima(e.target.value.replace(/\D/g, ''))}
                        autoFocus
                      />
                    </div>
                    {/* Quick money suggestions */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <UangPasBtn val={total} label="Uang Pas" />
                      <UangPasBtn val={Math.ceil(total / 10000) * 10000} />
                      <UangPasBtn val={Math.ceil(total / 50000) * 50000} />
                      <UangPasBtn val={Math.ceil(total / 100000) * 100000} />
                    </div>
                  </div>
                </div>

                <div style={{ margin: '20px 0', borderTop: '1px dashed var(--border)', paddingTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 600 }}>Kembalian</span>
                    <span style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--mono)', color: kembalian >= 0 ? 'var(--text)' : 'var(--red)' }}>
                      Rp {kembalian > 0 ? fmtFull(kembalian) : 0}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <button type="submit" className="btn btn-primary" disabled={saving || numUangDiterima < total} style={{ flex: 1, height: 50, fontSize: 16 }}>
                    {saving ? 'Memproses...' : 'Selesaikan Transaksi (Simpan & Cetak)'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
