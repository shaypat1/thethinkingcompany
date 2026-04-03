import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const TILE = 1.2
const GAP = 0.08
const COLORS = {
  void: 0x050810,
  tile: 0x0a0f1a,
  tileEdge: 0x00ccff,
  tileEdgeDim: 0x003355,
  selected: 0x003344,
  error: 0x331111,
  building: [0x00cc66, 0x00aaff, 0xffcc00, 0xe03030, 0xff66aa, 0x66ffcc],
  clue: 0x00ccff,
  neonGlow: 0x00aaff,
  wallGlow: 0xe03030,
}

export { TILE, GAP }

export function createScene(container, n) {
  const gridW = n * (TILE + GAP)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(COLORS.void)

  // Camera
  const camDist = gridW * 1.6 + 2
  const camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 200)
  camera.position.set(gridW * 0.5, camDist * 0.8, gridW * 0.5 + camDist * 0.5)
  camera.lookAt(gridW * 0.45, 0, gridW * 0.45)

  // Renderer — retro arcade: flat shading, hard shadows, pixel ratio 1
  const renderer = new THREE.WebGLRenderer({ antialias: false })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(1) // crisp pixels
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.BasicShadowMap // hard shadows
  renderer.toneMapping = THREE.NoToneMapping

  // Orbit controls — pan around the city
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.enableZoom = true
  controls.enablePan = false
  controls.minDistance = 4
  controls.maxDistance = camDist * 2
  controls.minPolarAngle = 0.3
  controls.maxPolarAngle = Math.PI / 2.2
  controls.target.set(gridW * 0.45, 0, gridW * 0.45)

  // Lighting — arcade harsh
  scene.add(new THREE.AmbientLight(0x1a1a3a, 0.6))
  const sun = new THREE.DirectionalLight(0xffffff, 1.5)
  sun.position.set(4, 12, 5)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  const s = gridW + 4
  sun.shadow.camera.left = -s; sun.shadow.camera.right = s
  sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s
  scene.add(sun)

  // Neon underglow
  const neon = new THREE.PointLight(COLORS.neonGlow, 0.4, gridW * 3)
  neon.position.set(gridW * 0.5, -0.5, gridW * 0.5)
  scene.add(neon)

  // Ground plane — dark void
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(gridW * 4, gridW * 4),
    new THREE.MeshStandardMaterial({ color: COLORS.void, roughness: 0.95, flatShading: true })
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.set(gridW * 0.45, -0.05, gridW * 0.45)
  ground.receiveShadow = true
  scene.add(ground)

  // Build grid tiles
  const tiles = []
  for (let r = 0; r < n; r++) {
    tiles[r] = []
    for (let c = 0; c < n; c++) {
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(TILE, 0.06, TILE),
        new THREE.MeshStandardMaterial({ color: COLORS.tile, roughness: 0.8, flatShading: true })
      )
      const px = c * (TILE + GAP)
      const pz = r * (TILE + GAP)
      tile.position.set(px, 0, pz)
      tile.receiveShadow = true
      scene.add(tile)

      // Neon edge glow
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(tile.geometry),
        new THREE.LineBasicMaterial({ color: COLORS.tileEdgeDim })
      )
      edges.position.copy(tile.position)
      scene.add(edges)

      tiles[r][c] = { mesh: tile, edges, mat: tile.material }
    }
  }

  // Grid border frame — bright neon
  const frameGeo = new THREE.EdgesGeometry(
    new THREE.BoxGeometry(gridW + GAP, 0.08, gridW + GAP)
  )
  const frame = new THREE.LineSegments(
    frameGeo,
    new THREE.LineBasicMaterial({ color: COLORS.tileEdge })
  )
  frame.position.set(
    (n - 1) * (TILE + GAP) / 2,
    0.01,
    (n - 1) * (TILE + GAP) / 2
  )
  scene.add(frame)

  return { scene, camera, renderer, controls, tiles, gridW }
}

