const ENDPOINT = '/api/track'
const pageStart = Date.now()
const sectionTimes = {}
let observers = []

function send(event) {
  try {
    const body = JSON.stringify(event)
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }))
    } else {
      fetch(ENDPOINT, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true })
    }
  } catch (_) { /* silent */ }
}

export function trackPageView() {
  send({
    type: 'pageview',
    url: location.href,
    referrer: document.referrer || null,
    screen: `${screen.width}x${screen.height}`,
  })
}

export function trackClick(label) {
  send({ type: 'click', label, timeOnPage: Math.round((Date.now() - pageStart) / 1000) })
}

export function trackSections() {
  const sections = document.querySelectorAll('[data-track]')
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const name = entry.target.dataset.track
      if (entry.isIntersecting) {
        sectionTimes[name] = Date.now()
      } else if (sectionTimes[name]) {
        const seconds = Math.round((Date.now() - sectionTimes[name]) / 1000)
        if (seconds >= 1) {
          send({ type: 'section', name, seconds })
        }
        delete sectionTimes[name]
      }
    })
  }, { threshold: 0.3 })

  sections.forEach(s => observer.observe(s))
  observers.push(observer)
}

export function trackExit() {
  window.addEventListener('beforeunload', () => {
    // Flush any sections still in view
    Object.entries(sectionTimes).forEach(([name, start]) => {
      const seconds = Math.round((Date.now() - start) / 1000)
      if (seconds >= 1) send({ type: 'section', name, seconds })
    })
    send({ type: 'exit', totalSeconds: Math.round((Date.now() - pageStart) / 1000) })
  })

  // Heartbeat every 5s — works on mobile where beforeunload doesn't fire
  setInterval(() => {
    send({ type: 'heartbeat', secondsOnPage: Math.round((Date.now() - pageStart) / 1000) })
  }, 10000)
}

export function initAnalytics() {
  trackPageView()
  trackExit()
  // Defer section tracking until DOM is ready
  if (document.readyState === 'complete') {
    trackSections()
  } else {
    window.addEventListener('load', trackSections)
  }
}
