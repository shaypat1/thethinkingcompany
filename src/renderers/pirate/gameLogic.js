const TOTAL_GOLD = 100

// Captain is always index 0 (most senior).
// Pirates are added at the end: [Captain, Henry, Pietro, Wookho, Rohan]
// The captain (index 0) always proposes.

// Compute the optimal proposal for n pirates where index 0 is captain.
// Uses backward induction from the perspective of "what if captain dies?"
// If captain dies, the remaining pirates are indices 1..n-1, and index 1 becomes the new proposer.
export function getOptimalProposal(n) {
  if (n === 1) return [100]
  if (n === 2) return [100, 0] // captain takes all, needs 1 vote (self)

  // Build from 2 pirates up. In each sub-problem, the proposer is index 0 of that sub-array.
  // But we need to map back to our fixed indices.

  // subOptimal[k] = what each pirate (by position in the sub-game) gets with k pirates
  // In the sub-game after captain dies, pirates 1..n-1 remain, and pirate 1 is the new captain.
  const subOptimal = {
    1: [100],
    2: [100, 0],
  }

  for (let k = 3; k <= n; k++) {
    const prev = subOptimal[k - 1] // what happens with k-1 pirates (if current proposer dies)
    const proposal = new Array(k).fill(0)
    const votesNeeded = Math.ceil(k / 2)
    let bought = 1 // proposer (index 0) votes for self

    // Bribe pirates who get 0 in the fallback scenario
    // In fallback, pirate at position i in current game becomes position i-1 in the sub-game
    // So pirate i's fallback payout is prev[i-1] (for i >= 1)
    for (let i = 1; i < k && bought < votesNeeded; i++) {
      const fallbackPayout = (i - 1) < prev.length ? prev[i - 1] : 0
      if (fallbackPayout === 0) {
        proposal[i] = 1
        bought++
      }
    }

    // Proposer keeps the rest
    proposal[0] = TOTAL_GOLD - proposal.reduce((a, b) => a + b, 0)
    subOptimal[k] = proposal
  }

  return subOptimal[n]
}

// Simulate voting on a proposal with n pirates. Index 0 = captain/proposer.
export function simulateVote(proposal, n) {
  // What happens if captain (index 0) dies? Pirates 1..n-1 remain.
  // Pirate 1 becomes proposer in the n-1 game.
  const fallback = n > 2 ? getOptimalProposal(n - 1) : null

  const votes = proposal.map((amount, i) => {
    if (i === 0) return true // captain always votes yes for own proposal

    if (n === 2) {
      // If captain dies, pirate 1 gets all 100 alone.
      // So pirate 1 votes yes only if getting something (but they'd get 100 if captain dies!)
      // Actually: pirate 1 prefers captain dead (gets 100) unless amount > 100, which is impossible.
      // With 2 pirates, captain only needs own vote. Pirate 1's vote doesn't matter.
      return amount >= 100
    }

    // What would pirate i get if captain dies?
    // In the sub-game, pirate i becomes position i-1
    const fallbackAmount = (i - 1) < fallback.length ? fallback[i - 1] : 0

    // Vote yes if getting strictly more than fallback
    return amount > fallbackAmount
  })

  const yesCount = votes.filter(Boolean).length
  const passes = yesCount >= Math.ceil(n / 2)

  return { votes, passes, yesCount }
}

// Level data
export function getLevelData(level) {
  const levels = [
    {
      pirateCount: 2,
      narration: "Just you and Henry. You need 1 vote — yours. Take it all?",
    },
    {
      pirateCount: 3,
      narration: "Pietro joins. You need 2 votes now. If you fail, Henry becomes captain with Pietro...",
    },
    {
      pirateCount: 4,
      narration: "Wookho joins. You need 2 votes. Think about who gets nothing if you're gone...",
    },
    {
      pirateCount: 5,
      narration: "Rohan joins. 5 pirates, you need 3 votes. Who can you bribe cheaply?",
    },
  ]
  return levels[Math.min(level, levels.length - 1)]
}

export const TOTAL_LEVELS = 4
export { TOTAL_GOLD }
