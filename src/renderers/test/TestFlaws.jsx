import { useState } from 'react'
import './TestFlaws.css'

const PROBLEMS = [
  {
    elo: 800,
    title: 'APPEAL TO AUTHORITY',
    argument: 'AN AI CHATBOT TELLS A STUDENT THAT "HISTORIANS WIDELY AGREE THE ROMAN EMPIRE FELL PRIMARILY DUE TO MORAL DECAY." THE STUDENT INCLUDES THIS IN THEIR ESSAY WITHOUT CHECKING. THE AI GENERATED THIS CLAIM BECAUSE ITS TRAINING DATA CONTAINED MANY TEXTBOOKS REPEATING THIS OVERSIMPLIFIED NARRATIVE.',
    choices: [
      { text: 'THE AI PRESENTED CONSENSUS LANGUAGE AS INDISPUTABLE TRUTH — REPETITION IN TRAINING DATA DOESN\'T EQUAL VERIFIED FACT', label: 'A' },
      { text: 'THE STUDENT SHOULD HAVE USED A DIFFERENT AI INSTEAD', label: 'B' },
      { text: 'HISTORIANS DO AGREE ON THIS SO THE AI IS CORRECT', label: 'C' },
      { text: 'AI SHOULDN\'T BE USED FOR HISTORY HOMEWORK', label: 'D' },
    ],
    answer: 0,
  },
  {
    elo: 1000,
    title: 'CHERRY-PICKING',
    argument: 'AN AI-GENERATED LESSON STATES: "EUROPEAN COLONIZATION BROUGHT INFRASTRUCTURE, EDUCATION, AND MODERN GOVERNANCE TO COLONIZED REGIONS." THE LESSON CITES SEVERAL EXAMPLES OF SCHOOLS AND RAILWAYS BUILT DURING COLONIAL PERIODS BUT MAKES NO MENTION OF EXPLOITATION, FORCED LABOR, FAMINES, OR CULTURAL DESTRUCTION.',
    choices: [
      { text: 'THE AI SELECTED ONLY DATA THAT FITS A POSITIVE NARRATIVE WHILE IGNORING MASSIVE COUNTEREVIDENCE — THIS IS CHERRY-PICKING', label: 'A' },
      { text: 'THE AI IS CORRECT BECAUSE IT CITED REAL EXAMPLES', label: 'B' },
      { text: 'COLONIZATION IS TOO COMPLEX FOR AI TO SUMMARIZE', label: 'C' },
      { text: 'THE LESSON IS FINE BECAUSE IT DOESN\'T SAY COLONIZATION WAS GOOD', label: 'D' },
    ],
    answer: 0,
  },
  {
    elo: 1200,
    title: 'CORRELATION VS. CAUSATION',
    argument: 'AN AI HEALTH PLATFORM TELLS USERS: "COUNTRIES WITH HIGHER ICE CREAM CONSUMPTION HAVE HIGHER RATES OF DROWNING. THEREFORE, EATING ICE CREAM INCREASES YOUR RISK OF DROWNING." IT GENERATED THIS FROM A REAL STATISTICAL CORRELATION IN ITS TRAINING DATA.',
    choices: [
      { text: 'THE AI CORRECTLY IDENTIFIED A REAL STATISTICAL PATTERN', label: 'A' },
      { text: 'THE CORRELATION IS CAUSED BY A THIRD VARIABLE (HOT WEATHER INCREASES BOTH ICE CREAM SALES AND SWIMMING) — THE AI CONFUSED CORRELATION WITH CAUSATION', label: 'B' },
      { text: 'THE DATASET MUST BE WRONG', label: 'C' },
      { text: 'AI ISN\'T CAPABLE OF UNDERSTANDING HEALTH DATA', label: 'D' },
    ],
    answer: 1,
  },
  {
    elo: 1400,
    title: 'FALSE DICHOTOMY',
    argument: 'A GOVERNMENT OFFICIAL ARGUES: "WE MUST CHOOSE — EITHER WE FULLY INTEGRATE AI INTO OUR NATIONAL CURRICULUM OR WE FALL BEHIND EVERY OTHER COUNTRY. THERE IS NO MIDDLE GROUND." AN AI POLICY BRIEF SUPPORTS THIS BY SHOWING TWO SCENARIOS: FULL AI ADOPTION (GDP GROWTH) VS. NO AI (ECONOMIC DECLINE).',
    choices: [
      { text: 'THE OFFICIAL IS RIGHT — COUNTRIES MUST CHOOSE ONE EXTREME OR THE OTHER', label: 'A' },
      { text: 'THE AI BRIEF CONFIRMS THE CLAIM WITH DATA', label: 'B' },
      { text: 'THIS IS A FALSE DICHOTOMY — HYBRID MODELS COMBINING AI WITH HUMAN OVERSIGHT EXIST AS A THIRD OPTION THE ARGUMENT DELIBERATELY EXCLUDES', label: 'C' },
      { text: 'ECONOMIC DATA ALWAYS SUPPORTS FULL AI ADOPTION', label: 'D' },
    ],
    answer: 2,
  },
  {
    elo: 1600,
    title: 'HASTY GENERALIZATION',
    argument: 'AN AI TUTORING SYSTEM IS TESTED IN THREE SCHOOLS. STUDENTS IN THOSE SCHOOLS SCORE 15% HIGHER ON MATH TESTS. THE COMPANY ANNOUNCES: "AI TUTORING IMPROVES MATH SCORES BY 15% ACROSS ALL STUDENT POPULATIONS." THE COMPANY DOES NOT MENTION THE THREE SCHOOLS WERE ALL WELL-FUNDED SUBURBAN SCHOOLS WITH SMALL CLASS SIZES.',
    choices: [
      { text: 'THE 15% IMPROVEMENT PROVES AI TUTORING WORKS FOR EVERYONE', label: 'A' },
      { text: 'THREE SCHOOLS ISN\'T ENOUGH DATA BUT THE CONCLUSION IS PROBABLY RIGHT', label: 'B' },
      { text: 'THE COMPANY GENERALIZED FROM A NARROW, UNREPRESENTATIVE SAMPLE TO ALL STUDENTS — IGNORING THAT RESULTS IN UNDER-RESOURCED SCHOOLS COULD BE COMPLETELY DIFFERENT', label: 'C' },
      { text: 'MATH SCORES ARE NOT A GOOD MEASURE OF AI EFFECTIVENESS', label: 'D' },
    ],
    answer: 2,
  },
  {
    elo: 1800,
    title: 'THE CONFIDENCE TRAP',
    argument: 'A STUDENT ASKS AN AI TO EXPLAIN QUANTUM MECHANICS. THE AI RESPONDS WITH A DETAILED, WELL-STRUCTURED, CONFIDENTLY-WORDED EXPLANATION. IT INCLUDES SEVERAL CLAIMS THAT ARE SUBTLY WRONG — CONFLATING QUANTUM ENTANGLEMENT WITH FASTER-THAN-LIGHT COMMUNICATION. THE STUDENT, IMPRESSED BY THE TONE AND STRUCTURE, ACCEPTS IT ALL.',
    choices: [
      { text: 'THE AI\'S EXPLANATION IS TRUSTWORTHY BECAUSE IT SOUNDS AUTHORITATIVE', label: 'A' },
      { text: 'THE STUDENT SHOULD HAVE ASKED A MORE ADVANCED AI MODEL', label: 'B' },
      { text: 'AI SYSTEMS OPTIMIZE FOR CONFIDENT-SOUNDING OUTPUT, NOT TRUTH — THE STUDENT MISTOOK FLUENCY FOR ACCURACY, WHICH IS THE CORE DANGER OF TREATING AI AS A NEUTRAL ORACLE', label: 'C' },
      { text: 'QUANTUM MECHANICS IS TOO HARD FOR AI', label: 'D' },
    ],
    answer: 2,
  },
]

