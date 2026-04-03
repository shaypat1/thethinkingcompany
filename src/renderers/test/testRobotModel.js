import * as THREE from 'three'

export function createRobot() {
  const group = new THREE.Group()

  // Retro color palette — bright, flat, arcade
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x00cc66, roughness: 0.8, metalness: 0.1, flatShading: true })
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x006633, roughness: 0.8, flatShading: true })
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3333 })
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0x88ffaa, roughness: 0.5, metalness: 0.2, flatShading: true })
  const treadMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.9, flatShading: true })

  // Treads — blocky
  for (const s of [-1, 1]) {
    const tread = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.5), treadMat)
    tread.position.set(s * 0.22, 0.05, 0); group.add(tread)
    // Tread grooves
    for (let i = -2; i <= 2; i++) {
      const groove = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.03), darkMat)
      groove.position.set(s * 0.22, 0.11, i * 0.1); group.add(groove)
    }
  }

  // Body — chunky box
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.4), bodyMat)
  body.position.y = 0.3; body.castShadow = true; group.add(body)

  // Chest display — dark screen
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.02), new THREE.MeshBasicMaterial({ color: 0x001a0a }))
  screen.position.set(0, 0.32, 0.21); group.add(screen)
  // Screen pixel dots
  for (let i = 0; i < 3; i++) {
    const dot = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.005), new THREE.MeshBasicMaterial({ color: 0x00ff66 }))
    dot.position.set(-0.06 + i * 0.06, 0.32, 0.225); group.add(dot)
  }

  // Arms — blocky
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.08), darkMat)
    arm.position.set(s * 0.3, 0.22, 0); group.add(arm)
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.1), chromeMat)
    hand.position.set(s * 0.3, 0.08, 0); group.add(hand)
  }

  // Head — blocky with antenna
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.3), bodyMat)
  head.position.y = 0.6; head.castShadow = true; group.add(head)

  // Eyes — glowing red squares
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.02), eyeMat)
    eye.position.set(s * 0.08, 0.62, 0.16); group.add(eye)
  }

  // Visor line
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0xff3333 }))
  visor.position.set(0, 0.59, 0.16); group.add(visor)

  // Baseball hat
  const hatMat = new THREE.MeshStandardMaterial({ color: 0xe03030, roughness: 0.8, flatShading: true })
  const hatDarkMat = new THREE.MeshStandardMaterial({ color: 0x991818, roughness: 0.8, flatShading: true })
  // Cap crown
  const crown = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.32), hatMat)
  crown.position.set(0, 0.78, -0.02); group.add(crown)
  // Brim — extends forward
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.03, 0.2), hatDarkMat)
  brim.position.set(0, 0.73, 0.2); group.add(brim)
  // Button on top
  const button = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.06), new THREE.MeshBasicMaterial({ color: 0xffffff }))
  button.position.set(0, 0.85, -0.02); group.add(button)

  // Antenna (on hat)
  const antenna = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.03), chromeMat)
  antenna.position.set(0.1, 0.92, -0.05); group.add(antenna)
  const antennaTip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), eyeMat)
  antennaTip.position.set(0.1, 1.0, -0.05); group.add(antennaTip)

  // Point light from eyes
  const eyeLight = new THREE.PointLight(0xff3333, 0.3, 2)
  eyeLight.position.set(0, 0.62, 0.3); group.add(eyeLight)

  group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
  return group
}

export const DIRECTIONS = ['up', 'right', 'down', 'left']

export function getDirRotation(dirIndex) {
  // up=-Z, right=+X, down=+Z, left=-X
  return [Math.PI, Math.PI / 2, 0, -Math.PI / 2][dirIndex] || 0
}

export function animateRobot(robot, dt) {
  if (!robot) return
  const speed = 8
  const tx = robot.userData.targetX ?? robot.position.x
  const tz = robot.userData.targetZ ?? robot.position.z
  const tr = robot.userData.targetRotY ?? robot.rotation.y

  // Snap-style movement for retro feel
  const dx = tx - robot.position.x
  const dz = tz - robot.position.z
  if (Math.abs(dx) > 0.01) robot.position.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt)
  else robot.position.x = tx
  if (Math.abs(dz) > 0.01) robot.position.z += Math.sign(dz) * Math.min(Math.abs(dz), speed * dt)
  else robot.position.z = tz

  // Rotation snap
  let dr = tr - robot.rotation.y
  while (dr > Math.PI) dr -= Math.PI * 2
  while (dr < -Math.PI) dr += Math.PI * 2
  if (Math.abs(dr) > 0.05) robot.rotation.y += Math.sign(dr) * Math.min(Math.abs(dr), speed * 2 * dt)
  else robot.rotation.y = tr

  // Antenna blink
  const tip = robot.children.find(c => c.position && c.position.y > 0.85)
  if (tip && tip.material) {
    tip.material.color.setHex(Math.sin(Date.now() * 0.005) > 0 ? 0xff3333 : 0x330000)
  }
}

export function setRobotAnim() {
  // No-op — retro robot doesn't have animation states
}
