import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import * as THREE from 'three'
import { createScene, animateOcean, animateSharks, animateRaft, animateFlag, animateCoinsToTarget } from './pirate/scene'
import { createPirate, positionPirates, animateIdle, animateVoteYes, animateVoteNo, animatePlankWalk } from './pirate/pirates'
import { getLevelData, getOptimalProposal, simulateVote, TOTAL_LEVELS, TOTAL_GOLD } from './pirate/gameLogic'
import './PirateRenderer.css'

const MAX_PIRATES = 8

export default function PirateRenderer() {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const piratesRef = useRef([])
  const animRef = useRef({ voteAnims: [], plankAnim: null, clock: 0 })

  const [level, setLevel] = useState(0)
  const [narrationIndex, setNarrationIndex] = useState(0)
  const [phase, setPhase] = useState('narrate') // narrate | propose | voting | result | transition
  const [proposal, setProposal] = useState([])
  const [votes, setVotes] = useState(null)
  const [hintIndex, setHintIndex] = useState(-1)
  const [freePlayCount, setFreePlayCount] = useState(5)
  const [feedback, setFeedback] = useState(null)

  const levelData = getLevelData(level)
  const pirateCount = levelData.mode === 'freeplay' ? freePlayCount : (levelData.pirateCount || 5)

  // Init Three.js scene
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const s = createScene(container)
    container.appendChild(s.renderer.domElement)
    sceneRef.current = s

    // Create max pirate figures
    const pirates = []
    for (let i = 0; i < MAX_PIRATES; i++) {
      const p = createPirate(i)
      p.visible = false
      s.scene.add(p)
      pirates.push(p)
    }
    piratesRef.current = pirates

    let frame
    const clock = { value: 0 }
    animRef.current.clock = clock

    const animate = () => {
      clock.value += 0.016
      const t = clock.value

      const anim = animRef.current

      animateOcean(s.ocean, t)
      animateSharks(s.sharkFins, t)
      animateRaft(s.raftGroup, t)
      animateFlag(s.flag, t)
      if (anim.coinTargets?.length) {
        animateCoinsToTarget(s.floatingCoins, t, anim.coinTargets)
      }

      // Pirate animations
      pirates.forEach((p, i) => {
        if (!p.visible) return

        // Check for active vote animation
        const voteAnim = anim.voteAnims.find((a) => a.index === i)
        if (voteAnim) {
          if (voteAnim.type === 'yes') animateVoteYes(p, t, voteAnim.start)
          else animateVoteNo(p, t, voteAnim.start)
          if (t - voteAnim.start > 0.8) {
            anim.voteAnims = anim.voteAnims.filter((a) => a !== voteAnim)
          }
        } else if (anim.plankAnim && anim.plankAnim.index === i) {
          const done = animatePlankWalk(p, t, anim.plankAnim.start)
          if (done) anim.plankAnim = null
        } else {
          animateIdle(p, t)
        }
      })

      s.renderer.render(s.scene, s.camera)
      frame = requestAnimationFrame(animate)
    }
    animate()

    const handleResize = () => {
      s.camera.aspect = container.clientWidth / container.clientHeight
      s.camera.updateProjectionMatrix()
      s.renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', handleResize)
      container.removeChild(s.renderer.domElement)
      s.renderer.dispose()
    }
  }, [])

  // Update visible pirates when level/count changes
  useEffect(() => {
    if (piratesRef.current.length > 0 && pirateCount > 0) {
      positionPirates(piratesRef.current, pirateCount)
    }
  }, [pirateCount, level])

  // Reset state when level changes
  useEffect(() => {
    setNarrationIndex(0)
    setPhase('narrate')
    setProposal([])
    setVotes(null)
    setHintIndex(-1)
    // Hide all floating coins and clear targets
    if (animRef.current) {
      animRef.current.coinTargets = []
    }
    if (sceneRef.current?.floatingCoins) {
      sceneRef.current.floatingCoins.forEach((c) => { c.visible = false })
    }
    setFeedback(null)
  }, [level])

  const advanceNarration = useCallback(() => {
    if (narrationIndex < levelData.narration.length - 1) {
      setNarrationIndex(narrationIndex + 1)
    } else {
      // Done narrating
      if (levelData.mode === 'intro') {
        setLevel(1)
      } else if (levelData.mode === 'guided') {
        setPhase('voting')
        triggerVotes(levelData.proposal, pirateCount)
      } else if (levelData.mode === 'challenge' || levelData.mode === 'freeplay') {
        setPhase('propose')
        setProposal(new Array(pirateCount).fill(0))
      }
    }
  }, [narrationIndex, levelData, pirateCount])

  function triggerVotes(prop, count) {
    const result = simulateVote(prop, count)
    setVotes(result)

    const t = animRef.current.clock.value
    result.votes.forEach((v, i) => {
      animRef.current.voteAnims.push({
        index: i,
        type: v ? 'yes' : 'no',
        start: t + i * 0.15,
      })
    })

    // Trigger coin animations — coins fly from chest to space in front of each pirate
    if (result.passes) {
      const chestPos = new THREE.Vector3(0, 0.7, 1.5)
      const coinTargets = []
      let coinIdx = 0
      const spacing = Math.min(1.3, 5 / count)
      const startX = -((count - 1) * spacing) / 2
      prop.forEach((amount, i) => {
        if (amount > 0 && coinIdx < 20) {
          const targetX = startX + i * spacing
          const numCoins = Math.min(amount > 10 ? 4 : amount > 1 ? 2 : 1, 20 - coinIdx)
          for (let c = 0; c < numCoins; c++) {
            coinTargets.push({
              coinIndex: coinIdx++,
              from: chestPos.clone(),
              to: new THREE.Vector3(targetX + (c - numCoins / 2) * 0.15, 0.15, 0),
              startTime: t + 0.8 + i * 0.3 + c * 0.12,
              duration: 0.7,
            })
          }
        }
      })
      animRef.current.coinTargets = coinTargets
    }

    setTimeout(() => setPhase('result'), 800 + count * 150)
  }

  function handleProposalChange(index, value) {
    const v = Math.max(0, Math.min(TOTAL_GOLD, parseInt(value) || 0))
    const next = [...proposal]
    next[index] = v
    setProposal(next)
  }

  function handleSubmitProposal() {
    const total = proposal.reduce((a, b) => a + b, 0)
    if (total !== TOTAL_GOLD) {
      setFeedback(`Total must be exactly ${TOTAL_GOLD} coins (currently ${total})`)
      return
    }
    setFeedback(null)
    setPhase('voting')
    triggerVotes(proposal, pirateCount)
  }

  function handleNextLevel() {
    if (level < TOTAL_LEVELS - 1) {
      setLevel(level + 1)
    }
  }

  function handlePlankWalk() {
    // Animate the proposer (highest index) walking the plank
    const proposerIdx = pirateCount - 1
    animRef.current.plankAnim = {
      index: proposerIdx,
      start: animRef.current.clock.value,
    }
    setTimeout(() => handleNextLevel(), 2500)
  }

  function handleReplay() {
    setLevel(0)
  }

  // Check if challenge answer is correct
  const isCorrectAnswer = levelData.mode === 'challenge' && votes?.passes && (() => {
    const optimal = getOptimalProposal(pirateCount)
    return proposal.every((v, i) => v === optimal[i])
  })()

  const proposalPassed = votes?.passes

  return (
    <div className="pr-wrapper">
      <Link to="/" className="pr-exit">Exit</Link>
      <div ref={containerRef} className="pr-canvas" />

      <div className="pr-overlay">
        {/* Level indicator */}
        <div className="pr-level">
          {level === 0 ? 'The Screwy Pirates' : level <= 4 ? `Level ${level}` : 'Free Play'}
          {pirateCount > 0 && ` — ${pirateCount} Pirates`}
        </div>

        {/* Narration */}
        {phase === 'narrate' && (
          <div className="pr-narration">
            <p className="pr-narration-text">{levelData.narration[narrationIndex]}</p>
            <button className="pr-btn" onClick={advanceNarration}>
              {narrationIndex < levelData.narration.length - 1 ? 'Next' :
                levelData.mode === 'intro' ? 'Begin' :
                levelData.mode === 'guided' ? 'See the Proposal' : 'Make Your Proposal'}
            </button>
          </div>
        )}

        {/* Proposal input */}
        {phase === 'propose' && (
          <div className="pr-propose">
            {levelData.mode === 'freeplay' && (
              <div className="pr-freeplay-controls">
                <label className="pr-label">Pirates:</label>
                <input
                  type="number"
                  className="pr-count-input"
                  value={freePlayCount}
                  min={2}
                  max={8}
                  onChange={(e) => {
                    const c = Math.max(2, Math.min(8, parseInt(e.target.value) || 2))
                    setFreePlayCount(c)
                    setProposal(new Array(c).fill(0))
                  }}
                />
              </div>
            )}
            <div className="pr-proposal-grid">
              {proposal.map((v, i) => (
                <div key={i} className="pr-proposal-item">
                  <span className="pr-pirate-label" style={{ color: ['#cc3333','#3366cc','#33aa55','#9944cc','#ee8833','#ccaa33','#33aaaa','#cc5599'][i] }}>
                    P{i + 1}
                  </span>
                  <input
                    type="number"
                    className="pr-gold-input"
                    value={v}
                    min={0}
                    max={TOTAL_GOLD}
                    onChange={(e) => handleProposalChange(i, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className="pr-total">
              Total: {proposal.reduce((a, b) => a + b, 0)} / {TOTAL_GOLD}
            </div>
            {feedback && <div className="pr-feedback">{feedback}</div>}
            {levelData.mode === 'challenge' && levelData.hints && (
              <button className="pr-hint-btn" onClick={() => setHintIndex(Math.min(hintIndex + 1, levelData.hints.length - 1))}>
                {hintIndex < 0 ? 'Need a hint?' : hintIndex < levelData.hints.length - 1 ? 'Another hint' : 'No more hints'}
              </button>
            )}
            {hintIndex >= 0 && levelData.hints && (
              <div className="pr-hint">{levelData.hints[hintIndex]}</div>
            )}
            <button className="pr-btn" onClick={handleSubmitProposal}>Submit Proposal</button>
          </div>
        )}

        {/* Voting / Result */}
        {(phase === 'voting' || phase === 'result') && votes && (
          <div className="pr-votes">
            <div className="pr-vote-grid">
              {votes.votes.map((v, i) => (
                <div key={i} className={`pr-vote-item ${v ? 'yes' : 'no'}`}>
                  <span className="pr-pirate-label" style={{ color: ['#cc3333','#3366cc','#33aa55','#9944cc','#ee8833','#ccaa33','#33aaaa','#cc5599'][i] }}>
                    P{i + 1}
                  </span>
                  <span className="pr-vote-icon">{phase === 'result' ? (v ? '\u2713' : '\u2717') : '...'}</span>
                  <span className="pr-vote-gold">{((n) => `${n} coin${n !== 1 ? 's' : ''}`)((levelData.mode === 'guided' ? levelData.proposal : proposal)[i])}</span>
                </div>
              ))}
            </div>

            {phase === 'result' && (
              <div className="pr-result-section">
                <div className={`pr-result-text ${proposalPassed ? 'pass' : 'fail'}`}>
                  {proposalPassed ? `Proposal passes! (${votes.yesCount} vote${votes.yesCount !== 1 ? 's' : ''})` : `Rejected! (only ${votes.yesCount} vote${votes.yesCount !== 1 ? 's' : ''})`}
                </div>

                {levelData.mode === 'guided' && levelData.insight && (
                  <div className="pr-insight">{levelData.insight}</div>
                )}

                {levelData.mode === 'challenge' && proposalPassed && isCorrectAnswer && (
                  <div className="pr-insight">You found the optimal solution! Pirate 5 keeps 98 by bribing Pirates 1 and 3.</div>
                )}

                {levelData.mode === 'challenge' && !proposalPassed && (
                  <div className="pr-insight">The proposal was rejected. The senior pirate walks the plank!</div>
                )}

                <div className="pr-result-actions">
                  {proposalPassed && level < TOTAL_LEVELS - 1 && (
                    <button className="pr-btn" onClick={handleNextLevel}>
                      {level < 4 ? 'Next Level' : 'Free Play'}
                    </button>
                  )}
                  {!proposalPassed && levelData.mode !== 'guided' && (
                    <>
                      <button className="pr-btn" onClick={handlePlankWalk}>Walk the Plank!</button>
                    </>
                  )}
                  {(levelData.mode === 'freeplay' || (levelData.mode === 'challenge' && proposalPassed && !isCorrectAnswer)) && (
                    <button className="pr-btn-secondary" onClick={() => {
                      setPhase('propose')
                      setVotes(null)
                      setProposal(new Array(pirateCount).fill(0))
                    }}>
                      Try Again
                    </button>
                  )}
                  {level >= TOTAL_LEVELS - 1 && proposalPassed && (
                    <button className="pr-btn-secondary" onClick={handleReplay}>Play Again</button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
