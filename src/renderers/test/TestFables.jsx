import { useState, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import './TestFables.css'

const ROUNDS = [
  {
    num: 1, elo: 900,
    statements: [
      { name: 'PIETRO', text: 'I AM TELLING THE TRUTH.' },
      { name: 'WOOKHO', text: 'PIETRO IS TELLING THE TRUTH.' },
      { name: 'ROHAN', text: 'WOOKHO IS THE LIAR.' },
    ],
    liar: 2,
    explanation: 'ROHAN IS THE LIAR. WOOKHO BACKS PIETRO, PIETRO BACKS HIMSELF — ROHAN FALSELY ACCUSES WOOKHO.',
  },
  {
    num: 2, elo: 1200,
    statements: [
      { name: 'PIETRO', text: 'ROHAN IS TELLING THE TRUTH.' },
      { name: 'WOOKHO', text: 'PIETRO IS THE LIAR.' },
      { name: 'ROHAN', text: 'WOOKHO IS THE LIAR.' },
    ],
    liar: 1,
    explanation: 'WOOKHO IS THE LIAR. PIETRO AND ROHAN BACK EACH OTHER UP. WOOKHO CLAIMS PIETRO IS THE LIAR, BUT THAT WOULD MAKE TWO LIARS.',
  },
  {
    num: 3, elo: 1500,
    statements: [
      { name: 'PIETRO', text: 'EXACTLY TWO OF US ARE TELLING THE TRUTH.' },
      { name: 'WOOKHO', text: 'PIETRO IS TELLING THE TRUTH.' },
      { name: 'ROHAN', text: 'WOOKHO IS THE LIAR.' },
    ],
    liar: 2,
    explanation: 'ROHAN IS THE LIAR. WOOKHO BACKS PIETRO, AND PIETRO\'S COUNT OF "EXACTLY TWO" ONLY WORKS WITH ROHAN AS THE LIAR.',
  },
  {
    num: 4, elo: 1800,
    statements: [
      { name: 'PIETRO', text: 'EXACTLY ONE OF WOOKHO AND ROHAN IS TELLING THE TRUTH.' },
      { name: 'WOOKHO', text: 'ROHAN IS THE LIAR.' },
      { name: 'ROHAN', text: 'PIETRO IS NOT THE LIAR.' },
    ],
    liar: 1,
    explanation: 'WOOKHO IS THE LIAR. ROHAN SAYS PIETRO IS TRUTHFUL. PIETRO SAYS EXACTLY ONE OF WOOKHO/ROHAN IS TRUTHFUL — ONLY ROHAN IS.',
  },
]

const CHAR_NAMES = ['PIETRO', 'WOOKHO', 'ROHAN']

function createForestScene(container) {
  const isMobile = container.clientWidth < 500
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x040808)
  scene.fog = new THREE.FogExp2(0x040a06, isMobile ? 0.005 : 0.012)
  const camera = new THREE.PerspectiveCamera(isMobile ? 75 : 50, container.clientWidth / container.clientHeight, 0.1, 500)
  camera.position.set(0, isMobile ? 70 : 35, isMobile ? 90 : 55)
  camera.lookAt(0, isMobile ? 0 : 2, isMobile ? -10 : -5)

  const renderer = new THREE.WebGLRenderer({ antialias: false })
  renderer.setPixelRatio(1)
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.BasicShadowMap

  // Lighting
  scene.add(new THREE.AmbientLight(0x1a2a1e, 3.5))
  const moon = new THREE.DirectionalLight(0x8899bb, 4.0)
  moon.position.set(-30, 80, 20); moon.castShadow = true
  moon.shadow.mapSize.set(2048, 2048)
  moon.shadow.camera.left = -80; moon.shadow.camera.right = 80
  moon.shadow.camera.top = 80; moon.shadow.camera.bottom = -80
  scene.add(moon)
  const front = new THREE.DirectionalLight(0xaabbcc, 4.0)
  front.position.set(0, 25, 60); scene.add(front)

  // Ground
  const groundCanvas = document.createElement('canvas')
  groundCanvas.width = 256; groundCanvas.height = 256
  const gCtx = groundCanvas.getContext('2d')
  gCtx.fillStyle = '#0a1a08'; gCtx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 300; i++) {
    gCtx.fillStyle = Math.random() > 0.5 ? '#0e2a0a' : '#122e0e'
    gCtx.fillRect(Math.floor(Math.random() * 64) * 4, Math.floor(Math.random() * 64) * 4, 4 + Math.floor(Math.random() * 3) * 4, 4)
  }
  for (let i = 0; i < 40; i++) {
    gCtx.fillStyle = Math.random() > 0.5 ? '#1a1208' : '#141008'
    gCtx.fillRect(Math.floor(Math.random() * 64) * 4, Math.floor(Math.random() * 64) * 4, 8 + Math.random() * 12, 8)
  }
  const groundTex = new THREE.CanvasTexture(groundCanvas)
  groundTex.wrapS = THREE.RepeatWrapping; groundTex.wrapT = THREE.RepeatWrapping
  groundTex.repeat.set(20, 20); groundTex.minFilter = THREE.NearestFilter; groundTex.magFilter = THREE.NearestFilter
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300, 8, 8), new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95, flatShading: true }))
  ground.rotation.x = -Math.PI / 2; ground.position.y = -1; ground.receiveShadow = true; scene.add(ground)

  // Trees
  const bark = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.9, flatShading: true })
  const leafs = [
    new THREE.MeshStandardMaterial({ color: 0x0c3a0c, roughness: 0.8, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x082a08, roughness: 0.85, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x104010, roughness: 0.75, flatShading: true }),
  ]
  ;[[-48,-20,30,7],[-32,-16,35,9],[16,-20,32,8],[32,-16,38,10],[48,-25,26,7],
    [-44,-40,36,9],[0,-36,30,7],[44,-40,34,8],[-58,-10,22,5],[58,-10,24,6],
    [-52,-30,32,8],[52,-30,28,7],[-10,-45,40,10],[10,-45,35,9],
    [-62,-38,27,6],[62,-38,30,7],[-40,-25,28,7],[40,-25,26,6],
  ].forEach(([x,z,h,r]) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(r*0.3, r*0.6, h, 6), bark)
    trunk.position.set(x, h/2-1, z); trunk.castShadow = true; scene.add(trunk)
    for (let c = 0; c < 4; c++) {
      const s = r * (0.5 + Math.random() * 0.6)
      const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 1), leafs[Math.floor(Math.random()*3)])
      leaf.position.set(x + (Math.random()-0.5)*r, h*0.65+Math.random()*4, z + (Math.random()-0.5)*r)
      leaf.castShadow = true; scene.add(leaf)
    }
  })

  // Platforms
  const platMat = new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.85, flatShading: true })
  const platTop = new THREE.MeshStandardMaterial({ color: 0x4a3a22, roughness: 0.8, flatShading: true })
  const plats = [{ x: -28, z: 5, h: 2 }, { x: 0, z: 0, h: 3 }, { x: 28, z: 5, h: 1.5 }]
  plats.forEach(p => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, p.h, 6), platMat)
    pillar.position.set(p.x, p.h/2-1, p.z); pillar.castShadow = true; scene.add(pillar)
    const top = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.5, 0.8, 6), platTop)
    top.position.set(p.x, p.h-0.6, p.z); scene.add(top)
  })

  // Campfire
  const fireGroup = new THREE.Group(); fireGroup.position.set(0, -0.5, 22)
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.9, flatShading: true })
  for (let i = 0; i < 8; i++) {
    const a = (i/8)*Math.PI*2
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 0), stoneMat)
    stone.position.set(Math.cos(a)*3.5, 0.3, Math.sin(a)*3.5); stone.rotation.set(Math.random(),Math.random(),Math.random())
    fireGroup.add(stone)
  }
  const logMat = new THREE.MeshStandardMaterial({ color: 0x2a1808, roughness: 0.9, flatShading: true })
  const l1 = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.6,5,5), logMat); l1.rotation.z=Math.PI/2; l1.position.y=0.5; fireGroup.add(l1)
  const l2 = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.5,4,5), logMat); l2.rotation.z=Math.PI/2; l2.rotation.y=1.2; l2.position.y=0.8; fireGroup.add(l2)

  const coreColors = [0xff2200,0xff4400,0xff6600,0xff8800,0xffaa00,0xffcc22,0xffee55]
  const flames = []
  for (let i = 0; i < 8; i++) {
    const h = 3+Math.random()*5, r = 0.8+Math.random()*0.6
    const mat = new THREE.MeshBasicMaterial({ color: coreColors[Math.min(Math.floor(i/1.2),6)], transparent: true, opacity: 0.75 })
    const f = new THREE.Mesh(new THREE.ConeGeometry(r,h,4), mat)
    f.position.set((Math.random()-0.5)*1.8, h/2+0.5, (Math.random()-0.5)*1.8)
    f.userData = { baseY: f.position.y, baseX: f.position.x, baseZ: f.position.z, phase: Math.random()*Math.PI*2 }
    fireGroup.add(f); flames.push(f)
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(1.2,4,4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }))
  core.position.y = 2; core.userData = { baseY: 2, phase: 0 }; fireGroup.add(core); flames.push(core)
  const embers = []
  for (let i = 0; i < 20; i++) {
    const em = new THREE.Mesh(new THREE.BoxGeometry(0.25,0.25,0.25), new THREE.MeshBasicMaterial({ color: Math.random()>0.3?0xff6600:0xffcc00, transparent: true, opacity: 0.8 }))
    em.position.set((Math.random()-0.5)*3, 2+Math.random()*10, (Math.random()-0.5)*3)
    em.userData = { speed: 0.02+Math.random()*0.04, drift: (Math.random()-0.5)*0.02, phase: Math.random()*Math.PI*2 }
    fireGroup.add(em); embers.push(em)
  }
  const fl1 = new THREE.PointLight(0xff5511, 20, 70); fl1.position.set(0,5,0); fireGroup.add(fl1)
  const fl2 = new THREE.PointLight(0xffaa33, 12, 50); fl2.position.set(0,9,0); fireGroup.add(fl2)
  scene.add(fireGroup)

  // Characters
  const loader = new GLTFLoader()
  const mixers = []
  const charData = [
    { file: 'pietro.glb', x: -28, z: 5, platformH: 2, rotY: 0.4, rotX: -0.15 },
    { file: 'wookho.glb', x: 0, z: 0, platformH: 3, rotY: 0, rotX: -0.2 },
    { file: 'rohan.glb', x: 28, z: 5, platformH: 1.5, rotY: -0.4, rotX: -0.15 },
  ]
  const charModels = [null, null, null]

  charData.forEach((char, idx) => {
    loader.load(`/models/${char.file}`, (gltf) => {
      const model = gltf.scene
      model.scale.setScalar(8)
      model.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = false } })
      const box = new THREE.Box3().setFromObject(model)
      model.position.set(char.x, char.platformH - 0.2 - box.min.y, char.z)
      model.rotation.y = char.rotY || 0; model.rotation.x = char.rotX || 0
      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(model)
        const idle = gltf.animations.find(a => a.name === 'Idle') || gltf.animations[0]
        if (idle) mixer.clipAction(idle).play()
        mixers.push(mixer)
      }
      scene.add(model)
      charModels[idx] = model
    })
  })

  // Fireflies
  const partGeo = new THREE.BufferGeometry()
  const partPos = new Float32Array(40 * 3)
  for (let i = 0; i < 40; i++) { partPos[i*3]=(Math.random()-0.5)*100; partPos[i*3+1]=5+Math.random()*30; partPos[i*3+2]=(Math.random()-0.5)*80-10 }
  partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3))
  const parts = new THREE.Points(partGeo, new THREE.PointsMaterial({ color: 0x44ff66, size: 0.8, transparent: true, opacity: 0.6, depthWrite: false }))
  scene.add(parts)

  let animId
  function animate() {
    animId = requestAnimationFrame(animate)
    const time = performance.now() * 0.001
    mixers.forEach(m => m.update(1/60))
    // Fireflies
    const pp = parts.geometry.attributes.position
    for (let i = 0; i < 40; i++) { pp.array[i*3]+=Math.sin(time*0.5+i*1.3)*0.02; pp.array[i*3+1]+=Math.cos(time*0.3+i*0.7)*0.015 }
    pp.needsUpdate = true; parts.material.opacity = 0.3+Math.sin(time*2)*0.3
    // Fire
    flames.forEach(f => {
      const p = f.userData.phase||0
      f.position.y = (f.userData.baseY||4)+Math.sin(time*2+p)*0.15
      if (f.userData.baseX!==undefined) f.position.x = f.userData.baseX+Math.sin(time*1.2+p*2)*0.12
      f.scale.x = 0.85+Math.sin(time*2.5+p)*0.12; f.scale.y = 0.9+Math.sin(time*3+p)*0.1
    })
    embers.forEach(e => {
      e.position.y += e.userData.speed*0.5; e.position.x += e.userData.drift*0.3
      e.material.opacity = Math.max(0, 0.8-(e.position.y-2)*0.05)
      if (e.position.y>16) { e.position.set((Math.random()-0.5)*2, 1.5+Math.random()*2, (Math.random()-0.5)*2); e.material.opacity=0.8 }
    })
    fl1.intensity = 18+Math.sin(time*3)*2; fl2.intensity = 10+Math.sin(time*2.5)*1.5
    renderer.render(scene, camera)
  }
  animate()

  function handleResize() { camera.aspect = container.clientWidth/container.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(container.clientWidth, container.clientHeight) }
  window.addEventListener('resize', handleResize)

  return {
    renderer, charModels,
    getScreenPos(idx) {
      if (!charModels[idx]) return null
      const box = new THREE.Box3().setFromObject(charModels[idx])
      const feet = new THREE.Vector3((box.max.x+box.min.x)/2, box.min.y - 2, (box.max.z+box.min.z)/2)
      feet.project(camera)
      return { x: (feet.x*0.5+0.5)*container.clientWidth, y: (-feet.y*0.5+0.5)*container.clientHeight }
    },
    dispose() { cancelAnimationFrame(animId); window.removeEventListener('resize', handleResize); renderer.dispose() }
  }
}

