import { useTheme } from '../ThemeContext'
import { useEffect, useRef } from 'react'
import './ThemeBackground.css'

/* ========== COSMIC DUNES ========== */
function CosmicDunes() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let frame
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    // Shooting stars
    const shooters = []
    const spawnShooter = () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.4,
      vx: 3 + Math.random() * 5,
      vy: 1 + Math.random() * 3,
      life: 60 + Math.random() * 40,
      age: 0,
      len: 30 + Math.random() * 50,
    })

    let t = 0
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Shooting stars
      if (Math.random() < 0.015) shooters.push(spawnShooter())
      for (let i = shooters.length - 1; i >= 0; i--) {
        const s = shooters[i]
        s.x += s.vx
        s.y += s.vy
        s.age++
        const alpha = 1 - s.age / s.life
        const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * (s.len / 5), s.y - s.vy * (s.len / 5))
        grad.addColorStop(0, `rgba(200,180,255,${alpha})`)
        grad.addColorStop(1, 'rgba(200,180,255,0)')
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(s.x - s.vx * (s.len / 5), s.y - s.vy * (s.len / 5))
        ctx.stroke()
        if (s.age > s.life) shooters.splice(i, 1)
      }

      // Pulsing nebula rings
      for (let r = 0; r < 3; r++) {
        const cx = canvas.width * (0.2 + r * 0.3)
        const cy = canvas.height * (0.3 + Math.sin(t * 0.005 + r * 2) * 0.15)
        const radius = 120 + Math.sin(t * 0.008 + r) * 60
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
        grad.addColorStop(0, `rgba(140,60,255,${0.06 + Math.sin(t * 0.01 + r) * 0.03})`)
        grad.addColorStop(1, 'rgba(140,60,255,0)')
        ctx.fillStyle = grad
        ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2)
      }

      t++
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <div className="tb tb-cosmic">
      <canvas ref={canvasRef} className="full-canvas" />
      <div className="cosmic-nebula" />
      <div className="cosmic-nebula cosmic-nebula-2" />
      <div className="cosmic-nebula cosmic-nebula-3" />
      {Array.from({ length: 60 }).map((_, i) => (
        <div key={i} className="cosmic-star" style={{
          left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 4}s`,
          animationDuration: `${1.5 + Math.random() * 3}s`,
          width: `${1 + Math.random() * 3}px`, height: `${1 + Math.random() * 3}px`,
        }} />
      ))}
      <svg className="cosmic-dunes-svg" viewBox="0 0 1440 400" preserveAspectRatio="none">
        <path d="M0,300 C200,180 400,340 600,220 C800,100 1000,300 1200,180 C1350,120 1420,260 1440,220 L1440,400 L0,400 Z" fill="rgba(90,40,180,0.2)" className="cosmic-dune-1" />
        <path d="M0,340 C300,240 500,360 720,260 C940,160 1100,320 1440,240 L1440,400 L0,400 Z" fill="rgba(60,20,140,0.15)" className="cosmic-dune-2" />
        <path d="M0,360 C200,300 500,380 800,300 C1100,220 1300,360 1440,300 L1440,400 L0,400 Z" fill="rgba(40,10,100,0.12)" className="cosmic-dune-3" />
      </svg>
    </div>
  )
}

/* ========== POST-APOCALYPTIC ========== */
function PostApocalyptic() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let frame
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    // Embers rising and ash falling
    const embers = Array.from({ length: 40 }).map(() => ({
      x: Math.random() * 2000, y: Math.random() * 2000,
      vx: -0.3 + Math.random() * 0.6, vy: -(1 + Math.random() * 2),
      size: 2 + Math.random() * 4, alpha: 0.4 + Math.random() * 0.5,
      glow: Math.random() > 0.5,
    }))
    const ash = Array.from({ length: 50 }).map(() => ({
      x: Math.random() * 2000, y: Math.random() * 2000,
      vx: 0.5 + Math.random() * 1.5, vy: 0.3 + Math.random() * 1,
      size: 1 + Math.random() * 3, alpha: 0.1 + Math.random() * 0.2,
      rot: Math.random() * Math.PI * 2, rotV: (Math.random() - 0.5) * 0.02,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Rising embers
      embers.forEach(e => {
        e.x += e.vx + Math.sin(Date.now() * 0.001 + e.x) * 0.5
        e.y += e.vy
        if (e.y < -20) { e.y = canvas.height + 20; e.x = Math.random() * canvas.width }
        if (e.glow) {
          ctx.shadowBlur = 12
          ctx.shadowColor = 'rgba(255,120,20,0.6)'
        }
        ctx.fillStyle = `rgba(255,${80 + Math.random() * 60},20,${e.alpha})`
        ctx.beginPath()
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      })

      // Drifting ash
      ash.forEach(a => {
        a.x += a.vx
        a.y += a.vy
        a.rot += a.rotV
        if (a.x > canvas.width + 20) { a.x = -20; a.y = Math.random() * canvas.height }
        if (a.y > canvas.height + 20) { a.y = -20 }
        ctx.save()
        ctx.translate(a.x, a.y)
        ctx.rotate(a.rot)
        ctx.fillStyle = `rgba(180,140,80,${a.alpha})`
        ctx.fillRect(-a.size, -a.size * 0.3, a.size * 2, a.size * 0.6)
        ctx.restore()
      })

      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <div className="tb tb-postapoc">
      <canvas ref={canvasRef} className="full-canvas" />
      <div className="postapoc-haze" />
      <div className="postapoc-haze postapoc-haze-2" />
      <svg className="postapoc-terrain" viewBox="0 0 1440 300" preserveAspectRatio="none">
        <path d="M0,240 C100,160 200,230 350,140 C500,50 600,200 800,100 C1000,0 1200,160 1440,80 L1440,300 L0,300 Z" fill="rgba(196,90,32,0.18)" className="postapoc-dune-1" />
        <path d="M0,270 C200,200 450,260 700,170 C950,80 1200,220 1440,140 L1440,300 L0,300 Z" fill="rgba(150,60,20,0.12)" className="postapoc-dune-2" />
      </svg>
    </div>
  )
}

/* ========== ICE DUNES ========== */
function IceDunes() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let frame
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const flakes = Array.from({ length: 60 }).map(() => ({
      x: Math.random() * 2000, y: Math.random() * 2000,
      vy: 0.5 + Math.random() * 1.5, size: 2 + Math.random() * 6,
      wobble: Math.random() * Math.PI * 2, wobbleSpeed: 0.01 + Math.random() * 0.03,
      alpha: 0.3 + Math.random() * 0.5, type: Math.floor(Math.random() * 3),
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      flakes.forEach(f => {
        f.y += f.vy
        f.wobble += f.wobbleSpeed
        f.x += Math.sin(f.wobble) * 1.5
        if (f.y > canvas.height + 20) { f.y = -20; f.x = Math.random() * canvas.width }

        ctx.save()
        ctx.translate(f.x, f.y)
        ctx.globalAlpha = f.alpha

        if (f.type === 0) {
          // Diamond crystal
          ctx.fillStyle = 'rgba(180,220,240,0.8)'
          ctx.rotate(Math.PI / 4)
          ctx.fillRect(-f.size / 2, -f.size / 2, f.size, f.size)
        } else if (f.type === 1) {
          // Snowflake cross
          ctx.strokeStyle = 'rgba(160,210,235,0.7)'
          ctx.lineWidth = 1.5
          for (let a = 0; a < 3; a++) {
            ctx.beginPath()
            ctx.moveTo(-f.size, 0); ctx.lineTo(f.size, 0)
            ctx.stroke()
            ctx.rotate(Math.PI / 3)
          }
        } else {
          // Simple dot
          ctx.fillStyle = 'rgba(200,230,245,0.6)'
          ctx.beginPath()
          ctx.arc(0, 0, f.size / 2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      })
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <div className="tb tb-ice">
      <canvas ref={canvasRef} className="full-canvas" />
      <div className="ice-aurora" />
      <div className="ice-aurora ice-aurora-2" />
      <svg className="ice-ridges" viewBox="0 0 1440 400" preserveAspectRatio="none">
        <path d="M0,300 C150,200 300,320 500,200 C700,80 900,280 1100,160 C1250,80 1380,240 1440,180 L1440,400 L0,400 Z" fill="rgba(42,122,154,0.1)" className="ice-ridge-1" />
        <path d="M0,340 C250,260 450,350 700,240 C950,130 1150,300 1440,220 L1440,400 L0,400 Z" fill="rgba(42,122,154,0.07)" className="ice-ridge-2" />
      </svg>
      <div className="ice-frost-edge ice-frost-top" />
      <div className="ice-frost-edge ice-frost-bottom" />
    </div>
  )
}

/* ========== RHYTHM DUNES ========== */
function RhythmDunes() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let frame
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const bars = 64
    let t = 0
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const barW = canvas.width / bars

      // Bottom bars
      for (let i = 0; i < bars; i++) {
        const h = 40 + Math.sin(t * 0.025 + i * 0.3) * 80 + Math.sin(t * 0.04 + i * 0.15) * 50 + Math.sin(t * 0.015 + i * 0.5) * 30
        const hue = (i / bars) * 60 + 320 + Math.sin(t * 0.01) * 20
        ctx.fillStyle = `hsla(${hue % 360}, 100%, 55%, 0.18)`
        ctx.fillRect(i * barW, canvas.height - h, barW - 1, h)
        // Mirror on top, faint
        ctx.fillStyle = `hsla(${hue % 360}, 100%, 55%, 0.06)`
        ctx.fillRect(i * barW, 0, barW - 1, h * 0.4)
      }

      // Horizontal wave line
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(0,229,255,0.3)'
      ctx.lineWidth = 2
      for (let x = 0; x < canvas.width; x += 3) {
        const y = canvas.height / 2 + Math.sin(t * 0.03 + x * 0.008) * 40 + Math.sin(t * 0.05 + x * 0.015) * 20
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()

      // Floating beat circles
      for (let c = 0; c < 5; c++) {
        const cx = canvas.width * (0.15 + c * 0.18)
        const cy = canvas.height * 0.4 + Math.sin(t * 0.02 + c * 1.5) * 60
        const r = 15 + Math.sin(t * 0.04 + c) * 10
        const alpha = 0.08 + Math.sin(t * 0.03 + c * 2) * 0.05
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,45,149,${alpha})`
        ctx.fill()
        ctx.strokeStyle = `rgba(255,45,149,${alpha * 2})`
        ctx.lineWidth = 1
        ctx.stroke()
      }

      t++
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <div className="tb tb-rhythm">
      <canvas ref={canvasRef} className="full-canvas" />
      <div className="rhythm-glow" />
      <div className="rhythm-scanline" />
    </div>
  )
}

/* ========== MINDSCAPE ========== */
function Mindscape() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let frame
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const orbs = Array.from({ length: 8 }).map((_, i) => ({
      x: Math.random() * 1500, y: Math.random() * 1000,
      vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8,
      radius: 60 + Math.random() * 120,
      hue: 260 + Math.random() * 60, phase: i * 0.7,
    }))

    let t = 0
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      orbs.forEach(o => {
        o.x += o.vx + Math.sin(t * 0.003 + o.phase) * 0.5
        o.y += o.vy + Math.cos(t * 0.004 + o.phase) * 0.5
        // Bounce off edges
        if (o.x < -100 || o.x > canvas.width + 100) o.vx *= -1
        if (o.y < -100 || o.y > canvas.height + 100) o.vy *= -1
        const r = o.radius + Math.sin(t * 0.006 + o.phase) * 40
        const grad = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, r)
        grad.addColorStop(0, `hsla(${o.hue + Math.sin(t * 0.005) * 20}, 60%, 70%, 0.12)`)
        grad.addColorStop(1, 'hsla(0,0%,0%,0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(o.x, o.y, r, 0, Math.PI * 2)
        ctx.fill()
      })

      // Connecting lines between nearby orbs
      ctx.strokeStyle = 'rgba(140,100,200,0.04)'
      ctx.lineWidth = 1
      for (let i = 0; i < orbs.length; i++) {
        for (let j = i + 1; j < orbs.length; j++) {
          const dx = orbs[i].x - orbs[j].x, dy = orbs[i].y - orbs[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 400) {
            ctx.beginPath()
            ctx.moveTo(orbs[i].x, orbs[i].y)
            ctx.lineTo(orbs[j].x, orbs[j].y)
            ctx.stroke()
          }
        }
      }

      t++
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <div className="tb tb-mindscape">
      <canvas ref={canvasRef} className="full-canvas" />
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="mindscape-thought" style={{
          left: `${5 + Math.random() * 90}%`, top: `${5 + Math.random() * 90}%`,
          animationDelay: `${Math.random() * 6}s`,
          animationDuration: `${3 + Math.random() * 4}s`,
          width: `${6 + Math.random() * 10}px`, height: `${6 + Math.random() * 10}px`,
        }} />
      ))}
    </div>
  )
}

