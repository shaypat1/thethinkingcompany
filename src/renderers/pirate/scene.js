import * as THREE from 'three'
import { Water } from 'three/examples/jsm/objects/Water.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// ─── Gold bag ───
function createGoldBag() {
  const g = new THREE.Group()
  const bagMat = new THREE.MeshStandardMaterial({ color: 0x6a5030, roughness: 0.8 })
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xDAA520, roughness: 0.05, metalness: 0.95 })

  const bag = new THREE.Mesh(new THREE.SphereGeometry(12, 14, 12), bagMat)
  bag.position.y = 10; bag.scale.set(1, 0.85, 0.9); g.add(bag)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(4, 6, 6, 10), bagMat)
  neck.position.y = 20; g.add(neck)
  const rope = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.5, 8, 14), new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.9 }))
  rope.position.y = 21; rope.rotation.x = Math.PI / 2; g.add(rope)

  for (let i = 0; i < 12; i++) {
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.3, 12), goldMat)
    const a = Math.random() * Math.PI * 2, r = Math.random() * 5
    coin.position.set(Math.cos(a) * r, 22 + Math.random() * 4, Math.sin(a) * r)
    coin.rotation.set(Math.random(), Math.random(), Math.random()); g.add(coin)
  }
  for (let i = 0; i < 20; i++) {
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.3, 12), goldMat)
    const a = Math.random() * Math.PI * 2, r = 10 + Math.random() * 15
    coin.position.set(Math.cos(a) * r, 0.3, Math.sin(a) * r)
    coin.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3); g.add(coin)
  }
  const glow = new THREE.PointLight(0xffcc44, 5, 60)
  glow.position.set(0, 25, 0); g.add(glow)
  g.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
  return g
}

