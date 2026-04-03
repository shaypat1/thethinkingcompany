import { useState, useRef } from 'react'
import './TestAnalogies.css'

const QUESTIONS = [
  { words: ['HOT', 'COLD', 'BIG'], choices: ['LARGE', 'SMALL', 'WARM', 'HEAVY'], answer: 1, elo: 800 },
  { words: ['DOG', 'PUPPY', 'CAT'], choices: ['FELINE', 'KITTEN', 'CUB', 'PAW'], answer: 1, elo: 900 },
  { words: ['BOOK', 'READ', 'SONG'], choices: ['SING', 'WRITE', 'LISTEN', 'DANCE'], answer: 2, elo: 1000 },
  { words: ['PEN', 'INK', 'BRUSH'], choices: ['CANVAS', 'PAINT', 'STROKE', 'COLOR'], answer: 1, elo: 1100 },
  { words: ['MANSION', 'HOUSE', 'FEAST'], choices: ['BANQUET', 'MEAL', 'FOOD', 'SNACK'], answer: 1, elo: 1200 },
  { words: ['ARCHIPELAGO', 'ISLAND', 'CONSTELLATION'], choices: ['GALAXY', 'STAR', 'PLANET', 'SKY'], answer: 1, elo: 1300 },
  { words: ['SURGEON', 'SCALPEL', 'SCULPTOR'], choices: ['MARBLE', 'CHISEL', 'STATUE', 'HAMMER'], answer: 1, elo: 1400 },
  { words: ['FAMINE', 'HUNGER', 'DELUGE'], choices: ['RAIN', 'DROUGHT', 'FLOOD', 'STORM'], answer: 2, elo: 1500 },
  { words: ['PREAMBLE', 'CONSTITUTION', 'OVERTURE'], choices: ['ORCHESTRA', 'CONCERTO', 'OPERA', 'MELODY'], answer: 2, elo: 1600 },
  { words: ['SYCOPHANT', 'FLATTERY', 'ASCETIC'], choices: ['POVERTY', 'SELF-DENIAL', 'MEDITATION', 'WORSHIP'], answer: 1, elo: 1700 },
  { words: ['CARTOGRAPHY', 'MAPS', 'ENTOMOLOGY'], choices: ['WORDS', 'INSECTS', 'FOSSILS', 'STARS'], answer: 1, elo: 1800 },
  { words: ['APOGEE', 'NADIR', 'ZENITH'], choices: ['SUMMIT', 'PERIGEE', 'MERIDIAN', 'ECLIPSE'], answer: 1, elo: 1900 },
]

export default function TestAnalogies() {
  const [phase, setPhase] = useState('start')
  const [index, setIndex] = useState(0)
  const [dragging, setDragging] = useState(null) // index of choice being dragged
  const [placed, setPlaced] = useState(null) // index of choice placed in slot
  const [result, setResult] = useState(null) // 'correct' | 'wrong' | null
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState([])
  const slotRef = useRef(null)

  function handleStart() {
    setIndex(0); setScore(0); setAnswers([]); setPlaced(null); setResult(null); setDragging(null)
    setPhase('playing')
  }

  function handleDragStart(choiceIdx) {
    if (result !== null) return
    setDragging(choiceIdx)
  }

  function handleDragEnd() {
    setDragging(null)
  }

  function handleDrop(e) {
    e.preventDefault()
    if (dragging === null || result !== null) return
    submitAnswer(dragging)
  }

  function handleDragOver(e) {
    e.preventDefault()
  }

  // Also support click to place
  function handleChoiceClick(choiceIdx) {
    if (result !== null) return
    submitAnswer(choiceIdx)
  }

  function submitAnswer(choiceIdx) {
    const question = QUESTIONS[index]
    const isCorrect = choiceIdx === question.answer
    setPlaced(choiceIdx)
    setResult(isCorrect ? 'correct' : 'wrong')
    setDragging(null)
    if (isCorrect) setScore(s => s + 1)
    setAnswers(prev => [...prev, isCorrect])

    setTimeout(() => {
      if (index + 1 >= QUESTIONS.length) {
        setPhase('done')
      } else {
        setIndex(index + 1)
        setPlaced(null)
        setResult(null)
        setPhase('playing')
      }
    }, 1500)
  }

  if (phase === 'start') {
    return (
      <div className="an-wrapper">
        <div className="an-scanlines" />
        <div className="an-content">
          <h1 className="an-title">ANALOGIES</h1>
          <div className="an-rules">
            <p>DRAG THE ANSWER TO COMPLETE THE ANALOGY.</p>
          </div>
          <div className="an-preview-boxes">
            <div className="an-box filled">A</div>
            <div className="an-separator">:</div>
            <div className="an-box filled">B</div>
            <div className="an-separator">::</div>
            <div className="an-box filled">C</div>
            <div className="an-separator">:</div>
            <div className="an-box empty">?</div>
          </div>
          <button className="an-start-btn" onClick={handleStart}>START</button>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="an-wrapper">
        <div className="an-scanlines" />
        <div className="an-content">
          <h1 className="an-title">ANALOGIES</h1>
          <div className="an-score">{score}/{QUESTIONS.length}</div>
          <div className="an-score-label">CORRECT</div>
          <div className="an-dots">
            {answers.map((a, i) => (
              <div key={i} className={`an-dot ${a ? 'right' : 'wrong'}`} />
            ))}
          </div>
          <button className="an-start-btn" onClick={handleStart}>RETRY</button>
        </div>
      </div>
    )
  }

  const question = QUESTIONS[index]

  return (
    <div className="an-wrapper">
      <div className="an-scanlines" />
      <div className="an-content">
        <h1 className="an-title">ANALOGIES</h1>
        <div className="an-progress">ROUND {index + 1}/{QUESTIONS.length}</div>

        {/* The 4 boxes — 3 filled, 1 drop target */}
        <div className="an-boxes">
          <div className="an-box filled">{question.words[0]}</div>
          <div className="an-separator">:</div>
          <div className="an-box filled">{question.words[1]}</div>
          <div className="an-separator">::</div>
          <div className="an-box filled">{question.words[2]}</div>
          <div className="an-separator">:</div>
          <div
            ref={slotRef}
            className={`an-box drop-target ${result || ''} ${dragging !== null ? 'hover-ready' : ''}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {placed !== null ? question.choices[placed] : '?'}
          </div>
        </div>

        {/* Draggable choices */}
        <div className="an-choices-tray">
          {question.choices.map((choice, i) => {
            let cls = 'an-drag-choice'
            if (placed !== null) {
              if (i === question.answer) cls += ' answer'
              else if (i === placed && result === 'wrong') cls += ' wrong-pick'
              else cls += ' dim'
            }
            if (i === placed) cls += ' placed'

            return (
              <div
                key={i}
                className={cls}
                draggable={result === null}
                onDragStart={() => handleDragStart(i)}
                onDragEnd={handleDragEnd}
                onClick={() => handleChoiceClick(i)}
              >
                {choice}
              </div>
            )
          })}
        </div>

        {result && (
          <div className={`an-feedback ${result}`}>
            {result === 'correct' ? 'CORRECT' : `ANSWER: ${question.choices[question.answer]}`}
          </div>
        )}
      </div>
    </div>
  )
}
