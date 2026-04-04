import { supabase } from './supabase'

async function getIP() {
  try {
    const res = await fetch('https://api.ipify.org?format=json')
    const data = await res.json()
    return data.ip
  } catch { return 'unknown' }
}

async function getAttemptNumber(ip) {
  if (!supabase) return 1
  const { count } = await supabase
    .from('test_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
  return (count || 0) + 1
}

export function createTestTracker() {
  let ip = null
  let attemptNumber = null
  let age = null
  const sessionStart = Date.now()

  // Current game tracking
  let currentGameType = null
  let currentGameStart = null
  let currentRoundStart = null
  let pendingRounds = [] // rounds to insert on submit

  // Fetch IP immediately
  const ipPromise = getIP().then(async (fetchedIp) => {
    ip = fetchedIp
    attemptNumber = await getAttemptNumber(ip)
  })

  return {
    setAge(a) { age = a },

    startGame(type) {
      currentGameType = type
      currentGameStart = Date.now()
      currentRoundStart = Date.now()
    },

    // Call when a round/level within the current game produces a result
    recordRound({ correct, scoreBefore, scoreAfter, label, elo, actions }) {
      const now = Date.now()
      pendingRounds.push({
        game_type: currentGameType,
        round_index: pendingRounds.filter(r => r.game_type === currentGameType).length,
        label,
        started_at: new Date(currentRoundStart).toISOString(),
        time_taken_ms: now - currentRoundStart,
        correct,
        elo_before: scoreBefore,
        elo_after: scoreAfter,
        round_elo: elo,
        actions: actions || {},
      })
      currentRoundStart = now // next round starts now
    },

    endGame() {
      currentGameType = null
      currentGameStart = null
      currentRoundStart = null
    },

    async submit(email, finalScore) {
      await ipPromise // make sure IP is resolved

      if (!supabase) {
        console.log('No Supabase — data not saved', { ip, attemptNumber, email, finalScore, rounds: pendingRounds })
        return
      }

      try {
        // Insert session
        const { error: sessErr } = await supabase
          .from('test_sessions')
          .insert({
            ip_address: ip,
            attempt_number: attemptNumber,
            email,
            age,
            final_score: finalScore,
            started_at: new Date(sessionStart).toISOString(),
            ended_at: new Date().toISOString(),
          })

        if (sessErr) console.error('Session insert error:', sessErr)

        // Insert all rounds
        if (pendingRounds.length > 0) {
          const rows = pendingRounds.map(r => ({
            ip_address: ip,
            attempt_number: attemptNumber,
            ...r,
          }))
          const { error: roundErr } = await supabase.from('game_rounds').insert(rows)
          if (roundErr) console.error('Round insert error:', roundErr)
        }
      } catch (err) {
        console.error('Supabase save error:', err)
      }
    },
  }
}
