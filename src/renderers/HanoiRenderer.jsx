import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import './HanoiRenderer.css'

const LEVELS = [
  { disks: 3, label: 'Beginner', desc: 'Move 3 disks. Minimum: 7 moves.' },
  { disks: 4, label: 'Easy', desc: 'Move 4 disks. Minimum: 15 moves.' },
  { disks: 5, label: 'Medium', desc: 'Move 5 disks. Minimum: 31 moves.' },
  { disks: 6, label: 'Hard', desc: 'Move 6 disks. Minimum: 63 moves.' },
  { disks: 7, label: 'Master', desc: 'Move 7 disks. Minimum: 127 moves.' },
]

const DISK_COLORS = [
  'linear-gradient(135deg, #ff6b6b, #ee5a24)',
  'linear-gradient(135deg, #ffa502, #e67e22)',
  'linear-gradient(135deg, #2ed573, #009432)',
  'linear-gradient(135deg, #1e90ff, #0652DD)',
  'linear-gradient(135deg, #a55eea, #8854d0)',
  'linear-gradient(135deg, #ff4757, #c44569)',
  'linear-gradient(135deg, #00d2d3, #01a3a4)',
]

function initTowers(n) {
  return [
    Array.from({ length: n }, (_, i) => n - i), // Tower A: [n, n-1, ..., 1]
    [],
    [],
  ]
}

