// Coup game engine — rules enforcement, state management, turn flow
// 6-player game: 5 character types × 3 copies = 15 cards
// 12 dealt (2 per player), 3 in court deck

export const CHARACTERS = ['Duke', 'Assassin', 'Ambassador', 'Captain', 'Contessa']
export const COPIES_PER_CHAR = 3
export const TOTAL_CARDS = 15
export const PLAYER_COUNT = 6
export const STARTING_COINS = 2
export const COUP_COST = 7
export const ASSASSINATE_COST = 3
export const MANDATORY_COUP_THRESHOLD = 10

// Action definitions
export const ACTIONS = {
  income:      { name: 'Income', claimsChar: null, cost: 0, targetRequired: false, blockableBy: [] },
  foreignAid:  { name: 'Foreign Aid', claimsChar: null, cost: 0, targetRequired: false, blockableBy: ['Duke'] },
  coup:        { name: 'Coup', claimsChar: null, cost: COUP_COST, targetRequired: true, blockableBy: [] },
  tax:         { name: 'Tax', claimsChar: 'Duke', cost: 0, targetRequired: false, blockableBy: [] },
  assassinate: { name: 'Assassinate', claimsChar: 'Assassin', cost: ASSASSINATE_COST, targetRequired: true, blockableBy: ['Contessa'] },
  exchange:    { name: 'Exchange', claimsChar: 'Ambassador', cost: 0, targetRequired: false, blockableBy: [] },
  steal:       { name: 'Steal', claimsChar: 'Captain', cost: 0, targetRequired: true, blockableBy: ['Captain', 'Ambassador'] },
}

// ── Game creation ──

export function createGame(seed) {
  const rng = seededRandom(seed)
  const deck = []
  for (const char of CHARACTERS) {
    for (let i = 0; i < COPIES_PER_CHAR; i++) deck.push(char)
  }
  shuffle(deck, rng)

  const players = []
  for (let i = 0; i < PLAYER_COUNT; i++) {
    players.push({
      id: i,
      coins: STARTING_COINS,
      cards: [deck.pop(), deck.pop()],
      revealedCards: [],
      eliminated: false,
    })
  }

  return {
    players,
    deck,          // court deck (3 remaining)
    currentPlayer: 0,
    turnNumber: 0,
    actionHistory: [],
    phase: 'action',
    pendingAction: null,
    pendingChallenge: null,
    pendingCounter: null,
    pendingLoseCard: null,
    winner: null,
    rng,
  }
}

// ── Queries ──

export function alivePlayers(game) {
  return game.players.filter(p => !p.eliminated)
}

export function alivePlayerIds(game) {
  return alivePlayers(game).map(p => p.id)
}

export function getPlayer(game, id) {
  return game.players[id]
}

export function playerCardCount(game, id) {
  return game.players[id].cards.length
}

export function isEliminated(game, id) {
  return game.players[id].eliminated
}

export function allRevealedCards(game) {
  const revealed = []
  for (const p of game.players) revealed.push(...p.revealedCards)
  return revealed
}

export function unseenCards(game, observerId) {
  const known = [...game.players[observerId].cards, ...allRevealedCards(game)]
  const all = []
  for (const char of CHARACTERS) for (let i = 0; i < COPIES_PER_CHAR; i++) all.push(char)
  const unseen = [...all]
  for (const k of known) {
    const idx = unseen.indexOf(k)
    if (idx >= 0) unseen.splice(idx, 1)
  }
  return unseen
}

// ── Legal action checks ──

export function getLegalActions(game, playerId) {
  const p = game.players[playerId]
  if (p.eliminated) return []
  const actions = []

  // Must coup at 10+
  if (p.coins >= MANDATORY_COUP_THRESHOLD) {
    return [{ action: 'coup', targets: alivePlayerIds(game).filter(id => id !== playerId) }]
  }

  // Always available
  actions.push({ action: 'income' })
  actions.push({ action: 'foreignAid' })

  // Coup if 7+
  if (p.coins >= COUP_COST) {
    actions.push({ action: 'coup', targets: alivePlayerIds(game).filter(id => id !== playerId) })
  }

  // Character actions (can always CLAIM regardless of hand)
  actions.push({ action: 'tax' })
  actions.push({ action: 'exchange' })
  actions.push({ action: 'steal', targets: alivePlayerIds(game).filter(id => id !== playerId && game.players[id].coins > 0) })

  if (p.coins >= ASSASSINATE_COST) {
    actions.push({ action: 'assassinate', targets: alivePlayerIds(game).filter(id => id !== playerId) })
  }

  return actions
}

// ── Action execution ──

