import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './games.css'

const START_GRID = 3
const START_TILES = 3
const FLASH_MS = 2000

function pickTiles(gridSize, count) {
  const total = gridSize * gridSize
  const all = Array.from({ length: total }, (_, i) => i)
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]]
  }
  return new Set(all.slice(0, count))
}

export default function VisualMemoryRenderer() {
  const [level, setLevel] = useState(1)
  const [gridSize, setGridSize] = useState(START_GRID)
  const [tileCount, setTileCount] = useState(START_TILES)
  const [targets, setTargets] = useState(new Set())
  const [phase, setPhase] = useState('start')
  const [selected, setSelected] = useState(new Set())
  const [strikes, setStrikes] = useState(0)
  const timeoutRef = useRef(null)

  function startRound(gs, tc) {
    const t = pickTiles(gs, tc)
    setTargets(t)
    setSelected(new Set())
    setPhase('flash')
    timeoutRef.current = setTimeout(() => setPhase('input'), FLASH_MS)
  }

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  function handleCellClick(i) {
    if (phase !== 'input' || selected.has(i)) return
    const newSelected = new Set(selected)
    newSelected.add(i)
    setSelected(newSelected)

    if (!targets.has(i)) {
      const s = strikes + 1
      if (s >= 3) { setPhase('done') } else {
        setStrikes(s)
        setPhase('result')
        timeoutRef.current = setTimeout(() => startRound(gridSize, tileCount), 1000)
      }
      return
    }

    const found = [...newSelected].filter(s => targets.has(s)).length
    if (found === targets.size) {
      const nextLevel = level + 1
      const nextTiles = tileCount + 1
      const nextGrid = nextTiles > gridSize * gridSize * 0.5 ? gridSize + 1 : gridSize
      setLevel(nextLevel); setGridSize(nextGrid); setTileCount(nextTiles)
      setPhase('result')
      timeoutRef.current = setTimeout(() => startRound(nextGrid, nextTiles), 600)
    }
  }

  if (phase === 'start') {
    return (
      <div className="game-hero">
        <div className="game-start">
          <div className="game-start-icon">👁️</div>
          <h1>Visual Memory</h1>
          <p>Memorize which tiles light up, then click them from memory.</p>
          <button className="game-btn" onClick={() => startRound(gridSize, tileCount)}>Start</button>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="game-hero">
        <div className="game-over">
          <div className="game-over-score">Level {level}</div>
          <div className="game-over-label">{tileCount} tiles · {gridSize}×{gridSize} grid</div>
          <Link to="/" className="game-over-back">Back to Track</Link>
        </div>
      </div>
    )
  }

  const cellSize = Math.max(40, Math.min(60, 300 / gridSize))
  const remaining = tileCount - [...selected].filter(s => targets.has(s)).length

  return (
    <div className="game-hero">
      <div className="game-badge" style={{ marginBottom: '1rem' }}>Level {level}</div>
      <div className="game-grid" style={{
        gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
        width: cellSize * gridSize + (gridSize - 1) * 6,
      }}>
        {Array.from({ length: gridSize * gridSize }).map((_, i) => {
          const isTarget = targets.has(i)
          const isSel = selected.has(i)
          let cls = 'game-cell'
          if (phase === 'flash' && isTarget) cls += ' active'
          if (phase === 'input' && isSel && isTarget) cls += ' correct'
          if (phase === 'input' && isSel && !isTarget) cls += ' wrong'
          if (phase === 'result' && isTarget) cls += ' active'

          return <div key={i} className={cls} onClick={() => handleCellClick(i)}
            style={{ width: cellSize, height: cellSize, cursor: phase === 'input' ? 'pointer' : 'default' }} />
        })}
      </div>
      <div className="game-feedback" style={{ marginTop: '1rem' }}>
        {phase === 'flash' && 'Memorize...'}
        {phase === 'input' && `Find ${remaining} more`}
        {phase === 'result' && (strikes > 0 ? 'Missed!' : 'Nice!')}
      </div>
    </div>
  )
}
