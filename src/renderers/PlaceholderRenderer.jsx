import { Link } from 'react-router-dom'

export default function PlaceholderRenderer({ label }) {
  return (
    <div className="placeholder-renderer">
      <div className="placeholder-icon">?</div>
      <h2 className="placeholder-title">{label || 'Coming Soon'}</h2>
      <p className="placeholder-text">This activity is still being built.</p>
      <Link to="/" className="placeholder-back">Back to Track</Link>
    </div>
  )
}
