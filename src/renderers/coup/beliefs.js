// Bayesian-ish card belief tracker for Medium/Hard bots
// Estimates P(player has character) for each opponent

import { CHARACTERS, COPIES_PER_CHAR, PLAYER_COUNT } from './engine.js'

export function createBeliefs(myId, myCards, allRevealedCards) {
  const beliefs = {}

  // Count known cards
  const known = [...myCards, ...allRevealedCards]
  const unseenCounts = {}
  for (const c of CHARACTERS) unseenCounts[c] = COPIES_PER_CHAR
  for (const k of known) unseenCounts[k]--

  const totalUnseen = Object.values(unseenCounts).reduce((a, b) => a + b, 0)

  // Initialize beliefs for each player
  for (let pid = 0; pid < PLAYER_COUNT; pid++) {
    if (pid === myId) continue
    beliefs[pid] = {}
    for (const c of CHARACTERS) {
      // P(player has at least one copy) ≈ unseen_copies / total_unseen * 2 (they have 2 cards)
      // Simplified heuristic from spec
      beliefs[pid][c] = Math.min(1.0, unseenCounts[c] / Math.max(totalUnseen, 1) * 2)
    }
  }

  return beliefs
}

export function updateBeliefs(beliefs, event) {
  // event types: 'claim', 'reveal', 'challenge-proved', 'challenge-caught', 'counteract'

  switch (event.type) {
    case 'claim': {
      // Player claimed a character — increase belief they have it
      const pid = event.playerId
      if (!beliefs[pid]) break
      const char = event.character
      const multiplier = event.riskyContext ? 1.8 : 1.4 // riskier claim = more likely true
      beliefs[pid][char] = Math.min(1.0, beliefs[pid][char] * multiplier)
      normalizeBelief(beliefs[pid])
      break
    }

    case 'challenge-proved': {
      // Player proved they had the card — but then shuffled it back and drew new
      // Their card is now unknown again, but we know they HAD it
      const pid = event.playerId
      if (!beliefs[pid]) break
      // Slight increase — they had it, might draw it again or something similar
      beliefs[pid][event.character] = Math.min(1.0, beliefs[pid][event.character] * 1.2)
      break
    }

    case 'challenge-caught': {
      // Player was caught bluffing — they DON'T have that card
      const pid = event.playerId
      if (!beliefs[pid]) break
      beliefs[pid][event.character] *= 0.3 // big decrease
      normalizeBelief(beliefs[pid])
      break
    }

    case 'reveal': {
      // A card was revealed (from any cause) — remove from unseen pool
      // Decrease beliefs for all players for that character
      const char = event.character
      for (const pid of Object.keys(beliefs)) {
        beliefs[pid][char] = Math.max(0, beliefs[pid][char] * 0.7)
      }
      break
    }

    case 'counteract': {
      // Player claimed a character for counteraction — riskier than action claims
      const pid = event.playerId
      if (!beliefs[pid]) break
      beliefs[pid][event.character] = Math.min(1.0, beliefs[pid][event.character] * 1.6)
      normalizeBelief(beliefs[pid])
      break
    }
  }
}

function normalizeBelief(playerBeliefs) {
  // Soft normalize — don't let total probability exceed a reasonable bound
  const total = Object.values(playerBeliefs).reduce((a, b) => a + b, 0)
  if (total > 2.5) { // a player has 2 cards, so total shouldn't be too high
    const scale = 2.5 / total
    for (const c of CHARACTERS) playerBeliefs[c] *= scale
  }
}

export function allCopiesRevealed(character, revealedCards) {
  return revealedCards.filter(c => c === character).length >= COPIES_PER_CHAR
}

// Estimate probability that a specific player is bluffing a specific claim
export function estimateBluffProb(beliefs, playerId, claimedChar, revealedCards, playerCardCount) {
  if (allCopiesRevealed(claimedChar, revealedCards)) return 1.0 // certain bluff

  const belief = beliefs[playerId]?.[claimedChar] ?? 0.3
  let bluffProb = 1.0 - belief

  // Adjust for context
  const revealedCount = revealedCards.filter(c => c === claimedChar).length
  bluffProb += revealedCount * 0.15

  // Players with 1 card are less likely to bluff (more to lose)
  if (playerCardCount === 1) bluffProb -= 0.2

  return Math.max(0, Math.min(1, bluffProb))
}
