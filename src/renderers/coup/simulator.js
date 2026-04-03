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
import { createMediumBot } from './mediumBot.js'
import { createHardBot } from './hardBot.js'
import { PERSONALITIES, PERSONALITY_NAMES } from './personality.js'

function printReport(label, r) {
  console.log(`\n${label}`)
  console.log(`  Avg turns: ${r.avgTurns} (target: 25-60)`)
  console.log(`  Win rates:`, r.winRates)
  console.log(`  Actions:`, r.actionDist)
  console.log(`  Challenge: ${r.challengeRate} rate, ${r.challengeSuccess} success`)

  const turns = parseFloat(r.avgTurns)
  const checks = [
    ['Game length 25-60', turns >= 25 && turns <= 60],
    ['Income ≤ 25%', parseFloat(r.actionDist.income || '0') <= 25],
    ['No action > 35%', Object.values(r.actionDist).every(v => parseFloat(v) <= 35)],
  ]
  for (const [name, pass] of checks) console.log(`  ${pass ? '✅' : '❌'} ${name}`)
}

if (typeof process !== 'undefined' && process.argv?.[1]?.includes('simulator')) {
  console.log('=== Coup Simulator ===')

  const N = 1000

  // Test 1: 6 Easy
  const easy = { create: createEasyBot, personality: { name: 'default' } }
  printReport(`Test 1: ${N} games — 6 Easy bots`, runBatch(Array(6).fill(easy), N, 1))

  // Test 2: 6 Medium
  const medium = { create: createMediumBot, personality: { name: 'default' } }
  printReport(`Test 2: ${N} games — 6 Medium bots`, runBatch(Array(6).fill(medium), N, 100001))

  // Test 3: 6 Hard
  const hard = { create: createHardBot, personality: { name: 'default' } }
  printReport(`Test 3: ${N} games — 6 Hard bots`, runBatch(Array(6).fill(hard), N, 200001))

  // Test 4: Cross-tier — 2E 2M 2H
  const mixed = [easy, easy, medium, medium, hard, hard]
  const r4 = runBatch(mixed, N, 300001)
  console.log(`\nTest 4: ${N} games — 2 Easy, 2 Medium, 2 Hard`)
  console.log(`  Avg turns: ${r4.avgTurns}`)
  const easyWin = (parseFloat(r4.winRates[0]) + parseFloat(r4.winRates[1])) / 2
  const medWin = (parseFloat(r4.winRates[2]) + parseFloat(r4.winRates[3])) / 2
  const hardWin = (parseFloat(r4.winRates[4]) + parseFloat(r4.winRates[5])) / 2
  console.log(`  Easy avg: ${easyWin.toFixed(1)}%, Medium avg: ${medWin.toFixed(1)}%, Hard avg: ${hardWin.toFixed(1)}%`)
  console.log(`  ${hardWin > medWin && medWin > easyWin ? '✅' : '❌'} Hierarchy: Hard > Medium > Easy`)

  // Target checks
  const turns = parseFloat(r4.avgTurns)
  const checks = [
    ['Game length', turns >= 25 && turns <= 60, `${r4.avgTurns}`],
    ['Income < 25%', parseFloat(r4.actionDist.income || '0') <= 25, r4.actionDist.income],
    ['Tax < 35%', parseFloat(r4.actionDist.tax || '0') <= 35, r4.actionDist.tax],
    ['Coup 15-25%', parseFloat(r4.actionDist.coup || '0') >= 15 && parseFloat(r4.actionDist.coup || '0') <= 25, r4.actionDist.coup],
    ['Assassinate 5-15%', parseFloat(r4.actionDist.assassinate || '0') >= 5 && parseFloat(r4.actionDist.assassinate || '0') <= 15, r4.actionDist.assassinate],
  ]
  console.log('\n  Health checks:')
  for (const [name, pass, val] of checks) {
    console.log(`    ${pass ? '✅' : '❌'} ${name}: ${val}`)
  }
}
