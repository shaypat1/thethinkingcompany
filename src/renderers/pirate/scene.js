import * as THREE from 'three'

const WOOD_COLOR = 0x8B5E3C
const WOOD_DARK = 0x5C3A1E
const OCEAN_COLOR = 0x1a7090
const GOLD_COLOR = 0xDAA520
const ROPE_COLOR = 0x8a7a5a

export function createScene(container) {
  const scene = new THREE.Scene()

  // Sky-to-ocean gradient background
  const bgCanvas = document.createElement('canvas')
  bgCanvas.width = 1
  bgCanvas.height = 512
  const bgCtx = bgCanvas.getContext('2d')
  const grad = bgCtx.createLinearGradient(0, 0, 0, 512)
  grad.addColorStop(0, '#1a3050')
  grad.addColorStop(0.3, '#1a5570')
  grad.addColorStop(0.5, '#1a7090')
  grad.addColorStop(1, '#0d4060')
  bgCtx.fillStyle = grad
  bgCtx.fillRect(0, 0, 1, 512)
  scene.background = new THREE.CanvasTexture(bgCanvas)

  // Camera — top-down angled view looking at raft
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 200)
  camera.position.set(0, 7, 10)
  camera.lookAt(0, 0, -0.5)

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.3

  // Lighting
  const hemiLight = new THREE.HemisphereLight(0x88bbdd, 0x225566, 0.8)
  scene.add(hemiLight)

  const sun = new THREE.DirectionalLight(0xffeedd, 1.5)
  sun.position.set(5, 12, 8)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.near = 0.5
  sun.shadow.camera.far = 30
  sun.shadow.camera.left = -8
  sun.shadow.camera.right = 8
  sun.shadow.camera.top = 8
  sun.shadow.camera.bottom = -8
  scene.add(sun)

  const fill = new THREE.DirectionalLight(0x6688aa, 0.4)
  fill.position.set(-5, 5, -3)
  scene.add(fill)

  // === OCEAN — visible, animated, bright ===
  const oceanGeo = new THREE.PlaneGeometry(60, 60, 50, 50)
  const oceanMat = new THREE.MeshStandardMaterial({
    color: OCEAN_COLOR,
    roughness: 0.2,
    metalness: 0.15,
    emissive: 0x0a3050,
    emissiveIntensity: 0.3,
  })
  const ocean = new THREE.Mesh(oceanGeo, oceanMat)
  ocean.rotation.x = -Math.PI / 2
  ocean.position.y = -0.35
  ocean.receiveShadow = true
  scene.add(ocean)

  // === RAFT — flat wooden platform the pirates stand on ===
  const raftGroup = new THREE.Group()

  // Main planks
  const plankMat = new THREE.MeshStandardMaterial({ color: WOOD_COLOR, roughness: 0.85 })
  const plankDarkMat = new THREE.MeshStandardMaterial({ color: WOOD_DARK, roughness: 0.85 })
  for (let i = -3; i <= 3; i++) {
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.08, 5.5),
      i % 2 === 0 ? plankMat : plankDarkMat
    )
    plank.position.set(i * 0.72, 0, 0)
    plank.receiveShadow = true
    plank.castShadow = true
    raftGroup.add(plank)
  }

  // Cross beams underneath
  for (const z of [-2, 0, 2]) {
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 0.1, 0.25),
      plankDarkMat
    )
    beam.position.set(0, -0.08, z)
    raftGroup.add(beam)
  }

  // Rope wrappings at crossbeams
  const ropeMat = new THREE.MeshStandardMaterial({ color: ROPE_COLOR, roughness: 0.9 })
  for (const x of [-2.3, 2.3]) {
    for (const z of [-2, 0, 2]) {
      const rope = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 8), ropeMat)
      rope.position.set(x, 0.02, z)
      rope.rotation.x = Math.PI / 2
      raftGroup.add(rope)
    }
  }

  // Small mast with tattered flag
  const mastMat = new THREE.MeshStandardMaterial({ color: WOOD_DARK, roughness: 0.8 })
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3, 6), mastMat)
  mast.position.set(-2, 1.5, -2)
  mast.castShadow = true
  raftGroup.add(mast)

  // Flag
  const flagCanvas = document.createElement('canvas')
  flagCanvas.width = 128
  flagCanvas.height = 86
  const fctx = flagCanvas.getContext('2d')
  fctx.fillStyle = '#222'
  fctx.fillRect(0, 0, 128, 86)
  // Skull
  fctx.fillStyle = '#ddd'
  fctx.beginPath()
  fctx.arc(64, 32, 16, 0, Math.PI * 2)
  fctx.fill()
  fctx.fillStyle = '#222'
  fctx.beginPath(); fctx.arc(58, 30, 4, 0, Math.PI * 2); fctx.fill()
  fctx.beginPath(); fctx.arc(70, 30, 4, 0, Math.PI * 2); fctx.fill()
  fctx.fillRect(60, 38, 8, 3)
  fctx.strokeStyle = '#ddd'
  fctx.lineWidth = 4
  fctx.lineCap = 'round'
  fctx.beginPath(); fctx.moveTo(40, 55); fctx.lineTo(88, 70); fctx.stroke()
  fctx.beginPath(); fctx.moveTo(88, 55); fctx.lineTo(40, 70); fctx.stroke()

  const flagGeo = new THREE.PlaneGeometry(1, 0.67, 8, 4)
  const flagMat = new THREE.MeshStandardMaterial({
    map: new THREE.CanvasTexture(flagCanvas),
    side: THREE.DoubleSide,
    roughness: 0.9,
  })
  const flag = new THREE.Mesh(flagGeo, flagMat)
  flag.position.set(-1.45, 2.7, -2)
  raftGroup.add(flag)

  raftGroup.position.y = 0
  scene.add(raftGroup)

  // === TREASURE CHEST — center of raft, clearly visible ===
  const chestGroup = new THREE.Group()
  const chestMat = new THREE.MeshStandardMaterial({ color: WOOD_DARK, roughness: 0.5 })
  const chestBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, 0.55), chestMat)
  chestBase.position.y = 0.225
  chestBase.castShadow = true
  chestGroup.add(chestBase)
  const lidGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.82, 8, 1, false, 0, Math.PI)
  const lid = new THREE.Mesh(lidGeo, new THREE.MeshStandardMaterial({ color: WOOD_COLOR, roughness: 0.5 }))
  lid.rotation.z = Math.PI / 2
  lid.rotation.y = Math.PI / 2
  lid.position.set(0, 0.45, 0)
  chestGroup.add(lid)
  // Gold bands
  const bandMat = new THREE.MeshStandardMaterial({ color: GOLD_COLOR, metalness: 0.8, roughness: 0.15 })
  for (const x of [-0.22, 0, 0.22]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.47, 0.57), bandMat)
    b.position.set(x, 0.225, 0)
    chestGroup.add(b)
  }
  // Coins overflowing
  const coinMat = new THREE.MeshStandardMaterial({
    color: GOLD_COLOR,
    metalness: 0.9,
    roughness: 0.08,
    emissive: 0xcc8800,
    emissiveIntensity: 0.5,
  })
  for (let i = 0; i < 25; i++) {
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.015, 10), coinMat)
    const a = Math.random() * Math.PI * 2
    const d = 0.1 + Math.random() * 0.4
    coin.position.set(Math.cos(a) * d, 0.5 + Math.random() * 0.15, Math.sin(a) * d)
    coin.rotation.x = Math.random()
    coin.rotation.z = Math.random()
    chestGroup.add(coin)
  }
  const coinLight = new THREE.PointLight(0xffcc44, 0.8, 4)
  coinLight.position.set(0, 0.7, 0)
  chestGroup.add(coinLight)

  chestGroup.position.set(0, 0.04, 1.5)
  scene.add(chestGroup)

  // === FLOATING COINS for animation (hidden initially) ===
  const floatingCoins = []
  for (let i = 0; i < 20; i++) {
    const coin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.02, 10),
      coinMat.clone()
    )
    coin.visible = false
    coin.castShadow = true
    scene.add(coin)
    floatingCoins.push(coin)
  }

  // === SHARKS — 4 fins circling ===
  const sharkFins = []
  for (let i = 0; i < 4; i++) {
    const finGroup = new THREE.Group()
    const finShape = new THREE.Shape()
    finShape.moveTo(0, 0)
    finShape.quadraticCurveTo(0.06, 0.6, 0.2, 0.7)
    finShape.quadraticCurveTo(0.35, 0.4, 0.45, 0)
    finShape.lineTo(0, 0)
    const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.07, bevelEnabled: false })
    const finMat = new THREE.MeshStandardMaterial({ color: 0x445555, roughness: 0.5 })
    finGroup.add(new THREE.Mesh(finGeo, finMat))
    // Wake
    const wake = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 0.15),
      new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
    )
    wake.rotation.x = -Math.PI / 2
    wake.position.set(-0.3, -0.05, 0.035)
    finGroup.add(wake)
    scene.add(finGroup)
    finGroup.userData = {
      orbitRadius: 5 + i * 1.8,
      speed: 0.5 + i * 0.12,
      phase: (i * Math.PI * 2) / 4,
      bobPhase: i * 1.5,
    }
    sharkFins.push(finGroup)
  }

  return { scene, camera, renderer, ocean, sharkFins, chestGroup, raftGroup, flag, floatingCoins }
}

