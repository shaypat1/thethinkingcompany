import { useState, useRef, useEffect, useCallback } from 'react'
import './TestGravity.css'

// Dark blue planet palette — fits the retro arcade theme
const PLANETS = [
  { name: 'MERCURY', base: '#1a2040', light: '#2a3060', dark: '#0c1020', glow: '#3040a0', detail: 'craters' },
  { name: 'VENUS',   base: '#1e2548', light: '#2e3568', dark: '#0e1528', glow: '#3848b0', detail: 'clouds' },
  { name: 'EARTH',   base: '#162050', light: '#263070', dark: '#0a1030', glow: '#3050c0', detail: 'earth' },
  { name: 'MARS',    base: '#1a1838', light: '#2a2858', dark: '#0c0818', glow: '#3828a0', detail: 'craters' },
  { name: 'JUPITER', base: '#141a3c', light: '#242a5c', dark: '#080a1c', glow: '#2a3a90', detail: 'bands' },
  { name: 'SATURN',  base: '#181e44', light: '#282e64', dark: '#0a0e24', glow: '#3040a8', detail: 'rings' },
]

const QUESTIONS_PER_LEVEL = 4
const BASE_SPEED = 1.35
const SPAWN_INTERVAL_BASE = 90 // frames between spawns
const MAX_LIVES = 3

function normalize(str) {
  return str.replace(/,/g, '').replace(/\s+/g, '').toLowerCase()
}

// Hardcoded retro arcade palette — no CSS vars dependency
const RETRO_COLORS = {
  bg: '#0a0e1a',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.35)',
  accent: 'rgba(255,255,255,0.8)',
  border: 'rgba(255,255,255,0.15)',
}

