import { useParams, Link } from 'react-router-dom'
import { getDay, getContent } from '../content'
import ActivityDispatcher from '../renderers/ActivityDispatcher'

export default function Activity() {
  const { dayId, nodeIndex } = useParams()
  const day = getDay(Number(dayId))
  const node = day?.nodes[Number(nodeIndex)]
  const content = node ? getContent(node.type, node.id) : null

  if (!day || !node) {
    return (
      <div className="activity-page">
        <div className="activity-topbar">
          <Link to="/" className="activity-back">&larr; Back</Link>
        </div>
        <div className="activity-body">
          <p style={{ color: 'var(--text-muted)' }}>Activity not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="activity-page">
      <div className="activity-topbar">
        <Link to="/" className="activity-back">&larr; Back</Link>
        <span className="activity-topbar-title">{node.label}</span>
        <span className="activity-topbar-day">{day.title}</span>
      </div>
      <div className="activity-body">
        <ActivityDispatcher type={node.type} content={content} label={node.label} />
      </div>
    </div>
  )
}