export function animateOcean(ocean, t) {
  const pos = ocean.geometry.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    pos.setY(i,
      Math.sin(x * 0.3 + t * 0.7) * 0.15 +
      Math.cos(z * 0.25 + t * 0.5) * 0.1 +
      Math.sin((x + z) * 0.15 + t * 0.35) * 0.08
    )
  }
  pos.needsUpdate = true
}

export function animateSharks(fins, t) {
  for (const fin of fins) {
    const d = fin.userData
    const angle = t * d.speed + d.phase
    fin.position.x = Math.cos(angle) * d.orbitRadius
    fin.position.z = Math.sin(angle) * d.orbitRadius
    fin.position.y = -0.25 + Math.sin(t * 2.5 + d.bobPhase) * 0.06
    fin.rotation.y = -angle + Math.PI / 2
  }
}

export function animateRaft(raftGroup, t) {
  raftGroup.rotation.z = Math.sin(t * 0.5) * 0.02
  raftGroup.rotation.x = Math.sin(t * 0.4 + 1) * 0.015
  raftGroup.position.y = Math.sin(t * 0.6) * 0.08
}

export function animateFlag(flag, t) {
  const pos = flag.geometry.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    pos.setZ(i, Math.sin(x * 4 + t * 5) * 0.05 + Math.sin(x * 6 + t * 7) * 0.03)
  }
  pos.needsUpdate = true
}

// Animate coins sliding out of the chest to landing spots
export function animateCoinsToTarget(floatingCoins, t, targets) {
  for (const target of targets) {
    const coin = floatingCoins[target.coinIndex]
    if (!coin) continue
    const elapsed = t - target.startTime
    const progress = Math.min(elapsed / target.duration, 1)

    if (progress >= 0 && progress < 1) {
      coin.visible = true
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2
      coin.position.lerpVectors(target.from, target.to, eased)
      // Small hop out of chest then settle
      coin.position.y += Math.sin(progress * Math.PI) * 0.4
      coin.rotation.y = progress * Math.PI * 2
    } else if (progress >= 1) {
      // Stay visible at final position
      coin.visible = true
      coin.position.copy(target.to)
      coin.rotation.y = 0
    } else {
      coin.visible = false
    }
  }
}
