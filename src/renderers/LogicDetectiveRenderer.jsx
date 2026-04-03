import { useState } from 'react'
import { Link } from 'react-router-dom'
import './LogicDetectiveRenderer.css'

const MAX_STRIKES = 3

// ==================== FORMAT RENDERERS ====================

function ClaimWrapper({ children, selected, hoverable, answer, onClick }) {
  return (
    <div
      className={`ld-claim ${selected ? 'selected' : ''} ${hoverable ? 'hoverable' : ''} ${answer ? 'answer' : ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

function InterviewFormat({ c, phase, selectedClaim, onClaimClick, flawedIndex }) {
  const meta = c.interviewMeta || {}
  return (
    <div className="ld-fmt-interview">
      <div className="ld-fmt-interview-header">
        <span className="ld-fmt-label">RECORDED INTERVIEW</span>
        <span className="ld-fmt-meta">{meta.location} — {meta.time}</span>
        {meta.recorded && <span className="ld-fmt-rec">● REC</span>}
      </div>
      <div className="ld-fmt-interview-body">
        {c.claims.map((claim, i) => (
          <ClaimWrapper key={i} selected={selectedClaim === i} hoverable={phase === 'read'} answer={phase === 'feedback' && i === flawedIndex} onClick={() => onClaimClick(i)}>
            <span className="ld-fmt-interview-ts">{meta.time?.replace(/:\d\d/, ':' + String(10 + i * 2).padStart(2, '0'))}</span>
            <span className="ld-fmt-interview-speaker">{c.speaker.split(' ')[0]}:</span>
            <span className="ld-fmt-interview-text">"{claim}"</span>
          </ClaimWrapper>
        ))}
      </div>
    </div>
  )
}

function TextsFormat({ c, phase, selectedClaim, onClaimClick, flawedIndex }) {
  const meta = c.textsMeta || {}
  return (
    <div className="ld-fmt-texts">
      <div className="ld-fmt-texts-header">
        <span className="ld-fmt-texts-group">{meta.groupName || 'Group Chat'}</span>
        <span className="ld-fmt-meta">{meta.time}</span>
      </div>
      <div className="ld-fmt-texts-body">
        {c.claims.map((claim, i) => (
          <ClaimWrapper key={i} selected={selectedClaim === i} hoverable={phase === 'read'} answer={phase === 'feedback' && i === flawedIndex} onClick={() => onClaimClick(i)}>
            <div className="ld-fmt-text-bubble">
              {i === 0 && <div className="ld-fmt-text-sender">{c.speaker}</div>}
              <div className="ld-fmt-text-msg">{claim}</div>
            </div>
          </ClaimWrapper>
        ))}
      </div>
    </div>
  )
}

function EmailFormat({ c, phase, selectedClaim, onClaimClick, flawedIndex }) {
  const meta = c.emailMeta || {}
  return (
    <div className="ld-fmt-email">
      <div className="ld-fmt-email-header">
        <div className="ld-fmt-email-row"><span className="ld-fmt-email-label">From:</span> {meta.from}</div>
        <div className="ld-fmt-email-row"><span className="ld-fmt-email-label">To:</span> {meta.to}</div>
        <div className="ld-fmt-email-row"><span className="ld-fmt-email-label">Subject:</span> <strong>{meta.subject}</strong></div>
        <div className="ld-fmt-email-row ld-fmt-meta">{meta.time}</div>
      </div>
      <div className="ld-fmt-email-body">
        {c.claims.map((claim, i) => (
          <ClaimWrapper key={i} selected={selectedClaim === i} hoverable={phase === 'read'} answer={phase === 'feedback' && i === flawedIndex} onClick={() => onClaimClick(i)}>
            <span>{claim}</span>
          </ClaimWrapper>
        ))}
      </div>
    </div>
  )
}

function SocialFormat({ c, phase, selectedClaim, onClaimClick, flawedIndex }) {
  const meta = c.socialMeta || {}
  return (
    <div className="ld-fmt-social">
      <div className="ld-fmt-social-header">
        <span className="ld-fmt-social-avatar">{c.emoji}</span>
        <div>
          <div className="ld-fmt-social-handle">{meta.handle}</div>
          <div className="ld-fmt-meta">{meta.time} · {meta.platform}</div>
        </div>
      </div>
      <div className="ld-fmt-social-body">
        {c.claims.map((claim, i) => (
          <ClaimWrapper key={i} selected={selectedClaim === i} hoverable={phase === 'read'} answer={phase === 'feedback' && i === flawedIndex} onClick={() => onClaimClick(i)}>
            <span>{claim}</span>
          </ClaimWrapper>
        ))}
      </div>
      <div className="ld-fmt-social-footer">
        <span>❤️ {meta.likes}</span>
        <span>💬 23</span>
        <span>🔁 5</span>
      </div>
    </div>
  )
}

function StickyFormat({ c, phase, selectedClaim, onClaimClick, flawedIndex }) {
  const colors = ['#fff9c4', '#c8e6c9', '#bbdefb', '#f8bbd0']
  return (
    <div className="ld-fmt-sticky">
      <div className="ld-fmt-sticky-board">
        {c.claims.map((claim, i) => (
          <ClaimWrapper key={i} selected={selectedClaim === i} hoverable={phase === 'read'} answer={phase === 'feedback' && i === flawedIndex} onClick={() => onClaimClick(i)}>
            <div className="ld-fmt-sticky-note" style={{ background: colors[i % colors.length], transform: `rotate(${(i - 1.5) * 2}deg)` }}>
              <div className="ld-fmt-sticky-pin" />
              <div className="ld-fmt-sticky-text">{claim}</div>
            </div>
          </ClaimWrapper>
        ))}
      </div>
    </div>
  )
}

function MemoFormat({ c, phase, selectedClaim, onClaimClick, flawedIndex }) {
  const meta = c.memoMeta || {}
  return (
    <div className="ld-fmt-memo">
      <div className="ld-fmt-memo-header">
        <div className="ld-fmt-memo-title">MEMORANDUM</div>
        <div className="ld-fmt-memo-row"><span className="ld-fmt-memo-label">TO:</span> {meta.to}</div>
        <div className="ld-fmt-memo-row"><span className="ld-fmt-memo-label">FROM:</span> {meta.from}</div>
        <div className="ld-fmt-memo-row"><span className="ld-fmt-memo-label">RE:</span> {meta.re}</div>
        {meta.priority && <div className="ld-fmt-memo-priority">PRIORITY: {meta.priority}</div>}
      </div>
      <div className="ld-fmt-memo-divider" />
      <div className="ld-fmt-memo-body">
        {c.claims.map((claim, i) => (
          <ClaimWrapper key={i} selected={selectedClaim === i} hoverable={phase === 'read'} answer={phase === 'feedback' && i === flawedIndex} onClick={() => onClaimClick(i)}>
            <span>{claim}</span>
          </ClaimWrapper>
        ))}
      </div>
    </div>
  )
}

const FORMAT_RENDERERS = {
  interview: InterviewFormat,
  texts: TextsFormat,
  email: EmailFormat,
  social: SocialFormat,
  sticky: StickyFormat,
  memo: MemoFormat,
}

// ==================== MAIN COMPONENT ====================

export default function LogicDetectiveRenderer({ cases }) {
  const [caseIndex, setCaseIndex] = useState(0)
  const [phase, setPhase] = useState('intro')
  const [selectedClaim, setSelectedClaim] = useState(-1)
  const [selectedOption, setSelectedOption] = useState(-1)
  const [strikes, setStrikes] = useState(0)
  const [results, setResults] = useState([])
  const [showHint, setShowHint] = useState(false)
  const [wrongPick, setWrongPick] = useState(false)

  const currentCase = cases[caseIndex]
  const done = caseIndex >= cases.length

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
          <p className="ld-narrative">{cases[0]?.__narrative?.intro}</p>
          <div className="ld-case-meta">
            <span className="ld-meta-item">{cases.length} witnesses</span>
            <span className="ld-meta-sep" />
            <span className="ld-meta-item">{MAX_STRIKES} strikes per interview</span>
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
          <p className="ld-narrative">{cases[0]?.__narrative?.outro}</p>
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

  if (done && phase !== 'outro') { setPhase('outro'); return null }

  // Briefing
  if (phase === 'briefing') {
    const formatLabels = { interview: 'Recorded Interview', texts: 'Text Messages', email: 'Email', social: 'Social Media Post', sticky: 'Sticky Notes', memo: 'Official Memo' }
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
          <div className="ld-fmt-badge">{formatLabels[currentCase.format] || 'Evidence'}</div>
          <p className="ld-briefing-text">{currentCase.briefing}</p>
          <button className="ld-btn-primary" onClick={() => setPhase('read')}>Review Evidence</button>
        </div>
      </div>
    )
  }

  const feedbackCorrect = phase === 'feedback' ? results[results.length - 1] : false
  const FormatRenderer = FORMAT_RENDERERS[currentCase.format] || InterviewFormat

  return (
    <div className="ld-wrapper">
      <Link to="/" className="ld-exit">Exit</Link>

      <div className="ld-game">
        {/* Top bar */}
        <div className="ld-topbar">
          <div className="ld-topbar-left">
            <span className="ld-file-label">{currentCase.context}</span>
            <span className="ld-case-counter">{caseIndex + 1}/{cases.length}</span>
          </div>
          <div className="ld-strikes">
            {Array.from({ length: MAX_STRIKES }).map((_, i) => (
              <span key={i} className={`ld-strike-dot ${i < strikes ? 'used' : ''}`} />
            ))}
          </div>
        </div>

        {/* Evidence card */}
        <div className="ld-card">
          {phase === 'read' && (
            <div className="ld-instruction">
              Scan the evidence. Tap the statement with flawed reasoning.
            </div>
          )}

          <FormatRenderer
            c={currentCase}
            phase={phase}
            selectedClaim={selectedClaim}
            onClaimClick={handleClaimClick}
            flawedIndex={currentCase.flawedIndex}
          />

          {wrongPick && phase === 'read' && (
            <div className="ld-wrong-flash">Not quite — try again. Look for the logical leap.</div>
          )}
          {showHint && phase === 'read' && !wrongPick && (
            <div className="ld-hint">Hint: Which statement jumps to a conclusion without proper evidence?</div>
          )}

          {/* Highlight confirm */}
          {phase === 'highlight' && (
            <div className="ld-action-panel">
              <div className="ld-action-label">You flagged this statement:</div>
              <div className="ld-action-quote">"{currentCase.claims[selectedClaim]}"</div>
              <div className="ld-action-buttons">
                <button className="ld-btn-primary" onClick={confirmHighlight}>Investigate This</button>
                <button className="ld-btn-ghost" onClick={goBack}>Go Back</button>
              </div>
            </div>
          )}

          {/* Explain */}
          {phase === 'explain' && (
            <div className="ld-action-panel">
              <div className="ld-action-label">What's wrong with this reasoning?</div>
              <div className="ld-options">
                {currentCase.options.map((opt, i) => (
                  <button key={i} className={`ld-option ${selectedOption === i ? 'selected' : ''}`} onClick={() => setSelectedOption(i)}>
                    {opt}
                  </button>
                ))}
              </div>
              <div className="ld-action-buttons">
                <button className="ld-btn-primary" onClick={submitExplanation} disabled={selectedOption < 0}>Lock In Answer</button>
                <button className="ld-btn-ghost" onClick={goBack}>Go Back</button>
              </div>
            </div>
          )}

          {/* Feedback */}
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
