// Skyscraper puzzle engine
// NxN grid, place buildings 1..N, no repeats in row/col
// Clues on edges = how many buildings visible from that direction

export function createState(level) {
  const n = level.size
  return {
    n,
    grid: Array.from({ length: n }, () => Array(n).fill(0)), // 0 = empty
    clues: level.clues, // { top: [], bottom: [], left: [], right: [] }
    solution: level.solution,
    selected: null, // [row, col]
    errors: new Set(), // "row,col" strings
    won: false,
    startTime: Date.now(),
  }
}

export function placeBuilding(state, row, col, height) {
  if (state.won) return state
  const next = {
    ...state,
    grid: state.grid.map(r => [...r]),
    errors: new Set(),
  }

  if (height === 0 || height === next.grid[row][col]) {
    // Clear cell or toggle off
    next.grid[row][col] = 0
  } else if (height >= 1 && height <= next.n) {
    next.grid[row][col] = height
  }

  // Check for errors (duplicates in row/col)
  for (let r = 0; r < next.n; r++) {
    for (let c = 0; c < next.n; c++) {
      const v = next.grid[r][c]
      if (v === 0) continue
      // Check row duplicate
      for (let c2 = c + 1; c2 < next.n; c2++) {
        if (next.grid[r][c2] === v) {
          next.errors.add(`${r},${c}`)
          next.errors.add(`${r},${c2}`)
        }
      }
      // Check col duplicate
      for (let r2 = r + 1; r2 < next.n; r2++) {
        if (next.grid[r2][c] === v) {
          next.errors.add(`${r},${c}`)
          next.errors.add(`${r2},${c}`)
        }
      }
    }
  }

  // Check win
  next.won = checkWin(next)
  return next
}

export function selectCell(state, row, col) {
  if (state.won) return state
  const isSame = state.selected && state.selected[0] === row && state.selected[1] === col
  return { ...state, selected: isSame ? null : [row, col] }
}

function checkWin(state) {
  const { n, grid, clues } = state

  // All cells filled?
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (grid[r][c] === 0) return false

  // No duplicates?
  if (state.errors.size > 0) return false

  // Check all clues
  if (clues.top) {
    for (let c = 0; c < n; c++) {
      if (clues.top[c] === 0) continue
      const col = []
      for (let r = 0; r < n; r++) col.push(grid[r][c])
      if (countVisible(col) !== clues.top[c]) return false
    }
  }
  if (clues.bottom) {
    for (let c = 0; c < n; c++) {
      if (clues.bottom[c] === 0) continue
      const col = []
      for (let r = n - 1; r >= 0; r--) col.push(grid[r][c])
      if (countVisible(col) !== clues.bottom[c]) return false
    }
  }
  if (clues.left) {
    for (let r = 0; r < n; r++) {
      if (clues.left[r] === 0) continue
      if (countVisible(grid[r]) !== clues.left[r]) return false
    }
  }
  if (clues.right) {
    for (let r = 0; r < n; r++) {
      if (clues.right[r] === 0) continue
      const row = [...grid[r]].reverse()
      if (countVisible(row) !== clues.right[r]) return false
    }
  }

  return true
}

export function countVisible(line) {
  let max = 0, count = 0
  for (const h of line) {
    if (h > max) { count++; max = h }
  }
  return count
}
