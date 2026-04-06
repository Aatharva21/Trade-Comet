//@ts-nocheck
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
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

/* ── GLSL HILLS ────────────────────────────────────────── */
const GLSLHills = () => {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true })
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000)
    const clock = new THREE.Clock()
    const uniforms = { time: { type: 'f', value: 0 } }
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(256, 256, 256, 256),
      new THREE.RawShaderMaterial({
        uniforms,
        vertexShader: `#define GLSLIFY 1
attribute vec3 position;uniform mat4 projectionMatrix;uniform mat4 modelViewMatrix;uniform float time;varying vec3 vPosition;
mat4 rotateMatrixX(float r){return mat4(1.,0.,0.,0.,0.,cos(r),-sin(r),0.,0.,sin(r),cos(r),0.,0.,0.,0.,1.);}
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
vec3 fade(vec3 t){return t*t*t*(t*(t*6.-15.)+10.);}
float cnoise(vec3 P){vec3 Pi0=floor(P),Pi1=Pi0+1.;Pi0=mod289(Pi0);Pi1=mod289(Pi1);vec3 Pf0=fract(P),Pf1=Pf0-1.;
vec4 ix=vec4(Pi0.x,Pi1.x,Pi0.x,Pi1.x),iy=vec4(Pi0.yy,Pi1.yy),iz0=Pi0.zzzz,iz1=Pi1.zzzz;
vec4 ixy=permute(permute(ix)+iy),ixy0=permute(ixy+iz0),ixy1=permute(ixy+iz1);
vec4 gx0=ixy0*(1./7.),gy0=fract(floor(gx0)*(1./7.))-.5;gx0=fract(gx0);vec4 gz0=vec4(.5)-abs(gx0)-abs(gy0);vec4 sz0=step(gz0,vec4(0.));gx0-=sz0*(step(0.,gx0)-.5);gy0-=sz0*(step(0.,gy0)-.5);
vec4 gx1=ixy1*(1./7.),gy1=fract(floor(gx1)*(1./7.))-.5;gx1=fract(gx1);vec4 gz1=vec4(.5)-abs(gx1)-abs(gy1);vec4 sz1=step(gz1,vec4(0.));gx1-=sz1*(step(0.,gx1)-.5);gy1-=sz1*(step(0.,gy1)-.5);
vec3 g000=vec3(gx0.x,gy0.x,gz0.x),g100=vec3(gx0.y,gy0.y,gz0.y),g010=vec3(gx0.z,gy0.z,gz0.z),g110=vec3(gx0.w,gy0.w,gz0.w);
vec3 g001=vec3(gx1.x,gy1.x,gz1.x),g101=vec3(gx1.y,gy1.y,gz1.y),g011=vec3(gx1.z,gy1.z,gz1.z),g111=vec3(gx1.w,gy1.w,gz1.w);
vec4 norm0=taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));g000*=norm0.x;g010*=norm0.y;g100*=norm0.z;g110*=norm0.w;
vec4 norm1=taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));g001*=norm1.x;g011*=norm1.y;g101*=norm1.z;g111*=norm1.w;
float n000=dot(g000,Pf0),n100=dot(g100,vec3(Pf1.x,Pf0.yz)),n010=dot(g010,vec3(Pf0.x,Pf1.y,Pf0.z)),n110=dot(g110,vec3(Pf1.xy,Pf0.z));
float n001=dot(g001,vec3(Pf0.xy,Pf1.z)),n101=dot(g101,vec3(Pf1.x,Pf0.y,Pf1.z)),n011=dot(g011,vec3(Pf0.x,Pf1.yz)),n111=dot(g111,Pf1);
vec3 fxyz=fade(Pf0);vec4 nz=mix(vec4(n000,n100,n010,n110),vec4(n001,n101,n011,n111),fxyz.z);vec2 nyz=mix(nz.xy,nz.zw,fxyz.y);return 2.2*mix(nyz.x,nyz.y,fxyz.x);}
void main(){vec3 up=(rotateMatrixX(radians(90.))*vec4(position,1.)).xyz;float s=sin(radians(up.x/128.*90.));vec3 np=up+vec3(0.,0.,time*-30.);
float n1=cnoise(np*.08),n2=cnoise(np*.06),n3=cnoise(np*.4);vec3 lp=up+vec3(0.,n1*s*8.+n2*s*8.+n3*(abs(s)*2.+.5)+pow(s,2.)*40.,0.);
vPosition=lp;gl_Position=projectionMatrix*modelViewMatrix*vec4(lp,1.);}`,
        fragmentShader: `precision highp float;varying vec3 vPosition;void main(){float o=(96.-length(vPosition))/256.*.5;gl_FragColor=vec4(vec3(.7),o);}`,
        transparent: true
      })
    )
    scene.add(mesh)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    camera.position.set(0, 16, 125)
    camera.lookAt(new THREE.Vector3(0, 28, 0))
    let animId: number
    const loop = () => {
      uniforms.time.value += clock.getDelta() * 0.5
      renderer.render(scene, camera)
      animId = requestAnimationFrame(loop)
    }
    loop()
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize); renderer.dispose() }
  }, [])
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }} />
}

