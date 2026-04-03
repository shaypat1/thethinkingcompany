import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import './games.css'

const GRID = 3
const START_LEN = 3
const FLASH_MS = 500
const GAP_MS = 200

export default function SequenceMemoryRenderer() {
  const [level, setLevel] = useState(START_LEN)
  const [sequence, setSequence] = useState([])
  const [phase, setPhase] = useState('start')
  const [showIdx, setShowIdx] = useState(-1)
  const [inputIdx, setInputIdx] = useState(0)
  const [strikes, setStrikes] = useState(0)
  const [flashCell, setFlashCell] = useState(-1)
  const timeoutRef = useRef(null)
  const flashRef = useRef(null)

  const playSequence = useCallback((seq) => {
    setPhase('showing')
    setShowIdx(-1)
    let i = 0
    const step = () => {
      if (i >= seq.length) { setShowIdx(-1); setPhase('input'); setInputIdx(0); return }
      setShowIdx(seq[i])
      timeoutRef.current = setTimeout(() => {
        setShowIdx(-1)
        timeoutRef.current = setTimeout(() => { i++; step() }, GAP_MS)
      }, FLASH_MS)
    }
    timeoutRef.current = setTimeout(step, 400)
  }, [])

  function startRound(len) {
    const seq = Array.from({ length: len }, () => Math.floor(Math.random() * GRID * GRID))
    setSequence(seq)
    setInputIdx(0)
    playSequence(seq)
  }

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  function handleCellClick(cellIdx) {
    if (phase !== 'input') return
    setFlashCell(cellIdx)
    clearTimeout(flashRef.current)
    flashRef.current = setTimeout(() => setFlashCell(-1), 200)
    if (cellIdx === sequence[inputIdx]) {
      const next = inputIdx + 1
      if (next >= sequence.length) {
        const nextLevel = level + 1
        setLevel(nextLevel)
        timeoutRef.current = setTimeout(() => startRound(nextLevel), 400)
      } else { setInputIdx(next) }
    } else {
      const s = strikes + 1
      if (s >= 3) { setPhase('done') } else {
        setStrikes(s)
        setPhase('wrong')
        timeoutRef.current = setTimeout(() => playSequence(sequence), 800)
      }
    }
  }

  if (phase === 'start') {
    return (
      <div className="game-hero">
        <div className="game-start">
          <div className="game-start-icon">🔲</div>
          <h1>Sequence Memory</h1>
          <p>Watch the pattern light up, then replay it. It grows by one each round.</p>
          <button className="game-btn" onClick={() => startRound(level)}>Start</button>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="game-hero">
        <div className="game-over">
          <div className="game-over-score">{level - 1}</div>
          <div className="game-over-label">sequence length</div>
          <Link to="/" className="game-over-back">Back to Track</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="game-hero">
      <div className="game-info">Level {level} · {phase === 'showing' ? 'Watch the pattern' : 'Replay it'}</div>
      <div className="game-grid" style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)`, width: 320 }}>
        {Array.from({ length: GRID * GRID }).map((_, i) => (
          <div key={i} className={`game-cell ${showIdx === i || flashCell === i ? 'active' : ''}`}
            onClick={() => handleCellClick(i)}
            style={{ width: 96, height: 96, cursor: phase === 'input' ? 'pointer' : 'default', fontSize: '1.2rem' }} />
        ))}
      </div>
      <div className="game-feedback" style={{ marginTop: '1rem' }}>
        {phase === 'showing' && 'Watch...'}
        {phase === 'input' && 'Your turn'}
        {phase === 'wrong' && 'Wrong! Watch again...'}
      </div>
    </div>
  )
}
