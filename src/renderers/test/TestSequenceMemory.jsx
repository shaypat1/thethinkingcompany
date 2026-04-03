import { useState, useEffect, useRef, useCallback } from 'react'
import './TestSequenceMemory.css'

const GRID = 3
const START_LEN = 3
const FLASH_MS = 500
const GAP_MS = 200

export default function TestSequenceMemory() {
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
      setPhase('done')
    }
  }

  const displayLevel = level - START_LEN + 1

  if (phase === 'start') {
    return (
      <div className="sq-wrapper">
        <div className="sq-scanlines" />
        <div className="sq-content">
          <h1 className="sq-title">SEQUENCES</h1>
          <div className="sq-rules">
            <p>WATCH THE PATTERN. REPLAY IT.</p>
          </div>
          <div className="sq-grid">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="sq-cell" />
            ))}
          </div>
          <button className="sq-start-btn" onClick={() => startRound(level)}>START</button>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="sq-wrapper">
        <div className="sq-scanlines" />
        <div className="sq-content">
          <h1 className="sq-title">SEQUENCES</h1>
          <div className="sq-score">{displayLevel - 1}</div>
          <div className="sq-score-label">LEVELS COMPLETED</div>
          <button className="sq-start-btn" onClick={() => { setLevel(START_LEN); setStrikes(0); setPhase('start') }}>RETRY</button>
        </div>
      </div>
    )
  }

  return (
    <div className="sq-wrapper">
      <div className="sq-scanlines" />
      <div className="sq-content">
        <h1 className="sq-title">SEQUENCES</h1>
        <div className="sq-level">LEVEL {displayLevel}</div>
        <div className="sq-grid">
          {Array.from({ length: GRID * GRID }).map((_, i) => {
            const isLit = showIdx === i || flashCell === i
            return (
              <div
                key={i}
                className={`sq-cell ${isLit ? 'lit' : ''}`}
                onClick={() => handleCellClick(i)}
                style={{ cursor: phase === 'input' ? 'pointer' : 'default' }}
              />
            )
          })}
        </div>
        <div className="sq-status">
          {phase === 'showing' && 'WATCH...'}
          {phase === 'input' && 'YOUR TURN'}
        </div>
      </div>
    </div>
  )
}
