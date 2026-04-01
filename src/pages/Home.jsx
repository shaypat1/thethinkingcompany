import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getDay, getDayCount } from '../content'

function pseudo(seed, i) {
  return Math.abs(Math.sin(seed * 13 + i * 47) * 10000) % 1
}

function generateTrack(dateOffset) {
  const seed = dateOffset * 7 + 3

  // Map dateOffset to a day number (cycle through available days)
  const dayCount = getDayCount()
  const dayNumber = dayCount > 0
    ? ((((dateOffset % dayCount) + dayCount) % dayCount) + 1)
    : 0
  const day = getDay(dayNumber)
  const nodeLabels = day ? day.nodes.map((n) => n.label) : ['?', '?', '?', '?', '?']

  const shapes = [
    (i) => ({ x: 100 + i * 160, y: 220 + Math.sin((i + seed) * 1.2) * 100 }),
    (i) => ({ x: 100 + i * 160, y: 300 - i * 30 + (i % 2 === 0 ? -50 : 50) }),
    (i) => ({ x: 100 + i * 160, y: 160 + Math.pow(i - 2, 2) * 35 }),
    (i) => ({ x: 100 + i * 160, y: 300 - Math.pow(2.5 - Math.abs(i - 2), 2) * 45 }),
    (i) => ({ x: 100 + i * 160, y: 310 - i * 40 + (pseudo(seed, i) > 0.5 ? 25 : -25) }),
    (i) => ({ x: 100 + i * 160, y: 220 + Math.cos((i + seed) * 0.9) * 90 }),
    (i) => ({ x: 100 + i * 160, y: i === 2 ? 300 : 180 + pseudo(seed, i) * 40 }),
  ]

  const shapeIdx = Math.abs(seed) % shapes.length
  const shapeFn = shapes[shapeIdx]

  // Determine unlocked state based on date offset
  let unlockedCount
  if (dateOffset < 0) {
    unlockedCount = 0
  } else if (dateOffset === 0) {
    unlockedCount = Math.floor(pseudo(seed, 0) * 3) + 2
  } else {
    unlockedCount = 1
  }

  const rawNodes = nodeLabels.map((label, i) => ({
    id: i,
    ...shapeFn(i),
    unlocked: i < unlockedCount,
    label,
  }))

  const pad = 60
  const minX = Math.min(...rawNodes.map((n) => n.x)) - pad
  const maxX = Math.max(...rawNodes.map((n) => n.x)) + pad
  const minY = Math.min(...rawNodes.map((n) => n.y)) - pad
  const maxY = Math.max(...rawNodes.map((n) => n.y)) + pad

  return {
    dayNumber,
    nodes: rawNodes,
    viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
  }
}

function buildPath(nodes) {
  if (nodes.length < 2) return ''
  let d = `M ${nodes[0].x} ${nodes[0].y}`
  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1]
    const curr = nodes[i]
    const mx = (prev.x + curr.x) / 2
    d += ` C ${mx} ${prev.y}, ${mx} ${curr.y}, ${curr.x} ${curr.y}`
  }
  return d
}

function formatDate(offset) {
  if (offset === 0) return 'Today'
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Home() {
  const navigate = useNavigate()
  const [dateOffset, setDateOffset] = useState(0)
  const { dayNumber, nodes, viewBox } = useMemo(() => generateTrack(dateOffset), [dateOffset])

  const isPast = dateOffset < 0
  const isFuture = dateOffset > 0

  function handleNodeClick(node) {
    if (node.unlocked) {
      navigate(`/activity/${dayNumber}/${node.id}`)
    }
  }

  return (
    <div className="app">
      <nav className="topbar">
        <Link to="/leaderboard" className="topbar-link">
          Leaderboard
        </Link>
        <Link to="/profile" className="topbar-link profile-link">
          Shay
          <span className="avatar">S</span>
        </Link>
      </nav>

      <div className="track-header">
        <div className="track-title">Today's Track</div>

        <div className="date-nav-wrapper">
          {isFuture ? (
            <button className="jump-today jump-left" onClick={() => setDateOffset(0)}>
              <span className="jump-arrows">&laquo;</span>
            </button>
          ) : <span className="jump-placeholder" />}

          <div className="date-nav">
            <button
              className="date-side"
              onClick={() => setDateOffset(dateOffset - 1)}
            >
              {formatDate(dateOffset - 1)}
            </button>
            <span className="date-divider" />
            <button className="date-center" onClick={() => setDateOffset(0)}>{formatDate(dateOffset)}</button>
            <span className="date-divider" />
            <button
              className="date-side"
              onClick={() => setDateOffset(dateOffset + 1)}
            >
              {formatDate(dateOffset + 1)}
            </button>
          </div>

          {isPast ? (
            <button className="jump-today jump-right" onClick={() => setDateOffset(0)}>
              <span className="jump-arrows">&raquo;</span>
            </button>
          ) : <span className="jump-placeholder" />}
        </div>

        <div className="header-rule" />
      </div>

      <div className="track-area">
        <div className="track-container">
          <svg className="track-svg" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
            <path className="track-path" d={buildPath(nodes)} />
            {nodes.map((node) => (
              <g
                key={node.id}
                className={`track-node ${node.unlocked ? 'unlocked' : 'locked'}`}
                onClick={() => handleNodeClick(node)}
              >
                <circle cx={node.x} cy={node.y} r={30} fill="transparent" />
                <circle
                  className={`node-circle ${node.unlocked ? 'unlocked' : 'locked'}`}
                  cx={node.x}
                  cy={node.y}
                  r={20}
                />
                <text className="node-label" x={node.x} y={node.y + 42}>
                  {node.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  )
}