export default function HanoiRenderer() {
  const [level, setLevel] = useState(0)
  const [towers, setTowers] = useState(() => initTowers(LEVELS[0].disks))
  const [selected, setSelected] = useState(null) // which tower is selected (0,1,2)
  const [moves, setMoves] = useState(0)
  const [phase, setPhase] = useState('play') // play | win
  const [animating, setAnimating] = useState(null) // { from, to, disk } during animation
  const [history, setHistory] = useState([])

  const { disks, label, desc } = LEVELS[level]
  const optimal = Math.pow(2, disks) - 1

  const resetLevel = useCallback((lvl) => {
    const l = lvl !== undefined ? lvl : level
    setLevel(l)
    setTowers(initTowers(LEVELS[l].disks))
    setSelected(null)
    setMoves(0)
    setPhase('play')
    setAnimating(null)
    setHistory([])
  }, [level])

  function handleTowerClick(towerIdx) {
    if (phase !== 'play' || animating) return

    if (selected === null) {
      // Select a tower (must have disks)
      if (towers[towerIdx].length === 0) return
      setSelected(towerIdx)
    } else {
      if (towerIdx === selected) {
        // Deselect
        setSelected(null)
        return
      }

      const fromTower = towers[selected]
      const toTower = towers[towerIdx]
      const disk = fromTower[fromTower.length - 1]

      // Check valid move
      if (toTower.length > 0 && toTower[toTower.length - 1] < disk) {
        // Invalid — can't place larger on smaller
        setSelected(null)
        return
      }

      // Animate the move
      setAnimating({ from: selected, to: towerIdx, disk })

      setTimeout(() => {
        const newTowers = towers.map(t => [...t])
        newTowers[selected].pop()
        newTowers[towerIdx].push(disk)
        setTowers(newTowers)
        setSelected(null)
        setAnimating(null)
        setMoves(m => m + 1)
        setHistory(h => [...h, { from: selected, to: towerIdx }])

        // Check win — all disks on tower C (index 2)
        if (newTowers[2].length === disks) {
          setPhase('win')
        }
      }, 350)
    }
  }

  function handleUndo() {
    if (history.length === 0 || animating) return
    const last = history[history.length - 1]
    const newTowers = towers.map(t => [...t])
    const disk = newTowers[last.to].pop()
    newTowers[last.from].push(disk)
    setTowers(newTowers)
    setMoves(m => m - 1)
    setHistory(h => h.slice(0, -1))
  }

  function handleNextLevel() {
    if (level + 1 < LEVELS.length) {
      resetLevel(level + 1)
    }
  }

  const PEG_NAMES = ['A', 'B', 'C']
  const maxDiskWidth = 85 // percentage

  return (
    <div className="hn-wrapper">
      {/* Top bar */}
      <Link to="/" className="hn-exit">&larr; Exit</Link>
      <button className="hn-restart" onClick={() => resetLevel(level)}>Restart</button>

      {/* Rules box */}
      <div className="hn-rules">
        <div className="hn-rules-title">Towers of Hanoi</div>
        <ol className="hn-rules-list">
          <li>Move all disks from peg A to peg C</li>
          <li>Only move one disk at a time</li>
          <li>Never place a larger disk on a smaller one</li>
        </ol>
      </div>

      {/* Level + stats */}
      <div className="hn-stats">
        <div className="hn-level">{label}</div>
        <div className="hn-moves">{moves} moves</div>
        <div className="hn-optimal">Optimal: {optimal}</div>
      </div>

      {/* Towers */}
      <div className="hn-scene">
        <div className="hn-towers">
          {towers.map((tower, tIdx) => (
            <div
              key={tIdx}
              className={`hn-tower ${selected === tIdx ? 'selected' : ''} ${
                selected !== null && tIdx !== selected ? 'target' : ''
              }`}
              onClick={() => handleTowerClick(tIdx)}
            >
              {/* Peg */}
              <div className="hn-peg" />
              <div className="hn-base" />

              {/* Disks */}
              <div className="hn-disks">
                {tower.map((disk, dIdx) => {
                  const widthPct = 30 + ((disk - 1) / (disks - 1)) * (maxDiskWidth - 30)
                  const isTop = dIdx === tower.length - 1
                  const isAnimatingOut = animating && animating.from === tIdx && isTop
                  const isSelected = selected === tIdx && isTop

                  return (
                    <div
                      key={disk}
                      className={`hn-disk ${isSelected ? 'lifted' : ''} ${isAnimatingOut ? 'animating-out' : ''}`}
                      style={{
                        width: `${widthPct}%`,
                        background: DISK_COLORS[(disk - 1) % DISK_COLORS.length],
                      }}
                    >
                      <span className="hn-disk-num">{disk}</span>
                    </div>
                  )
                })}

                {/* Incoming disk animation */}
                {animating && animating.to === tIdx && (
                  <div
                    className="hn-disk animating-in"
                    style={{
                      width: `${30 + ((animating.disk - 1) / (disks - 1)) * (maxDiskWidth - 30)}%`,
                      background: DISK_COLORS[(animating.disk - 1) % DISK_COLORS.length],
                    }}
                  >
                    <span className="hn-disk-num">{animating.disk}</span>
                  </div>
                )}
              </div>

              {/* Label */}
              <div className="hn-tower-label">{PEG_NAMES[tIdx]}</div>
            </div>
          ))}
        </div>

        {/* Undo button */}
        {phase === 'play' && history.length > 0 && (
          <button className="hn-undo" onClick={handleUndo}>↩ Undo</button>
        )}
      </div>

      {/* Win overlay */}
      {phase === 'win' && (
        <div className="hn-win-overlay">
          <div className="hn-win-box">
            <div className="hn-win-icon">🏆</div>
            <div className="hn-win-title">Solved!</div>
            <div className="hn-win-stats">
              <span>{moves} moves</span>
              <span className="hn-win-sep">·</span>
              <span>Optimal: {optimal}</span>
              {moves === optimal && <span className="hn-win-perfect">⭐ Perfect!</span>}
            </div>
            {moves > optimal && (
              <div className="hn-win-hint">
                You used {moves - optimal} extra move{moves - optimal !== 1 ? 's' : ''}. Can you do better?
              </div>
            )}
            <div className="hn-win-actions">
              <button className="hn-btn" onClick={() => resetLevel(level)}>Play Again</button>
              {level + 1 < LEVELS.length && (
                <button className="hn-btn hn-btn-primary" onClick={handleNextLevel}>
                  Next: {LEVELS[level + 1].label} →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Level selector */}
      <div className="hn-level-selector">
        {LEVELS.map((l, i) => (
          <button
            key={i}
            className={`hn-level-btn ${i === level ? 'active' : ''}`}
            onClick={() => resetLevel(i)}
          >
            {l.disks}
          </button>
        ))}
      </div>
    </div>
  )
}
