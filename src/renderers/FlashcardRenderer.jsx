import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import './FlashcardRenderer.css'

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

  // Timer countdown
  useEffect(() => {
    if (done || checked) {
      clearInterval(timerRef.current)
      return
    }
    setTimeLeft(timeLimit)
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          handleTimeUp()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [index, checked, done, handleTimeUp])

  useEffect(() => {
    if (!done && !checked && inputRef.current) {
      inputRef.current.focus()
    }
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
      <div className="fc-summary">
        <div className="fc-summary-score">{correctCount}/{questions.length}</div>
        <p className="fc-summary-label">correct</p>
        <div className="fc-summary-bar">
          {results.map((r, i) => (
            <span key={i} className={`fc-summary-dot ${r ? 'correct' : 'missed'}`} />
          ))}
        </div>
        <Link to="/" className="fc-back">Back to Track</Link>
      </div>
    )
  }

  const timerFraction = timeLeft / timeLimit
  const urgent = timeLeft <= 5

  return (
    <div className="fc">
      <div className="fc-progress">
        <div className="fc-progress-fill" style={{ width: `${(index / questions.length) * 100}%` }} />
      </div>
      <div className="fc-counter">{index + 1} / {questions.length}</div>

      <div className={`fc-timer ${urgent ? 'urgent' : ''}`}>
        <svg className="fc-timer-ring" viewBox="0 0 36 36">
          <circle className="fc-timer-track" cx="18" cy="18" r="15.5" />
          <circle
            className="fc-timer-fill"
            cx="18" cy="18" r="15.5"
            strokeDasharray={`${timerFraction * 97.4} 97.4`}
          />
        </svg>
        <span className="fc-timer-text">{timeLeft}</span>
      </div>

      <form className="fc-card" onSubmit={checked ? (e) => { e.preventDefault(); handleNext() } : handleSubmit}>
        <div className="fc-question">{current.q}</div>

        <div className="fc-input-row">
          <input
            ref={inputRef}
            className={`fc-input ${checked ? (isCorrect ? 'correct' : 'incorrect') : ''}`}
            type="text"
            value={checked ? (isCorrect ? input : current.a) : input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Your answer"
            autoComplete="off"
            readOnly={checked}
          />
        </div>

        <div className="fc-feedback">
          {checked && !isCorrect && timeLeft === 0 && !input.trim() && (
            <span className="fc-your-answer">Time's up!</span>
          )}
          {checked && !isCorrect && (timeLeft > 0 || input.trim()) && (
            <span className="fc-your-answer">You said: {input}</span>
          )}
          {checked && isCorrect && (
            <span className="fc-correct-label">Correct!</span>
          )}
        </div>

        <button className="fc-action-btn" type="submit">
          {!checked ? 'Check' : (index < questions.length - 1 ? 'Next' : 'See Results')}
        </button>
      </form>
    </div>
  )
}
