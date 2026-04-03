import { useState } from 'react'
import { Link } from 'react-router-dom'
import SequenceMemoryRenderer from '../renderers/test/TestSequenceMemory'
import ChimpTestRenderer from '../renderers/test/TestChimpTest'
import GravityRenderer from '../renderers/test/TestGravity'
import RobotRenderer from '../renderers/test/TestRobot'
import PirateRenderer from '../renderers/test/TestPirate'
import AnalogiesRenderer from '../renderers/test/TestAnalogies'
import FablesRenderer from '../renderers/test/TestFables'
import rb001 from '../content/robot/rb001.json'
import rb002 from '../content/robot/rb002.json'
import rb003 from '../content/robot/rb003.json'
import './TestContent.css'

const ROBOT_WORLDS = [rb001, rb002, rb003]

const GAME_RENDERERS = {
  sequencememory: SequenceMemoryRenderer,
  chimptest: ChimpTestRenderer,
  gravity: GravityRenderer,
  robotgolf: RobotRenderer,
  pirate: PirateRenderer,
  analogies: AnalogiesRenderer,
  fables: FablesRenderer,
}

// ─── Question Bank with ELO ratings ───
const QUESTION_BANK = {
  sequencememory: {
    name: 'SEQUENCE MEMORY',
    description: 'Watch the pattern, replay it. Sequence grows each round.',
    levels: Array.from({ length: 15 }, (_, i) => ({
      round: i + 1,
      sequenceLength: i + 3,
      elo: 600 + i * 200,
      description: `${i + 3}-tile sequence`,
    })),
  },
  chimptest: {
    name: 'CHIMP TEST',
    description: 'Numbers flash on grid. Click them in order from memory.',
    levels: Array.from({ length: 15 }, (_, i) => ({
      round: i + 1,
      numbers: i + 4,
      elo: 600 + i * 200,
      description: `${i + 4} numbers on grid`,
    })),
  },
  robotgolf: {
    name: 'ROBOT GOLF',
    description: 'Program a robot with command cards to navigate grids, collect gears, and light tiles.',
    levels: [
      ...rb001.levels.map((l, i) => ({ round: i + 1, level: l.id, elo: 600 + i * 100, description: `W1: ${l.name} — ${l.goal} (par ${l.par})`, cards: l.cards, world: 1 })),
      ...rb002.levels.map((l, i) => ({ round: rb001.levels.length + i + 1, level: l.id, elo: 1400 + i * 100, description: `W2: ${l.name} — ${l.goal} (par ${l.par})`, cards: l.cards, world: 2 })),
      ...rb003.levels.map((l, i) => ({ round: rb001.levels.length + rb002.levels.length + i + 1, level: l.id, elo: 2200 + i * 100, description: `W3: ${l.name} — ${l.goal} (par ${l.par})`, cards: l.cards, world: 3 })),
    ],
  },
  fables: {
    name: 'TWO TRUTHS AND A LIE',
    description: 'Three friends. Three statements. One is lying. Find the liar.',
    levels: [
      { round: 1, elo: 900, description: 'The Ransacked Cooler' },
      { round: 2, elo: 1200, description: 'The Collapsed Tent' },
      { round: 3, elo: 1500, description: 'The Missing Firewood' },
      { round: 4, elo: 1800, description: 'The Dead Car Battery' },
    ],
  },
  analogies: {
    name: 'ANALOGIES',
    description: 'Complete the analogy. Pick the correct answer.',
    levels: [
      { round: 1, elo: 800, description: 'Hot : Cold :: Big : ?' },
      { round: 2, elo: 900, description: 'Dog : Puppy :: Cat : ?' },
      { round: 3, elo: 1000, description: 'Book : Read :: Song : ?' },
      { round: 4, elo: 1100, description: 'Pen : Ink :: Brush : ?' },
      { round: 5, elo: 1200, description: 'Mansion : House :: Feast : ?' },
      { round: 6, elo: 1300, description: 'Archipelago : Island :: Constellation : ?' },
      { round: 7, elo: 1400, description: 'Surgeon : Scalpel :: Sculptor : ?' },
      { round: 8, elo: 1500, description: 'Famine : Hunger :: Deluge : ?' },
      { round: 9, elo: 1600, description: 'Preamble : Constitution :: Overture : ?' },
      { round: 10, elo: 1700, description: 'Sycophant : Flattery :: Ascetic : ?' },
      { round: 11, elo: 1800, description: 'Cartography : Maps :: Entomology : ?' },
      { round: 12, elo: 1900, description: 'Apogee : Nadir :: Zenith : ?' },
    ],
  },
  pirate: {
    name: 'SCREWY PIRATES',
    description: 'Game theory: split treasure among pirates using backward induction.',
    levels: [
      { round: 1, elo: 2000, description: '2 pirates — Captain takes all' },
      { round: 2, elo: 2000, description: '3 pirates — bribe one pirate' },
      { round: 3, elo: 2000, description: '4 pirates — find the cheapest vote' },
      { round: 4, elo: 2000, description: '5 pirates — optimal split challenge' },
    ],
  },
  gravity: {
    name: 'GRAVITY',
    description: 'Falling math questions. Answer before they hit the ground.',
    levels: [
      { round: 1, level: '2A', elo: 800, description: 'Basic single-digit add/subtract',
        questions: ['7 + 4', '3 + 9', '8 + 6', '9 - 7', '10 - 4'] },
      { round: 2, level: 'A', elo: 900, description: 'Two-digit add/subtract',
        questions: ['13 + 5', '6 + 17', '28 + 9', '14 - 9', '16 - 11'] },
      { round: 3, level: 'B', elo: 1000, description: 'Multi-digit add/subtract, missing number',
        questions: ['39 + 45', '225 + 375', '63 + ___ = 120', '403 - 136', '235 - 118'] },
      { round: 4, level: 'C', elo: 1100, description: 'Multiplication, division, remainders',
        questions: ['8 x 9', '54 x 8', '72 / 7 = ___ r ___', '56 / 8', '260 / 6'] },
      { round: 5, level: 'D', elo: 1200, description: 'Long multiply/divide, mixed numbers, reducing',
        questions: ['406 x 38', '1449 / 21', '46/11 as mixed number', 'Reduce 18/24', 'Reduce 34/51'] },
      { round: 6, level: 'E', elo: 1300, description: 'Fraction arithmetic',
        questions: ['3/5 + 1/5', '1/6 + 3/4', '2 2/3 - 1 1/2', '1 1/5 x 5/9', '1 1/4 / 3 1/8'] },
      { round: 7, level: 'F', elo: 1400, description: 'Mixed fractions, order of operations, decimals',
        questions: ['1/6 + 1/2 + 1/9', '10 - 3 x 3', '3 - 1/2 / 1/5', '18 x ___ = 6', '0.6 x 0.5'] },
      { round: 8, level: 'G', elo: 1500, description: 'Negative numbers, simplify expressions, solve for x',
        questions: ['-9 - (-6)', '(-1/6 + 1/4) / -2', '5x + y + 3 + x - 2y + 5', 'Solve: 3x + 5 = 12'] },
      { round: 9, level: 'H', elo: 1600, description: 'Equations, systems, inequalities, expanding',
        questions: ['Solve: (1-x)/3 = a', '3x+2y=7, x-2y=5', '2x+3y=22, y=x+4', '3x-4 < 5x-2', '3x(x+4) + 3x(2x-5)', 'Solve: x/3 - 1 = 2 - x'] },
      { round: 10, level: 'I', elo: 1700, description: 'Quadratics, factoring, surds',
        questions: ['(x-5)(2x+3)', 'Factorise: 3x - 18xy', 'Factorise: x^2 - 7x + 12', 'Simplify: sqrt(20) * sqrt(18)', 'Solve: (x-2)^2 = 25'] },
    ],
  },
}

