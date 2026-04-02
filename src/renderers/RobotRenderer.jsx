import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { CARDS, DIRECTIONS, createRobotState, executeStep } from './robot/engine'
import './RobotRenderer.css'

const CELL = 56
const EXEC_DELAY = 400

export default function RobotRenderer({ levels, narrative }) {
  const [levelIndex, setLevelIndex] = useState(0)
  const [phase, setPhase] = useState('intro') // intro | build | running | result
  const [program, setProgram] = useState([])
  const [robot, setRobot] = useState(null)
  const [execIndex, setExecIndex] = useState(-1)
  const [history, setHistory] = useState([])
  const [gears, setGears] = useState([])
  const execRef = useRef(null)

  const level = levels[levelIndex]
  const availableCards = level?.cards?.map((id) => CARDS[id]) || []

  const startLevel = useCallback(() => {
    setProgram([])
    setRobot(createRobotState(level))
    setExecIndex(-1)
    setHistory([])
    setPhase('build')
  }, [level])

  function addCard(cardId) {
    if (phase !== 'build' || program.length >= 16) return
    setProgram([...program, cardId])
  }

  function removeCard(index) {
    if (phase !== 'build') return
    setProgram(program.filter((_, i) => i !== index))
  }

  function clearProgram() {
    setProgram([])
    setRobot(createRobotState(level))
  }

  function runProgram() {
    if (program.length === 0) return
    setPhase('running')
    setRobot(createRobotState(level))
    setExecIndex(-1)
    setHistory([])

    let state = createRobotState(level)
    const steps = []

    for (let i = 0; i < program.length; i++) {
      state = executeStep(state, program[i], level)
      steps.push({ ...state, cardIndex: i })
      if (state.won) break
    }

    setHistory(steps)

    // Animate execution step by step
    let step = 0
    const animate = () => {
      if (step >= steps.length) {
        setExecIndex(-1)
        setPhase('result')
        return
      }
      setExecIndex(steps[step].cardIndex)
      setRobot(steps[step])
      step++
      execRef.current = setTimeout(animate, EXEC_DELAY)
    }
    execRef.current = setTimeout(animate, EXEC_DELAY)
  }

  function stopExec() {
    clearTimeout(execRef.current)
    setPhase('build')
    setExecIndex(-1)
    setRobot(createRobotState(level))
  }

  function nextLevel() {
    const won = robot?.won
    const usedCards = program.length
    const par = level.par
    let g = 0
    if (won) g = usedCards <= par ? 3 : usedCards <= par + 2 ? 2 : 1
    setGears([...gears, g])
    if (levelIndex + 1 < levels.length) {
      setLevelIndex(levelIndex + 1)
      setPhase('build')
      setProgram([])
      setRobot(createRobotState(levels[levelIndex + 1]))
      setExecIndex(-1)
      setHistory([])
    } else {
      setPhase('complete')
    }
  }

  function retry() {
    setPhase('build')
    setProgram([])
    setRobot(createRobotState(level))
    setExecIndex(-1)
  }

  // Intro
  if (phase === 'intro') {
    return (
      <div className="rb-wrapper">
        <Link to="/" className="rb-exit">Exit</Link>
        <div className="rb-intro">
          <div className="rb-robot-icon">🤖</div>
          <h1 className="rb-title">{levels[0]?.__title || 'Robot Workshop'}</h1>
          <p className="rb-narrative">{narrative}</p>
          <p className="rb-level-count">{levels.length} levels</p>
          <button className="rb-btn" onClick={startLevel}>Start</button>
        </div>
      </div>
    )
  }

  // Complete
  if (phase === 'complete') {
    const totalGears = gears.reduce((a, b) => a + b, 0)
    return (
      <div className="rb-wrapper">
        <Link to="/" className="rb-exit">Exit</Link>
        <div className="rb-intro">
          <div className="rb-robot-icon">🎉</div>
          <h1 className="rb-title">Workshop Complete!</h1>
          <div className="rb-total-gears">{totalGears}/{levels.length * 3} ⚙️</div>
          <div className="rb-gear-row">
            {gears.map((g, i) => (
              <div key={i} className="rb-gear-result">
                <span className="rb-gear-level">L{i + 1}</span>
                <span className="rb-gear-dots">{'⚙️'.repeat(g)}{'⚪'.repeat(3 - g)}</span>
              </div>
            ))}
          </div>
          <Link to="/" className="rb-btn">Back to Track</Link>
        </div>
      </div>
    )
  }

  const dirClass = DIRECTIONS[robot?.dir ?? 0]

  return (
    <div className="rb-wrapper">
      <Link to="/" className="rb-exit">Exit</Link>

      {/* Level header */}
      <div className="rb-header">
        <span className="rb-level-tag">Level {levelIndex + 1}/{levels.length}</span>
        <span className="rb-level-name">{level.name}</span>
        <span className="rb-par">Par: {level.par} cards</span>
      </div>

      {/* Grid world */}
      <div className="rb-grid" style={{ width: level.width * CELL, height: level.height * CELL }}>
        {level.grid.map((row, y) =>
          row.map((cell, x) => {
            const isTarget = level.goal === 'reach' && level.target?.[0] === x && level.target?.[1] === y
            const isLit = robot?.litTiles?.has(`${x},${y}`)
            const isCollected = robot?.collected?.has(`${x},${y}`)
            return (
              <div
                key={`${x}-${y}`}
                className={`rb-cell ${cell === 'W' ? 'wall' : ''} ${cell === 'G' ? 'gem' : ''} ${cell === 'L' ? 'lamp' : ''} ${isTarget ? 'target' : ''} ${isLit ? 'lit' : ''} ${isCollected ? 'collected' : ''}`}
                style={{ left: x * CELL, top: y * CELL, width: CELL, height: CELL }}
              >
                {cell === 'G' && !isCollected && <span className="rb-cell-icon">⚙️</span>}
                {cell === 'L' && <span className={`rb-cell-icon ${isLit ? 'glow' : 'dim'}`}>{isLit ? '💡' : '🔌'}</span>}
                {isTarget && <span className="rb-cell-icon target-icon">🟢</span>}
              </div>
            )
          })
        )}

        {/* Robot */}
        {robot && (
          <div
            className={`rb-robot dir-${dirClass} ${robot.message === 'bonk' ? 'bonk' : ''} ${robot.won ? 'celebrate' : ''}`}
            style={{ left: robot.x * CELL, top: robot.y * CELL, width: CELL, height: CELL, transition: 'left 0.25s, top 0.25s' }}
          >
            <span className="rb-robot-face">🤖</span>
          </div>
        )}
      </div>

      {/* Hint */}
      {phase === 'build' && program.length === 0 && (
        <div className="rb-hint">{level.hint}</div>
      )}

      {/* Result overlay */}
      {phase === 'result' && (
        <div className="rb-result">
          {robot?.won ? (
            <>
              <span className="rb-result-icon">🎉</span>
              <span className="rb-result-text">Level Complete!</span>
              <span className="rb-result-cards">{program.length} cards used (par: {level.par})</span>
              <span className="rb-result-gears">
                {program.length <= level.par ? '⚙️⚙️⚙️' : program.length <= level.par + 2 ? '⚙️⚙️⚪' : '⚙️⚪⚪'}
              </span>
              <button className="rb-btn" onClick={nextLevel}>{levelIndex + 1 < levels.length ? 'Next Level' : 'Finish'}</button>
              <button className="rb-btn-ghost" onClick={retry}>Try for fewer cards</button>
            </>
          ) : (
            <>
              <span className="rb-result-icon">😵</span>
              <span className="rb-result-text">{robot?.message === 'bonk' ? 'The robot hit a wall!' : 'The robot didn\'t reach the goal.'}</span>
              <button className="rb-btn" onClick={retry}>Try Again</button>
            </>
          )}
        </div>
      )}

      {/* Conveyor belt (program strip) */}
      <div className="rb-conveyor">
        <div className="rb-conveyor-label">PROGRAM</div>
        <div className="rb-belt">
          {program.length === 0 && (
            <div className="rb-belt-empty">Drag cards here to build your program</div>
          )}
          {program.map((cardId, i) => (
            <div
              key={i}
              className={`rb-belt-card ${execIndex === i ? 'executing' : ''}`}
              onClick={() => removeCard(i)}
              title="Click to remove"
            >
              <span className="rb-belt-card-icon">{CARDS[cardId].icon}</span>
              <span className="rb-belt-card-name">{CARDS[cardId].name}</span>
            </div>
          ))}
        </div>
        <div className="rb-controls">
          {phase === 'build' && (
            <>
              <button className="rb-go" onClick={runProgram} disabled={program.length === 0}>▶ GO</button>
              <button className="rb-btn-ghost" onClick={clearProgram} disabled={program.length === 0}>Clear</button>
            </>
          )}
          {phase === 'running' && (
            <button className="rb-btn-ghost" onClick={stopExec}>⏹ Stop</button>
          )}
        </div>
      </div>

      {/* Card hand */}
      <div className="rb-hand">
        {availableCards.map((card) => (
          <button
            key={card.id}
            className="rb-card"
            style={{ borderColor: card.color }}
            onClick={() => addCard(card.id)}
            disabled={phase !== 'build'}
          >
            <span className="rb-card-icon">{card.icon}</span>
            <span className="rb-card-name">{card.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
