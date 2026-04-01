import * as THREE from 'three'

const PIRATE_COLORS = [
  0xcc3333, // P1 — red
  0x3366cc, // P2 — blue
  0x33aa55, // P3 — green
  0x9944cc, // P4 — purple
  0xee8833, // P5 — orange
  0xccaa33, // P6 — gold
  0x33aaaa, // P7 — teal
  0xcc5599, // P8 — pink
]

const SKIN_COLORS = [0xf0c8a0, 0xe0b890, 0xd0a878, 0xc09060]

export function createPirate(index) {
  const group = new THREE.Group()
  const color = PIRATE_COLORS[index % PIRATE_COLORS.length]
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 })
  const skinColor = SKIN_COLORS[index % SKIN_COLORS.length]
  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.7 })
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 })

  // Boots
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8 })
  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.18), bootMat)
  leftBoot.position.set(-0.08, 0.09, 0.02)
  group.add(leftBoot)
  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.18), bootMat)
  rightBoot.position.set(0.08, 0.09, 0.02)
  group.add(rightBoot)

  // Legs (trousers)
  const legMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.8 })
  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.3, 6), legMat)
  leftLeg.position.set(-0.08, 0.3, 0)
  group.add(leftLeg)
  const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.3, 6), legMat)
  rightLeg.position.set(0.08, 0.3, 0)
  group.add(rightLeg)

  // Belt
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.5 })
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 8), beltMat)
  belt.position.y = 0.47
  group.add(belt)
  // Belt buckle
  const buckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.06, 0.03),
    new THREE.MeshStandardMaterial({ color: 0xDAA520, metalness: 0.7, roughness: 0.2 })
  )
  buckle.position.set(0, 0.47, 0.2)
  group.add(buckle)

  // Torso (shirt/vest)
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.45, 8), mat)
  torso.position.y = 0.72
  torso.castShadow = true
  group.add(torso)

  // Vest overlay (darker shade)
  const vestMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).multiplyScalar(0.6),
    roughness: 0.7,
  })
  const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.4, 8, 1, true), vestMat)
  vest.position.y = 0.72
  group.add(vest)

  // Arms
  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.4, 6), mat)
  leftArm.position.set(-0.25, 0.65, 0)
  leftArm.rotation.z = 0.2
  group.add(leftArm)
  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.4, 6), mat)
  rightArm.position.set(0.25, 0.65, 0)
  rightArm.rotation.z = -0.2
  group.add(rightArm)

  // Hands
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), skinMat)
  leftHand.position.set(-0.3, 0.45, 0)
  group.add(leftHand)
  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), skinMat)
  rightHand.position.set(0.3, 0.45, 0)
  group.add(rightHand)

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.08, 6), skinMat)
  neck.position.y = 0.98
  group.add(neck)

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), skinMat)
  head.position.y = 1.12
  head.castShadow = true
  group.add(head)

  // Eyes
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
  const eyePupil = new THREE.MeshStandardMaterial({ color: 0x111111 })
  for (const side of [-1, 1]) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeWhite)
    white.position.set(side * 0.065, 1.14, 0.145)
    white.scale.z = 0.6
    group.add(white)
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), eyePupil)
    pupil.position.set(side * 0.065, 1.14, 0.16)
    group.add(pupil)
  }

  // Nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 5), skinMat)
  nose.position.set(0, 1.1, 0.17)
  group.add(nose)

  // Mouth
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.02), darkMat)
  mouth.position.set(0, 1.05, 0.16)
  group.add(mouth)

  // Pirate hat — tricorn style
  const hatBrim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.26, 0.03, 3),
    darkMat
  )
  hatBrim.position.y = 1.26
  hatBrim.rotation.y = Math.PI / 6
  group.add(hatBrim)
  const hatTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, 0.14, 6),
    darkMat
  )
  hatTop.position.y = 1.33
  group.add(hatTop)
  // Hat band with pirate color
  const hatBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.185, 0.185, 0.03, 8),
    mat
  )
  hatBand.position.y = 1.27
  group.add(hatBand)

  // Facial hair for some pirates
  if (index % 3 === 0) {
    // Beard
    const beard = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 })
    )
    beard.position.set(0, 1.0, 0.1)
    beard.scale.set(1, 1.3, 0.7)
    group.add(beard)
  } else if (index % 3 === 1) {
    // Eyepatch
    const patch = new THREE.Mesh(new THREE.CircleGeometry(0.045, 6), darkMat)
    patch.position.set(0.065, 1.14, 0.155)
    group.add(patch)
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.015, 0.01), darkMat)
    strap.position.set(0, 1.16, 0.07)
    group.add(strap)
  }

  group.userData = { index, baseY: 0, animPhase: Math.random() * Math.PI * 2 }

  return group
}

// Position pirates on deck based on count
export function positionPirates(pirates, count) {
  const spacing = Math.min(1.3, 5 / count)
  const startX = -((count - 1) * spacing) / 2

  pirates.forEach((p, i) => {
    if (i < count) {
      p.visible = true
      p.position.x = startX + i * spacing
      p.position.y = 0.04
      p.position.z = -1.5
      p.rotation.set(0, 0.15, 0)
      p.scale.set(1, 1, 1)
      p.userData.baseY = 0.04
    } else {
      p.visible = false
    }
  })
}

// Idle bob animation
export function animateIdle(pirate, t) {
  const phase = pirate.userData.animPhase
  pirate.position.y = pirate.userData.baseY + Math.sin(t * 2 + phase) * 0.012
  pirate.rotation.y = Math.sin(t * 0.8 + phase) * 0.03
}

// Vote yes — jump
export function animateVoteYes(pirate, t, startTime) {
  const elapsed = t - startTime
  if (elapsed < 0.5) {
    pirate.position.y = pirate.userData.baseY + Math.sin(elapsed * Math.PI / 0.5) * 0.35
  } else {
    pirate.position.y = pirate.userData.baseY
  }
}

// Vote no — shake
export function animateVoteNo(pirate, t, startTime) {
  const elapsed = t - startTime
  if (elapsed < 0.6) {
    pirate.rotation.y = Math.sin(elapsed * 20) * 0.2 * (1 - elapsed / 0.6)
  } else {
    pirate.rotation.y = 0
  }
}

// Walk the plank — returns true when done
export function animatePlankWalk(pirate, t, startTime) {
  const elapsed = t - startTime
  const duration = 2.0

  if (elapsed < duration * 0.6) {
    const progress = elapsed / (duration * 0.6)
    pirate.position.x = THREE.MathUtils.lerp(pirate.position.x, 3.8, 0.03)
    pirate.position.z = THREE.MathUtils.lerp(pirate.position.z, 0, 0.05)
    pirate.rotation.y = Math.PI / 2
    pirate.position.y = pirate.userData.baseY + Math.abs(Math.sin(progress * 8)) * 0.06
  } else {
    const fallProgress = (elapsed - duration * 0.6) / (duration * 0.4)
    pirate.position.y = pirate.userData.baseY - fallProgress * 3
    pirate.rotation.x = fallProgress * 1.5
    if (fallProgress >= 1) {
      pirate.visible = false
      return true
    }
  }
  return false
}
