import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import './SpatialRenderer.css'

export default function SpatialRenderer({ questions, narrative }) {
  const [qIndex, setQIndex] = useState(0)
  const [phase, setPhase] = useState('intro')
  const [selected, setSelected] = useState(null)
  const [results, setResults] = useState([])
  const [showAnswer, setShowAnswer] = useState(false)

  const q = questions?.[qIndex]
  const total = questions?.length || 0
  const labels = q?.numOptions === 4 ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E']

  const start = useCallback(() => {
    setQIndex(0)
    setResults([])
    setSelected(null)
    setShowAnswer(false)
    setPhase('play')
  }, [])

  function pickAnswer(letter) {
    if (phase !== 'play' || selected !== null) return
    setSelected(letter)
    const correct = letter === q.answer
    setResults([...results, correct ? 'correct' : 'wrong'])
    setShowAnswer(true)

    setTimeout(() => {
      if (qIndex + 1 < total) {
        setQIndex(qIndex + 1)
        setSelected(null)
        setShowAnswer(false)
      } else {
        setPhase('complete')
      }
    }, 1800)
  }

  if (phase === 'intro') {
    return (
      <div className="sp-wrapper">
        <Link to="/" className="sp-exit">Exit</Link>
        <div className="sp-intro">
          <div className="sp-big-sym">📐</div>
          <h1 className="sp-title">Fold Challenge</h1>
          <p className="sp-narrative">{narrative}</p>
          <p className="sp-count">{total} question{total !== 1 ? 's' : ''}</p>
          <button className="sp-btn" onClick={start}>Start</button>
        </div>
      </div>
    )
  }

  if (phase === 'complete') {
    const correct = results.filter(r => r === 'correct').length
    return (
      <div className="sp-wrapper">
        <Link to="/" className="sp-exit">Exit</Link>
        <div className="sp-intro">
          <div className="sp-big-sym">✅</div>
          <h1 className="sp-title">Complete!</h1>
          <div className="sp-score">{correct}/{total}</div>
          <div className="sp-score-label">correct answers</div>
          <div className="sp-result-dots">
            {results.map((r, i) => (
              <span key={i} className={`sp-dot ${r}`}>{i + 1}</span>
            ))}
          </div>
          <Link to="/" className="sp-btn">Back to Track</Link>
        </div>
      </div>
    )
  }

  const qId = q?.id

  return (
    <div className="sp-wrapper">
      <Link to="/" className="sp-exit">Exit</Link>

      <div className="sp-progress">
        <div className="sp-progress-fill" style={{ width: `${(qIndex / total) * 100}%` }} />
      </div>

      <div className="sp-hud">
        <span className="sp-hud-q">Question {qIndex + 1} / {total}</span>
        <span className="sp-hud-label">Which shape does this net fold into?</span>
      </div>

      {/* Net / unfolded pattern */}
      <div className="sp-shape-area">
        <img src={`/spatial/${qId}/net.svg`} alt="Unfolded net" className="sp-shape-img" draggable={false} />
      </div>

      {/* Answer options */}
      <div className="sp-options">
        {labels.map((letter) => {
          let cls = 'sp-option'
          if (showAnswer) {
            if (letter === q.answer) cls += ' correct'
            else if (letter === selected && letter !== q.answer) cls += ' wrong'
            else cls += ' dimmed'
          }
          return (
            <button key={letter} className={cls} onClick={() => pickAnswer(letter)} disabled={selected !== null}>
              <img src={`/spatial/${qId}/${letter}.svg`} alt={letter} className="sp-option-img" draggable={false} />
              <span className="sp-option-letter">{letter}</span>
            </button>
          )
        })}
      </div>

      {showAnswer && (
        <div className={`sp-feedback ${selected === q.answer ? 'correct' : 'wrong'}`}>
          {selected === q.answer ? '✓ Correct!' : `✗ Answer: ${q.answer}`}
        </div>
      )}
    </div>
  )
}