export function performAction(game, playerId, actionKey, targetId) {
  const g = deepClone(game)
  const actor = g.players[playerId]
  const action = ACTIONS[actionKey]

  // Pay cost upfront (assassinate pays even if blocked/challenged)
  actor.coins -= action.cost

  g.pendingAction = {
    actor: playerId,
    action: actionKey,
    target: targetId ?? null,
    claimsChar: action.claimsChar,
    resolved: false,
    blocked: false,
    challengeFailed: false,
  }

  // Determine next phase
  if (action.claimsChar) {
    g.phase = 'challenge' // others can challenge the claim
  } else if (actionKey === 'foreignAid') {
    g.phase = 'counteraction' // anyone can claim Duke to block
  } else {
    // Income, Coup — resolve immediately
    resolveAction(g)
  }

  return g
}

// ── Challenge resolution ──

export function resolveChallenge(game, challengerId) {
  const g = deepClone(game)
  const pa = g.pendingAction
  const actor = g.players[pa.actor]
  const challenger = g.players[challengerId]
  const claimedChar = pa.claimsChar

  const hasCard = actor.cards.includes(claimedChar)

  const entry = {
    challengerId,
    claimedChar,
    actorHadCard: hasCard,
  }

  if (hasCard) {
    // Challenger loses — actor proves they had the card
    // Actor: reveal the card, shuffle it back, draw a new one
    const cardIdx = actor.cards.indexOf(claimedChar)
    actor.cards.splice(cardIdx, 1)
    g.deck.push(claimedChar)
    shuffle(g.deck, g.rng)
    actor.cards.push(g.deck.pop())

    // Challenger must lose a card
    g.pendingLoseCard = { playerId: challengerId, reason: 'challenge-failed' }
    g.phase = 'loseCard'
    entry.loser = challengerId
  } else {
    // Actor caught bluffing — actor loses a card
    g.pendingLoseCard = { playerId: pa.actor, reason: 'challenge-succeeded' }
    g.pendingAction.challengeFailed = true
    g.phase = 'loseCard'
    entry.loser = pa.actor
  }

  pa.challengeResult = entry
  return g
}

// ── No challenge — move to counteraction or resolve ──

export function skipChallenge(game) {
  const g = deepClone(game)
  const pa = g.pendingAction
  const action = ACTIONS[pa.action]

  if (action.blockableBy.length > 0) {
    g.phase = 'counteraction'
  } else {
    resolveAction(g)
  }
  return g
}

// ── Counteraction ──

export function performCounteraction(game, blockerId, claimedChar) {
  const g = deepClone(game)
  g.pendingCounter = {
    blocker: blockerId,
    claimedChar,
  }
  g.phase = 'challengeCounter' // action owner can challenge the block
  return g
}

export function skipCounteraction(game) {
  const g = deepClone(game)
  resolveAction(g)
  return g
}

// ── Challenge counteraction ──

export function resolveChallengeCounter(game, challengerId) {
  const g = deepClone(game)
  const pc = g.pendingCounter
  const blocker = g.players[pc.blocker]
  const hasCard = blocker.cards.includes(pc.claimedChar)

  if (hasCard) {
    // Blocker proves it — challenger loses a card, block stands
    const cardIdx = blocker.cards.indexOf(pc.claimedChar)
    blocker.cards.splice(cardIdx, 1)
    g.deck.push(pc.claimedChar)
    shuffle(g.deck, g.rng)
    blocker.cards.push(g.deck.pop())

    g.pendingLoseCard = { playerId: challengerId, reason: 'counter-challenge-failed' }
    g.pendingAction.blocked = true
    g.phase = 'loseCard'
  } else {
    // Blocker caught bluffing — blocker loses card, action goes through
    g.pendingLoseCard = { playerId: pc.blocker, reason: 'counter-challenge-succeeded' }
    g.phase = 'loseCard'
  }

  return g
}

export function skipChallengeCounter(game) {
  // Block succeeds unchallenged
  const g = deepClone(game)
  g.pendingAction.blocked = true
  resolveAction(g)
  return g
}

// ── Lose card ──

