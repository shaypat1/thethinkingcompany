// Headless Coup simulator — runs full games with bots, no UI, no delays
// Usage: node simulator.js

import {
  createGame, performAction, resolveChallenge, skipChallenge,
  performCounteraction, skipCounteraction, resolveChallengeCounter,
  skipChallengeCounter, loseCard, performExchange,
  alivePlayers, alivePlayerIds, ACTIONS, cloneGame,
} from './engine.js'
import { createEasyBot } from './easyBot.js'

const MAX_TURNS = 200 // safety valve

export function runGame(botConfigs, seed) {
  let game = createGame(seed)
  const bots = botConfigs.map((cfg, i) => cfg.create(i, cfg.personality || {}))

  let turns = 0
  while (!game.winner && turns < MAX_TURNS) {
    turns++
    const pid = game.currentPlayer

    if (game.phase === 'action') {
      const bot = bots[pid]
      const decision = bot.selectAction(game)
      game = performAction(game, pid, decision.action, decision.target)
      // Restore rng
      game.rng = bots[0].__rng || game.rng
    }

    // Challenge phase
    if (game.phase === 'challenge' && game.pendingAction) {
      const pa = game.pendingAction
      let challenged = false
      const others = alivePlayerIds(game).filter(id => id !== pa.actor)

      for (const oid of others) {
        if (bots[oid].shouldChallenge(game, { claimedChar: pa.claimsChar, actor: pa.actor })) {
          game = resolveChallenge(game, oid)
          challenged = true
          break
        }
      }

      if (!challenged) {
        game = skipChallenge(game)
      }
    }

    // Lose card from challenge
    if (game.phase === 'loseCard' && game.pendingLoseCard) {
      const plc = game.pendingLoseCard
      const p = game.players[plc.playerId]
      if (p.cards.length > 0) {
        const cardIdx = bots[plc.playerId].selectCardToLose(p.cards)
        game = loseCard(game, plc.playerId, cardIdx)
      }
    }

    // Counteraction phase
    if (game.phase === 'counteraction' && game.pendingAction) {
      const pa = game.pendingAction
      const action = ACTIONS[pa.action]
      let blocked = false

      // Who can counter? For Foreign Aid, anyone. For targeted actions, the target.
      const potentialBlockers = pa.action === 'foreignAid'
        ? alivePlayerIds(game).filter(id => id !== pa.actor)
        : pa.target !== null ? [pa.target].filter(id => !game.players[id].eliminated) : []

      for (const bid of potentialBlockers) {
        const decision = bots[bid].shouldCounteract(game, pa)
        if (decision.counteract) {
          game = performCounteraction(game, bid, decision.claimedChar)
          blocked = true
          break
        }
      }

      if (!blocked) {
        game = skipCounteraction(game)
      }
    }

    // Challenge counteraction
    if (game.phase === 'challengeCounter' && game.pendingCounter) {
      const pc = game.pendingCounter
      const pa = game.pendingAction
      // The action actor can challenge the block
      if (bots[pa.actor].shouldChallengeCounter(game, pc)) {
        game = resolveChallengeCounter(game, pa.actor)
      } else {
        game = skipChallengeCounter(game)
      }
    }

    // Lose card from counter-challenge
    if (game.phase === 'loseCard' && game.pendingLoseCard) {
      const plc = game.pendingLoseCard
      const p = game.players[plc.playerId]
      if (p.cards.length > 0) {
        const cardIdx = bots[plc.playerId].selectCardToLose(p.cards)
        game = loseCard(game, plc.playerId, cardIdx)
      }
    }

    // Exchange phase
    if (game.phase === 'exchange') {
      const pa = game.pendingAction
      const p = game.players[pa.actor]
      if (p.cards.length > 2) {
        const keepIndices = bots[pa.actor].selectExchangeCards(p.cards)
        game = performExchange(game, pa.actor, keepIndices)
      } else {
        // Didn't draw enough — just advance
        game = performExchange(game, pa.actor, [0, 1].slice(0, p.cards.length))
      }
    }
  }

  return {
    winner: game.winner,
    turns,
    eliminationOrder: game.players
      .filter(p => p.eliminated)
      .map(p => p.id),
    actionHistory: game.actionHistory,
    players: game.players.map(p => ({
      id: p.id,
      coins: p.coins,
      cards: p.cards,
      revealedCards: p.revealedCards,
      eliminated: p.eliminated,
    })),
  }
}

// ── Batch runner ──

export function runBatch(botConfigs, numGames, startSeed = 1) {
  const results = []
  const wins = {}
  let totalTurns = 0
  const actionCounts = {}

  for (let i = 0; i < numGames; i++) {
    const result = runGame(botConfigs, startSeed + i)
    results.push(result)
    totalTurns += result.turns

    const w = result.winner
    wins[w] = (wins[w] || 0) + 1

    for (const a of result.actionHistory) {
      actionCounts[a.action] = (actionCounts[a.action] || 0) + 1
    }
  }

  const totalActions = Object.values(actionCounts).reduce((a, b) => a + b, 0)

  return {
    games: numGames,
    avgTurns: totalTurns / numGames,
    winRates: Object.fromEntries(
      Object.entries(wins).map(([k, v]) => [k, (v / numGames * 100).toFixed(1) + '%'])
    ),
    actionDistribution: Object.fromEntries(
      Object.entries(actionCounts).map(([k, v]) => [k, (v / totalActions * 100).toFixed(1) + '%'])
    ),
  }
}

// ── CLI runner ──
if (typeof process !== 'undefined' && process.argv?.[1]?.includes('simulator')) {
  console.log('=== Coup Simulator ===\n')

  const easyConfig = { create: createEasyBot, personality: { name: 'default' } }
  const configs = Array(6).fill(easyConfig)

  console.log('Running 1000 games: 6 Easy bots...')
  const t0 = performance.now()
  const report = runBatch(configs, 1000)
  const elapsed = ((performance.now() - t0) / 1000).toFixed(2)

  console.log(`Done in ${elapsed}s`)
  console.log(`Avg game length: ${report.avgTurns.toFixed(1)} turns`)
  console.log(`Win rates:`, report.winRates)
  console.log(`Action distribution:`, report.actionDistribution)
}
