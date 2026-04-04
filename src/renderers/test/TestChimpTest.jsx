import { useState, useEffect, useRef } from 'react'
import './TestChimpTest.css'

const GRID_COLS = 8
const GRID_ROWS = 5
const TOTAL = GRID_COLS * GRID_ROWS
const START_COUNT = 4
const MEMORIZE_MS = 3000
const TICK_COUNT = 15 // number of discrete steps in the timer bar

function randomPositions(count) {
  const all = Array.from({ length: TOTAL }, (_, i) => i)
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]]
  }
  return all.slice(0, count)
}

export default function TestChimpTest({ onComplete, autoStart }) {
  const [level, setLevel] = useState(START_COUNT)
  const [positions, setPositions] = useState([])
  const [phase, setPhase] = useState(autoStart ? 'pending' : 'start') // start | pending | flash | hidden | done
  const [clickOrder, setClickOrder] = useState([])
  const [timerTicks, setTimerTicks] = useState(TICK_COUNT)
  const timeoutRef = useRef(null)
  const timerRef = useRef(null)
  const calledBack = useRef(false)
  const [wrongCell, setWrongCell] = useState(-1)

  function startRound(n) {
    setPositions(randomPositions(n))
    setClickOrder([])
    setTimerTicks(TICK_COUNT)
    setPhase('flash')

    // Countdown timer — tick by tick
    let ticks = TICK_COUNT
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      ticks--
      setTimerTicks(ticks)
      if (ticks <= 0) {
        clearInterval(timerRef.current)
        setPhase('hidden')
      }
    }, MEMORIZE_MS / TICK_COUNT)
  }

  useEffect(() => {
    return () => { clearTimeout(timeoutRef.current); clearInterval(timerRef.current) }
  }, [])

  // Auto-start
  useEffect(() => {
    if (autoStart && phase === 'pending') {
      startRound(level)
    }
  }, [autoStart, phase])

  function handleCellClick(cellIdx) {
    if (phase !== 'hidden') return

    const expected = clickOrder.length
    if (positions[expected] !== cellIdx) {
      setWrongCell(cellIdx)
      setPhase('done')
      if (onComplete && !calledBack.current) {
        calledBack.current = true
        const completed = level - START_COUNT
        setTimeout(() => onComplete(completed), 1200)
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
  const displayLevel = level - START_COUNT + 1

  if (phase === 'start') {
    return (
      <div className="ct-wrapper">
        <div className="ct-scanlines" />
        <div className="ct-content">
          <h1 className="ct-title">CHIMP TEST</h1>
          <div className="ct-rules">
            <p>NUMBERS FLASH. CLICK THEM IN ORDER.</p>
          </div>
          <div className="ct-grid">
            {Array.from({ length: TOTAL }).map((_, i) => (
              <div key={i} className="ct-cell" />
            ))}
          </div>
          <button className="ct-start-btn" onClick={() => startRound(level)}>START</button>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    if (onComplete) {
      return (
        <div className="ct-wrapper">
          <div className="ct-scanlines" />
          <div className="ct-content">
            <h1 className="ct-title">CHIMP TEST</h1>
            <div className="ct-grid">
              {Array.from({ length: TOTAL }).map((_, i) => {
                let cls = 'ct-cell'
                if (clickOrder.includes(i)) cls += ' correct'
                if (i === wrongCell) cls += ' wrong'
                return <div key={i} className={cls} />
              })}
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className="ct-wrapper">
        <div className="ct-scanlines" />
        <div className="ct-content">
          <h1 className="ct-title">CHIMP TEST</h1>
          <div className="ct-score">{displayLevel - 1}</div>
          <div className="ct-score-label">LEVELS COMPLETED</div>
          <div className="ct-score-detail">YOU REACHED {level} NUMBERS</div>
          <button className="ct-start-btn" onClick={() => { setLevel(START_COUNT); setPhase('start') }}>RETRY</button>
        </div>
      </div>
    )
  }

  const showNumbers = phase === 'flash'

  return (
    <div className="ct-wrapper">
      <div className="ct-scanlines" />
      <div className="ct-content">
        <h1 className="ct-title">CHIMP TEST</h1>
        <div className="ct-level">LEVEL {displayLevel}</div>
        <div className="ct-grid">
          {Array.from({ length: TOTAL }).map((_, i) => {
            const isPos = posMap[i] !== undefined
            const isClicked = clickOrder.includes(i)
            let cls = 'ct-cell'
            if (isPos && showNumbers) cls += ' lit'
            if (isClicked) cls += ' correct'
            if (i === wrongCell) cls += ' wrong'

            return (
              <div key={i} className={cls}
                onClick={() => !isClicked && phase === 'hidden' && handleCellClick(i)}
                style={{ cursor: phase === 'hidden' && !isClicked ? 'pointer' : 'default' }}>
                {isPos && showNumbers && !isClicked ? posMap[i] : ''}
              </div>
            )
          })}
        </div>

        {/* Timer + status — fixed height container so grid doesn't shift */}
        <div className="ct-timer-status">
          {phase === 'flash' && (
            <div className="ct-timer-bar">
              {Array.from({ length: TICK_COUNT }).map((_, i) => (
                <div key={i} className={`ct-timer-tick ${i < timerTicks ? 'on' : 'off'}`} />
              ))}
            </div>
          )}
          <div className="ct-status">
            {phase === 'flash' && 'MEMORIZE...'}
            {phase === 'hidden' && 'YOUR TURN'}
          </div>
        </div>
      </div>
    </div>
  )
}
