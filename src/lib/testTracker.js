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
  let sessionId = null
  let currentGameType = null
  let currentRoundStart = Date.now()
  let roundCounter = 0

  // Resolves when session is created in DB
  let sessionReady = null

  return {
    // Called immediately on START — creates session row in DB
    async init(age) {
      if (!supabase) { console.log('No Supabase configured'); return }

      ip = await getIP()
      attemptNumber = await getAttemptNumber(ip)

      const { data, error } = await supabase
        .from('test_sessions')
        .insert({
          ip_address: ip,
          attempt_number: attemptNumber,
          age,
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (error) { console.error('Session create error:', error); return }
      sessionId = data.id
    },

    startGame(type) {
      currentGameType = type
      currentRoundStart = Date.now()
    },

    // Saves round to DB immediately
    async recordRound({ correct, scoreBefore, scoreAfter, label, elo, actions }) {
      const now = Date.now()
      const timeTaken = now - currentRoundStart

      if (supabase && ip) {
        const { error } = await supabase.from('game_rounds').insert({
          ip_address: ip,
          attempt_number: attemptNumber,
          game_type: currentGameType,
          round_index: roundCounter,
          label,
          started_at: new Date(currentRoundStart).toISOString(),
          time_taken_ms: timeTaken,
          correct,
          elo_before: scoreBefore,
          elo_after: scoreAfter,
          round_elo: elo,
          actions: actions || {},
        })
        if (error) console.error('Round insert error:', error)
      }

      roundCounter++
      currentRoundStart = now
    },

    endGame() {
      currentGameType = null
    },

    // Updates session with email + final score
    async submit(email, finalScore) {
      if (!supabase || !sessionId) return

      const { error } = await supabase
        .from('test_sessions')
        .update({
          email,
          final_score: finalScore,
          ended_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

      if (error) console.error('Session update error:', error)
    },
  }
}
