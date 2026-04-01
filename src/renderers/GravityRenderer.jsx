import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import './GravityRenderer.css'

const PLANETS = [
  { name: 'Mercury', base: '#a0a0a0', light: '#c8c8c8', dark: '#707070', glow: '#c0c0c0', detail: 'craters' },
  { name: 'Venus', base: '#e8c060', light: '#f0d880', dark: '#c09830', glow: '#f0d880', detail: 'clouds' },
  { name: 'Earth', base: '#4090d0', light: '#60b0f0', dark: '#2060a0', glow: '#60b0f0', detail: 'earth' },
  { name: 'Mars', base: '#d06030', light: '#e08050', dark: '#a04020', glow: '#e08050', detail: 'craters' },
  { name: 'Jupiter', base: '#d0a060', light: '#e0c080', dark: '#a07830', glow: '#e0c080', detail: 'bands' },
  { name: 'Saturn', base: '#c8b080', light: '#e0d0a0', dark: '#a08850', glow: '#e0d0a0', detail: 'rings' },
]

const QUESTIONS_PER_LEVEL = 4
const BASE_SPEED = 2.5
const SPAWN_INTERVAL_BASE = 60 // frames between spawns
const MAX_LIVES = 3

function normalize(str) {
  return str.replace(/,/g, '').replace(/\s+/g, '').toLowerCase()
}

function getThemeColors() {
  const s = getComputedStyle(document.documentElement)
  return {
    bg: s.getPropertyValue('--bg').trim(),
    text: s.getPropertyValue('--text').trim(),
    muted: s.getPropertyValue('--text-muted').trim(),
    accent: s.getPropertyValue('--accent').trim(),
    border: s.getPropertyValue('--border').trim(),
  }
}

