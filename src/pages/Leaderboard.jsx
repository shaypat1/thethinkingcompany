import { Link } from 'react-router-dom'

const leaders = [
  { name: 'Shay', score: 1240 },
  { name: 'Jordan', score: 1180 },
  { name: 'Alex', score: 1050 },
  { name: 'Morgan', score: 890 },
  { name: 'Riley', score: 720 },
]

export default function Leaderboard() {
  return (
    <div className="subpage">
      <Link to="/" className="back-link">&larr; Back</Link>
      <h1 className="page-title">Leaderboard</h1>
      <ul className="leaderboard-list">
        {leaders.map((person, i) => (
          <li key={person.name} className="leaderboard-item">
            <span className="leaderboard-rank">{i + 1}</span>
            <span className="leaderboard-name">{person.name}</span>
            <span className="leaderboard-score">{person.score} pts</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
