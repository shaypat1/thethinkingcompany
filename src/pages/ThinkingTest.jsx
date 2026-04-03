import { useState } from 'react'
import { Link } from 'react-router-dom'
import './ThinkingTest.css'

const TEST_SEQUENCE = [
  { type: 'sequencememory', label: 'Sequence Memory', baseElo: 600, eloPerRound: 200 },
  { type: 'chimptest', label: 'Chimp Test', baseElo: 600, eloPerRound: 200 },
  { type: 'pirate', label: 'Screwy Pirates', baseElo: 2000, eloPerRound: 0 },
]

export default function ThinkingTest() {
  const [phase, setPhase] = useState('landing')
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [error, setError] = useState(null)

  function handleStart() {
    if (!age || parseInt(age) < 1) { setError('SELECT YOUR AGE'); return }
    setError(null)
    setPhase('test')
  }

  if (phase === 'landing') {
    return (
      <div className="tt-wrapper">
        <div className="tt-scanlines" />

        <div className="tt-content">
          <div className="tt-hero">
            <h1 className="tt-title">
              <span className="tt-title-top">THE THINKING</span>
              <span className="tt-title-bottom">TEST</span>
            </h1>
            <div className="tt-blink">ENTER AGE AND PRESS START</div>
          </div>

          <div className="tt-form">
            <div className="tt-field">
              <div className="tt-age-display">{age || 0}</div>
              <input
                className="tt-slider"
                type="range"
                min="0"
                max="116"
                step="1"
                value={age || 0}
                onChange={e => { setAge(e.target.value); setError(null) }}
              />
              <div className="tt-age-hint">PLEASE ENTER CORRECT AGE TO START TEST PROPERLY</div>
            </div>

            {error && <div className="tt-error">{error}</div>}

            <button className="tt-start-btn" onClick={handleStart}>
              START
            </button>
          </div>

        </div>
      </div>
    )
  }

  if (phase === 'test') {
    return (
      <div className="tt-wrapper">
        <div className="tt-scanlines" />
        <div className="tt-content">
          <div className="tt-test-header">
            <span className="tt-test-age">AGE: {age}</span>
            <span className="tt-test-progress">IN PROGRESS</span>
          </div>
          <div className="tt-test-placeholder">
            <h2 className="tt-section-title">TEST SEQUENCE</h2>
            <div className="tt-sequence-list">
              {TEST_SEQUENCE.map((item, i) => (
                <div key={i} className="tt-sequence-item">
                  <span className="tt-sequence-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="tt-sequence-label">{item.label.toUpperCase()}</span>
                  <span className="tt-sequence-elo">ELO {item.baseElo}</span>
                </div>
              ))}
            </div>
            <div className="tt-placeholder-msg">LOADING MODULES...</div>
            <button className="tt-start-btn" style={{ marginTop: '1.5rem', maxWidth: '200px' }} onClick={() => setPhase('landing')}>
              BACK
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