function getEloColor(elo) {
  if (elo >= 2000) return '#ff4444'
  if (elo >= 1500) return '#ff8844'
  if (elo >= 1000) return '#ddaa00'
  if (elo >= 700) return '#44bb44'
  return '#4488dd'
}

const GRAVITY_ANSWERS = {
  '2A': ['11','12','14','2','6'],
  'A': ['18','23','37','5','5'],
  'B': ['84','600','57','267','117'],
  'C': ['72','432','10 r 2','7','43 r 2'],
  'D': ['15428','69','4 2/11','3/4','2/3'],
  'E': ['4/5','11/12','1 1/6','2/3','2/5'],
  'F': ['7/9','1','1/2','1/3','0.3'],
  'G': ['-3','-1/24','6x - y + 8','7/3'],
  'H': ['1 - 3a','x=3 y=-1','x=2 y=6','x > -1','9x^2 - 3x','9/4'],
  'I': ['2x^2 - 7x - 15','3x(1 - 6y)','(x-3)(x-4)','6sqrt10','x=7 or x=-3'],
}

// Single level's questions
function getGravityQuestions(level) {
  const lvl = level.level || String(level.round)
  const qs = level.questions || []
  const as = GRAVITY_ANSWERS[lvl] || []
  return qs.map((q, i) => ({ q, a: as[i] || '?' }))
}

