import * as THREE from 'three'

const BODY_COLOR = 0x5588cc
const CHROME = 0xaabbcc
const EYE_COLOR = 0x44ddff

export function createRobot() {
  const group = new THREE.Group()

  const bodyMat = new THREE.MeshStandardMaterial({ color: BODY_COLOR, roughness: 0.3, metalness: 0.6 })
  const chromeMat = new THREE.MeshStandardMaterial({ color: CHROME, roughness: 0.2, metalness: 0.8 })
  const eyeMat = new THREE.MeshStandardMaterial({ color: EYE_COLOR, emissive: EYE_COLOR, emissiveIntensity: 0.8 })

  // Treads (base)
  const treadMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.7, metalness: 0.4 })
  const leftTread = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.45), treadMat)
  leftTread.position.set(-0.22, 0.06, 0)
  group.add(leftTread)
  const rightTread = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.45), treadMat)
  rightTread.position.set(0.22, 0.06, 0)
  group.add(rightTread)

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.4), bodyMat)
  body.position.y = 0.3
  body.castShadow = true
  group.add(body)

  // Chest plate (chrome accent)
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.02), chromeMat)
  chest.position.set(0, 0.32, 0.21)
  group.add(chest)

  // Arms
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), chromeMat)
    shoulder.position.set(side * 0.3, 0.35, 0)
    group.add(shoulder)
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 6), bodyMat)
    arm.position.set(side * 0.3, 0.2, 0)
    group.add(arm)
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.08), chromeMat)
    hand.position.set(side * 0.3, 0.08, 0)
    group.add(hand)
  }

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.08, 8), chromeMat)
  neck.position.y = 0.52
  group.add(neck)

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.32), bodyMat)
  head.position.y = 0.68
  head.castShadow = true
  group.add(head)

  // Face plate
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.02), new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.3 }))
  face.position.set(0, 0.68, 0.17)
  group.add(face)

  // Eyes
  const leftEye = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), eyeMat)
  leftEye.position.set(-0.08, 0.7, 0.18)
  group.add(leftEye)
  const rightEye = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), eyeMat)
  rightEye.position.set(0.08, 0.7, 0.18)
  group.add(rightEye)

  // Eye glow
  const eyeLight = new THREE.PointLight(EYE_COLOR, 0.4, 2)
  eyeLight.position.set(0, 0.7, 0.3)
  group.add(eyeLight)

  // Antenna
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 4), chromeMat)
  antenna.position.set(0, 0.92, 0)
  group.add(antenna)
  const antennaTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0xff4444, emissiveIntensity: 0.6 })
  )
  antennaTip.position.set(0, 1.03, 0)
  group.add(antennaTip)

  group.userData = {
    eyeLight,
    antennaTip,
    baseY: 0.15,
    targetX: 0,
    targetZ: 0,
    targetRotY: 0,
    animState: 'idle', // idle | moving | bonk | celebrate | pickup | light
    animStart: 0,
  }

  return group
}

// Direction to Y rotation (robot faces +Z when dir=0 "up" on grid means -Z in 3D)
const DIR_ROTATIONS = [Math.PI, Math.PI * 0.5, 0, -Math.PI * 0.5] // up, right, down, left

export function getDirRotation(dirIndex) {
  return DIR_ROTATIONS[dirIndex] || 0
}

export function animateRobot(robot, t) {
  const d = robot.userData
  const elapsed = t - d.animStart

  // Smooth position interpolation
  robot.position.x += (d.targetX - robot.position.x) * 0.15
  robot.position.z += (d.targetZ - robot.position.z) * 0.15

  // Smooth rotation
  let dr = d.targetRotY - robot.rotation.y
  // Normalize to [-PI, PI]
  while (dr > Math.PI) dr -= Math.PI * 2
  while (dr < -Math.PI) dr += Math.PI * 2
  robot.rotation.y += dr * 0.15

  switch (d.animState) {
    case 'idle':
      robot.position.y = d.baseY + Math.sin(t * 3) * 0.02
      break

    case 'moving':
      robot.position.y = d.baseY + Math.abs(Math.sin(elapsed * 8)) * 0.03
      if (elapsed > 0.3) d.animState = 'idle'
      break

    case 'bonk':
      robot.position.y = d.baseY + Math.sin(elapsed * 15) * 0.05 * Math.max(0, 1 - elapsed * 3)
      d.eyeLight.color.setHex(elapsed < 0.3 ? 0xff4444 : 0x44ddff)
      d.eyeLight.intensity = elapsed < 0.3 ? 0.8 : 0.4
      if (elapsed > 0.5) { d.animState = 'idle'; d.eyeLight.color.setHex(0x44ddff); d.eyeLight.intensity = 0.4 }
      break

    case 'celebrate':
      robot.position.y = d.baseY + Math.sin(elapsed * 6) * 0.15 * Math.max(0, 1 - elapsed * 0.8)
      robot.rotation.y += 0.15
      d.antennaTip.material.emissiveIntensity = 0.6 + Math.sin(elapsed * 20) * 0.4
      if (elapsed > 1.5) { d.animState = 'idle'; d.antennaTip.material.emissiveIntensity = 0.6 }
      break

    case 'pickup':
      robot.rotation.x = Math.sin(elapsed * 4) * 0.15 * Math.max(0, 1 - elapsed * 3)
      if (elapsed > 0.4) { d.animState = 'idle'; robot.rotation.x = 0 }
      break

    case 'light':
      d.antennaTip.material.emissiveIntensity = 1.5 * Math.max(0, 1 - elapsed * 2)
      d.eyeLight.intensity = 1.0 * Math.max(0, 1 - elapsed * 2) + 0.4
      if (elapsed > 0.5) { d.animState = 'idle'; d.antennaTip.material.emissiveIntensity = 0.6; d.eyeLight.intensity = 0.4 }
      break

    default:
      robot.position.y = d.baseY + Math.sin(t * 3) * 0.02
  }
}

export function setRobotAnim(robot, state, t) {
  robot.userData.animState = state
  robot.userData.animStart = t
}
