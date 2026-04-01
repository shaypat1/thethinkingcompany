import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './games.css'

const EMOJI_POOL = ['🌀','🔥','💎','🌙','⚡','🍀','🎯','🌊','🦊','🐙','🎪','🌸','🦋','🔮','🎭','🌍','🦁','🎨','🏔️','🌈']

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildDeck(pairs) {
  const emojis = shuffle(EMOJI_POOL).slice(0, pairs)
  return shuffle([...emojis, ...emojis]).map((emoji, i) => ({ id: i, emoji, matched: false }))
}

export default function CardMatchingRenderer() {
  const [level, setLevel] = useState(1)
  const [cols, setCols] = useState(4)
  const [rows, setRows] = useState(3)
  const [cards, setCards] = useState([])
  const [flipped, setFlipped] = useState([])
  const [moves, setMoves] = useState(0)
  const [phase, setPhase] = useState('start')
  const lockRef = useRef(false)
  const timeoutRef = useRef(null)

  function startRound(c, r) {
    setCards(buildDeck((c * r) / 2))
    setFlipped([]); setMoves(0); setCols(c); setRows(r); setPhase('play')
  }

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  function handleCardClick(idx) {
    if (phase !== 'play' || lockRef.current || flipped.includes(idx) || cards[idx].matched) return
    const newFlipped = [...flipped, idx]
    setFlipped(newFlipped)

    if (newFlipped.length === 2) {
      setMoves(m => m + 1)
      lockRef.current = true
      const [a, b] = newFlipped
      if (cards[a].emoji === cards[b].emoji) {
        timeoutRef.current = setTimeout(() => {
          const nc = cards.map((c, i) => i === a || i === b ? { ...c, matched: true } : c)
          setCards(nc); setFlipped([]); lockRef.current = false
          if (nc.every(c => c.matched)) {
            const nl = level + 1; setLevel(nl)
            let nextC = cols, nextR = rows
            if (nl % 2 === 0) nextC = Math.min(nextC + 1, 6); else nextR = Math.min(nextR + 1, 5)
            if ((nextC * nextR) % 2 !== 0) nextR += 1
            timeoutRef.current = setTimeout(() => startRound(nextC, nextR), 600)
          }
        }, 300)
      } else {
        timeoutRef.current = setTimeout(() => { setFlipped([]); lockRef.current = false }, 700)
      }
    }
  }

  if (phase === 'start') {
    return (
      <div className="game-hero">
        <div className="game-start">
          <div className="game-start-icon">🃏</div>
          <h1>Card Matching</h1>
          <p>Flip two cards at a time and find all matching pairs. The grid grows as you progress.</p>
          <button className="game-btn" onClick={() => startRound(cols, rows)}>Start</button>
        </div>
      </div>
    )
  }

  const matched = cards.filter(c => c.matched).length
  const cardSize = Math.max(48, Math.min(68, 380 / Math.max(cols, rows)))

  return (
    <div className="game-hero">
      <div className="game-info">Level {level} · {matched}/{cards.length} found · {moves} moves</div>
      <div className="game-cards" style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        width: cardSize * cols + (cols - 1) * 8,
      }}>
        {cards.map((card, i) => {
          const isFlipped = flipped.includes(i)
          const isMatched = card.matched
          let cls = 'game-card'
          if (isFlipped) cls += ' flipped'
          if (isMatched) cls += ' matched'
          return (
            <div key={i} className={cls} onClick={() => handleCardClick(i)}
              style={{ width: cardSize, height: cardSize }}>
              {(isFlipped || isMatched) ? card.emoji : ''}
            </div>
          )
        })}
      </div>
    </div>
  )
}
