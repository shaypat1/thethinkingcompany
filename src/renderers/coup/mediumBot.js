// Medium Bot — belief-tracking, situational bluffing, smart targeting
// Bluff rate ~15-25%, challenge when P(bluff) > 0.55

import { ACTIONS, getLegalActions, alivePlayerIds, allRevealedCards, CHARACTERS, COUP_COST, ASSASSINATE_COST } from './engine.js'
import { createBeliefs, updateBeliefs, estimateBluffProb, allCopiesRevealed } from './beliefs.js'

const CARD_VALUE = { Duke: 0.7, Assassin: 0.6, Captain: 0.5, Contessa: 0.4, Ambassador: 0.3 }
const CHALLENGE_THRESHOLD = 0.55
const CHALLENGE_THRESHOLD_1CARD = 0.80

export function createMediumBot(playerId, personality = {}) {
  const mods = {
    challengeMod: personality.challengeMod || 0,
    bluffMod: personality.bluffMod || 0,
    aggressiveMod: personality.aggressiveMod || 0,
    ...personality,
  }

  let beliefs = null
  let lastHistoryLen = 0

  function ensureBeliefs(game) {
    const me = game.players[playerId]
    if (!beliefs) {
      beliefs = createBeliefs(playerId, me.cards, allRevealedCards(game))
    }
    // Process new history entries
    while (lastHistoryLen < game.actionHistory.length) {
      const entry = game.actionHistory[lastHistoryLen]
      if (entry.claimsChar && entry.actor !== playerId) {
        updateBeliefs(beliefs, {
          type: 'claim', playerId: entry.actor, character: entry.claimsChar,
          riskyContext: game.players[entry.actor].cards.length === 1,
        })
      }
      if (entry.challengeResult) {
        if (entry.challengeResult.actorHadCard) {
          updateBeliefs(beliefs, { type: 'challenge-proved', playerId: entry.actor, character: entry.claimsChar })
        } else {
          updateBeliefs(beliefs, { type: 'challenge-caught', playerId: entry.actor, character: entry.claimsChar })
        }
      }
      // Track reveals from revealed cards
      for (const p of game.players) {
        for (const rc of p.revealedCards) {
          updateBeliefs(beliefs, { type: 'reveal', character: rc })
        }
      }
      lastHistoryLen++
    }
  }

  function threatScore(game, pid) {
    const p = game.players[pid]
    let score = p.coins * 1.0 + p.cards.length * 2.0
    if (p.coins >= 7) score += 5.0 // about to coup
    if (beliefs?.[pid]) {
      score += (beliefs[pid].Assassin || 0) * 2.0
      score += (beliefs[pid].Duke || 0) * 1.5
    }
    if (p.cards.length === 1) score -= 3.0 // fragile
    return score
  }

  function pickTarget(game) {
    const alive = alivePlayerIds(game).filter(id => id !== playerId)
    if (alive.length === 0) return null

    // Prefer finishing off 1-card players, else highest threat
    const oneCard = alive.filter(id => game.players[id].cards.length === 1)
    if (oneCard.length > 0 && game.rng() < 0.6 + mods.aggressiveMod * 0.2) {
      return oneCard.reduce((best, id) => threatScore(game, id) > threatScore(game, best) ? id : best, oneCard[0])
    }

    return alive.reduce((best, id) => threatScore(game, id) > threatScore(game, best) ? id : best, alive[0])
  }

  function estimateChallengeProb(game) {
    // How likely am I to get challenged? Based on how many opponents are alive and aggressive
    const aliveCount = alivePlayerIds(game).filter(id => id !== playerId).length
    return 0.08 * aliveCount // rough estimate: 8% per opponent
  }

  return {
    difficulty: 'medium',
    personality: personality.name || 'default',

    selectAction(game) {
      ensureBeliefs(game)
      const me = game.players[playerId]
      const rng = game.rng
      const revealed = allRevealedCards(game)

      // Mandatory coup at 10
      if (me.coins >= 10) return { action: 'coup', target: pickTarget(game) }

      // Strong preference for coup at 7+
      if (me.coins >= COUP_COST) {
        const coupScore = 0.85
        if (rng() < coupScore) return { action: 'coup', target: pickTarget(game) }
      }

      // Score each action
      const scores = {}
      const noise = () => (rng() - 0.5) * 0.1 // ±0.05 noise

      scores.income = 0.1 + noise()
      scores.foreignAid = 0.3 - 0.15 * countLikelyDukes(game) + noise()

      // Tax
      if (me.cards.includes('Duke')) {
        scores.tax = 0.6 + noise()
      } else if (!allCopiesRevealed('Duke', revealed)) {
        // Bluff tax — only if low challenge probability
        const chalProb = estimateChallengeProb(game)
        if (chalProb < 0.4) {
          scores.tax = 0.25 * (1.0 - chalProb) + mods.bluffMod * 0.15 + noise()
        }
      }

      // Steal
      const stealTargets = alivePlayerIds(game).filter(id => id !== playerId && game.players[id].coins > 0)
      if (stealTargets.length > 0) {
        const target = pickStealTarget(game, stealTargets)
        if (me.cards.includes('Captain')) {
          const blockProb = (beliefs?.[target]?.Captain || 0.2) + (beliefs?.[target]?.Ambassador || 0.15)
          scores.steal = 0.6 + Math.min(game.players[target].coins, 2) / 2 * 0.1 - blockProb * 0.2 + noise()
          scores._stealTarget = target
        } else if (!allCopiesRevealed('Captain', revealed)) {
          scores.steal = 0.25 * (1.0 - estimateChallengeProb(game)) + noise()
          scores._stealTarget = target
        }
      }

      // Assassinate
      if (me.coins >= ASSASSINATE_COST) {
        const target = pickTarget(game)
        if (me.cards.includes('Assassin')) {
          const contessaProb = beliefs?.[target]?.Contessa || 0.2
          const isOneCard = game.players[target].cards.length === 1
          scores.assassinate = 0.7 - contessaProb * 0.3 + (isOneCard ? 0.2 : 0) + mods.aggressiveMod * 0.1 + noise()
          // Prefer coup over assassinate for finishing off 1-card players (unblockable)
          if (isOneCard && me.coins >= COUP_COST) scores.assassinate -= 0.3
          scores._assassTarget = target
        } else if (!allCopiesRevealed('Assassin', revealed)) {
          scores.assassinate = 0.25 * (1.0 - estimateChallengeProb(game)) + noise()
          scores._assassTarget = target
        }
      }

      // Exchange
      if (me.cards.includes('Ambassador')) {
        scores.exchange = 0.4 + (game.turnNumber < 10 ? 0.2 : 0) + noise()
      }

      // Pick best
      let bestAction = 'income', bestScore = -Infinity
      for (const [action, score] of Object.entries(scores)) {
        if (action.startsWith('_')) continue
        if (score > bestScore) { bestScore = score; bestAction = action }
      }

      const result = { action: bestAction }
      if (bestAction === 'steal') result.target = scores._stealTarget
      else if (bestAction === 'assassinate') result.target = scores._assassTarget
      else if (bestAction === 'coup') result.target = pickTarget(game)

      return result
    },

    shouldChallenge(game, claim) {
      ensureBeliefs(game)
      const rng = game.rng
      const me = game.players[playerId]
      const revealed = allRevealedCards(game)

      const bluffProb = estimateBluffProb(
        beliefs, claim.actor, claim.claimedChar, revealed,
        game.players[claim.actor].cards.length
      )

      const threshold = me.cards.length === 1 ? CHALLENGE_THRESHOLD_1CARD : CHALLENGE_THRESHOLD
      const adjusted = threshold - mods.challengeMod * 0.1

      // Only challenge if bluff probability exceeds threshold AND random check
      // Don't challenge too often — it burns cards fast
      return bluffProb > adjusted && rng() < 0.35
    },

    shouldCounteract(game, action) {
      ensureBeliefs(game)
      const rng = game.rng
      const me = game.players[playerId]
      const blockableBy = ACTIONS[action.action]?.blockableBy || []

      for (const char of blockableBy) {
        if (me.cards.includes(char)) {
          // Have it — almost always block
          return rng() < 0.95 ? { counteract: true, claimedChar: char } : { counteract: false }
        }
      }

      // Bluff-block consideration
      if (action.action === 'assassinate' && action.target === playerId && blockableBy.includes('Contessa')) {
        // Almost always bluff Contessa when being assassinated, especially on 1 card
        if (me.cards.length === 1) return { counteract: true, claimedChar: 'Contessa' }
        if (rng() < 0.6 + mods.bluffMod * 0.2) return { counteract: true, claimedChar: 'Contessa' }
      }

      if (action.action === 'steal' && action.target === playerId) {
        const chalProb = estimateChallengeProb(game)
        if (chalProb < 0.5 && rng() < 0.3 + mods.bluffMod * 0.2) {
          const char = blockableBy[Math.floor(rng() * blockableBy.length)]
          return { counteract: true, claimedChar: char }
        }
      }

      if (action.action === 'foreignAid' && me.cards.includes('Duke')) {
        return rng() < 0.8 ? { counteract: true, claimedChar: 'Duke' } : { counteract: false }
      }

      return { counteract: false }
    },

    shouldChallengeCounter(game, counter) {
      ensureBeliefs(game)
      const rng = game.rng
      const revealed = allRevealedCards(game)

      const bluffProb = estimateBluffProb(
        beliefs, counter.blocker, counter.claimedChar, revealed,
        game.players[counter.blocker].cards.length
      )

      // Less aggressive about challenging counteractions
      return bluffProb > 0.65 + mods.challengeMod * -0.1 && rng() < bluffProb * 0.7
    },

    selectExchangeCards(cards) {
      const me = { coins: 0, cards } // simplified
      const scored = cards.map((c, i) => ({
        card: c, index: i,
        score: (CARD_VALUE[c] || 0.3) + (Math.random() - 0.5) * 0.05,
      })).sort((a, b) => b.score - a.score)
      return [scored[0].index, scored[1].index]
    },

    selectCardToLose(cards) {
      let worst = 0
      for (let i = 1; i < cards.length; i++) {
        if ((CARD_VALUE[cards[i]] || 0) < (CARD_VALUE[cards[worst]] || 0)) worst = i
      }
      return worst
    },
  }

  function countLikelyDukes(game) {
    let count = 0
    for (const pid of alivePlayerIds(game)) {
      if (pid === playerId) continue
      if (beliefs?.[pid]?.Duke > 0.4) count++
    }
    return count
  }

  function pickStealTarget(game, targets) {
    // Prefer target with most coins and least likely to block
    return targets.reduce((best, id) => {
      const coins = game.players[id].coins
      const blockProb = (beliefs?.[id]?.Captain || 0.2) + (beliefs?.[id]?.Ambassador || 0.15)
      const score = coins - blockProb * 3
      const bestScore = game.players[best].coins - ((beliefs?.[best]?.Captain || 0.2) + (beliefs?.[best]?.Ambassador || 0.15)) * 3
      return score > bestScore ? id : best
    }, targets[0])
  }
}
