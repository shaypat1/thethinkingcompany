import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './ThemeContext'
import ThemeBackground from './components/ThemeBackground'
import Home from './pages/Home'
import Profile from './pages/Profile'
import Leaderboard from './pages/Leaderboard'
import Activity from './pages/Activity'
import CMS from './pages/CMS'
import './App.css'

export default function App() {
  return (
    <ThemeProvider>
      <ThemeBackground />
      <BrowserRouter>
        <div className="app-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/activity/:dayId/:nodeIndex" element={<Activity />} />
            <Route path="/cms" element={<CMS />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  )
}