// ─── Platform ───
function createRaft(scene) {
  const group = new THREE.Group()
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.85 })
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x4a2d14, roughness: 0.8 })
  const railMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.8 })

  const hull = new THREE.Mesh(new THREE.BoxGeometry(400, 20, 200), hullMat)
  hull.position.y = -5; hull.castShadow = true; hull.receiveShadow = true; group.add(hull)

  const deck = new THREE.Mesh(new THREE.BoxGeometry(410, 2, 210), deckMat)
  deck.position.y = 6; deck.castShadow = true; deck.receiveShadow = true; group.add(deck)

  // Railing — front side only (closest to camera, z = -100)
  for (const x of [-190, -95, 0, 95, 190]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 20, 8), railMat)
    post.position.set(x, 17, -100); post.castShadow = true; group.add(post)
  }
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 400, 8), railMat)
  rail.rotation.z = Math.PI / 2; rail.position.set(0, 25, -100); group.add(rail)
  const railLow = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 400, 8), railMat)
  railLow.rotation.z = Math.PI / 2; railLow.position.set(0, 15, -100); group.add(railLow)

  // Gold bag
  const goldBag = createGoldBag()
  goldBag.position.set(0, 7, 40)
  group.add(goldBag)

  // Load pirate models — 5 characters in a row
  const loader = new GLTFLoader()
  const mixers = []

  function isSkinColor(col) {
    return col.r > 0.35 && col.r < 0.95 && col.g > 0.2 && col.g < 0.75 && col.b > 0.08 && col.b < 0.55 && col.r > col.b * 1.2
  }
  function isHairColor(col) {
    return col.r < 0.3 && col.g < 0.25 && col.b < 0.2
  }
  function isClothDark(col) {
    return col.r < 0.15 && col.g < 0.15 && col.b < 0.15
  }

  function loadPirate(file, pos, rotY, reskin, animName, scale) {
    loader.load(`/models/${file}`, (gltf) => {
      const model = gltf.scene
      model.scale.setScalar(scale || 30)
      model.position.copy(pos)
      model.rotation.y = rotY
      model.traverse(c => {
        if (!c.isMesh) return
        c.castShadow = true; c.receiveShadow = true
        // Remove white artifacts on Captain model
        if (file.includes('Captain') && c.material) {
          const m = c.material
          if ((m.transparent && m.opacity < 0.3) || (m.map === null && m.color && m.color.r > 0.95 && m.color.g > 0.95 && m.color.b > 0.95)) {
            c.visible = false; return
          }
        }
        if (reskin && c.material && c.material.color) {
          reskin(c)
        }
      })
      // Play animation or mark for code-based bob
      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(model)
        const clip = gltf.animations.find(a => a.name === (animName || 'Idle')) || gltf.animations.find(a => a.name === 'Idle') || gltf.animations[3]
        if (clip) { mixer.clipAction(clip).play() }
        mixers.push(mixer)
        model.userData.mixer = mixer
        model.userData.animations = gltf.animations
      } else {
        // Static model — plant feet on deck
        // Compute bounding box to find the bottom of the model
        const box = new THREE.Box3().setFromObject(model)
        const bottomY = box.min.y
        // Shift model up so feet sit on deck (deck surface is at y ≈ 7 in group space)
        model.position.y = 7 - bottomY
        model.userData.staticBob = true
        model.userData.baseY = model.position.y
        model.userData.bobPhase = Math.random() * Math.PI * 2
      }
      group.add(model)
    })
  }

  // Pirates array — indexed by order. All loaded, initially hidden.
  const pirates = [null, null, null, null, null]
  const pirateConfigs = [
    { file: 'Captain_7.glb', reskin: null, anim: 'Idle', scale: 50 },
    { file: 'Characters_Henry_1.glb', reskin: (c) => { if (isSkinColor(c.material.color)) { c.material = c.material.clone(); c.material.color.setHex(0xf5dcc0) } }, anim: 'Idle', scale: 50 },
    { file: 'pietro.glb', reskin: null, anim: 'Idle', scale: 50 },
    { file: 'wookho.glb', reskin: null, anim: 'Idle', scale: 50 },
    { file: 'rohan.glb', reskin: null, anim: 'Idle', scale: 50 },
  ]

  pirateConfigs.forEach((cfg, idx) => {
    loader.load(`/models/${cfg.file}`, (gltf) => {
      const model = gltf.scene
      model.scale.setScalar(cfg.scale)
      model.position.set(0, 0, -20)
      model.visible = false // hidden until activated
      model.traverse(c => {
        if (!c.isMesh) return
        c.castShadow = true; c.receiveShadow = true
        if (cfg.file.includes('Captain') && c.material) {
          const m = c.material
          if ((m.transparent && m.opacity < 0.3) || (m.map === null && m.color && m.color.r > 0.95 && m.color.g > 0.95 && m.color.b > 0.95)) {
            c.visible = false; return
          }
        }
        if (cfg.reskin && c.material && c.material.color) cfg.reskin(c)
      })
      // Plant feet on deck — compute once and store
      const box = new THREE.Box3().setFromObject(model)
      const feetY = 7 - box.min.y
      model.position.y = feetY
      model.userData.feetY = feetY

      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(model)
        const clip = gltf.animations.find(a => a.name === cfg.anim) || gltf.animations[3]
        if (clip) mixer.clipAction(clip).play()
        mixers.push(mixer)
        model.userData.mixer = mixer
        model.userData.clips = gltf.animations
      } else {
        model.userData.staticBob = true
        model.userData.baseY = model.position.y
        model.userData.bobPhase = Math.random() * Math.PI * 2
      }
      pirates[idx] = model
      group.add(model)
    })
  })

  // Function to show N pirates and center them on platform
  function showPirates(count) {
    const spacing = 80
    const startX = -(count - 1) * spacing / 2
    for (let i = 0; i < 5; i++) {
      if (!pirates[i]) continue
      if (i < count) {
        resetPirate(i)
        pirates[i].visible = true
        pirates[i].position.x = startX + i * spacing
        pirates[i].position.z = -20
        pirates[i].position.y = pirates[i].userData.feetY || 7
      } else {
        pirates[i].visible = false
      }
    }
  }

  // Play a specific animation on a pirate by index
  // Loops for `durationMs` then returns to Idle
  const animTimeouts = {}
  function playAnimation(pirateIdx, animName, durationMs) {
    const model = pirates[pirateIdx]
    if (!model || !model.userData.mixer || !model.userData.clips) return
    const mixer = model.userData.mixer
    mixer.stopAllAction()
    // Cancel any pending return-to-idle timeout
    if (animTimeouts[pirateIdx]) { clearTimeout(animTimeouts[pirateIdx]); delete animTimeouts[pirateIdx] }
    const clip = model.userData.clips.find(c => c.name === animName)
    if (!clip) return
    const action = mixer.clipAction(clip)
    action.loop = THREE.LoopRepeat
    action.reset().play()

    // Return to Idle after duration (default 4 seconds)
    animTimeouts[pirateIdx] = setTimeout(() => {
      mixer.stopAllAction()
      const idle = model.userData.clips.find(c => c.name === 'Idle')
      if (idle) mixer.clipAction(idle).reset().play()
      delete animTimeouts[pirateIdx]
    }, durationMs || 4000)
  }

  // Walk the plank — captain walks to the edge and falls off
  let plankAnimId = null
  function walkThePlank(pirateIdx, onComplete) {
    const model = pirates[pirateIdx]
    if (!model) return
    if (!model.visible) model.visible = true
    // Cancel any pending animation timeout so it doesn't interrupt the walk
    if (animTimeouts[pirateIdx]) { clearTimeout(animTimeouts[pirateIdx]); delete animTimeouts[pirateIdx] }
    const hasMixer = model.userData.mixer && model.userData.clips

    const startX = model.position.x
    const startY = model.position.y
    const startZ = model.position.z
    const startRotY = model.rotation.y

    if (hasMixer) {
      const mixer = model.userData.mixer
      mixer.stopAllAction()
      // Face away from camera (walk toward back edge)
      model.rotation.y = 0
      const walkClip = model.userData.clips.find(c => c.name === 'Walk')
      if (walkClip) { mixer.clipAction(walkClip).reset().play() }
    }

    const startTime = performance.now()
    const walkDuration = 2000
    const fallDuration = 1500

    function animatePlank() {
      const elapsed = performance.now() - startTime

      if (elapsed < walkDuration) {
        const progress = elapsed / walkDuration
        // Walk away from camera (+Z), toward back edge and off
        model.position.z = startZ + progress * 150
      } else if (elapsed < walkDuration + fallDuration) {
        const fallElapsed = elapsed - walkDuration
        if (fallElapsed < 50 && hasMixer) {
          const mixer = model.userData.mixer
          mixer.stopAllAction()
          const jumpClip = model.userData.clips.find(c => c.name === 'Jump')
          if (jumpClip) {
            const action = mixer.clipAction(jumpClip)
            action.loop = THREE.LoopOnce
            action.clampWhenFinished = false
            action.reset().play()
          }
        }
        const fallProgress = fallElapsed / fallDuration
        model.position.y = startY - fallProgress * fallProgress * 150
        model.position.z = startZ + 150 + fallProgress * 30
      } else {
        // Done — hide and fully reset
        cancelAnimationFrame(plankAnimId)
        model.visible = false
        if (onComplete) onComplete()
        return
      }

      plankAnimId = requestAnimationFrame(animatePlank)
    }

    plankAnimId = requestAnimationFrame(animatePlank)
  }

  // Reset a pirate to clean state (position, rotation, animation)
  function resetPirate(pirateIdx) {
    const model = pirates[pirateIdx]
    if (!model) return
    model.rotation.set(0, 0, 0)
    model.scale.setScalar(pirateConfigs[pirateIdx].scale)
    model.position.y = model.userData.feetY || 7
    if (model.userData.mixer) {
      model.userData.mixer.stopAllAction()
      const idle = model.userData.clips?.find(c => c.name === 'Idle')
      if (idle) model.userData.mixer.clipAction(idle).reset().play()
    }
  }

  // Animate coins from bag to pirate feet
  const flyingCoins = []
  const coinGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.3, 12)
  const coinMat = new THREE.MeshStandardMaterial({ color: 0xDAA520, roughness: 0.05, metalness: 0.95 })

  function distributeCoins(proposal) {
    // Clean up any previous flying coins
    for (const c of flyingCoins) { scene.remove(c.mesh); c.mesh.geometry.dispose() }
    flyingCoins.length = 0

    // Bag world position (bag is at group local (0, 7, 40))
    const bagWorld = new THREE.Vector3()
    group.localToWorld(bagWorld.set(0, 30, 40))

    let delay = 0
    for (let i = 0; i < proposal.length; i++) {
      if (proposal[i] <= 0 || !pirates[i] || !pirates[i].visible) continue

      // Target: pirate's feet
      const pirateBox = new THREE.Box3().setFromObject(pirates[i])
      const targetX = (pirateBox.max.x + pirateBox.min.x) / 2
      const targetY = pirateBox.min.y + 2
      const targetZ = (pirateBox.max.z + pirateBox.min.z) / 2

      // Number of visible coins: 1-4 based on amount
      const numCoins = Math.min(4, Math.max(1, Math.ceil(proposal[i] / 25)))

      for (let c = 0; c < numCoins; c++) {
        const coin = new THREE.Mesh(coinGeo, coinMat.clone())
        coin.visible = false
        scene.add(coin)

        const coinDelay = delay + c * 120
        const duration = 800 + Math.random() * 200
        const startTime = performance.now() + coinDelay
        const arcHeight = 30 + Math.random() * 15
        const offsetX = (Math.random() - 0.5) * 4
        const offsetZ = (Math.random() - 0.5) * 4

        flyingCoins.push({
          mesh: coin,
          startTime,
          duration,
          from: bagWorld.clone(),
          to: new THREE.Vector3(targetX + offsetX, targetY, targetZ + offsetZ),
          arcHeight,
          landed: false,
        })
      }
      delay += 300
    }
  }

  // Update flying coins each frame (called from render loop)
  function updateFlyingCoins() {
    const now = performance.now()
    for (const c of flyingCoins) {
      if (c.landed) continue
      const elapsed = now - c.startTime
      if (elapsed < 0) { c.mesh.visible = false; continue }

      c.mesh.visible = true
      const t = Math.min(1, elapsed / c.duration)
      // Ease out
      const ease = 1 - Math.pow(1 - t, 3)

      c.mesh.position.lerpVectors(c.from, c.to, ease)
      // Arc
      c.mesh.position.y += Math.sin(t * Math.PI) * c.arcHeight
      // Spin
      c.mesh.rotation.y = t * Math.PI * 4
      c.mesh.rotation.x = t * Math.PI * 2

      if (t >= 1) {
        c.landed = true
        c.mesh.position.copy(c.to)
        c.mesh.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3)
      }
    }
  }

  function clearFlyingCoins() {
    for (const c of flyingCoins) { scene.remove(c.mesh) }
    flyingCoins.length = 0
  }

  group.userData.mixers = mixers
  group.userData.showPirates = showPirates
  group.userData.playAnimation = playAnimation
  group.userData.walkThePlank = walkThePlank
  group.userData.resetPirate = resetPirate
  group.userData.distributeCoins = distributeCoins
  group.userData.clearFlyingCoins = clearFlyingCoins
  group.userData._updateFlyingCoins = updateFlyingCoins
  group.userData.pirates = pirates

  // Dummy flag ref
  const flag = new THREE.Object3D()
  group.add(flag)

  return { group, flag }
}

