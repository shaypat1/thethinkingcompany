import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './games.css'

const GRID_COLS = 8
const GRID_ROWS = 5
const TOTAL = GRID_COLS * GRID_ROWS
const START_COUNT = 4

function randomPositions(count) {
  const all = Array.from({ length: TOTAL }, (_, i) => i)
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]]
  }
  return all.slice(0, count)
}

export default function ChimpTestRenderer() {
  const [level, setLevel] = useState(START_COUNT)
  const [positions, setPositions] = useState([])
  const [phase, setPhase] = useState('start')
  const [clickOrder, setClickOrder] = useState([])
  const [strikes, setStrikes] = useState(0)
  const timeoutRef = useRef(null)

  function startRound(n) {
    setPositions(randomPositions(n))
    setClickOrder([])
    setPhase('flash')
  }

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  function handleCellClick(cellIdx) {
    if (phase !== 'flash' && phase !== 'hidden') return
    if (phase === 'flash') setPhase('hidden')

    const expected = clickOrder.length
    if (positions[expected] !== cellIdx) {
      const s = strikes + 1
      if (s >= 3) { setPhase('done') } else {
        setStrikes(s)
        setPhase('wrong')
        timeoutRef.current = setTimeout(() => startRound(level), 800)
      }
      return
    }

    const newOrder = [...clickOrder, cellIdx]
    setClickOrder(newOrder)
    if (newOrder.length === positions.length) {
      const next = level + 1
      setLevel(next)
      timeoutRef.current = setTimeout(() => startRound(next), 400)
    }
  }

  const posMap = {}
  positions.forEach((p, i) => { posMap[p] = i + 1 })

  if (phase === 'start') {
    return (
      <div className="game-hero">
        <div className="game-start">
          <div className="game-start-icon">🐒</div>
          <h1>Chimp Test</h1>
          <p>Numbers flash on the grid. Click them in ascending order from memory. Can you beat a chimp?</p>
          <button className="game-btn" onClick={() => startRound(level)}>Start</button>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="game-hero">
        <div className="game-over">
          <div className="game-over-score">{level}</div>
          <div className="game-over-label">numbers</div>
          <div className="game-over-detail">Chimps average about 8</div>
          <Link to="/" className="game-over-back">Back to Track</Link>
        </div>
      </div>
    )
  }

  const showNumbers = phase === 'flash'
  return (
    <div className="game-hero">
      <div className="game-info">Level {level} · Can you beat a chimp?</div>
      <div className="game-grid" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`, width: '100%', maxWidth: 520 }}>
        {Array.from({ length: TOTAL }).map((_, i) => {
          const isPos = posMap[i] !== undefined
          const isClicked = clickOrder.includes(i)
          let cls = 'game-cell'
          if (isPos && showNumbers) cls += ' active'
          if (isClicked) cls += ' correct'

          return (
            <div key={i} className={cls}
              onClick={() => isPos && !isClicked && handleCellClick(i)}
              style={{ cursor: isPos && !isClicked ? 'pointer' : 'default', fontSize: '0.75rem' }}>
              {isPos && showNumbers && !isClicked ? posMap[i] : ''}
            </div>
          )
        })}
      </div>
      {phase === 'wrong' && <div className="game-feedback" style={{ marginTop: '1rem' }}>Wrong! Try again...</div>}
    </div>
  )
}
