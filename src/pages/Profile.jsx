import { Link } from 'react-router-dom'
import { useTheme } from '../ThemeContext'

const previewStyles = {
  default: { bg: '#fafafa' },
  cosmic: {
    bg: 'linear-gradient(135deg, #1a0050 0%, #0b0020 60%, #050010 100%)',
    overlay: 'radial-gradient(circle at 70% 30%, rgba(140,60,255,0.3) 0%, transparent 60%)',
  },
  postapoc: {
    bg: 'linear-gradient(180deg, #2a1808 0%, #1a1008 100%)',
    overlay: 'radial-gradient(ellipse at 50% 0%, rgba(200,100,20,0.2) 0%, transparent 60%)',
  },
  ice: {
    bg: 'linear-gradient(180deg, #d8eef4 0%, #e8f4f8 100%)',
    overlay: 'linear-gradient(135deg, rgba(42,200,180,0.12) 0%, transparent 60%)',
  },
  rhythm: {
    bg: '#0a0a14',
    overlay: 'radial-gradient(ellipse at 50% 80%, rgba(255,45,149,0.2) 0%, transparent 60%)',
  },
  mindscape: {
    bg: 'linear-gradient(135deg, #f5f0ff 0%, #ece0ff 100%)',
    overlay: 'radial-gradient(circle at 30% 40%, rgba(140,80,220,0.15) 0%, transparent 50%)',
  },
  fantasy: {
    bg: 'linear-gradient(180deg, #0a1a10 0%, #0d2218 100%)',
    overlay: 'radial-gradient(circle at 40% 60%, rgba(64,192,96,0.12) 0%, transparent 50%)',
  },
  urban: {
    bg: '#1c1c1e',
    overlay: 'linear-gradient(90deg, rgba(200,184,144,0.06) 0%, transparent 100%)',
  },
  lava: {
    bg: 'linear-gradient(180deg, #1a0505 0%, #100000 100%)',
    overlay: 'radial-gradient(circle at 40% 60%, rgba(255,60,20,0.2) 0%, transparent 50%)',
  },
  glitch: {
    bg: '#050f05',
    overlay: 'linear-gradient(180deg, rgba(0,255,65,0.05) 0%, transparent 50%)',
  },
  ocean: {
    bg: 'linear-gradient(180deg, #020a18 0%, #061830 100%)',
    overlay: 'radial-gradient(ellipse at 50% 30%, rgba(60,180,220,0.12) 0%, transparent 60%)',
  },
  vapor: {
    bg: 'linear-gradient(180deg, #1a0530 0%, #200840 100%)',
    overlay: 'radial-gradient(circle at 50% 40%, rgba(255,100,200,0.15) 0%, transparent 50%)',
  },
}

export default function Profile() {
  const { themeKey, setThemeKey, themes } = useTheme()

  return (
    <div className="subpage">
      <Link to="/" className="back-link">&larr; Back</Link>
      <div className="profile-card">
        <div className="profile-avatar-lg">S</div>
        <h1 className="profile-name">Shay</h1>
        <p className="profile-meta">Joined April 2026</p>
        <div className="profile-stats">
          <div className="stat">
            <div className="stat-value">12</div>
            <div className="stat-label">Streak</div>
          </div>
          <div className="stat">
            <div className="stat-value">47</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat">
            <div className="stat-value">1240</div>
            <div className="stat-label">Points</div>
          </div>
        </div>

        <div className="themes-section">
          <h2 className="themes-title">Themes</h2>
          <div className="themes-grid">
            {Object.entries(themes).map(([key, theme]) => {
              const preview = previewStyles[key] || {}
              return (
                <button
                  key={key}
                  className={`theme-card ${themeKey === key ? 'active' : ''}`}
                  onClick={() => setThemeKey(key)}
                >
                  <div className="theme-preview" style={{ background: preview.bg || theme.vars['--bg'] }}>
                    {preview.overlay && (
                      <div className="theme-preview-overlay" style={{ background: preview.overlay }} />
                    )}
                    <svg viewBox="0 0 120 50" className="theme-mini-track">
                      <path
                        d="M 10 35 C 30 35, 30 15, 50 15 C 70 15, 70 40, 90 25 C 100 18, 105 25, 110 25"
                        fill="none"
                        stroke={theme.vars['--path-color']}
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <circle cx="10" cy="35" r="5" fill={theme.vars['--node-unlocked']} stroke={theme.vars['--node-stroke']} strokeWidth="1.5" />
                      <circle cx="50" cy="15" r="5" fill={theme.vars['--node-unlocked']} stroke={theme.vars['--node-stroke']} strokeWidth="1.5" />
                      <circle cx="90" cy="25" r="5" fill={theme.vars['--node-locked']} stroke={theme.vars['--node-stroke']} strokeWidth="1.5" />
                    </svg>
                  </div>
                  <span className="theme-name">{theme.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
