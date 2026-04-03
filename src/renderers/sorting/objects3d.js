import * as THREE from 'three'

const COLORS = [0x4a90d9, 0xe67e22, 0x27ae60, 0x8e44ad, 0xe74c3c, 0xf1c40f, 0x1abc9c, 0xcc5599,
  0x3498db, 0xd35400, 0x2ecc71, 0x9b59b6, 0xc0392b, 0xf39c12, 0x16a085, 0xe91e63]

function makeLabel(text, bg) {
  const c = document.createElement('canvas')
  c.width = 128; c.height = 128
  const ctx = c.getContext('2d')
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, 128, 128) }
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 60px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(text), 64, 64)
  return new THREE.CanvasTexture(c)
}

export function createCrate(value, index, faceDown) {
  const g = new THREE.Group()
  const color = COLORS[index % COLORS.length]

  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.15 })
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), mat)
  box.castShadow = true
  box.receiveShadow = true
  g.add(box)

  // Edge lines
  g.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(box.geometry),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 })
  ))

  // Labels (front + top)
  const labelTex = faceDown ? makeLabel('?', 'rgba(30,30,50,0.6)') : makeLabel(value, 'rgba(0,0,0,0.25)')
  const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true })

  const front = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), labelMat)
  front.position.z = 0.426
  g.add(front)

  const top = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), labelMat.clone())
  top.position.y = 0.426
  top.rotation.x = -Math.PI / 2
  g.add(top)

  g.userData = {
    type: 'crate', value, index, color, mat, faceDown: !!faceDown,
    baseY: 0, targetX: 0, targetY: 0, targetZ: 0,
    selected: false, placed: false, revealed: false,
  }
  return g
}

export function revealCrate(crate, value) {
  crate.userData.faceDown = false
  crate.userData.revealed = true
  const tex = makeLabel(value, 'rgba(0,0,0,0.25)')
  crate.children.forEach(child => {
    if (child.material?.map) {
      child.material.map.dispose()
      child.material.map = tex
      child.material.needsUpdate = true
    }
  })
}

export function setSelected(crate, sel) {
  crate.userData.selected = sel
  const m = crate.userData.mat
  if (sel) {
    m.emissive.setHex(crate.userData.color)
    m.emissiveIntensity = 0.5
    crate.userData.targetY = crate.userData.baseY + 0.5
  } else {
    m.emissive.setHex(0x000000)
    m.emissiveIntensity = 0
    crate.userData.targetY = crate.userData.baseY
  }
}

export function setPlaced(crate) {
  crate.userData.placed = true
  crate.userData.mat.emissive.setHex(0x22aa44)
  crate.userData.mat.emissiveIntensity = 0.25
}

export function setEliminated(crate) {
  crate.userData.mat.opacity = 0.25
  crate.userData.mat.transparent = true
  crate.userData.targetY = crate.userData.baseY - 0.3
}

export function setBuzz(crate) {
  const m = crate.userData.mat
  const orig = crate.userData.color
  m.emissive.setHex(0xff0000)
  m.emissiveIntensity = 0.6
  setTimeout(() => { m.emissive.setHex(0x000000); m.emissiveIntensity = 0 }, 300)
}

export function animateCrates(crates, t) {
  for (const c of crates) {
    const d = c.userData
    c.position.x += (d.targetX - c.position.x) * 0.12
    c.position.y += (d.targetY - c.position.y) * 0.12
    c.position.z += (d.targetZ - c.position.z) * 0.12
    if (d.selected) {
      c.position.y = d.targetY + Math.sin(t * 3.5) * 0.04
    }
  }
}