export default function GravityRenderer({ questions, onRoundComplete, autoStart }) {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const inputRef = useRef(null)
  const [isMobile] = useState(() => 'ontouchstart' in window || window.innerWidth < 500)
  const [input, setInput] = useState('')
  const [gameState, setGameState] = useState(autoStart ? 'playing' : 'ready') // ready | playing | gameOver | won
  const [level, setLevel] = useState(0)
  const [lives, setLives] = useState(MAX_LIVES)
  const [score, setScore] = useState(0)
  const callbackFired = useRef(false)

  const totalLevels = Math.ceil(questions.length / QUESTIONS_PER_LEVEL)

  // Initialize game state ref for canvas loop access
  useEffect(() => {
    gameRef.current = {
      asteroids: [],
      particles: [],
      stars: [],
      spawnQueue: [],
      spawnTimer: 0,
      transition: null, // { phase: 'fadeOut' | 'fadeIn', start: number, fromLevel: number, toLevel: number }
      questions,
      level,
      lives,
      score,
      gameState,
      colors: RETRO_COLORS,
    }
  }, [])

  // Sync React state into ref
  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.level = level
      gameRef.current.lives = lives
      gameRef.current.score = score
      gameRef.current.gameState = gameState
    }
  }, [level, lives, score, gameState])


  const startLevel = useCallback((lvl) => {
    const g = gameRef.current
    if (!g) return
    const start = lvl * QUESTIONS_PER_LEVEL
    const end = Math.min(start + QUESTIONS_PER_LEVEL, questions.length)
    g.spawnQueue = questions.slice(start, end).map((q) => ({ ...q }))
    g.asteroids = []
    g.particles = []
    g.spawnTimer = SPAWN_INTERVAL_BASE // first asteroid drops immediately
    g.transition = null
  }, [questions])

  const startGame = useCallback(() => {
    setLevel(0)
    setLives(MAX_LIVES)
    setScore(0)
    setGameState('playing')
    callbackFired.current = false
    startLevel(0)
    if (inputRef.current) inputRef.current.focus()
  }, [startLevel])

  // Auto-start first level when autoStart is set
  useEffect(() => {
    if (autoStart && gameRef.current) {
      startLevel(0)
      if (inputRef.current) inputRef.current.focus()
    }
  }, [autoStart, startLevel])

  // Canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let frame

    // Generate starfield
    const stars = []
    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.6 + 0.2,
      })
    }
    if (gameRef.current) gameRef.current.stars = stars

    const dpr = window.devicePixelRatio || 1
    const resize = () => {
      const w = canvas.parentElement.clientWidth
      const h = canvas.parentElement.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    let t = 0

    const draw = () => {
      const g = gameRef.current
      if (!g) { frame = requestAnimationFrame(draw); return }

      const W = canvas.width / dpr
      const H = canvas.height / dpr
      const c = g.colors
      const planetY = H - 100
      const planet = PLANETS[g.level % PLANETS.length]

      // Clear
      ctx.clearRect(0, 0, W, H)

      // Fade transition state
      let fadeAlpha = 0
      if (g.transition) {
        const FADE_FRAMES = 25 // ~0.4s each way
        const elapsed = t - g.transition.start
        if (g.transition.phase === 'fadeOut') {
          const p = Math.min(elapsed / FADE_FRAMES, 1)
          fadeAlpha = p * p // ease in (accelerate to black)
          if (p >= 1) {
            const nextLvl = g.transition.toLevel
            g.transition = { phase: 'fadeIn', start: t, fromLevel: g.transition.fromLevel, toLevel: nextLvl }
            g.level = nextLvl
            setLevel(nextLvl)
            const qs = g.questions
            const qStart = nextLvl * QUESTIONS_PER_LEVEL
            const qEnd = Math.min(qStart + QUESTIONS_PER_LEVEL, qs.length)
            g.spawnQueue = qs.slice(qStart, qEnd).map((q) => ({ ...q }))
            g.asteroids = []
            g.particles = []
            g.spawnTimer = SPAWN_INTERVAL_BASE
            fadeAlpha = 1
          }
        } else if (g.transition.phase === 'fadeIn') {
          const p = Math.min(elapsed / FADE_FRAMES, 1)
          fadeAlpha = (1 - p) * (1 - p) // ease out (decelerate from black)
          if (p >= 1) {
            g.transition = null
            fadeAlpha = 0
          }
        }
      }

      // Stars
      g.stars.forEach((s) => {
        const twinkle = 0.5 + Math.sin(t * 0.02 + s.x * 100) * 0.5
        ctx.fillStyle = `rgba(255,255,255, ${s.alpha * twinkle})`
        ctx.beginPath()
        ctx.arc(s.x * W, s.y * H * 0.85, s.size, 0, Math.PI * 2)
        ctx.fill()
      })

      // Next planet in background (textured small sphere in sky)
      if (g.level + 1 < totalLevels && !g.transition) {
        const nextP = PLANETS[(g.level + 1) % PLANETS.length]
        const npX = W * 0.82
        const npY = H * 0.15
        const npR = 25

        ctx.save()
        ctx.beginPath()
        ctx.arc(npX, npY, npR, 0, Math.PI * 2)
        ctx.clip()

        // Base gradient
        const npGrad = ctx.createRadialGradient(npX - 8, npY - 8, 2, npX, npY, npR)
        npGrad.addColorStop(0, nextP.light)
        npGrad.addColorStop(0.5, nextP.base)
        npGrad.addColorStop(1, nextP.dark)
        ctx.fillStyle = npGrad
        ctx.beginPath()
        ctx.arc(npX, npY, npR, 0, Math.PI * 2)
        ctx.fill()

        // Surface detail on the small planet
        if (nextP.detail === 'craters') {
          const seeds = [0.2, 0.5, 0.8, 0.35, 0.65]
          for (let i = 0; i < seeds.length; i++) {
            const cx = npX - npR + seeds[i] * npR * 2
            const cy = npY - npR * 0.5 + seeds[(i + 2) % 5] * npR
            const cr = 2 + seeds[(i + 1) % 5] * 4
            ctx.fillStyle = nextP.dark
            ctx.globalAlpha = 0.3
            ctx.beginPath()
            ctx.arc(cx, cy, cr, 0, Math.PI * 2)
            ctx.fill()
            ctx.globalAlpha = 1
          }
        } else if (nextP.detail === 'bands') {
          for (let i = 0; i < 4; i++) {
            const by = npY - npR + i * (npR * 2 / 4)
            ctx.fillStyle = i % 2 === 0 ? nextP.dark : nextP.light
            ctx.globalAlpha = 0.2
            ctx.fillRect(npX - npR, by, npR * 2, npR / 3)
            ctx.globalAlpha = 1
          }
        } else if (nextP.detail === 'clouds') {
          for (let i = 0; i < 3; i++) {
            const cx = npX - npR * 0.5 + i * npR * 0.5 + Math.sin(i * 2 + t * 0.005) * 3
            const cy = npY - npR * 0.3 + i * npR * 0.3
            ctx.fillStyle = nextP.light
            ctx.globalAlpha = 0.25
            ctx.beginPath()
            ctx.ellipse(cx, cy, npR * 0.4, 3, 0.2, 0, Math.PI * 2)
            ctx.fill()
            ctx.globalAlpha = 1
          }
        } else if (nextP.detail === 'earth') {
          ctx.fillStyle = '#2a4a6a'
          ctx.globalAlpha = 0.35
          ctx.beginPath()
          ctx.ellipse(npX - 5, npY - 3, npR * 0.3, npR * 0.25, 0.3, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.ellipse(npX + 7, npY + 4, npR * 0.2, npR * 0.2, -0.2, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 1
        }

        // Terminator shadow (dark side crescent)
        const shadowGrad = ctx.createLinearGradient(npX + npR * 0.2, npY, npX + npR, npY)
        shadowGrad.addColorStop(0, 'transparent')
        shadowGrad.addColorStop(1, 'rgba(0,0,0,0.4)')
        ctx.fillStyle = shadowGrad
        ctx.beginPath()
        ctx.arc(npX, npY, npR, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()

        // Rings drawn outside the clip so they extend beyond the planet sphere
        if (nextP.detail === 'rings') {
          ctx.strokeStyle = nextP.light
          ctx.lineWidth = 1.5
          ctx.globalAlpha = 0.3
          ctx.beginPath()
          ctx.ellipse(npX, npY, npR * 1.4, npR * 0.12, -0.15, Math.PI + 0.3, Math.PI * 2 - 0.3)
          ctx.stroke()
          ctx.globalAlpha = 1
        }

        // Atmosphere glow (outside the clip)
        ctx.strokeStyle = nextP.glow
        ctx.lineWidth = 1.5
        ctx.globalAlpha = 0.3
        ctx.beginPath()
        ctx.arc(npX, npY, npR + 3, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      // Planet — massive sphere, curved surface spans full width
      const pRadius = W * 1.2
      const pCenterY = H + pRadius - 80

      ctx.save()
      ctx.beginPath()
      ctx.arc(W / 2, pCenterY, pRadius, 0, Math.PI * 2)
      ctx.clip()

      // Base gradient (lit from top-left)
      const baseGrad = ctx.createRadialGradient(
        W / 2 - pRadius * 0.3, pCenterY - pRadius * 0.3, pRadius * 0.1,
        W / 2, pCenterY, pRadius
      )
      baseGrad.addColorStop(0, planet.light)
      baseGrad.addColorStop(0.6, planet.base)
      baseGrad.addColorStop(1, planet.dark)
      ctx.fillStyle = baseGrad
      ctx.fillRect(W / 2 - pRadius, pCenterY - pRadius, pRadius * 2, pRadius * 2)

      // Surface detail (positioned in visible strip near top of sphere)
      const surfaceTop = pCenterY - pRadius // top of sphere circle
      if (planet.detail === 'craters') {
        const craterSeeds = [0.1, 0.3, 0.55, 0.75, 0.9, 0.2, 0.65, 0.45, 0.85]
        for (let i = 0; i < craterSeeds.length; i++) {
          const cx = craterSeeds[i] * W
          const cy = surfaceTop + 15 + (craterSeeds[(i + 3) % 9]) * 60
          const cr = 8 + craterSeeds[(i + 1) % 9] * 18
          ctx.fillStyle = planet.dark
          ctx.globalAlpha = 0.25
          ctx.beginPath()
          ctx.arc(cx, cy, cr, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 1
        }
      } else if (planet.detail === 'bands') {
        for (let i = 0; i < 5; i++) {
          const by = surfaceTop + i * 18
          ctx.fillStyle = i % 2 === 0 ? planet.dark : planet.light
          ctx.globalAlpha = 0.15
          ctx.fillRect(0, by, W, 10)
          ctx.globalAlpha = 1
        }
      } else if (planet.detail === 'clouds') {
        for (let i = 0; i < 6; i++) {
          const cx = (i / 6) * W + Math.sin(i * 2.1 + t * 0.003) * 40
          const cy = surfaceTop + 10 + i * 12
          ctx.fillStyle = planet.light
          ctx.globalAlpha = 0.2
          ctx.beginPath()
          ctx.ellipse(cx, cy, W * 0.12, 8, 0.2, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 1
        }
      } else if (planet.detail === 'earth') {
        ctx.fillStyle = '#2a4a6a'
        ctx.globalAlpha = 0.35
        const landX = Math.sin(t * 0.002) * 20
        ctx.beginPath()
        ctx.ellipse(W * 0.3 + landX, surfaceTop + 25, W * 0.15, 30, 0.3, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(W * 0.7 + landX, surfaceTop + 40, W * 0.1, 25, -0.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }

      // Atmosphere rim
      ctx.restore()
      const rimGrad = ctx.createRadialGradient(W / 2, pCenterY, pRadius * 0.85, W / 2, pCenterY, pRadius * 1.08)
      rimGrad.addColorStop(0, 'transparent')
      rimGrad.addColorStop(0.7, 'transparent')
      rimGrad.addColorStop(1, planet.glow)
      ctx.fillStyle = rimGrad
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.arc(W / 2, pCenterY, pRadius * 1.08, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1

      // Saturn rings (visible as arcs above the surface)
      if (planet.detail === 'rings') {
        ctx.strokeStyle = planet.light
        ctx.lineWidth = 4
        ctx.globalAlpha = 0.25
        ctx.beginPath()
        ctx.ellipse(W / 2, pCenterY, pRadius * 1.15, pRadius * 0.04, 0, Math.PI + 0.3, Math.PI * 2 - 0.3)
        ctx.stroke()
        ctx.strokeStyle = planet.base
        ctx.lineWidth = 6
        ctx.globalAlpha = 0.15
        ctx.beginPath()
        ctx.ellipse(W / 2, pCenterY, pRadius * 1.08, pRadius * 0.03, 0, Math.PI + 0.4, Math.PI * 2 - 0.4)
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      // Game logic (only when playing and not transitioning)
      if (g.gameState === 'playing' && !g.transition) {
        // Spawn asteroids from queue
        g.spawnTimer++
        const spawnInterval = Math.max(50, SPAWN_INTERVAL_BASE - g.level * 10)
        if (g.spawnQueue.length > 0 && g.spawnTimer >= spawnInterval) {
          const q = g.spawnQueue.shift()
          const asteroidW = 300
          g.asteroids.push({
            x: Math.random() * (W - 120) + 60,
            y: -30,
            vy: BASE_SPEED * (1 + g.level * 0.15),
            q: q.q,
            a: q.a,
            width: asteroidW,
            alive: true,
            wobble: Math.random() * Math.PI * 2,
          })
          g.spawnTimer = 0
        }

        // Update asteroids
        for (const a of g.asteroids) {
          if (!a.alive) continue
          a.y += a.vy
          a.wobble += 0.02

          // Hit planet
          if (a.y >= planetY - 20) {
            a.alive = false
            g.lives = Math.max(0, g.lives - 1)
            setLives(g.lives)

            // Impact particles
            for (let i = 0; i < 12; i++) {
              g.particles.push({
                x: a.x, y: planetY - 10,
                vx: (Math.random() - 0.5) * 4,
                vy: -Math.random() * 3 - 1,
                life: 40 + Math.random() * 20,
                age: 0,
                color: planet.color,
              })
            }

            if (g.lives <= 0) {
              if (onRoundComplete && !callbackFired.current) {
                callbackFired.current = true
                setGameState('gameOver')
                setTimeout(() => onRoundComplete(false), 800)
              } else {
                setGameState('gameOver')
              }
            }
          }
        }

        // Check level complete
        const allDone = g.spawnQueue.length === 0 && g.asteroids.every((a) => !a.alive)
        if (allDone && g.gameState === 'playing' && g.lives > 0 && !g.transition) {
          if (onRoundComplete && !callbackFired.current) {
            callbackFired.current = true
            setTimeout(() => onRoundComplete(true), 800)
          } else if (g.level + 1 >= totalLevels) {
            setGameState('won')
          } else {
            // Start fade transition to next planet (no overlay, auto-advance)
            g.transition = { phase: 'fadeOut', start: t, fromLevel: g.level, toLevel: g.level + 1 }
          }
        }
      }

      // Draw chunky faceted asteroids
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (const a of g.asteroids) {
        if (!a.alive) continue
        const wobbleX = Math.sin(a.wobble) * 2
        const cx = a.x + wobbleX
        const sz = 80 // asteroid half-size
        const rot = a.wobble * 0.3 // slow rotation

        ctx.save()
        ctx.translate(cx, a.y)
        ctx.rotate(rot)

        // Generate faceted polygon vertices (irregular pentagon/hexagon)
        const sides = 6
        const verts = []
        for (let i = 0; i < sides; i++) {
          const angle = (Math.PI * 2 * i) / sides - Math.PI / 2
          const r = sz * (0.8 + ((Math.sin(i * 137.5 + a.x) * 0.5 + 0.5) * 0.4))
          verts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r })
        }

        // Main body — dark faceted shape
        ctx.beginPath()
        ctx.moveTo(verts[0].x, verts[0].y)
        for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y)
        ctx.closePath()
        ctx.fillStyle = 'rgba(255,255,255,0.12)'
        ctx.fill()

        // Facet lines from center to create crystal look
        for (let i = 0; i < verts.length; i++) {
          const next = verts[(i + 1) % verts.length]
          const midX = (verts[i].x + next.x) / 2
          const midY = (verts[i].y + next.y) / 2
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(midX * 0.6, midY * 0.6)
          ctx.strokeStyle = 'rgba(255,255,255,0.08)'
          ctx.lineWidth = 1
          ctx.stroke()
        }

        // Light facets (top-left faces brighter)
        for (let i = 0; i < verts.length; i++) {
          const next = verts[(i + 1) % verts.length]
          if (verts[i].y < 0 && verts[i].x < 0) {
            ctx.beginPath()
            ctx.moveTo(0, 0)
            ctx.lineTo(verts[i].x, verts[i].y)
            ctx.lineTo(next.x, next.y)
            ctx.closePath()
            ctx.fillStyle = 'rgba(255,255,255,0.06)'
            ctx.fill()
          }
        }

        // Highlight edge (top-left shine)
        ctx.beginPath()
        ctx.arc(-sz * 0.25, -sz * 0.25, sz * 0.35, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.04)'
        ctx.fill()

        ctx.restore()

        // Question text on the asteroid (not rotated)
        ctx.font = '14px "Press Start 2P", monospace'
        ctx.fillStyle = '#fff'
        ctx.fillText(a.q, cx, a.y)
      }

      // Update & draw particles
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.08 // gravity
        p.age++
        if (p.age >= p.life) {
          g.particles.splice(i, 1)
          continue
        }
        const alpha = 1 - p.age / p.life
        ctx.fillStyle = p.color || c.accent
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }

      // HUD (only when playing)
      if (g.gameState === 'playing') {
        // Planet name — top center
        ctx.textAlign = 'center'
        ctx.fillStyle = 'rgba(255,255,255,0.3)'
        ctx.font = '10px "Press Start 2P", monospace'
        ctx.fillText(planet.name, W / 2, 28)

        // Lives — pixel hearts, centered below planet name
        const heartGap = 28
        const heartsW = (MAX_LIVES - 1) * heartGap
        for (let i = 0; i < MAX_LIVES; i++) {
          const hx = W / 2 - heartsW / 2 + i * heartGap
          const hy = 46
          const hs = 5 // half-size of each heart lobe
          ctx.fillStyle = i < g.lives ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.1)'
          ctx.beginPath()
          // Pixel heart: two circles on top + triangle bottom
          ctx.arc(hx - hs, hy - hs, hs, Math.PI, 0)
          ctx.arc(hx + hs, hy - hs, hs, Math.PI, 0)
          ctx.lineTo(hx + hs * 2, hy - hs)
          ctx.lineTo(hx, hy + hs * 1.6)
          ctx.lineTo(hx - hs * 2, hy - hs)
          ctx.fill()
        }
      }

      // Draw fade overlay for level transition
      if (fadeAlpha > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`
        ctx.fillRect(0, 0, W, H)
      }

      t++
      frame = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [totalLevels])

  // Handle answer input
  function handleSubmit(e) {
    e.preventDefault()
    const g = gameRef.current
    if (!g || g.gameState !== 'playing') return
    if (!input.trim()) return

    const normalizedInput = normalize(input)
    const match = g.asteroids.find((a) => a.alive && normalize(a.a) === normalizedInput)

    if (match) {
      match.alive = false
      // Explosion particles
      for (let i = 0; i < 16; i++) {
        const angle = (Math.PI * 2 * i) / 16
        g.particles.push({
          x: match.x, y: match.y,
          vx: Math.cos(angle) * (2 + Math.random() * 2),
          vy: Math.sin(angle) * (2 + Math.random() * 2),
          life: 30 + Math.random() * 20,
          age: 0,
          color: g.colors.accent,
        })
      }
    }

    setInput('')
  }

  const playing = gameState === 'playing'

  return (
    <div className="gv-wrapper">
      <div className="gv-scanlines" />
      <canvas ref={canvasRef} className="gv-canvas" />

      {playing && (
        <>
          <form className="gv-input-area" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              className="gv-input"
              type="text"
              inputMode="none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              readOnly={isMobile}
              placeholder="TYPE ANSWER..."
              autoComplete="off"
              autoFocus={!isMobile}
            />
          </form>
          {isMobile && (
            <div className="gv-numpad">
              {['1','2','3','4','5','6','7','8','9','−','0','⌫'].map(k => (
                <button key={k} className="gv-numpad-btn" type="button" onPointerDown={(e) => {
                  e.preventDefault()
                  if (k === '⌫') setInput(prev => prev.slice(0, -1))
                  else if (k === '−') setInput(prev => prev + '-')
                  else setInput(prev => prev + k)
                }}>{k}</button>
              ))}
              {['/','r',' ','x','.','↵'].map(k => (
                <button key={k} className={`gv-numpad-btn ${k === '↵' ? 'gv-numpad-enter' : ''}`} type="button" onPointerDown={(e) => {
                  e.preventDefault()
                  if (k === '↵') handleSubmit(e)
                  else if (k === ' ') setInput(prev => prev + ' ')
                  else setInput(prev => prev + k)
                }}>{k === ' ' ? '␣' : k === '↵' ? 'GO' : k}</button>
              ))}
            </div>
          )}
        </>
      )}

      {gameState === 'ready' && (
        <div className="gv-popup-wrap">
          <div className="gv-popup">
            <div className="gv-popup-title">GRAVITY</div>
            <div className="gv-popup-rules">
              <p>ASTEROIDS ARE FALLING TOWARD THE PLANET.</p>
              <p>TYPE THE ANSWER TO DESTROY THEM.</p>
              <p>IF AN ASTEROID HITS THE SURFACE, YOU LOSE A LIFE.</p>
              <p>LOSE ALL 3 LIVES AND IT'S OVER.</p>
            </div>
            <button className="gv-screen-btn" onClick={startGame}>START</button>
          </div>
        </div>
      )}

      {gameState === 'gameOver' && !onRoundComplete && (
        <div className="gv-overlay">
          <div className="gv-screen-title">GAME OVER</div>
          <p className="gv-screen-sub">MADE IT TO {PLANETS[level % PLANETS.length].name}</p>
          <button className="gv-screen-btn" onClick={startGame}>TRY AGAIN</button>
        </div>
      )}

      {gameState === 'won' && !onRoundComplete && (
        <div className="gv-overlay">
          <div className="gv-screen-title">YOU WIN</div>
          <p className="gv-screen-sub">ALL PLANETS CLEARED</p>
          <button className="gv-screen-btn" onClick={startGame}>PLAY AGAIN</button>
        </div>
      )}

    </div>
  )
}
