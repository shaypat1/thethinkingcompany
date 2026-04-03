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

const PLATFORM_Y = 1.0 // tall enough that clue numbers sit on the wall below the buildings

export { TILE, GAP, PLATFORM_Y }

export function createScene(container, n) {
  const gridW = n * (TILE + GAP)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(COLORS.void)

  // Camera
  const camDist = gridW * 2.8 + 4
  const camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 200)
  camera.position.set(gridW * 0.5, camDist * 0.7, gridW * 0.5 + camDist * 0.55)
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
  controls.enableZoom = false
  controls.enablePan = false
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

  // Ground plane — dark void (at y=0)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: COLORS.void, roughness: 0.95, flatShading: true })
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.set(gridW * 0.45, 0, gridW * 0.45)
  ground.receiveShadow = true
  scene.add(ground)

  // Platform base — city block slab
  const cx = (n - 1) * (TILE + GAP) / 2
  const cz = (n - 1) * (TILE + GAP) / 2
  const platW = gridW + 2.0

  // Main slab
  const platMat = new THREE.MeshStandardMaterial({ color: 0x0d1520, roughness: 0.7, flatShading: true })
  const platform = new THREE.Mesh(new THREE.BoxGeometry(platW, PLATFORM_Y, platW), platMat)
  platform.position.set(cx, PLATFORM_Y / 2, cz)
  platform.receiveShadow = true
  platform.castShadow = true
  scene.add(platform)

  // Sidewalk edge — slightly wider, lighter strip on top
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x1a2535, roughness: 0.6, flatShading: true })
  const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(platW + 0.3, 0.04, platW + 0.3), sidewalkMat)
  sidewalk.position.set(cx, PLATFORM_Y + 0.02, cz)
  scene.add(sidewalk)

  // Neon edge around platform
  const platEdge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(platW + 0.3, 0.06, platW + 0.3)),
    new THREE.LineBasicMaterial({ color: COLORS.tileEdgeDim })
  )
  platEdge.position.set(cx, PLATFORM_Y, cz)
  scene.add(platEdge)

  // Build grid tiles — sit on top of platform
  const tileY = PLATFORM_Y + 0.05
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
      tile.position.set(px, tileY, pz)
      tile.receiveShadow = true
      scene.add(tile)

      // Neon edge glow — slightly above tile
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(tile.geometry),
        new THREE.LineBasicMaterial({ color: COLORS.tileEdgeDim })
      )
      edges.position.set(px, tileY + 0.01, pz)
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
  frame.position.set(cx, tileY + 0.02, cz)
  scene.add(frame)

  // Snap-to-side view helper
  const center = new THREE.Vector3(
    (n - 1) * (TILE + GAP) / 2,
    PLATFORM_Y + 0.5,
    (n - 1) * (TILE + GAP) / 2
  )
  // Snap views keep same distance from center — just rotate around, no zoom change
  const isoDist = camera.position.distanceTo(center)

  function snapToView(side) {
    const target = center.clone()
    let pos
    // Same distance as iso view, just different angle — slightly above platform level
    const eyeHeight = PLATFORM_Y + 1.5
    switch (side) {
      case 'top':    pos = new THREE.Vector3(center.x, eyeHeight, center.z - isoDist); break
      case 'bottom': pos = new THREE.Vector3(center.x, eyeHeight, center.z + isoDist); break
      case 'left':   pos = new THREE.Vector3(center.x - isoDist, eyeHeight, center.z); break
      case 'right':  pos = new THREE.Vector3(center.x + isoDist, eyeHeight, center.z); break
      default: // iso — return to original position
        pos = camera.position.clone().copy(
          new THREE.Vector3(gridW * 0.5, camDist * 0.7, gridW * 0.5 + camDist * 0.55)
        )
        break
    }
    const startPos = camera.position.clone()
    const startTarget = controls.target.clone()
    let t = 0
    function step() {
      t += 0.04
      if (t >= 1) t = 1
      camera.position.lerpVectors(startPos, pos, t)
      controls.target.lerpVectors(startTarget, target, t)
      controls.update()
      if (t < 1) requestAnimationFrame(step)
    }
    step()
  }

  return { scene, camera, renderer, controls, tiles, gridW, snapToView }
}

// Add clue numbers as 3D sprites around the grid
export function addClues(scene, clues, n) {
  const step = TILE + GAP
  const gridW = n * step
  const edgeDist = (gridW + 2.0) / 2 + 0.8
  const gridCenter = (n - 1) * step / 2

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
    sprite.scale.set(0.7, 0.7, 1)
    return sprite
  }

  const clueY = PLATFORM_Y * 0.5 // halfway up the platform wall — below the buildings

  if (clues.top) {
    clues.top.forEach((v, c) => {
      if (!v) return
      const s = makeClueSprite(v)
      s.position.set(c * step, clueY, gridCenter - edgeDist)
      scene.add(s)
    })
  }

  if (clues.bottom) {
    clues.bottom.forEach((v, c) => {
      if (!v) return
      const s = makeClueSprite(v)
      s.position.set(c * step, clueY, gridCenter + edgeDist)
      scene.add(s)
    })
  }

  if (clues.left) {
    clues.left.forEach((v, r) => {
      if (!v) return
      const s = makeClueSprite(v)
      s.position.set(gridCenter - edgeDist, clueY, r * step)
      scene.add(s)
    })
  }

  if (clues.right) {
    clues.right.forEach((v, r) => {
      if (!v) return
      const s = makeClueSprite(v)
      s.position.set(gridCenter + edgeDist, clueY, r * step)
      scene.add(s)
    })
  }
}

