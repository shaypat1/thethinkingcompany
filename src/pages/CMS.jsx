import { Link } from 'react-router-dom'
import { getAllContent, getAllDays, getContent } from '../content'

const TYPE_LABELS = {
  flashcard: 'Flashcard',
  gravity: 'Gravity',
  pirate: 'Pirate',
  placeholder: 'Placeholder',
}

export default function CMS() {
  const content = getAllContent()
  const days = getAllDays()

  // Collect every unique activity across all days + standalone content
  const allActivities = []
  const seen = new Set()

  // From days
  days.forEach((day) => {
    day.nodes.forEach((node) => {
      const key = `${node.type}:${node.id}`
      if (!seen.has(key)) {
        seen.add(key)
        allActivities.push({
          type: node.type,
          id: node.id,
          label: node.label,
          hasContent: !!getContent(node.type, node.id),
          dayRefs: [],
        })
      }
      allActivities.find((a) => `${a.type}:${a.id}` === key).dayRefs.push(day.day)
    })
  })

  // Standalone content not in any day
  Object.entries(content).forEach(([type, items]) => {
    Object.keys(items).forEach((id) => {
      const key = `${type}:${id}`
      if (!seen.has(key)) {
        seen.add(key)
        allActivities.push({ type, id, label: id, hasContent: true, dayRefs: [] })
      }
    })
  })

  // Group by type
  const grouped = {}
  allActivities.forEach((a) => {
    if (!grouped[a.type]) grouped[a.type] = []
    grouped[a.type].push(a)
  })

  return (
    <div className="cms">
      <div className="cms-header">
        <Link to="/" className="cms-back">Back</Link>
        <h1 className="cms-title">Content Manager</h1>
        <p className="cms-subtitle">{allActivities.length} activities / {days.length} days</p>
      </div>

      <div className="cms-sections">
        {Object.entries(grouped).map(([type, items]) => (
          <div key={type} className="cms-section">
            <h2 className="cms-section-title">{TYPE_LABELS[type] || type}</h2>
            <div className="cms-grid">
              {items.map((item) => {
                // Find which day/node this appears in so we can link to it
                const dayRef = item.dayRefs[0]
                const day = dayRef ? getAllDays().find((d) => d.day === dayRef) : null
                const nodeIndex = day ? day.nodes.findIndex((n) => n.type === item.type && n.id === item.id) : -1
                const playable = item.type !== 'placeholder' && item.hasContent && dayRef && nodeIndex >= 0

                return (
                  <div key={`${item.type}:${item.id}`} className="cms-card">
                    <div className="cms-card-type">{TYPE_LABELS[item.type] || item.type}</div>
                    <div className="cms-card-label">{item.label}</div>
                    <div className="cms-card-id">{item.id}</div>
                    <div className="cms-card-meta">
                      {item.dayRefs.length > 0 ? (
                        <span>Day {item.dayRefs.join(', ')}</span>
                      ) : (
                        <span className="cms-orphan">Not in any day</span>
                      )}
                      {!item.hasContent && item.type !== 'placeholder' && (
                        <span className="cms-missing">No content</span>
                      )}
                    </div>
                    {playable ? (
                      <Link to={`/activity/${dayRef}/${nodeIndex}`} className="cms-play">
                        Play
                      </Link>
                    ) : (
                      <span className="cms-play disabled">
                        {item.type === 'placeholder' ? 'Not built' : 'No route'}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="cms-days-section">
        <h2 className="cms-section-title">Days</h2>
        {days.map((day) => (
          <div key={day.day} className="cms-day">
            <div className="cms-day-header">
              <span className="cms-day-num">Day {day.day}</span>
              <span className="cms-day-title">{day.title}</span>
            </div>
            <div className="cms-day-nodes">
              {day.nodes.map((node, i) => (
                <span key={i} className={`cms-day-node ${node.type}`}>
                  {node.label}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
