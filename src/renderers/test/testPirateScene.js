import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// ─── Retro pixel water shader ───
const retroWaterVS = `
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;
  void main() {
    vUv = uv;
    vec3 pos = position;
    float wave = sin(pos.x * 0.8 + uTime * 2.0) * 0.3 + sin(pos.z * 0.6 + uTime * 1.5) * 0.2;
    pos.y += wave;
    vWave = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`
const retroWaterFS = `
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;
  void main() {
    // Stepped color bands for retro water
    float band = floor((vUv.y * 8.0 + uTime * 0.3 + vWave * 2.0)) / 8.0;
    float flicker = step(0.5, fract(band * 4.0 + uTime * 0.5));
    vec3 dark = vec3(0.0, 0.1, 0.3);
    vec3 mid = vec3(0.0, 0.2, 0.5);
    vec3 light = vec3(0.1, 0.35, 0.65);
    vec3 color = mix(dark, mid, step(0.3, fract(band * 3.0)));
    color = mix(color, light, step(0.6, fract(band * 3.0 + 0.2)));
    // Pixel foam lines
    float foam = step(0.92, sin(vUv.x * 40.0 + uTime * 3.0 + vWave * 10.0) * 0.5 + 0.5);
    color = mix(color, vec3(0.5, 0.7, 0.9), foam * 0.4);
    gl_FragColor = vec4(color, 1.0);
  }
`

// ─── Gold bag (retro) ───
function createGoldBag() {
  const g = new THREE.Group()
  const bagMat = new THREE.MeshStandardMaterial({ color: 0x8a6a30, roughness: 0.9, flatShading: true })
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.3, metalness: 0.5, flatShading: true })

  const bag = new THREE.Mesh(new THREE.SphereGeometry(12, 6, 5), bagMat)
  bag.position.y = 10; bag.scale.set(1, 0.85, 0.9); g.add(bag)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(4, 6, 6, 6), bagMat)
  neck.position.y = 20; g.add(neck)

  for (let i = 0; i < 10; i++) {
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.5, 6), goldMat)
    const a = Math.random() * Math.PI * 2, r = Math.random() * 5
    coin.position.set(Math.cos(a) * r, 22 + Math.random() * 4, Math.sin(a) * r)
    coin.rotation.set(Math.random(), Math.random(), Math.random()); g.add(coin)
  }
  for (let i = 0; i < 15; i++) {
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.5, 6), goldMat)
    const a = Math.random() * Math.PI * 2, r = 10 + Math.random() * 15
    coin.position.set(Math.cos(a) * r, 0.3, Math.sin(a) * r)
    coin.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3); g.add(coin)
  }
  g.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
  return g
}

