const TOTAL_GOLD = 100

// Compute the optimal proposal for the most senior pirate with n pirates
// Uses backward induction: what would happen with fewer pirates?
export function getOptimalProposal(n) {
  if (n === 1) return [100]
  if (n === 2) return [0, 100]

  // Build up from 1 pirate
  const results = [[100], [0, 100]]

  for (let k = 3; k <= n; k++) {
    const prev = results[k - 2] // what happens if this pirate dies (k-1 pirates)
    const proposal = new Array(k).fill(0)

    // Senior pirate needs ceil(k/2) votes (including self)
    const votesNeeded = Math.ceil(k / 2)
    let bought = 1 // counts self

    // Buy the cheapest pirates: those who get 0 in the (k-1) scenario
    // Pirate indices: 0 = most junior, k-1 = most senior (proposer)
    for (let i = 0; i < k - 1 && bought < votesNeeded; i++) {
      // In the previous scenario, pirate i's payout
      const prevPayout = i < prev.length ? prev[i] : 0
      if (prevPayout === 0) {
        proposal[i] = 1
        bought++
      }
    }

    // Senior pirate keeps the rest
    const spent = proposal.reduce((a, b) => a + b, 0)
    proposal[k - 1] = TOTAL_GOLD - spent

    results.push(proposal)
  }

  return results[n - 1]
}

// Simulate voting on a proposal with n pirates
// Returns array of booleans (true = yes) and whether it passes
export function simulateVote(proposal, n) {
  // What each pirate gets if the proposer dies
  const fallback = n > 2 ? getOptimalProposal(n - 1) : null

  const votes = proposal.map((amount, i) => {
    if (i === n - 1) return true // proposer always votes yes

    if (n === 2) {
      // If proposer dies, pirate 0 gets 100 alone — but there's only 1 pirate
      // Actually pirate 1 (senior) proposes to pirate 0
      // If rejected, pirate 1 dies, pirate 0 gets all 100
      return amount > 0 // pirate 0 only votes yes if getting something
    }

    // What would this pirate get if the current proposer is eliminated?
    const fallbackAmount = i < fallback.length ? fallback[i] : 0

    // Vote yes if getting strictly more, or equal and fewer pirates is preferred
    if (amount > fallbackAmount) return true
    if (amount === fallbackAmount && amount > 0) return false // bloodthirsty: prefer fewer pirates
    if (amount === fallbackAmount && amount === 0) return false // getting nothing either way, kill
    return false
  })

  const yesCount = votes.filter(Boolean).length
  const passes = yesCount >= Math.ceil(n / 2)

  return { votes, passes, yesCount }
}

// Level data for the guided walkthrough + challenge
export function getLevelData(level) {
  const levels = [
    // Level 0: Story intro
    {
      pirateCount: 0,
      mode: 'intro',
      narration: [
        "Five pirates are stranded on a raft with a chest of 100 gold coins!",
        "The most senior pirate proposes how to split the gold.",
        "All pirates vote. If at least half say YES, the gold is split that way.",
        "If not... the proposer gets thrown overboard to the sharks! Then the next pirate proposes.",
        "Every pirate wants to: 1) Stay alive, 2) Get as much gold as possible, 3) Throw others to the sharks if all else is equal.",
        "Let's figure out what happens. We'll start simple..."
      ],
    },
    // Level 1: 2 pirates
    {
      pirateCount: 2,
      mode: 'guided',
      proposal: [0, 100],
      narration: [
        "With just 2 pirates, Pirate 2 (senior) proposes.",
        "Pirate 2 needs 1 vote (50% of 2). That's just... himself!",
        "So Pirate 2 takes ALL 100 coins. Pirate 1 gets nothing.",
        "Pirate 1 votes NO, but it doesn't matter — the proposal passes 1-1!",
      ],
      insight: "The senior pirate only needs their own vote when there are 2 pirates.",
    },
    // Level 2: 3 pirates
    {
      pirateCount: 3,
      mode: 'guided',
      proposal: [1, 0, 99],
      narration: [
        "Now Pirate 3 is the most senior. She needs 2 votes (50% of 3).",
        "If her plan fails, she walks the plank. Then it's the 2-pirate case.",
        "In that case, Pirate 1 gets NOTHING (remember?).",
        "So Pirate 3 offers Pirate 1 just 1 coin. That's better than 0!",
        "Pirate 1 votes YES. Pirate 3 votes YES. That's 2 votes — it passes!",
        "Result: Pirate 3 keeps 99, Pirate 1 gets 1, Pirate 2 gets 0.",
      ],
      insight: "Pirate 3 bribes whoever would get nothing in the next round.",
    },
    // Level 3: 4 pirates
    {
      pirateCount: 4,
      mode: 'guided',
      proposal: [0, 1, 0, 99],
      narration: [
        "Pirate 4 needs 2 votes (50% of 4).",
        "If Pirate 4's plan fails, it becomes the 3-pirate case.",
        "In that case: Pirate 1 gets 1, Pirate 2 gets 0, Pirate 3 gets 99.",
        "Pirate 2 would get NOTHING. So 1 coin is enough to buy Pirate 2's vote!",
        "Pirate 4 keeps 99, gives Pirate 2 just 1 coin.",
        "Pirate 2 and Pirate 4 vote YES — it passes!",
      ],
      insight: "The pattern: bribe the pirates who get nothing if you're eliminated.",
    },
    // Level 4: 5 pirates — CHALLENGE
    {
      pirateCount: 5,
      mode: 'challenge',
      narration: [
        "Now it's YOUR turn! Pirate 5 is the most senior. She needs 3 votes.",
        "If she fails, it's the 4-pirate case: [0, 1, 0, 99].",
        "Who gets nothing in that case? Those are the pirates you can bribe...",
        "Propose a split for all 5 pirates!",
      ],
      hints: [
        "If Pirate 5 dies, the split is: P1=0, P2=1, P3=0, P4=99.",
        "Pirates 1 and 3 would get NOTHING. They can be bought cheaply.",
        "You need 3 votes: your own + 2 others. Offer the minimum to 2 pirates who'd get 0.",
      ],
    },
    // Level 5: Free play
    {
      pirateCount: 5,
      mode: 'freeplay',
      narration: [
        "Free play! Choose any number of pirates and try your own proposals.",
        "Can you find the optimal strategy for 6, 7, or 8 pirates?",
      ],
    },
  ]

  return levels[level] || levels[levels.length - 1]
}

export const TOTAL_LEVELS = 6
export { TOTAL_GOLD }
