//@ts-nocheck
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
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

/* ── MORPHING TEXT ─────────────────────────────────────── */
const morphTime = 1.8
const cooldownTime = 0.6

const useMorphingText = (texts: string[]) => {
  const textIndexRef = useRef(0)
  const morphRef = useRef(0)
  const cooldownRef = useRef(0)
  const timeRef = useRef(new Date())
  const text1Ref = useRef<HTMLSpanElement>(null)
  const text2Ref = useRef<HTMLSpanElement>(null)

  const setStyles = useCallback((fraction: number) => {
    const [c1, c2] = [text1Ref.current, text2Ref.current]
    if (!c1 || !c2 || !texts?.length) return
    c2.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`
    c2.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`
    const inv = 1 - fraction
    c1.style.filter = `blur(${Math.min(8 / inv - 8, 100)}px)`
    c1.style.opacity = `${Math.pow(inv, 0.4) * 100}%`
    c1.textContent = texts[textIndexRef.current % texts.length]
    c2.textContent = texts[(textIndexRef.current + 1) % texts.length]
  }, [texts])

  const doMorph = useCallback(() => {
    morphRef.current -= cooldownRef.current
    cooldownRef.current = 0
    let fraction = morphRef.current / morphTime
    if (fraction > 1) { cooldownRef.current = cooldownTime; fraction = 1 }
    setStyles(fraction)
    if (fraction === 1) textIndexRef.current++
  }, [setStyles])

  const doCooldown = useCallback(() => {
    morphRef.current = 0
    const [c1, c2] = [text1Ref.current, text2Ref.current]
    if (c1 && c2) { c2.style.filter = 'none'; c2.style.opacity = '100%'; c1.style.filter = 'none'; c1.style.opacity = '0%' }
  }, [])

  useEffect(() => {
    let id: number
    const animate = () => {
      id = requestAnimationFrame(animate)
      const now = new Date()
      const dt = (now.getTime() - timeRef.current.getTime()) / 1000
      timeRef.current = now
      cooldownRef.current -= dt
      if (cooldownRef.current <= 0) doMorph(); else doCooldown()
    }
    animate()
    return () => cancelAnimationFrame(id)
  }, [doMorph, doCooldown])

  return { text1Ref, text2Ref }
}

const MorphingText = ({ texts }: { texts: string[] }) => {
  const { text1Ref, text2Ref } = useMorphingText(texts)
  return (
    <div style={{ position: 'relative', height: '1.1em', width: '100%', filter: 'url(#threshold) blur(0.4px)' }}>
      <span ref={text1Ref} style={{ position: 'absolute', inset: 0, display: 'inline-block', width: '100%' }} />
      <span ref={text2Ref} style={{ position: 'absolute', inset: 0, display: 'inline-block', width: '100%' }} />
      <svg style={{ display: 'none' }}>
        <defs>
          <filter id="threshold">
            <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140" />
          </filter>
        </defs>
      </svg>
    </div>
  )
}