// ─── Platform (retro) ───
function createRaft(scene) {
  const group = new THREE.Group()
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x8a5a2e, roughness: 0.9, flatShading: true })
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x5a3a18, roughness: 0.9, flatShading: true })
  const railMat = new THREE.MeshStandardMaterial({ color: 0x6a4a22, roughness: 0.9, flatShading: true })

  // Hull — chunky low-poly
  const hull = new THREE.Mesh(new THREE.BoxGeometry(400, 20, 200), hullMat)
  hull.position.y = -5; hull.castShadow = true; hull.receiveShadow = true; group.add(hull)

  // Deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(410, 2, 210), deckMat)
  deck.position.y = 6; deck.castShadow = true; deck.receiveShadow = true; group.add(deck)

  // Deck planks — visible lines
  for (let i = -5; i <= 5; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(410, 0.3, 0.5), new THREE.MeshBasicMaterial({ color: 0x4a2a10 }))
    line.position.set(0, 7.2, i * 18); group.add(line)
  }

  // Railing — front side
  for (const x of [-190, -95, 0, 95, 190]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(4, 20, 4), railMat)
    post.position.set(x, 17, -100); post.castShadow = true; group.add(post)
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(400, 3, 3), railMat)
  rail.position.set(0, 25, -100); group.add(rail)

  // Gold bag
  const goldBag = createGoldBag()
  goldBag.position.set(0, 7, 40); group.add(goldBag)

  // Load pirate models
  const loader = new GLTFLoader()
  const mixers = []
  const pirates = [null, null, null, null, null]
  const pirateConfigs = [
    { file: 'Captain_7.glb', reskin: null, anim: 'Idle', scale: 50 },
    { file: 'Characters_Henry_1.glb', reskin: null, anim: 'Idle', scale: 50 },
    { file: 'pietro.glb', reskin: null, anim: 'Idle', scale: 50 },
    { file: 'wookho.glb', reskin: null, anim: 'Idle', scale: 50 },
    { file: 'rohan.glb', reskin: null, anim: 'Idle', scale: 50 },
  ]

  pirateConfigs.forEach((cfg, idx) => {
    loader.load(`/models/${cfg.file}`, (gltf) => {
      const model = gltf.scene
      model.scale.setScalar(cfg.scale)
      model.position.set(0, 0, -20)
      model.visible = false
      model.traverse(c => {
        if (!c.isMesh) return
        c.castShadow = true; c.receiveShadow = false // no self-shadow artifacts
        if (cfg.file.includes('Captain') && c.material) {
          const m = c.material
          if ((m.transparent && m.opacity < 0.3) || (m.map === null && m.color && m.color.r > 0.95 && m.color.g > 0.95 && m.color.b > 0.95)) {
            c.visible = false; return
          }
        }
        if (cfg.reskin && c.material && c.material.color) cfg.reskin(c)
      })
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

  const animTimeouts = {}
  function playAnimation(pirateIdx, animName, durationMs) {
    const model = pirates[pirateIdx]
    if (!model || !model.userData.mixer || !model.userData.clips) return
    const mixer = model.userData.mixer
    mixer.stopAllAction()
    if (animTimeouts[pirateIdx]) { clearTimeout(animTimeouts[pirateIdx]); delete animTimeouts[pirateIdx] }
    const clip = model.userData.clips.find(c => c.name === animName)
    if (!clip) return
    const action = mixer.clipAction(clip)
    action.loop = THREE.LoopRepeat
    action.reset().play()
    animTimeouts[pirateIdx] = setTimeout(() => {
      mixer.stopAllAction()
      const idle = model.userData.clips.find(c => c.name === 'Idle')
      if (idle) mixer.clipAction(idle).reset().play()
      delete animTimeouts[pirateIdx]
    }, durationMs || 4000)
  }

  function walkThePlank(pirateIdx) {
    const model = pirates[pirateIdx]
    if (!model) return
    if (!model.visible) model.visible = true
    if (animTimeouts[pirateIdx]) { clearTimeout(animTimeouts[pirateIdx]); delete animTimeouts[pirateIdx] }
    const hasMixer = model.userData.mixer && model.userData.clips
    const startY = model.position.y
    const startZ = model.position.z

    if (hasMixer) {
      const mixer = model.userData.mixer
      mixer.stopAllAction()
      model.rotation.y = 0
      const walkClip = model.userData.clips.find(c => c.name === 'Walk')
      if (walkClip) mixer.clipAction(walkClip).reset().play()
    }

    const startTime = performance.now()
    let plankId
    function animatePlank() {
      const elapsed = performance.now() - startTime
      if (elapsed < 2500) {
        model.position.z = startZ + (elapsed / 2500) * 150
      } else if (elapsed < 4000) {
        const fp = (elapsed - 2500) / 1500
        model.position.y = startY - fp * fp * 150
        model.position.z = startZ + 150 + fp * 30
      } else {
        model.visible = false
        return
      }
      plankId = requestAnimationFrame(animatePlank)
    }
    plankId = requestAnimationFrame(animatePlank)
  }

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

  group.userData.mixers = mixers
  group.userData.showPirates = showPirates
  group.userData.playAnimation = playAnimation
  group.userData.walkThePlank = walkThePlank
  group.userData.resetPirate = resetPirate
  group.userData.pirates = pirates

  const flag = new THREE.Object3D()
  group.add(flag)
  return { group, flag }
}

// ─── Scene ───
export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: false })
  renderer.setPixelRatio(1) // forced low-res
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.BasicShadowMap // hard pixel shadows

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x050810)

  const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 1, 20000)
  camera.position.set(0, 110, 300)
  camera.lookAt(0, 25, 0)

  // Lighting — bright, even, no harsh shadows on characters
  scene.add(new THREE.AmbientLight(0x667788, 2.5))
  const sun = new THREE.DirectionalLight(0xffffff, 2.0)
  sun.position.set(50, 200, 150)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = -200; sun.shadow.camera.right = 200
  sun.shadow.camera.top = 200; sun.shadow.camera.bottom = -200
  sun.shadow.bias = -0.005
  scene.add(sun)

  const fill = new THREE.DirectionalLight(0xaabbcc, 2.0)
  fill.position.set(0, 80, 300)
  scene.add(fill)

  const back = new THREE.DirectionalLight(0x556688, 1.0)
  back.position.set(-50, 60, -100)
  scene.add(back)

  // Retro pixel water
  const waterGeo = new THREE.PlaneGeometry(3000, 3000, 30, 30)
  waterGeo.rotateX(-Math.PI / 2)
  const waterMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: retroWaterVS,
    fragmentShader: retroWaterFS,
  })
  const water = new THREE.Mesh(waterGeo, waterMat)
  water.position.y = -2
  scene.add(water)

  // Retro sky — sphere with stepped gradient + stars
  const skyGeo = new THREE.SphereGeometry(3000, 32, 16)
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vDir;
      void main() {
        float y = vDir.y * 0.5 + 0.5;
        // Stepped gradient — retro banding (8 bands)
        float band = floor(y * 8.0) / 8.0;
        vec3 bottom = vec3(0.0, 0.12, 0.3);
        vec3 top = vec3(0.01, 0.01, 0.06);
        vec3 color = mix(bottom, top, band);
        // Stars
        float star = step(0.997, fract(sin(dot(vDir.xz * 50.0, vec2(12.9898, 78.233))) * 43758.5453));
        color += vec3(star * 0.7) * step(0.3, y);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  })
  scene.add(new THREE.Mesh(skyGeo, skyMat))

  // "SCREWY PIRATES" text in the sky — wait for font then render
  function addSkyText() {
    const c = document.createElement('canvas')
    c.width = 2048; c.height = 512
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, 2048, 512)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff'
    ctx.font = '700 140px "Press Start 2P", monospace'
    ctx.fillText('SCREWY', 1024, 170)
    ctx.font = '700 200px "Press Start 2P", monospace'
    ctx.fillText('PIRATES', 1024, 370)

    const tex = new THREE.CanvasTexture(c)
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(2200, 600),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.7 })
    )
    plane.position.set(0, 350, -2500)
    scene.add(plane)
  }
  // Delay to let font load
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(addSkyText)
  } else {
    setTimeout(addSkyText, 1000)
  }

  // Platform
  const { group: raftGroup, flag } = createRaft(scene)
  raftGroup.position.y = 5
  scene.add(raftGroup)

  // Render loop
  let animId
  function animate() {
    animId = requestAnimationFrame(animate)
    const time = performance.now() * 0.001

    // Animate water
    waterMat.uniforms.uTime.value = time

    // Platform sway
    raftGroup.position.y = 5 + Math.sin(time * 0.4) * 0.5
    raftGroup.rotation.x = Math.sin(time * 0.3) * 0.004
    raftGroup.rotation.z = Math.sin(time * 0.25 + 1) * 0.003

    // Mixers
    const delta = 1 / 60
    if (raftGroup.userData.mixers) raftGroup.userData.mixers.forEach(m => m.update(delta))

    // Static model sway
    raftGroup.children.forEach(child => {
      if (child.userData && child.userData.staticBob) {
        const p = child.userData.bobPhase
        child.position.y = child.userData.baseY
        child.rotation.z = Math.sin(time * 1.5 + p) * 0.03
        child.rotation.x = Math.sin(time * 1.2 + p * 1.3) * 0.02
        child.rotation.y = Math.sin(time * 0.8 + p) * 0.05
        child.scale.setScalar(50)
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
    dispose() { cancelAnimationFrame(animId); window.removeEventListener('resize', handleResize); renderer.dispose() }
  }
}

export function animateOcean() {}
export function animateSharks() {}
export function animateRaft() {}
export function animateFlag() {}
export function animateCoinsToTarget() {}
