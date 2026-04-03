import * as THREE from 'three'
import { TILE_SIZE } from './testScene3d'

// Retro arcade colors
const GOLD = 0xffcc00
const LAMP_OFF = 0x222244
const LAMP_ON = 0x00ffaa
const TARGET_GREEN = 0x00ff66

export function createGear(x, z) {
  const group = new THREE.Group()
  // Gear body — torus
  const gearMat = new THREE.MeshStandardMaterial({
    color: GOLD,
    metalness: 0.8,
    roughness: 0.15,
    emissive: GOLD,
    emissiveIntensity: 0.3,
  })
  const torus = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.06, 8, 12), gearMat)
  torus.rotation.x = Math.PI / 2
  group.add(torus)

  // Teeth
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.06), gearMat)
    tooth.position.set(Math.cos(angle) * 0.22, 0, Math.sin(angle) * 0.22)
    group.add(tooth)
  }

  // Center hub
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 6), gearMat)
  hub.rotation.x = Math.PI / 2
  group.add(hub)

  // Glow light
  const light = new THREE.PointLight(GOLD, 0.4, 2)
  light.position.y = 0.2
  group.add(light)

  group.position.set(x, 0.3, z)
  group.userData = { type: 'gear', collected: false, baseY: 0.3 }
  return group
}

export function createLamp(x, z) {
  const group = new THREE.Group()

  // Post
  const postMat = new THREE.MeshStandardMaterial({ color: LAMP_OFF, roughness: 0.5, metalness: 0.4 })
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.4, 6), postMat)
  post.position.y = 0.2
  group.add(post)

  // Bulb (off state)
  const bulbMat = new THREE.MeshStandardMaterial({
    color: LAMP_OFF,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.3,
  })
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), bulbMat)
  bulb.position.y = 0.5
  group.add(bulb)

  // Light (off)
  const light = new THREE.PointLight(LAMP_ON, 0, 3)
  light.position.y = 0.5
  group.add(light)

  group.position.set(x, 0.05, z)
  group.userData = { type: 'lamp', lit: false, bulbMat, light }
  return group
}

export function lightUpLamp(lamp) {
  const d = lamp.userData
  d.lit = true
  d.bulbMat.color.setHex(LAMP_ON)
  d.bulbMat.emissive.setHex(LAMP_ON)
  d.bulbMat.emissiveIntensity = 0.8
  d.light.intensity = 1.0
}

export function createTarget(x, z) {
  const group = new THREE.Group()

  const ringMat = new THREE.MeshStandardMaterial({
    color: TARGET_GREEN,
    emissive: TARGET_GREEN,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.7,
  })
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 8, 24), ringMat)
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.06
  group.add(ring)

  // Inner glow
  const inner = new THREE.Mesh(
    new THREE.CircleGeometry(0.25, 16),
    new THREE.MeshStandardMaterial({
      color: TARGET_GREEN,
      emissive: TARGET_GREEN,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.3,
    })
  )
  inner.rotation.x = -Math.PI / 2
  inner.position.y = 0.06
  group.add(inner)

  const light = new THREE.PointLight(TARGET_GREEN, 0.3, 2)
  light.position.y = 0.2
  group.add(light)

  group.position.set(x, 0, z)
  group.userData = { type: 'target' }
  return group
}

export function animateObjects(objects, t) {
  for (const obj of objects) {
    if (obj.userData.type === 'gear' && !obj.userData.collected) {
      obj.rotation.y = t * 1.5
      obj.position.y = obj.userData.baseY + Math.sin(t * 2) * 0.05
    }
    if (obj.userData.type === 'target') {
      obj.children[0].rotation.z = t * 0.5 // ring rotates
    }
  }
}

export function collectGear(gear) {
  gear.userData.collected = true
  gear.visible = false
}
