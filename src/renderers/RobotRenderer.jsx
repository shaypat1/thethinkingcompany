import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { CARDS, DIRECTIONS, createRobotState, executeStep } from './robot/engine'
import { createScene, tileToWorld } from './robot/scene3d'
import { createRobot, getDirRotation, animateRobot, setRobotAnim } from './robot/robotModel'
import { createGear, createLamp, createTarget, animateObjects, collectGear, lightUpLamp } from './robot/objects3d'
import './RobotRenderer.css'

const EXEC_DELAY = 450

export default function RobotRenderer({ levels, narrative }) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const robotRef = useRef(null)
  const objectsRef = useRef([])
  const clockRef = useRef(0)
  const execRef = useRef(null)

  const [levelIndex, setLevelIndex] = useState(0)
  const [phase, setPhase] = useState('intro')
  const [program, setProgram] = useState([])
  const [robotState, setRobotState] = useState(null)
  const [execIndex, setExecIndex] = useState(-1)
  const [gears, setGears] = useState([])

  const level = levels[levelIndex]
  const availableCards = level?.cards?.map((id) => CARDS[id]) || []

  // Setup Three.js scene when level changes
  useEffect(() => {
    if (phase === 'intro' || !level) return
    const container = containerRef.current
    if (!container) return

    // Clean previous
    while (container.firstChild?.tagName === 'CANVAS') container.removeChild(container.firstChild)

    const s = createScene(container, level)
    container.insertBefore(s.renderer.domElement, container.firstChild)
    sceneRef.current = s

    // Create robot
    const robot = createRobot()
    const startPos = tileToWorld(level.start[0], level.start[1])
    robot.position.set(startPos.x, startPos.y, startPos.z)
    robot.rotation.y = getDirRotation(DIRECTIONS.indexOf(level.startDir || 'up'))
    robot.userData.targetX = startPos.x
    robot.userData.targetZ = startPos.z
    robot.userData.targetRotY = robot.rotation.y
    s.scene.add(robot)
    robotRef.current = robot

    // Create objects
    const objects = []
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const cell = level.grid[y][x]
        const pos = tileToWorld(x, y)
        if (cell === 'G') {
          const gear = createGear(pos.x, pos.z)
          s.scene.add(gear)
          objects.push(gear)
        }
        if (cell === 'L') {
          const lamp = createLamp(pos.x, pos.z)
          s.scene.add(lamp)
          objects.push(lamp)
        }
      }
    }
    if (level.goal === 'reach' && level.target) {
      const tp = tileToWorld(level.target[0], level.target[1])
      const target = createTarget(tp.x, tp.z)
      s.scene.add(target)
      objects.push(target)
    }
    objectsRef.current = objects

    // Animation loop
    let frame
    const animate = () => {
      clockRef.current += 0.016
      const t = clockRef.current
      animateRobot(robot, t)
      animateObjects(objects, t)
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
      s.renderer.dispose()
    }
  }, [levelIndex, phase === 'intro'])

  const initLevel = useCallback(() => {
    setProgram([])
    setRobotState(createRobotState(level))
    setExecIndex(-1)
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
    resetRobot3D()
  }

  function resetRobot3D() {
    const robot = robotRef.current
    if (!robot || !level) return
    const pos = tileToWorld(level.start[0], level.start[1])
    robot.userData.targetX = pos.x
    robot.userData.targetZ = pos.z
    robot.userData.targetRotY = getDirRotation(DIRECTIONS.indexOf(level.startDir || 'up'))
    robot.userData.animState = 'idle'

    // Reset objects
    objectsRef.current.forEach((obj) => {
      if (obj.userData.type === 'gear') { obj.userData.collected = false; obj.visible = true }
      if (obj.userData.type === 'lamp' && obj.userData.lit) {
        obj.userData.lit = false
        obj.userData.bulbMat.color.setHex(0x444455)
        obj.userData.bulbMat.emissive.setHex(0x000000)
        obj.userData.bulbMat.emissiveIntensity = 0
        obj.userData.light.intensity = 0
      }
    })
    setRobotState(createRobotState(level))
  }

  function runProgram() {
    if (program.length === 0) return
    setPhase('running')
    resetRobot3D()

    let state = createRobotState(level)
    const steps = []
    for (let i = 0; i < program.length; i++) {
      state = executeStep(state, program[i], level)
      steps.push({ ...state, cardIndex: i, command: program[i] })
      if (state.won) break
    }

    let step = 0
    const animate = () => {
      if (step >= steps.length) {
        setExecIndex(-1)
        setRobotState(steps[steps.length - 1])
        if (steps[steps.length - 1].won) {
          setRobotAnim(robotRef.current, 'celebrate', clockRef.current)
        }
        setPhase('result')
        return
      }

      const s = steps[step]
      setExecIndex(s.cardIndex)
      setRobotState(s)

      const robot = robotRef.current
      const pos = tileToWorld(s.x, s.y)
      robot.userData.targetX = pos.x
      robot.userData.targetZ = pos.z
      robot.userData.targetRotY = getDirRotation(s.dir)

      // Trigger 3D animations based on message
      if (s.message === 'bonk') setRobotAnim(robot, 'bonk', clockRef.current)
      else if (s.message === 'pickup') {
        setRobotAnim(robot, 'pickup', clockRef.current)
        const gear = objectsRef.current.find((o) => o.userData.type === 'gear' && !o.userData.collected &&
          Math.abs(o.position.x - pos.x) < 0.5 && Math.abs(o.position.z - pos.z) < 0.5)
        if (gear) collectGear(gear)
      } else if (s.message === 'light') {
        setRobotAnim(robot, 'light', clockRef.current)
        const lamp = objectsRef.current.find((o) => o.userData.type === 'lamp' && !o.userData.lit &&
          Math.abs(o.position.x - pos.x) < 0.5 && Math.abs(o.position.z - pos.z) < 0.5)
        if (lamp) lightUpLamp(lamp)
      } else if (s.command === 'forward' && s.message !== 'bonk') {
        setRobotAnim(robot, 'moving', clockRef.current)
      }

      step++
      execRef.current = setTimeout(animate, EXEC_DELAY)
    }
    execRef.current = setTimeout(animate, 300)
  }

  function stopExec() {
    clearTimeout(execRef.current)
    setPhase('build')
    setExecIndex(-1)
    resetRobot3D()
  }

  function nextLevel() {
    const won = robotState?.won
    const par = level.par
    let g = 0
    if (won) g = program.length <= par ? 3 : program.length <= par + 2 ? 2 : 1
    setGears([...gears, g])
    if (levelIndex + 1 < levels.length) {
      setLevelIndex(levelIndex + 1)
      setPhase('build')
      setProgram([])
      setExecIndex(-1)
    } else {
      setPhase('complete')
    }
  }

  function retry() {
    setPhase('build')
    setProgram([])
    resetRobot3D()
    setExecIndex(-1)
  }

  // Intro
  if (phase === 'intro') {
    return (
      <div className="rb-wrapper">
        <Link to="/" className="rb-exit">Exit</Link>
        <div className="rb-intro">
          <div className="rb-robot-big">🤖</div>
          <h1 className="rb-title">{levels[0]?.__title || 'Robot Workshop'}</h1>
          <p className="rb-narrative">{narrative}</p>
          <p className="rb-level-count">{levels.length} levels</p>
          <button className="rb-btn" onClick={initLevel}>Start</button>
        </div>
      </div>
    )
  }

  // Complete
  if (phase === 'complete') {
    const total = gears.reduce((a, b) => a + b, 0)
    return (
      <div className="rb-wrapper">
        <Link to="/" className="rb-exit">Exit</Link>
        <div className="rb-intro">
          <h1 className="rb-title">Workshop Complete!</h1>
          <div className="rb-total-score">{total}/{levels.length * 3}</div>
          <div className="rb-total-label">gears earned</div>
          <div className="rb-gear-summary">
            {gears.map((g, i) => (
              <span key={i} className="rb-gear-item">L{i + 1}: {'⚙️'.repeat(g)}{'⚪'.repeat(3 - g)}</span>
            ))}
          </div>
          <Link to="/" className="rb-btn">Back to Track</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rb-wrapper">
      <Link to="/" className="rb-exit">Exit</Link>

      {/* 3D Canvas container */}
      <div ref={containerRef} className="rb-canvas" />

      {/* HUD overlay */}
      <div className="rb-hud">
        <span className="rb-hud-level">Level {levelIndex + 1}</span>
        <span className="rb-hud-name">{level.name}</span>
        <span className="rb-hud-par">Par: {level.par}</span>
      </div>

      {/* Hint */}
      {phase === 'build' && program.length === 0 && (
        <div className="rb-hint">{level.hint}</div>
      )}

      {/* Result overlay */}
      {phase === 'result' && (
        <div className="rb-result-overlay">
          {robotState?.won ? (
            <>
              <div className="rb-result-title">Level Complete!</div>
              <div className="rb-result-info">{program.length} cards · par {level.par}</div>
              <div className="rb-result-gears">
                {program.length <= level.par ? '⚙️⚙️⚙️' : program.length <= level.par + 2 ? '⚙️⚙️⚪' : '⚙️⚪⚪'}
              </div>
              <button className="rb-btn" onClick={nextLevel}>{levelIndex + 1 < levels.length ? 'Next Level' : 'Finish'}</button>
              <button className="rb-btn-ghost" onClick={retry}>Optimize</button>
            </>
          ) : (
            <>
              <div className="rb-result-title">{robotState?.message === 'bonk' ? 'Bonk!' : 'Not quite...'}</div>
              <button className="rb-btn" onClick={retry}>Try Again</button>
            </>
          )}
        </div>
      )}

      {/* Card hand + conveyor */}
      <div className="rb-bottom">
        <div className="rb-conveyor">
          <div className="rb-belt-label">PROGRAM</div>
          <div className="rb-belt">
            {program.length === 0 && <span className="rb-belt-empty">Add cards to build your program</span>}
            {program.map((cardId, i) => (
              <div key={i} className={`rb-belt-card ${execIndex === i ? 'exec' : ''}`} onClick={() => removeCard(i)}>
                <span className="rb-belt-icon">{CARDS[cardId].icon}</span>
              </div>
            ))}
          </div>
          <div className="rb-conveyor-controls">
            {phase === 'build' && (
              <>
                <button className="rb-go" onClick={runProgram} disabled={program.length === 0}>▶ RUN</button>
                <button className="rb-btn-ghost" onClick={clearProgram}>Clear</button>
              </>
            )}
            {phase === 'running' && (
              <button className="rb-btn-ghost" onClick={stopExec}>⏹ Stop</button>
            )}
          </div>
        </div>
        <div className="rb-hand">
          {availableCards.map((card) => (
            <button key={card.id} className="rb-card" style={{ '--card-color': card.color }} onClick={() => addCard(card.id)} disabled={phase !== 'build'}>
              <span className="rb-card-icon">{card.icon}</span>
              <span className="rb-card-name">{card.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
