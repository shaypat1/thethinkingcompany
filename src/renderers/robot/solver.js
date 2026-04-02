// BFS solver — finds minimum steps to complete any level
// State: (x, y, dir, collected_bitmask, lit_bitmask)

import { DIRECTIONS, DIR_DELTAS } from './engine.js'

const ACTIONS = ['forward', 'left', 'right', 'pickup', 'light']

export function solve(level) {
  // Map collectible/lightable positions to bit indices
  const gems = []
  const lamps = []
  for (let y = 0; y < level.height; y++) {
    for (let x = 0; x < level.width; x++) {
      if (level.grid[y][x] === 'G') gems.push({ x, y, idx: gems.length })
      if (level.grid[y][x] === 'L') lamps.push({ x, y, idx: lamps.length })
    }
  }

  const gemAt = (x, y) => gems.find((g) => g.x === x && g.y === y)
  const lampAt = (x, y) => lamps.find((l) => l.x === x && l.y === y)

  const allGemsMask = (1 << gems.length) - 1
  const allLampsMask = (1 << lamps.length) - 1

  function isWin(x, y, collectedMask, litMask) {
    switch (level.goal) {
      case 'reach': return x === level.target[0] && y === level.target[1]
      case 'collect': return collectedMask === allGemsMask
      case 'light': return litMask === allLampsMask
      default: return false
    }
  }

  // BFS
  const startDir = DIRECTIONS.indexOf(level.startDir || 'up')
  const startKey = `${level.start[0]},${level.start[1]},${startDir},0,0`
  const queue = [{ x: level.start[0], y: level.start[1], dir: startDir, collected: 0, lit: 0, steps: 0 }]
  const visited = new Set([startKey])

  while (queue.length > 0) {
    const state = queue.shift()

    for (const action of ACTIONS) {
      let nx = state.x, ny = state.y, ndir = state.dir
      let ncol = state.collected, nlit = state.lit
      let valid = true

      switch (action) {
        case 'forward': {
          const [dx, dy] = DIR_DELTAS[DIRECTIONS[ndir]]
          nx = state.x + dx
          ny = state.y + dy
          if (nx < 0 || ny < 0 || nx >= level.width || ny >= level.height) { valid = false; break }
          if (level.grid[ny][nx] === 'W') { valid = false; break }
          break
        }
        case 'left': ndir = (state.dir + 3) % 4; break
        case 'right': ndir = (state.dir + 1) % 4; break
        case 'pickup': {
          const gem = gemAt(state.x, state.y)
          if (!gem || (state.collected & (1 << gem.idx))) { valid = false; break }
          ncol = state.collected | (1 << gem.idx)
          break
        }
        case 'light': {
          const lamp = lampAt(state.x, state.y)
          if (!lamp || (state.lit & (1 << lamp.idx))) { valid = false; break }
          nlit = state.lit | (1 << lamp.idx)
          break
        }
      }

      if (!valid) continue

      const nsteps = state.steps + 1
      if (isWin(nx, ny, ncol, nlit)) return nsteps

      const key = `${nx},${ny},${ndir},${ncol},${nlit}`
      if (visited.has(key)) continue
      visited.add(key)
      queue.push({ x: nx, y: ny, dir: ndir, collected: ncol, lit: nlit, steps: nsteps })
    }
  }

  return -1 // unsolvable
}
