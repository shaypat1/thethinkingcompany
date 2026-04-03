import { useState, useMemo } from 'react'
import './ThinkingTest.css'

// ─── Question bank — all questions with ELO ───
const QUESTION_BANK = [
  // Analogies (800-1900)
  { id: 'an1', type: 'analogy', elo: 800, words: ['HOT','COLD','BIG'], choices: ['LARGE','SMALL','WARM','HEAVY'], answer: 1 },
  { id: 'an2', type: 'analogy', elo: 900, words: ['DOG','PUPPY','CAT'], choices: ['FELINE','KITTEN','CUB','PAW'], answer: 1 },
  { id: 'an3', type: 'analogy', elo: 1000, words: ['BOOK','READ','SONG'], choices: ['SING','WRITE','LISTEN','DANCE'], answer: 2 },
  { id: 'an4', type: 'analogy', elo: 1100, words: ['PEN','INK','BRUSH'], choices: ['CANVAS','PAINT','STROKE','COLOR'], answer: 1 },
  { id: 'an5', type: 'analogy', elo: 1300, words: ['ARCHIPELAGO','ISLAND','CONSTELLATION'], choices: ['GALAXY','STAR','PLANET','SKY'], answer: 1 },
  { id: 'an6', type: 'analogy', elo: 1500, words: ['FAMINE','HUNGER','DELUGE'], choices: ['RAIN','DROUGHT','FLOOD','STORM'], answer: 2 },
  { id: 'an7', type: 'analogy', elo: 1700, words: ['SYCOPHANT','FLATTERY','ASCETIC'], choices: ['POVERTY','SELF-DENIAL','MEDITATION','WORSHIP'], answer: 1 },
  { id: 'an8', type: 'analogy', elo: 1900, words: ['APOGEE','NADIR','ZENITH'], choices: ['SUMMIT','PERIGEE','MERIDIAN','ECLIPSE'], answer: 1 },

  // AI Flaws (800-1800)
  { id: 'fl1', type: 'flaw', elo: 800, title: 'APPEAL TO AUTHORITY', argument: 'AN AI CHATBOT TELLS A STUDENT THAT "HISTORIANS WIDELY AGREE THE ROMAN EMPIRE FELL DUE TO MORAL DECAY." THE STUDENT ACCEPTS THIS WITHOUT CHECKING.',
    choices: ['REPETITION IN TRAINING DATA DOESN\'T EQUAL VERIFIED FACT — THIS IS APPEAL TO AUTHORITY','THE STUDENT SHOULD USE A DIFFERENT AI','HISTORIANS DO AGREE SO THE AI IS CORRECT','AI SHOULDN\'T BE USED FOR HOMEWORK'], answer: 0 },
  { id: 'fl2', type: 'flaw', elo: 1200, title: 'CORRELATION VS. CAUSATION', argument: 'AN AI REPORTS: "COUNTRIES WITH HIGHER ICE CREAM CONSUMPTION HAVE HIGHER DROWNING RATES. THEREFORE ICE CREAM INCREASES DROWNING RISK."',
    choices: ['THE AI CORRECTLY IDENTIFIED THE PATTERN','HOT WEATHER INCREASES BOTH — THE AI CONFUSED CORRELATION WITH CAUSATION','THE DATASET MUST BE WRONG','AI CAN\'T UNDERSTAND HEALTH DATA'], answer: 1 },
  { id: 'fl3', type: 'flaw', elo: 1600, title: 'HASTY GENERALIZATION', argument: 'AN AI TUTOR TESTED IN 3 WELL-FUNDED SUBURBAN SCHOOLS SHOWS 15% MATH IMPROVEMENT. THE COMPANY CLAIMS IT WORKS FOR ALL STUDENTS.',
    choices: ['15% PROVES IT WORKS FOR EVERYONE','THREE SCHOOLS ISN\'T ENOUGH BUT PROBABLY RIGHT','THEY GENERALIZED FROM AN UNREPRESENTATIVE SAMPLE — UNDER-RESOURCED SCHOOLS MAY GET DIFFERENT RESULTS','MATH SCORES DON\'T MEASURE AI EFFECTIVENESS'], answer: 2 },
]

const TOTAL_QUESTIONS = 7
const K_FACTOR = 32
const LABELS = ['A', 'B', 'C', 'D']

