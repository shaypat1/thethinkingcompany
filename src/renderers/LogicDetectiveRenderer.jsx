import { useState } from 'react'
import { Link } from 'react-router-dom'
import './LogicDetectiveRenderer.css'

const MAX_STRIKES = 3

export default function LogicDetectiveRenderer({ cases }) {
  const [caseIndex, setCaseIndex] = useState(0)
  const [phase, setPhase] = useState('intro') // intro | read | highlight | explain | feedback | summary
  const [selectedClaim, setSelectedClaim] = useState(-1)
  const [selectedOption, setSelectedOption] = useState(-1)
  const [strikes, setStrikes] = useState(0)
  const [results, setResults] = useState([])
  const [showHint, setShowHint] = useState(false)

  const currentCase = cases[caseIndex]
  const done = caseIndex >= cases.length

  function handleClaimClick(index) {
    if (phase !== 'read') return
    setSelectedClaim(index)
    setPhase('highlight')
  }

  function confirmHighlight() {
    setPhase('explain')
    setSelectedOption(-1)
  }

  function changeHighlight() {
    setSelectedClaim(-1)
    setPhase('read')
  }

  function submitExplanation() {
    if (selectedOption < 0) return
    const correct = selectedOption === currentCase.correctOption
    const gotFlaw = selectedClaim === currentCase.flawedIndex

    if (correct && gotFlaw) {
      setPhase('feedback')
      setResults([...results, true])
    } else {
      const newStrikes = strikes + 1
      setStrikes(newStrikes)
      if (newStrikes >= MAX_STRIKES) {
        setPhase('feedback')
        setResults([...results, false])
      } else {
        // Reset to try again
        setSelectedClaim(-1)
        setSelectedOption(-1)
        setPhase('read')
        setShowHint(true)
      }
    }
  }

  function nextCase() {
    setCaseIndex(caseIndex + 1)
    setPhase('read')
    setSelectedClaim(-1)
    setSelectedOption(-1)
    setStrikes(0)
    setShowHint(false)
  }

  // Intro screen
  if (phase === 'intro') {
    return (
      <div className="ld-wrapper">
        <div className="ld-intro">
          <div className="ld-badge">&#128269;</div>
          <h1 className="ld-intro-title">Logic Detective</h1>
          <p className="ld-intro-sub">Find the faulty reasoning. Spot the tricks. Crack the case.</p>
          <p className="ld-intro-count">{cases.length} cases to solve</p>
          <button className="ld-btn" onClick={() => setPhase('read')}>Start Investigation</button>
        </div>
      </div>
    )
  }

  // Summary screen
  if (done) {
    const correct = results.filter(Boolean).length
    return (
      <div className="ld-wrapper">
        <div className="ld-summary">
          <div className="ld-badge">&#11088;</div>
          <h2 className="ld-summary-title">Case Closed</h2>
          <div className="ld-summary-score">{correct}/{cases.length}</div>
          <p className="ld-summary-label">cases cracked</p>
          <div className="ld-summary-dots">
            {results.map((r, i) => (
              <span key={i} className={`ld-dot ${r ? 'correct' : 'missed'}`} />
            ))}
          </div>
          <Link to="/" className="ld-back">Back to Track</Link>
        </div>
      </div>
    )
  }

  const isCorrectClaim = selectedClaim === currentCase.flawedIndex
  const feedbackCorrect = results[results.length - 1]

  return (
    <div className="ld-wrapper">
      <Link to="/" className="ld-exit">Exit</Link>

      {/* Header */}
      <div className="ld-header">
        <span className="ld-case-num">Case {caseIndex + 1} of {cases.length}</span>
        <span className="ld-context">{currentCase.context}</span>
        <div className="ld-strikes">
          {Array.from({ length: MAX_STRIKES }).map((_, i) => (
            <span key={i} className={`ld-strike ${i < strikes ? 'used' : ''}`}>&#10006;</span>
          ))}
        </div>
      </div>

      {/* Case content */}
      <div className="ld-case">
        {/* Speaker info */}
        <div className="ld-speaker">
          <div className="ld-speaker-avatar">{currentCase.speaker[0]}</div>
          <div>
            <div className="ld-speaker-name">{currentCase.speaker}</div>
            <div className="ld-speaker-role">{currentCase.speakerRole}</div>
          </div>
        </div>

        {/* Claims */}
        <div className={`ld-claims ${phase === 'read' ? 'scanning' : ''}`}>
          {currentCase.claims.map((claim, i) => (
            <span
              key={i}
              className={`ld-claim ${
                selectedClaim === i ? 'selected' : ''
              } ${phase === 'read' ? 'hoverable' : ''} ${
                phase === 'feedback' && i === currentCase.flawedIndex ? 'answer' : ''
              }`}
              onClick={() => handleClaimClick(i)}
            >
              {claim}
            </span>
          ))}
        </div>

        {/* Hint */}
        {showHint && phase === 'read' && (
          <div className="ld-hint">
            &#128269; Look carefully — which claim makes an unfair logical leap?
          </div>
        )}

        {/* Highlight confirmation */}
        {phase === 'highlight' && (
          <div className="ld-confirm-panel">
            <p className="ld-confirm-text">You highlighted:</p>
            <p className="ld-confirm-claim">"{currentCase.claims[selectedClaim]}"</p>
            <div className="ld-confirm-actions">
              <button className="ld-btn" onClick={confirmHighlight}>This is the flaw</button>
              <button className="ld-btn-secondary" onClick={changeHighlight}>Pick a different one</button>
            </div>
          </div>
        )}

        {/* Explanation options */}
        {phase === 'explain' && (
          <div className="ld-explain-panel">
            <p className="ld-explain-prompt">Why is this reasoning flawed?</p>
            <div className="ld-options">
              {currentCase.options.map((opt, i) => (
                <button
                  key={i}
                  className={`ld-option ${selectedOption === i ? 'selected' : ''}`}
                  onClick={() => setSelectedOption(i)}
                >
                  {opt}
                </button>
              ))}
            </div>
            <button
              className="ld-btn"
              onClick={submitExplanation}
              disabled={selectedOption < 0}
            >
              Submit Answer
            </button>
          </div>
        )}

        {/* Feedback */}
        {phase === 'feedback' && (
          <div className={`ld-feedback-panel ${feedbackCorrect ? 'correct' : 'incorrect'}`}>
            <div className="ld-feedback-icon">{feedbackCorrect ? '&#9989;' : '&#10060;'}</div>
            <div className="ld-feedback-title">
              {feedbackCorrect ? 'Case Cracked!' : 'Case Failed'}
            </div>
            <div className="ld-fallacy-tag">
              <span className="ld-fallacy-name">{currentCase.fallacyNickname}</span>
              <span className="ld-fallacy-formal">({currentCase.fallacyType})</span>
            </div>
            <p className="ld-feedback-explanation">{currentCase.explanation}</p>
            <button className="ld-btn" onClick={nextCase}>
              {caseIndex < cases.length - 1 ? 'Next Case' : 'See Results'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
