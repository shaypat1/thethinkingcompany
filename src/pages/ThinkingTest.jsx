import { useState, useRef } from 'react'
import { createTestTracker } from '../lib/testTracker'
import GravityRenderer from '../renderers/test/TestGravity'
import TestSequenceMemory from '../renderers/test/TestSequenceMemory'
import TestChimpTest from '../renderers/test/TestChimpTest'
import TestAnalogies from '../renderers/test/TestAnalogies'
import TestFlaws from '../renderers/test/TestFlaws'
import RobotRenderer from '../renderers/test/TestRobot'
import TestFables from '../renderers/test/TestFables'
import PirateRenderer from '../renderers/test/TestPirate'
import rb001 from '../content/robot/rb001.json'
import './ThinkingTest.css'

// ─── Gravity rounds — each round is one ELO "question" ───
const GRAVITY_ROUNDS = [
  { id: 'gv1', type: 'gravity', elo: 800, label: 'BASIC ADD/SUBTRACT',
    questions: [
      { q: '7 + 4', a: '11' }, { q: '3 + 9', a: '12' }, { q: '8 + 6', a: '14' }, { q: '9 - 7', a: '2' },
    ]},
  { id: 'gv2', type: 'gravity', elo: 900, label: 'TWO-DIGIT ADD/SUBTRACT',
    questions: [
      { q: '13 + 5', a: '18' }, { q: '6 + 17', a: '23' }, { q: '28 + 9', a: '37' }, { q: '14 - 9', a: '5' },
    ]},
  { id: 'gv3', type: 'gravity', elo: 1000, label: 'MULTIPLICATION & DIVISION',
    questions: [
      { q: '8 x 9', a: '72' }, { q: '54 x 8', a: '432' }, { q: '56 / 8', a: '7' }, { q: '264 / 6', a: '44' },
    ]},
  { id: 'gv4', type: 'gravity', elo: 1100, label: 'MULTI-DIGIT',
    questions: [
      { q: '39 + 45', a: '84' }, { q: '225 + 375', a: '600' }, { q: '403 - 136', a: '267' }, { q: '235 - 118', a: '117' },
    ]},
  { id: 'gv5', type: 'gravity', elo: 1200, label: 'LONG MULTIPLY/DIVIDE',
    questions: [
      { q: '406 x 38', a: '15428' }, { q: '1449 / 21', a: '69' }, { q: 'Reduce 18/24', a: '3/4' }, { q: 'Reduce 34/51', a: '2/3' },
    ]},
  { id: 'gv6', type: 'gravity', elo: 1300, label: 'FRACTION ARITHMETIC',
    questions: [
      { q: '3/5 + 1/5', a: '4/5' }, { q: '1/6 + 3/4', a: '11/12' }, { q: '1 1/5 x 5/9', a: '2/3' }, { q: '1 1/4 / 3 1/8', a: '2/5' },
    ]},
  { id: 'gv7', type: 'gravity', elo: 1400, label: 'ORDER OF OPERATIONS',
    questions: [
      { q: '1/6 + 1/2 + 1/9', a: '7/9' }, { q: '10 - 3 x 3', a: '1' }, { q: '18 x ___ = 6', a: '1/3' }, { q: '0.6 x 0.5', a: '0.3' },
    ]},
  { id: 'gv8', type: 'gravity', elo: 1500, label: 'NEGATIVES & ALGEBRA',
    questions: [
      { q: '-9 - (-6)', a: '-3' }, { q: 'Solve: 3x + 5 = 12', a: '7/3' },
    ]},
  { id: 'gv9', type: 'gravity', elo: 1600, label: 'EQUATIONS & SYSTEMS',
    questions: [
      { q: '3x-4 < 5x-2', a: 'x > -1' }, { q: 'Solve: x/3 - 1 = 2 - x', a: '9/4' },
    ]},
  { id: 'gv10', type: 'gravity', elo: 1700, label: 'QUADRATICS & SURDS',
    questions: [
      { q: '(x-5)(2x+3)', a: '2x^2 - 7x - 15' }, { q: 'Solve: (x-2)^2 = 25', a: 'x=7 or x=-3' },
    ]},
]

