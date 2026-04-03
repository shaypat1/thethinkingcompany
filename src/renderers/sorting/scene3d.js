import * as THREE from 'three'

const CRATE_SPACING = 1.2
const BELT_Y = 0

export { CRATE_SPACING }

function cssToHex(prop) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(prop).trim()
  return v.startsWith('#') ? parseInt(v.slice(1), 16) : 0x2a2a3a
}

export function createScene(container, itemCount) {
  const bg = cssToHex('--bg')
  const accent = cssToHex('--accent')
  const border = cssToHex('--border')

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(bg)
  scene.fog = new THREE.FogExp2(bg, 0.025)

  const totalW = Math.max(itemCount, 4) * CRATE_SPACING
  const camDist = Math.max(totalW * 1.1, 6)
  const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100)
  camera.position.set(totalW * 0.42, camDist * 0.6, camDist * 0.65)
  camera.lookAt(totalW * 0.42, 0.4, 0)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2

  // Lighting
  scene.add(new THREE.AmbientLight(0x4455aa, 0.5))
  scene.add(new THREE.HemisphereLight(0x6688cc, 0x222233, 0.4))
  const sun = new THREE.DirectionalLight(0xffeedd, 1.2)
  sun.position.set(5, 10, 5)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  const s = 12
  sun.shadow.camera.left = -s; sun.shadow.camera.right = s
  sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s
  scene.add(sun)
  scene.add(new THREE.DirectionalLight(0x4466cc, 0.3).translateX(-5).translateY(3).translateZ(2))

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: bg, roughness: 0.9 })
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.set(totalW * 0.42, -0.1, 0)
  ground.receiveShadow = true
  scene.add(ground)

  // Back wall
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 10),
    new THREE.MeshStandardMaterial({ color: bg, roughness: 0.9 })
  )
  wall.position.set(totalW * 0.42, 3, -3)
  scene.add(wall)

  // Conveyor belt
  const beltW = totalW + 2
  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(beltW, 0.12, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.5, metalness: 0.3 })
  )
  belt.position.set(totalW * 0.42, BELT_Y - 0.06, 0)
  belt.receiveShadow = true
  scene.add(belt)

  // Belt rails
  const railMat = new THREE.MeshStandardMaterial({ color: border, metalness: 0.5, roughness: 0.4 })
  for (const z of [-0.85, 0.85]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(beltW + 0.4, 0.15, 0.08), railMat)
    rail.position.set(totalW * 0.42, BELT_Y + 0.02, z)
    scene.add(rail)
  }

  // Belt track lines
  const lineMat = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.12 })
  for (let i = 0; i < Math.ceil(beltW / 0.5); i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 1.5), lineMat)
    line.position.set(totalW * 0.42 - beltW / 2 + i * 0.5, BELT_Y + 0.01, 0)
    scene.add(line)
  }

  // Accent strip on back wall
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(totalW + 4, 0.04, 0.04),
    new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.3 })
  )
  strip.position.set(totalW * 0.42, 0.5, -2.5)
  scene.add(strip)

  return { scene, camera, renderer }
}

export function crateWorldPos(index, total) {
  const totalW = Math.max(total, 4) * CRATE_SPACING
  const offset = (totalW - (total - 1) * CRATE_SPACING) / 2
  return {
    x: offset + index * CRATE_SPACING,
    y: BELT_Y + 0.46,
    z: 0,
  }
}
