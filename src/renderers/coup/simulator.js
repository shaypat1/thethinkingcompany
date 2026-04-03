// Headless Coup simulator — runs full games with bots, no UI, no delays

import {
  createGame, performAction, resolveChallenge, skipChallenge,
  performCounteraction, skipCounteraction, resolveChallengeCounter,
  skipChallengeCounter, loseCard, performExchange,
  alivePlayers, alivePlayerIds, ACTIONS,
} from './engine.js'
import { createEasyBot } from './easyBot.js'

const MAX_TURNS = 200

export function runGame(botConfigs, seed) {
  let game = createGame(seed)
  const bots = botConfigs.map((cfg, i) => cfg.create(i, cfg.personality || {}))

  let safety = 0
  const maxIterations = 2000 // prevent infinite loops

  while (!game.winner && safety < maxIterations) {
    safety++

    switch (game.phase) {
      case 'action': {
        const pid = game.currentPlayer
        const bot = bots[pid]
        const decision = bot.selectAction(game)
        game = performAction(game, pid, decision.action, decision.target)
        break
      }

      case 'challenge': {
        const pa = game.pendingAction
        if (!pa) { game.phase = 'action'; break }
        const others = alivePlayerIds(game).filter(id => id !== pa.actor)
        let challenged = false
        for (const oid of others) {
          if (bots[oid].shouldChallenge(game, { claimedChar: pa.claimsChar, actor: pa.actor })) {
            game = resolveChallenge(game, oid)
            challenged = true
            break
          }
        }
        if (!challenged) game = skipChallenge(game)
        break
      }

      case 'counteraction': {
        const pa = game.pendingAction
        if (!pa) { game.phase = 'action'; break }
        const potentialBlockers = pa.action === 'foreignAid'
          ? alivePlayerIds(game).filter(id => id !== pa.actor)
          : pa.target !== null ? [pa.target].filter(id => !game.players[id].eliminated) : []

        let blocked = false
        for (const bid of potentialBlockers) {
          const decision = bots[bid].shouldCounteract(game, pa)
          if (decision.counteract) {
            game = performCounteraction(game, bid, decision.claimedChar)
            blocked = true
            break
          }
        }
        if (!blocked) game = skipCounteraction(game)
        break
      }

      case 'challengeCounter': {
        const pc = game.pendingCounter
        const pa = game.pendingAction
        if (!pc || !pa) { game.phase = 'action'; break }
        if (bots[pa.actor].shouldChallengeCounter(game, pc)) {
          game = resolveChallengeCounter(game, pa.actor)
        } else {
          game = skipChallengeCounter(game)
        }
        break
      }

      case 'loseCard': {
        const plc = game.pendingLoseCard
        if (!plc) { game.phase = 'action'; break }
        const p = game.players[plc.playerId]
        if (p.cards.length > 0) {
          const cardIdx = bots[plc.playerId].selectCardToLose(p.cards)
          game = loseCard(game, plc.playerId, cardIdx)
        } else {
          // Already eliminated, skip
          game.pendingLoseCard = null
          game.phase = 'action'
        }
        break
      }

      case 'exchange': {
        const pa = game.pendingAction
        if (!pa) { game.phase = 'action'; break }
        const p = game.players[pa.actor]
        if (p.cards.length > 2) {
          const keepIndices = bots[pa.actor].selectExchangeCards(p.cards)
          game = performExchange(game, pa.actor, keepIndices)
        } else {
          game = performExchange(game, pa.actor, Array.from({ length: p.cards.length }, (_, i) => i))
        }
        break
      }

      case 'gameOver':
        break

      default:
        game.phase = 'action'
        break
    }

    if (game.phase === 'gameOver') break
  }

  // Track bluff and challenge stats
  let totalClaims = 0, totalChallenges = 0, challengeSuccesses = 0

  for (const a of game.actionHistory) {
    if (a.claimsChar) {
      totalClaims++
      if (a.challengeResult) {
        totalChallenges++
        if (!a.challengeResult.actorHadCard) challengeSuccesses++
      }
    }
  }

  return {
    winner: game.winner,
    turns: game.turnNumber,
    players: game.players.map(p => ({
      id: p.id, coins: p.coins, cards: p.cards,
      revealedCards: p.revealedCards, eliminated: p.eliminated,
    })),
    actionHistory: game.actionHistory,
    stats: { totalClaims, totalChallenges, challengeSuccesses },
  }
}