function calcStartElo(age) {
  return Math.round(800 + (age / 116) * 200)
}

function calcExpected(playerElo, questionElo) {
  return 1 / (1 + Math.pow(10, (questionElo - playerElo) / 400))
}

function pickQuestion(playerElo, usedIds) {
  const available = QUESTION_BANK.filter(q => !usedIds.includes(q.id))
  if (available.length === 0) return null
  available.sort((a, b) => Math.abs(a.elo - playerElo) - Math.abs(b.elo - playerElo))
  return available[0]
}

export default function ThinkingTest() {
  const [phase, setPhase] = useState('landing') // landing | playing | feedback | email | results
  const [age, setAge] = useState('')
  const [error, setError] = useState(null)
  const [elo, setElo] = useState(800)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [usedIds, setUsedIds] = useState([])
  const [selected, setSelected] = useState(null)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([]) // { question, correct, eloBefore, eloAfter }
  const [email, setEmail] = useState('')

  function handleStart() {
    if (!age || parseInt(age) < 1) { setError('SELECT YOUR AGE'); return }
    setError(null)
    const startElo = calcStartElo(parseInt(age))
    setElo(startElo)
    setQuestionIndex(0)
    setUsedIds([])
    setHistory([])
    const first = pickQuestion(startElo, [])
    setCurrentQuestion(first)
    setUsedIds([first.id])
    setSelected(null)
    setResult(null)
    setPhase('playing')
  }

  function handleAnswer(choiceIdx) {
    if (selected !== null) return
    const correct = choiceIdx === currentQuestion.answer
    const expected = calcExpected(elo, currentQuestion.elo)
    const newElo = Math.round(elo + K_FACTOR * ((correct ? 1 : 0) - expected))

    setSelected(choiceIdx)
    setResult(correct ? 'correct' : 'wrong')
    setHistory(prev => [...prev, { question: currentQuestion, correct, eloBefore: elo, eloAfter: newElo }])
    setElo(newElo)
    setPhase('feedback')
  }

  function handleNext() {
    const nextIdx = questionIndex + 1
    if (nextIdx >= TOTAL_QUESTIONS) {
      setPhase('email')
      return
    }
    const next = pickQuestion(elo, usedIds)
    if (!next) { setPhase('email'); return }
    setCurrentQuestion(next)
    setUsedIds(prev => [...prev, next.id])
    setQuestionIndex(nextIdx)
    setSelected(null)
    setResult(null)
    setPhase('playing')
  }

  function handleEmailSubmit() {
    if (!email.trim() || !email.includes('@')) { setError('ENTER A VALID EMAIL'); return }
    setError(null)
    setPhase('results')
  }

  // ─── LANDING ───
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
              <input className="tt-slider" type="range" min="0" max="116" step="1" value={age || 0}
                onChange={e => { setAge(e.target.value); setError(null) }} />
              <div className="tt-age-hint">PLEASE ENTER CORRECT AGE TO START TEST PROPERLY</div>
            </div>
            {error && <div className="tt-error">{error}</div>}
            <button className="tt-start-btn" onClick={handleStart}>START</button>
          </div>
        </div>
      </div>
    )
  }

  // ─── PLAYING / FEEDBACK ───
  if ((phase === 'playing' || phase === 'feedback') && currentQuestion) {
    const q = currentQuestion
    return (
      <div className="tt-wrapper">
        <div className="tt-scanlines" />

        {/* ELO box top left */}
        <div className="tt-elo-box">
          <div className="tt-elo-label">ELO</div>
          <div className="tt-elo-value">{elo}</div>
        </div>

        {/* Progress top right */}
        <div className="tt-progress-box">
          <div className="tt-progress-text">{questionIndex + 1}/{TOTAL_QUESTIONS}</div>
        </div>

        <div className="tt-content tt-content-game">
          {/* Question type header */}
          <div className="tt-q-type">{q.type === 'analogy' ? 'ANALOGY' : 'AI FLAW'}</div>
          <div className="tt-q-elo">QUESTION ELO: {q.elo}</div>

          {/* Analogy type */}
          {q.type === 'analogy' && (
            <>
              <div className="tt-analogy-boxes">
                <div className="tt-a-box">{q.words[0]}</div>
                <div className="tt-a-sep">:</div>
                <div className="tt-a-box">{q.words[1]}</div>
                <div className="tt-a-sep">::</div>
                <div className="tt-a-box">{q.words[2]}</div>
                <div className="tt-a-sep">:</div>
                <div className="tt-a-box tt-a-empty">{selected !== null ? q.choices[selected] : '?'}</div>
              </div>
              <div className="tt-choices">
                {q.choices.map((c, i) => {
                  let cls = 'tt-choice'
                  if (selected !== null) {
                    if (i === q.answer) cls += ' correct'
                    else if (i === selected) cls += ' wrong'
                    else cls += ' dim'
                  }
                  return (
                    <button key={i} className={cls} onClick={() => handleAnswer(i)}>
                      <span className="tt-choice-label">{LABELS[i]}</span>
                      <span className="tt-choice-text">{c}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* Flaw type */}
          {q.type === 'flaw' && (
            <>
              <div className="tt-flaw-title">{q.title}</div>
              <div className="tt-flaw-argument">{q.argument}</div>
              <div className="tt-choices">
                {q.choices.map((c, i) => {
                  let cls = 'tt-choice'
                  if (selected !== null) {
                    if (i === q.answer) cls += ' correct'
                    else if (i === selected) cls += ' wrong'
                    else cls += ' dim'
                  }
                  return (
                    <button key={i} className={cls} onClick={() => handleAnswer(i)}>
                      <span className="tt-choice-label">{LABELS[i]}</span>
                      <span className="tt-choice-text">{c}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* Feedback */}
          {phase === 'feedback' && (
            <div className="tt-feedback-bar">
              <span className={`tt-feedback-text ${result}`}>{result === 'correct' ? 'CORRECT' : 'INCORRECT'}</span>
              <span className={`tt-elo-change ${result}`}>
                {result === 'correct' ? '+' : ''}{history[history.length - 1]?.eloAfter - history[history.length - 1]?.eloBefore} ELO
              </span>
              <button className="tt-next-btn" onClick={handleNext}>
                {questionIndex + 1 >= TOTAL_QUESTIONS ? 'FINISH' : 'NEXT'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── EMAIL ───
  if (phase === 'email') {
    const correct = history.filter(h => h.correct).length
    return (
      <div className="tt-wrapper">
        <div className="tt-scanlines" />
        <div className="tt-content">
          <h1 className="tt-title-sm">TEST COMPLETE</h1>
          <div className="tt-complete-stats">
            <span>{correct}/{TOTAL_QUESTIONS} CORRECT</span>
          </div>
          <div className="tt-email-prompt">ENTER YOUR EMAIL TO SEE YOUR RESULTS</div>
          <input className="tt-email-input" type="email" value={email} placeholder="YOUR@EMAIL.COM"
            onChange={e => { setEmail(e.target.value.toUpperCase()); setError(null) }}
            onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()} />
          {error && <div className="tt-error">{error}</div>}
          <button className="tt-start-btn" onClick={handleEmailSubmit}>SUBMIT</button>
        </div>
      </div>
    )
  }

  // ─── RESULTS ───
  if (phase === 'results') {
    const correct = history.filter(h => h.correct).length
    return (
      <div className="tt-wrapper">
        <div className="tt-scanlines" />
        <div className="tt-content">
          <h1 className="tt-title-sm">YOUR RESULTS</h1>
          <div className="tt-final-elo">{elo}</div>
          <div className="tt-final-label">THINKING ELO</div>
          <div className="tt-final-stats">{correct}/{TOTAL_QUESTIONS} CORRECT</div>
          <div className="tt-history">
            {history.map((h, i) => (
              <div key={i} className={`tt-history-item ${h.correct ? 'correct' : 'wrong'}`}>
                <span className="tt-history-num">{i + 1}</span>
                <span className="tt-history-type">{h.question.type === 'analogy' ? 'ANALOGY' : 'AI FLAW'}</span>
                <span className="tt-history-result">{h.correct ? 'CORRECT' : 'WRONG'}</span>
                <span className="tt-history-elo">{h.eloBefore} → {h.eloAfter}</span>
              </div>
            ))}
          </div>
          <button className="tt-start-btn" onClick={() => { setPhase('landing'); setAge(''); setEmail('') }}>
            RETAKE TEST
          </button>
        </div>
      </div>
    )
  }

  return null
}
