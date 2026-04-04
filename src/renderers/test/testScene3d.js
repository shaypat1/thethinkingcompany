import * as THREE from 'three'

const TILE_SIZE = 1.2
const TILE_GAP = 0.08
const WALL_HEIGHT = 0.8

export { TILE_SIZE, TILE_GAP }

export function createScene(container, level) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x050810)

  // Camera
  const gridW = level.width * (TILE_SIZE + TILE_GAP)
  const gridH = level.height * (TILE_SIZE + TILE_GAP)
  const maxDim = Math.max(gridW, gridH)
  const isMobile = container.clientWidth < 500
  const camDist = maxDim * (isMobile ? 2.8 : 1.5) + 3

  const camera = new THREE.PerspectiveCamera(isMobile ? 50 : 38, container.clientWidth / container.clientHeight, 0.1, 100)
  const camCx = (level.width - 1) * (TILE_SIZE + TILE_GAP) / 2
  const camCz = (level.height - 1) * (TILE_SIZE + TILE_GAP) / 2
  camera.position.set(camCx, camDist * (isMobile ? 1.0 : 0.9), camCz + camDist * 0.4)
  camera.lookAt(camCx, 0, camCz)

  // Renderer — no tone mapping for flat retro look
  const renderer = new THREE.WebGLRenderer({ antialias: false }) // pixelated
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(1) // force low-res for retro feel
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.BasicShadowMap // hard shadows

  // Lighting — harsh, arcade-like
  scene.add(new THREE.AmbientLight(0x1a1a3a, 0.6))

  const sun = new THREE.DirectionalLight(0xffffff, 1.5)
  sun.position.set(4, 12, 5)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 30
  sun.shadow.camera.left = -10; sun.shadow.camera.right = 10
  sun.shadow.camera.top = 10; sun.shadow.camera.bottom = -10
  scene.add(sun)

  // Neon underglow
  const neonGlow = new THREE.PointLight(0x00aaff, 0.4, 15)
  neonGlow.position.set(camCx, -0.5, camCz)
  scene.add(neonGlow)

  // Ground — void black
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshBasicMaterial({ color: 0x030508 })
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.set(camCx, -0.15, camCz)
  scene.add(ground)

  // Materials — retro flat colors
  const tileMat = new THREE.MeshStandardMaterial({
    color: 0x0a0f1a,
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  })

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xe03030,
    roughness: 0.7,
    metalness: 0.1,
    emissive: 0xe03030,
    emissiveIntensity: 0.15,
    flatShading: true,
  })

  // Neon grid line material
  const neonMat = new THREE.MeshBasicMaterial({ color: 0x00ccff })
  const neonDimMat = new THREE.MeshBasicMaterial({ color: 0x004466 })

  for (let y = 0; y < level.height; y++) {
    for (let x = 0; x < level.width; x++) {
      const cell = level.grid[y][x]
      const px = x * (TILE_SIZE + TILE_GAP)
      const pz = y * (TILE_SIZE + TILE_GAP)

      if (cell === 'W') {
        // Wall — glowing red block
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(TILE_SIZE, WALL_HEIGHT, TILE_SIZE),
          wallMat
        )
        wall.position.set(px, WALL_HEIGHT / 2, pz)
        wall.castShadow = true
        scene.add(wall)

        // Red glow under wall
        const wallGlow = new THREE.PointLight(0xe03030, 0.15, 2)
        wallGlow.position.set(px, 0.1, pz)
        scene.add(wallGlow)

      } else {
        // Floor tile — dark
        const tile = new THREE.Mesh(
          new THREE.BoxGeometry(TILE_SIZE, 0.06, TILE_SIZE),
          tileMat
        )
        tile.position.set(px, 0, pz)
        tile.receiveShadow = true
        scene.add(tile)

        // Neon grid edges
        // Bottom edge
        const edgeH = new THREE.Mesh(
          new THREE.BoxGeometry(TILE_SIZE + TILE_GAP, 0.02, 0.03),
          neonDimMat
        )
        edgeH.position.set(px, 0.04, pz - TILE_SIZE / 2)
        scene.add(edgeH)

        // Left edge
        const edgeV = new THREE.Mesh(
          new THREE.BoxGeometry(0.03, 0.02, TILE_SIZE + TILE_GAP),
          neonDimMat
        )
        edgeV.position.set(px - TILE_SIZE / 2, 0.04, pz)
        scene.add(edgeV)

        // Corner dots — bright neon at intersections
        const dot = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.025, 0.06),
          neonMat
        )
        dot.position.set(px - TILE_SIZE / 2, 0.045, pz - TILE_SIZE / 2)
        scene.add(dot)
      }
    }
  }

  // Outer border — bright neon frame around the entire grid
  const totalW = level.width * (TILE_SIZE + TILE_GAP)
  const totalH = level.height * (TILE_SIZE + TILE_GAP)
  const borderThickness = 0.04
  const borderHeight = 0.03
  const cx = (level.width - 1) * (TILE_SIZE + TILE_GAP) / 2
  const cz = (level.height - 1) * (TILE_SIZE + TILE_GAP) / 2

  // Top border
  const bTop = new THREE.Mesh(new THREE.BoxGeometry(totalW + 0.5, borderHeight, borderThickness), neonMat)
  bTop.position.set(cx, 0.05, -TILE_SIZE / 2 - TILE_GAP); scene.add(bTop)
  // Bottom border
  const bBot = new THREE.Mesh(new THREE.BoxGeometry(totalW + 0.5, borderHeight, borderThickness), neonMat)
  bBot.position.set(cx, 0.05, cz * 2 + TILE_SIZE / 2 + TILE_GAP); scene.add(bBot)
  // Left border
  const bLeft = new THREE.Mesh(new THREE.BoxGeometry(borderThickness, borderHeight, totalH + 0.5), neonMat)
  bLeft.position.set(-TILE_SIZE / 2 - TILE_GAP, 0.05, cz); scene.add(bLeft)
  // Right border
  const bRight = new THREE.Mesh(new THREE.BoxGeometry(borderThickness, borderHeight, totalH + 0.5), neonMat)
  bRight.position.set(cx * 2 + TILE_SIZE / 2 + TILE_GAP, 0.05, cz); scene.add(bRight)

  return { scene, camera, renderer }
}

export function tileToWorld(x, y) {
  return {
    x: x * (TILE_SIZE + TILE_GAP),
    y: 0.15,
    z: y * (TILE_SIZE + TILE_GAP),
  }
}
