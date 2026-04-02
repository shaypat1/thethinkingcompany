import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { createScene } from './pirate/scene'
import { getOptimalProposal, simulateVote, getLevelData, TOTAL_LEVELS, TOTAL_GOLD } from './pirate/gameLogic'
import './PirateRenderer.css'

const COLORS = ['#cc3333','#3366cc','#33aa55','#9944cc','#ee8833']
const NAMES = ['Captain', 'Henry', 'Pietro', 'Wookho', 'Rohan']

function CoinSlider({ index, value, onChange, label, color, max }) {
  return (
    <div className="coin-slot">
      <div className="coin-slot-header">
        <span className="coin-slot-label" style={{ color }}>{label}</span>
        <span className="coin-slot-value"><span className="gold-coin">$</span> {value}</span>
      </div>
      <div className="coin-slot-track">
        <div className="coin-slot-fill" style={{ width: `${(value / max) * 100}%`, background: color }} />
        <input type="range" min="0" max={max} value={value}
          onChange={e => onChange(index, parseInt(e.target.value))}
          className="coin-slot-range" />
      </div>
    </div>
  )
}

export default function PirateRenderer() {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)

  const [level, setLevel] = useState(0)
  const [phase, setPhase] = useState('propose')
  const [proposal, setProposal] = useState([100, 0])
  const [votes, setVotes] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const levelData = getLevelData(level)
  const pirateCount = levelData.pirateCount
  const captainIndex = 0

  // Init Three.js
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const s = createScene(container)
    container.appendChild(s.renderer.domElement)
    sceneRef.current = s
    return () => {
      s.dispose()
      if (container.contains(s.renderer.domElement)) container.removeChild(s.renderer.domElement)
    }
  }, [])

  // Show correct number of pirates when level changes
  useEffect(() => {
    const s = sceneRef.current
    if (!s) return
    // Retry until models are loaded
    const tryShow = () => {
      if (s.raftGroup.userData.showPirates) {
        s.raftGroup.userData.showPirates(pirateCount)
      }
    }
    tryShow()
    const interval = setInterval(tryShow, 300)
    setTimeout(() => clearInterval(interval), 5000)
    return () => clearInterval(interval)
  }, [pirateCount])

  function resetToStart() {
    setLevel(0); setPhase('propose'); setProposal([100, 0])
    setVotes(null); setFeedback(null)
  }

  function handleCoinChange(index, value) {
    const next = [...proposal]
    const desired = Math.max(0, Math.min(TOTAL_GOLD, value))
    const diff = desired - next[index]

    if (diff === 0) return

    next[index] = desired

    // Redistribute the difference among OTHER pirates proportionally
    // Priority: take from those who have the most first
    const others = []
    for (let i = 0; i < next.length; i++) {
      if (i !== index && next[i] > 0) others.push(i)
    }

    if (diff > 0) {
      // Taking coins — need to remove `diff` from others
      let remaining = diff
      // Sort others by descending amount so we take from richest first
      others.sort((a, b) => next[b] - next[a])
      for (const oi of others) {
        if (remaining <= 0) break
        const take = Math.min(next[oi], remaining)
        next[oi] -= take
        remaining -= take
      }
      // If still remaining, cap the desired value
      if (remaining > 0) next[index] -= remaining
    } else {
      // Giving coins back — add `-diff` to captain first, then others
      let toGive = -diff
      // Give to captain first
      if (captainIndex !== index) {
        next[captainIndex] += toGive
        toGive = 0
      } else {
        // If captain is giving away, distribute to first pirate with space
        for (let i = 0; i < next.length && toGive > 0; i++) {
          if (i !== index) {
            next[i] += toGive
            toGive = 0
          }
        }
      }
    }

    setProposal(next)
    setFeedback(null)
  }

  function triggerResultAnimations(result, prop) {
    const s = sceneRef.current
    if (!s || !s.raftGroup.userData.playAnimation) return
    const play = s.raftGroup.userData.playAnimation
    const opt = getOptimalProposal(pirateCount)
    const isOpt = result.passes && prop.every((v, i) => v === opt[i])

    if (result.passes && isOpt) {
      // Optimal — everyone celebrates for 5 seconds
      for (let i = 0; i < pirateCount; i++) {
        setTimeout(() => {
          if (result.votes[i]) play(i, 'Wave', 5000)
          else play(i, 'Idle', 5000)
        }, i * 300)
      }
    } else if (result.passes && !isOpt) {
      // Non-optimal — captain shakes head, winners celebrate
      play(0, 'No', 5000)
      for (let i = 1; i < pirateCount; i++) {
        setTimeout(() => {
          if (prop[i] > 0) play(i, 'Yes', 5000)
          else play(i, 'Wave', 5000)
        }, i * 400)
      }
    } else {
      // Failed — captain upset, no-voters celebrate, yes-voters sad
      play(0, 'HitReact', 6000)
      for (let i = 1; i < pirateCount; i++) {
        setTimeout(() => {
          if (!result.votes[i]) play(i, 'Yes', 6000) // celebrating captain's demise
          else play(i, 'No', 6000)
        }, i * 400)
      }
    }
  }

  function handleSubmit() {
    const total = proposal.reduce((a, b) => a + b, 0)
    if (total !== TOTAL_GOLD) { setFeedback(`Must total ${TOTAL_GOLD} (currently ${total})`); return }
    setFeedback(null)
    const result = simulateVote(proposal, pirateCount)
    setVotes(result); setPhase('voting')
    setTimeout(() => {
      setPhase('result')
      triggerResultAnimations(result, proposal)
    }, 600 + pirateCount * 200)
  }

  function handleNextLevel() {
    const next = level + 1
    if (next >= TOTAL_LEVELS) { setPhase('win'); return }
    const nc = getLevelData(next).pirateCount
    setLevel(next); setPhase('propose')
    const init = new Array(nc).fill(0); init[0] = TOTAL_GOLD
    setProposal(init); setVotes(null); setFeedback(null)
  }

  function handlePlankWalk() {
    setPhase('plank')
    setTimeout(() => resetToStart(), 2800)
  }

  const proposalPassed = votes?.passes
  const optimal = getOptimalProposal(pirateCount)
  const isOptimal = proposalPassed && proposal.every((v, i) => v === optimal[i])

  return (
    <div className="pr-wrapper">
      <Link to="/" className="pr-exit-btn">&larr; Exit</Link>
      <button className="pr-restart-btn" onClick={resetToStart}>Restart</button>

      {/* Rules box */}
      <div className="pr-rules-box">
        <div className="pr-rules-heading">Rules <span className="pr-level-badge">Level {level + 1}/{TOTAL_LEVELS} · {pirateCount} pirates</span></div>
        <ol className="pr-rules-list">
          <li>Captain proposes how to split the treasure</li>
          <li>All pirates vote — need at least half</li>
          <li>Rejected? Captain walks the plank</li>
        </ol>
      </div>

      {/* 3D Scene */}
      <div ref={containerRef} className="pr-scene" />

      {/* Bottom bubble box */}
      <div className="pr-bottom-bubble-wrap">
        {phase === 'propose' && (
          <div className="pr-bubble-box">
            <div className="pr-bubble-title">Split {TOTAL_GOLD} coins</div>
            <div className="pr-coin-sliders">
              {proposal.map((v, i) => (
                <CoinSlider key={i} index={i} value={v} max={TOTAL_GOLD}
                  onChange={handleCoinChange}
                  label={i === captainIndex ? `👑 ${NAMES[i]}` : NAMES[i]}
                  color={COLORS[i]} />
              ))}
            </div>
            <div className="pr-bubble-footer">
              {feedback && <div className="pr-feedback">{feedback}</div>}
              <button className="pr-propose-btn" onClick={handleSubmit}>Propose Split</button>
            </div>
          </div>
        )}

        {phase === 'voting' && (
          <div className="pr-bubble-box pr-bubble-compact">
            <div className="pr-voting-text">The pirates are voting...</div>
          </div>
        )}

        {phase === 'result' && votes && (
          <div className="pr-bubble-box">
            <div className="pr-vote-row">
              {votes.votes.map((v, i) => (
                <div key={i} className={`pr-vote-chip ${v ? 'yes' : 'no'}`}>
                  <span style={{ color: COLORS[i], fontWeight: 600 }}>{NAMES[i]}</span>
                  <span>{v ? '✓' : '✗'}</span>
                  <span className="pr-vote-coins"><span className="gold-coin">$</span>{proposal[i]}</span>
                </div>
              ))}
            </div>
            <div className={`pr-result-text ${proposalPassed ? 'pass' : 'fail'}`}>
              {proposalPassed ? `Passed! ${votes.yesCount}/${pirateCount} votes` : `Rejected. ${votes.yesCount}/${pirateCount} votes`}
            </div>
            {proposalPassed && isOptimal && <div className="pr-insight">Optimal strategy!</div>}
            {proposalPassed && !isOptimal && <div className="pr-insight">Passed, but optimal was [{optimal.join(', ')}]</div>}
            <div className="pr-result-actions">
              {proposalPassed ? (
                <button className="pr-propose-btn" onClick={handleNextLevel}>{level + 1 >= TOTAL_LEVELS ? '🏆 Victory!' : `Next → ${NAMES[pirateCount]} joins`}</button>
              ) : (
                <button className="pr-propose-btn pr-plank-btn" onClick={handlePlankWalk}>Walk the Plank!</button>
              )}
            </div>
          </div>
        )}

        {phase === 'plank' && (
          <div className="pr-bubble-box pr-bubble-compact">
            <div className="pr-plank-text">Captain walks the plank... 💀</div>
          </div>
        )}

        {phase === 'win' && (
          <div className="pr-bubble-box">
            <div className="pr-win-title">🏆 You Survived!</div>
            <div className="pr-win-sub">All {TOTAL_LEVELS} rounds conquered.</div>
            <button className="pr-propose-btn" onClick={resetToStart}>Play Again</button>
          </div>
        )}
      </div>
    </div>
  )
}
