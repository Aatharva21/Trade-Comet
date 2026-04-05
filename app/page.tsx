'use client'

import { useEffect, useRef, useState } from 'react'
import { SplineScene } from '@/components/ui/splite'

import { initializeApp, getApps } from 'firebase/app'
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyA-_jui-U3eTrNpVzfrH3GUb9H-gezFVSg",
  authDomain: "tradecomet-113f2.firebaseapp.com",
  projectId: "tradecomet-113f2",
  storageBucket: "tradecomet-113f2.firebasestorage.app",
  messagingSenderId: "196709830590",
  appId: "1:196709830590:web:e917fc82c780e7ba1133ef"
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const auth = getAuth(app)
const provider = new GoogleAuthProvider()

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [user, setUser] = useState<User | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u))
    return () => unsub()
  }, [])

  useEffect(() => {
    const audio = new Audio('/tradecometSoundTrack.mp3')
    audio.loop = true
    audio.volume = 0.4
    audio.muted = false
    audioRef.current = audio

    const tryPlay = () => {
      audio.play().catch(() => {})
      document.removeEventListener('click', tryPlay)
      document.removeEventListener('touchstart', tryPlay)
      document.removeEventListener('keydown', tryPlay)
    }

    // Try immediate autoplay first
    audio.play().catch(() => {
      // Browser blocked it — wait for first user interaction
      document.addEventListener('click', tryPlay)
      document.addEventListener('touchstart', tryPlay)
      document.addEventListener('keydown', tryPlay)
    })

    return () => {
      audio.pause()
      document.removeEventListener('click', tryPlay)
      document.removeEventListener('touchstart', tryPlay)
      document.removeEventListener('keydown', tryPlay)
    }
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleGoogleLogin = async () => {
    setLoginLoading(true)
    setLoginError('')
    try {
      await signInWithPopup(auth, provider)
      setShowLoginModal(false)
    } catch (err: any) {
      setLoginError('Sign-in failed. Please try again.')
    } finally {
      setLoginLoading(false)
    }
  }

  const toggleMute = () => {
    if (!audioRef.current) return
    audioRef.current.muted = !audioRef.current.muted
    setMuted(audioRef.current.muted)
  }

  const handleLogout = async () => {
    await signOut(auth)
  }

  const handleJournalClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!user) {
      e.preventDefault()
      setShowLoginModal(true)
    } else {
      e.preventDefault()
      const params = new URLSearchParams({
        uid: user.uid,
        email: user.email || '',
        name: user.displayName || ''
      })
      window.location.href = `/journal?${params.toString()}`
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const stars: { x: number; y: number; size: number; speed: number; opacity: number }[] = []
    for (let i = 0; i < 200; i++) {
      stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: Math.random() * 1.5, speed: Math.random() * 0.3 + 0.05, opacity: Math.random() })
    }
    let animId: number
    function animate() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      stars.forEach(s => {
        s.opacity += (Math.random() - 0.5) * 0.02
        s.opacity = Math.max(0.1, Math.min(1, s.opacity))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,' + s.opacity + ')'
        ctx.fill()
        s.y -= s.speed
        if (s.y < 0) s.y = canvas.height
      })
      animId = requestAnimationFrame(animate)
    }
    animate()
    const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    window.addEventListener('resize', handleResize)

    // Cursor only on non-touch
    let tx = 0, ty = 0, cx = 0, cy = 0
    const moveCursor = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY }
    window.addEventListener('mousemove', moveCursor)
    function animCursor() {
      cx += (tx - cx) * 0.5
      cy += (ty - cy) * 0.5
      if (cursorRef.current) {
        cursorRef.current.style.left = cx + 'px'
        cursorRef.current.style.top = cy + 'px'
      }
      requestAnimationFrame(animCursor)
    }
    animCursor()

    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', handleResize); window.removeEventListener('mousemove', moveCursor) }
  }, [])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile) return
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: y * 10, y: x * -10 })
  }

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 })

  const btnStyle: React.CSSProperties = {
    flex: 1,
    textAlign: 'center',
    padding: '13px 0',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'white',
    background: 'rgba(255,255,255,0.05)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    borderRadius: 4,
    transition: 'all 0.3s',
    cursor: isMobile ? 'pointer' : 'none',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: 'Orbitron, monospace',
    display: 'block',
  }

  const handleBtnEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isMobile) return
    e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
    e.currentTarget.style.boxShadow = '0 0 30px rgba(255,255,255,0.15), inset 0 0 30px rgba(255,255,255,0.05)'
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'
    if (cursorRef.current) { cursorRef.current.style.width = '56px'; cursorRef.current.style.height = '56px' }
  }

  const handleBtnLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isMobile) return
    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
    e.currentTarget.style.boxShadow = 'none'
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
    if (cursorRef.current) { cursorRef.current.style.width = '28px'; cursorRef.current.style.height = '28px' }
  }

  const features = [
    { num: '01', title: 'TRADE\nLOGGING', desc: 'Log every trade with entry, exit, P&L and notes in seconds.' },
    { num: '02', title: 'DEEP\nANALYTICS', desc: 'Deep stats on win rate, expectancy and drawdown.' },
    { num: '03', title: 'PATTERN\nRECOGNITION', desc: 'Discover which setups make you the most money.' },
    { num: '04', title: 'RISK\nMANAGEMENT', desc: 'Track R-multiples and risk per trade automatically.' },
    { num: '05', title: 'TRADE\nCALENDAR', desc: 'Spot your best and worst trading days visually.' },
    { num: '06', title: 'YOUR\nPLAYBOOK', desc: 'Build your trading playbook with setups and rules.' },
  ]

  return (
    <div style={{ fontFamily: 'Orbitron, monospace', background: '#060608', minHeight: '100vh', color: 'white', cursor: isMobile ? 'auto' : 'none', overflowX: 'hidden' }}>

      <style>{`
        html, body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          background: #060608;
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #060608; }
        ::-webkit-scrollbar-thumb { background: white; border-radius: 3px; box-shadow: 0 0 8px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.4); }
        * { scrollbar-width: thin; scrollbar-color: white #060608; }
        @keyframes modalFadeIn { from { opacity: 0; transform: scale(0.94) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes overlayFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(400%); } }
        @keyframes borderPulse { 0%, 100% { border-color: rgba(0,200,255,0.3); box-shadow: 0 0 30px rgba(0,150,255,0.15), inset 0 0 30px rgba(0,100,255,0.05); } 50% { border-color: rgba(100,0,255,0.4); box-shadow: 0 0 40px rgba(100,0,255,0.2), inset 0 0 40px rgba(80,0,200,0.07); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes menuSlide { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

        /* Mobile tap highlight removal */
        * { -webkit-tap-highlight-color: transparent; }

        /* Mobile feature grid */
        @media (max-width: 768px) {
          .features-grid { grid-template-columns: 1fr 1fr !important; }
          .features-section { padding: 60px 20px !important; }
          .cta-section { padding: 60px 20px !important; }
          .footer-inner { flex-direction: column !important; gap: 8px !important; text-align: center !important; }
        }
        @media (max-width: 480px) {
          .features-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div onClick={() => setShowLoginModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'overlayFadeIn 0.25s ease', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: 380, padding: isMobile ? '36px 24px 28px' : '44px 40px 40px', background: 'rgba(8,8,12,0.95)', border: '1px solid rgba(0,200,255,0.3)', borderRadius: 16, animation: 'modalFadeIn 0.3s ease, borderPulse 3s ease-in-out infinite', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: 16 }}>
              <div style={{ position: 'absolute', left: 0, right: 0, height: '25%', background: 'linear-gradient(180deg, transparent, rgba(0,200,255,0.04), transparent)', animation: 'scanline 4s linear infinite' }} />
            </div>
            {[
              { top: 0, left: 0, borderTop: '1px solid #00f5ff', borderLeft: '1px solid #00f5ff' },
              { top: 0, right: 0, borderTop: '1px solid #00f5ff', borderRight: '1px solid #00f5ff' },
              { bottom: 0, left: 0, borderBottom: '1px solid #7b2fff', borderLeft: '1px solid #7b2fff' },
              { bottom: 0, right: 0, borderBottom: '1px solid #7b2fff', borderRight: '1px solid #7b2fff' },
            ].map((s, i) => <div key={i} style={{ position: 'absolute', width: 16, height: 16, ...s }} />)}

            <button onClick={() => setShowLoginModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 4, transition: 'color 0.2s' }}>✕</button>

            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 900, letterSpacing: '0.15em', color: 'white', marginBottom: 6 }}>TRADECOMET</div>
              <div style={{ width: 40, height: 1, background: 'linear-gradient(90deg, transparent, #00f5ff, transparent)', margin: '0 auto 10px' }} />
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>MISSION CONTROL ACCESS</div>
            </div>

            <button onClick={handleGoogleLogin} disabled={loginLoading} style={{ width: '100%', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: loginLoading ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: 'white', fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.3s', opacity: loginLoading ? 0.6 : 1 }}>
              {!loginLoading ? (
                <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
              ) : (
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid #00f5ff', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
              )}
              {loginLoading ? 'AUTHENTICATING...' : 'CONTINUE WITH GOOGLE'}
            </button>

            {loginError && <div style={{ marginTop: 12, fontFamily: 'Orbitron, monospace', fontSize: 9, color: '#ff4444', textAlign: 'center', letterSpacing: '0.1em' }}>⚠ {loginError}</div>}
            <div style={{ marginTop: 24, fontFamily: 'Orbitron, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', textAlign: 'center', letterSpacing: '0.15em', lineHeight: 1.8 }}>
              BY CONTINUING YOU AGREE TO OUR TERMS.<br />YOUR DATA IS ENCRYPTED & SECURE.
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CURSOR — desktop only */}
      {!isMobile && (
        <div ref={cursorRef} style={{ position: 'fixed', width: 28, height: 28, pointerEvents: 'none', zIndex: 9999, transform: 'translate(-50%, -50%)', transition: 'width 0.25s, height 0.25s' }}>
          <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(255,255,255,0.85)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)', width: 1, height: 4, background: 'white', opacity: 0.6 }} />
          <div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 1, height: 4, background: 'white', opacity: 0.6 }} />
          <div style={{ position: 'absolute', left: -4, top: '50%', transform: 'translateY(-50%)', height: 1, width: 4, background: 'white', opacity: 0.6 }} />
          <div style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', height: 1, width: 4, background: 'white', opacity: 0.6 }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 3, height: 3, background: 'white', borderRadius: '50%' }} />
        </div>
      )}

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 20px' : '0 48px', height: 64, borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(6,6,8,0.7)', backdropFilter: 'blur(20px)' }}>
        <div style={{ fontFamily: 'Orbitron, monospace', fontWeight: 900, fontSize: isMobile ? 14 : 16, letterSpacing: '0.1em', color: 'white' }}>TRADECOMET</div>

        {/* Desktop nav links */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: 32, fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Orbitron, monospace' }}>
            <span style={{ cursor: 'none' }}>Features</span>
            <span style={{ cursor: 'none' }}>Pricing</span>
            <span style={{ cursor: 'none' }}>Docs</span>
          </div>
        )}

        {/* Desktop auth buttons */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {user ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', border: '1px solid rgba(0,200,255,0.2)', borderRadius: 2, background: 'rgba(0,200,255,0.04)' }}>
                  {user.photoURL && <img src={user.photoURL} alt="" crossOrigin="anonymous" referrerPolicy="no-referrer" style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid rgba(0,200,255,0.3)' }} />}
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{user.displayName?.split(' ')[0] ?? 'PILOT'}</span>
                </div>
                <a href="#" onClick={e => { e.preventDefault(); handleLogout() }} style={{ padding: '8px 20px', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', background: 'transparent', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', borderRadius: 2, cursor: 'none', fontFamily: 'Orbitron, monospace' }} onMouseEnter={handleBtnEnter} onMouseLeave={handleBtnLeave}>Logout</a>
                <a href="/journal" onClick={handleJournalClick} style={{ padding: '8px 20px', border: '1px solid rgba(255,255,255,0.2)', color: 'white', background: 'rgba(255,255,255,0.05)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', borderRadius: 2, cursor: 'none', fontFamily: 'Orbitron, monospace' }} onMouseEnter={handleBtnEnter} onMouseLeave={handleBtnLeave}>Open App</a>
              </div>
            ) : (
              <>
                <a href="#" onClick={e => { e.preventDefault(); setShowLoginModal(true) }} style={{ padding: '8px 20px', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', background: 'transparent', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', borderRadius: 2, cursor: 'none', fontFamily: 'Orbitron, monospace' }} onMouseEnter={handleBtnEnter} onMouseLeave={handleBtnLeave}>Login</a>
                <a href="/journal" onClick={handleJournalClick} style={{ padding: '8px 20px', border: '1px solid rgba(255,255,255,0.2)', color: 'white', background: 'rgba(255,255,255,0.05)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', borderRadius: 2, cursor: 'none', fontFamily: 'Orbitron, monospace' }} onMouseEnter={handleBtnEnter} onMouseLeave={handleBtnLeave}>Open App</a>
              </>
            )}
          </div>
        )}

        {/* Mobile hamburger */}
        {isMobile && (
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, padding: '8px 10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ width: 18, height: 1.5, background: 'white', borderRadius: 2, transition: 'all 0.3s', transform: menuOpen ? 'translateY(5.5px) rotate(45deg)' : 'none' }} />
            <div style={{ width: 18, height: 1.5, background: 'white', borderRadius: 2, opacity: menuOpen ? 0 : 1, transition: 'all 0.3s' }} />
            <div style={{ width: 18, height: 1.5, background: 'white', borderRadius: 2, transition: 'all 0.3s', transform: menuOpen ? 'translateY(-5.5px) rotate(-45deg)' : 'none' }} />
          </button>
        )}

        {/* Mobile dropdown menu */}
        {isMobile && menuOpen && (
          <div style={{ position: 'absolute', top: 64, left: 0, right: 0, background: 'rgba(6,6,8,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, animation: 'menuSlide 0.2s ease' }}>
            {user ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {user.photoURL && <img src={user.photoURL} alt="" crossOrigin="anonymous" referrerPolicy="no-referrer" style={{ width: 22, height: 22, borderRadius: '50%' }} />}
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>{user.displayName?.split(' ')[0] ?? 'PILOT'}</span>
                </div>
                <a href="/journal" onClick={e => { setMenuOpen(false); handleJournalClick(e) }} style={{ padding: '12px 16px', border: '1px solid rgba(255,255,255,0.2)', color: 'white', background: 'rgba(255,255,255,0.05)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', borderRadius: 4, fontFamily: 'Orbitron, monospace', textAlign: 'center', cursor: 'pointer' }}>Open App</a>
                <a href="#" onClick={e => { e.preventDefault(); setMenuOpen(false); handleLogout() }} style={{ padding: '12px 16px', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', background: 'transparent', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', borderRadius: 4, fontFamily: 'Orbitron, monospace', textAlign: 'center', cursor: 'pointer' }}>Logout</a>
              </>
            ) : (
              <>
                <a href="/journal" onClick={e => { setMenuOpen(false); handleJournalClick(e) }} style={{ padding: '12px 16px', border: '1px solid rgba(255,255,255,0.2)', color: 'white', background: 'rgba(255,255,255,0.05)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', borderRadius: 4, fontFamily: 'Orbitron, monospace', textAlign: 'center', cursor: 'pointer' }}>Open App</a>
                <a href="#" onClick={e => { e.preventDefault(); setMenuOpen(false); setShowLoginModal(true) }} style={{ padding: '12px 16px', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', background: 'transparent', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', borderRadius: 4, fontFamily: 'Orbitron, monospace', textAlign: 'center', cursor: 'pointer' }}>Login</a>
              </>
            )}
          </div>
        )}
      </nav>

      {/* HERO */}
      <main style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden', flexDirection: isMobile ? 'column' : 'row' }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.06, backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        {/* Hero card */}
        <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '100px 20px 32px' : '0 40px', paddingTop: isMobile ? 100 : 64, width: '100%' }}>
          <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              padding: isMobile ? '32px 24px' : '48px 44px',
              borderRadius: 20,
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)',
              transform: isMobile ? 'none' : `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: 'transform 0.2s ease',
              maxWidth: isMobile ? '100%' : 480,
              width: '100%',
            }}
          >
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: isMobile ? 52 : 'clamp(44px, 6vw, 76px)', fontWeight: 900, lineHeight: 0.9, color: 'white', marginBottom: 8 }}>TRADE</div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: isMobile ? 52 : 'clamp(44px, 6vw, 76px)', fontWeight: 900, lineHeight: 0.9, marginBottom: 28, WebkitTextStroke: '1px rgba(255,255,255,0.5)', WebkitTextFillColor: 'transparent' }}>COMET</div>
            <div style={{ width: 40, height: 1, background: 'linear-gradient(90deg, white, transparent)', marginBottom: 20, opacity: 0.4 }} />
            <div style={{ marginBottom: 32 }}>
              <p style={{ fontFamily: 'Orbitron, monospace', fontSize: isMobile ? 11 : 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)', margin: '0 0 12px 0' }}>TRACK. ANALYZE. EVOLVE.</p>
              <p style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, color: 'rgba(255,255,255,0.25)', lineHeight: 1.9, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Professional trading journal — log trades,<br />analyze your edge, grow consistently.</p>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexDirection: isMobile ? 'column' : 'row' }}>
              <a href="/journal" onClick={handleJournalClick} style={{ ...btnStyle, flex: isMobile ? 'unset' : 1 }} onMouseEnter={handleBtnEnter} onMouseLeave={handleBtnLeave}>Launch Journal</a>
              <a href="#features" style={{ ...btnStyle, flex: isMobile ? 'unset' : 1 }} onMouseEnter={handleBtnEnter} onMouseLeave={handleBtnLeave}>Learn More</a>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[['10K+', 'Trades'], ['500+', 'Traders'], ['99.9%', 'Uptime']].map(([num, label]) => (
                <div key={label} style={{ flex: 1, textAlign: 'center', padding: '10px 8px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: 'white' }}>{num}</div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Spline — hidden on mobile to save performance */}
        {!isMobile && (
          <div style={{ position: 'relative', zIndex: 10, flex: 1, height: '100vh' }}>
            <SplineScene scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode" className="w-full h-full" />
          </div>
        )}

        {/* Mobile: subtle bottom gradient instead of spline */}
        {isMobile && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200, background: 'linear-gradient(0deg, rgba(0,200,255,0.04), transparent)', pointerEvents: 'none', zIndex: 1 }} />
        )}
      </main>

      {/* FEATURES */}
      <section id="features" className="features-section" style={{ padding: '100px 80px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 64, flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 10 }}>Features</div>
            <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, lineHeight: 1, margin: 0 }}>BUILT FOR<br />THE EDGE.</h2>
          </div>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em', textTransform: 'uppercase', textAlign: 'right' }}>6 modules<br />1 system</div>
        </div>
        <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.07)' }}>
          {features.map((f) => (
            <div key={f.num} style={{ background: '#060608', padding: isMobile ? '24px 20px' : '36px 32px', position: 'relative', overflow: 'hidden', transition: 'background 0.3s', cursor: isMobile ? 'default' : 'none' }} onMouseEnter={e => { if (!isMobile) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }} onMouseLeave={e => (e.currentTarget.style.background = '#060608')}>
              <div style={{ position: 'absolute', top: -10, right: 20, fontFamily: 'Orbitron, monospace', fontSize: isMobile ? 60 : 100, fontWeight: 900, color: 'rgba(255,255,255,0.03)', lineHeight: 1, userSelect: 'none' }}>{f.num}</div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.3em', marginBottom: 20 }}>{f.num} /06</div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: isMobile ? 14 : 'clamp(16px, 1.8vw, 22px)', fontWeight: 900, lineHeight: 1.05, color: 'white', marginBottom: 16, whiteSpace: 'pre-line' }}>{f.title}</div>
              <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.2)', marginBottom: 12 }} />
              <p style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', lineHeight: 1.8, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section" style={{ padding: '100px 80px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: isMobile ? 24 : 36, fontWeight: 900, marginBottom: 16, lineHeight: 1.2 }}>READY TO FIND YOUR EDGE?</h2>
        <p style={{ fontFamily: 'Orbitron, monospace', color: 'rgba(255,255,255,0.25)', fontSize: 10, marginBottom: 36, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Start journaling your trades today. Free forever.</p>
        <a href="/journal" onClick={handleJournalClick} style={{ ...btnStyle, flex: 'unset', padding: isMobile ? '14px 32px' : '15px 48px', display: 'inline-block', width: isMobile ? '100%' : 'auto', maxWidth: isMobile ? 320 : 'none' }} onMouseEnter={handleBtnEnter} onMouseLeave={handleBtnLeave}>Launch Journal</a>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: isMobile ? '24px 20px' : '28px 80px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="footer-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 900 }}>TRADECOMET</div>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: isMobile ? 8 : 10, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.1em' }}>© 2026 TRADECOMET. ALL RIGHTS RESERVED.</div>
        </div>
      </footer>

      <button onClick={toggleMute} style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 500, width: 40, height: 40, borderRadius: 4, background: 'rgba(6,6,8,0.7)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', cursor: isMobile ? 'pointer' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(20px)', transition: 'all 0.3s', fontFamily: 'Orbitron, monospace' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.boxShadow = '0 0 20px rgba(255,255,255,0.08)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.boxShadow = 'none' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {muted ? (
            <>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <line x1="23" y1="9" x2="17" y2="15"/>
              <line x1="17" y1="9" x2="23" y2="15"/>
            </>
          ) : (
            <>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </>
          )}
        </svg>
      </button>
    </div>
  )
}
