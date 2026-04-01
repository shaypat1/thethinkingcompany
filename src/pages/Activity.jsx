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
      <div className="subpage">
        <Link to="/" className="back-link">Back</Link>
        <p style={{ color: 'var(--text-muted)' }}>Activity not found.</p>
      </div>
    )
  }

  return (
    <div className="subpage">
      <Link to="/" className="back-link">Back</Link>
      <div className="activity-header">
        <span className="activity-day">{day.title}</span>
        <h1 className="activity-title">{node.label}</h1>
      </div>
      <ActivityDispatcher type={node.type} content={content} label={node.label} />
    </div>
  )
}