export default function TestFables({ onRoundResult, skipIntro, startRound: startRoundProp }) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const [phase, setPhase] = useState(skipIntro ? 'playing' : 'start') // start | playing | result | gameover | win
  const calledBack = useRef(false)
  const [round, setRound] = useState(startRoundProp || 0)
  const [selected, setSelected] = useState(null)
  const [result, setResult] = useState(null) // 'correct' | 'wrong'
  const [charPositions, setCharPositions] = useState([null, null, null])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const s = createForestScene(container)
    container.appendChild(s.renderer.domElement)
    sceneRef.current = s
    // Capture character screen positions once loaded
    const interval = setInterval(() => {
      const positions = [s.getScreenPos(0), s.getScreenPos(1), s.getScreenPos(2)]
      if (positions.every(Boolean)) { setCharPositions(positions); clearInterval(interval) }
    }, 500)
    return () => { clearInterval(interval); s.dispose(); if (container.contains(s.renderer.domElement)) container.removeChild(s.renderer.domElement) }
  }, [])

  function handleStart() { setRound(0); setPhase('playing'); setSelected(null); setResult(null) }

  function handleAccuse(charIdx) {
    if (phase !== 'playing' || selected !== null) return
    setSelected(charIdx)
    const isCorrect = charIdx === ROUNDS[round].liar
    setResult(isCorrect ? 'correct' : 'wrong')
    setPhase('result')
    if (onRoundResult && !calledBack.current) {
      calledBack.current = true
      setTimeout(() => onRoundResult(isCorrect, round), 800)
    }
  }

  function handleNext() {
    if (result === 'wrong') { setPhase('gameover'); return }
    if (round + 1 >= ROUNDS.length) { setPhase('win'); return }
    setRound(round + 1); setSelected(null); setResult(null); setPhase('playing')
  }

  const currentRound = ROUNDS[round]

  return (
    <div className="fb-wrapper">
      <div className="fb-scanlines" />
      <div className="fb-title">
        <span className="fb-title-line">TWO TRUTHS AND A LIE</span>
      </div>
      <div ref={containerRef} className="fb-canvas" />

      {/* Start screen */}
      {phase === 'start' && (
        <div className="fb-overlay">
          <div className="fb-start-box">
            <div className="fb-start-heading">TWO TRUTHS AND A LIE</div>
            <div className="fb-start-rules">
              <p>THREE FRIENDS. THREE STATEMENTS.</p>
              <p>ONE IS LYING. FIND THE LIAR.</p>
              <p>ONE WRONG GUESS AND IT'S OVER.</p>
            </div>
            <button className="fb-btn" onClick={handleStart}>START</button>
          </div>
        </div>
      )}

      {/* Game UI */}
      {(phase === 'playing' || phase === 'result') && currentRound && (
        <>
          {/* Round info */}
          <div className="fb-round-info">
            <div className="fb-round-num">ROUND {currentRound.num}</div>
          </div>

          {/* Speech bubbles above characters */}
          {currentRound.statements.map((stmt, i) => {
            const pos = charPositions[i]
            if (!pos) return null
            let cls = 'fb-speech'
            if (phase === 'result' && i === currentRound.liar) cls += ' liar'
            if (phase === 'result' && selected === i && result === 'wrong') cls += ' wrong-pick'
            if (phase === 'result' && i !== currentRound.liar && selected !== i) cls += ' truthful'
            const offsetX = i === 0 ? -40 : i === 2 ? 40 : 0
            const rawLeft = pos.x + offsetX
            const clampedLeft = Math.max(60, Math.min(rawLeft, window.innerWidth - 60))
            return (
              <div key={i} className={cls} style={{ left: clampedLeft, top: pos.y }}>
                <div className="fb-speech-name">{stmt.name}</div>
                <div className="fb-speech-text">{stmt.text}</div>
                {phase === 'playing' && (
                  <button className="fb-accuse-btn" onClick={() => handleAccuse(i)}>ACCUSE</button>
                )}
              </div>
            )
          })}

          {/* Result — only show renderer's own UI when not in test mode */}
          {phase === 'result' && !onRoundResult && (
            <div className="fb-result-bar">
              <div className={`fb-result-text ${result}`}>
                {result === 'correct' ? 'CORRECT' : 'INCORRECT'}
              </div>
              <button className="fb-btn" onClick={handleNext}>
                {result === 'correct' ? (round + 1 >= ROUNDS.length ? 'FINISH' : 'NEXT ROUND') : 'CONTINUE'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Game over — hide in test mode */}
      {phase === 'gameover' && !onRoundResult && (
        <div className="fb-overlay">
          <div className="fb-start-box">
            <div className="fb-start-heading">GAME OVER</div>
            <div className="fb-start-rules"><p>YOU MADE IT TO ROUND {round + 1} OF {ROUNDS.length}.</p></div>
            <button className="fb-btn" onClick={handleStart}>RETRY</button>
          </div>
        </div>
      )}

      {/* Win — hide in test mode */}
      {phase === 'win' && !onRoundResult && (
        <div className="fb-overlay">
          <div className="fb-start-box">
            <div className="fb-start-heading">YOU WIN</div>
            <div className="fb-start-rules"><p>ALL {ROUNDS.length} LIARS CAUGHT.</p></div>
            <button className="fb-btn" onClick={handleStart}>PLAY AGAIN</button>
          </div>
        </div>
      )}
    </div>
  )
}
