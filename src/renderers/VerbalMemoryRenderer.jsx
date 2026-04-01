import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import './games.css'

const WORD_POOL = [
  'abstract','ancient','balance','beacon','canvas','cipher','dawn','echo','flame','glacier',
  'harbor','impulse','journey','karma','lunar','mirage','nexus','orbit','prism','quest',
  'riddle','shadow','tempest','unity','vertex','whisper','zenith','anchor','bridge','cosmos',
  'drift','ember','fossil','garden','hollow','island','jungle','kinetic','lantern','marble',
  'nebula','oasis','palace','quartz','river','spiral','thunder','umbra','voyage','wander',
  'axiom','blaze','crystal','delta','enigma','fractal','gravity','horizon','insight','jewel',
  'kernel','lotus','meadow','nimble','ocean','paradox','quantum','realm','summit','twilight',
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function VerbalMemoryRenderer() {
  const [phase, setPhase] = useState('start')
  const [score, setScore] = useState(0)
  const [strikes, setStrikes] = useState(0)
  const [seen, setSeen] = useState(new Set())
  const [currentWord, setCurrentWord] = useState('')
  const [feedback, setFeedback] = useState(null)
  const pool = useMemo(() => shuffle(WORD_POOL), [])
  const [poolIdx, setPoolIdx] = useState(0)

  function start() {
    setCurrentWord(pool[0]); setPoolIdx(1); setSeen(new Set())
    setScore(0); setStrikes(0); setFeedback(null); setPhase('play')
  }

  function handleAnswer(answeredSeen) {
    const wasSeen = seen.has(currentWord)
    const correct = answeredSeen === wasSeen

    if (correct) { setScore(s => s + 1); setFeedback('correct') }
    else {
      const s = strikes + 1; setStrikes(s); setFeedback('wrong')
      if (s >= 3) { setPhase('done'); return }
    }

    const newSeen = new Set(seen); newSeen.add(currentWord); setSeen(newSeen)
    setTimeout(() => {
      setFeedback(null)
      if (newSeen.size > 0 && Math.random() < 0.4) {
        const arr = [...newSeen]; setCurrentWord(arr[Math.floor(Math.random() * arr.length)])
      } else {
        const idx = poolIdx; setPoolIdx(i => i + 1); setCurrentWord(pool[idx % pool.length])
      }
    }, 400)
  }

  if (phase === 'start') {
    return (
      <div className="game-hero">
        <div className="game-start">
          <div className="game-start-icon">💬</div>
          <h1>Verbal Memory</h1>
          <p>Words appear one at a time. Have you seen it before, or is it new?</p>
          <button className="game-btn" onClick={start}>Start</button>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="game-hero">
        <div className="game-over">
          <div className="game-over-score">{score}</div>
          <div className="game-over-label">correct</div>
          <div className="game-over-detail">{seen.size} unique words seen</div>
          <Link to="/" className="game-over-back">Back to Track</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="game-hero">
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <span className="game-badge">{score}</span><br/><span className="game-badge-label">Score</span>
      </div>
      <div className="game-word" style={{ opacity: feedback ? 0.5 : 1 }}>{currentWord}</div>
      <div className="game-feedback" style={{ marginBottom: '0.5rem' }}>
        {feedback === 'correct' && 'Correct!'}
        {feedback === 'wrong' && 'Wrong!'}
      </div>
      <div className="game-btn-row">
        <button className="game-btn" onClick={() => handleAnswer(true)} disabled={!!feedback}>Seen</button>
        <button className="game-btn-secondary" onClick={() => handleAnswer(false)} disabled={!!feedback}>New</button>
      </div>
    </div>
  )
}
