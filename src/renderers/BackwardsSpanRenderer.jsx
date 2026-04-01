import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import './games.css'

const START_LEN = 3
const FLASH_MS = 800
const GAP_MS = 300

export default function BackwardsSpanRenderer() {
  const [level, setLevel] = useState(START_LEN)
  const [sequence, setSequence] = useState([])
  const [phase, setPhase] = useState('start')
  const [showIdx, setShowIdx] = useState(-1)
  const [input, setInput] = useState('')
  const [isCorrect, setIsCorrect] = useState(false)
  const [strikes, setStrikes] = useState(0)
  const inputRef = useRef(null)
  const timeoutRef = useRef(null)

  const showSequence = useCallback((seq) => {
    setPhase('showing'); setShowIdx(-1)
    let i = 0
    const step = () => {
      if (i >= seq.length) { setShowIdx(-1); setPhase('input'); setInput(''); return }
      setShowIdx(i)
      timeoutRef.current = setTimeout(() => {
        setShowIdx(-1)
        timeoutRef.current = setTimeout(() => { i++; step() }, GAP_MS)
      }, FLASH_MS)
    }
    timeoutRef.current = setTimeout(step, 500)
  }, [])

  function startRound(len) {
    const seq = Array.from({ length: len }, () => Math.floor(Math.random() * 10))
    setSequence(seq); setInput(''); setIsCorrect(false); showSequence(seq)
  }

  useEffect(() => () => clearTimeout(timeoutRef.current), [])
  useEffect(() => { if (phase === 'input' && inputRef.current) inputRef.current.focus() }, [phase])

  function handleSubmit(e) {
    e.preventDefault()
    const reversed = [...sequence].reverse().join('')
    const correct = input.trim() === reversed
    setIsCorrect(correct); setPhase('feedback')

    if (correct) {
      const nl = level + 1; setLevel(nl)
      timeoutRef.current = setTimeout(() => startRound(nl), 800)
    } else {
      const s = strikes + 1
      if (s >= 3) { timeoutRef.current = setTimeout(() => setPhase('done'), 800) }
      else { setStrikes(s); timeoutRef.current = setTimeout(() => startRound(level), 1000) }
    }
  }

  if (phase === 'start') {
    return (
      <div className="game-hero">
        <div className="game-start">
          <div className="game-start-icon">🔄</div>
          <h1>Backwards Span</h1>
          <p>Digits appear one at a time. Type them back in reverse order.</p>
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
          <div className="game-over-label">digits reversed</div>
          <Link to="/" className="game-over-back">Back to Track</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="game-hero">
      <div className="game-badge" style={{ marginBottom: '1rem' }}>{level} digits</div>

      {phase === 'showing' && (
        <div className="game-stimulus">{showIdx >= 0 ? sequence[showIdx] : ''}</div>
      )}

      {phase === 'input' && (
        <>
          <div style={{ fontSize: '1rem', opacity: 0.8, marginBottom: '1rem' }}>Type them backwards</div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <input ref={inputRef} className="game-input" type="text" value={input}
              onChange={e => setInput(e.target.value.replace(/[^0-9]/g, ''))}
              maxLength={level} autoComplete="off" placeholder={'_ '.repeat(level).trim()} />
            <button className="game-btn" type="submit">Check</button>
          </form>
        </>
      )}

      {phase === 'feedback' && (
        <>
          <div className="game-stimulus" style={{ fontSize: '2.5rem' }}>
            {[...sequence].reverse().join('  ')}
          </div>
          <div className="game-feedback">
            {isCorrect ? 'Correct!' : `Wrong — answer was ${[...sequence].reverse().join('')}`}
          </div>
        </>
      )}
    </div>
  )
}
