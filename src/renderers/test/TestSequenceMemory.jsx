import { useState, useEffect, useRef, useCallback } from 'react'
import './TestSequenceMemory.css'

const GRID = 3
const START_LEN = 3
const FLASH_MS = 500
const GAP_MS = 200

export default function TestSequenceMemory({ onComplete, autoStart }) {
  const [level, setLevel] = useState(START_LEN)
  const [sequence, setSequence] = useState([])
  const [phase, setPhase] = useState(autoStart ? 'intro' : 'start')
  const [showIdx, setShowIdx] = useState(-1)
  const [inputIdx, setInputIdx] = useState(0)
  const [strikes, setStrikes] = useState(0)
  const [flashCell, setFlashCell] = useState(-1)
  const [correctCells, setCorrectCells] = useState([])
  const [wrongCell, setWrongCell] = useState(-1)
  const timeoutRef = useRef(null)
  const flashRef = useRef(null)
  const calledBack = useRef(false)

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
    setCorrectCells([])
    setWrongCell(-1)
    playSequence(seq)
  }

  useEffect(() => () => clearTimeout(timeoutRef.current), [])


  function handleCellClick(cellIdx) {
    if (phase !== 'input') return
    if (cellIdx === sequence[inputIdx]) {
      setCorrectCells(prev => [...prev, cellIdx])
      setFlashCell(cellIdx)
      clearTimeout(flashRef.current)
      flashRef.current = setTimeout(() => setFlashCell(-1), 200)
      const next = inputIdx + 1
      if (next >= sequence.length) {
        const nextLevel = level + 1
        setLevel(nextLevel)
        timeoutRef.current = setTimeout(() => startRound(nextLevel), 400)
      } else { setInputIdx(next) }
    } else {
      setWrongCell(cellIdx)
      setPhase('done')
      if (onComplete && !calledBack.current) {
        calledBack.current = true
        const completed = level - START_LEN
        setTimeout(() => onComplete(completed), 1200)
      }
    }
  }

  const displayLevel = level - START_LEN + 1

  if (phase === 'intro') {
    return (
      <div className="sq-wrapper">
        <div className="sq-scanlines" />
        <div className="sq-content">
          <h1 className="sq-title">SEQUENCES</h1>
          <div className="sq-grid">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="sq-cell" />
            ))}
          </div>
          <div className="sq-popup-wrap">
            <div className="sq-popup">
              <div className="sq-popup-title">SEQUENCE</div>
              <div className="sq-popup-rules">
                <p>TILES WILL LIGHT UP IN ORDER.</p>
                <p>REPEAT THE SEQUENCE FROM MEMORY.</p>
                <p>ONE MISTAKE AND IT'S OVER.</p>
              </div>
              <button className="sq-start-btn" onClick={() => startRound(level)}>START GAME</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
    if (onComplete) {
      return (
        <div className="sq-wrapper">
          <div className="sq-scanlines" />
          <div className="sq-content">
            <h1 className="sq-title">SEQUENCES</h1>
            <div className="sq-grid">
              {Array.from({ length: 9 }).map((_, i) => {
                let cls = 'sq-cell'
                if (correctCells.includes(i)) cls += ' correct'
                if (i === wrongCell) cls += ' wrong'
                return <div key={i} className={cls} />
              })}
            </div>
          </div>
        </div>
      )
    }
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
            const isLit = showIdx === i
            const isFlash = flashCell === i
            let cls = 'sq-cell'
            if (isLit) cls += ' lit'
            else if (isFlash) cls += ' correct'
            if (i === wrongCell) cls += ' wrong'
            return (
              <div
                key={i}
                className={cls}
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