/* ========== FANTASY CREATURE ========== */
function FantasyCreature() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let frame
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const fireflies = Array.from({ length: 15 }).map(() => ({
      x: Math.random() * 1500, y: Math.random() * 1000,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.6,
      radius: 100 + Math.random() * 150,
      size: 3 + Math.random() * 4,
      hue: Math.random() > 0.7 ? 120 : 50,
    }))

    let t = 0
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      fireflies.forEach(f => {
        const cx = f.x + Math.sin(t * 0.005 * f.speed + f.phase) * f.radius
        const cy = f.y + Math.cos(t * 0.007 * f.speed + f.phase * 1.3) * f.radius * 0.6
        const pulse = 0.5 + Math.sin(t * 0.03 + f.phase) * 0.5
        // Glow
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 25 + pulse * 20)
        grad.addColorStop(0, `hsla(${f.hue}, 80%, 60%, ${0.3 * pulse})`)
        grad.addColorStop(1, 'hsla(0,0%,0%,0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(cx, cy, 25 + pulse * 20, 0, Math.PI * 2)
        ctx.fill()
        // Core
        ctx.fillStyle = `hsla(${f.hue}, 90%, 70%, ${0.6 + pulse * 0.4})`
        ctx.beginPath()
        ctx.arc(cx, cy, f.size * pulse, 0, Math.PI * 2)
        ctx.fill()
      })
      t++
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <div className="tb tb-fantasy">
      <canvas ref={canvasRef} className="full-canvas" />
      <div className="fantasy-fog" />
      <div className="fantasy-fog fantasy-fog-2" />
      <div className="fantasy-fog fantasy-fog-3" />
      {Array.from({ length: 30 }).map((_, i) => (
        <div key={i} className="fantasy-sparkle" style={{
          left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 5}s`,
          animationDuration: `${1 + Math.random() * 2}s`,
        }} />
      ))}
      <svg className="fantasy-vines" viewBox="0 0 1440 400" preserveAspectRatio="none">
        <path d="M0,300 C120,200 200,340 350,240 C500,140 580,300 720,200 C860,100 1000,280 1200,180 C1350,120 1400,280 1440,220 L1440,400 L0,400 Z" fill="rgba(64,192,96,0.1)" className="fantasy-vine-sway" />
        <path d="M0,350 C200,280 400,370 650,270 C900,170 1100,330 1440,260 L1440,400 L0,400 Z" fill="rgba(64,192,96,0.06)" />
      </svg>
    </div>
  )
}

/* ========== URBAN SANDSTORM ========== */
function UrbanSandstorm() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let frame
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const particles = Array.from({ length: 200 }).map(() => ({
      x: Math.random() * 2000, y: Math.random() * 1200,
      vx: 3 + Math.random() * 8, vy: -1 + Math.random() * 2,
      size: 1 + Math.random() * 3, alpha: 0.08 + Math.random() * 0.25,
      streak: 3 + Math.random() * 12,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy + Math.sin(p.x * 0.005) * 0.3
        if (p.x > canvas.width + 20) { p.x = -20; p.y = Math.random() * canvas.height }
        ctx.fillStyle = `rgba(200,184,144,${p.alpha})`
        ctx.fillRect(p.x, p.y, p.streak, p.size)
      })
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <div className="tb tb-urban">
      <canvas ref={canvasRef} className="full-canvas" />
      <div className="urban-haze" />
      <div className="urban-haze urban-haze-2" />
      <div className="urban-grid" />
    </div>
  )
}

/* ========== LAVA LAMP ========== */
function LavaLamp() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let frame
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const blobs = Array.from({ length: 6 }).map((_, i) => ({
      x: Math.random() * 1500, y: Math.random() * 1000,
      vy: (Math.random() - 0.5) * 0.6,
      wobbleX: Math.random() * Math.PI * 2,
      wobbleY: Math.random() * Math.PI * 2,
      baseRadius: 80 + Math.random() * 120,
      hue: [10, 30, 340, 20, 350, 15][i],
    }))

    let t = 0
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      blobs.forEach(b => {
        b.y += b.vy
        if (b.y < -200) b.vy = Math.abs(b.vy)
        if (b.y > canvas.height + 200) b.vy = -Math.abs(b.vy)
        const x = b.x + Math.sin(t * 0.003 + b.wobbleX) * 80
        const y = b.y + Math.sin(t * 0.004 + b.wobbleY) * 60
        const r = b.baseRadius + Math.sin(t * 0.005 + b.wobbleX) * 40

        const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
        grad.addColorStop(0, `hsla(${b.hue}, 80%, 55%, 0.18)`)
        grad.addColorStop(0.6, `hsla(${b.hue}, 70%, 45%, 0.08)`)
        grad.addColorStop(1, 'hsla(0,0%,0%,0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      })
      t++
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <div className="tb tb-lava">
      <canvas ref={canvasRef} className="full-canvas" />
    </div>
  )
}

/* ========== GLITCH MATRIX ========== */
function GlitchMatrix() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let frame
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const cols = Math.floor(canvas.width / 18)
    const drops = Array.from({ length: cols }).map(() => ({
      y: Math.random() * -100, speed: 1 + Math.random() * 3, chars: [],
    }))

    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ01001110'.split('')
    let t = 0
    let glitchTimer = 0

    const draw = () => {
      // Semi-transparent clear for trails
      ctx.fillStyle = 'rgba(5,15,5,0.08)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.font = '14px monospace'
      drops.forEach((d, i) => {
        const x = i * 18
        d.y += d.speed
        if (d.y > canvas.height + 50) { d.y = Math.random() * -200; d.speed = 1 + Math.random() * 3 }

        // Draw chars along the column
        for (let j = 0; j < 12; j++) {
          const cy = d.y - j * 18
          if (cy < 0 || cy > canvas.height) continue
          const alpha = j === 0 ? 1 : Math.max(0, 0.6 - j * 0.05)
          const green = j === 0 ? 255 : 180
          ctx.fillStyle = `rgba(0,${green},65,${alpha * 0.5})`
          ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x, cy)
        }
      })

      // Occasional glitch bars
      glitchTimer++
      if (glitchTimer > 60 && Math.random() < 0.03) {
        const gy = Math.random() * canvas.height
        const gh = 2 + Math.random() * 8
        ctx.fillStyle = `rgba(0,255,65,${0.05 + Math.random() * 0.08})`
        ctx.fillRect(0, gy, canvas.width, gh)
        if (Math.random() < 0.3) glitchTimer = 0
      }

      t++
      frame = requestAnimationFrame(draw)
    }
    // Initial clear
    ctx.fillStyle = '#050f05'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    draw()
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <div className="tb tb-glitch">
      <canvas ref={canvasRef} className="full-canvas" />
      <div className="glitch-scanline" />
    </div>
  )
}

/* ========== DEEP OCEAN ========== */
function DeepOcean() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let frame
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const bubbles = Array.from({ length: 30 }).map(() => ({
      x: Math.random() * 2000, y: Math.random() * 2000 + 500,
      vy: -(0.5 + Math.random() * 1.5), size: 3 + Math.random() * 12,
      wobble: Math.random() * Math.PI * 2, alpha: 0.1 + Math.random() * 0.2,
    }))

    // Jellyfish
    const jellies = Array.from({ length: 4 }).map(() => ({
      x: Math.random() * 1500, y: 200 + Math.random() * 600,
      phase: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.4,
      size: 20 + Math.random() * 25, hue: 200 + Math.random() * 40,
    }))

    let t = 0
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Caustic light waves
      for (let i = 0; i < 6; i++) {
        const x = canvas.width * (0.1 + i * 0.16) + Math.sin(t * 0.006 + i) * 80
        const y = Math.sin(t * 0.004 + i * 1.3) * 100
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 200 + Math.sin(t * 0.008 + i) * 80)
        grad.addColorStop(0, `rgba(60,180,220,${0.04 + Math.sin(t * 0.01 + i) * 0.02})`)
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      // Bubbles
      bubbles.forEach(b => {
        b.y += b.vy
        b.wobble += 0.02
        b.x += Math.sin(b.wobble) * 0.8
        if (b.y < -30) { b.y = canvas.height + 30; b.x = Math.random() * canvas.width }
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(120,200,230,${b.alpha})`
        ctx.lineWidth = 1.5
        ctx.stroke()
        // Highlight
        ctx.beginPath()
        ctx.arc(b.x - b.size * 0.3, b.y - b.size * 0.3, b.size * 0.25, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(180,230,250,${b.alpha * 0.5})`
        ctx.fill()
      })

      // Jellyfish
      jellies.forEach(j => {
        const x = j.x + Math.sin(t * 0.003 * j.speed + j.phase) * 100
        const y = j.y + Math.sin(t * 0.005 * j.speed + j.phase) * 50
        const pulse = Math.sin(t * 0.02 + j.phase)

        // Bell
        const bellH = j.size * (0.8 + pulse * 0.2)
        const grad = ctx.createRadialGradient(x, y, 0, x, y + bellH * 0.5, j.size * 1.5)
        grad.addColorStop(0, `hsla(${j.hue}, 60%, 60%, 0.12)`)
        grad.addColorStop(1, 'hsla(0,0%,0%,0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.ellipse(x, y, j.size, bellH, 0, Math.PI, 0)
        ctx.fill()
        ctx.strokeStyle = `hsla(${j.hue}, 60%, 70%, 0.15)`
        ctx.lineWidth = 1
        ctx.stroke()

        // Tentacles
        for (let te = -2; te <= 2; te++) {
          ctx.beginPath()
          ctx.moveTo(x + te * 6, y)
          const tx = x + te * 6 + Math.sin(t * 0.015 + te + j.phase) * 12
          const ty = y + j.size * 1.8 + Math.sin(t * 0.01 + te) * 10
          ctx.quadraticCurveTo(x + te * 8, y + j.size, tx, ty)
          ctx.strokeStyle = `hsla(${j.hue}, 50%, 60%, 0.1)`
          ctx.lineWidth = 1
          ctx.stroke()
        }
      })

      t++
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <div className="tb tb-ocean">
      <canvas ref={canvasRef} className="full-canvas" />
      <div className="ocean-vignette" />
    </div>
  )
}

/* ========== VAPORWAVE ========== */
function Vaporwave() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let frame
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    let t = 0
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const horizon = canvas.height * 0.55

      // Sun
      const sunY = horizon - 60 + Math.sin(t * 0.003) * 10
      const sunGrad = ctx.createRadialGradient(canvas.width / 2, sunY, 20, canvas.width / 2, sunY, 120)
      sunGrad.addColorStop(0, 'rgba(255,100,200,0.25)')
      sunGrad.addColorStop(0.5, 'rgba(255,60,100,0.12)')
      sunGrad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = sunGrad
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Horizontal stripes through sun
      for (let s = 0; s < 8; s++) {
        const sy = sunY - 40 + s * 12
        ctx.fillStyle = 'rgba(20,5,40,0.3)'
        ctx.fillRect(canvas.width / 2 - 120, sy, 240, 3 + s * 0.5)
      }

      // Perspective grid
      ctx.strokeStyle = 'rgba(255,50,200,0.12)'
      ctx.lineWidth = 1

      // Horizontal lines moving toward viewer
      for (let i = 0; i < 20; i++) {
        const progress = ((i * 30 + t * 1.5) % 600) / 600
        const y = horizon + progress * (canvas.height - horizon) * 1.2
        const alpha = progress * 0.15
        ctx.strokeStyle = `rgba(255,50,200,${alpha})`
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      // Vertical converging lines
      for (let i = -10; i <= 10; i++) {
        const baseX = canvas.width / 2 + i * 80
        ctx.strokeStyle = 'rgba(100,50,255,0.08)'
        ctx.beginPath()
        ctx.moveTo(canvas.width / 2, horizon)
        ctx.lineTo(baseX + i * 200, canvas.height + 50)
        ctx.stroke()
      }

      t++
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <div className="tb tb-vapor">
      <canvas ref={canvasRef} className="full-canvas" />
      <div className="vapor-chrome" />
    </div>
  )
}

const backgrounds = {
  default: null,
  cosmic: CosmicDunes,
  postapoc: PostApocalyptic,
  ice: IceDunes,
  rhythm: RhythmDunes,
  mindscape: Mindscape,
  fantasy: FantasyCreature,
  urban: UrbanSandstorm,
  lava: LavaLamp,
  glitch: GlitchMatrix,
  ocean: DeepOcean,
  vapor: Vaporwave,
}

export default function ThemeBackground() {
  const { themeKey } = useTheme()
  const Bg = backgrounds[themeKey]
  if (!Bg) return null
  return <Bg />
}
