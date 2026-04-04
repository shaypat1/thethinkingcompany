import * as THREE from 'three'

const PLAYER_COLORS = [0x00ccff, 0xcc3333, 0x3366cc, 0x33aa55, 0x9944cc, 0xee8833]
const CARD_COLORS = {
  Duke: 0x9b59b6, Assassin: 0xe74c3c, Ambassador: 0x2ecc71,
  Captain: 0x3498db, Contessa: 0xe91e63,
}

export function createCoupScene(container) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x030508)
  scene.fog = new THREE.FogExp2(0x030508, 0.015)

  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 200)
  camera.position.set(0, 12, 10)
  camera.lookAt(0, 0, 0)

  const renderer = new THREE.WebGLRenderer({ antialias: false })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(1)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.BasicShadowMap
  renderer.toneMapping = THREE.NoToneMapping

  // Lighting — dramatic, moody
  scene.add(new THREE.AmbientLight(0x111122, 0.4))

  const topLight = new THREE.PointLight(0xffcc44, 1.5, 30)
  topLight.position.set(0, 10, 0)
  topLight.castShadow = true
  scene.add(topLight)

  // Rim lights around the room
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2
    const light = new THREE.PointLight(PLAYER_COLORS[i], 0.15, 12)
    light.position.set(Math.cos(angle) * 10, 3, Math.sin(angle) * 10)
    scene.add(light)
  }

  // Floor — dark metallic
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(25, 32),
    new THREE.MeshStandardMaterial({ color: 0x080c14, roughness: 0.9, flatShading: true })
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.5
  floor.receiveShadow = true
  scene.add(floor)

  // Hexagonal table
  const tableGeo = new THREE.CylinderGeometry(5.5, 5.5, 0.3, 6)
  const tableMat = new THREE.MeshStandardMaterial({
    color: 0x0a1020, roughness: 0.6, metalness: 0.3, flatShading: true,
  })
  const table = new THREE.Mesh(tableGeo, tableMat)
  table.position.y = -0.15
  table.receiveShadow = true
  table.castShadow = true
  scene.add(table)

  // Table edge glow
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.4 })
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(tableGeo), edgeMat)
  edges.position.copy(table.position)
  scene.add(edges)

  // Center emblem — glowing ring
  const ringGeo = new THREE.TorusGeometry(1.2, 0.04, 8, 32)
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.3 })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.01
  scene.add(ring)

  // Center text glow
  const centerLight = new THREE.PointLight(0xffcc00, 0.5, 4)
  centerLight.position.set(0, 0.5, 0)
  scene.add(centerLight)

  // Player seats — 6 positions around the table
  const seats = []
  const tableRadius = 4.5
  for (let i = 0; i < 6; i++) {
    // Player 0 (human) at the front (closest to camera)
    const angle = ((i / 6) * Math.PI * 2) - Math.PI / 2
    const x = Math.cos(angle) * tableRadius
    const z = Math.sin(angle) * tableRadius
    const color = PLAYER_COLORS[i]

    // Seat marker — glowing hexagonal pad
    const padGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.05, 6)
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x0a0e1a, emissive: color, emissiveIntensity: 0.1,
      roughness: 0.5, flatShading: true,
    })
    const pad = new THREE.Mesh(padGeo, padMat)
    pad.position.set(x, 0.03, z)
    scene.add(pad)

    // Neon edge on pad
    const padEdge = new THREE.LineSegments(
      new THREE.EdgesGeometry(padGeo),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 })
    )
    padEdge.position.copy(pad.position)
    scene.add(padEdge)

    // Card slots (2 per player, positioned toward table center)
    const toCenter = Math.atan2(-z, -x)
    const cardOffset = 0.5
    const cardSlots = []

    for (let ci = 0; ci < 2; ci++) {
      const cx = x + Math.cos(toCenter) * (1.2 + ci * cardOffset)
      const cz = z + Math.sin(toCenter) * (1.2 + ci * cardOffset)
      const slotGroup = new THREE.Group()
      slotGroup.position.set(cx, 0.05, cz)
      slotGroup.rotation.y = toCenter + Math.PI

      // Face-down card
      const cardGeo = new THREE.BoxGeometry(0.5, 0.03, 0.7)
      const cardMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a3a, roughness: 0.5, flatShading: true,
        emissive: color, emissiveIntensity: 0.05,
      })
      const card = new THREE.Mesh(cardGeo, cardMat)
      card.castShadow = true
      slotGroup.add(card)

      // Card edge
      slotGroup.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(cardGeo),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3 })
      ))

      scene.add(slotGroup)
      cardSlots.push({ group: slotGroup, mesh: card, mat: cardMat, revealed: false })
    }

    // Coin stack position
    const coinX = x + Math.cos(toCenter) * 0.5
    const coinZ = z + Math.sin(toCenter) * 0.5

    seats.push({
      index: i, x, z, angle: toCenter,
      pad, padMat, cardSlots,
      coinPos: { x: coinX, z: coinZ },
      coinMeshes: [],
    })
  }

  // Coin geometry (shared)
  const coinGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 8)
  const coinMat = new THREE.MeshStandardMaterial({
    color: 0xDAA520, metalness: 0.8, roughness: 0.1, flatShading: true,
    emissive: 0xDAA520, emissiveIntensity: 0.1,
  })

  function updateCoins(seatIndex, count) {
    const seat = seats[seatIndex]
    // Remove old coins
    for (const c of seat.coinMeshes) scene.remove(c)
    seat.coinMeshes = []
    // Stack new coins
    const maxShow = Math.min(count, 10)
    for (let i = 0; i < maxShow; i++) {
      const coin = new THREE.Mesh(coinGeo, coinMat)
      coin.position.set(seat.coinPos.x, 0.07 + i * 0.045, seat.coinPos.z)
      coin.castShadow = true
      scene.add(coin)
      seat.coinMeshes.push(coin)
    }
  }

  function updateCard(seatIndex, cardIndex, state) {
    // state: 'facedown' | 'revealed' | 'empty'
    // characterName: for revealed cards
    const slot = seats[seatIndex]?.cardSlots[cardIndex]
    if (!slot) return

    if (state === 'empty') {
      slot.group.visible = false
    } else if (state === 'revealed') {
      slot.group.visible = true
      slot.mat.color.setHex(0x111111)
      slot.mat.emissiveIntensity = 0.02
      slot.mat.opacity = 0.4
      slot.mat.transparent = true
    } else {
      slot.group.visible = true
      slot.mat.color.setHex(0x1a1a3a)
      slot.mat.emissiveIntensity = 0.05
      slot.mat.transparent = false
    }
  }

  function highlightSeat(seatIndex, active) {
    const seat = seats[seatIndex]
    if (!seat) return
    seat.padMat.emissiveIntensity = active ? 0.4 : 0.1
  }

  function eliminateSeat(seatIndex) {
    const seat = seats[seatIndex]
    if (!seat) return
    seat.padMat.emissiveIntensity = 0.02
    seat.padMat.color.setHex(0x050508)
  }

  return {
    scene, camera, renderer, seats,
    updateCoins, updateCard, highlightSeat, eliminateSeat,
  }
}
