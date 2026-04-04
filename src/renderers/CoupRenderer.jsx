import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { createOrchestrator } from './coup/orchestrator'
import { ACTIONS, getLegalActions, alivePlayerIds, CHARACTERS } from './coup/engine'
import './CoupRenderer.css'

const CARD_ICONS = { Duke: '♛', Assassin: '🗡', Ambassador: '🕊', Captain: '⚓', Contessa: '♕' }
const CARD_COLORS = { Duke: '#9b59b6', Assassin: '#e74c3c', Ambassador: '#2ecc71', Captain: '#3498db', Contessa: '#e91e63' }
const PLAYER_COLORS = ['#00ccff', '#cc3333', '#3366cc', '#33aa55', '#9944cc', '#ee8833']

export default function CoupRenderer({ narrative }) {
  const [phase, setPhase] = useState('intro') // intro | playing | gameover
  const [gameState, setGameState] = useState(null)
  const [difficulty, setDifficulty] = useState('medium')
  const orchRef = useRef(null)

  const startGame = useCallback(() => {
    orchRef.current?.destroy()
    const orch = createOrchestrator(difficulty, (state) => {
      setGameState({ ...state })
      if (state.game.winner != null) setPhase('gameover')
    })
    orchRef.current = orch
    setPhase('playing')
    orch.start()
  }, [difficulty])

  useEffect(() => { return () => orchRef.current?.destroy() }, [])

  if (phase === 'intro') {
    return (
      <div className="coup-wrapper">
        <div className="coup-scanlines" />
        <Link to="/" className="coup-exit">Exit</Link>
        <div className="coup-intro">
          <h1 className="coup-logo">COUP</h1>
          <p className="coup-tagline">BLUFF. BETRAY. SURVIVE.</p>
          <p className="coup-desc">{narrative}</p>
          <div className="coup-diff-select">
            {['easy', 'medium', 'hard'].map(d => (
              <button key={d} className={`coup-diff-btn ${difficulty === d ? 'active' : ''}`}
                onClick={() => setDifficulty(d)}>{d.toUpperCase()}</button>
            ))}
          </div>
          <button className="coup-start-btn" onClick={startGame}>START GAME</button>
        </div>
      </div>
    )
  }

  if (!gameState) return null
  const { game, waitingFor, gameLog, playerNames, playerPersonalities } = gameState
  const me = game.players[0]
  const isMyTurn = waitingFor?.type === 'action' && waitingFor.playerId === 0

  return (
    <div className="coup-wrapper">
      <div className="coup-scanlines" />

      {/* Table layout */}
      <div className="coup-table">
        {/* Other players around the top */}
        <div className="coup-opponents">
          {game.players.slice(1).map((p, i) => {
            const pid = i + 1
            const isActive = game.currentPlayer === pid
            return (
              <div key={pid} className={`coup-player-card ${p.eliminated ? 'dead' : ''} ${isActive ? 'active' : ''}`}>
                <div className="coup-player-name" style={{ color: PLAYER_COLORS[pid] }}>{playerNames[pid]}</div>
                <div className="coup-player-personality">{playerPersonalities[pid]}</div>
                <div className="coup-player-coins">{'●'.repeat(Math.min(p.coins, 10))} {p.coins}</div>
                <div className="coup-player-cards">
                  {p.cards.map((_, ci) => (
                    <div key={ci} className="coup-card facedown">?</div>
                  ))}
                  {p.revealedCards.map((c, ci) => (
                    <div key={`r${ci}`} className="coup-card revealed" style={{ borderColor: CARD_COLORS[c] }}>
                      <span className="coup-card-icon">{CARD_ICONS[c]}</span>
                      <span className="coup-card-name">{c}</span>
                    </div>
                  ))}
                </div>
                {p.eliminated && <div className="coup-eliminated">ELIMINATED</div>}
              </div>
            )
          })}
        </div>

        {/* Game log */}
        <div className="coup-log">
          {gameLog.slice(-6).map((entry, i) => (
            <div key={i} className="coup-log-entry">{entry.text}</div>
          ))}
        </div>

        {/* Human player hand */}
        <div className={`coup-my-area ${isMyTurn ? 'my-turn' : ''}`}>
          <div className="coup-my-info">
            <span className="coup-my-name" style={{ color: PLAYER_COLORS[0] }}>YOU</span>
            <span className="coup-my-coins">{'●'.repeat(Math.min(me.coins, 10))} {me.coins} coins</span>
          </div>
          <div className="coup-my-cards">
            {me.cards.map((c, i) => (
              <div key={i} className="coup-card mycard" style={{ borderColor: CARD_COLORS[c], '--glow': CARD_COLORS[c] }}
                onClick={() => waitingFor?.type === 'loseCard' && orchRef.current?.humanLoseCard(i)}>
                <span className="coup-card-icon">{CARD_ICONS[c]}</span>
                <span className="coup-card-name">{c}</span>
                {waitingFor?.type === 'loseCard' && <span className="coup-card-lose-hint">TAP TO LOSE</span>}
              </div>
            ))}
            {me.revealedCards.map((c, i) => (
              <div key={`r${i}`} className="coup-card revealed" style={{ borderColor: CARD_COLORS[c] }}>
                <span className="coup-card-icon">{CARD_ICONS[c]}</span>
                <span className="coup-card-name">{c}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons — only on human's turn */}
        {isMyTurn && (
          <div className="coup-actions">
            <ActionButtons game={game} playerNames={playerNames} onAction={(a, t) => orchRef.current?.humanAction(a, t)} />
          </div>
        )}

        {/* Challenge prompt */}
        {waitingFor?.type === 'challenge' && (
          <div className="coup-prompt">
            <div className="coup-prompt-text">
              {playerNames[waitingFor.claim.actor]} claims <strong>{waitingFor.claim.claimedChar}</strong>. Challenge?
            </div>
            <div className="coup-prompt-btns">
              <button className="coup-btn challenge" onClick={() => orchRef.current?.humanChallenge(true)}>CHALLENGE</button>
              <button className="coup-btn pass" onClick={() => orchRef.current?.humanChallenge(false)}>LET IT GO</button>
            </div>
          </div>
        )}

        {/* Counteract prompt */}
        {waitingFor?.type === 'counteract' && (
          <div className="coup-prompt">
            <div className="coup-prompt-text">
              {playerNames[waitingFor.action.actor]} uses {ACTIONS[waitingFor.action.action].name} on you. Block?
            </div>
            <div className="coup-prompt-btns">
              {ACTIONS[waitingFor.action.action].blockableBy.map(char => (
                <button key={char} className="coup-btn block" style={{ borderColor: CARD_COLORS[char] }}
                  onClick={() => orchRef.current?.humanCounteract(true, char)}>
                  BLOCK ({char})
                </button>
              ))}
              <button className="coup-btn pass" onClick={() => orchRef.current?.humanCounteract(false)}>ALLOW</button>
            </div>
          </div>
        )}

        {/* Challenge counter prompt */}
        {waitingFor?.type === 'challengeCounter' && (
          <div className="coup-prompt">
            <div className="coup-prompt-text">
              {playerNames[waitingFor.counter.blocker]} blocks with {waitingFor.counter.claimedChar}. Challenge their block?
            </div>
            <div className="coup-prompt-btns">
              <button className="coup-btn challenge" onClick={() => orchRef.current?.humanChallengeCounter(true)}>CHALLENGE BLOCK</button>
              <button className="coup-btn pass" onClick={() => orchRef.current?.humanChallengeCounter(false)}>ACCEPT BLOCK</button>
            </div>
          </div>
        )}

        {/* Exchange prompt */}
        {waitingFor?.type === 'exchange' && (
          <ExchangeUI cards={me.cards} onSelect={(indices) => orchRef.current?.humanExchange(indices)} />
        )}

        {/* Lose card prompt */}
        {waitingFor?.type === 'loseCard' && (
          <div className="coup-prompt">
            <div className="coup-prompt-text">You must lose a card. Tap one above to reveal it.</div>
          </div>
        )}
      </div>

      {/* Game over overlay */}
      {phase === 'gameover' && (
        <div className="coup-gameover">
          <div className="coup-gameover-box">
            <div className="coup-gameover-title">{game.winner === 0 ? 'YOU WIN!' : `${playerNames[game.winner]} WINS`}</div>
            <div className="coup-gameover-sub">{game.winner === 0 ? 'The last one standing.' : 'Better luck next time.'}</div>
            <button className="coup-start-btn" onClick={startGame}>PLAY AGAIN</button>
            <Link to="/" className="coup-btn pass" style={{ marginTop: '0.5rem' }}>EXIT</Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Action buttons with target selection ──
function ActionButtons({ game, playerNames, onAction }) {
  const [showTargets, setShowTargets] = useState(null) // action key needing target
  const legal = getLegalActions(game, 0)
  const alive = alivePlayerIds(game).filter(id => id !== 0)

  if (showTargets) {
    return (
      <div className="coup-target-select">
        <div className="coup-target-title">Target for {ACTIONS[showTargets].name}:</div>
        {alive.map(id => (
          <button key={id} className="coup-btn target" style={{ borderColor: PLAYER_COLORS[id] }}
            onClick={() => { onAction(showTargets, id); setShowTargets(null) }}>
            {playerNames[id]}
          </button>
        ))}
        <button className="coup-btn pass" onClick={() => setShowTargets(null)}>CANCEL</button>
      </div>
    )
  }

  return (
    <>
      {legal.map(l => (
        <button key={l.action} className="coup-action-btn"
          style={{ borderColor: ACTIONS[l.action].claimsChar ? CARD_COLORS[ACTIONS[l.action].claimsChar] : '#555' }}
          onClick={() => {
            if (l.targets) setShowTargets(l.action)
            else onAction(l.action)
          }}>
          <span className="coup-action-name">{ACTIONS[l.action].name}</span>
          {ACTIONS[l.action].claimsChar && <span className="coup-action-claim">({ACTIONS[l.action].claimsChar})</span>}
          {ACTIONS[l.action].cost > 0 && <span className="coup-action-cost">{ACTIONS[l.action].cost}●</span>}
        </button>
      ))}
    </>
  )
}

// ── Exchange card selection ──
function ExchangeUI({ cards, onSelect }) {
  const [selected, setSelected] = useState(new Set())

  function toggle(i) {
    const next = new Set(selected)
    if (next.has(i)) next.delete(i)
    else if (next.size < 2) next.add(i)
    setSelected(next)
  }

  return (
    <div className="coup-exchange">
      <div className="coup-prompt-text">Pick 2 cards to KEEP:</div>
      <div className="coup-exchange-cards">
        {cards.map((c, i) => (
          <div key={i} className={`coup-card mycard ${selected.has(i) ? 'selected' : ''}`}
            style={{ borderColor: CARD_COLORS[c] }} onClick={() => toggle(i)}>
            <span className="coup-card-icon">{CARD_ICONS[c]}</span>
            <span className="coup-card-name">{c}</span>
            {selected.has(i) && <span className="coup-card-keep">KEEP</span>}
          </div>
        ))}
      </div>
      {selected.size === 2 && (
        <button className="coup-btn block" onClick={() => onSelect([...selected])}>CONFIRM</button>
      )}
    </div>
  )
}