export function loseCard(game, playerId, cardIndex) {
  const g = deepClone(game)
  const p = g.players[playerId]
  const card = p.cards.splice(cardIndex, 1)[0]
  p.revealedCards.push(card)

  if (p.cards.length === 0) {
    p.eliminated = true
  }

  // Check if game over
  const alive = alivePlayers(g)
  if (alive.length === 1) {
    g.winner = alive[0].id
    g.phase = 'gameOver'
    return g
  }

  // What happens next depends on context
  const pa = g.pendingAction
  if (!pa) { advanceTurn(g); return g }

  if (g.pendingLoseCard?.reason === 'challenge-failed') {
    // Challenger lost — action continues (counteraction phase or resolve)
    g.pendingLoseCard = null
    if (pa.challengeFailed) {
      // Action was the one challenged and failed — already handled
      advanceTurn(g)
    } else {
      const action = ACTIONS[pa.action]
      if (action.blockableBy.length > 0) {
        g.phase = 'counteraction'
      } else {
        resolveAction(g)
      }
    }
  } else if (g.pendingLoseCard?.reason === 'challenge-succeeded') {
    // Actor caught bluffing — action fails
    g.pendingLoseCard = null
    advanceTurn(g)
  } else if (g.pendingLoseCard?.reason === 'counter-challenge-failed') {
    // Counter-challenger lost, block stands — action fails
    g.pendingLoseCard = null
    advanceTurn(g)
  } else if (g.pendingLoseCard?.reason === 'counter-challenge-succeeded') {
    // Blocker caught bluffing — action goes through
    g.pendingLoseCard = null
    resolveAction(g)
  } else if (g.pendingLoseCard?.reason === 'action-effect') {
    // Lost card due to Coup/Assassination
    g.pendingLoseCard = null
    advanceTurn(g)
  } else {
    g.pendingLoseCard = null
    advanceTurn(g)
  }

  return g
}

// ── Exchange ──

export function performExchange(game, playerId, keepIndices) {
  const g = deepClone(game)
  const p = g.players[playerId]

  // Player should have their cards + 2 drawn from deck
  // keepIndices = which 2 of the (up to 4) cards to keep
  const allCards = [...p.cards]
  const kept = keepIndices.map(i => allCards[i])
  const returned = allCards.filter((_, i) => !keepIndices.includes(i))

  p.cards = kept
  g.deck.push(...returned)
  shuffle(g.deck, g.rng)

  advanceTurn(g)
  return g
}

// ── Internal resolution ──

function resolveAction(g) {
  const pa = g.pendingAction
  if (pa.blocked || pa.challengeFailed) {
    advanceTurn(g)
    return
  }

  const actor = g.players[pa.actor]
  const target = pa.target !== null ? g.players[pa.target] : null

  switch (pa.action) {
    case 'income':
      actor.coins += 1
      advanceTurn(g)
      break

    case 'foreignAid':
      actor.coins += 2
      advanceTurn(g)
      break

    case 'coup':
      // Target must lose a card
      g.pendingLoseCard = { playerId: pa.target, reason: 'action-effect' }
      g.phase = 'loseCard'
      break

    case 'tax':
      actor.coins += 3
      advanceTurn(g)
      break

    case 'assassinate':
      if (!target.eliminated) {
        g.pendingLoseCard = { playerId: pa.target, reason: 'action-effect' }
        g.phase = 'loseCard'
      } else {
        advanceTurn(g)
      }
      break

    case 'exchange':
      // Draw 2 from deck
      const drawn = []
      for (let i = 0; i < 2 && g.deck.length > 0; i++) drawn.push(g.deck.pop())
      actor.cards.push(...drawn)
      g.phase = 'exchange'
      break

    case 'steal':
      if (target) {
        const stolen = Math.min(2, target.coins)
        target.coins -= stolen
        actor.coins += stolen
      }
      advanceTurn(g)
      break
  }

  // Log
  g.actionHistory.push({
    turn: g.turnNumber,
    actor: pa.actor,
    action: pa.action,
    target: pa.target,
    claimsChar: pa.claimsChar,
    blocked: pa.blocked,
    challengeFailed: pa.challengeFailed,
    challengeResult: pa.challengeResult || null,
  })

  pa.resolved = true
}

function advanceTurn(g) {
  g.pendingAction = null
  g.pendingCounter = null
  g.pendingChallenge = null
  g.pendingLoseCard = null
  g.turnNumber++

  // Find next alive player
  let next = (g.currentPlayer + 1) % PLAYER_COUNT
  while (g.players[next].eliminated) {
    next = (next + 1) % PLAYER_COUNT
  }
  g.currentPlayer = next
  g.phase = 'action'
}

// ── Utilities ──

function seededRandom(seed) {
  let s = seed || Date.now()
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff
    return s / 0x7fffffff
  }
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

function deepClone(obj) {
  const rngRef = obj.rng
  const str = JSON.stringify(obj, (key, val) => key === 'rng' ? undefined : val)
  const g = JSON.parse(str)
  g.rng = rngRef // restore rng function reference
  return g
}

export function cloneGame(game) {
  return deepClone(game)
}
