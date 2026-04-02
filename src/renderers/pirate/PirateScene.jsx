import { useMemo } from 'react'
import { useTheme } from '../../ThemeContext'
import './PirateScene.css'

const PIRATE_COLORS = ['#cc3333','#3366cc','#33aa55','#9944cc','#ee8833','#ccaa33','#33aaaa','#cc5599']
const SKIN = ['#e8c4a0','#d4aa82','#c49670','#b08058']
const HAIR = ['#2a1808','#1a0e04','#3a2818','#4a3828']

function Pirate({ index, voteState, walkingPlank, isCaptain }) {
  const color = PIRATE_COLORS[index % 8]
  const skin = SKIN[index % 4]
  const seed = index * 7 + 3
  const hasBeard = seed % 3 === 0
  const hasPatch = !isCaptain && seed % 3 === 1
  const hasScar = seed % 5 === 2

  const cls = [
    'pirate-figure',
    voteState === 'yes' ? 'vote-yes' : '',
    voteState === 'no' ? 'vote-no' : '',
    walkingPlank ? 'plank-walk' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={cls} style={{ animationDelay: `${index * 0.15}s` }}>
      <svg viewBox="0 0 80 140" className="pirate-svg">
        <defs>
          <radialGradient id={`skin${index}`} cx="45%" cy="40%">
            <stop offset="0%" stopColor={skin} />
            <stop offset="100%" stopColor={`${skin}cc`} />
          </radialGradient>
          <linearGradient id={`shirt${index}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={`${color}aa`} />
          </linearGradient>
        </defs>

        {/* Shadow on ground */}
        <ellipse cx="40" cy="136" rx="18" ry="3" fill="rgba(0,0,0,0.2)" />

        {/* Boots */}
        <path d="M24,120 L24,130 Q24,133 27,133 L37,133 Q39,133 39,131 L39,120 Z" fill="#2a1808" />
        <path d="M41,120 L41,130 Q41,133 44,133 L54,133 Q56,133 56,131 L56,120 Z" fill="#2a1808" />
        <path d="M24,120 L39,120 L39,123 L24,123 Z" fill="#3a2010" />
        <path d="M41,120 L56,120 L56,123 L41,123 Z" fill="#3a2010" />

        {/* Legs */}
        <rect x="26" y="100" width="11" height="21" rx="4" fill="#2a2a3e" />
        <rect x="43" y="100" width="11" height="21" rx="4" fill="#2a2a3e" />

        {/* Torso */}
        <path d="M22,62 Q20,64 20,68 L20,96 Q20,100 24,100 L56,100 Q60,100 60,96 L60,68 Q60,64 58,62 Z" fill={`url(#shirt${index})`} />
        {/* Vest */}
        <path d="M22,62 L36,80 L40,62" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="2.5" />
        <path d="M58,62 L44,80 L40,62" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="2.5" />
        {/* Buttons */}
        <circle cx="40" cy="70" r="1.2" fill="rgba(255,255,255,0.3)" />
        <circle cx="40" cy="78" r="1.2" fill="rgba(255,255,255,0.3)" />
        <circle cx="40" cy="86" r="1.2" fill="rgba(255,255,255,0.3)" />

        {/* Belt */}
        <rect x="19" y="93" width="42" height="5" rx="1.5" fill="#3a2010" />
        <rect x="36" y="91.5" width="8" height="8" rx="1.5" fill="#DAA520" />
        <rect x="38.5" y="94" width="3" height="3" rx="0.5" fill="#b8941a" />

        {/* Arms */}
        <path d="M20,64 L12,66 Q8,67 7,71 L5,82 Q4,86 7,87 L10,87 Q13,87 13,84 L16,72" fill={`url(#shirt${index})`} />
        <path d="M7,87 L10,100 Q11,103 14,102" fill="none" stroke={skin} strokeWidth="5" strokeLinecap="round" />
        <circle cx="14" cy="102" r="4" fill={skin} />

        <path d="M60,64 L68,66 Q72,67 73,71 L75,82 Q76,86 73,87 L70,87 Q67,87 67,84 L64,72" fill={`url(#shirt${index})`} />
        <path d="M73,87 L70,100 Q69,103 66,102" fill="none" stroke={skin} strokeWidth="5" strokeLinecap="round" />
        <circle cx="66" cy="102" r="4" fill={skin} />

        {/* Neck */}
        <rect x="34" y="55" width="12" height="8" rx="3" fill={`url(#skin${index})`} />

        {/* Head */}
        <ellipse cx="40" cy="42" rx="16" ry="18" fill={`url(#skin${index})`} />

        {/* Ears */}
        <ellipse cx="23" cy="42" rx="4" ry="5.5" fill={skin} />
        <ellipse cx="23" cy="42" rx="2" ry="3.5" fill={`${skin}88`} />
        <ellipse cx="57" cy="42" rx="4" ry="5.5" fill={skin} />
        <ellipse cx="57" cy="42" rx="2" ry="3.5" fill={`${skin}88`} />

        {/* Eyes */}
        {hasPatch ? (
          <>
            <ellipse cx="32" cy="40" rx="3.5" ry="3.5" fill="#111" />
            <path d="M27,36 L54,42" stroke="#111" strokeWidth="1.5" />
            <ellipse cx="48" cy="41" rx="4.5" ry="4" fill="white" />
            <circle cx="49" cy="41" r="2.2" fill="#2a4a3a" />
            <circle cx="49.5" cy="40.5" r="1" fill="#0a0a0a" />
            <circle cx="50.5" cy="39.5" r="0.5" fill="white" />
          </>
        ) : (
          <>
            <ellipse cx="32" cy="41" rx="4.5" ry="4" fill="white" />
            <circle cx="33" cy="41" r="2.2" fill={['#2a4a3a','#3a4a6a','#4a3a2a','#3a3a5a'][index % 4]} />
            <circle cx="33.5" cy="40.5" r="1" fill="#0a0a0a" />
            <circle cx="34.5" cy="39.5" r="0.5" fill="white" />

            <ellipse cx="48" cy="41" rx="4.5" ry="4" fill="white" />
            <circle cx="49" cy="41" r="2.2" fill={['#2a4a3a','#3a4a6a','#4a3a2a','#3a3a5a'][index % 4]} />
            <circle cx="49.5" cy="40.5" r="1" fill="#0a0a0a" />
            <circle cx="50.5" cy="39.5" r="0.5" fill="white" />
          </>
        )}

        {/* Eyebrows */}
        <path d={`M28,35 Q32,33 36,35`} fill="none" stroke={HAIR[index % 4]} strokeWidth="1.5" strokeLinecap="round" />
        <path d={`M44,35 Q48,33 52,35`} fill="none" stroke={HAIR[index % 4]} strokeWidth="1.5" strokeLinecap="round" />

        {/* Nose */}
        <path d="M38,44 Q40,48 42,44" fill="none" stroke={`${skin}99`} strokeWidth="1.5" strokeLinecap="round" />

        {/* Mouth */}
        <path d="M34,51 Q40,55 46,51" fill="none" stroke="#6a2a2a" strokeWidth="1.5" strokeLinecap="round" />

        {/* Scar */}
        {hasScar && <path d="M50,36 L46,48" stroke="rgba(180,80,60,0.5)" strokeWidth="1" strokeLinecap="round" />}

        {/* Beard */}
        {hasBeard && (
          <>
            <path d="M28,50 Q30,62 40,64 Q50,62 52,50" fill={HAIR[index % 4]} opacity="0.85" />
            <path d="M34,48 Q37,50 40,48 Q43,50 46,48" fill={HAIR[index % 4]} opacity="0.9" />
          </>
        )}

        {/* Hat */}
        {isCaptain ? (
          <>
            {/* Captain's hat — bigger, gold trim, feather */}
            <path d="M12,28 L40,12 L68,28 Z" fill="#1a1a1e" />
            <path d="M10,28 Q10,26 14,26 L66,26 Q70,26 70,28 Q70,31 66,31 L14,31 Q10,31 10,28 Z" fill="#1a1a1e" />
            <rect x="18" y="12" width="44" height="16" rx="5" fill="#1a1a1e" />
            {/* Gold trim */}
            <rect x="14" y="27" width="52" height="3" rx="1" fill="#DAA520" />
            <rect x="18" y="24" width="44" height="2" rx="1" fill="#DAA520" opacity="0.5" />
            {/* Skull emblem */}
            <circle cx="40" cy="19" r="4" fill="#DAA520" opacity="0.6" />
            <circle cx="38" cy="18" r="1" fill="#1a1a1e" />
            <circle cx="42" cy="18" r="1" fill="#1a1a1e" />
            {/* Feather */}
            <path d="M58,14 Q65,6 68,2 Q66,8 62,12 Q60,10 58,14 Z" fill="#cc2222" opacity="0.9" />
            <path d="M58,14 Q62,12 68,2" fill="none" stroke="#aa1111" strokeWidth="0.5" />
            {/* Captain label */}
            <text x="40" y="9" textAnchor="middle" fill="#DAA520" fontSize="6" fontWeight="700" fontFamily="inherit">CAPTAIN</text>
          </>
        ) : (
          <>
            <path d="M18,30 L40,18 L62,30 Z" fill="#1a1a1e" />
            <path d="M16,30 Q16,28 20,28 L60,28 Q64,28 64,30 Q64,32 60,32 L20,32 Q16,32 16,30 Z" fill="#1a1a1e" />
            <rect x="22" y="18" width="36" height="12" rx="4" fill="#1a1a1e" />
            <rect x="24" y="29" width="32" height="3" rx="1" fill={color} />
            <circle cx="40" cy="22" r="3" fill="rgba(255,255,255,0.15)" />
          </>
        )}

        {/* Label */}
        <text x="40" y="139" textAnchor="middle" fill="white" fontSize="9" fontWeight="600" opacity="0.6" fontFamily="inherit">P{index + 1}</text>
      </svg>
    </div>
  )
}

function Shark({ idx }) {
  return (
    <div className={`shark shark-${idx}`}>
      <svg viewBox="0 0 100 50" className="shark-svg">
        <defs>
          <linearGradient id={`sharkG${idx}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a4855" />
            <stop offset="100%" stopColor="#2a3845" />
          </linearGradient>
        </defs>
        {/* Body */}
        <path d="M5,28 Q10,18 30,20 L45,20 Q70,18 90,24 Q95,26 90,28 Q70,32 45,30 L30,30 Q10,32 5,28 Z" fill={`url(#sharkG${idx})`} />
        {/* Dorsal fin */}
        <path d="M40,20 Q42,4 50,6 Q52,12 52,20" fill="#3a4855" />
        {/* Tail */}
        <path d="M5,28 Q0,22 2,16 Q5,20 8,24" fill="#3a4855" />
        <path d="M5,28 Q0,34 3,38 Q6,34 8,30" fill="#3a4855" />
        {/* Belly */}
        <path d="M15,28 Q50,34 85,26" fill="none" stroke="#5a6875" strokeWidth="0.8" />
        {/* Eye */}
        <circle cx="80" cy="23" r="2" fill="#111" />
        <circle cx="80.8" cy="22.5" r="0.6" fill="#444" />
        {/* Gill slits */}
        <line x1="72" y1="22" x2="72" y2="27" stroke="#2a3540" strokeWidth="0.6" />
        <line x1="69" y1="22" x2="69" y2="27" stroke="#2a3540" strokeWidth="0.6" />
        <line x1="66" y1="22.5" x2="66" y2="26.5" stroke="#2a3540" strokeWidth="0.6" />
        {/* Pectoral fin */}
        <path d="M60,28 Q55,36 48,38 Q52,32 58,28" fill="#3a4855" />
      </svg>
    </div>
  )
}

function TreasureChest() {
  return (
    <div className="chest">
      <svg viewBox="0 0 60 50" className="chest-svg">
        <defs>
          <linearGradient id="chestWood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6a3a1a" />
            <stop offset="100%" stopColor="#4a2810" />
          </linearGradient>
          <linearGradient id="chestLid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8a5a2e" />
            <stop offset="100%" stopColor="#6a3a1a" />
          </linearGradient>
        </defs>
        {/* Shadow */}
        <ellipse cx="30" cy="48" rx="24" ry="3" fill="rgba(0,0,0,0.15)" />
        {/* Base */}
        <rect x="4" y="22" width="52" height="24" rx="3" fill="url(#chestWood)" stroke="#3a1a08" strokeWidth="1" />
        {/* Lid */}
        <path d="M4,22 Q4,6 30,6 Q56,6 56,22 Z" fill="url(#chestLid)" stroke="#5a2a10" strokeWidth="1" />
        {/* Bands */}
        <rect x="16" y="4" width="3.5" height="42" rx="1" fill="#DAA520" opacity="0.75" />
        <rect x="40" y="4" width="3.5" height="42" rx="1" fill="#DAA520" opacity="0.75" />
        {/* Lock plate */}
        <rect x="24" y="18" width="12" height="12" rx="2" fill="#B8941A" />
        <circle cx="30" cy="24" r="3" fill="#DAA520" />
        <rect x="29" y="24" width="2" height="5" rx="0.5" fill="#9a7a10" />
        {/* Coins */}
        <ellipse cx="14" cy="10" rx="5" ry="2.5" fill="#FFD700" opacity="0.9" />
        <ellipse cx="24" cy="7" rx="5" ry="2.5" fill="#FFC800" opacity="0.85" />
        <ellipse cx="36" cy="8" rx="5" ry="2.5" fill="#FFD700" opacity="0.9" />
        <ellipse cx="46" cy="11" rx="5" ry="2.5" fill="#FFCA00" opacity="0.85" />
        <ellipse cx="30" cy="4" rx="4" ry="2" fill="#FFE040" />
        {/* Sparkle */}
        <circle cx="18" cy="8" r="1" fill="white" opacity="0.5" />
        <circle cx="42" cy="9" r="0.8" fill="white" opacity="0.4" />
      </svg>
    </div>
  )
}

export default function PirateScene({ pirateCount, captainIndex, voteResults, plankIndex }) {
  const { themeKey } = useTheme()

  const pirates = useMemo(() =>
    Array.from({ length: pirateCount }, (_, i) => (
      <Pirate
        key={i}
        index={i}
        isCaptain={i === captainIndex}
        voteState={voteResults ? (voteResults[i] ? 'yes' : 'no') : null}
        walkingPlank={plankIndex === i}
      />
    )),
  [pirateCount, captainIndex, voteResults, plankIndex])

  return (
    <div className={`scene-2d theme-${themeKey}`}>
      {/* Sky */}
      <div className="sky" />

      {/* Stars (visible in dark themes) */}
      <div className="stars">
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} className="star" style={{
            left: `${5 + (i * 37) % 90}%`, top: `${3 + (i * 23) % 40}%`,
            animationDelay: `${i * 0.3}s`, width: `${1 + i % 3}px`, height: `${1 + i % 3}px`,
          }} />
        ))}
      </div>

      {/* Sun/Moon */}
      <div className="celestial" />

      {/* Clouds */}
      <div className="cloud cloud-1"><svg viewBox="0 0 200 60"><path d="M20,50 Q20,30 50,30 Q55,10 80,15 Q100,5 120,15 Q145,10 155,25 Q180,25 180,50 Z" fill="currentColor" /></svg></div>
      <div className="cloud cloud-2"><svg viewBox="0 0 160 50"><path d="M10,40 Q15,25 40,25 Q45,10 70,15 Q90,8 105,18 Q125,15 135,28 Q150,28 150,40 Z" fill="currentColor" /></svg></div>
      <div className="cloud cloud-3"><svg viewBox="0 0 180 55"><path d="M15,45 Q20,28 45,30 Q55,12 80,18 Q100,6 115,16 Q140,12 150,28 Q168,25 168,45 Z" fill="currentColor" /></svg></div>

      {/* Ocean body */}
      <div className="ocean-body" />

      {/* Far waves */}
      <svg className="wave wave-far" viewBox="0 0 2880 120" preserveAspectRatio="none">
        <path d="M0,40 C120,80 240,10 360,50 C480,90 600,20 720,60 C840,100 960,25 1080,55 C1200,85 1320,15 1440,50 C1560,85 1680,15 1800,55 C1920,90 2040,20 2160,60 C2280,95 2400,25 2520,55 C2640,80 2760,20 2880,50 L2880,120 L0,120Z" fill="var(--wave-far)" />
      </svg>

      {/* Sharks */}
      <Shark idx={0} />
      <Shark idx={1} />
      <Shark idx={2} />

      {/* Mid waves */}
      <svg className="wave wave-mid" viewBox="0 0 2880 120" preserveAspectRatio="none">
        <path d="M0,55 C150,20 300,80 450,40 C600,0 750,70 900,35 C1050,0 1200,75 1350,40 C1500,5 1650,70 1800,30 C1950,0 2100,65 2250,35 C2400,5 2550,70 2700,40 C2800,15 2850,50 2880,45 L2880,120 L0,120Z" fill="var(--wave-mid)" />
      </svg>

      {/* Raft + Pirates */}
      <div className="raft-layer">
        <div className="raft">
          <svg viewBox="0 0 400 100" className="raft-svg">
            <defs>
              <linearGradient id="plankL" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8a5a2e" />
                <stop offset="100%" stopColor="#6a3e1e" />
              </linearGradient>
              <linearGradient id="plankD" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6a3e1e" />
                <stop offset="100%" stopColor="#4a2810" />
              </linearGradient>
              <linearGradient id="raftSide" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5a3418" />
                <stop offset="100%" stopColor="#2a1808" />
              </linearGradient>
            </defs>

            {/* Side of raft — visible face giving depth */}
            <path d="M5,55 L5,72 Q5,76 10,76 L390,76 Q395,76 395,72 L395,55" fill="url(#raftSide)" />
            {/* Side plank lines */}
            {Array.from({ length: 12 }).map((_, i) => (
              <line key={`sl${i}`} x1={10 + i * 33} y1={55} x2={10 + i * 33} y2={76} stroke="rgba(0,0,0,0.12)" strokeWidth="0.6" />
            ))}
            {/* Side cross beam */}
            <rect x="3" y="62" width="394" height="5" rx="1" fill="#3a1a08" opacity="0.5" />

            {/* Top surface — planks */}
            {Array.from({ length: 12 }).map((_, i) => (
              <g key={i}>
                <rect x={i * 33 + 2} y={10} width="31" height="46" rx="2"
                  fill={i % 2 === 0 ? 'url(#plankD)' : 'url(#plankL)'} stroke="#3a1a08" strokeWidth="0.4" />
                <line x1={i * 33 + 8} y1={14} x2={i * 33 + 8} y2={52} stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" />
                <line x1={i * 33 + 18} y1={12} x2={i * 33 + 18} y2={54} stroke="rgba(0,0,0,0.05)" strokeWidth="0.5" />
                <line x1={i * 33 + 26} y1={13} x2={i * 33 + 26} y2={53} stroke="rgba(0,0,0,0.04)" strokeWidth="0.5" />
              </g>
            ))}
            {/* Cross beams */}
            <rect x="0" y="7" width="400" height="5" rx="1.5" fill="#4a2810" />
            <rect x="0" y="53" width="400" height="5" rx="1.5" fill="#4a2810" />
            {/* Ropes */}
            <circle cx="35" cy="10" r="5.5" fill="none" stroke="#8a7a5a" strokeWidth="2.5" />
            <circle cx="200" cy="10" r="5.5" fill="none" stroke="#8a7a5a" strokeWidth="2.5" />
            <circle cx="365" cy="10" r="5.5" fill="none" stroke="#8a7a5a" strokeWidth="2.5" />
            {/* Water line at base */}
            <path d="M0,76 Q20,72 40,76 Q60,80 80,76 Q100,72 120,76 Q140,80 160,76 Q180,72 200,76 Q220,80 240,76 Q260,72 280,76 Q300,80 320,76 Q340,72 360,76 Q380,80 400,76" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
          </svg>

          <div className="mast">
            <div className="mast-pole" />
            <div className="flag">
              <svg viewBox="0 0 70 46" className="flag-svg">
                <rect width="70" height="46" fill="#111" rx="2" />
                <circle cx="35" cy="16" r="8" fill="#ddd" />
                <circle cx="31" cy="14.5" r="2" fill="#111" />
                <circle cx="39" cy="14.5" r="2" fill="#111" />
                <rect x="33" y="19" width="4" height="3" rx="1" fill="#111" />
                <line x1="20" y1="30" x2="50" y2="40" stroke="#ddd" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="50" y1="30" x2="20" y2="40" stroke="#ddd" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <TreasureChest />

          <div className="pirates-row">
            {pirates}
          </div>
        </div>
      </div>

      {/* Near waves */}
      <svg className="wave wave-near" viewBox="0 0 2880 120" preserveAspectRatio="none">
        <path d="M0,35 C100,70 200,10 360,50 C520,90 680,15 840,55 C1000,95 1160,20 1320,60 C1480,100 1640,20 1800,55 C1960,85 2120,15 2280,50 C2440,80 2600,25 2760,55 C2820,65 2860,40 2880,45 L2880,120 L0,120Z" fill="var(--wave-near)" />
      </svg>

      {/* Front wave with foam */}
      <svg className="wave wave-front" viewBox="0 0 2880 110" preserveAspectRatio="none">
        <path d="M0,25 C140,60 280,5 420,40 C560,75 700,10 840,45 C980,80 1120,12 1260,48 C1400,82 1540,15 1680,45 C1820,75 1960,10 2100,42 C2240,74 2380,12 2520,45 C2660,72 2780,20 2880,35 L2880,110 L0,110Z" fill="var(--wave-front)" />
        {/* Foam highlights */}
        <path d="M0,25 C140,60 280,5 420,40 C560,75 700,10 840,45 C980,80 1120,12 1260,48 C1400,82 1540,15 1680,45 C1820,75 1960,10 2100,42 C2240,74 2380,12 2520,45 C2660,72 2780,20 2880,35" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
      </svg>
    </div>
  )
}