// ─── Scene ───
export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.5
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const bloomPass = new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), 1.5, 0.4, 0.85)
  bloomPass.threshold = 0; bloomPass.strength = 0.1; bloomPass.radius = 0
  if (renderer.setEffects) renderer.setEffects([bloomPass])

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 1, 20000)
  camera.position.set(0, 110, 300)
  camera.lookAt(0, 20, 0)

  const sun = new THREE.Vector3()

  // Water
  const water = new Water(new THREE.PlaneGeometry(10000, 10000), {
    textureWidth: 512, textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load('/textures/waternormals.jpg', t => { t.wrapS = t.wrapT = THREE.RepeatWrapping }),
    sunDirection: new THREE.Vector3(), sunColor: 0xffffff, waterColor: 0x001e0f,
    distortionScale: 3.7, fog: scene.fog !== undefined,
  })
  water.rotation.x = -Math.PI / 2; scene.add(water)

  // Sky
  const sky = new Sky(); sky.scale.setScalar(10000); scene.add(sky)
  const skyU = sky.material.uniforms
  skyU['turbidity'].value = 10; skyU['rayleigh'].value = 2
  skyU['mieCoefficient'].value = 0.005; skyU['mieDirectionalG'].value = 0.8
  if (skyU['cloudCoverage']) skyU['cloudCoverage'].value = 0.4
  if (skyU['cloudDensity']) skyU['cloudDensity'].value = 0.5
  if (skyU['cloudElevation']) skyU['cloudElevation'].value = 0.5

  const params = { elevation: 20, azimuth: 180 }
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envScene = new THREE.Scene()
  let rt

  function updateSun() {
    sun.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - params.elevation), THREE.MathUtils.degToRad(params.azimuth))
    skyU['sunPosition'].value.copy(sun)
    water.material.uniforms['sunDirection'].value.copy(sun).normalize()
    if (rt) rt.dispose()
    envScene.add(sky); rt = pmrem.fromScene(envScene); scene.add(sky)
    scene.environment = rt.texture
  }
  updateSun()

  // Lighting
  const dirLight = new THREE.DirectionalLight(0xffeedd, 3)
  dirLight.position.set(120, 200, 150); dirLight.target.position.set(0, 10, 0)
  dirLight.castShadow = true; dirLight.shadow.mapSize.set(2048, 2048)
  dirLight.shadow.camera.left = -200; dirLight.shadow.camera.right = 200
  dirLight.shadow.camera.top = 200; dirLight.shadow.camera.bottom = -200
  scene.add(dirLight); scene.add(dirLight.target)
  scene.add(new THREE.AmbientLight(0x445566, 1.5))

  // Platform
  const { group: raftGroup, flag } = createRaft(scene)
  raftGroup.position.y = 5; scene.add(raftGroup)

  // Render loop
  let animId
  function animate() {
    animId = requestAnimationFrame(animate)
    const time = performance.now() * 0.001

    water.material.uniforms['time'].value += 1.0 / 60.0
    if (skyU['time']) skyU['time'].value = time

    raftGroup.position.y = 5 + Math.sin(time * 0.4) * 0.5
    raftGroup.rotation.x = Math.sin(time * 0.3) * 0.004
    raftGroup.rotation.z = Math.sin(time * 0.25 + 1) * 0.003

    // Animate pirate models
    const delta = 1 / 60
    if (raftGroup.userData.mixers) {
      raftGroup.userData.mixers.forEach(m => m.update(delta))
    }
    // Flying coins
    if (raftGroup.userData._updateFlyingCoins) raftGroup.userData._updateFlyingCoins()
    // Idle sway for static models — feet stay planted, body rocks
    raftGroup.children.forEach(child => {
      if (child.userData && child.userData.staticBob) {
        const p = child.userData.bobPhase
        child.position.y = child.userData.baseY
        child.scale.setScalar(50)
        // Gentle lean/rock from the base — simulates upper body movement
        child.rotation.z = Math.sin(time * 1.5 + p) * 0.03
        child.rotation.x = Math.sin(time * 1.2 + p * 1.3) * 0.02
        child.rotation.y = Math.sin(time * 0.8 + p) * 0.05
      }
    })

    renderer.render(scene, camera)
  }
  animate()

  function handleResize() {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
  }
  window.addEventListener('resize', handleResize)

  return {
    renderer, scene, camera, water, raftGroup, flag,
    dispose() { cancelAnimationFrame(animId); window.removeEventListener('resize', handleResize); if (rt) rt.dispose(); renderer.dispose() }
  }
}

export function animateOcean() {}
export function animateSharks() {}
export function animateRaft() {}
export function animateFlag() {}
export function animateCoinsToTarget() {}
