import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import * as THREE from 'three'
import { createState, placeBuilding, selectCell } from './skyscraper/engine'
import { createScene, tileCenter, createBuilding, highlightTile, addClues, TILE, GAP } from './skyscraper/scene3d'
import './SkyscraperRenderer.css'

export default function SkyscraperRenderer({ levels, narrative, onLevelComplete, onLevelFail, skipIntro }) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const buildingsRef = useRef({}) // "row,col" → THREE.Group
  const handleRef = useRef(null)

  const [levelIndex, setLevelIndex] = useState(0)
  const [phase, setPhase] = useState(skipIntro ? 'play' : 'intro')
  const calledBack = useRef(false)
  const [state, setState] = useState(null)
  const [gears, setGears] = useState([])

  const level = levels[levelIndex]

  // Three.js setup
  useEffect(() => {
    if (phase === 'intro' || phase === 'complete' || !level) return
    const el = containerRef.current
    if (!el) return
    while (el.firstChild?.tagName === 'CANVAS') el.removeChild(el.firstChild)

    const s = createScene(el, level.size)
    el.insertBefore(s.renderer.domElement, el.firstChild)
    sceneRef.current = s
    buildingsRef.current = {}

    // Add clue numbers around the grid
    addClues(s.scene, level.clues, level.size)

    // Place prefilled buildings
    if (level.prefilled) {
      for (const [r, c, h] of level.prefilled) {
        const bld = createBuilding(h, level.size)
        const pos = tileCenter(r, c)
        bld.position.set(pos.x, pos.y, pos.z)
        s.scene.add(bld)
        buildingsRef.current[`${r},${c}`] = bld
      }
    }

    // Click handler
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    const canvas = s.renderer.domElement

    const onPointer = (e) => {
      mouse.x = (e.offsetX / canvas.clientWidth) * 2 - 1
      mouse.y = -(e.offsetY / canvas.clientHeight) * 2 + 1
      raycaster.setFromCamera(mouse, s.camera)

      // Raycast against tiles AND buildings
      const allMeshes = []
      s.tiles.flat().forEach(t => allMeshes.push(t.mesh))
      Object.entries(buildingsRef.current).forEach(([key, group]) => {
        group.traverse(child => { if (child.isMesh) allMeshes.push(child) })
      })

      const hits = raycaster.intersectObjects(allMeshes, false)
      if (hits.length === 0) return

      const hit = hits[0].object

      // Check if it's a tile
      for (let r = 0; r < level.size; r++) {
        for (let c = 0; c < level.size; c++) {
          if (s.tiles[r][c].mesh === hit) {
            handleRef.current?.(r, c)
            return
          }
        }
      }

      // Check if it's part of a building
      for (const [key, group] of Object.entries(buildingsRef.current)) {
        let isChild = false
        group.traverse(child => { if (child === hit) isChild = true })
        if (isChild) {
          const [r, c] = key.split(',').map(Number)
          handleRef.current?.(r, c)
          return
        }
      }
    }
    canvas.addEventListener('pointerdown', onPointer)

    let frame
    const animate = () => {
      s.controls.update()
      s.renderer.render(s.scene, s.camera)
      frame = requestAnimationFrame(animate)
    }
    animate()

    const onResize = () => {
      s.camera.aspect = el.clientWidth / el.clientHeight
      s.camera.updateProjectionMatrix()
      s.renderer.setSize(el.clientWidth, el.clientHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(frame)
      canvas.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('resize', onResize)
      s.controls.dispose()
      s.renderer.dispose()
    }
  }, [levelIndex, phase === 'intro'])

  // Sync 3D buildings with state
  useEffect(() => {
    if (!state || !sceneRef.current) return
    const s = sceneRef.current
    const n = state.n

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const key = `${r},${c}`
        const h = state.grid[r][c]
        const existing = buildingsRef.current[key]

        // Highlight tile
        const isPrefilled = level.prefilled?.some(([pr, pc]) => pr === r && pc === c)
        if (state.selected && state.selected[0] === r && state.selected[1] === c) {
          highlightTile(s.tiles[r][c], 'selected')
        } else if (state.errors.has(key)) {
          highlightTile(s.tiles[r][c], 'error')
        } else {
          highlightTile(s.tiles[r][c], null)
        }

        // Update building
        if (h === 0 && existing) {
          s.scene.remove(existing)
          delete buildingsRef.current[key]
        } else if (h > 0 && (!existing || existing.userData.height !== h)) {
          if (existing) s.scene.remove(existing)
          const bld = createBuilding(h, n)
          const pos = tileCenter(r, c)
          bld.position.set(pos.x, pos.y, pos.z)
          s.scene.add(bld)
          buildingsRef.current[key] = bld
        }
      }
    }
  }, [state])

  // Win detection
  useEffect(() => {
    if (phase !== 'play' || !state?.won) return
    if (onLevelComplete && !calledBack.current) {
      calledBack.current = true
      const t = setTimeout(() => onLevelComplete(levelIndex), 800)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setPhase('result'), 800)
    return () => clearTimeout(t)
  }, [state?.won, phase])

  // Click handler ref — allow selecting any cell (including prefilled for visual feedback)
  handleRef.current = (row, col) => {
    if (phase !== 'play' || !state) return
    const next = selectCell(state, row, col)
    setState(next)
  }

  function handleNumberKey(num) {
    if (!state?.selected || state.won) return
    const [r, c] = state.selected
    if (level.prefilled?.some(([pr, pc]) => pr === r && pc === c)) return
    const next = placeBuilding(state, r, c, num)
    setState(next)
  }

  const initLevel = useCallback(() => {
    const s = createState(level)
    if (level.prefilled) {
      for (const [r, c, h] of level.prefilled) {
        s.grid[r][c] = h
      }
    }
    setState(s)
    setPhase('play')
  }, [level])

  // Auto-init when skipIntro
  useEffect(() => {
    if (skipIntro && !state && level) {
      const s = createState(level)
      if (level.prefilled) {
        for (const [r, c, h] of level.prefilled) s.grid[r][c] = h
      }
      setState(s)
    }
  }, [skipIntro, level])

  function nextLevel() {
    const elapsed = (Date.now() - state.startTime) / 1000
    let g = elapsed < 60 ? 3 : elapsed < 120 ? 2 : 1
    if (!state.won) g = 0
    setGears([...gears, g])
    if (levelIndex + 1 < levels.length) {
      setLevelIndex(levelIndex + 1)
      setPhase('play')
      const ns = createState(levels[levelIndex + 1])
      if (levels[levelIndex + 1].prefilled) {
        for (const [r, c, h] of levels[levelIndex + 1].prefilled) ns.grid[r][c] = h
      }
      setState(ns)
    } else {
      setPhase('complete')
    }
  }

  function retry() {
    const s = createState(level)
    if (level.prefilled) {
      for (const [r, c, h] of level.prefilled) s.grid[r][c] = h
    }
    setState(s)
    setPhase('play')
  }

  // Intro
  if (phase === 'intro') {
    return (
      <div className="sky-wrapper">
        <Link to="/" className="sky-exit">Exit</Link>
        <div className="sky-intro">
          <div className="sky-big-sym">🏙️</div>
          <h1 className="sky-title">{levels[0]?.__title || 'Sky City'}</h1>
          <p className="sky-narrative">{narrative}</p>
          <p className="sky-count">{levels.length} puzzles</p>
          <button className="sky-btn" onClick={initLevel}>Start</button>
        </div>
      </div>
    )
  }

  // Complete
  if (phase === 'complete') {
    const total = gears.reduce((a, b) => a + b, 0)
    return (
      <div className="sky-wrapper">
        <Link to="/" className="sky-exit">Exit</Link>
        <div className="sky-intro">
          <div className="sky-big-sym">✅</div>
          <h1 className="sky-title">City Complete!</h1>
          <div className="sky-total-score">{total}/{levels.length * 3}</div>
          <div className="sky-total-label">gears earned</div>
          <Link to="/" className="sky-btn">Back to Track</Link>
        </div>
      </div>
    )
  }

  const n = state?.n || 4
  const sel = state?.selected

  return (
    <div className="sky-wrapper">
      {!onLevelComplete && <Link to="/" className="sky-exit">Exit</Link>}
      <div ref={containerRef} className="sky-canvas" />

      {/* Scanlines overlay */}
      <div className="sky-scanlines" />

      {/* HUD */}
      <div className="sky-hud">
        <span className="sky-hud-level">Level {levelIndex + 1}</span>
        <span className="sky-hud-name">{level.name}</span>
        <span className="sky-hud-size">{n}×{n}</span>
      </div>

      {/* View snap buttons */}
      <div className="sky-views">
        <button className="sky-view-btn" onClick={() => sceneRef.current?.snapToView('top')}>N</button>
        <button className="sky-view-btn" onClick={() => sceneRef.current?.snapToView('left')}>W</button>
        <button className="sky-view-btn sky-view-iso" onClick={() => sceneRef.current?.snapToView('iso')}>●</button>
        <button className="sky-view-btn" onClick={() => sceneRef.current?.snapToView('right')}>E</button>
        <button className="sky-view-btn" onClick={() => sceneRef.current?.snapToView('bottom')}>S</button>
      </div>

      {/* Clue display */}
      <div className="sky-clues">
        {state?.clues && (
          <>
            <div className="sky-clue-row top">
              {state.clues.top.map((v, i) => <span key={i} className="sky-clue">{v || ''}</span>)}
            </div>
            <div className="sky-clue-row bottom">
              {state.clues.bottom.map((v, i) => <span key={i} className="sky-clue">{v || ''}</span>)}
            </div>
            <div className="sky-clue-col left">
              {state.clues.left.map((v, i) => <span key={i} className="sky-clue">{v || ''}</span>)}
            </div>
            <div className="sky-clue-col right">
              {state.clues.right.map((v, i) => <span key={i} className="sky-clue">{v || ''}</span>)}
            </div>
          </>
        )}
      </div>

      {/* Hint */}
      {phase === 'play' && !sel && (
        <div className="sky-hint">{level.hint}</div>
      )}

      {/* Number pad — appears when a cell is selected */}
      {sel && phase === 'play' && !state.won && (
        <div className="sky-numpad">
          {Array.from({ length: n }, (_, i) => i + 1).map(num => (
            <button key={num} className="sky-num-btn" onClick={() => handleNumberKey(num)}>
              {num}
            </button>
          ))}
          <button className="sky-num-btn clear" onClick={() => handleNumberKey(0)}>✕</button>
        </div>
      )}

      {/* Selected cell info */}
      {sel && (
        <div className="sky-sel-info">
          Cell ({sel[0] + 1}, {sel[1] + 1}) {state.grid[sel[0]][sel[1]] ? `= ${state.grid[sel[0]][sel[1]]}` : '— empty'}
        </div>
      )}

      {/* Result */}
      {phase === 'result' && (
        <div className="sky-result-overlay">
          <div className="sky-result-title">City Built!</div>
          <div className="sky-result-info">All views match the clues</div>
          <div className="sky-result-gears">⚙⚙⚙</div>
          <button className="sky-btn" onClick={nextLevel}>
            {levelIndex + 1 < levels.length ? 'Next Puzzle' : 'Finish'}
          </button>
        </div>
      )}
    </div>
  )
}
