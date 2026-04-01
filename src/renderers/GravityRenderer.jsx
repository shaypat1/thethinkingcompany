import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import './GravityRenderer.css'

const PLANETS = [
  { name: 'Mercury', color: '#a0a0a0', glow: '#c0c0c0' },
  { name: 'Venus', color: '#e8c060', glow: '#f0d880' },
  { name: 'Earth', color: '#4090d0', glow: '#60b0f0' },
  { name: 'Mars', color: '#d06030', glow: '#e08050' },
  { name: 'Jupiter', color: '#d0a060', glow: '#e0c080' },
  { name: 'Saturn', color: '#c8b080', glow: '#e0d0a0' },
]

const QUESTIONS_PER_LEVEL = 4
const BASE_SPEED = 0.4
const SPAWN_INTERVAL_BASE = 120 // frames between spawns
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
    g.spawnTimer = 0
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
      const planetY = H - 60
      const planet = PLANETS[g.level % PLANETS.length]

      // Clear
      ctx.clearRect(0, 0, W, H)

      // Stars
      g.stars.forEach((s) => {
        const twinkle = 0.5 + Math.sin(t * 0.02 + s.x * 100) * 0.5
        ctx.fillStyle = `rgba(${c.text === '#1a1a1a' ? '180,180,180' : '255,255,255'}, ${s.alpha * twinkle})`
        ctx.beginPath()
        ctx.arc(s.x * W, s.y * H * 0.85, s.size, 0, Math.PI * 2)
        ctx.fill()
      })

      // Planet surface
      const planetGrad = ctx.createRadialGradient(W / 2, H + 80, 10, W / 2, H + 80, 300)
      planetGrad.addColorStop(0, planet.glow)
      planetGrad.addColorStop(0.5, planet.color)
      planetGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = planetGrad
      ctx.beginPath()
      ctx.ellipse(W / 2, H + 80, W * 0.7, 180, 0, 0, Math.PI * 2)
      ctx.fill()

      // Planet surface line
      ctx.strokeStyle = planet.glow
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.4
      ctx.beginPath()
      ctx.ellipse(W / 2, H + 80, W * 0.65, 160, 0, Math.PI, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1

      // Game logic (only when playing)
      if (g.gameState === 'playing') {
        // Spawn asteroids from queue
        g.spawnTimer++
        const spawnInterval = Math.max(40, SPAWN_INTERVAL_BASE - g.level * 15)
        if (g.spawnQueue.length > 0 && g.spawnTimer >= spawnInterval) {
          const q = g.spawnQueue.shift()
          const asteroidW = Math.max(80, ctx.measureText(q.q).width + 40)
          g.asteroids.push({
            x: Math.random() * (W - asteroidW - 40) + 20 + asteroidW / 2,
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
        if (allDone && g.gameState === 'playing' && g.lives > 0) {
          if (g.level + 1 >= totalLevels) {
            setGameState('won')
          } else {
            setGameState('levelComplete')
          }
        }
      }

      // Draw asteroids
      ctx.font = '600 14px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (const a of g.asteroids) {
        if (!a.alive) continue
        const wobbleX = Math.sin(a.wobble) * 2

        // Asteroid body
        ctx.fillStyle = c.border
        ctx.beginPath()
        ctx.roundRect(a.x - a.width / 2 + wobbleX, a.y - 18, a.width, 36, 18)
        ctx.fill()

        // Asteroid border
        ctx.strokeStyle = c.muted
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.roundRect(a.x - a.width / 2 + wobbleX, a.y - 18, a.width, 36, 18)
        ctx.stroke()

        // Question text
        ctx.fillStyle = c.text
        ctx.fillText(a.q, a.x + wobbleX, a.y)
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
