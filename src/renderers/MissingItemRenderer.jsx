import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './games.css'

const ALL_ITEMS = ['🍎','🍊','🍋','🍇','🍓','🍒','🥝','🍑','🥥','🍍','🫐','🍌','🥭','🍈','🌶️','🥕','🌽','🍄','🥦','🧅','🫑','🧄','🥑','🍆']
const START_COUNT = 4
const FLASH_MS = 3000

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function MissingItemRenderer() {
  const [level, setLevel] = useState(1)
  const [itemCount, setItemCount] = useState(START_COUNT)
  const [items, setItems] = useState([])
  const [missing, setMissing] = useState(null)
  const [phase, setPhase] = useState('start')
  const [score, setScore] = useState(0)
  const [strikes, setStrikes] = useState(0)
  const [chosen, setChosen] = useState(null)
  const [options, setOptions] = useState([])
  const timeoutRef = useRef(null)

  function startRound(count) {
    const picked = shuffle(ALL_ITEMS).slice(0, count)
    const missingIdx = Math.floor(Math.random() * count)
    const missingItem = picked[missingIdx]
    const distractors = shuffle(ALL_ITEMS.filter(x => !picked.includes(x))).slice(0, 2)
    setItems(picked); setMissing(missingItem)
    setOptions(shuffle([missingItem, ...distractors])); setChosen(null)
    setPhase('show')
    timeoutRef.current = setTimeout(() => setPhase('guess'), FLASH_MS)
  }

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  function handleGuess(item) {
    if (phase !== 'guess') return
    setChosen(item)
    if (item === missing) {
      setScore(s => s + 1); setPhase('feedback')
      const nl = level + 1; const nc = Math.min(itemCount + 1, ALL_ITEMS.length - 2)
      setLevel(nl); setItemCount(nc)
      timeoutRef.current = setTimeout(() => startRound(nc), 800)
    } else {
      const s = strikes + 1
      if (s >= 3) { setPhase('done') } else {
        setStrikes(s); setPhase('feedback')
        timeoutRef.current = setTimeout(() => startRound(itemCount), 1000)
      }
    }
  }

  if (phase === 'start') {
    return (
      <div className="game-hero">
        <div className="game-start">
          <div className="game-start-icon">🔍</div>
          <h1>Missing Item</h1>
          <p>A set of items appears briefly. Then one goes missing. Spot what's gone.</p>
          <button className="game-btn" onClick={() => startRound(itemCount)}>Start</button>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="game-hero">
        <div className="game-over">
          <div className="game-over-score">{score}</div>
          <div className="game-over-label">rounds completed</div>
          <div className="game-over-detail">Reached {itemCount} items</div>
          <Link to="/" className="game-over-back">Back to Track</Link>
        </div>
      </div>
    )
  }

  const shown = phase === 'show' ? items : items.filter(i => i !== missing)

  return (
    <div className="game-hero">
      <div className="game-badge" style={{ marginBottom: '1rem' }}>Level {level}</div>
      <div className="game-items">{shown.map((item, i) => <span key={i}>{item}</span>)}</div>
      {phase === 'show' && <div className="game-feedback" style={{ marginTop: '1rem' }}>Memorize...</div>}
      {(phase === 'guess' || phase === 'feedback') && (
        <>
          <div style={{ fontSize: '1rem', opacity: 0.8, margin: '1rem 0 0.75rem' }}>Which one is missing?</div>
          <div className="game-options">
            {options.map((opt, i) => {
              let cls = 'game-option'
              if (chosen === opt && opt === missing) cls += ' correct'
              if (chosen === opt && opt !== missing) cls += ' wrong'
              return <div key={i} className={cls} onClick={() => handleGuess(opt)}>{opt}</div>
            })}
          </div>
          {phase === 'feedback' && <div className="game-feedback" style={{ marginTop: '0.75rem' }}>
            {chosen === missing ? 'Correct!' : `It was ${missing}`}
          </div>}
        </>
      )}
    </div>
  )
}