// Add clue numbers as 3D sprites around the grid
export function addClues(scene, clues, n) {
  const step = TILE + GAP
  const offset = 1.0 // distance from grid edge

  function makeClueSprite(text) {
    const canvas = document.createElement('canvas')
    canvas.width = 64; canvas.height = 64
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#00ccff'
    ctx.font = 'bold 42px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(text), 32, 32)
    const tex = new THREE.CanvasTexture(canvas)
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(0.6, 0.6, 1)
    return sprite
  }

  // Top clues (above the grid, looking down columns)
  if (clues.top) {
    clues.top.forEach((v, c) => {
      if (!v) return
      const s = makeClueSprite(v)
      s.position.set(c * step, 0.3, -offset)
      scene.add(s)
    })
  }

  // Bottom clues (below the grid)
  if (clues.bottom) {
    clues.bottom.forEach((v, c) => {
      if (!v) return
      const s = makeClueSprite(v)
      s.position.set(c * step, 0.3, (n - 1) * step + offset)
      scene.add(s)
    })
  }

  // Left clues (left of the grid, looking across rows)
  if (clues.left) {
    clues.left.forEach((v, r) => {
      if (!v) return
      const s = makeClueSprite(v)
      s.position.set(-offset, 0.3, r * step)
      scene.add(s)
    })
  }

  // Right clues (right of the grid)
  if (clues.right) {
    clues.right.forEach((v, r) => {
      if (!v) return
      const s = makeClueSprite(v)
      s.position.set((n - 1) * step + offset, 0.3, r * step)
      scene.add(s)
    })
  }
}

export function tileCenter(row, col) {
  return {
    x: col * (TILE + GAP),
    y: 0,
    z: row * (TILE + GAP),
  }
}

// Create a building mesh at given height (1..N)
export function createBuilding(height, maxHeight) {
  const h = height * 0.5
  const colorIdx = (height - 1) % COLORS.building.length
  const color = COLORS.building[colorIdx]

  const group = new THREE.Group()

  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.7,
    metalness: 0.15,
    flatShading: true,
    emissive: color,
    emissiveIntensity: 0.15,
  })

  // Main tower
  const tower = new THREE.Mesh(new THREE.BoxGeometry(TILE * 0.75, h, TILE * 0.75), mat)
  tower.position.y = h / 2 + 0.04
  tower.castShadow = true
  tower.receiveShadow = true
  group.add(tower)

  // Roof cap
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x111122,
    roughness: 0.5,
    flatShading: true,
  })
  const roof = new THREE.Mesh(new THREE.BoxGeometry(TILE * 0.8, 0.06, TILE * 0.8), roofMat)
  roof.position.y = h + 0.07
  roof.castShadow = true
  group.add(roof)

  // Neon edge lines on the building
  const edgeMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 })
  const edgeLines = new THREE.LineSegments(new THREE.EdgesGeometry(tower.geometry), edgeMat)
  edgeLines.position.copy(tower.position)
  group.add(edgeLines)

  // Window lights — small emissive squares on the front face
  const windowMat = new THREE.MeshBasicMaterial({ color: 0xffeeaa })
  const windowsPerFloor = Math.min(height, 3)
  const floorH = h / height
  for (let f = 0; f < height; f++) {
    for (let wi = 0; wi < windowsPerFloor; wi++) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.06), windowMat)
      win.position.set(
        -TILE * 0.2 + wi * TILE * 0.2,
        f * floorH + floorH * 0.5 + 0.04,
        TILE * 0.375 + 0.01
      )
      group.add(win)
    }
  }

  // Point light glow at top
  if (height === maxHeight) {
    const glow = new THREE.PointLight(color, 0.3, 3)
    glow.position.y = h + 0.3
    group.add(glow)
  }

  group.userData = { height }
  return group
}

export function highlightTile(tile, type) {
  if (type === 'selected') {
    tile.mat.color.setHex(COLORS.selected)
    tile.edges.material.color.setHex(COLORS.tileEdge)
  } else if (type === 'error') {
    tile.mat.color.setHex(COLORS.error)
    tile.edges.material.color.setHex(COLORS.wallGlow)
  } else {
    tile.mat.color.setHex(COLORS.tile)
    tile.edges.material.color.setHex(COLORS.tileEdgeDim)
  }
}
