// Sorting Station engine — mode-based sorting/searching game logic
// Modes: adjacent, pivot, merge, search, container

export function createState(level) {
  const base = {
    items: [...level.items],
    comparisons: 0,
    swaps: 0,
    won: false,
    message: null,
    mode: level.mode,
  }

  switch (level.mode) {
    case 'adjacent':
      return {
        ...base,
        selected: null,
        locked: [],          // indices locked in final position (right side)
        guided: level.guided || false,
        guideIndex: 0,       // which pair to compare next in guided mode
        passCount: 0,
      }

    case 'pivot':
      return {
        ...base,
        phase: 'pick',       // 'pick' | 'partitioning' | 'done'
        ranges: [{ lo: 0, hi: level.items.length - 1 }], // sub-ranges needing pivots
        placed: new Set(),   // indices in final position
        pivotIndex: null,
      }

    case 'merge':
      return {
        ...base,
        groups: level.groups ? level.groups.map(g => [...g]) : splitIntoSortedPairs(level.items),
        output: [],
        mergePhase: level.groups ? 'merge' : 'initial', // 'initial' | 'merge' | 'done'
      }

    case 'search':
      return {
        ...base,
        target: level.target,
        probes: 0,
        revealed: new Set(),
        lo: 0,
        hi: level.items.length - 1,
        found: false,
        lastProbe: null,
        lastHint: null,      // 'higher' | 'lower' | 'found'
      }

    case 'container':
      return {
        ...base,
        incoming: [...level.incoming],
        currentIndex: 0,
        array: [],
        set: new Set(),
        map: new Map(),
        score: 0,
        total: level.incoming.length,
        lastResult: null,    // 'correct' | 'wrong'
      }

    default:
      return base
  }
}

// ── Adjacent mode ──

export function adjacentCompare(state, i) {
  // Compare crate at index i with i+1
  const j = i + 1
  if (j >= state.items.length) return state
  if (state.locked.includes(i) && state.locked.includes(j)) return state

  const next = { ...state, items: [...state.items], locked: [...state.locked] }
  next.comparisons++

  if (next.items[i] > next.items[j]) {
    // Swap needed
    const tmp = next.items[i]
    next.items[i] = next.items[j]
    next.items[j] = tmp
    next.swaps++
    next.message = 'swap'
  } else {
    next.message = 'noswap'
  }

  // In guided mode, advance to next pair
  if (next.guided) {
    next.guideIndex = i + 1
    // End of pass?
    const passEnd = next.items.length - 1 - next.passCount
    if (next.guideIndex >= passEnd) {
      // Lock the last position of this pass
      next.locked.push(passEnd)
      next.passCount++
      next.guideIndex = 0
      // Check if fully sorted
      if (next.passCount >= next.items.length - 1) {
        next.won = true
        next.message = 'sorted'
      }
    }
  } else {
    next.won = isSorted(next.items)
    if (next.won) next.message = 'sorted'
  }

  next.selected = null
  return next
}

export function adjacentSelect(state, index) {
  if (state.won) return state
  if (state.guided) {
    // In guided mode, only accept the guided pair
    if (index !== state.guideIndex) return { ...state, message: 'wrong-pair' }
    return adjacentCompare(state, index)
  }
  // Free mode: select first, then click neighbor
  if (state.selected === null) {
    return { ...state, selected: index, message: null }
  }
  if (Math.abs(state.selected - index) === 1) {
    const lo = Math.min(state.selected, index)
    return adjacentCompare(state, lo)
  }
  // Not adjacent — buzz
  return { ...state, selected: null, message: 'not-adjacent' }
}

// ── Pivot mode ──

export function pivotSelect(state, index) {
  if (state.won || state.phase !== 'pick' || state.ranges.length === 0) return state
  const range = state.ranges[0]
  if (index < range.lo || index > range.hi) return { ...state, message: 'out-of-range' }

  const next = { ...state, items: [...state.items], ranges: [...state.ranges], placed: new Set(state.placed) }
  const { lo, hi } = next.ranges.shift()

  // Partition around pivot
  const pivotVal = next.items[index]
  // Move pivot to end first
  ;[next.items[index], next.items[hi]] = [next.items[hi], next.items[index]]

  let store = lo
  for (let i = lo; i < hi; i++) {
    next.comparisons++
    if (next.items[i] < pivotVal) {
      if (i !== store) {
        ;[next.items[i], next.items[store]] = [next.items[store], next.items[i]]
        next.swaps++
      }
      store++
    }
  }
  // Move pivot to its final position
  ;[next.items[store], next.items[hi]] = [next.items[hi], next.items[store]]
  if (store !== hi) next.swaps++

  next.placed.add(store)
  next.pivotIndex = store
  next.message = 'partitioned'

  // Add sub-ranges if they have more than 1 element
  const newRanges = []
  if (store - 1 > lo) newRanges.push({ lo, hi: store - 1 })
  else if (store - 1 === lo) next.placed.add(lo)
  if (store + 1 < hi) newRanges.push({ lo: store + 1, hi })
  else if (store + 1 === hi) next.placed.add(hi)

  next.ranges = [...newRanges, ...next.ranges]

  if (next.ranges.length === 0) {
    // All elements placed
    next.items.forEach((_, i) => next.placed.add(i))
    next.won = true
    next.message = 'sorted'
    next.phase = 'done'
  } else {
    next.phase = 'pick'
  }

  return next
}

