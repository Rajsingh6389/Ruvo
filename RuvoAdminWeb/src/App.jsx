import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const request = async (path, token, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.message || body?.error || 'Request failed')
  return body?.data ?? body
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('ruvo_admin_token') || '')
  const [mobileNumber, setMobileNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [authStep, setAuthStep] = useState(1)
  const [authLoading, setAuthLoading] = useState(false)
  const [shops, setShops] = useState([])
  const [partners, setPartners] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState('')

  const loadRequests = useCallback(async () => {
    if (!token) return
    setLoading(true); setError(''); setNotice('')
    try {
      const [pendingShops, pendingPartners] = await Promise.all([
        request('/api/shops/pending', token),
        request('/api/admin/partners/pending', token),
      ])
      setShops(Array.isArray(pendingShops) ? pendingShops : [])
      setPartners(Array.isArray(pendingPartners) ? pendingPartners : [])
    } catch (err) {
      setError(err.message || 'Unable to load approval requests.')
    } finally { setLoading(false) }
  }, [token])

  useEffect(() => { loadRequests() }, [loadRequests])

  const formatMobile = (value) => {
    const digits = value.replace(/\D/g, '')
    return digits.length === 10 ? `+91${digits}` : digits.startsWith('91') && digits.length === 12 ? `+${digits}` : ''
  }

  const sendOtp = async () => {
    const mobile = formatMobile(mobileNumber)
    if (!mobile) { setError('Enter a valid 10-digit admin mobile number.'); return }
    setAuthLoading(true); setError('')
    try {
      await request('/auth/send-otp', '', { method: 'POST', body: JSON.stringify({ mobileNumber: mobile }) })
      setAuthStep(2)
    } catch (err) { setError(err.message || 'Could not send OTP.') }
    finally { setAuthLoading(false) }
  }

  const verifyOtp = async () => {
    const mobile = formatMobile(mobileNumber)
    if (otpCode.trim().length !== 6) { setError('Enter the 6-digit OTP.'); return }
    setAuthLoading(true); setError('')
    try {
      const body = await request('/auth/verify-otp', '', { method: 'POST', body: JSON.stringify({ mobileNumber: mobile, otpCode: otpCode.trim() }) })
      if (body?.role !== 'ADMIN') throw new Error('This mobile number is not authorised for Ruvo Admin.')
      localStorage.setItem('ruvo_admin_token', body.accessToken)
      setToken(body.accessToken)
    } catch (err) { setError(err.message || 'OTP verification failed.') }
    finally { setAuthLoading(false) }
  }

  const perform = async (key, work, successMessage) => {
    setBusyId(key); setError(''); setNotice('')
    try { await work(); setNotice(successMessage); await loadRequests() }
    catch (err) { setError(err.message || 'Action failed.') }
    finally { setBusyId('') }
  }

  const rejectPartner = (partner) => {
    const reason = window.prompt(`Reason for rejecting ${partner.name}'s partner request:`)
    if (!reason?.trim()) return
    perform(`partner-${partner.partnerId}-reject`, () => request(`/api/admin/partners/${partner.partnerId}/reject`, token, { method: 'POST', body: JSON.stringify({ reason: reason.trim() }) }), 'Partner request rejected.')
  }

  const visible = useMemo(() => ({
    shops: activeTab === 'partners' ? [] : shops,
    partners: activeTab === 'shops' ? [] : partners,
  }), [activeTab, shops, partners])

  if (!token) return <main className="auth-shell">
    <section className="auth-card">
      <p className="eyebrow">RUVO OPERATIONS</p><h1>Admin approvals</h1>
      <p>Sign in with the registered mobile number of a Ruvo administrator.</p>
      {error && <div className="alert error">{error}</div>}
      {authStep === 1 ? <><label>Admin mobile number<input inputMode="numeric" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} placeholder="10-digit mobile number" autoComplete="tel" /></label><button onClick={sendOtp} disabled={authLoading}>{authLoading ? 'Sending…' : 'Send OTP'}</button></> : <><label>One-time password<input inputMode="numeric" value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit OTP" autoComplete="one-time-code" /></label><button onClick={verifyOtp} disabled={authLoading}>{authLoading ? 'Verifying…' : 'Verify and open dashboard'}</button><button className="link-button" onClick={() => setAuthStep(1)}>Use a different mobile number</button></>}
      <small>Only users with the ADMIN role can open this dashboard.</small>
    </section>
  </main>

  return <main className="app-shell">
    <aside className="sidebar"><div className="brand"><span>R</span><div>RuVo <small>ADMIN</small></div></div>
      <nav><button className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')}>Overview <b>{shops.length + partners.length}</b></button>
        <button className={activeTab === 'shops' ? 'active' : ''} onClick={() => setActiveTab('shops')}>Shop approvals <b>{shops.length}</b></button>
        <button className={activeTab === 'partners' ? 'active' : ''} onClick={() => setActiveTab('partners')}>Partner approvals <b>{partners.length}</b></button></nav>
      <button className="signout" onClick={() => { localStorage.removeItem('ruvo_admin_token'); setToken(''); setOtpCode(''); setAuthStep(1) }}>Sign out</button>
    </aside>
    <section className="content"><header><div><p className="eyebrow">APPROVAL CENTRE</p><h1>Pending requests</h1><p>Review onboarding documents and approve only verified businesses and riders.</p></div><button className="refresh" onClick={loadRequests} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button></header>
      {error && <div className="alert error">{error}</div>}{notice && <div className="alert success">{notice}</div>}
      <div className="stats"><Stat label="Pending shops" value={shops.length} tone="orange" /><Stat label="Pending partners" value={partners.length} tone="purple" /><Stat label="Total action needed" value={shops.length + partners.length} tone="green" /></div>
      {loading ? <div className="empty">Loading approval requests…</div> : <>
        {visible.shops.length > 0 && <section className="panel"><div className="panel-head"><div><h2>Shop registrations</h2><p>New businesses waiting for marketplace approval</p></div></div><div className="table-wrap"><table><thead><tr><th>Shop</th><th>Category</th><th>Location</th><th>Phone</th><th /></tr></thead><tbody>{visible.shops.map(shop => <tr key={shop.id}><td><strong>{shop.name}</strong><span>#{shop.id}</span></td><td>{shop.category || '—'}</td><td>{shop.address || '—'}</td><td>{shop.phone || '—'}</td><td className="actions"><button className="approve" disabled={busyId === `shop-${shop.id}-approve`} onClick={() => perform(`shop-${shop.id}-approve`, () => request(`/api/shops/${shop.id}/approve`, token, { method: 'POST' }), 'Shop approved.')}>Approve</button><button className="reject" disabled={busyId === `shop-${shop.id}-reject`} onClick={() => { if (window.confirm(`Reject and remove ${shop.name}'s application?`)) perform(`shop-${shop.id}-reject`, () => request(`/api/shops/${shop.id}/reject`, token, { method: 'DELETE' }), 'Shop request rejected.') }}>Reject</button></td></tr>)}</tbody></table></div></section>}
        {visible.partners.length > 0 && <section className="panel"><div className="panel-head"><div><h2>Delivery partner verifications</h2><p>KYC and vehicle information submitted for review</p></div></div><div className="partner-grid">{visible.partners.map(partner => <article className="partner-card" key={partner.partnerId}><div className="partner-top"><div className="avatar">{partner.name?.slice(0, 1)?.toUpperCase() || 'P'}</div><div><h3>{partner.name}</h3><p>{partner.mobileNumber || 'No phone supplied'}</p></div><span className="pending">UNDER REVIEW</span></div><dl><div><dt>Vehicle</dt><dd>{partner.vehicle ? `${partner.vehicle.vehicleType} · ${partner.vehicle.vehicleNumber}` : 'Not supplied'}</dd></div><div><dt>Address</dt><dd>{partner.kyc?.address ? `${partner.kyc.address}, ${partner.kyc.city || ''}` : 'Not supplied'}</dd></div><div><dt>KYC</dt><dd>{partner.kyc?.identityDocumentType || 'Not supplied'}</dd></div></dl><div className="card-actions"><button className="approve" disabled={busyId === `partner-${partner.partnerId}-approve`} onClick={() => perform(`partner-${partner.partnerId}-approve`, () => request(`/api/admin/partners/${partner.partnerId}/approve`, token, { method: 'POST' }), 'Delivery partner approved.')}>Approve partner</button><button className="reject" disabled={busyId === `partner-${partner.partnerId}-reject`} onClick={() => rejectPartner(partner)}>Reject</button></div></article>)}</div></section>}
        {!visible.shops.length && !visible.partners.length && <div className="empty">No pending {activeTab === 'all' ? 'approval requests' : activeTab === 'shops' ? 'shop requests' : 'partner requests'}.</div>}
      </>}
    </section>
  </main>
}

const Stat = ({ label, value, tone }) => <div className={`stat ${tone}`}><span>{label}</span><strong>{value}</strong></div>
export default App
