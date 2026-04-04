// Robot game engine — grid world, robot state, command execution, loops, conditionals

export const DIRECTIONS = ['up', 'right', 'down', 'left']
export const DIR_DELTAS = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] }

// Cards use text symbols, not emojis
export const CARDS = {
  forward:   { id: 'forward',   name: 'Forward',     sym: '▲', color: '#4a90d9' },
  left:      { id: 'left',      name: 'Turn L',      sym: '◄', color: '#e67e22' },
  right:     { id: 'right',     name: 'Turn R',      sym: '►', color: '#27ae60' },
  pickup:    { id: 'pickup',    name: 'Pick Up',     sym: '⤓', color: '#8e44ad' },
  light:     { id: 'light',     name: 'Light',       sym: '✦', color: '#f1c40f' },
  repeat2:   { id: 'repeat2',   name: 'Repeat ×2',   sym: '×2', color: '#cc5599', type: 'loop', count: 2 },
  repeat3:   { id: 'repeat3',   name: 'Repeat ×3',   sym: '×3', color: '#cc5599', type: 'loop', count: 3 },
  repeat4:   { id: 'repeat4',   name: 'Repeat ×4',   sym: '×4', color: '#cc5599', type: 'loop', count: 4 },
  ifwall:    { id: 'ifwall',    name: 'If Wall',     sym: '?▮', color: '#e74c3c', type: 'cond', condition: 'wall' },
  ifgem:     { id: 'ifgem',     name: 'If Gem',      sym: '?◆', color: '#e74c3c', type: 'cond', condition: 'gem' },
  iflight:   { id: 'iflight',   name: 'If Lamp',     sym: '?✦', color: '#e74c3c', type: 'cond', condition: 'lamp' },
}

export function createRobotState(level) {
  return {
    x: level.start[0],
    y: level.start[1],
    dir: DIRECTIONS.indexOf(level.startDir || 'up'),
    carrying: 0,
    litTiles: new Set(),
    collected: new Set(),
    steps: 0,
    alive: true,
    won: false,
    message: null,
  }
}

// Check a sensor condition against current state
function checkCondition(state, condition, level) {
  const [dx, dy] = DIR_DELTAS[DIRECTIONS[state.dir]]
  const nx = state.x + dx
  const ny = state.y + dy
  switch (condition) {
    case 'wall': {
      if (nx < 0 || ny < 0 || nx >= level.width || ny >= level.height) return true
      return level.grid[ny][nx] === 'W'
    }
    case 'gem': {
      const cell = level.grid[state.y][state.x]
      return cell === 'G' && !state.collected.has(`${state.x},${state.y}`)
    }
    case 'lamp': {
      const cell = level.grid[state.y][state.x]
      return cell === 'L' && !state.litTiles.has(`${state.x},${state.y}`)
    }
    default:
      return false
  }
}

// Flatten a program with loops and conditionals into a linear step list
// Each item in program is either a string (card id) or an object:
//   { type: 'loop', count: N, body: [...] }
//   { type: 'cond', condition: 'wall', body: [...] }
// Returns array of { card: string, depth: number } for animation
export function flattenProgram(program, state, level, maxSteps = 100) {
  const steps = []
  let currentState = { ...state, litTiles: new Set(state.litTiles), collected: new Set(state.collected) }

  function walk(items, depth) {
    for (const item of items) {
      if (steps.length >= maxSteps) return
      if (typeof item === 'string') {
        steps.push({ card: item, depth })
        currentState = executeStep(currentState, item, level)
        if (currentState.won) return
      } else if (item.type === 'loop') {
        for (let i = 0; i < item.count; i++) {
          walk(item.body, depth + 1)
          if (currentState.won || steps.length >= maxSteps) return
        }
      } else if (item.type === 'cond') {
        if (checkCondition(currentState, item.condition, level)) {
          walk(item.body, depth + 1)
        }
      }
    }
  }

  walk(program, 0)
  return steps
}

export function executeStep(state, card, level) {
  const next = { ...state, litTiles: new Set(state.litTiles), collected: new Set(state.collected) }
  next.steps++
  next.message = null

  switch (card) {
    case 'forward': {
      const [dx, dy] = DIR_DELTAS[DIRECTIONS[next.dir]]
      const nx = next.x + dx
      const ny = next.y + dy
      if (nx < 0 || ny < 0 || nx >= level.width || ny >= level.height) {
        next.message = 'bonk'
        return next
      }
      if (level.grid[ny][nx] === 'W') {
        next.message = 'bonk'
        return next
      }
      next.x = nx
      next.y = ny
      break
    }
    case 'left':
      next.dir = (next.dir + 3) % 4
      break
    case 'right':
      next.dir = (next.dir + 1) % 4
      break
    case 'pickup': {
      const key = `${next.x},${next.y}`
      if (level.grid[next.y][next.x] === 'G' && !next.collected.has(key)) {
        next.collected.add(key)
        next.carrying++
        next.message = 'pickup'
      } else {
        next.message = 'confused'
      }
      break
    }
    case 'light': {
      const key = `${next.x},${next.y}`
      if (level.grid[next.y][next.x] === 'L' && !next.litTiles.has(key)) {
        next.litTiles.add(key)
        next.message = 'light'
      } else {
        next.message = 'confused'
      }
      break
    }
    default:
      next.message = 'confused'
  }

  next.won = checkWin(next, level)
  return next
}

function checkWin(state, level) {
  switch (level.goal) {
    case 'reach':
      return state.x === level.target[0] && state.y === level.target[1]
    case 'collect': {
      const gems = []
      for (let y = 0; y < level.height; y++)
        for (let x = 0; x < level.width; x++)
          if (level.grid[y][x] === 'G') gems.push(`${x},${y}`)
      return gems.every((g) => state.collected.has(g))
    }
    case 'light': {
      const lights = []
      for (let y = 0; y < level.height; y++)
        for (let x = 0; x < level.width; x++)
          if (level.grid[y][x] === 'L') lights.push(`${x},${y}`)
      if (!lights.every((l) => state.litTiles.has(l))) return false
      if (level.target) return state.x === level.target[0] && state.y === level.target[1]
      return true
    }
    default:
      return false
  }
}