// ── Merge mode ──

export function mergeSelect(state, groupIndex) {
  if (state.won || state.groups.length < 2) return state

  const next = { ...state, groups: state.groups.map(g => [...g]), output: [...state.output] }
  const g0 = next.groups[0]
  const g1 = next.groups[1]

  if (g0.length === 0 || g1.length === 0) return state

  next.comparisons++
  const correct = g0[0] <= g1[0] ? 0 : 1

  if (groupIndex !== correct) {
    next.message = 'wrong-merge'
    return next
  }

  const picked = next.groups[groupIndex].shift()
  next.output.push(picked)
  next.message = 'merged'

  // If one group is empty, drain the other
  if (next.groups[0].length === 0 || next.groups[1].length === 0) {
    const remaining = next.groups[0].length > 0 ? next.groups[0] : next.groups[1]
    next.output.push(...remaining.splice(0))

    // Remove the two merged groups, add the output as a new group
    next.groups = [next.output, ...next.groups.slice(2)]
    next.output = []

    // If only one group left, we're done
    if (next.groups.length === 1) {
      next.items = next.groups[0]
      next.won = true
      next.message = 'sorted'
    } else {
      next.message = 'merge-complete'
    }
  }

  return next
}

// ── Search mode ──

export function searchProbe(state, index) {
  if (state.won || state.found) return state
  if (state.revealed.has(index)) return { ...state, message: 'already-revealed' }
  if (index < state.lo || index > state.hi) return { ...state, message: 'eliminated' }

  const next = { ...state, revealed: new Set(state.revealed) }
  next.probes++
  next.comparisons++
  next.revealed.add(index)
  next.lastProbe = index

  if (state.items[index] === state.target) {
    next.found = true
    next.won = true
    next.lastHint = 'found'
    next.message = 'found'
  } else if (state.items[index] < state.target) {
    next.lo = index + 1
    next.lastHint = 'higher'
    next.message = 'higher'
  } else {
    next.hi = index - 1
    next.lastHint = 'lower'
    next.message = 'lower'
  }

  return next
}

// ── Container mode ──

export function containerRoute(state, container) {
  if (state.won || state.currentIndex >= state.incoming.length) return state

  const item = state.incoming[state.currentIndex]
  const next = { ...state, array: [...state.array], set: new Set(state.set), map: new Map(state.map) }
  next.currentIndex++
  next.comparisons++

  const correct = item.correctContainer
  if (container === correct) {
    next.score++
    next.lastResult = 'correct'
    next.message = 'correct'
  } else {
    next.lastResult = 'wrong'
    next.message = 'wrong'
  }

  // Add to the chosen container for visual
  if (container === 'array') next.array.push(item.value)
  else if (container === 'set') next.set.add(item.value)
  else if (container === 'map') next.map.set(item.key, item.value)

  if (next.currentIndex >= next.incoming.length) {
    next.won = true
  }

  return next
}

// ── Helpers ──

export function isSorted(items) {
  for (let i = 1; i < items.length; i++) {
    if (items[i] < items[i - 1]) return false
  }
  return true
}

function splitIntoSortedPairs(items) {
  const groups = []
  for (let i = 0; i < items.length; i += 2) {
    const pair = items.slice(i, i + 2).sort((a, b) => a - b)
    groups.push(pair)
  }
  return groups
}

// Par calculators
export function bubbleSortComparisons(items) {
  const arr = [...items]
  let comps = 0
  let swapped = true
  while (swapped) {
    swapped = false
    for (let i = 0; i < arr.length - 1; i++) {
      comps++
      if (arr[i] > arr[i + 1]) {
        ;[arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]
        swapped = true
      }
    }
  }
  return comps
}

export function optimalProbes(n) {
  return Math.ceil(Math.log2(n + 1))
}