/* ── MAIN PAGE ─────────────────────────────────────────── */
export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [muted, setMuted] = useState(false)

  const morphWords = ['TRACK.', 'ANALYZE.', 'EVOLVE.', 'DOMINATE.', 'REPEAT.']

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u))
    return () => unsub()
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const audio = new Audio('/tradecometSoundTrack.mp3')
    audio.loop = true; audio.volume = 0.4; audio.muted = false
    audioRef.current = audio
    audio.play().catch(() => {})
    return () => { audio.pause() }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      size: Math.random() * 1.2, speed: Math.random() * 0.25 + 0.03, opacity: Math.random()
    }))
    let animId: number
    const animate = () => {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      stars.forEach(s => {
        s.opacity += (Math.random() - 0.5) * 0.015
        s.opacity = Math.max(0.05, Math.min(0.9, s.opacity))
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${s.opacity})`; ctx.fill()
        s.y -= s.speed; if (s.y < 0) s.y = canvas.height
      })
      animId = requestAnimationFrame(animate)
    }
    animate()
    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    window.addEventListener('resize', onResize)
    let tx = 0, ty = 0, cx = 0, cy = 0
    const onMove = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY }
    window.addEventListener('mousemove', onMove)
    const animCursor = () => {
      cx += (tx - cx) * 0.5; cy += (ty - cy) * 0.5
      if (cursorRef.current) { cursorRef.current.style.left = cx + 'px'; cursorRef.current.style.top = cy + 'px' }
      requestAnimationFrame(animCursor)
    }
    animCursor()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize); window.removeEventListener('mousemove', onMove) }
  }, [])

  const handleGoogleLogin = async () => {
    setLoginLoading(true); setLoginError('')
    try { await signInWithPopup(auth, provider); setShowLoginModal(false) }
    catch { setLoginError('Sign-in failed. Please try again.') }
    finally { setLoginLoading(false) }
  }

  const handleLogout = () => signOut(auth)

  const handleJournalClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!user) { e.preventDefault(); setShowLoginModal(true) }
    else {
      e.preventDefault()
      const params = new URLSearchParams({ uid: user.uid, email: user.email || '', name: user.displayName || '' })
      window.location.href = `/journal?${params.toString()}`
    }
  }

  const toggleMute = () => {
    if (!audioRef.current) return
    audioRef.current.muted = !audioRef.current.muted
    setMuted(audioRef.current.muted)
  }

  const navLinkStyle: React.CSSProperties = {
    padding: '7px 18px', border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.5)', background: 'transparent',
    fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
    textTransform: 'uppercase', textDecoration: 'none',
    borderRadius: 2, cursor: isMobile ? 'pointer' : 'none',
    fontFamily: 'Orbitron, monospace', transition: 'all 0.25s',
  }

  const navLinkPrimaryStyle: React.CSSProperties = {
    ...navLinkStyle,
    border: '1px solid rgba(255,255,255,0.25)',
    color: 'white', background: 'rgba(255,255,255,0.04)',
  }

  return (
    <div style={{ fontFamily: 'Orbitron, monospace', background: '#060608', minHeight: '100vh', color: 'white', cursor: isMobile ? 'auto' : 'none', overflowX: 'hidden' }}>

      <style>{`
        html,body{margin:0;padding:0;overflow-x:hidden;background:#060608;}
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-track{background:#060608;}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:2px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px);}to{opacity:1;transform:translateY(0);}}
        @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes scanline{0%{transform:translateY(-100%);}100%{transform:translateY(400%);}}
        @keyframes borderPulse{0%,100%{border-color:rgba(0,200,255,0.3);box-shadow:0 0 30px rgba(0,150,255,0.15);}50%{border-color:rgba(100,0,255,0.4);box-shadow:0 0 40px rgba(100,0,255,0.2);}}
        @keyframes menuSlide{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);}}
        .hero-trade{animation:fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s both;}
        .hero-comet{animation:fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s both;}
        .hero-morph{animation:fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.35s both;}
        .hero-sub{animation:fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.45s both;}
        .hero-btn{animation:fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.55s both;}
        .nav-a:hover{color:white!important;border-color:rgba(255,255,255,0.35)!important;}
        .launch-btn:hover{background:rgba(255,255,255,0.1)!important;border-color:rgba(255,255,255,0.5)!important;box-shadow:0 0 32px rgba(255,255,255,0.08)!important;}
        @media(max-width:768px){
          .spline-wrap{display:none!important;}
          .hero-inner{padding:0 28px!important;}
          .hero-trade{font-size:clamp(56px,15vw,80px)!important;}
          .hero-comet{font-size:clamp(56px,15vw,80px)!important;}
          .hero-morph-wrap{font-size:clamp(22px,6vw,32px)!important;}
          .footer-inner{flex-direction:column!important;gap:6px!important;text-align:center!important;}
        }
      `}</style>

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div onClick={() => setShowLoginModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn 0.2s ease' }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: 360, padding: isMobile ? '32px 22px 28px' : '44px 38px 40px', background: '#08080e', border: '1px solid rgba(0,200,255,0.25)', borderRadius: 12, animation: 'fadeUp 0.3s ease, borderPulse 3s ease-in-out infinite', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: 12 }}>
              <div style={{ position: 'absolute', left: 0, right: 0, height: '30%', background: 'linear-gradient(180deg,transparent,rgba(0,200,255,0.03),transparent)', animation: 'scanline 4s linear infinite' }} />
            </div>
            {[{top:0,left:0,borderTop:'1px solid #00f5ff',borderLeft:'1px solid #00f5ff'},{top:0,right:0,borderTop:'1px solid #00f5ff',borderRight:'1px solid #00f5ff'},{bottom:0,left:0,borderBottom:'1px solid #7b2fff',borderLeft:'1px solid #7b2fff'},{bottom:0,right:0,borderBottom:'1px solid #7b2fff',borderRight:'1px solid #7b2fff'}].map((s,i)=>(
              <div key={i} style={{ position: 'absolute', width: 14, height: 14, ...s }} />
            ))}
            <button onClick={() => setShowLoginModal(false)} style={{ position: 'absolute', top: 14, right: 14, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 16, cursor: 'pointer', padding: 4, transition: 'color 0.2s' }} onMouseEnter={e=>e.currentTarget.style.color='white'} onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.25)'}>✕</button>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, letterSpacing: '0.12em', color: 'white', marginBottom: 8 }}>TRADECOMET</div>
              <div style={{ width: 32, height: 1, background: 'linear-gradient(90deg,transparent,#00f5ff,transparent)', margin: '0 auto 8px' }} />
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.28em', textTransform: 'uppercase' }}>MISSION CONTROL ACCESS</div>
            </div>
            <button onClick={handleGoogleLogin} disabled={loginLoading} style={{ width: '100%', padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, color: 'white', fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.3s', opacity: loginLoading ? 0.6 : 1 }} onMouseEnter={e=>{if(!loginLoading){e.currentTarget.style.background='rgba(255,255,255,0.08)';e.currentTarget.style.borderColor='rgba(0,200,255,0.3)';}}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.borderColor='rgba(255,255,255,0.12)';}}>
              {!loginLoading ? (
                <svg width="16" height="16" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
              ) : (
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTop: '2px solid #00f5ff', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
              )}
              {loginLoading ? 'AUTHENTICATING...' : 'CONTINUE WITH GOOGLE'}
            </button>
            {loginError && <div style={{ marginTop: 10, fontFamily: 'Orbitron, monospace', fontSize: 8, color: '#ff4444', textAlign: 'center', letterSpacing: '0.1em' }}>⚠ {loginError}</div>}
            <div style={{ marginTop: 20, fontFamily: 'Orbitron, monospace', fontSize: 7, color: 'rgba(255,255,255,0.12)', textAlign: 'center', letterSpacing: '0.14em', lineHeight: 2 }}>BY CONTINUING YOU AGREE TO OUR TERMS.<br />YOUR DATA IS ENCRYPTED & SECURE.</div>
          </div>
        </div>
      )}

      {/* CURSOR */}
      {!isMobile && (
        <div ref={cursorRef} style={{ position: 'fixed', width: 24, height: 24, pointerEvents: 'none', zIndex: 9999, transform: 'translate(-50%,-50%)', transition: 'width 0.2s,height 0.2s' }}>
          <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(255,255,255,0.7)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', top: -3, left: '50%', transform: 'translateX(-50%)', width: 1, height: 3, background: 'white', opacity: 0.5 }} />
          <div style={{ position: 'absolute', bottom: -3, left: '50%', transform: 'translateX(-50%)', width: 1, height: 3, background: 'white', opacity: 0.5 }} />
          <div style={{ position: 'absolute', left: -3, top: '50%', transform: 'translateY(-50%)', height: 1, width: 3, background: 'white', opacity: 0.5 }} />
          <div style={{ position: 'absolute', right: -3, top: '50%', transform: 'translateY(-50%)', height: 1, width: 3, background: 'white', opacity: 0.5 }} />
        </div>
      )}

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 20px' : '0 48px', height: 60, background: 'rgba(6,6,8,0.6)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontFamily: 'Orbitron, monospace', fontWeight: 900, fontSize: 13, letterSpacing: '0.08em', color: 'white' }}>TRADECOMET</div>
        {!isMobile && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {user ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
                  {user.photoURL && <img src={user.photoURL} alt="" crossOrigin="anonymous" referrerPolicy="no-referrer" style={{ width: 20, height: 20, borderRadius: '50%' }} />}
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>{user.displayName?.split(' ')[0] ?? 'PILOT'}</span>
                </div>
                <a href="#" onClick={e=>{e.preventDefault();handleLogout()}} className="nav-a" style={navLinkStyle}>Logout</a>
                <a href="/journal" onClick={handleJournalClick} className="nav-a" style={navLinkPrimaryStyle}>Open App</a>
              </>
            ) : (
              <>
                <a href="#" onClick={e=>{e.preventDefault();setShowLoginModal(true)}} className="nav-a" style={navLinkStyle}>Login</a>
                <a href="/journal" onClick={handleJournalClick} className="nav-a" style={navLinkPrimaryStyle}>Open App</a>
              </>
            )}
          </div>
        )}
        {isMobile && (
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3, padding: '7px 9px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 16, height: 1.5, background: 'white', borderRadius: 2, transition: 'all 0.3s', transform: menuOpen ? (i===0?'translateY(5.5px) rotate(45deg)':i===2?'translateY(-5.5px) rotate(-45deg)':'none') : 'none', opacity: menuOpen && i===1 ? 0 : 1 }} />
            ))}
          </button>
        )}
        {isMobile && menuOpen && (
          <div style={{ position: 'absolute', top: 60, left: 0, right: 0, background: 'rgba(6,6,8,0.98)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10, animation: 'menuSlide 0.2s ease' }}>
            {user ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {user.photoURL && <img src={user.photoURL} alt="" crossOrigin="anonymous" referrerPolicy="no-referrer" style={{ width: 20, height: 20, borderRadius: '50%' }} />}
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>{user.displayName?.split(' ')[0] ?? 'PILOT'}</span>
                </div>
                <a href="/journal" onClick={e=>{setMenuOpen(false);handleJournalClick(e)}} style={{ ...navLinkPrimaryStyle, textAlign: 'center', padding: '11px 16px' }}>Open App</a>
                <a href="#" onClick={e=>{e.preventDefault();setMenuOpen(false);handleLogout()}} style={{ ...navLinkStyle, textAlign: 'center', padding: '11px 16px' }}>Logout</a>
              </>
            ) : (
              <>
                <a href="/journal" onClick={e=>{setMenuOpen(false);handleJournalClick(e)}} style={{ ...navLinkPrimaryStyle, textAlign: 'center', padding: '11px 16px' }}>Open App</a>
                <a href="#" onClick={e=>{e.preventDefault();setMenuOpen(false);setShowLoginModal(true)}} style={{ ...navLinkStyle, textAlign: 'center', padding: '11px 16px' }}>Login</a>
              </>
            )}
          </div>
        )}
      </nav>

      {/* HERO */}
      <main style={{ position: 'relative', height: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.025, backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '80px 80px' }} />

        {/* Left typography */}
        <div className="hero-inner" style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: isMobile ? '0 28px' : '0 0 0 80px', paddingTop: 60 }}>
          <div className="hero-trade" style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(64px, 9vw, 130px)', fontWeight: 900, lineHeight: 0.88, color: 'white', letterSpacing: '-0.01em' }}>
            TRADE
          </div>
          <div className="hero-comet" style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(64px, 9vw, 130px)', fontWeight: 900, lineHeight: 0.88, letterSpacing: '-0.01em', WebkitTextStroke: '1.5px rgba(255,255,255,0.35)', WebkitTextFillColor: 'transparent', marginBottom: 40 }}>
            COMET
          </div>
          <div className="hero-morph" style={{ marginBottom: 36 }}>
            <div className="hero-morph-wrap" style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(22px, 3.2vw, 42px)', fontWeight: 900, color: 'white', letterSpacing: '0.04em', width: '100%', maxWidth: 520 }}>
              <MorphingText texts={morphWords} />
            </div>
          </div>
          <div className="hero-sub" style={{ fontFamily: 'Orbitron, monospace', fontSize: isMobile ? 9 : 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.22em', textTransform: 'uppercase', lineHeight: 2, marginBottom: 48, maxWidth: 380 }}>
            Professional trading journal.<br />Log trades. Analyze your edge.<br />Grow consistently.
          </div>
          <div className="hero-btn">
            <a href="/journal" onClick={handleJournalClick} className="launch-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: isMobile ? '13px 28px' : '14px 36px', border: '1px solid rgba(255,255,255,0.25)', color: 'white', background: 'rgba(255,255,255,0.04)', fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', textDecoration: 'none', borderRadius: 2, cursor: isMobile ? 'pointer' : 'none', fontFamily: 'Orbitron, monospace', transition: 'all 0.3s' }}>
              LAUNCH JOURNAL
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Right spline */}
        <div className="spline-wrap" style={{ position: 'relative', zIndex: 10, flex: 1, height: '100vh' }}>
          <SplineScene scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode" className="w-full h-full" />
        </div>
      </main>

      {/* FOOTER */}
      <footer style={{ padding: isMobile ? '20px 24px' : '20px 80px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="footer-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 900, letterSpacing: '0.06em' }}>TRADECOMET</div>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: isMobile ? 7 : 9, color: 'rgba(255,255,255,0.12)', letterSpacing: '0.12em' }}>© 2026 TRADECOMET</div>
        </div>
      </footer>

      {/* MUTE BUTTON */}
      <button onClick={toggleMute} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 500, width: 38, height: 38, borderRadius: 3, background: 'rgba(6,6,8,0.7)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: isMobile ? 'pointer' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(20px)', transition: 'all 0.25s' }} onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.3)';e.currentTarget.style.color='white';}} onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.1)';e.currentTarget.style.color='rgba(255,255,255,0.5)';}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {muted ? (<><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></>) : (<><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></>)}
        </svg>
      </button>
    </div>
  )
}
