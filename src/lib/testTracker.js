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
  let currentRoundId = null
  let currentRoundStartTime = null
  let currentRoundSetup = null
  let roundCounter = 0

  return {
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
    },

    // BEFORE — inserts row with question/setup, result TBD
    async startRound({ label, elo, setup }) {
      currentRoundId = null
      currentRoundStartTime = Date.now()
      currentRoundSetup = setup || {}

      if (!supabase || !ip) return

      const { data, error } = await supabase
        .from('game_rounds')
        .insert({
          ip_address: ip,
          attempt_number: attemptNumber,
          game_type: currentGameType,
          round_index: roundCounter,
          label,
          round_elo: elo,
          started_at: new Date(currentRoundStartTime).toISOString(),
          correct: null,
          elo_before: null,
          elo_after: null,
          time_taken_ms: null,
          actions: { setup: currentRoundSetup },
        })
        .select('id')
        .single()

      if (error) { console.error('Round start error:', error); return }
      currentRoundId = data.id
    },

    // AFTER — updates that row with answer, result, timing
    async completeRound({ correct, scoreBefore, scoreAfter, response }) {
      const timeTaken = currentRoundStartTime ? Date.now() - currentRoundStartTime : 0

      if (supabase && currentRoundId) {
        const { error } = await supabase
          .from('game_rounds')
          .update({
            correct,
            elo_before: scoreBefore,
            elo_after: scoreAfter,
            time_taken_ms: timeTaken,
            actions: { setup: currentRoundSetup, response: response || {} },
          })
          .eq('id', currentRoundId)

        if (error) console.error('Round complete error:', error)
      } else if (supabase && ip) {
        // Fallback: no startRound was called, insert complete row
        await supabase.from('game_rounds').insert({
          ip_address: ip,
          attempt_number: attemptNumber,
          game_type: currentGameType,
          round_index: roundCounter,
          started_at: new Date(currentRoundStartTime || Date.now()).toISOString(),
          time_taken_ms: timeTaken,
          correct,
          elo_before: scoreBefore,
          elo_after: scoreAfter,
          actions: { setup: currentRoundSetup, response: response || {} },
        })
      }

      roundCounter++
      currentRoundId = null
      currentRoundStartTime = null
      currentRoundSetup = null
    },

    endGame() {
      currentGameType = null
    },

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
