import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { CARDS, DIRECTIONS, createRobotState, executeStep, flattenProgram } from './robot/engine'
import { createScene, tileToWorld } from './robot/scene3d'
import { createRobot, getDirRotation, animateRobot, setRobotAnim } from './robot/robotModel'
import { createGear, createLamp, createTarget, animateObjects, collectGear, lightUpLamp } from './robot/objects3d'
import './RobotRenderer.css'

const EXEC_DELAY = 350

export default function RobotRenderer({ levels, narrative }) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const robotRef = useRef(null)
  const objectsRef = useRef([])
  const clockRef = useRef(0)
  const execRef = useRef(null)

  const [levelIndex, setLevelIndex] = useState(0)
  const [phase, setPhase] = useState('intro')
  const [program, setProgram] = useState([]) // array of strings or { type, count/condition, body: [] }
  const [editingLoop, setEditingLoop] = useState(null) // index of top-level block being edited
  const [editingNested, setEditingNested] = useState(null) // index of nested block inside editingLoop
  const [robotState, setRobotState] = useState(null)
  const [execIndex, setExecIndex] = useState(-1)
  const [gears, setGears] = useState([])

  const level = levels[levelIndex]
  const availableCards = level?.cards?.map((id) => CARDS[id]) || []

  // Three.js setup
  useEffect(() => {
    if (phase === 'intro' || !level) return
    const container = containerRef.current
    if (!container) return
    while (container.firstChild?.tagName === 'CANVAS') container.removeChild(container.firstChild)

    const s = createScene(container, level)
    container.insertBefore(s.renderer.domElement, container.firstChild)
    sceneRef.current = s

    const robot = createRobot()
    const startPos = tileToWorld(level.start[0], level.start[1])
    robot.position.set(startPos.x, startPos.y, startPos.z)
    robot.rotation.y = getDirRotation(DIRECTIONS.indexOf(level.startDir || 'up'))
    robot.userData.targetX = startPos.x
    robot.userData.targetZ = startPos.z
    robot.userData.targetRotY = robot.rotation.y
    s.scene.add(robot)
    robotRef.current = robot

    const objects = []
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const cell = level.grid[y][x]
        const pos = tileToWorld(x, y)
        if (cell === 'G') { const g = createGear(pos.x, pos.z); s.scene.add(g); objects.push(g) }
        if (cell === 'L') { const l = createLamp(pos.x, pos.z); s.scene.add(l); objects.push(l) }
      }
    }
    if (level.goal === 'reach' && level.target) {
      const tp = tileToWorld(level.target[0], level.target[1])
      const t = createTarget(tp.x, tp.z); s.scene.add(t); objects.push(t)
    }
    objectsRef.current = objects

    let frame
    const animate = () => {
      clockRef.current += 0.016
      animateRobot(robot, clockRef.current)
      animateObjects(objects, clockRef.current)
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
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', handleResize); s.renderer.dispose() }
  }, [levelIndex, phase === 'intro'])

  const initLevel = useCallback(() => {
    setProgram([])
    setEditingLoop(null); setEditingNested(null)
    setRobotState(createRobotState(level))
    setExecIndex(-1)
    setPhase('build')
  }, [level])

  function addCard(cardId) {
    if (phase !== 'build') return
    const card = CARDS[cardId]

    if (editingNested !== null && editingLoop !== null) {
      // Adding inside a nested block (e.g., If Wall inside Repeat)
      const next = [...program]
      const block = next[editingLoop]
      const nested = block?.body?.[editingNested]
      if (nested && typeof nested === 'object' && nested.body.length < 6) {
        if (card.type === 'loop' || card.type === 'cond') return // no deeper nesting
        nested.body = [...nested.body, cardId]
        block.body = [...block.body]
        block.body[editingNested] = { ...nested }
      }
      setProgram(next)
    } else if (editingLoop !== null) {
      // Adding inside a top-level block
      const next = [...program]
      const block = next[editingLoop]
      if (block && block.body.length < 6) {
        if (card.type === 'loop') {
          const nested = { type: 'loop', count: card.count, body: [], cardId }
          block.body = [...block.body, nested]
          setProgram(next)
          setEditingNested(block.body.length - 1)
          return
        } else if (card.type === 'cond') {
          const nested = { type: 'cond', condition: card.condition, body: [], cardId }
          block.body = [...block.body, nested]
          setProgram(next)
          setEditingNested(block.body.length - 1)
          return
        } else {
          block.body = [...block.body, cardId]
        }
      }
      setProgram(next)
    } else if (card.type === 'loop') {
      const newLoop = { type: 'loop', count: card.count, body: [], cardId }
      setProgram([...program, newLoop])
      setEditingLoop(program.length)
    } else if (card.type === 'cond') {
      const newCond = { type: 'cond', condition: card.condition, body: [], cardId }
      setProgram([...program, newCond])
      setEditingLoop(program.length)
    } else {
      if (program.length < 16) setProgram([...program, cardId])
    }
  }

  function removeFromProgram(index) {
    if (phase !== 'build') return
    if (editingLoop === index) { setEditingLoop(null); setEditingNested(null) }
    setProgram(program.filter((_, i) => i !== index))
    if (editingLoop !== null && editingLoop > index) setEditingLoop(editingLoop - 1)
  }

  function removeFromBody(blockIndex, bodyIndex) {
    if (phase !== 'build') return
    if (editingNested === bodyIndex) setEditingNested(null)
    else if (editingNested !== null && editingNested > bodyIndex) setEditingNested(editingNested - 1)
    const next = [...program]
    const block = next[blockIndex]
    if (block?.body) {
      block.body = block.body.filter((_, i) => i !== bodyIndex)
      setProgram(next)
    }
  }

  function ejectFromBody(blockIndex, bodyIndex) {
    if (phase !== 'build') return
    const next = [...program]
    const block = next[blockIndex]
    if (!block?.body) return
    const item = block.body[bodyIndex]
    block.body = block.body.filter((_, i) => i !== bodyIndex)
    // Insert after the parent block in the top-level program
    next.splice(blockIndex + 1, 0, item)
    if (editingNested === bodyIndex) setEditingNested(null)
    else if (editingNested !== null && editingNested > bodyIndex) setEditingNested(editingNested - 1)
    setProgram(next)
  }

  function finishBlock() {
    if (editingNested !== null) {
      setEditingNested(null) // go back to editing parent block
    } else {
      setEditingLoop(null); setEditingNested(null)
    }
  }

  function moveItem(index, dir) {
    if (phase !== 'build') return
    const target = index + dir
    if (target < 0 || target >= program.length) return
    const next = [...program]
    ;[next[index], next[target]] = [next[target], next[index]]
    setProgram(next)
    if (editingLoop === index) setEditingLoop(target)
    else if (editingLoop === target) setEditingLoop(index)
  }

  function moveBodyItem(blockIndex, bodyIndex, dir) {
    if (phase !== 'build') return
    const target = bodyIndex + dir
    const block = program[blockIndex]
    if (!block?.body || target < 0 || target >= block.body.length) return
    const next = [...program]
    const body = [...block.body]
    ;[body[bodyIndex], body[target]] = [body[target], body[bodyIndex]]
    next[blockIndex] = { ...block, body }
    setProgram(next)
  }

  function clearProgram() {
    setProgram([])
    setEditingLoop(null); setEditingNested(null)
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
    setEditingLoop(null); setEditingNested(null)
    resetRobot3D()

    const initState = createRobotState(level)
    const flatSteps = flattenProgram(program, initState, level)

    // Execute step by step using the flattened list
    let state = initState
    const executed = []
    for (const step of flatSteps) {
      state = executeStep(state, step.card, level)
      executed.push({ ...state, command: step.card })
      if (state.won) break
    }

    let step = 0
    const animate = () => {
      if (step >= executed.length) {
        setExecIndex(-1)
        setRobotState(executed[executed.length - 1] || initState)
        if (executed[executed.length - 1]?.won) setRobotAnim(robotRef.current, 'celebrate', clockRef.current)
        setPhase('result')
        return
      }

      const s = executed[step]
      setExecIndex(step)
      setRobotState(s)

      const robot = robotRef.current
      const pos = tileToWorld(s.x, s.y)
      robot.userData.targetX = pos.x
      robot.userData.targetZ = pos.z
      robot.userData.targetRotY = getDirRotation(s.dir)

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
    execRef.current = setTimeout(animate, 200)
  }

  function stopExec() {
    clearTimeout(execRef.current)
    setPhase('build')
    setExecIndex(-1)
    resetRobot3D()
  }

  function nextLevel() {
    const won = robotState?.won
    const flat = flattenProgram(program, createRobotState(level), level)
    const par = level.par
    let g = 0
    if (won) g = flat.length <= par ? 3 : flat.length <= par + 2 ? 2 : 1
    setGears([...gears, g])
    if (levelIndex + 1 < levels.length) {
      setLevelIndex(levelIndex + 1)
      setPhase('build')
      setProgram([])
      setEditingLoop(null); setEditingNested(null)
      setExecIndex(-1)
    } else {
      setPhase('complete')
    }
  }

  function retry() {
    setPhase('build')
    setProgram([])
    setEditingLoop(null); setEditingNested(null)
    resetRobot3D()
    setExecIndex(-1)
  }

  // Count total actions for display
  const flatCount = phase === 'result' && robotState
    ? flattenProgram(program, createRobotState(level), level).length
    : program.reduce((n, item) => n + (typeof item === 'string' ? 1 : item.body.length * (item.type === 'loop' ? item.count : 1)), 0)

  // Intro
  if (phase === 'intro') {
    return (
      <div className="rb-wrapper">
        <Link to="/" className="rb-exit">Exit</Link>
        <div className="rb-intro">
          <div className="rb-robot-big-sym">▲</div>
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
          <Link to="/" className="rb-btn">Back to Track</Link>
        </div>
      </div>
    )
  }

  // Render a card symbol
  function CardSym({ cardId, small }) {
    const card = CARDS[cardId]
    if (!card) return null
    return (
      <span className={`rb-sym ${small ? 'small' : ''}`} style={{ color: card.color }}>{card.sym}</span>
    )
  }

  return (
    <div className="rb-wrapper">
      <Link to="/" className="rb-exit">Exit</Link>
      <div ref={containerRef} className="rb-canvas" />

      {/* HUD */}
      <div className="rb-hud">
        <span className="rb-hud-level">Level {levelIndex + 1}</span>
        <span className="rb-hud-name">{level.name}</span>
        <span className="rb-hud-par">Par: {level.par}</span>
      </div>

      {phase === 'build' && program.length === 0 && (
        <div className="rb-hint">{level.hint}</div>
      )}

      {/* Result */}
      {phase === 'result' && (
        <div className="rb-result-overlay">
          {robotState?.won ? (
            <>
              <div className="rb-result-title">{flatCount <= level.par ? 'Perfect!' : 'Level Complete!'}</div>
              <div className="rb-result-info">{flatCount} steps · optimal {level.par}</div>
              {flatCount > level.par && (
                <div className="rb-result-suboptimal">
                  You solved it, but there's a {level.par}-step solution. Can you find it?
                </div>
              )}
              <div className="rb-result-gears">
                {'⚙'.repeat(flatCount <= level.par ? 3 : flatCount <= level.par + 2 ? 2 : 1)}
                {'○'.repeat(3 - (flatCount <= level.par ? 3 : flatCount <= level.par + 2 ? 2 : 1))}
              </div>
              <button className="rb-btn" onClick={nextLevel}>{levelIndex + 1 < levels.length ? 'Next Level' : 'Finish'}</button>
              {flatCount > level.par && (
                <button className="rb-btn-ghost" onClick={retry}>Try for {level.par} steps</button>
              )}
            </>
          ) : (
            <>
              <div className="rb-result-title">{robotState?.message === 'bonk' ? 'Bonk!' : 'Not quite...'}</div>
              <button className="rb-btn" onClick={retry}>Try Again</button>
            </>
          )}
        </div>
      )}

      {/* Bottom panel */}
      <div className="rb-bottom">
        {/* Program strip */}
        <div className="rb-conveyor">
          <div className="rb-belt">
            {program.length === 0 && <span className="rb-belt-empty">Tap cards below to build your program</span>}
            {program.map((item, i) => {
              if (typeof item === 'string') {
                return (
                  <div key={i} className={`rb-belt-card ${execIndex === i ? 'exec' : ''}`}>
                    <CardSym cardId={item} />
                    {phase === 'build' && (
                      <div className="rb-belt-actions">
                        {i > 0 && <button className="rb-belt-move" onClick={() => moveItem(i, -1)}>‹</button>}
                        {i < program.length - 1 && <button className="rb-belt-move" onClick={() => moveItem(i, 1)}>›</button>}
                        <button className="rb-belt-del" onClick={() => removeFromProgram(i)}>×</button>
                      </div>
                    )}
                  </div>
                )
              }
              // Loop or conditional block
              const card = CARDS[item.cardId]
              const isEditing = editingLoop === i
              return (
                <div key={i} className={`rb-belt-block ${isEditing ? 'editing' : ''}`} style={{ borderColor: card?.color }}>
                  <div className="rb-block-header">
                    <span className="rb-block-label" style={{ color: card?.color }}>{card?.name}</span>
                    <div className="rb-belt-actions">
                      {i > 0 && phase === 'build' && <button className="rb-belt-move" onClick={() => moveItem(i, -1)}>‹</button>}
                      {i < program.length - 1 && phase === 'build' && <button className="rb-belt-move" onClick={() => moveItem(i, 1)}>›</button>}
                      <button className="rb-belt-del" onClick={() => removeFromProgram(i)}>×</button>
                    </div>
                  </div>
                  <div className="rb-block-body">
                    {item.body.length === 0 && isEditing && (
                      <span className="rb-block-placeholder">Add cards inside</span>
                    )}
                    {item.body.map((bodyItem, j) => {
                      if (typeof bodyItem === 'string') {
                        return (
                          <div key={j} className="rb-belt-card nested">
                            <CardSym cardId={bodyItem} small />
                            {isEditing && (
                              <div className="rb-belt-actions">
                                {j > 0 && <button className="rb-belt-move sm" onClick={() => moveBodyItem(i, j, -1)}>‹</button>}
                                {j < item.body.length - 1 && <button className="rb-belt-move sm" onClick={() => moveBodyItem(i, j, 1)}>›</button>}
                                <button className="rb-belt-eject" onClick={() => ejectFromBody(i, j)} title="Eject">↑</button>
                                <button className="rb-belt-del" onClick={() => removeFromBody(i, j)}>×</button>
                              </div>
                            )}
                          </div>
                        )
                      }
                      // Nested block (cond inside loop, etc)
                      const nestedCard = CARDS[bodyItem.cardId]
                      const isEditingNested = isEditing && editingNested === j
                      return (
                        <div key={j} className={`rb-belt-block nested-block ${isEditingNested ? 'editing' : ''}`} style={{ borderColor: nestedCard?.color }}>
                          <div className="rb-block-header">
                            <span className="rb-block-label" style={{ color: nestedCard?.color }}>{nestedCard?.name}</span>
                            {isEditing && (
                              <div className="rb-belt-actions">
                                <button className="rb-belt-eject" onClick={() => ejectFromBody(i, j)} title="Eject">↑</button>
                                <button className="rb-belt-del" onClick={() => removeFromBody(i, j)}>×</button>
                              </div>
                            )}
                          </div>
                          <div className="rb-block-body">
                            {bodyItem.body.length === 0 && isEditingNested && (
                              <span className="rb-block-placeholder">Add cards</span>
                            )}
                            {bodyItem.body.map((innerCard, k) => (
                              <div key={k} className="rb-belt-card nested">
                                <CardSym cardId={innerCard} small />
                              </div>
                            ))}
                          </div>
                          {isEditingNested && (
                            <button className="rb-block-done" onClick={finishBlock}>Done</button>
                          )}
                          {!isEditingNested && isEditing && (
                            <button className="rb-block-edit" onClick={() => setEditingNested(j)}>Edit</button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {isEditing && (
                    <button className="rb-block-done" onClick={finishBlock}>Done</button>
                  )}
                  {!isEditing && phase === 'build' && (
                    <button className="rb-block-edit" onClick={() => setEditingLoop(i)}>Edit</button>
                  )}
                </div>
              )
            })}
          </div>
          <div className="rb-conveyor-controls">
            {phase === 'build' && (
              <>
                <button className="rb-go" onClick={runProgram} disabled={program.length === 0 || editingLoop !== null}>▶ RUN</button>
                <button className="rb-btn-ghost" onClick={clearProgram}>Clear</button>
              </>
            )}
            {phase === 'running' && (
              <button className="rb-btn-ghost" onClick={stopExec}>■ Stop</button>
            )}
          </div>
        </div>

        {/* Card hand */}
        <div className="rb-hand">
          {availableCards.map((card) => (
            <button key={card.id} className="rb-card" style={{ '--card-color': card.color }} onClick={() => addCard(card.id)} disabled={phase !== 'build'}>
              <span className="rb-card-sym" style={{ color: card.color }}>{card.sym}</span>
              <span className="rb-card-name">{card.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
