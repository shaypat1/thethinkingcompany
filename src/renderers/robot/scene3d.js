import * as THREE from 'three'

const TILE_SIZE = 1.2
const TILE_GAP = 0.06
const WALL_HEIGHT = 1.0

export { TILE_SIZE, TILE_GAP }

function getThemeColor(prop) {
  return getComputedStyle(document.documentElement).getPropertyValue(prop).trim()
}

function cssToHex(css) {
  if (css.startsWith('#')) {
    return parseInt(css.slice(1), 16)
  }
  return 0x2a2a3a // fallback
}

export function createScene(container, level) {
  // Read theme colors
  const bgColor = cssToHex(getThemeColor('--bg'))
  const textColor = cssToHex(getThemeColor('--text'))
  const borderColor = cssToHex(getThemeColor('--border'))
  const accentColor = cssToHex(getThemeColor('--accent'))
  const mutedColor = cssToHex(getThemeColor('--text-muted'))
  const nodeLockedColor = cssToHex(getThemeColor('--node-locked'))

  // Derive scene colors from theme
  const floorColor = borderColor
  const floorLine = accentColor
  const wallColor = nodeLockedColor
  const sceneBg = bgColor

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(sceneBg)
  scene.fog = new THREE.FogExp2(sceneBg, 0.04)

  // Camera — isometric-ish angle
  const gridW = level.width * (TILE_SIZE + TILE_GAP)
  const gridH = level.height * (TILE_SIZE + TILE_GAP)
  const maxDim = Math.max(gridW, gridH)
  const camDist = maxDim * 1.4 + 3

  const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100)
  camera.position.set(gridW * 0.4, camDist * 0.7, gridH * 0.5 + camDist * 0.6)
  camera.lookAt(gridW * 0.4, 0, gridH * 0.35)

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2

  // Lighting
  const ambient = new THREE.AmbientLight(0x4455aa, 0.5)
  scene.add(ambient)

  const hemi = new THREE.HemisphereLight(0x6688cc, 0x222233, 0.4)
  scene.add(hemi)

  const sun = new THREE.DirectionalLight(0xffeedd, 1.2)
  sun.position.set(5, 10, 5)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.near = 0.5
  sun.shadow.camera.far = 30
  sun.shadow.camera.left = -10
  sun.shadow.camera.right = 10
  sun.shadow.camera.top = 10
  sun.shadow.camera.bottom = -10
  scene.add(sun)

  // Fill light (cool, from left)
  const fill = new THREE.DirectionalLight(0x4466cc, 0.3)
  fill.position.set(-5, 3, 2)
  scene.add(fill)

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(30, 30)
  const groundMat = new THREE.MeshStandardMaterial({ color: sceneBg, roughness: 0.9 })
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.set(gridW * 0.4, -0.1, gridH * 0.35)
  ground.receiveShadow = true
  scene.add(ground)

  // Build grid tiles and walls
  const tileMat = new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.6, metalness: 0.2 })
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.5, metalness: 0.3 })
  const lineMat = new THREE.MeshStandardMaterial({ color: floorLine, emissive: floorLine, emissiveIntensity: 0.2 })

  for (let y = 0; y < level.height; y++) {
    for (let x = 0; x < level.width; x++) {
      const cell = level.grid[y][x]
      const px = x * (TILE_SIZE + TILE_GAP)
      const pz = y * (TILE_SIZE + TILE_GAP)

      if (cell === 'W') {
        // Wall block
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(TILE_SIZE, WALL_HEIGHT, TILE_SIZE),
          wallMat
        )
        wall.position.set(px, WALL_HEIGHT / 2, pz)
        wall.castShadow = true
        wall.receiveShadow = true
        scene.add(wall)

      } else {
        // Floor tile
        const tile = new THREE.Mesh(
          new THREE.BoxGeometry(TILE_SIZE, 0.08, TILE_SIZE),
          tileMat
        )
        tile.position.set(px, 0, pz)
        tile.receiveShadow = true
        scene.add(tile)

        // Grid line glow (edges)
        const edgeGeo = new THREE.BoxGeometry(TILE_SIZE + TILE_GAP, 0.01, 0.02)
        const edgeZ = new THREE.Mesh(edgeGeo, lineMat)
        edgeZ.position.set(px, 0.05, pz - TILE_SIZE / 2)
        scene.add(edgeZ)
        const edgeGeoV = new THREE.BoxGeometry(0.02, 0.01, TILE_SIZE + TILE_GAP)
        const edgeX = new THREE.Mesh(edgeGeoV, lineMat)
        edgeX.position.set(px - TILE_SIZE / 2, 0.05, pz)
        scene.add(edgeX)
      }
    }
  }

  // Background workshop elements
  const pipeMat = new THREE.MeshStandardMaterial({ color: mutedColor, metalness: 0.5, roughness: 0.4 })
  for (let i = 0; i < 6; i++) {
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 8, 6),
      pipeMat
    )
    pipe.position.set(-2 + i * 0.8, 2, -2)
    pipe.rotation.x = Math.PI * 0.1
    scene.add(pipe)
  }

  // Accent lights on back wall — use theme accent
  for (let i = 0; i < 4; i++) {
    const light = new THREE.PointLight(accentColor, 0.3, 5)
    light.position.set(-1 + i * 2.5, 1.5, -2.5)
    scene.add(light)
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.8 })
    )
    bulb.position.copy(light.position)
    scene.add(bulb)
  }

  return { scene, camera, renderer }
}

export function tileToWorld(x, y) {
  return {
    x: x * (TILE_SIZE + TILE_GAP),
    y: 0.15,
    z: y * (TILE_SIZE + TILE_GAP),
  }
}