const LABELS = ['A', 'B', 'C', 'D']

export default function TestFlaws({ question: singleQuestion, onAnswer }) {
  const [phase, setPhase] = useState(singleQuestion ? 'playing' : 'start')
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [result, setResult] = useState(null)
  const [score, setScore] = useState(0)

  function handleStart() {
    setIndex(0); setScore(0); setSelected(null); setResult(null)
    setPhase('playing')
  }

  function handleSelect(choiceIdx) {
    if ((phase !== 'playing' && !singleQuestion) || selected !== null) return
    const problem = singleQuestion || PROBLEMS[index]
    const isCorrect = choiceIdx === problem.answer
    setSelected(choiceIdx)
    setResult(isCorrect ? 'correct' : 'wrong')

    // Single-question mode: call back, don't manage game flow
    if (singleQuestion) {
      if (onAnswer) onAnswer(isCorrect)
      return
    }

    if (isCorrect) setScore(s => s + 1)
    setPhase('feedback')
  }

  function handleNext() {
    if (result === 'wrong') { setPhase('gameover'); return }
    if (index + 1 >= PROBLEMS.length) { setPhase('win'); return }
    setIndex(index + 1); setSelected(null); setResult(null); setPhase('playing')
  }

  if (phase === 'start') {
    return (
      <div className="fl-wrapper">
        <div className="fl-scanlines" />
        <div className="fl-content">
          <h1 className="fl-title">AI FLAWS</h1>
          <div className="fl-rules">
            <p>READ THE AI ARGUMENT.</p>
            <p>FIND THE FLAW IN THE REASONING.</p>
            <p>ONE WRONG ANSWER AND IT'S OVER.</p>
          </div>
          <button className="fl-btn" onClick={handleStart}>START</button>
        </div>
      </div>
    )
  }

  if (phase === 'gameover') {
    return (
      <div className="fl-wrapper">
        <div className="fl-scanlines" />
        <div className="fl-content">
          <h1 className="fl-title">AI FLAWS</h1>
          <div className="fl-score">{score}/{PROBLEMS.length}</div>
          <div className="fl-score-label">GAME OVER</div>
          <button className="fl-btn" onClick={handleStart}>RETRY</button>
        </div>
      </div>
    )
  }

  if (phase === 'win') {
    return (
      <div className="fl-wrapper">
        <div className="fl-scanlines" />
        <div className="fl-content">
          <h1 className="fl-title">AI FLAWS</h1>
          <div className="fl-score">{score}/{PROBLEMS.length}</div>
          <div className="fl-score-label">ALL FLAWS IDENTIFIED</div>
          <button className="fl-btn" onClick={handleStart}>PLAY AGAIN</button>
        </div>
      </div>
    )
  }

  const problem = singleQuestion || PROBLEMS[index]

  return (
    <div className="fl-wrapper">
      <div className="fl-scanlines" />
      <div className="fl-content fl-content-game">
        {!singleQuestion && <h1 className="fl-title">AI FLAWS</h1>}
        {!singleQuestion && <div className="fl-round">ROUND {index + 1}/{PROBLEMS.length}</div>}
        <div className="fl-problem-title">{problem.title}</div>

        <div className="fl-argument">{problem.argument}</div>

        <div className="fl-prompt">IDENTIFY THE CORRECT REASONING:</div>

        <div className="fl-choices">
          {problem.choices.map((choice, i) => {
            let cls = 'fl-choice'
            if (selected !== null) {
              if (i === problem.answer) cls += ' correct'
              else if (i === selected && result === 'wrong') cls += ' wrong'
              else cls += ' dim'
            }
            return (
              <button key={i} className={cls} onClick={() => handleSelect(i)}>
                <span className="fl-choice-label">{choice.label}</span>
                <span className="fl-choice-text">{choice.text}</span>
              </button>
            )
          })}
        </div>

        {!singleQuestion && phase === 'feedback' && (
          <div className="fl-result">
            <div className={`fl-result-text ${result}`}>
              {result === 'correct' ? 'CORRECT' : 'INCORRECT'}
            </div>
            <button className="fl-btn" onClick={handleNext}>
              {result === 'correct' ? (index + 1 >= PROBLEMS.length ? 'FINISH' : 'NEXT ROUND') : 'CONTINUE'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