// ─── Analogy & Flaw questions for later phases ───
const ANALOGY_QUESTIONS = [
  { id: 'an1', type: 'analogy', elo: 800, words: ['HOT','COLD','BIG'], choices: ['LARGE','SMALL','WARM','HEAVY'], answer: 1 },
  { id: 'an2', type: 'analogy', elo: 900, words: ['DOG','PUPPY','CAT'], choices: ['FELINE','KITTEN','CUB','PAW'], answer: 1 },
  { id: 'an3', type: 'analogy', elo: 1000, words: ['BOOK','READ','SONG'], choices: ['SING','WRITE','LISTEN','DANCE'], answer: 2 },
  { id: 'an4', type: 'analogy', elo: 1100, words: ['PEN','INK','BRUSH'], choices: ['CANVAS','PAINT','STROKE','COLOR'], answer: 1 },
  { id: 'an5', type: 'analogy', elo: 1300, words: ['ARCHIPELAGO','ISLAND','CONSTELLATION'], choices: ['GALAXY','STAR','PLANET','SKY'], answer: 1 },
  { id: 'an6', type: 'analogy', elo: 1500, words: ['FAMINE','HUNGER','DELUGE'], choices: ['RAIN','DROUGHT','FLOOD','STORM'], answer: 2 },
  { id: 'an7', type: 'analogy', elo: 1700, words: ['LADDER','HEIGHT','EDUCATION'], choices: ['SCHOOL','BOOKS','KNOWLEDGE','TEACHER'], answer: 2 },
  { id: 'an8', type: 'analogy', elo: 1800, words: ['SMOKE','FIRE','LIMP'], choices: ['WALKING','LEG','INJURY','PAIN'], answer: 2 },
  { id: 'an9', type: 'analogy', elo: 1900, words: ['MIRROR','APPEARANCE','DEBATE'], choices: ['ARGUMENT','WINNING','BELIEFS','LOGIC'], answer: 2 },
  { id: 'an10', type: 'analogy', elo: 2000, words: ['TRANSLATION','MEANING','SURGERY'], choices: ['DOCTOR','HEALING','FUNCTION','SCALPEL'], answer: 2 },
]

const FLAW_QUESTIONS = [
  { id: 'fl1', type: 'flaw', elo: 800, title: 'APPEAL TO AUTHORITY',
    argument: 'AN AI CHATBOT TELLS A STUDENT THAT "HISTORIANS WIDELY AGREE THE ROMAN EMPIRE FELL DUE TO MORAL DECAY." THE STUDENT ACCEPTS THIS WITHOUT CHECKING.',
    choices: [
      { label: 'A', text: 'REPETITION IN TRAINING DATA DOESN\'T EQUAL VERIFIED FACT — THIS IS APPEAL TO AUTHORITY' },
      { label: 'B', text: 'THE STUDENT SHOULD USE A DIFFERENT AI' },
      { label: 'C', text: 'HISTORIANS DO AGREE SO THE AI IS CORRECT' },
      { label: 'D', text: 'AI SHOULDN\'T BE USED FOR HOMEWORK' },
    ], answer: 0 },
  { id: 'fl2', type: 'flaw', elo: 1000, title: 'CHERRY-PICKING',
    argument: 'AN AI-GENERATED LESSON STATES: "EUROPEAN COLONIZATION BROUGHT INFRASTRUCTURE, EDUCATION, AND MODERN GOVERNANCE." IT CITES SCHOOLS AND RAILWAYS BUT MAKES NO MENTION OF EXPLOITATION, FORCED LABOR, OR CULTURAL DESTRUCTION.',
    choices: [
      { label: 'A', text: 'THE AI SELECTED ONLY DATA THAT FITS A POSITIVE NARRATIVE WHILE IGNORING MASSIVE COUNTEREVIDENCE — THIS IS CHERRY-PICKING' },
      { label: 'B', text: 'THE AI IS CORRECT BECAUSE IT CITED REAL EXAMPLES' },
      { label: 'C', text: 'COLONIZATION IS TOO COMPLEX FOR AI TO SUMMARIZE' },
      { label: 'D', text: 'THE LESSON IS FINE BECAUSE IT DOESN\'T SAY COLONIZATION WAS GOOD' },
    ], answer: 0 },
  { id: 'fl3', type: 'flaw', elo: 1200, title: 'CORRELATION VS. CAUSATION',
    argument: 'AN AI REPORTS: "COUNTRIES WITH HIGHER ICE CREAM CONSUMPTION HAVE HIGHER DROWNING RATES. THEREFORE ICE CREAM INCREASES DROWNING RISK."',
    choices: [
      { label: 'A', text: 'THE AI CORRECTLY IDENTIFIED THE PATTERN' },
      { label: 'B', text: 'HOT WEATHER INCREASES BOTH — THE AI CONFUSED CORRELATION WITH CAUSATION' },
      { label: 'C', text: 'THE DATASET MUST BE WRONG' },
      { label: 'D', text: 'AI CAN\'T UNDERSTAND HEALTH DATA' },
    ], answer: 1 },
  { id: 'fl4', type: 'flaw', elo: 1400, title: 'FALSE DICHOTOMY',
    argument: '"WE MUST CHOOSE — EITHER WE FULLY INTEGRATE AI INTO OUR NATIONAL CURRICULUM OR WE FALL BEHIND EVERY OTHER COUNTRY. THERE IS NO MIDDLE GROUND."',
    choices: [
      { label: 'A', text: 'THE OFFICIAL IS RIGHT — COUNTRIES MUST CHOOSE ONE EXTREME' },
      { label: 'B', text: 'THE AI BRIEF CONFIRMS THE CLAIM WITH DATA' },
      { label: 'C', text: 'THIS IS A FALSE DICHOTOMY — HYBRID MODELS EXIST AS A THIRD OPTION THE ARGUMENT DELIBERATELY EXCLUDES' },
      { label: 'D', text: 'ECONOMIC DATA ALWAYS SUPPORTS FULL AI ADOPTION' },
    ], answer: 2 },
  { id: 'fl5', type: 'flaw', elo: 1600, title: 'HASTY GENERALIZATION',
    argument: 'AN AI TUTOR TESTED IN 3 WELL-FUNDED SUBURBAN SCHOOLS SHOWS 15% MATH IMPROVEMENT. THE COMPANY CLAIMS IT WORKS FOR ALL STUDENTS.',
    choices: [
      { label: 'A', text: '15% PROVES IT WORKS FOR EVERYONE' },
      { label: 'B', text: 'THREE SCHOOLS ISN\'T ENOUGH BUT PROBABLY RIGHT' },
      { label: 'C', text: 'THEY GENERALIZED FROM AN UNREPRESENTATIVE SAMPLE — UNDER-RESOURCED SCHOOLS MAY GET DIFFERENT RESULTS' },
      { label: 'D', text: 'MATH SCORES DON\'T MEASURE AI EFFECTIVENESS' },
    ], answer: 2 },
  { id: 'fl6', type: 'flaw', elo: 1800, title: 'THE CONFIDENCE TRAP',
    argument: 'A STUDENT ASKS AN AI TO EXPLAIN QUANTUM MECHANICS. THE AI RESPONDS CONFIDENTLY WITH DETAILED STRUCTURE, BUT SUBTLY CONFLATES QUANTUM ENTANGLEMENT WITH FASTER-THAN-LIGHT COMMUNICATION. THE STUDENT ACCEPTS IT ALL.',
    choices: [
      { label: 'A', text: 'THE AI\'S EXPLANATION IS TRUSTWORTHY BECAUSE IT SOUNDS AUTHORITATIVE' },
      { label: 'B', text: 'THE STUDENT SHOULD HAVE ASKED A MORE ADVANCED AI MODEL' },
      { label: 'C', text: 'AI SYSTEMS OPTIMIZE FOR CONFIDENT-SOUNDING OUTPUT, NOT TRUTH — THE STUDENT MISTOOK FLUENCY FOR ACCURACY' },
      { label: 'D', text: 'QUANTUM MECHANICS IS TOO HARD FOR AI' },
    ], answer: 2 },
]

