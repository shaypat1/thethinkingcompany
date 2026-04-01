import { createContext, useContext, useState, useEffect } from 'react'

export const themes = {
  default: {
    name: 'Default',
    vars: {
      '--bg': '#fafafa',
      '--text': '#1a1a1a',
      '--text-muted': '#888',
      '--border': '#e5e5e5',
      '--node-locked': '#1a1a1a',
      '--node-unlocked': '#ffffff',
      '--node-stroke': '#1a1a1a',
      '--path-color': '#1a1a1a',
      '--accent': '#1a1a1a',
    },
  },
  cosmic: {
    name: 'Cosmic Dunes',
    vars: {
      '--bg': '#0b0020',
      '--text': '#e0d0ff',
      '--text-muted': '#7b68ae',
      '--border': '#1e1045',
      '--node-locked': '#9060ff',
      '--node-unlocked': '#0b0020',
      '--node-stroke': '#b890ff',
      '--path-color': '#7040cc',
      '--accent': '#b890ff',
    },
  },
  postapoc: {
    name: 'Post-Apocalyptic',
    vars: {
      '--bg': '#1a1008',
      '--text': '#d4a054',
      '--text-muted': '#8a6530',
      '--border': '#2d1c0e',
      '--node-locked': '#c45a20',
      '--node-unlocked': '#1a1008',
      '--node-stroke': '#e07830',
      '--path-color': '#c45a20',
      '--accent': '#e07830',
    },
  },
  ice: {
    name: 'Ice Dunes',
    vars: {
      '--bg': '#e8f4f8',
      '--text': '#1a3a4a',
      '--text-muted': '#6a9aaa',
      '--border': '#c0dce6',
      '--node-locked': '#2a7a9a',
      '--node-unlocked': '#e8f4f8',
      '--node-stroke': '#2a7a9a',
      '--path-color': '#4a9aba',
      '--accent': '#2a7a9a',
    },
  },
  rhythm: {
    name: 'Rhythm Dunes',
    vars: {
      '--bg': '#0a0a14',
      '--text': '#ff2d95',
      '--text-muted': '#8a1a55',
      '--border': '#1a1a2e',
      '--node-locked': '#ff2d95',
      '--node-unlocked': '#0a0a14',
      '--node-stroke': '#ff2d95',
      '--path-color': '#ff2d95',
      '--accent': '#00e5ff',
    },
  },
  mindscape: {
    name: 'Mindscape',
    vars: {
      '--bg': '#f5f0ff',
      '--text': '#3a2060',
      '--text-muted': '#9a80c0',
      '--border': '#e0d0f0',
      '--node-locked': '#6a40b0',
      '--node-unlocked': '#f5f0ff',
      '--node-stroke': '#6a40b0',
      '--path-color': '#8a60d0',
      '--accent': '#6a40b0',
    },
  },
  fantasy: {
    name: 'Fantasy Creature',
    vars: {
      '--bg': '#0a1a10',
      '--text': '#a0e8a0',
      '--text-muted': '#4a8a4a',
      '--border': '#1a3020',
      '--node-locked': '#40c060',
      '--node-unlocked': '#0a1a10',
      '--node-stroke': '#60e080',
      '--path-color': '#40c060',
      '--accent': '#ffd700',
    },
  },
  urban: {
    name: 'Urban Sandstorm',
    vars: {
      '--bg': '#1c1c1e',
      '--text': '#c8b890',
      '--text-muted': '#706850',
      '--border': '#2e2e30',
      '--node-locked': '#a09070',
      '--node-unlocked': '#1c1c1e',
      '--node-stroke': '#c8b890',
      '--path-color': '#a09070',
      '--accent': '#e0c878',
    },
  },
  lava: {
    name: 'Lava Lamp',
    vars: {
      '--bg': '#1a0505',
      '--text': '#ff9070',
      '--text-muted': '#8a4030',
      '--border': '#2d1010',
      '--node-locked': '#e04020',
      '--node-unlocked': '#1a0505',
      '--node-stroke': '#ff6040',
      '--path-color': '#e04020',
      '--accent': '#ff9070',
    },
  },
  glitch: {
    name: 'Glitch Matrix',
    vars: {
      '--bg': '#050f05',
      '--text': '#00ff41',
      '--text-muted': '#007a20',
      '--border': '#0a2a0a',
      '--node-locked': '#00cc33',
      '--node-unlocked': '#050f05',
      '--node-stroke': '#00ff41',
      '--path-color': '#00cc33',
      '--accent': '#00ff41',
    },
  },
  ocean: {
    name: 'Deep Ocean',
    vars: {
      '--bg': '#020a18',
      '--text': '#80c8e0',
      '--text-muted': '#3a6a80',
      '--border': '#0a2040',
      '--node-locked': '#2090b0',
      '--node-unlocked': '#020a18',
      '--node-stroke': '#40b0d0',
      '--path-color': '#2090b0',
      '--accent': '#40b0d0',
    },
  },
  vapor: {
    name: 'Vaporwave',
    vars: {
      '--bg': '#1a0530',
      '--text': '#ff80d0',
      '--text-muted': '#8040a0',
      '--border': '#2a1050',
      '--node-locked': '#ff50c8',
      '--node-unlocked': '#1a0530',
      '--node-stroke': '#ff80d0',
      '--path-color': '#a040ff',
      '--accent': '#00e5ff',
    },
  },
}

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [themeKey, setThemeKey] = useState(() => {
    return localStorage.getItem('theme') || 'default'
  })

  useEffect(() => {
    const theme = themes[themeKey] || themes.default
    const root = document.documentElement
    Object.entries(theme.vars).forEach(([prop, value]) => {
      root.style.setProperty(prop, value)
    })
    localStorage.setItem('theme', themeKey)
  }, [themeKey])

  return (
    <ThemeContext.Provider value={{ themeKey, setThemeKey, themes }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
