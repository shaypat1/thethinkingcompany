// Easy Bot — plays like a beginner, mostly honest, poor targeting
// Bluff rate ~10%, challenge rate ~5%, no belief tracking

import { ACTIONS, getLegalActions, alivePlayerIds, CHARACTERS } from './engine.js'

const CARD_TIER = { Duke: 5, Assassin: 4, Captain: 3, Contessa: 2, Ambassador: 1 }
const BLUFF_RATE = 0.12
const BASE_CHALLENGE_RATE = 0.10
const REVEALED_CHALLENGE_BOOST = 0.30

export function createEasyBot(playerId, personality = {}) {
  const mods = {
    challengeMod: personality.challengeMod || 0,
    bluffMod: personality.bluffMod || 0,
    aggressiveMod: personality.aggressiveMod || 0,
    ...personality,
  }

  return {
    difficulty: 'easy',
    personality: personality.name || 'default',

    selectAction(game) {
      const me = game.players[playerId]
      const legal = getLegalActions(game, playerId)
      const rng = game.rng

      // Mandatory coup at 10
      if (me.coins >= 10) {
        return { action: 'coup', target: pickTarget(game, playerId, rng, mods) }
      }

      // Strongly prefer coup at 7+
      if (me.coins >= 7 && rng() < 0.92 + mods.aggressiveMod * 0.05) {
        return { action: 'coup', target: pickTarget(game, playerId, rng, mods) }
      }

      // Play what we have (mostly honest)
      const shouldBluff = rng() < BLUFF_RATE + mods.bluffMod

      if (!shouldBluff) {
        // Honest plays based on hand
        if (me.cards.includes('Duke')) {
          if (rng() < 0.75) return { action: 'tax' }
        }
        if (me.cards.includes('Assassin') && me.coins >= 3 && me.coins < 7) {
          if (rng() < 0.55 + mods.aggressiveMod * 0.15) {
            return { action: 'assassinate', target: pickTarget(game, playerId, rng, mods) }
          }
        }
        if (me.cards.includes('Captain')) {
          const stealTargets = alivePlayerIds(game).filter(id => id !== playerId && game.players[id].coins > 0)
          if (stealTargets.length > 0 && rng() < 0.6) {
            return { action: 'steal', target: stealTargets[Math.floor(rng() * stealTargets.length)] }
          }
        }
        if (me.cards.includes('Ambassador') && rng() < 0.15) {
          return { action: 'exchange' }
        }
      } else {
        // Bluff — pick a random character action (poorly)
        const bluffChar = CHARACTERS[Math.floor(rng() * CHARACTERS.length)]
        if (bluffChar === 'Duke') return { action: 'tax' }
        if (bluffChar === 'Assassin' && me.coins >= 3) {
          return { action: 'assassinate', target: pickTarget(game, playerId, rng, mods) }
        }
        if (bluffChar === 'Captain') {
          const targets = alivePlayerIds(game).filter(id => id !== playerId && game.players[id].coins > 0)
          if (targets.length > 0) return { action: 'steal', target: targets[Math.floor(rng() * targets.length)] }
        }
        if (bluffChar === 'Ambassador') return { action: 'exchange' }
      }

      // Fallback: prefer foreign aid (faster) over income
      return rng() < 0.35 ? { action: 'income' } : { action: 'foreignAid' }
    },

    shouldChallenge(game, claim) {
      const rng = game.rng
      const revealed = game.players.flatMap(p => p.revealedCards)
      const revealedCount = revealed.filter(c => c === claim.claimedChar).length

      let rate = BASE_CHALLENGE_RATE + mods.challengeMod

      // Boost if copies are revealed
      if (revealedCount >= 2) rate += REVEALED_CHALLENGE_BOOST
      if (revealedCount >= 3) rate = 0.95 // all copies revealed — certain bluff

      // Down to 1 card: usually don't risk it, but sometimes do (10% — intentional mistake)
      const me = game.players[playerId]
      if (me.cards.length === 1 && rng() > 0.1) {
        rate = Math.min(rate, 0.05)
      }

      return rng() < rate
    },

    shouldCounteract(game, action) {
      const rng = game.rng
      const me = game.players[playerId]
      const blockableBy = ACTIONS[action.action]?.blockableBy || []

      for (const char of blockableBy) {
        if (me.cards.includes(char)) {
          // Have the card — block most of the time
          if (action.action === 'assassinate') return rng() < 0.9 ? { counteract: true, claimedChar: char } : { counteract: false }
          return rng() < 0.7 ? { counteract: true, claimedChar: char } : { counteract: false }
        }
      }

      // Bluff-block (rare)
      if (rng() < 0.05 + mods.bluffMod * 0.5) {
        if (blockableBy.length > 0) {
          return { counteract: true, claimedChar: blockableBy[Math.floor(rng() * blockableBy.length)] }
        }
      }

      return { counteract: false }
    },

    shouldChallengeCounter(game, counter) {
      return game.rng() < 0.05 + mods.challengeMod
    },

    selectExchangeCards(cards) {
      // Keep the two highest-tier cards
      const sorted = cards.map((c, i) => ({ card: c, index: i, tier: CARD_TIER[c] || 0 }))
        .sort((a, b) => b.tier - a.tier)
      return [sorted[0].index, sorted[1].index]
    },

    selectCardToLose(cards) {
      // Lose the lowest-tier card
      let worst = 0
      for (let i = 1; i < cards.length; i++) {
        if ((CARD_TIER[cards[i]] || 0) < (CARD_TIER[cards[worst]] || 0)) worst = i
      }
      return worst
    },
  }
}

function pickTarget(game, myId, rng, mods) {
  const alive = alivePlayerIds(game).filter(id => id !== myId)
  if (alive.length === 0) return null

  const roll = rng()
  if (roll < 0.5 + mods.aggressiveMod * 0.1) {
    // Random
    return alive[Math.floor(rng() * alive.length)]
  } else if (roll < 0.8) {
    // Richest player
    let richest = alive[0]
    for (const id of alive) {
      if (game.players[id].coins > game.players[richest].coins) richest = id
    }
    return richest
  } else {
    // Next clockwise
    for (let i = 1; i <= 6; i++) {
      const next = (myId + i) % 6
      if (alive.includes(next)) return next
    }
    return alive[0]
  }
}
