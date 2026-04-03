import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import * as THREE from 'three'
import {
  createState, adjacentSelect, pivotSelect, mergeSelect, searchProbe, containerRoute, isSorted
} from './sorting/engine'
import { createScene, crateWorldPos } from './sorting/scene3d'
import { createCrate, setSelected, setPlaced, setEliminated, setBuzz, revealCrate, animateCrates } from './sorting/objects3d'
import './SortingRenderer.css'

export default function SortingRenderer({ levels, narrative }) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const cratesRef = useRef([])
  const clockRef = useRef(0)
  const handleRef = useRef(null)

  const [levelIndex, setLevelIndex] = useState(0)
  const [phase, setPhase] = useState('intro')
  const [state, setState] = useState(null)
  const [gears, setGears] = useState([])

  const level = levels[levelIndex]
  const mode = level?.mode

  // ── Three.js setup ──
  useEffect(() => {
    if (phase === 'intro' || phase === 'complete' || !level) return
    const el = containerRef.current
    if (!el) return
    while (el.firstChild?.tagName === 'CANVAS') el.removeChild(el.firstChild)

    const itemCount = mode === 'container' ? 8 : (mode === 'merge' && level.groups ? Math.max(...level.groups.map(g => g.length)) * level.groups.length : level.items.length)
    const s = createScene(el, itemCount)
    el.insertBefore(s.renderer.domElement, el.firstChild)
    sceneRef.current = s

    // Create crates
    const crates = buildCrates(level, s.scene)
    cratesRef.current = crates

    // Pointer handler
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    const canvas = s.renderer.domElement

    const onPointer = (e) => {
      mouse.x = (e.offsetX / canvas.clientWidth) * 2 - 1
      mouse.y = -(e.offsetY / canvas.clientHeight) * 2 + 1
      raycaster.setFromCamera(mouse, s.camera)
      const boxes = cratesRef.current.map(c => c.children[0]).filter(Boolean)
      const hits = raycaster.intersectObjects(boxes, false)
      if (hits.length > 0) {
        const hit = hits[0].object.parent
        if (hit?.userData?.type === 'crate') handleRef.current?.(hit)
      }
    }
    canvas.addEventListener('pointerdown', onPointer)

    let frame
    const animate = () => {
      clockRef.current += 0.016
      animateCrates(crates, clockRef.current)
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
      s.renderer.dispose()
    }
  }, [levelIndex, phase === 'intro'])

  // ── Sync 3D with state ──
  useEffect(() => {
    if (!state || !cratesRef.current.length) return
    const crates = cratesRef.current

    if (mode === 'adjacent' || mode === 'pivot') {
      state.items.forEach((val, i) => {
        const c = crates.find(cr => cr.userData.value === val)
        if (!c) return
        const pos = crateWorldPos(i, state.items.length)
        c.userData.targetX = pos.x
        c.userData.baseY = pos.y
        c.userData.targetY = c.userData.selected ? pos.y + 0.5 : pos.y
        c.userData.targetZ = pos.z
      })
    }

    if (mode === 'pivot' && state.placed) {
      crates.forEach(c => {
        const idx = state.items.indexOf(c.userData.value)
        if (state.placed.has(idx) && !c.userData.placed) setPlaced(c)
      })
    }

    if (mode === 'search') {
      crates.forEach(c => {
        const idx = c.userData.index
        if (state.revealed.has(idx) && !c.userData.revealed) {
          revealCrate(c, state.items[idx])
        }
        if (idx < state.lo || idx > state.hi) {
          if (!c.userData.eliminated) { setEliminated(c); c.userData.eliminated = true }
        }
      })
    }
  }, [state])

  // ── Win detection ──
  useEffect(() => {
    if (phase !== 'play' || !state?.won) return
    const t = setTimeout(() => setPhase('result'), 700)
    return () => clearTimeout(t)
  }, [state?.won, phase])

  // ── Click handler (ref to avoid stale closures) ──
  handleRef.current = (crate) => {
    if (phase !== 'play' || !state || state.won) return

    switch (mode) {
      case 'adjacent': {
        const idx = state.items.indexOf(crate.userData.value)
        // If nothing selected, select this one
        if (state.selected === null) {
          const next = adjacentSelect(state, idx)
          if (next.message === 'wrong-pair') { setBuzz(crate); return }
          setState(next)
          if (next.selected === idx) setSelected(crate, true)
        } else if (state.selected === idx) {
          // Deselect
          setSelected(crate, false)
          setState({ ...state, selected: null })
        } else {
          // Try to compare+swap with selected
          const prev = cratesRef.current.find(c => c.userData.value === state.items[state.selected])
          if (prev) setSelected(prev, false)
          setSelected(crate, false)
          const lo = Math.min(state.selected, idx)
          const next = adjacentSelect({ ...state, selected: null }, lo)
          if (next.message === 'not-adjacent') { setBuzz(crate); setState({ ...state, selected: null }); return }
          setState(next)
        }
        break
      }

      case 'pivot': {
        const idx = state.items.indexOf(crate.userData.value)
        const next = pivotSelect(state, idx)
        if (next.message === 'out-of-range') { setBuzz(crate); return }
        setState(next)
        break
      }

      case 'merge': {
        // Determine which group's front this crate belongs to
        const val = crate.userData.value
        const gi = state.groups.findIndex(g => g.length > 0 && g[0] === val)
        if (gi === -1 || gi > 1) return
        const next = mergeSelect(state, gi)
        if (next.message === 'wrong-merge') { setBuzz(crate); return }
        setState(next)
        // Update crate positions for merged output
        syncMergeCrates(next)
        break
      }

      case 'search': {
        const idx = crate.userData.index
        const next = searchProbe(state, idx)
        if (next.message === 'already-revealed' || next.message === 'eliminated') { setBuzz(crate); return }
        setState(next)
        break
      }

      case 'container': {
        // Container mode uses buttons, not crate clicks
        break
      }
    }
  }

  function syncMergeCrates(st) {
    if (!st) return
    const crates = cratesRef.current
    // Position output crates at the bottom, groups at top
    let x = 0
    const total = st.groups.reduce((n, g) => n + g.length, 0) + st.output.length
    // Output first
    st.output.forEach((val, i) => {
      const c = crates.find(cr => cr.userData.value === val && cr.userData.merged)
        || crates.find(cr => cr.userData.value === val)
      if (c) {
        c.userData.merged = true
        const pos = crateWorldPos(i, total)
        c.userData.targetX = pos.x
        c.userData.baseY = pos.y - 0.5
        c.userData.targetY = pos.y - 0.5
        setPlaced(c)
      }
    })
    // Groups
    let offset = st.output.length
    st.groups.forEach(g => {
      g.forEach((val, i) => {
        const c = crates.find(cr => cr.userData.value === val && !cr.userData.merged)
        if (c) {
          const pos = crateWorldPos(offset + i, total)
          c.userData.targetX = pos.x
          c.userData.baseY = pos.y
          c.userData.targetY = pos.y
        }
      })
      offset += g.length
    })
  }

  function handleContainer(container) {
    if (phase !== 'play' || !state || state.won) return
    const next = containerRoute(state, container)
    setState(next)
  }

  // ── Level management ──
  const initLevel = useCallback(() => {
    setState(createState(level))
    setPhase('play')
  }, [level])

  function nextLevel() {
    const par = level.par
    const cost = mode === 'search' ? state.probes : mode === 'container' ? state.total - state.score : state.comparisons
    let g = 0
    if (state?.won || (mode === 'container' && state?.currentIndex >= state?.total)) {
      g = cost <= par ? 3 : cost <= par + 3 ? 2 : 1
    }
    setGears([...gears, g])
    if (levelIndex + 1 < levels.length) {
      setLevelIndex(levelIndex + 1)
      setPhase('play')
      setState(createState(levels[levelIndex + 1]))
    } else {
      setPhase('complete')
    }
  }

  function retry() {
    setState(createState(level))
    setPhase('play')
  }

  // ── Build crates for current level ──
  function buildCrates(lvl, scene) {
    const crates = []
    if (lvl.mode === 'search') {
      lvl.items.forEach((val, i) => {
        const c = createCrate(val, i, !lvl.unsorted) // face-down unless unsorted
        const pos = crateWorldPos(i, lvl.items.length)
        c.position.set(pos.x, pos.y, pos.z)
        Object.assign(c.userData, { targetX: pos.x, targetY: pos.y, targetZ: pos.z, baseY: pos.y })
        scene.add(c)
        crates.push(c)
      })
    } else if (lvl.mode === 'merge') {
      const groups = lvl.groups || []
      let idx = 0
      groups.forEach(g => {
        g.forEach(val => {
          const c = createCrate(val, idx, false)
          const pos = crateWorldPos(idx, groups.reduce((n, g2) => n + g2.length, 0))
          c.position.set(pos.x, pos.y, pos.z)
          Object.assign(c.userData, { targetX: pos.x, targetY: pos.y, targetZ: pos.z, baseY: pos.y })
          scene.add(c)
          crates.push(c)
          idx++
        })
      })
    } else if (lvl.mode === 'container') {
      // No crates on belt — show incoming crate in UI
    } else {
      lvl.items.forEach((val, i) => {
        const c = createCrate(val, i, false)
        const pos = crateWorldPos(i, lvl.items.length)
        c.position.set(pos.x, pos.y, pos.z)
        Object.assign(c.userData, { targetX: pos.x, targetY: pos.y, targetZ: pos.z, baseY: pos.y })
        scene.add(c)
        crates.push(c)
      })
    }
    return crates
  }

  // ── Scoring ──
  const cost = !state ? 0 : mode === 'search' ? state.probes : mode === 'container' ? (state.total - state.score) : state.comparisons
  const costLabel = mode === 'search' ? 'Probes' : mode === 'container' ? 'Mistakes' : 'Comparisons'
  const won = state?.won || (mode === 'container' && state?.currentIndex >= state?.total)

  // ── Intro ──
  if (phase === 'intro') {
    return (
      <div className="ss-wrapper">
        <Link to="/" className="ss-exit">Exit</Link>
        <div className="ss-intro">
          <div className="ss-big-sym">📦</div>
          <h1 className="ss-title">{levels[0]?.__title || 'Sorting Station'}</h1>
          <p className="ss-narrative">{narrative}</p>
          <p className="ss-level-count">{levels.length} levels</p>
          <button className="ss-btn" onClick={initLevel}>Start</button>
        </div>
      </div>
    )
  }

  // ── Complete ──
  if (phase === 'complete') {
    const total = gears.reduce((a, b) => a + b, 0)
    return (
      <div className="ss-wrapper">
        <Link to="/" className="ss-exit">Exit</Link>
        <div className="ss-intro">
          <div className="ss-big-sym">✅</div>
          <h1 className="ss-title">Station Complete!</h1>
          <div className="ss-total-score">{total}/{levels.length * 3}</div>
          <div className="ss-total-label">gears earned</div>
          <div className="ss-gear-summary">
            {gears.map((g, i) => (
              <span key={i} className="ss-gear-row">
                <span className="ss-gear-level">L{i + 1}</span>
                <span>{'⚙'.repeat(g)}{'○'.repeat(3 - g)}</span>
              </span>
            ))}
          </div>
          <Link to="/" className="ss-btn">Back to Track</Link>
        </div>
      </div>
    )
  }

  // ── Mode-specific status text ──
  let statusText = ''
  if (mode === 'adjacent' && state?.guided) {
    statusText = `Compare pair ${state.guideIndex + 1}–${state.guideIndex + 2} (pass ${state.passCount + 1})`
  } else if (mode === 'adjacent') {
    statusText = state?.selected !== null ? 'Now tap its neighbor to compare' : 'Tap a crate, then tap its neighbor'
  } else if (mode === 'pivot') {
    if (state?.ranges?.length > 0) {
      const r = state.ranges[0]
      statusText = `Pick a pivot for positions ${r.lo + 1}–${r.hi + 1}`
    } else statusText = 'All placed!'
  } else if (mode === 'merge') {
    statusText = state?.groups?.length >= 2 ? 'Click the SMALLER front crate' : 'Merge complete!'
  } else if (mode === 'search') {
    if (state?.found) statusText = 'Found it!'
    else statusText = `Find crate #${state?.target} — click to probe`
  } else if (mode === 'container') {
    if (state?.currentIndex < state?.incoming?.length) {
      const item = state.incoming[state.currentIndex]
      statusText = `Task: "${item.task}" — Value: ${item.key ? `${item.key}=${item.value}` : item.value}`
    } else statusText = 'All routed!'
  }

  return (
    <div className="ss-wrapper">
      <Link to="/" className="ss-exit">Exit</Link>
      <div ref={containerRef} className="ss-canvas" />

      {/* HUD */}
      <div className="ss-hud">
        <span className="ss-hud-level">Level {levelIndex + 1}</span>
        <span className="ss-hud-name">{level.name}</span>
        <span className="ss-hud-par">Par: {level.par}</span>
      </div>

      {/* Counter — THE teaching tool */}
      <div className="ss-counter">
        <span className={`ss-counter-num ${cost > level.par ? 'over' : ''}`}>{cost}</span>
        <span className="ss-counter-label">{costLabel}</span>
        {state?.swaps > 0 && mode !== 'search' && mode !== 'container' && (
          <span className="ss-counter-swaps">{state.swaps} swaps</span>
        )}
      </div>

      {/* Status / instruction */}
      <div className="ss-status">{statusText}</div>

      {/* Hint (first move only) */}
      {phase === 'play' && cost === 0 && <div className="ss-hint">{level.hint}</div>}

      {/* Guided mode: highlight which pair */}
      {mode === 'adjacent' && state?.guided && !state?.won && (
        <div className="ss-guide-arrow">▼ Compare these ▼</div>
      )}

      {/* Container mode buttons */}
      {mode === 'container' && phase === 'play' && !won && (
        <div className="ss-container-buttons">
          <button className="ss-container-btn array" onClick={() => handleContainer('array')}>
            📋 Array<br /><small>Store in order</small>
          </button>
          <button className="ss-container-btn set" onClick={() => handleContainer('set')}>
            🛢️ Set<br /><small>Check duplicates</small>
          </button>
          <button className="ss-container-btn map" onClick={() => handleContainer('map')}>
            🗄️ Map<br /><small>Look up by name</small>
          </button>
        </div>
      )}

      {/* Search mode: target display */}
      {mode === 'search' && (
        <div className="ss-search-target">
          Find: <strong>#{state?.target}</strong>
          {state?.lastHint === 'higher' && <span className="ss-search-hint"> ↗ Higher!</span>}
          {state?.lastHint === 'lower' && <span className="ss-search-hint"> ↙ Lower!</span>}
          {state?.lastHint === 'found' && <span className="ss-search-found"> ✓ Found!</span>}
        </div>
      )}

      {/* Merge mode: group labels */}
      {mode === 'merge' && state?.groups?.length >= 2 && (
        <div className="ss-merge-labels">
          <span>Group A front: {state.groups[0]?.[0] ?? '—'}</span>
          <span>Group B front: {state.groups[1]?.[0] ?? '—'}</span>
        </div>
      )}

      {/* Result overlay */}
      {phase === 'result' && (
        <div className="ss-result-overlay">
          {won ? (
            <>
              <div className="ss-result-title">{cost <= level.par ? 'Perfect!' : 'Sorted!'}</div>
              <div className="ss-result-info">{cost} {costLabel.toLowerCase()} · optimal {level.par}</div>
              {cost > level.par && (
                <div className="ss-result-sub">Can you do it in {level.par}?</div>
              )}
              <div className="ss-result-gears">
                {'⚙'.repeat(cost <= level.par ? 3 : cost <= level.par + 3 ? 2 : 1)}
                {'○'.repeat(3 - (cost <= level.par ? 3 : cost <= level.par + 3 ? 2 : 1))}
              </div>
              <button className="ss-btn" onClick={nextLevel}>
                {levelIndex + 1 < levels.length ? 'Next Level' : 'Finish'}
              </button>
              {cost > level.par && (
                <button className="ss-btn-ghost" onClick={retry}>Try for {level.par}</button>
              )}
            </>
          ) : (
            <>
              <div className="ss-result-title">Not quite...</div>
              <button className="ss-btn" onClick={retry}>Try Again</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
