import { useState } from 'react'
import { Link } from 'react-router-dom'
import './LogicDetectiveRenderer.css'

const MAX_STRIKES = 3

export default function LogicDetectiveRenderer({ cases }) {
  const [caseIndex, setCaseIndex] = useState(0)
  const [phase, setPhase] = useState('intro') // intro | briefing | read | highlight | explain | feedback | outro | summary
  const [selectedClaim, setSelectedClaim] = useState(-1)
  const [selectedOption, setSelectedOption] = useState(-1)
  const [strikes, setStrikes] = useState(0)
  const [results, setResults] = useState([])
  const [showHint, setShowHint] = useState(false)
  const [wrongPick, setWrongPick] = useState(false)

  const currentCase = cases[caseIndex]
  const done = caseIndex >= cases.length
  const narrative = cases[0] && cases[0].__narrative

  function goBack() {
    if (phase === 'highlight') { setSelectedClaim(-1); setPhase('read') }
    else if (phase === 'explain') { setPhase('highlight') }
  }

  function handleClaimClick(index) {
    if (phase !== 'read') return
    setSelectedClaim(index)
    setWrongPick(false)
    setPhase('highlight')
  }

  function confirmHighlight() {
    setPhase('explain')
    setSelectedOption(-1)
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
        setSelectedClaim(-1)
        setSelectedOption(-1)
        setWrongPick(true)
        setPhase('read')
        setShowHint(true)
      }
    }
  }

  function nextCase() {
    if (caseIndex + 1 >= cases.length) {
      setPhase('outro')
    } else {
      setCaseIndex(caseIndex + 1)
      setPhase('briefing')
      setSelectedClaim(-1)
      setSelectedOption(-1)
      setStrikes(0)
      setShowHint(false)
      setWrongPick(false)
    }
  }

  // Intro
  if (phase === 'intro') {
    return (
      <div className="ld-wrapper">
        <Link to="/" className="ld-exit">Exit</Link>
        <div className="ld-cinematic">
          <div className="ld-file-stamp">CLASSIFIED</div>
          <h1 className="ld-case-title">{cases[0]?.__title || 'Logic Detective'}</h1>
          <div className="ld-divider" />
          <p className="ld-narrative">{cases[0]?.__narrative?.intro || 'You\'ve been called in to investigate. Read the evidence, find the flawed reasoning, and crack the case.'}</p>
          <div className="ld-case-meta">
            <span className="ld-meta-item">{cases.length} witnesses</span>
            <span className="ld-meta-sep" />
            <span className="ld-meta-item">{MAX_STRIKES} strikes allowed per interview</span>
          </div>
          <button className="ld-btn-primary" onClick={() => setPhase('briefing')}>Open Case File</button>
        </div>
      </div>
    )
  }

  // Outro
  if (phase === 'outro') {
    const correct = results.filter(Boolean).length
    return (
      <div className="ld-wrapper">
        <Link to="/" className="ld-exit">Exit</Link>
        <div className="ld-cinematic">
          <div className="ld-file-stamp" style={{ color: 'var(--accent)' }}>CASE CLOSED</div>
          <h2 className="ld-case-title">Investigation Complete</h2>
          <div className="ld-divider" />
          <p className="ld-narrative">{cases[0]?.__narrative?.outro || 'Another case solved by the Logic Bureau.'}</p>
          <div className="ld-score-block">
            <div className="ld-score-big">{correct}/{cases.length}</div>
            <div className="ld-score-label">interviews cracked</div>
            <div className="ld-score-dots">
              {results.map((r, i) => (
                <span key={i} className={`ld-dot ${r ? 'correct' : 'missed'}`} />
              ))}
            </div>
          </div>
          <Link to="/" className="ld-btn-primary">Back to HQ</Link>
        </div>
      </div>
    )
  }

  // Summary fallback (shouldn't reach here normally)
  if (done && phase !== 'outro') {
    setPhase('outro')
    return null
  }

  // Briefing — case intro before reading
  if (phase === 'briefing') {
    return (
      <div className="ld-wrapper">
        <Link to="/" className="ld-exit">Exit</Link>
        <div className="ld-cinematic">
          <div className="ld-witness-intro">
            <span className="ld-witness-emoji">{currentCase.emoji}</span>
            <div>
              <div className="ld-witness-name">{currentCase.speaker}</div>
              <div className="ld-witness-role">{currentCase.speakerRole}</div>
            </div>
          </div>
          <div className="ld-file-label">{currentCase.context}</div>
          <p className="ld-briefing-text">{currentCase.briefing}</p>
          <button className="ld-btn-primary" onClick={() => setPhase('read')}>Begin Interview</button>
        </div>
      </div>
    )
  }

  const feedbackCorrect = phase === 'feedback' ? results[results.length - 1] : false

  return (
    <div className="ld-wrapper">
      <Link to="/" className="ld-exit">Exit</Link>

      <div className="ld-game">
        {/* Top bar */}
        <div className="ld-topbar">
          <div className="ld-topbar-left">
            <span className="ld-file-label">{currentCase.context}</span>
            <span className="ld-case-counter">Interview {caseIndex + 1}/{cases.length}</span>
          </div>
          <div className="ld-strikes">
            {Array.from({ length: MAX_STRIKES }).map((_, i) => (
              <span key={i} className={`ld-strike-dot ${i < strikes ? 'used' : ''}`} />
            ))}
          </div>
        </div>

        {/* Case file card */}
        <div className="ld-card">
          {/* Speaker header */}
          <div className="ld-card-speaker">
            <span className="ld-speaker-emoji">{currentCase.emoji}</span>
            <div>
              <div className="ld-speaker-name">{currentCase.speaker}</div>
              <div className="ld-speaker-role">{currentCase.speakerRole}</div>
            </div>
          </div>

          {/* Testimony */}
          <div className="ld-testimony">
            {phase === 'read' && (
              <div className="ld-instruction">
                Scan the testimony. Tap the statement with flawed reasoning.
              </div>
            )}

            <div className={`ld-claims ${phase === 'read' ? 'scanning' : ''}`}>
              {currentCase.claims.map((claim, i) => (
                <div
                  key={i}
                  className={`ld-claim ${
                    selectedClaim === i ? 'selected' : ''
                  } ${phase === 'read' ? 'hoverable' : ''} ${
                    phase === 'feedback' && i === currentCase.flawedIndex ? 'answer' : ''
                  }`}
                  onClick={() => handleClaimClick(i)}
                >
                  <span className="ld-claim-marker">{i + 1}</span>
                  <span className="ld-claim-text">{claim}</span>
                </div>
              ))}
            </div>

            {/* Wrong pick shake */}
            {wrongPick && phase === 'read' && (
              <div className="ld-wrong-flash">Not quite — try again. Look for the logical leap.</div>
            )}

            {showHint && phase === 'read' && !wrongPick && (
              <div className="ld-hint">Hint: Which statement jumps to a conclusion without proper evidence?</div>
            )}
          </div>

          {/* Action panels */}
          {phase === 'highlight' && (
            <div className="ld-action-panel">
              <div className="ld-action-label">You flagged statement #{selectedClaim + 1}:</div>
              <div className="ld-action-quote">"{currentCase.claims[selectedClaim]}"</div>
              <div className="ld-action-buttons">
                <button className="ld-btn-primary" onClick={confirmHighlight}>Investigate This</button>
                <button className="ld-btn-ghost" onClick={goBack}>Go Back</button>
              </div>
            </div>
          )}

          {phase === 'explain' && (
            <div className="ld-action-panel">
              <div className="ld-action-label">What's wrong with this reasoning?</div>
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
              <div className="ld-action-buttons">
                <button className="ld-btn-primary" onClick={submitExplanation} disabled={selectedOption < 0}>
                  Lock In Answer
                </button>
                <button className="ld-btn-ghost" onClick={goBack}>Go Back</button>
              </div>
            </div>
          )}

          {phase === 'feedback' && (
            <div className={`ld-feedback ${feedbackCorrect ? 'correct' : 'incorrect'}`}>
              <div className="ld-feedback-badge">{feedbackCorrect ? 'CRACKED' : 'STUMPED'}</div>
              <div className="ld-fallacy-pill">
                <span className="ld-fallacy-nick">{currentCase.fallacyNickname}</span>
                <span className="ld-fallacy-formal">{currentCase.fallacyType}</span>
              </div>
              <p className="ld-feedback-text">{currentCase.explanation}</p>
              <button className="ld-btn-primary" onClick={nextCase}>
                {caseIndex < cases.length - 1 ? 'Next Witness' : 'Close Case'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Inject narrative into cases from parent content
LogicDetectiveRenderer.transformContent = (content) => {
  if (content?.cases && content.narrative) {
    content.cases[0].__narrative = content.narrative
    content.cases[0].__title = content.title
  }
  return content?.cases || []
}