const K_FACTOR = 32

function calcStartElo(age) {
  return Math.round(800 + (age / 116) * 200)
}

function calcExpected(playerElo, questionElo) {
  return 1 / (1 + Math.pow(10, (questionElo - playerElo) / 400))
}

function pickClosest(playerElo, pool, usedIds) {
  const available = pool.filter(q => !usedIds.includes(q.id))
  if (available.length === 0) return null
  available.sort((a, b) => Math.abs(a.elo - playerElo) - Math.abs(b.elo - playerElo))
  return available[0]
}

export default function ThinkingTest() {
  const [phase, setPhase] = useState('landing') // landing | gravity | feedback | memory | memoryDone | email | results
  const [age, setAge] = useState('')
  const [error, setError] = useState(null)
  const [elo, setElo] = useState(800)
  const [currentRound, setCurrentRound] = useState(null)
  const [usedIds, setUsedIds] = useState([])
  const [result, setResult] = useState(null)
  const [rendererKey, setRendererKey] = useState(0)
  const [history, setHistory] = useState([])
  const [email, setEmail] = useState('')
  const [roundIndex, setRoundIndex] = useState(0)
  const [memoryType, setMemoryType] = useState(null) // 'sequence' | 'chimp'
  const [memoryLevels, setMemoryLevels] = useState(0)
  const [memoryStartElo, setMemoryStartElo] = useState(0)
  const [analogyQuestion, setAnalogyQuestion] = useState(null)
  const [analogyUsedIds, setAnalogyUsedIds] = useState([])
  const [robotLevelIndex, setRobotLevelIndex] = useState(0)
  const [fablesRoundIndex, setFablesRoundIndex] = useState(0)
  const [pirateLevelIndex, setPirateLevelIndex] = useState(0)
  const tracker = useRef(null)

  const TOTAL_ROUNDS = GRAVITY_ROUNDS.length

  function handleStart() {
    if (!age || parseInt(age) < 1) { setError('SELECT YOUR AGE'); return }
    setError(null)
    tracker.current = createTestTracker()
    tracker.current.setAge(parseInt(age))
    const startElo = calcStartElo(parseInt(age))
    setElo(startElo)
    setRoundIndex(0)
    setUsedIds([])
    setHistory([])
    setResult(null)

    // Pick first gravity round closest to starting ELO
    const first = pickClosest(startElo, GRAVITY_ROUNDS, [])
    setCurrentRound(first)
    setUsedIds([first.id])
    setRendererKey(k => k + 1)
    tracker.current?.startGame('gravity')
    setPhase('gravity')
  }

  function handleGravityComplete(passed) {
    const expected = calcExpected(elo, currentRound.elo)
    const newElo = Math.round(elo + K_FACTOR * ((passed ? 1 : 0) - expected))

    tracker.current?.recordRound({ correct: passed, scoreBefore: elo, scoreAfter: newElo, label: currentRound.label, elo: currentRound.elo })
    setResult(passed ? 'correct' : 'wrong')
    setHistory(prev => [...prev, { question: currentRound, correct: passed, eloBefore: elo, eloAfter: newElo }])
    setElo(newElo)
    setPhase('feedback')
  }

  function handleNextRound() {
    const nextIdx = roundIndex + 1
    if (nextIdx >= TOTAL_ROUNDS) {
      tracker.current?.endGame()
      startMemoryGame()
      return
    }
    const next = pickClosest(elo, GRAVITY_ROUNDS, usedIds)
    if (!next) { tracker.current?.endGame(); startMemoryGame(); return }
    setCurrentRound(next)
    setUsedIds(prev => [...prev, next.id])
    setRoundIndex(nextIdx)
    setResult(null)
    setRendererKey(k => k + 1)
    setPhase('gravity')
  }

  function handleNextGame() {
    tracker.current?.endGame()
    startMemoryGame()
  }

  function startMemoryGame() {
    const type = Math.random() < 0.5 ? 'sequence' : 'chimp'
    setMemoryType(type)
    setMemoryStartElo(elo)
    setRendererKey(k => k + 1)
    setResult(null)
    tracker.current?.startGame(type)
    setPhase('memory')
  }

  function handleMemoryComplete(levelsCompleted) {
    setMemoryLevels(levelsCompleted)
    const label = memoryType === 'sequence' ? 'SEQUENCE' : 'CHIMP TEST'
    const newHistory = []
    let runningElo = elo

    // Each cleared round is a win against that round's ELO
    for (let i = 0; i < levelsCompleted; i++) {
      const roundElo = 600 + (i + 1) * 200
      const expected = calcExpected(runningElo, roundElo)
      const newElo = Math.round(runningElo + K_FACTOR * (1 - expected))
      newHistory.push({
        question: { label: `${label} LVL ${i + 1}`, elo: roundElo },
        correct: true, eloBefore: runningElo, eloAfter: newElo
      })
      runningElo = newElo
    }

    // The round they failed on is a loss
    const failRoundElo = 600 + (levelsCompleted + 1) * 200
    const failExpected = calcExpected(runningElo, failRoundElo)
    const finalElo = Math.round(runningElo + K_FACTOR * (0 - failExpected))
    newHistory.push({
      question: { label: `${label} LVL ${levelsCompleted + 1}`, elo: failRoundElo },
      correct: false, eloBefore: runningElo, eloAfter: finalElo
    })

    // Record all rounds to tracker
    newHistory.forEach(h => {
      tracker.current?.recordRound({ correct: h.correct, scoreBefore: h.eloBefore, scoreAfter: h.eloAfter, label: h.question.label, elo: h.question.elo })
    })
    tracker.current?.endGame()

    setHistory(prev => [...prev, ...newHistory])
    setElo(finalElo)
    setResult(finalElo > elo ? 'correct' : 'wrong')
    setPhase('memoryDone')
  }

  function startAnalogies() {
    const sorted = [...ANALOGY_QUESTIONS].sort((a, b) => a.elo - b.elo)
    const justAbove = sorted.find(q => q.elo >= elo) || sorted[sorted.length - 1]
    setAnalogyQuestion(justAbove)
    setAnalogyUsedIds([justAbove.id])
    setRendererKey(k => k + 1)
    setResult(null)
    tracker.current?.startGame('analogies')
    setPhase('analogyIntro')
  }

  function handleAnalogyAnswer(correct) {
    const expected = calcExpected(elo, analogyQuestion.elo)
    const newElo = Math.round(elo + K_FACTOR * ((correct ? 1 : 0) - expected))

    tracker.current?.recordRound({ correct, scoreBefore: elo, scoreAfter: newElo, label: 'ANALOGY', elo: analogyQuestion.elo })
    setResult(correct ? 'correct' : 'wrong')
    setHistory(prev => [...prev, {
      question: { label: 'ANALOGY', elo: analogyQuestion.elo },
      correct, eloBefore: elo, eloAfter: newElo
    }])
    setElo(newElo)
    setPhase('analogyFeedback')
  }

  function handleAnalogyNextRound() {
    // Only called on correct — go to next higher ELO analogy
    const sorted = [...ANALOGY_QUESTIONS].sort((a, b) => a.elo - b.elo)
    const currentIdx = sorted.findIndex(q => q.id === analogyQuestion.id)

    let nextQ = null
    for (let i = currentIdx + 1; i < sorted.length; i++) {
      if (!analogyUsedIds.includes(sorted[i].id)) { nextQ = sorted[i]; break }
    }

    if (!nextQ) {
      tracker.current?.endGame()
      startRobotGolf()
      return
    }

    setAnalogyQuestion(nextQ)
    setAnalogyUsedIds(prev => [...prev, nextQ.id])
    setRendererKey(k => k + 1)
    setResult(null)
    setPhase('analogy')
  }

  function startRobotGolf() {
    setRobotLevelIndex(0)
    setRendererKey(k => k + 1)
    setResult(null)
    tracker.current?.startGame('robotgolf')
    setPhase('robot')
  }

  function handleRobotLevelComplete() {
    const lvlElo = 600 + (robotLevelIndex + 1) * 100
    const expected = calcExpected(elo, lvlElo)
    const newElo = Math.round(elo + K_FACTOR * (1 - expected))
    tracker.current?.recordRound({ correct: true, scoreBefore: elo, scoreAfter: newElo, label: `ROBOT GOLF LVL ${robotLevelIndex + 1}`, elo: lvlElo })
    setHistory(prev => [...prev, {
      question: { label: `ROBOT GOLF LVL ${robotLevelIndex + 1}`, elo: lvlElo },
      correct: true, eloBefore: elo, eloAfter: newElo
    }])
    setElo(newElo)
    setResult('correct')
    setPhase('robotDone')
  }

  function handleRobotGameOver() {
    const lvlElo = 600 + (robotLevelIndex + 1) * 100
    const expected = calcExpected(elo, lvlElo)
    const newElo = Math.round(elo + K_FACTOR * (0 - expected))
    tracker.current?.recordRound({ correct: false, scoreBefore: elo, scoreAfter: newElo, label: `ROBOT GOLF LVL ${robotLevelIndex + 1}`, elo: lvlElo })
    tracker.current?.endGame()
    setHistory(prev => [...prev, {
      question: { label: `ROBOT GOLF LVL ${robotLevelIndex + 1}`, elo: lvlElo },
      correct: false, eloBefore: elo, eloAfter: newElo
    }])
    setElo(newElo)
    setResult('wrong')
    setPhase('robotDone')
  }

  function handleRobotNextRound() {
    const nextIdx = robotLevelIndex + 1
    if (nextIdx >= rb001.levels.length) {
      tracker.current?.endGame()
      startFables()
      return
    }
    setRobotLevelIndex(nextIdx)
    setRendererKey(k => k + 1)
    setResult(null)
    setPhase('robot')
  }

  const FABLES_ELOS = [900, 1200, 1500, 1800]

  function startFables() {
    setFablesRoundIndex(0)
    setRendererKey(k => k + 1)
    setResult(null)
    tracker.current?.startGame('fables')
    setPhase('fablesIntro')
  }

  function handleFablesResult(correct, roundIdx) {
    const roundElo = FABLES_ELOS[roundIdx] || 1000
    const expected = calcExpected(elo, roundElo)
    const newElo = Math.round(elo + K_FACTOR * ((correct ? 1 : 0) - expected))
    tracker.current?.recordRound({ correct, scoreBefore: elo, scoreAfter: newElo, label: `FABLES RND ${roundIdx + 1}`, elo: roundElo })
    if (!correct) tracker.current?.endGame()
    setHistory(prev => [...prev, {
      question: { label: `FABLES RND ${roundIdx + 1}`, elo: roundElo },
      correct, eloBefore: elo, eloAfter: newElo
    }])
    setElo(newElo)
    setResult(correct ? 'correct' : 'wrong')
    setFablesRoundIndex(roundIdx)
    setPhase('fablesDone')
  }

  function handleFablesNextRound() {
    const nextIdx = fablesRoundIndex + 1
    if (nextIdx >= FABLES_ELOS.length) {
      tracker.current?.endGame()
      startPirates()
      return
    }
    setFablesRoundIndex(nextIdx)
    setRendererKey(k => k + 1)
    setResult(null)
    setPhase('fables')
  }

  const PIRATE_ELOS = [1200, 1500, 1800, 2100]

  function startPirates() {
    setPirateLevelIndex(0)
    setRendererKey(k => k + 1)
    setResult(null)
    tracker.current?.startGame('pirates')
    setPhase('pirate')
  }

  function handlePirateLevelComplete(levelIdx, isOptimal) {
    const lvlElo = PIRATE_ELOS[levelIdx] || 1500
    if (isOptimal) {
      const expected = calcExpected(elo, lvlElo)
      const newElo = Math.round(elo + K_FACTOR * (1 - expected))
      tracker.current?.recordRound({ correct: true, scoreBefore: elo, scoreAfter: newElo, label: `PIRATES RND ${levelIdx + 1}`, elo: lvlElo, actions: { optimal: true } })
      setHistory(prev => [...prev, {
        question: { label: `PIRATES RND ${levelIdx + 1}`, elo: lvlElo },
        correct: true, eloBefore: elo, eloAfter: newElo
      }])
      setElo(newElo)
      setResult('optimal')
    } else {
      tracker.current?.recordRound({ correct: true, scoreBefore: elo, scoreAfter: elo, label: `PIRATES RND ${levelIdx + 1}`, elo: lvlElo, actions: { optimal: false } })
      setHistory(prev => [...prev, {
        question: { label: `PIRATES RND ${levelIdx + 1}`, elo: lvlElo },
        correct: true, eloBefore: elo, eloAfter: elo
      }])
      setResult('nonoptimal')
    }
    setPirateLevelIndex(levelIdx)
    setPhase('pirateDone')
  }

  function handlePirateLevelFail(levelIdx) {
    const lvlElo = PIRATE_ELOS[levelIdx] || 1500
    const expected = calcExpected(elo, lvlElo)
    const newElo = Math.round(elo + K_FACTOR * (0 - expected))
    tracker.current?.recordRound({ correct: false, scoreBefore: elo, scoreAfter: newElo, label: `PIRATES RND ${levelIdx + 1}`, elo: lvlElo, actions: { walkedPlank: true } })
    tracker.current?.endGame()
    setHistory(prev => [...prev, {
      question: { label: `PIRATES RND ${levelIdx + 1}`, elo: lvlElo },
      correct: false, eloBefore: elo, eloAfter: newElo
    }])
    setElo(newElo)
    setPirateLevelIndex(levelIdx)
    setResult('plank')
    setPhase('pirateDone')
  }

  function handlePirateNextRound() {
    const nextIdx = pirateLevelIndex + 1
    if (nextIdx >= PIRATE_ELOS.length) {
      tracker.current?.endGame()
      setPhase('email')
      return
    }
    setPirateLevelIndex(nextIdx)
    setRendererKey(k => k + 1)
    setResult(null)
    setPhase('pirate')
  }

  function handleEmailSubmit() {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/
    const raw = email.trim().toLowerCase()
    if (!raw || !emailRegex.test(raw)) { setError('ENTER A VALID EMAIL ADDRESS'); return }
    setError(null)
    tracker.current?.submit(email, elo)
    setPhase('results')
  }

  function getPercentile(eloScore) {
    // Approximate percentile based on ELO distribution
    // Assuming normal distribution centered ~1000, stddev ~200
    // ELO 600 = bottom 2%, 800 = 16%, 1000 = 50%, 1200 = 84%, 1400 = 98%, 1600+ = 99.5%+
    if (eloScore >= 1800) return 0.1
    if (eloScore >= 1600) return 0.5
    if (eloScore >= 1500) return 1
    if (eloScore >= 1400) return 2
    if (eloScore >= 1300) return 5
    if (eloScore >= 1200) return 10
    if (eloScore >= 1100) return 20
    if (eloScore >= 1000) return 35
    if (eloScore >= 900) return 50
    if (eloScore >= 800) return 65
    if (eloScore >= 700) return 80
    if (eloScore >= 600) return 90
    return 95
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

  // ─── GRAVITY ROUND ───
  if ((phase === 'gravity' || phase === 'feedback') && currentRound) {
    return (
      <>
        {/* Gravity renderer — fullscreen, auto-starts */}
        <GravityRenderer
          key={rendererKey}
          questions={currentRound.questions}
          onRoundComplete={handleGravityComplete}
          autoStart={roundIndex > 0}
        />

        {/* HUD overlay */}
        <div className="tt-elo-box">
          <div className="tt-elo-label">SCORE</div>
          <div className="tt-elo-value">{elo}</div>
        </div>

        <div className="tt-progress-box">
          <div className="tt-progress-text">{roundIndex + 1}/{TOTAL_ROUNDS}</div>
        </div>

        <div className="tt-q-elo-float">{currentRound.label}</div>

        {/* Feedback popup */}
        {phase === 'feedback' && (
          <div className="tt-feedback-wrap">
            <div className="tt-feedback-popup">
              <div className={`tt-feedback-text ${result}`}>{result === 'correct' ? 'ROUND CLEARED' : 'ROUND FAILED'}</div>
              <div className={`tt-elo-change ${result}`}>
                {result === 'correct' ? '+' : ''}{history[history.length - 1]?.eloAfter - history[history.length - 1]?.eloBefore} POINTS
              </div>
              {result === 'correct' ? (
                <button className="tt-next-btn" onClick={handleNextRound}>
                  {roundIndex + 1 >= TOTAL_ROUNDS ? 'NEXT GAME' : 'NEXT ROUND'}
                </button>
              ) : (
                <button className="tt-next-btn" onClick={handleNextGame}>NEXT GAME</button>
              )}
            </div>
          </div>
        )}
      </>
    )
  }

  // ─── MEMORY GAME ───
  if (phase === 'memory' || phase === 'memoryDone') {
    return (
      <>
        {memoryType === 'sequence' && (
          <TestSequenceMemory key={rendererKey} onComplete={handleMemoryComplete} autoStart />
        )}
        {memoryType === 'chimp' && (
          <TestChimpTest key={rendererKey} onComplete={handleMemoryComplete} autoStart />
        )}

        {/* HUD overlay */}
        <div className="tt-elo-box">
          <div className="tt-elo-label">SCORE</div>
          <div className="tt-elo-value">{elo}</div>
        </div>

        {/* Feedback popup */}
        {phase === 'memoryDone' && (
          <div className="tt-feedback-wrap">
            <div className="tt-feedback-popup">
              <div className="tt-feedback-text wrong">INCORRECT</div>
              <div className="tt-memory-detail">
                {memoryLevels} LEVEL{memoryLevels !== 1 ? 'S' : ''} CLEARED
              </div>
              <div className={`tt-elo-change ${result}`}>
                {elo - memoryStartElo >= 0 ? '+' : ''}{elo - memoryStartElo} POINTS
              </div>
              <button className="tt-next-btn" onClick={startAnalogies}>NEXT GAME</button>
            </div>
          </div>
        )}
      </>
    )
  }

  // ─── ANALOGY INTRO ───
  if (phase === 'analogyIntro') {
    return (
      <>
        <TestAnalogies key={rendererKey} question={analogyQuestion} onAnswer={handleAnalogyAnswer} />

        <div className="tt-elo-box">
          <div className="tt-elo-label">SCORE</div>
          <div className="tt-elo-value">{elo}</div>
        </div>

        <div className="tt-feedback-wrap">
          <div className="tt-feedback-popup tt-intro-popup">
            <div className="tt-feedback-text" style={{ color: '#fff' }}>ANALOGIES</div>
            <div className="tt-intro-rules">
              <p>A : B :: C : ?</p>
              <p>FIND THE RELATIONSHIP AND COMPLETE THE PATTERN.</p>
              <p>DRAG OR CLICK YOUR ANSWER.</p>
              <p>ONE WRONG ANSWER AND IT'S OVER.</p>
            </div>
            <button className="tt-next-btn" onClick={() => setPhase('analogy')}>START GAME</button>
          </div>
        </div>
      </>
    )
  }

  // ─── ANALOGY PLAYING / FEEDBACK ───
  if ((phase === 'analogy' || phase === 'analogyFeedback') && analogyQuestion) {
    return (
      <>
        <TestAnalogies key={rendererKey} question={analogyQuestion} onAnswer={handleAnalogyAnswer} />

        <div className="tt-elo-box">
          <div className="tt-elo-label">SCORE</div>
          <div className="tt-elo-value">{elo}</div>
        </div>

        {phase === 'analogyFeedback' && (
          <div className="tt-feedback-wrap">
            <div className="tt-feedback-popup">
              <div className={`tt-feedback-text ${result}`}>{result === 'correct' ? 'CORRECT' : 'INCORRECT'}</div>
              <div className={`tt-elo-change ${result}`}>
                {result === 'correct' ? '+' : ''}{history[history.length - 1]?.eloAfter - history[history.length - 1]?.eloBefore} POINTS
              </div>
              {result === 'correct' ? (
                <button className="tt-next-btn" onClick={handleAnalogyNextRound}>NEXT ROUND</button>
              ) : (
                <button className="tt-next-btn" onClick={() => { tracker.current?.endGame(); startRobotGolf() }}>NEXT GAME</button>
              )}
            </div>
          </div>
        )}
      </>
    )
  }

  // ─── ROBOT GOLF PLAYING ───
  if (phase === 'robot') {
    return (
      <>
        <RobotRenderer
          key={rendererKey}
          levels={[rb001.levels[robotLevelIndex]]}
          narrative={rb001.narrative}
          onComplete={handleRobotLevelComplete}
          onGameOver={handleRobotGameOver}
          skipIntro={robotLevelIndex > 0}
        />

        <div className="tt-elo-box">
          <div className="tt-elo-label">SCORE</div>
          <div className="tt-elo-value">{elo}</div>
        </div>
      </>
    )
  }

  // ─── ROBOT GOLF DONE ───
  if (phase === 'robotDone') {
    const lastEntry = history[history.length - 1]
    const change = lastEntry ? lastEntry.eloAfter - lastEntry.eloBefore : 0
    return (
      <>
        <RobotRenderer
          key={rendererKey}
          levels={[rb001.levels[robotLevelIndex]]}
          narrative={rb001.narrative}
        />

        <div className="tt-elo-box">
          <div className="tt-elo-label">SCORE</div>
          <div className="tt-elo-value">{elo}</div>
        </div>

        <div className="tt-feedback-wrap">
          <div className="tt-feedback-popup">
            <div className={`tt-feedback-text ${result}`}>{result === 'correct' ? 'MISSION COMPLETE' : 'MISSION FAILED'}</div>
            <div className={`tt-elo-change ${result}`}>
              {change >= 0 ? '+' : ''}{change} POINTS
            </div>
            {result === 'correct' ? (
              <button className="tt-next-btn" onClick={robotLevelIndex + 1 >= rb001.levels.length ? () => { tracker.current?.endGame(); startFables() } : handleRobotNextRound}>
                {robotLevelIndex + 1 >= rb001.levels.length ? 'NEXT GAME' : 'NEXT ROUND'}
              </button>
            ) : (
              <button className="tt-next-btn" onClick={startFables}>NEXT GAME</button>
            )}
          </div>
        </div>
      </>
    )
  }

  // ─── FABLES INTRO ───
  if (phase === 'fablesIntro') {
    return (
      <>
        <TestFables key={rendererKey} onRoundResult={handleFablesResult} />

        <div className="tt-elo-box">
          <div className="tt-elo-label">SCORE</div>
          <div className="tt-elo-value">{elo}</div>
        </div>
      </>
    )
  }

  // ─── FABLES PLAYING ───
  if (phase === 'fables') {
    return (
      <>
        <TestFables key={rendererKey} onRoundResult={handleFablesResult} skipIntro startRound={fablesRoundIndex} />

        <div className="tt-elo-box">
          <div className="tt-elo-label">SCORE</div>
          <div className="tt-elo-value">{elo}</div>
        </div>
      </>
    )
  }

  // ─── FABLES DONE ───
  if (phase === 'fablesDone') {
    const lastEntry = history[history.length - 1]
    const change = lastEntry ? lastEntry.eloAfter - lastEntry.eloBefore : 0
    return (
      <>
        <TestFables key={rendererKey} onRoundResult={() => {}} skipIntro startRound={fablesRoundIndex} />

        <div className="tt-elo-box">
          <div className="tt-elo-label">SCORE</div>
          <div className="tt-elo-value">{elo}</div>
        </div>

        <div className="tt-feedback-wrap">
          <div className="tt-feedback-popup">
            <div className={`tt-feedback-text ${result}`}>{result === 'correct' ? 'CORRECT' : 'INCORRECT'}</div>
            <div className={`tt-elo-change ${result}`}>
              {change >= 0 ? '+' : ''}{change} POINTS
            </div>
            {result === 'correct' ? (
              <button className="tt-next-btn" onClick={fablesRoundIndex + 1 >= FABLES_ELOS.length ? () => { tracker.current?.endGame(); startPirates() } : handleFablesNextRound}>
                {fablesRoundIndex + 1 >= FABLES_ELOS.length ? 'NEXT GAME' : 'NEXT ROUND'}
              </button>
            ) : (
              <button className="tt-next-btn" onClick={startPirates}>NEXT GAME</button>
            )}
          </div>
        </div>
      </>
    )
  }

  // ─── SCREWY PIRATES ───
  if (phase === 'pirate') {
    return (
      <>
        <PirateRenderer
          key={rendererKey}
          onLevelComplete={handlePirateLevelComplete}
          onLevelFail={handlePirateLevelFail}
          startLevel={pirateLevelIndex}
        />

        <div className="tt-elo-box">
          <div className="tt-elo-label">SCORE</div>
          <div className="tt-elo-value">{elo}</div>
        </div>
      </>
    )
  }

  // ─── PIRATES DONE ───
  if (phase === 'pirateDone') {
    const lastEntry = history[history.length - 1]
    const change = lastEntry ? lastEntry.eloAfter - lastEntry.eloBefore : 0
    return (
      <>
        <PirateRenderer key={rendererKey} startLevel={pirateLevelIndex} onLevelComplete={() => {}} onLevelFail={() => {}} />

        <div className="tt-elo-box">
          <div className="tt-elo-label">SCORE</div>
          <div className="tt-elo-value">{elo}</div>
        </div>

        <div className="tt-feedback-wrap">
          <div className="tt-feedback-popup">
            <div className={`tt-feedback-text ${result === 'optimal' ? 'correct' : result === 'plank' ? 'wrong' : ''}`}>
              {result === 'optimal' ? 'OPTIMAL' : result === 'nonoptimal' ? 'NOT OPTIMAL' : 'WALKED THE PLANK'}
            </div>
            <div className={`tt-elo-change ${result === 'optimal' ? 'correct' : result === 'plank' ? 'wrong' : ''}`}>
              {result === 'optimal' ? `+${change} POINTS` : result === 'plank' ? `${change} POINTS` : '0 POINTS'}
            </div>
            {result === 'plank' ? (
              <button className="tt-next-btn" onClick={() => setPhase('email')}>FINISH</button>
            ) : (
              <button className="tt-next-btn" onClick={pirateLevelIndex + 1 >= PIRATE_ELOS.length ? () => setPhase('email') : handlePirateNextRound}>
                {pirateLevelIndex + 1 >= PIRATE_ELOS.length ? 'FINISH' : 'NEXT ROUND'}
              </button>
            )}
          </div>
        </div>
      </>
    )
  }

  // ─── EMAIL ───
  if (phase === 'email') {
    return (
      <div className="tt-wrapper">
        <div className="tt-scanlines" />
        <div className="tt-content">
          <h1 className="tt-title-sm">TEST COMPLETE</h1>
          <input className="tt-email-input" type="email" value={email} placeholder="YOUR@EMAIL.COM"
            onChange={e => { setEmail(e.target.value.toUpperCase()); setError(null) }}
            onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()} />
          {error && <div className="tt-error">{error}</div>}
          <button className="tt-start-btn" onClick={handleEmailSubmit}>ENTER EMAIL TO SEE RESULTS</button>
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
          <div className="tt-final-label">THINKING SCORE</div>
          <div className="tt-final-percentile">TOP {getPercentile(elo)}%</div>
          <div className="tt-final-stats">{correct}/{history.length} ROUNDS CLEARED</div>
          <div className="tt-history">
            {history.map((h, i) => (
              <div key={i} className={`tt-history-item ${h.correct ? 'correct' : 'wrong'}`}>
                <span className="tt-history-num">{i + 1}</span>
                <span className="tt-history-type">{h.question.label}</span>
                <span className="tt-history-result">{h.correct ? 'CLEARED' : 'FAILED'}</span>
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
