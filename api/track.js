export function POST(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const ua = req.headers.get('user-agent') || 'unknown'

  return req.json().then(event => {
    const entry = {
      timestamp: new Date().toISOString(),
      ip,
      ua,
      ...event,
    }

    // Visible in Vercel Functions > Logs
    console.log(JSON.stringify(entry))

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })
}