export default function GravityRenderer({ questions }) {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const inputRef = useRef(null)
  const [input, setInput] = useState('')
  const [gameState, setGameState] = useState('ready') // ready | playing | levelComplete | gameOver | won
  const [level, setLevel] = useState(0)
  const [lives, setLives] = useState(MAX_LIVES)
  const [score, setScore] = useState(0)

  const totalLevels = Math.ceil(questions.length / QUESTIONS_PER_LEVEL)

  // Initialize game state ref for canvas loop access
  useEffect(() => {
    gameRef.current = {
      asteroids: [],
      particles: [],
      stars: [],
      spawnQueue: [],
      spawnTimer: 0,
      zoomStart: 0,
      level,
      lives,
      score,
      gameState,
      colors: getThemeColors(),
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

  // Refresh theme colors when they might change
  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.colors = getThemeColors()
    }
  })

  const startLevel = useCallback((lvl) => {
    const g = gameRef.current
    if (!g) return
    const start = lvl * QUESTIONS_PER_LEVEL
    const end = Math.min(start + QUESTIONS_PER_LEVEL, questions.length)
    g.spawnQueue = questions.slice(start, end).map((q) => ({ ...q }))
    g.asteroids = []
    g.particles = []
    g.spawnTimer = SPAWN_INTERVAL_BASE // first asteroid drops immediately
    g.zoomStart = 0
  }, [questions])

  const startGame = useCallback(() => {
    setLevel(0)
    setLives(MAX_LIVES)
    setScore(0)
    setGameState('playing')
    startLevel(0)
    if (inputRef.current) inputRef.current.focus()
  }, [startLevel])

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

      // Zoom transition
      const zooming = g.zoomStart > 0
      let zoomProgress = 0
      if (zooming) {
        zoomProgress = Math.min((t - g.zoomStart) / 60, 1) // 60 frames = ~1s
        const ease = zoomProgress * zoomProgress * (3 - 2 * zoomProgress)
        const scale = 1 + ease * 4
        const nextPlanetX = W * 0.82
        const nextPlanetY = H * 0.15
        ctx.save()
        ctx.translate(
          nextPlanetX - (nextPlanetX - W / 2) * (1 - ease),
          nextPlanetY - (nextPlanetY - H / 2) * (1 - ease)
        )
        ctx.scale(scale, scale)
        ctx.translate(-nextPlanetX, -nextPlanetY)
        if (zoomProgress >= 1 && g.zoomStart > 0) {
          g.zoomStart = 0
          setGameState('levelComplete')
        }
      }

      // Stars
      g.stars.forEach((s) => {
        const twinkle = 0.5 + Math.sin(t * 0.02 + s.x * 100) * 0.5
        ctx.fillStyle = `rgba(${c.text === '#1a1a1a' ? '180,180,180' : '255,255,255'}, ${s.alpha * twinkle})`
        ctx.beginPath()
        ctx.arc(s.x * W, s.y * H * 0.85, s.size, 0, Math.PI * 2)
        ctx.fill()
      })

      // Next planet in background (small sphere in sky)
      if (g.level + 1 < totalLevels) {
        const nextP = PLANETS[(g.level + 1) % PLANETS.length]
        const npX = W * 0.82
        const npY = H * 0.15
        const npR = 25
        const npGrad = ctx.createRadialGradient(npX - 5, npY - 5, 2, npX, npY, npR)
        npGrad.addColorStop(0, nextP.light)
        npGrad.addColorStop(0.6, nextP.base)
        npGrad.addColorStop(1, nextP.dark)
        ctx.fillStyle = npGrad
        ctx.beginPath()
        ctx.arc(npX, npY, npR, 0, Math.PI * 2)
        ctx.fill()
        // Atmosphere glow
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
        ctx.fillStyle = '#3a8a3a'
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

      // Game logic (only when playing)
      if (g.gameState === 'playing') {
        // Spawn asteroids from queue
        g.spawnTimer++
        const spawnInterval = Math.max(40, SPAWN_INTERVAL_BASE - g.level * 15)
        if (g.spawnQueue.length > 0 && g.spawnTimer >= spawnInterval) {
          const q = g.spawnQueue.shift()
          const asteroidW = 90
          g.asteroids.push({
            x: Math.random() * (W - 120) + 60,
            y: -30,
            vy: BASE_SPEED * (1 + g.level * 0.18),
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
              setGameState('gameOver')
            }
          }
        }

        // Check level complete
        const allDone = g.spawnQueue.length === 0 && g.asteroids.every((a) => !a.alive)
        if (allDone && g.gameState === 'playing' && g.lives > 0 && !g.zoomStart) {
          if (g.level + 1 >= totalLevels) {
            setGameState('won')
          } else {
            g.zoomStart = t // start zoom transition
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
        const sz = 38 // asteroid half-size
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
        ctx.fillStyle = c.border
        ctx.fill()

        // Facet lines from center to create crystal look
        for (let i = 0; i < verts.length; i++) {
          const next = verts[(i + 1) % verts.length]
          const midX = (verts[i].x + next.x) / 2
          const midY = (verts[i].y + next.y) / 2
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(midX * 0.6, midY * 0.6)
          ctx.strokeStyle = c.muted + '40'
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
            ctx.fillStyle = c.text + '12'
            ctx.fill()
          }
        }

        // Highlight edge (top-left shine)
        ctx.beginPath()
        ctx.arc(-sz * 0.25, -sz * 0.25, sz * 0.35, 0, Math.PI * 2)
        ctx.fillStyle = c.text + '08'
        ctx.fill()

        ctx.restore()

        // Question text on the asteroid (not rotated)
        ctx.font = '700 16px Inter, system-ui, sans-serif'
        ctx.fillStyle = c.text
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
        ctx.fillStyle = c.muted
        ctx.font = '500 12px Inter, system-ui, sans-serif'
        ctx.fillText(planet.name, W / 2, 24)

        // Lives — centered below planet name
        const gap = 16
        const totalW = (MAX_LIVES - 1) * gap
        for (let i = 0; i < MAX_LIVES; i++) {
          ctx.fillStyle = i < g.lives ? c.accent : c.border
          ctx.beginPath()
          ctx.arc(W / 2 - totalW / 2 + i * gap, 44, 5, 0, Math.PI * 2)
          ctx.fill()
        }

        // Score — top right
        ctx.fillStyle = c.text
        ctx.font = '600 14px Inter, system-ui, sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText(`${g.score}`, W - 20, 28)
      }

      if (zooming) ctx.restore()

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
      setScore((s) => s + 100 + level * 25)
      g.score += 100 + level * 25
    }

    setInput('')
  }

  // Advance to next level
  function handleNextLevel() {
    const next = level + 1
    setLevel(next)
    setGameState('playing')
    startLevel(next)
    if (inputRef.current) inputRef.current.focus()
  }

  const playing = gameState === 'playing'

  return (
    <div className="gv-wrapper">
      <Link to="/" className="gv-exit">Exit</Link>
      <canvas ref={canvasRef} className="gv-canvas" />

      {playing && (
        <form className="gv-input-area" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className="gv-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type answer..."
            autoComplete="off"
            autoFocus
          />
        </form>
      )}

      {gameState === 'ready' && (
        <div className="gv-overlay">
          <div className="gv-screen-title">Gravity</div>
          <p className="gv-screen-sub">Destroy the asteroids before they hit the planet.</p>
          <p className="gv-screen-sub">{totalLevels} levels / {questions.length} questions</p>
          <button className="gv-screen-btn" onClick={startGame}>Start</button>
        </div>
      )}

      {gameState === 'gameOver' && (
        <div className="gv-overlay">
          <div className="gv-screen-title">Game Over</div>
          <div className="gv-screen-score">{score}</div>
          <p className="gv-screen-sub">Made it to {PLANETS[level % PLANETS.length].name}</p>
          <button className="gv-screen-btn" onClick={startGame}>Try Again</button>
          <Link to="/" className="gv-back">Back to Track</Link>
        </div>
      )}

      {gameState === 'won' && (
        <div className="gv-overlay">
          <div className="gv-screen-title">You Win</div>
          <div className="gv-screen-score">{score}</div>
          <p className="gv-screen-sub">All planets cleared!</p>
          <button className="gv-screen-btn" onClick={startGame}>Play Again</button>
          <Link to="/" className="gv-back">Back to Track</Link>
        </div>
      )}

      {gameState === 'levelComplete' && (
        <div className="gv-overlay">
          <div className="gv-screen-title">{PLANETS[level % PLANETS.length].name} Cleared</div>
          <div className="gv-screen-score">{score}</div>
          <p className="gv-screen-sub">Next: {PLANETS[(level + 1) % PLANETS.length].name}</p>
          <button className="gv-screen-btn" onClick={handleNextLevel}>Continue</button>
        </div>
      )}
    </div>
  )
}