// ── Batch runner ──

export function runBatch(botConfigs, numGames, startSeed = 1) {
  const wins = {}
  let totalTurns = 0
  const actionCounts = {}
  let totalClaims = 0, totalChallenges = 0, challengeSuccesses = 0

  for (let i = 0; i < numGames; i++) {
    const r = runGame(botConfigs, startSeed + i)
    totalTurns += r.turns
    wins[r.winner] = (wins[r.winner] || 0) + 1
    totalClaims += r.stats.totalClaims
    totalChallenges += r.stats.totalChallenges
    challengeSuccesses += r.stats.challengeSuccesses

    for (const a of r.actionHistory) {
      actionCounts[a.action] = (actionCounts[a.action] || 0) + 1
    }
  }

  const totalActions = Object.values(actionCounts).reduce((a, b) => a + b, 0)

  return {
    games: numGames,
    avgTurns: (totalTurns / numGames).toFixed(1),
    winRates: Object.fromEntries(
      Array.from({ length: 6 }, (_, i) => [i, ((wins[i] || 0) / numGames * 100).toFixed(1) + '%'])
    ),
    actionDist: Object.fromEntries(
      Object.entries(actionCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => [k, (v / totalActions * 100).toFixed(1) + '%'])
    ),
    challengeRate: totalClaims > 0 ? (totalChallenges / totalClaims * 100).toFixed(1) + '%' : '0%',
    challengeSuccess: totalChallenges > 0 ? (challengeSuccesses / totalChallenges * 100).toFixed(1) + '%' : '0%',
  }
}

// ── CLI ──
if (typeof process !== 'undefined' && process.argv?.[1]?.includes('simulator')) {
  console.log('=== Coup Simulator ===\n')

  const easy = { create: createEasyBot, personality: { name: 'default' } }

  console.log('Test 1: 1000 games — 6 Easy bots')
  const t0 = performance.now()
  const r1 = runBatch(Array(6).fill(easy), 1000)
  console.log(`  ${((performance.now() - t0) / 1000).toFixed(2)}s`)
  console.log(`  Avg turns: ${r1.avgTurns} (target: 25-60)`)
  console.log(`  Win rates:`, r1.winRates)
  console.log(`  Actions:`, r1.actionDist)
  console.log(`  Challenge rate: ${r1.challengeRate} (target: 10-25%)`)
  console.log(`  Challenge success: ${r1.challengeSuccess} (target: 40-60%)`)

  // Target checks
  const turns = parseFloat(r1.avgTurns)
  const checks = [
    ['Game length', turns >= 25 && turns <= 60, `${r1.avgTurns}`],
    ['Income < 25%', parseFloat(r1.actionDist.income || '0') <= 25, r1.actionDist.income],
    ['Tax < 35%', parseFloat(r1.actionDist.tax || '0') <= 35, r1.actionDist.tax],
    ['Coup 15-25%', parseFloat(r1.actionDist.coup || '0') >= 15 && parseFloat(r1.actionDist.coup || '0') <= 25, r1.actionDist.coup],
    ['Assassinate 5-15%', parseFloat(r1.actionDist.assassinate || '0') >= 5 && parseFloat(r1.actionDist.assassinate || '0') <= 15, r1.actionDist.assassinate],
  ]
  console.log('\n  Health checks:')
  for (const [name, pass, val] of checks) {
    console.log(`    ${pass ? '✅' : '❌'} ${name}: ${val}`)
  }
}
