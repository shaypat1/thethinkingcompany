// Hard Bot — Medium + lookahead, EV-optimal decisions, opponent modeling
// Bluff rate ~20-35%, EV-based challenge decisions

import { ACTIONS, getLegalActions, alivePlayerIds, allRevealedCards, CHARACTERS, COUP_COST, ASSASSINATE_COST } from './engine.js'
import { createBeliefs, updateBeliefs, estimateBluffProb, allCopiesRevealed } from './beliefs.js'

const CARD_VALUE = { Duke: 0.7, Assassin: 0.6, Captain: 0.5, Contessa: 0.4, Ambassador: 0.3 }

export function createHardBot(playerId, personality = {}) {
  const mods = {
    challengeMod: personality.challengeMod || 0,
    bluffMod: personality.bluffMod || 0,
    aggressiveMod: personality.aggressiveMod || 0,
    ...personality,
  }

  let beliefs = null
  let lastHistoryLen = 0
  // Track opponent challenge tendencies
  const challengeHistory = {} // pid → { opportunities, actual }

  function ensureBeliefs(game) {
    const me = game.players[playerId]
    if (!beliefs) beliefs = createBeliefs(playerId, me.cards, allRevealedCards(game))
    while (lastHistoryLen < game.actionHistory.length) {
      const e = game.actionHistory[lastHistoryLen]
      if (e.claimsChar && e.actor !== playerId) {
        updateBeliefs(beliefs, { type: 'claim', playerId: e.actor, character: e.claimsChar, riskyContext: game.players[e.actor].cards.length === 1 })
      }
      if (e.challengeResult) {
        const type = e.challengeResult.actorHadCard ? 'challenge-proved' : 'challenge-caught'
        updateBeliefs(beliefs, { type, playerId: e.actor, character: e.claimsChar })
        // Track who challenges
        const cid = e.challengeResult.challengerId
        if (!challengeHistory[cid]) challengeHistory[cid] = { opportunities: 0, actual: 0 }
        challengeHistory[cid].actual++
      }
      // Track challenge opportunities for each alive player
      if (e.claimsChar) {
        for (const pid of alivePlayerIds(game)) {
          if (pid !== e.actor) {
            if (!challengeHistory[pid]) challengeHistory[pid] = { opportunities: 0, actual: 0 }
            challengeHistory[pid].opportunities++
          }
        }
      }
      lastHistoryLen++
    }
  }

  function opponentChallengeRate(pid) {
    const h = challengeHistory[pid]
    if (!h || h.opportunities < 3) return 0.15 // default
    return Math.max(0.05, Math.min(0.5, h.actual / h.opportunities))
  }

  function estimateTotalChallengeProb(game) {
    let pNone = 1.0
    for (const pid of alivePlayerIds(game)) {
      if (pid === playerId) continue
      pNone *= (1.0 - opponentChallengeRate(pid))
    }
    return 1.0 - pNone
  }

  function threatScore(game, pid) {
    const p = game.players[pid]
    let score = p.coins * 1.0 + p.cards.length * 2.5
    if (p.coins >= 7) score += 6.0
    if (beliefs?.[pid]) {
      score += (beliefs[pid].Assassin || 0) * 2.5
      score += (beliefs[pid].Duke || 0) * 1.5
    }
    if (p.cards.length === 1) score -= 2.5
    // Are they gunning for me?
    const recentAttacks = game.actionHistory.filter(a => a.target === playerId && a.actor === pid).length
    score += recentAttacks * 1.5
    return score
  }

  function pickTarget(game) {
    const alive = alivePlayerIds(game).filter(id => id !== playerId)
    if (alive.length === 0) return null
    return alive.reduce((best, id) => threatScore(game, id) > threatScore(game, best) ? id : best, alive[0])
  }

  return {
    difficulty: 'hard',
    personality: personality.name || 'default',

    selectAction(game) {
      ensureBeliefs(game)
      const me = game.players[playerId]
      const rng = game.rng
      const revealed = allRevealedCards(game)

      if (me.coins >= 10) return { action: 'coup', target: pickTarget(game) }
      if (me.coins >= COUP_COST) {
        // EV of coup is very high — unblockable, unchallengeable
        const target = pickTarget(game)
        if (game.players[target].cards.length === 1) {
          // Eliminates a player — almost always worth it
          return { action: 'coup', target }
        }
        if (rng() < 0.8) return { action: 'coup', target }
      }

      // EV-based action selection
      const evs = {}
      const noise = () => (rng() - 0.5) * 0.08

      // Income: absolute last resort
      evs.income = { ev: 0.2 + noise() }

      // Foreign Aid: 2 coins but blockable
      const pDukeBlock = 1 - alivePlayerIds(game).filter(id => id !== playerId)
        .reduce((prod, id) => prod * (1 - (beliefs?.[id]?.Duke || 0.15)), 1)
      evs.foreignAid = { ev: 1.5 * (1 - pDukeBlock) + noise() }

      // Tax
      if (me.cards.includes('Duke')) {
        evs.tax = { ev: 2.0 + noise() }
      } else if (!allCopiesRevealed('Duke', revealed)) {
        // Bluff Tax
        const pChal = estimateTotalChallengeProb(game)
        const evCaught = me.cards.length === 1 ? -10.0 : -5.0
        const ev = 3.0 * (1 - pChal) + pChal * evCaught
        if (ev > 0.5) evs.tax = { ev: ev + noise() }
      }

      // Steal
      const stealTargets = alivePlayerIds(game).filter(id => id !== playerId && game.players[id].coins > 0)
      if (stealTargets.length > 0 && (me.cards.includes('Captain') || !allCopiesRevealed('Captain', revealed))) {
        const target = stealTargets.reduce((best, id) => {
          const score = game.players[id].coins - ((beliefs?.[id]?.Captain || 0.2) + (beliefs?.[id]?.Ambassador || 0.15)) * 2
          const bestScore = game.players[best].coins - ((beliefs?.[best]?.Captain || 0.2) + (beliefs?.[best]?.Ambassador || 0.15)) * 2
          return score > bestScore ? id : best
        }, stealTargets[0])

        const stolen = Math.min(2, game.players[target].coins)
        const pBlock = (beliefs?.[target]?.Captain || 0.15) + (beliefs?.[target]?.Ambassador || 0.1)
        const pChal = me.cards.includes('Captain') ? 0.05 : estimateTotalChallengeProb(game)
        const evCaught = me.cards.length === 1 ? -10.0 : -5.0

        let ev = me.cards.includes('Captain')
          ? stolen * (1 - pBlock * 0.5) + 0.5 // honest steal is good, even if blocked sometimes
          : stolen * (1 - pBlock) * (1 - pChal) + pChal * evCaught
        evs.steal = { ev: Math.max(0.3, ev) + noise(), target }
      }

      // Assassinate
      if (me.coins >= ASSASSINATE_COST) {
        const target = pickTarget(game)
        const pContessa = beliefs?.[target]?.Contessa || 0.15
        // On 1 card, almost everyone bluffs Contessa
        const pBlock = game.players[target].cards.length === 1 ? 0.85 : pContessa + 0.1
        const pChal = me.cards.includes('Assassin') ? 0.05 : estimateTotalChallengeProb(game)
        const evCaught = me.cards.length === 1 ? -10.0 : -5.0
        const killValue = game.players[target].cards.length === 1 ? 6.0 : 4.0

        let ev = me.cards.includes('Assassin')
          ? killValue * (1 - pBlock) * 0.95 - ASSASSINATE_COST
          : killValue * (1 - pBlock) * (1 - pChal) + pChal * evCaught - ASSASSINATE_COST
        // Prefer coup over assassinate for 1-card targets if we can afford it
        if (game.players[target].cards.length === 1 && me.coins >= COUP_COST) ev -= 3.0
        evs.assassinate = { ev: ev + noise() + mods.aggressiveMod * 0.5, target }
      }

      // Exchange
      if (me.cards.includes('Ambassador') || !allCopiesRevealed('Ambassador', revealed)) {
        const pChal = me.cards.includes('Ambassador') ? 0.03 : estimateTotalChallengeProb(game)
        const ev = me.cards.includes('Ambassador') ? 1.5 - pChal : 0.5 * (1 - pChal)
        evs.exchange = { ev: ev + noise() }
      }

      // Pick highest EV
      let bestAction = 'income', bestEV = -Infinity
      for (const [action, data] of Object.entries(evs)) {
        if (data.ev > bestEV) { bestEV = data.ev; bestAction = action }
      }

      const result = { action: bestAction }
      if (evs[bestAction]?.target !== undefined) result.target = evs[bestAction].target
      if (bestAction === 'coup' && !result.target) result.target = pickTarget(game)
      return result
    },

    shouldChallenge(game, claim) {
      ensureBeliefs(game)
      const me = game.players[playerId]
      const rng = game.rng
      const revealed = allRevealedCards(game)

      const bluffProb = estimateBluffProb(beliefs, claim.actor, claim.claimedChar, revealed, game.players[claim.actor].cards.length)

      // EV calculation
      const rewardCatch = game.players[claim.actor].cards.length === 1 ? 6.0 : 4.0
      const costLose = me.cards.length === 1 ? -10.0 : -5.0

      const ev = bluffProb * rewardCatch + (1 - bluffProb) * costLose

      // Only challenge if +EV
      if (ev <= 0) return false

      // Add some randomness — don't always challenge even when +EV
      return rng() < Math.min(0.9, bluffProb + mods.challengeMod * 0.1)
    },

    shouldCounteract(game, action) {
      ensureBeliefs(game)
      const rng = game.rng
      const me = game.players[playerId]
      const blockableBy = ACTIONS[action.action]?.blockableBy || []

      // Have the card — block
      for (const char of blockableBy) {
        if (me.cards.includes(char)) return { counteract: true, claimedChar: char }
      }

      // Bluff-block with EV calculation
      if (action.action === 'assassinate' && action.target === playerId) {
        // Almost always bluff Contessa — the alternative is losing a card/dying
        if (me.cards.length === 1) return { counteract: true, claimedChar: 'Contessa' }
        // Even with 2 cards, often worth bluffing
        const pChallenged = opponentChallengeRate(action.actor)
        if (pChallenged < 0.6) return { counteract: true, claimedChar: 'Contessa' }
      }

      if (action.action === 'steal' && action.target === playerId && me.coins >= 2) {
        const pChallenged = opponentChallengeRate(action.actor)
        if (pChallenged < 0.4 + mods.bluffMod * 0.2) {
          const char = blockableBy[Math.floor(rng() * blockableBy.length)]
          return { counteract: true, claimedChar: char }
        }
      }

      if (action.action === 'foreignAid' && me.cards.includes('Duke')) {
        return { counteract: true, claimedChar: 'Duke' }
      }

      return { counteract: false }
    },

    shouldChallengeCounter(game, counter) {
      ensureBeliefs(game)
      const rng = game.rng
      const revealed = allRevealedCards(game)

      const bluffProb = estimateBluffProb(beliefs, counter.blocker, counter.claimedChar, revealed, game.players[counter.blocker].cards.length)
      const me = game.players[playerId]
      const rewardCatch = game.players[counter.blocker].cards.length === 1 ? 6.0 : 4.0
      const costLose = me.cards.length === 1 ? -10.0 : -5.0

      const ev = bluffProb * rewardCatch + (1 - bluffProb) * costLose
      return ev > 0 && rng() < bluffProb * 0.8
    },

    selectExchangeCards(cards) {
      // Score each card based on game state would be ideal, but simplified:
      const scored = cards.map((c, i) => ({
        index: i,
        score: (CARD_VALUE[c] || 0.3) + (Math.random() - 0.5) * 0.03,
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
}