/* ── RATING ────────────────────────────────────────────── */
const ratingData = [
  { emoji: '😔', label: 'Terrible' },
  { emoji: '😕', label: 'Poor' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '😍', label: 'Amazing' },
]

const RatingInteraction = ({ user, onSubmit }: { user: any, onSubmit: (r: number, msg: string) => void }) => {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const displayRating = hoverRating || rating
  const activeData = displayRating > 0 ? ratingData[displayRating - 1] : null
  if (submitted) return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: 'white', letterSpacing: '0.1em', marginBottom: 8 }}>THANK YOU!</div>
      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em' }}>YOUR FEEDBACK HELPS US IMPROVE</div>
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        {ratingData.map((item, i) => {
          const val = i + 1
          const isActive = val <= displayRating
          return (
            <button key={val} onClick={() => setRating(val)} onMouseEnter={() => setHoverRating(val)} onMouseLeave={() => setHoverRating(0)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, transition: 'all 0.25s', transform: isActive ? 'scale(1.2)' : 'scale(1)', outline: 'none' }}>
              <span style={{ fontSize: 34, display: 'block', filter: isActive ? 'grayscale(0)' : 'grayscale(1)', opacity: isActive ? 1 : 0.3, transition: 'all 0.25s', userSelect: 'none' }}>{item.emoji}</span>
            </button>
          )
        })}
      </div>
      <div style={{ height: 18, fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: 'white', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
        {activeData ? activeData.label : 'RATE YOUR EXPERIENCE'}
      </div>
      <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Tell us more... (optional)"
        style={{ width: '100%', maxWidth: 380, minHeight: 80, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '10px 14px', color: 'white', fontFamily: 'Orbitron, monospace', fontSize: 9, letterSpacing: '0.08em', outline: 'none', resize: 'vertical' }}
        onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'}
        onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'} />
      <button onClick={() => { if (rating) { onSubmit(rating, message); setSubmitted(true) } }} disabled={!rating}
        style={{ padding: '11px 32px', border: `1px solid ${rating ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)'}`, color: rating ? 'white' : 'rgba(255,255,255,0.2)', background: rating ? 'rgba(255,255,255,0.05)' : 'transparent', fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', borderRadius: 2, cursor: rating ? 'pointer' : 'default', transition: 'all 0.3s' }}
        onMouseEnter={e => { if (rating) { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)' } }}
        onMouseLeave={e => { if (rating) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)' } }}>
        SUBMIT FEEDBACK
      </button>
    </div>
  )
}

/* ── FEATURES ──────────────────────────────────────────── */
const features = [
  { num: '01', title: 'TRADE LOGGING', desc: 'Log every trade with entry, exit, P&L, screenshots and notes in seconds.' },
  { num: '02', title: 'DEEP ANALYTICS', desc: 'Win rate, profit factor, expectancy, drawdown — every metric you need.' },
  { num: '03', title: 'PATTERN RECOGNITION', desc: 'Discover which setups and sessions make you the most money.' },
  { num: '04', title: 'RISK MANAGEMENT', desc: 'Track R-multiples and risk per trade automatically.' },
  { num: '05', title: 'TRADE CALENDAR', desc: 'Spot your best and worst trading days visually over time.' },
  { num: '06', title: 'YOUR PLAYBOOK', desc: 'Build your playbook with custom setups, rules and mindset notes.' },
]

/* ── MAIN ──────────────────────────────────────────────── */
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

  useEffect(() => { const u = onAuthStateChanged(auth, u => setUser(u)); return u }, [])
  useEffect(() => { const c = () => setIsMobile(window.innerWidth <= 768); c(); window.addEventListener('resize', c); return () => window.removeEventListener('resize', c) }, [])

  useEffect(() => {
    const audio = new Audio('/tradecometSoundTrack.mp3')
    audio.loop = true; audio.volume = 0.4; audio.muted = false
    audioRef.current = audio
    const tryPlay = () => { audio.play().catch(() => {}) }
    tryPlay()
    document.addEventListener('click', tryPlay, { once: true })
    document.addEventListener('touchstart', tryPlay, { once: true })
    document.addEventListener('keydown', tryPlay, { once: true })
    document.addEventListener('mousemove', tryPlay, { once: true })
    return () => { audio.pause() }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    canvas.width = window.innerWidth; canvas.height = window.innerHeight
    const stars = Array.from({ length: 180 }, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: Math.random() * 1.2, speed: Math.random() * 0.25 + 0.03, opacity: Math.random() }))
    let animId: number
    const animate = () => {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      stars.forEach(s => { s.opacity += (Math.random() - 0.5) * 0.015; s.opacity = Math.max(0.05, Math.min(0.9, s.opacity)); ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${s.opacity})`; ctx.fill(); s.y -= s.speed; if (s.y < 0) s.y = canvas.height })
      animId = requestAnimationFrame(animate)
    }
    animate()
    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    window.addEventListener('resize', onResize)
    let tx = 0, ty = 0, cx = 0, cy = 0
    const onMove = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY }
    window.addEventListener('mousemove', onMove)
    const animCursor = () => { cx += (tx - cx) * 0.5; cy += (ty - cy) * 0.5; if (cursorRef.current) { cursorRef.current.style.left = cx + 'px'; cursorRef.current.style.top = cy + 'px' }; requestAnimationFrame(animCursor) }
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
    else { e.preventDefault(); const p = new URLSearchParams({ uid: user.uid, email: user.email || '', name: user.displayName || '' }); window.location.href = `/journal?${p.toString()}` }
  }
  const toggleMute = () => { if (!audioRef.current) return; audioRef.current.muted = !audioRef.current.muted; setMuted(audioRef.current.muted) }
  const handleFeedbackSubmit = (rating: number, message: string) => { console.log('Feedback:', { rating, message, user: user?.email }) }

  const navLinkStyle: React.CSSProperties = { padding: '7px 18px', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', background: 'transparent', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', textDecoration: 'none', borderRadius: 2, cursor: isMobile ? 'pointer' : 'none', fontFamily: 'Orbitron, monospace', transition: 'all 0.25s' }
  const navLinkPrimaryStyle: React.CSSProperties = { ...navLinkStyle, border: '1px solid rgba(255,255,255,0.25)', color: 'white', background: 'rgba(255,255,255,0.04)' }

  return (
    <div style={{ fontFamily: 'Orbitron, monospace', background: '#060608', color: 'white', cursor: isMobile ? 'auto' : 'none', overflowX: 'hidden' }}>
      <style>{`
        html,body{margin:0;padding:0;overflow-x:hidden;background:#060608;}
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;}
        ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:#060608;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:2px;}
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
        .feat-card{
          background:rgba(255,255,255,0.045)!important;
          border:1px solid rgba(255,255,255,0.1)!important;
          border-radius:16px!important;
          backdrop-filter:blur(18px)!important;
          -webkit-backdrop-filter:blur(18px)!important;
          box-shadow:inset 0 1px 0 rgba(255,255,255,0.1),0 4px 32px rgba(0,0,0,0.35)!important;
          transition:transform 0.3s cubic-bezier(.34,1.56,.64,1),background 0.3s,box-shadow 0.3s,border-color 0.3s!important;
        }
        .feat-card::before{
          content:'';position:absolute;inset:0;border-radius:16px;
          background:radial-gradient(ellipse at 60% 0%,rgba(255,255,255,0.07) 0%,transparent 65%);
          pointer-events:none;
        }
        .feat-card:hover{
          transform:scale(1.04) translateY(-4px)!important;
          background:rgba(255,255,255,0.08)!important;
          border-color:rgba(255,255,255,0.22)!important;
          box-shadow:inset 0 1px 0 rgba(255,255,255,0.18),0 12px 48px rgba(0,0,0,0.5),0 0 40px rgba(255,255,255,0.04)!important;
        }
        @media(max-width:768px){
          .spline-wrap{display:none!important;}
          .hero-inner{padding:0 28px!important;}
          .hero-trade{font-size:clamp(56px,15vw,80px)!important;}
          .hero-comet{font-size:clamp(56px,15vw,80px)!important;}
          .hero-morph-wrap{font-size:clamp(22px,6vw,32px)!important;}
          .features-grid{grid-template-columns:1fr!important;}
          .footer-inner{flex-direction:column!important;gap:6px!important;text-align:center!important;}
        }
        @media(min-width:769px) and (max-width:1100px){.features-grid{grid-template-columns:repeat(2,1fr)!important;}}
      `}</style>

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div onClick={() => setShowLoginModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn 0.2s ease' }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: 360, padding: isMobile ? '32px 22px 28px' : '44px 38px 40px', background: '#08080e', border: '1px solid rgba(0,200,255,0.25)', borderRadius: 12, animation: 'fadeUp 0.3s ease, borderPulse 3s ease-in-out infinite', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: 12 }}>
              <div style={{ position: 'absolute', left: 0, right: 0, height: '30%', background: 'linear-gradient(180deg,transparent,rgba(0,200,255,0.03),transparent)', animation: 'scanline 4s linear infinite' }} />
            </div>
            {[{top:0,left:0,borderTop:'1px solid #00f5ff',borderLeft:'1px solid #00f5ff'},{top:0,right:0,borderTop:'1px solid #00f5ff',borderRight:'1px solid #00f5ff'},{bottom:0,left:0,borderBottom:'1px solid #7b2fff',borderLeft:'1px solid #7b2fff'},{bottom:0,right:0,borderBottom:'1px solid #7b2fff',borderRight:'1px solid #7b2fff'}].map((s,i)=><div key={i} style={{ position: 'absolute', width: 14, height: 14, ...s }} />)}
            <button onClick={() => setShowLoginModal(false)} style={{ position: 'absolute', top: 14, right: 14, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 16, cursor: 'pointer', padding: 4 }}>✕</button>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, letterSpacing: '0.12em', color: 'white', marginBottom: 8 }}>TRADECOMET</div>
              <div style={{ width: 32, height: 1, background: 'linear-gradient(90deg,transparent,#00f5ff,transparent)', margin: '0 auto 8px' }} />
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.28em', textTransform: 'uppercase' }}>MISSION CONTROL ACCESS</div>
            </div>
            <button onClick={handleGoogleLogin} disabled={loginLoading} style={{ width: '100%', padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, color: 'white', fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.3s', opacity: loginLoading ? 0.6 : 1 }}>
              {!loginLoading ? (<svg width="16" height="16" viewBox="0 0 18 18" style={{ flexShrink: 0 }}><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/></svg>) : (<div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTop: '2px solid #00f5ff', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />)}
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
            {user ? (<>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
                {user.photoURL && <img src={user.photoURL} alt="" crossOrigin="anonymous" referrerPolicy="no-referrer" style={{ width: 20, height: 20, borderRadius: '50%' }} />}
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>{user.displayName?.split(' ')[0] ?? 'PILOT'}</span>
              </div>
              <a href="#" onClick={e=>{e.preventDefault();handleLogout()}} className="nav-a" style={navLinkStyle}>Logout</a>
              <a href="/journal" onClick={handleJournalClick} className="nav-a" style={navLinkPrimaryStyle}>Open App</a>
            </>) : (<>
              <a href="#" onClick={e=>{e.preventDefault();setShowLoginModal(true)}} className="nav-a" style={navLinkStyle}>Login</a>
              <a href="/journal" onClick={handleJournalClick} className="nav-a" style={navLinkPrimaryStyle}>Open App</a>
            </>)}
          </div>
        )}
        {isMobile && (
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3, padding: '7px 9px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 16, height: 1.5, background: 'white', borderRadius: 2, transition: 'all 0.3s', transform: menuOpen ? (i===0?'translateY(5.5px) rotate(45deg)':i===2?'translateY(-5.5px) rotate(-45deg)':'none') : 'none', opacity: menuOpen && i===1 ? 0 : 1 }} />)}
          </button>
        )}
        {isMobile && menuOpen && (
          <div style={{ position: 'absolute', top: 60, left: 0, right: 0, background: 'rgba(6,6,8,0.98)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10, animation: 'menuSlide 0.2s ease' }}>
            {user ? (<>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {user.photoURL && <img src={user.photoURL} alt="" crossOrigin="anonymous" referrerPolicy="no-referrer" style={{ width: 20, height: 20, borderRadius: '50%' }} />}
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>{user.displayName?.split(' ')[0] ?? 'PILOT'}</span>
              </div>
              <a href="/journal" onClick={e=>{setMenuOpen(false);handleJournalClick(e)}} style={{ ...navLinkPrimaryStyle, textAlign: 'center', padding: '11px 16px' }}>Open App</a>
              <a href="#" onClick={e=>{e.preventDefault();setMenuOpen(false);handleLogout()}} style={{ ...navLinkStyle, textAlign: 'center', padding: '11px 16px' }}>Logout</a>
            </>) : (<>
              <a href="/journal" onClick={e=>{setMenuOpen(false);handleJournalClick(e)}} style={{ ...navLinkPrimaryStyle, textAlign: 'center', padding: '11px 16px' }}>Open App</a>
              <a href="#" onClick={e=>{e.preventDefault();setMenuOpen(false);setShowLoginModal(true)}} style={{ ...navLinkStyle, textAlign: 'center', padding: '11px 16px' }}>Login</a>
            </>)}
          </div>
        )}
      </nav>

      {/* ══ PAGE 1: HERO ══ */}
      <section style={{ position: 'relative', height: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.025, backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '80px 80px' }} />
        <div className="hero-inner" style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: isMobile ? '0 28px' : '0 0 0 80px', paddingTop: 60 }}>
          <div className="hero-trade" style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(64px, 9vw, 130px)', fontWeight: 900, lineHeight: 0.88, color: 'white', letterSpacing: '-0.01em' }}>TRADE</div>
          <div className="hero-comet" style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(64px, 9vw, 130px)', fontWeight: 900, lineHeight: 0.88, letterSpacing: '-0.01em', WebkitTextStroke: '1.5px rgba(255,255,255,0.35)', WebkitTextFillColor: 'transparent', marginBottom: 40 }}>COMET</div>
          <div className="hero-morph" style={{ marginBottom: 36 }}>
            <div className="hero-morph-wrap" style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(22px, 3.2vw, 42px)', fontWeight: 900, color: 'white', letterSpacing: '0.04em', width: '100%', maxWidth: 520 }}>
              <MorphingText texts={morphWords} />
            </div>
          </div>
          <div className="hero-sub" style={{ fontFamily: 'Orbitron, monospace', fontSize: isMobile ? 9 : 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.22em', textTransform: 'uppercase', lineHeight: 2, marginBottom: 48, maxWidth: 380 }}>
            Professional trading journal.<br />Log trades. Analyze your edge.<br />Grow consistently.
          </div>
          <div className="hero-btn" style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <a href="/journal" onClick={handleJournalClick} className="launch-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: isMobile ? '13px 28px' : '14px 36px', border: '1px solid rgba(255,255,255,0.25)', color: 'white', background: 'rgba(255,255,255,0.04)', fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', textDecoration: 'none', borderRadius: 2, cursor: isMobile ? 'pointer' : 'none', fontFamily: 'Orbitron, monospace', transition: 'all 0.3s' }}>
              LAUNCH JOURNAL
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
            <a href="#features" style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none', cursor: isMobile ? 'pointer' : 'none', transition: 'color 0.2s' }} onMouseEnter={e=>e.currentTarget.style.color='rgba(255,255,255,0.7)'} onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.3)'}>
              EXPLORE ↓
            </a>
          </div>
        </div>
        <div className="spline-wrap" style={{ position: 'relative', zIndex: 10, flex: 1, height: '100vh' }}>
          <SplineScene scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode" className="w-full h-full" />
        </div>
      </section>

      {/* ══ PAGE 2: FEATURES + GLSL HILLS ══ */}
      <section id="features" style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden', background: '#060608' }}>
        <GLSLHills />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#060608 0%,rgba(6,6,8,0.35) 25%,rgba(6,6,8,0.35) 75%,#060608 100%)', zIndex: 1, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 2, padding: isMobile ? '80px 20px' : '100px 80px' }}>
          <div style={{ marginBottom: isMobile ? 48 : 72, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 16 }}>What's inside</div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: isMobile ? 'clamp(32px,8vw,44px)' : 'clamp(40px,5vw,60px)', fontWeight: 900, lineHeight: 1, color: 'white', letterSpacing: '-0.01em' }}>
              BUILT FOR<br />
              <span style={{ WebkitTextStroke: '1px rgba(255,255,255,0.25)', WebkitTextFillColor: 'transparent' }}>THE EDGE.</span>
            </div>
          </div>
          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, maxWidth: 1100, margin: '0 auto' }}>
            {features.map(f => (
              <div key={f.num} className="feat-card" style={{ padding: isMobile ? '24px 18px' : '38px 32px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -10, right: 14, fontFamily: 'Orbitron, monospace', fontSize: isMobile ? 52 : 80, fontWeight: 900, color: 'rgba(255,255,255,0.025)', lineHeight: 1, userSelect: 'none' }}>{f.num}</div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.3em', marginBottom: 12 }}>{f.num} / 06</div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: isMobile ? 11 : 13, fontWeight: 900, lineHeight: 1.3, color: 'white', marginBottom: 12, letterSpacing: '0.04em' }}>{f.title}</div>
                <div style={{ width: 18, height: 1, background: 'rgba(255,255,255,0.12)', marginBottom: 12 }} />
                <p style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, color: 'rgba(255,255,255,0.28)', lineHeight: 1.8, margin: 0, letterSpacing: '0.04em' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PAGE 3: FEEDBACK ══ */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#060608', borderTop: '1px solid rgba(255,255,255,0.04)', padding: isMobile ? '80px 20px' : '100px 80px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 700, background: 'radial-gradient(circle, rgba(255,255,255,0.015) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 520, textAlign: 'center' }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 18 }}>Mission Debrief</div>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: isMobile ? 28 : 44, fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: '-0.01em', marginBottom: 10 }}>
            HOW ARE WE<br />
            <span style={{ WebkitTextStroke: '1px rgba(255,255,255,0.25)', WebkitTextFillColor: 'transparent' }}>PERFORMING?</span>
          </div>
          <div style={{ width: 36, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)', margin: '0 auto 44px' }} />
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: isMobile ? '28px 20px' : '44px 44px' }}>
            {user ? (
              <>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 8, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.2em', marginBottom: 28 }}>
                  LOGGED IN AS {(user.displayName?.split(' ')[0] ?? 'PILOT').toUpperCase()}
                </div>
                <RatingInteraction user={user} onSubmit={handleFeedbackSubmit} />
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 18 }}>🔒</div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: 'white', letterSpacing: '0.1em', marginBottom: 8 }}>LOGIN TO LEAVE FEEDBACK</div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.15em', marginBottom: 28 }}>YOUR OPINION MATTERS TO US</div>
                <button onClick={() => setShowLoginModal(true)} style={{ padding: '11px 28px', border: '1px solid rgba(255,255,255,0.18)', color: 'white', background: 'rgba(255,255,255,0.04)', fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', borderRadius: 2, cursor: 'pointer', transition: 'all 0.3s' }} onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.1)';e.currentTarget.style.borderColor='rgba(255,255,255,0.4)'}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.borderColor='rgba(255,255,255,0.18)'}}>
                  LOGIN TO RATE
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: isMobile ? '20px 24px' : '24px 80px', borderTop: '1px solid rgba(255,255,255,0.04)', background: '#060608' }}>
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
