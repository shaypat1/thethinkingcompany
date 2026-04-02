// Robot game engine — grid world, robot state, command execution

export const DIRECTIONS = ['up', 'right', 'down', 'left'] // 0,1,2,3
export const DIR_DELTAS = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] }

export const CARDS = {
  forward: { id: 'forward', name: 'Forward', icon: '⬆️', color: '#4a90d9' },
  left: { id: 'left', name: 'Turn Left', icon: '↩️', color: '#e67e22' },
  right: { id: 'right', name: 'Turn Right', icon: '↪️', color: '#27ae60' },
  pickup: { id: 'pickup', name: 'Pick Up', icon: '🫳', color: '#8e44ad' },
  light: { id: 'light', name: 'Light Up', icon: '💡', color: '#f1c40f' },
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

export function executeStep(state, card, level) {
  const next = { ...state, litTiles: new Set(state.litTiles), collected: new Set(state.collected) }
  next.steps++
  next.message = null

  switch (card) {
    case 'forward': {
      const [dx, dy] = DIR_DELTAS[DIRECTIONS[next.dir]]
      const nx = next.x + dx
      const ny = next.y + dy
      // Check bounds and walls
      if (nx < 0 || ny < 0 || nx >= level.width || ny >= level.height) {
        next.message = 'bonk'
        return next
      }
      const cell = level.grid[ny][nx]
      if (cell === 'W') {
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
      const cell = level.grid[next.y][next.x]
      if (cell === 'G' && !next.collected.has(key)) {
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
      const cell = level.grid[next.y][next.x]
      if (cell === 'L' && !next.litTiles.has(key)) {
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

  // Check win condition
  next.won = checkWin(next, level)
  return next
}

function checkWin(state, level) {
  switch (level.goal) {
    case 'reach': {
      return state.x === level.target[0] && state.y === level.target[1]
    }
    case 'collect': {
      const gems = []
      for (let y = 0; y < level.height; y++) {
        for (let x = 0; x < level.width; x++) {
          if (level.grid[y][x] === 'G') gems.push(`${x},${y}`)
        }
      }
      return gems.every((g) => state.collected.has(g))
    }
    case 'light': {
      const lights = []
      for (let y = 0; y < level.height; y++) {
        for (let x = 0; x < level.width; x++) {
          if (level.grid[y][x] === 'L') lights.push(`${x},${y}`)
        }
      }
      return lights.every((l) => state.litTiles.has(l))
    }
    default:
      return false
  }
}
