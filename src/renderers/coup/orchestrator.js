// Game orchestrator — manages flow between human player and bot decisions
// The human player is always player 0

import {
  createGame, performAction, resolveChallenge, skipChallenge,
  performCounteraction, skipCounteraction, resolveChallengeCounter,
  skipChallengeCounter, loseCard, performExchange,
  alivePlayers, alivePlayerIds, ACTIONS,
} from './engine.js'
import { createEasyBot } from './easyBot.js'
import { createMediumBot } from './mediumBot.js'
import { createHardBot } from './hardBot.js'
import { PERSONALITIES, PERSONALITY_NAMES, BOT_NAMES } from './personality.js'

const BOT_CREATORS = { easy: createEasyBot, medium: createMediumBot, hard: createHardBot }

const DELAY = { easy: [800, 2000], medium: [1200, 3000], hard: [1500, 3500] }

function randomDelay(tier) {
  const [lo, hi] = DELAY[tier] || [1000, 2500]
  return lo + Math.random() * (hi - lo)
}

export function createOrchestrator(difficulty = 'medium', onUpdate, seed) {
  let game = createGame(seed || Math.floor(Math.random() * 999999))
  let bots = []
  let gameLog = []
  let waitingFor = null // null | { type, playerId, ... }
  let destroyed = false

  // Assign personalities to 5 bots (player 0 is human)
  const personalityKeys = [...PERSONALITY_NAMES].sort(() => Math.random() - 0.5).slice(0, 5)
  const botInfos = personalityKeys.map((pKey, i) => {
    const pid = i + 1
    const personality = { ...PERSONALITIES[pKey], name: pKey }
    const names = BOT_NAMES[pKey]
    const displayName = names[Math.floor(Math.random() * names.length)]
    return { pid, difficulty, personality, displayName, pKey }
  })

  // Create bot instances
  bots = [null] // index 0 = human (no bot)
  for (const info of botInfos) {
    const creator = BOT_CREATORS[difficulty]
    bots.push(creator(info.pid, info.personality))
  }

  const playerNames = ['You', ...botInfos.map(b => b.displayName)]
  const playerPersonalities = [null, ...botInfos.map(b => b.pKey)]

  function notify() {
    if (!destroyed) onUpdate?.({ game, waitingFor, gameLog, playerNames, playerPersonalities })
  }

  function log(msg) {
    gameLog.push({ text: msg, turn: game.turnNumber, time: Date.now() })
  }

  function delay(ms) {
    return new Promise(r => setTimeout(r, ms))
  }

  // ── Main game loop — runs automatically for bot turns, pauses for human ──

  async function runLoop() {
    while (!game.winner && !destroyed) {
      const pid = game.currentPlayer

      if (game.phase === 'action') {
        if (pid === 0) {
          // Human's turn — wait for input
          waitingFor = { type: 'action', playerId: 0 }
          notify()
          return // pause — resumed when human calls humanAction()
        } else {
          // Bot's turn
          await delay(randomDelay(difficulty))
          const bot = bots[pid]
          const decision = bot.selectAction(game)
          log(`${playerNames[pid]} uses ${ACTIONS[decision.action].name}${decision.target != null ? ` on ${playerNames[decision.target]}` : ''}`)
          game = performAction(game, pid, decision.action, decision.target)
          notify()
        }
      }

      // Challenge phase
      if (game.phase === 'challenge' && game.pendingAction) {
        const pa = game.pendingAction
        const others = alivePlayerIds(game).filter(id => id !== pa.actor)
        let challenged = false

        for (const oid of others) {
          if (oid === 0) {
            // Human decides whether to challenge
            waitingFor = { type: 'challenge', playerId: 0, claim: { actor: pa.actor, claimedChar: pa.claimsChar } }
            notify()
            return
          }
          await delay(randomDelay(difficulty) * 0.5)
          if (bots[oid]?.shouldChallenge(game, { claimedChar: pa.claimsChar, actor: pa.actor })) {
            log(`${playerNames[oid]} challenges ${playerNames[pa.actor]}!`)
            game = resolveChallenge(game, oid)
            challenged = true
            notify()
            await delay(1500)
            break
          }
        }
        if (!challenged && game.phase === 'challenge') {
          game = skipChallenge(game)
          notify()
        }
      }

      // Lose card
      if (game.phase === 'loseCard' && game.pendingLoseCard) {
        const plc = game.pendingLoseCard
        if (plc.playerId === 0) {
          waitingFor = { type: 'loseCard', playerId: 0 }
          notify()
          return
        }
        await delay(randomDelay(difficulty) * 0.4)
        const p = game.players[plc.playerId]
        if (p.cards.length > 0) {
          const idx = bots[plc.playerId].selectCardToLose(p.cards)
          const lost = p.cards[idx]
          log(`${playerNames[plc.playerId]} reveals ${lost}`)
          game = loseCard(game, plc.playerId, idx)
          notify()
          await delay(1000)
        }
      }

      // Counteraction
      if (game.phase === 'counteraction' && game.pendingAction) {
        const pa = game.pendingAction
        const potentialBlockers = pa.action === 'foreignAid'
          ? alivePlayerIds(game).filter(id => id !== pa.actor)
          : pa.target != null ? [pa.target].filter(id => !game.players[id].eliminated) : []

        let blocked = false
        for (const bid of potentialBlockers) {
          if (bid === 0) {
            waitingFor = { type: 'counteract', playerId: 0, action: pa }
            notify()
            return
          }
          await delay(randomDelay(difficulty) * 0.5)
          const decision = bots[bid]?.shouldCounteract(game, pa)
          if (decision?.counteract) {
            log(`${playerNames[bid]} blocks with ${decision.claimedChar}`)
            game = performCounteraction(game, bid, decision.claimedChar)
            blocked = true
            notify()
            break
          }
        }
        if (!blocked && game.phase === 'counteraction') {
          game = skipCounteraction(game)
          notify()
        }
      }

      // Challenge counteraction
      if (game.phase === 'challengeCounter' && game.pendingCounter) {
        const pc = game.pendingCounter
        const pa = game.pendingAction
        if (pa.actor === 0) {
          waitingFor = { type: 'challengeCounter', playerId: 0, counter: pc }
          notify()
          return
        }
        await delay(randomDelay(difficulty) * 0.5)
        if (bots[pa.actor]?.shouldChallengeCounter(game, pc)) {
          log(`${playerNames[pa.actor]} challenges the block!`)
          game = resolveChallengeCounter(game, pa.actor)
          notify()
          await delay(1500)
        } else {
          game = skipChallengeCounter(game)
          notify()
        }
      }

      // Lose card (again, after counter-challenge)
      if (game.phase === 'loseCard' && game.pendingLoseCard) {
        const plc = game.pendingLoseCard
        if (plc.playerId === 0) {
          waitingFor = { type: 'loseCard', playerId: 0 }
          notify()
          return
        }
        await delay(randomDelay(difficulty) * 0.4)
        const p = game.players[plc.playerId]
        if (p.cards.length > 0) {
          const idx = bots[plc.playerId].selectCardToLose(p.cards)
          log(`${playerNames[plc.playerId]} reveals ${p.cards[idx]}`)
          game = loseCard(game, plc.playerId, idx)
          notify()
          await delay(1000)
        }
      }

      // Exchange
      if (game.phase === 'exchange') {
        const pa = game.pendingAction
        if (pa.actor === 0) {
          waitingFor = { type: 'exchange', playerId: 0, cards: game.players[0].cards }
          notify()
          return
        }
        await delay(randomDelay(difficulty) * 0.6)
        const p = game.players[pa.actor]
        const keepIndices = bots[pa.actor].selectExchangeCards(p.cards)
        game = performExchange(game, pa.actor, keepIndices)
        log(`${playerNames[pa.actor]} exchanges cards`)
        notify()
      }

      if (game.phase === 'gameOver') break
      await delay(300) // small gap between phases
    }

    if (game.winner != null) {
      log(`${playerNames[game.winner]} wins!`)
      notify()
    }
  }

  // ── Human input methods ──

  function humanAction(actionKey, targetId) {
    if (waitingFor?.type !== 'action') return
    waitingFor = null
    log(`You use ${ACTIONS[actionKey].name}${targetId != null ? ` on ${playerNames[targetId]}` : ''}`)
    game = performAction(game, 0, actionKey, targetId)
    notify()
    runLoop()
  }

  function humanChallenge(doChallenge) {
    if (waitingFor?.type !== 'challenge') return
    waitingFor = null
    if (doChallenge) {
      const pa = game.pendingAction
      log(`You challenge ${playerNames[pa.actor]}!`)
      game = resolveChallenge(game, 0)
    } else {
      // Don't challenge — but other bots still can
      // For simplicity, skip challenge entirely if human passes
      game = skipChallenge(game)
    }
    notify()
    runLoop()
  }

  function humanCounteract(doBlock, claimedChar) {
    if (waitingFor?.type !== 'counteract') return
    waitingFor = null
    if (doBlock && claimedChar) {
      log(`You block with ${claimedChar}`)
      game = performCounteraction(game, 0, claimedChar)
    } else {
      game = skipCounteraction(game)
    }
    notify()
    runLoop()
  }

  function humanChallengeCounter(doChallenge) {
    if (waitingFor?.type !== 'challengeCounter') return
    waitingFor = null
    if (doChallenge) {
      const pc = game.pendingCounter
      log(`You challenge ${playerNames[pc.blocker]}'s block!`)
      game = resolveChallengeCounter(game, 0)
    } else {
      game = skipChallengeCounter(game)
    }
    notify()
    runLoop()
  }

  function humanLoseCard(cardIndex) {
    if (waitingFor?.type !== 'loseCard') return
    waitingFor = null
    const lost = game.players[0].cards[cardIndex]
    log(`You reveal ${lost}`)
    game = loseCard(game, 0, cardIndex)
    notify()
    runLoop()
  }

  function humanExchange(keepIndices) {
    if (waitingFor?.type !== 'exchange') return
    waitingFor = null
    game = performExchange(game, 0, keepIndices)
    log('You exchange cards')
    notify()
    runLoop()
  }

  function start() {
    log('Game begins!')
    notify()
    runLoop()
  }

  function destroy() {
    destroyed = true
  }

  return {
    start, destroy,
    humanAction, humanChallenge, humanCounteract,
    humanChallengeCounter, humanLoseCard, humanExchange,
    getState: () => ({ game, waitingFor, gameLog, playerNames, playerPersonalities }),
  }
}