export function tileCenter(row, col) {
  return {
    x: col * (TILE + GAP),
    y: PLATFORM_Y,
    z: row * (TILE + GAP),
  }
}

// Create a building — each height has unique character
export function createBuilding(height, maxHeight) {
  const h = height * 0.55
  const colorIdx = (height - 1) % COLORS.building.length
  const color = COLORS.building[colorIdx]
  const w = TILE * 0.72
  const group = new THREE.Group()

  const mat = new THREE.MeshStandardMaterial({
    color, roughness: 0.7, metalness: 0.15, flatShading: true,
    emissive: color, emissiveIntensity: 0.12,
  })
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x0a0e18, roughness: 0.5, flatShading: true,
  })
  const neonEdge = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 })
  const windowMat = new THREE.MeshBasicMaterial({ color: 0xffeeaa })
  const windowDimMat = new THREE.MeshBasicMaterial({ color: 0x334455 })

  // ── Base block (all buildings) ──
  const baseH = Math.min(h * 0.3, 0.25)
  const base = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, baseH, w + 0.04), darkMat)
  base.position.y = baseH / 2 + 0.04
  base.castShadow = true
  group.add(base)

  // ── Main tower — shape varies by height ──
  const towerH = h - baseH
  let towerW = w
  if (height >= 4) towerW = w * 0.85 // taller = slightly narrower, more elegant
  const tower = new THREE.Mesh(new THREE.BoxGeometry(towerW, towerH, towerW), mat)
  tower.position.y = baseH + towerH / 2 + 0.04
  tower.castShadow = true
  tower.receiveShadow = true
  group.add(tower)

  // Neon edges on tower
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(tower.geometry), neonEdge)
  edges.position.copy(tower.position)
  group.add(edges)

  // ── Setback / stepped top (height 3+) ──
  if (height >= 3) {
    const stepH = 0.12
    const stepW = towerW * 0.7
    const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepW), mat)
    step.position.y = baseH + towerH + stepH / 2 + 0.04
    step.castShadow = true
    group.add(step)
    group.add(new THREE.LineSegments(new THREE.EdgesGeometry(step.geometry), neonEdge).translateY(step.position.y))
  }

  // ── Roof details ──
  const roofY = h + 0.08

  // Flat roof cap
  const roof = new THREE.Mesh(new THREE.BoxGeometry(towerW + 0.06, 0.04, towerW + 0.06), darkMat)
  roof.position.y = roofY
  group.add(roof)

  // Height 2+: AC unit boxes on roof
  if (height >= 2) {
    const ac = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12), darkMat)
    ac.position.set(towerW * 0.2, roofY + 0.06, -towerW * 0.15)
    group.add(ac)
  }

  // Height 4+: just an extra AC unit
  if (height >= 4) {
    const ac2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.1), darkMat)
    ac2.position.set(-towerW * 0.2, roofY + 0.05, towerW * 0.15)
    group.add(ac2)
  }

  // Tallest building: helipad + beacon
  if (height === maxHeight) {
    // Helipad circle on roof
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(towerW * 0.25, towerW * 0.25, 0.02, 8),
      new THREE.MeshBasicMaterial({ color: 0x224400 })
    )
    pad.position.y = roofY + 0.03
    group.add(pad)
    // H marking
    const hMark = new THREE.Mesh(
      new THREE.BoxGeometry(towerW * 0.15, 0.01, 0.03),
      new THREE.MeshBasicMaterial({ color: 0xffcc00 })
    )
    hMark.position.y = roofY + 0.04
    group.add(hMark)
    // Beacon glow
    const glow = new THREE.PointLight(color, 0.5, 4)
    glow.position.y = roofY + 0.5
    group.add(glow)
  }

  // ── Windows on all 4 faces ──
  const floorH = towerH / Math.max(height, 1)
  const wpc = Math.min(height, 3) // windows per column
  const faces = [
    { axis: 'z', sign: 1 },  // front
    { axis: 'z', sign: -1 }, // back
    { axis: 'x', sign: 1 },  // right
    { axis: 'x', sign: -1 }, // left
  ]

  for (const face of faces) {
    for (let f = 0; f < height; f++) {
      for (let wi = 0; wi < wpc; wi++) {
        const lit = Math.random() > 0.3 // 70% windows lit
        const win = new THREE.Mesh(
          new THREE.PlaneGeometry(0.07, 0.05),
          lit ? windowMat : windowDimMat
        )
        const fy = baseH + f * floorH + floorH * 0.5 + 0.04
        const spread = (wi - (wpc - 1) / 2) * 0.14
        if (face.axis === 'z') {
          win.position.set(spread, fy, face.sign * (towerW / 2 + 0.005))
          if (face.sign < 0) win.rotation.y = Math.PI
        } else {
          win.position.set(face.sign * (towerW / 2 + 0.005), fy, spread)
          win.rotation.y = face.sign * Math.PI / 2
        }
        group.add(win)
      }
    }
  }

  // ── Neon accent strip at base ──
  const stripMat = new THREE.MeshBasicMaterial({ color })
  for (const z of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.02, 0.02), stripMat)
    strip.position.set(0, baseH + 0.05, z * (w / 2 + 0.01))
    group.add(strip)
  }
  for (const x of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, w + 0.06), stripMat)
    strip.position.set(x * (w / 2 + 0.01), baseH + 0.05, 0)
    group.add(strip)
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
