import { useState, useRef, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { Link } from 'react-router-dom'
import { createScene } from './testPirateScene'
import { getOptimalProposal, simulateVote, getLevelData, TOTAL_LEVELS, TOTAL_GOLD } from './testPirateGameLogic'
import './TestPirate.css'

const COLORS = ['#cc3333','#3366cc','#33aa55','#9944cc','#ee8833']
const NAMES = ['Captain', 'Henry', 'Pietro', 'Wookho', 'Rohan']
const PIRATE_ELOS = [1200, 1500, 1800, 2100]

function getVoteReasoning(pirateCount, proposal, votes, optimal) {
  const isOpt = proposal.every((v, i) => v === optimal[i])
  const passed = votes.filter(Boolean).length >= Math.ceil(pirateCount / 2)
  const fallback = pirateCount > 2 ? getOptimalProposal(pirateCount - 1) : null

  return proposal.map((amount, i) => {
    if (i === 0) {
      // Captain
      if (passed && isOpt) return "Perfect split. I keep the most!"
      if (passed && !isOpt) return "It passed... but I gave away too much."
      return "They rejected me..."
    }

    const myFallback = fallback ? (i - 1 < fallback.length ? fallback[i - 1] : 0) : 100
    const votedYes = votes[i]

    if (pirateCount === 2) {
      if (amount > 0) return `Free coins! I'll take ${amount}.`
      return "Doesn't matter. Captain only needs his own vote."
    }

    if (votedYes) {
      if (amount === 1 && myFallback === 0) return "1 coin beats nothing. I'll take it."
      if (amount > myFallback) return `${amount} coins! Better than the ${myFallback} I'd get otherwise.`
      return `${amount} coins works for me.`
    } else {
      if (amount === 0 && myFallback > 0) return `Nothing?! I'd get ${myFallback} without you. NO.`
      if (amount === 0 && myFallback === 0) return "I get nothing either way. Throw him overboard!"
      if (amount <= myFallback) return `Only ${amount}? I'd get ${myFallback} if you're gone. NO.`
      return "Not enough. NO."
    }
  })
}

function CoinSlider({ index, value, onChange, label, color, max }) {
  return (
    <div className="coin-slot">
      <div className="coin-slot-header">
        <span className="coin-slot-label" style={{ color }}>{label}</span>
        <span className="coin-slot-value">{value}</span>
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

export default function PirateRenderer({ onLevelComplete, onLevelFail, startLevel: startLevelProp }) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)

  const initLevel = startLevelProp || 0
  const initPirateCount = getLevelData(initLevel).pirateCount
  const [level, setLevel] = useState(initLevel)
  const [phase, setPhase] = useState('propose')
  const [proposal, setProposal] = useState(() => { const a = new Array(initPirateCount).fill(0); a[0] = TOTAL_GOLD; return a })
  const [votes, setVotes] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [speechBubbles, setSpeechBubbles] = useState([])
  const [pirateScreenPos, setPirateScreenPos] = useState([])
  const posFrameRef = useRef(null)
  const calledBack = useRef(false)

  // Project pirate 3D positions to 2D screen coords — snapshot once when bubbles appear
  useEffect(() => {
    if (speechBubbles.length === 0) return

    // Only compute positions once (on first bubble), then keep them fixed
    if (pirateScreenPos.length > 0) return

    function tryCapture() {
      const s = sceneRef.current
      if (!s || !s.raftGroup.userData.pirates) { setTimeout(tryCapture, 100); return }
      const pirates = s.raftGroup.userData.pirates
      const container = containerRef.current
      if (!container) { setTimeout(tryCapture, 100); return }
      const w = container.clientWidth
      const h = container.clientHeight

      const positions = []
      for (let i = 0; i < 5; i++) {
        const model = pirates[i]
        if (!model || !model.visible) { positions.push(null); continue }
        const box = new THREE.Box3().setFromObject(model)
        const headPos = new THREE.Vector3((box.max.x + box.min.x) / 2, box.max.y + 10, (box.max.z + box.min.z) / 2)
        headPos.project(s.camera)
        positions.push({
          x: (headPos.x * 0.5 + 0.5) * w,
          y: (-headPos.y * 0.5 + 0.5) * h,
        })
      }
      setPirateScreenPos(positions)
    }
    tryCapture()
  }, [speechBubbles.length])

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
    let done = false
    const tryShow = () => {
      if (done) return
      const pirates = s.raftGroup.userData.pirates
      if (s.raftGroup.userData.showPirates && pirates && pirates.filter(Boolean).length >= pirateCount) {
        s.raftGroup.userData.showPirates(pirateCount)
        done = true
      }
    }
    tryShow()
    if (!done) {
      const interval = setInterval(() => { tryShow(); if (done) clearInterval(interval) }, 300)
      setTimeout(() => clearInterval(interval), 5000)
      return () => clearInterval(interval)
    }
  }, [pirateCount])

  function resetToStart() {
    setLevel(0); setPhase('propose'); setProposal([100, 0])
    setVotes(null); setFeedback(null); setSpeechBubbles([]); setPirateScreenPos([])
    const s = sceneRef.current
    if (s && s.raftGroup.userData.clearFlyingCoins) s.raftGroup.userData.clearFlyingCoins()
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
      // Failed — other pirates celebrate
      for (let i = 1; i < pirateCount; i++) {
        setTimeout(() => {
          if (!result.votes[i]) play(i, 'Yes', 8000)
          else play(i, 'No', 8000)
        }, i * 400)
      }
      // Captain walks the plank automatically after speech bubbles appear
      setTimeout(() => {
        // Remove captain's bubble
        setSpeechBubbles(prev => prev.filter(b => b.index !== 0))
        // Walk the plank
        if (s.raftGroup.userData.walkThePlank) {
          s.raftGroup.userData.walkThePlank(0)
        }
      }, pirateCount * 800 + 1500)
    }
  }

  function handleSubmit() {
    const total = proposal.reduce((a, b) => a + b, 0)
    if (total !== TOTAL_GOLD) { setFeedback(`Must total ${TOTAL_GOLD} (currently ${total})`); return }
    setFeedback(null)
    const result = simulateVote(proposal, pirateCount)
    setVotes(result); setPhase('voting')
    setSpeechBubbles([])

    // Animate coins from bag to pirates
    const s = sceneRef.current
    if (s && s.raftGroup.userData.distributeCoins) {
      s.raftGroup.userData.distributeCoins(proposal)
    }

    // Show result after brief voting pause
    setTimeout(() => {
      setPhase('result')
      triggerResultAnimations(result, proposal)

      // Sequence speech bubbles — one pirate at a time
      const opt = getOptimalProposal(pirateCount)
      const reasons = getVoteReasoning(pirateCount, proposal, result.votes, opt)
      for (let i = 0; i < pirateCount; i++) {
        setTimeout(() => {
          setSpeechBubbles(prev => [...prev, { index: i, text: reasons[i], vote: result.votes[i] }])
        }, i * 800)
      }
    }, 600 + pirateCount * 200)
  }

  function handleNextLevel() {
    calledBack.current = false
    const next = level + 1
    if (next >= TOTAL_LEVELS) { setPhase('win'); return }
    const nc = getLevelData(next).pirateCount
    setLevel(next); setPhase('propose')
    const init = new Array(nc).fill(0); init[0] = TOTAL_GOLD
    setProposal(init); setVotes(null); setFeedback(null); setSpeechBubbles([]); setPirateScreenPos([])
    const s = sceneRef.current
    if (s && s.raftGroup.userData.clearFlyingCoins) s.raftGroup.userData.clearFlyingCoins()
  }

  // Fire test callbacks when result is determined
  useEffect(() => {
    if (phase !== 'result' || !votes || calledBack.current) return
    const opt = getOptimalProposal(pirateCount)
    const isOpt = votes.passes && proposal.every((v, i) => v === opt[i])
    if (votes.passes && onLevelComplete) {
      calledBack.current = true
      const delay = pirateCount * 800 + 2000
      setTimeout(() => onLevelComplete(level, isOpt), delay)
    } else if (!votes.passes && onLevelFail) {
      calledBack.current = true
      const delay = pirateCount * 800 + 4000
      setTimeout(() => onLevelFail(level), delay)
    }
  }, [phase, votes])

  const captainTrackRef = useRef(null)

  function handlePlankWalk() {
    // Remove ONLY the captain's speech bubble
    setSpeechBubbles(prev => prev.filter(b => b.index !== 0))
    setPhase('plank')

    const s = sceneRef.current
    if (s && s.raftGroup.userData.walkThePlank) {
      s.raftGroup.userData.walkThePlank(0)
    }
    setTimeout(() => resetToStart(), 4500)
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

      {/* Speech bubbles anchored to pirate heads */}
      {speechBubbles.map((bubble) => {
        const pos = pirateScreenPos[bubble.index]
        if (!pos) return null
        return (
          <div key={bubble.index} className={`pr-speech-bubble ${bubble.vote ? 'yes' : 'no'}`}
            style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -100%)' }}>
            <div className="pr-speech-name" style={{ color: COLORS[bubble.index] }}>{NAMES[bubble.index]}</div>
            <div className="pr-speech-text">{bubble.text}</div>
            <div className="pr-speech-vote">{bubble.vote ? '✓ YES' : '✗ NO'}</div>
            <div className="pr-speech-arrow" />
          </div>
        )
      })}

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
                  label={NAMES[i]}
                  color={COLORS[i]} />
              ))}
            </div>
            <div className="pr-bubble-footer">
              {feedback && <div className="pr-feedback">{feedback}</div>}
              <button className="pr-propose-btn" onClick={handleSubmit}>Propose Split</button>
            </div>
          </div>
        )}

        {phase === 'voting' && !onLevelComplete && (
          <div className="pr-bubble-box pr-bubble-compact">
            <div className="pr-voting-text">The pirates are voting...</div>
          </div>
        )}

        {phase === 'result' && votes && !onLevelComplete && (
          <div className="pr-bubble-box">
            <div className="pr-vote-row">
              {votes.votes.map((v, i) => (
                <div key={i} className={`pr-vote-chip ${v ? 'yes' : 'no'}`}>
                  <span style={{ color: COLORS[i], fontWeight: 600 }}>{NAMES[i]}</span>
                  <span>{v ? '✓' : '✗'}</span>
                  <span className="pr-vote-coins">{proposal[i]}</span>
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
                <button className="pr-propose-btn" onClick={handleNextLevel}>{level + 1 >= TOTAL_LEVELS ? 'Victory!' : `Next → ${NAMES[pirateCount]} joins`}</button>
              ) : (
                <button className="pr-propose-btn" onClick={resetToStart}>Try Again</button>
              )}
            </div>
          </div>
        )}

        {phase === 'plank' && !onLevelFail && (
          <div className="pr-bubble-box pr-bubble-compact">
            <div className="pr-plank-text">Captain walks the plank... 💀</div>
          </div>
        )}

        {phase === 'win' && !onLevelComplete && (
          <div className="pr-bubble-box">
            <div className="pr-win-title">You Survived!</div>
            <div className="pr-win-sub">All {TOTAL_LEVELS} rounds conquered.</div>
            <button className="pr-propose-btn" onClick={resetToStart}>Play Again</button>
          </div>
        )}
      </div>
    </div>
  )
}
