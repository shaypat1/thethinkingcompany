import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import './games.css'

const DEFAULT_TIME_LIMIT = 15

function normalize(str) {
  return str.replace(/,/g, '').replace(/\s+/g, '').toLowerCase()
}

export default function FlashcardRenderer({ questions, timeLimit = DEFAULT_TIME_LIMIT }) {
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [checked, setChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [results, setResults] = useState([])
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  const done = index >= questions.length
  const current = questions[index]
  const correctCount = results.filter(Boolean).length

  const handleTimeUp = useCallback(() => {
    setIsCorrect(false)
    setChecked(true)
  }, [])

  useEffect(() => {
    if (done || checked) { clearInterval(timerRef.current); return }
    setTimeLeft(timeLimit)
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current); handleTimeUp(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [index, checked, done, handleTimeUp, timeLimit])

  useEffect(() => {
    if (!done && !checked && inputRef.current) inputRef.current.focus()
  }, [index, checked, done])

  function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim()) return
    clearInterval(timerRef.current)
    const correct = normalize(input) === normalize(current.a)
    setIsCorrect(correct)
    setChecked(true)
  }

  function handleNext() {
    setResults([...results, isCorrect])
    setInput('')
    setChecked(false)
    setIsCorrect(false)
    setIndex(index + 1)
  }

  if (done) {
    return (
      <div className="game-hero">
        <div className="game-over">
          <div className="game-over-score">{correctCount}/{questions.length}</div>
          <div className="game-over-label">correct</div>
          <div style={{ display: 'flex', gap: 6, margin: '1rem 0' }}>
            {results.map((r, i) => (
              <span key={i} style={{
                width: 10, height: 10, borderRadius: '50%',
                background: r ? '#fff' : 'rgba(255,255,255,0.25)',
              }} />
            ))}
          </div>
          <Link to="/" className="game-over-back">Back to Track</Link>
        </div>
      </div>
    )
  }

  const timerFraction = timeLeft / timeLimit
  const urgent = timeLeft <= 5

  return (
    <div className="game-hero">
      {/* Progress bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: 'rgba(255,255,255,0.15)' }}>
        <div style={{ height: '100%', width: `${(index / questions.length) * 100}%`, background: '#fff', transition: 'width 0.3s' }} />
      </div>

      <div className="game-info">{index + 1} / {questions.length}</div>

      {/* Timer ring */}
      <div style={{ position: 'relative', width: 52, height: 52, marginBottom: '1.5rem' }}>
        <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />
          <circle cx="18" cy="18" r="15.5" fill="none"
            stroke={urgent ? 'rgba(255,255,255,0.4)' : '#fff'} strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={`${timerFraction * 97.4} 97.4`} style={{ transition: 'stroke-dasharray 0.3s linear' }} />
        </svg>
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 600, opacity: urgent ? 0.5 : 1 }}>
          {timeLeft}
        </span>
      </div>

      <form onSubmit={checked ? (e) => { e.preventDefault(); handleNext() } : handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>

        <div className="game-stimulus" style={{ fontSize: '2.5rem' }}>{current.q}</div>

        <input
          ref={inputRef}
          className="game-input"
          type="text"
          value={checked ? (isCorrect ? input : current.a) : input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Your answer"
          autoComplete="off"
          readOnly={checked}
        />

        <div className="game-feedback">
          {checked && !isCorrect && timeLeft === 0 && !input.trim() && "Time's up!"}
          {checked && !isCorrect && (timeLeft > 0 || input.trim()) && `You said: ${input}`}
          {checked && isCorrect && 'Correct!'}
        </div>

        <button className="game-btn" type="submit">
          {!checked ? 'Check' : (index < questions.length - 1 ? 'Next' : 'See Results')}
        </button>
      </form>
    </div>
  )
}