// ALL levels' questions combined for full playthrough
function getAllGravityQuestions() {
  const all = []
  for (const level of QUESTION_BANK.gravity.levels) {
    const lvl = level.level || String(level.round)
    const qs = level.questions || []
    const as = GRAVITY_ANSWERS[lvl] || []
    for (let i = 0; i < qs.length; i++) {
      all.push({ q: qs[i], a: as[i] || '?' })
    }
  }
  return all
}

export default function TestContent() {
  const [playing, setPlaying] = useState(null) // { type, level? }
  const totalQuestions = Object.values(QUESTION_BANK).reduce((sum, g) => sum + g.levels.length, 0)
  const gameTypes = Object.keys(QUESTION_BANK).length

  // Render active game
  if (playing) {
    const Renderer = GAME_RENDERERS[playing.type]
    if (!Renderer) { setPlaying(null); return null }

    let props = {}
    if (playing.type === 'gravity') {
      if (playing.level) {
        props.questions = getGravityQuestions(playing.level)
      } else {
        props.questions = getAllGravityQuestions()
      }
    } else if (playing.type === 'robotgolf') {
      const worldIdx = playing.world ? playing.world - 1 : 0
      const world = ROBOT_WORLDS[worldIdx] || ROBOT_WORLDS[0]
      props.levels = world.levels
      props.narrative = world.narrative
    }

    // Fullscreen games (position:fixed), others need a wrapper
    if (playing.type === 'gravity' || playing.type === 'robotgolf' || playing.type === 'pirate' || playing.type === 'analogies' || playing.type === 'fables') {
      return (
        <>
          <div className="tc-play-close-float">
            <button className="tc-play-close" onClick={() => setPlaying(null)}>X CLOSE</button>
          </div>
          <Renderer {...props} />
        </>
      )
    }

    return (
      <div className="tc-play-overlay">
        <button className="tc-play-close" onClick={() => setPlaying(null)}>X CLOSE</button>
        <div className="tc-play-container">
          <Renderer {...props} />
        </div>
      </div>
    )
  }

  return (
    <div className="tc-wrapper">
      <div className="tc-header">
        <Link to="/test" className="tc-back">&larr; BACK</Link>
        <h1 className="tc-title">TEST CONTENT</h1>
        <div className="tc-stats">
          <span>{gameTypes} GAME TYPES</span>
          <span>{totalQuestions} TOTAL LEVELS</span>
        </div>
      </div>

      <div className="tc-elo-legend">
        <span className="tc-legend-title">ELO SCALE:</span>
        <span style={{ color: '#4488dd' }}>400-699</span>
        <span style={{ color: '#44bb44' }}>700-999</span>
        <span style={{ color: '#ddaa00' }}>1000-1499</span>
        <span style={{ color: '#ff8844' }}>1500-1999</span>
        <span style={{ color: '#ff4444' }}>2000+</span>
      </div>

      <div className="tc-games">
        {Object.entries(QUESTION_BANK).map(([key, game]) => (
          <div key={key} className="tc-game">
            <div className="tc-game-header">
              <h2 className="tc-game-name">{game.name}</h2>
              <div className="tc-game-header-right">
                <span className="tc-game-count">{game.levels.length} LEVELS</span>
                {GAME_RENDERERS[key] && (
                  <button className="tc-try-btn" onClick={() => setPlaying({ type: key })}>
                    TRY
                  </button>
                )}
              </div>
            </div>
            <p className="tc-game-desc">{game.description}</p>
            <div className="tc-levels">
              {game.levels.map((level, i) => (
                <div key={i} className="tc-level-block">
                  <div className="tc-level">
                    <span className="tc-level-num">{level.level || String(level.round).padStart(2, '0')}</span>
                    <span className="tc-level-desc">{level.description}</span>
                    <span className="tc-level-elo" style={{ color: getEloColor(level.elo) }}>
                      {level.elo}
                    </span>
                    {key === 'gravity' && level.questions && (
                      <button className="tc-try-btn tc-try-sm" onClick={() => setPlaying({ type: 'gravity', level })}>
                        TRY
                      </button>
                    )}
                    {key === 'robotgolf' && level.world && (
                      <button className="tc-try-btn tc-try-sm" onClick={() => setPlaying({ type: 'robotgolf', world: level.world })}>
                        TRY W{level.world}
                      </button>
                    )}
                  </div>
                  {level.questions && (
                    <div className="tc-questions">
                      {level.questions.map((q, qi) => (
                        <span key={qi} className="tc-question">{q}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
