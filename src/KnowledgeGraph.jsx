import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { nodes, edges, nodesMap } from './data.js'

// ── Constants ─────────────────────────────────────────────────────────────────
const SPHERE_RADIUS = 12
const NODE_R = 0.32
const MAX_YEARS = 4 // for experience bar

const CAT_COLORS = {
  frontend: new THREE.Color(0x22d3ee),
  backend:  new THREE.Color(0xa855f7),
  devops:   new THREE.Color(0xfb923c),
  aiml:     new THREE.Color(0xf472b6),
}

// Cluster centres – each category occupies a quadrant on the sphere
const CLUSTER_CENTERS = {
  frontend: new THREE.Vector3( 1,  0.7,  0.5).normalize(),
  backend:  new THREE.Vector3(-1,  0.7, -0.5).normalize(),
  devops:   new THREE.Vector3( 0.5, -0.7, -1).normalize(),
  aiml:     new THREE.Vector3(-0.5, -0.7,  1).normalize(),
}

// ── Seeded RNG (LCG) ──────────────────────────────────────────────────────────
function seededRng(seed) {
  let s = seed >>> 0
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 >>> 0
    return s / 4294967295
  }
}

// ── Glow sprite texture ───────────────────────────────────────────────────────
function makeGlowTexture(color) {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const r = Math.round(color.r * 255)
  const g = Math.round(color.g * 255)
  const b = Math.round(color.b * 255)
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0,    `rgba(${r},${g},${b},1)`)
  grad.addColorStop(0.35, `rgba(${r},${g},${b},0.35)`)
  grad.addColorStop(1,    `rgba(${r},${g},${b},0)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

// ── Label sprite texture ──────────────────────────────────────────────────────
function makeLabelTexture(text) {
  const W = 256, H = 52
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, W, H)
  // background pill
  ctx.fillStyle = 'rgba(3, 7, 18, 0.82)'
  ctx.beginPath()
  ctx.roundRect(3, 3, W - 6, H - 6, 9)
  ctx.fill()
  // text
  ctx.font = '600 26px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(226, 232, 240, 0.95)'
  ctx.fillText(text, W / 2, H / 2)
  return new THREE.CanvasTexture(canvas)
}

// ── Node positions (deterministic) ───────────────────────────────────────────
function buildNodePositions() {
  const rng = seededRng(7)
  const positions = {}
  nodes.forEach(node => {
    const center = CLUSTER_CENTERS[node.category]
    const SPREAD = 0.55 // radians ≈ 31°

    const u = rng(), v = rng()
    const theta = SPREAD * Math.sqrt(u)
    const phi   = 2 * Math.PI * v

    // build local tangent frame around cluster centre
    const ref = Math.abs(center.y) < 0.99
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0)
    const t1 = new THREE.Vector3().crossVectors(center, ref).normalize()
    const t2 = new THREE.Vector3().crossVectors(center, t1).normalize()

    const pos = new THREE.Vector3()
    pos.addScaledVector(center, Math.cos(theta))
    pos.addScaledVector(t1, Math.sin(theta) * Math.cos(phi))
    pos.addScaledVector(t2, Math.sin(theta) * Math.sin(phi))
    // small radial jitter 0.85–1.15
    pos.multiplyScalar(SPHERE_RADIUS * (0.85 + rng() * 0.3))

    positions[node.id] = pos
  })
  return positions
}

const NODE_POSITIONS = buildNodePositions()

// ── Cached glow textures (one per category) ───────────────────────────────────
const GLOW_TEXTURES = Object.fromEntries(
  Object.entries(CAT_COLORS).map(([k, c]) => [k, makeGlowTexture(c)])
)
const WHITE_GLOW_TEX = makeGlowTexture(new THREE.Color(1, 1, 1))

// ── Main component ────────────────────────────────────────────────────────────
export function KnowledgeGraph({ activeCategories, onNodeSelect }) {
  const mountRef = useRef(null)
  // mutable refs shared between setup and later effects
  const objsRef     = useRef({})   // nodeId → { mesh, glow, label, selGlow? }
  const linesRef    = useRef({})   // 'src-tgt' → Line
  const hoveredRef  = useRef(null)
  const selectedRef = useRef(null)
  const activeCatRef  = useRef(activeCategories)
  const onSelectRef   = useRef(onNodeSelect)

  // keep callback ref fresh
  useEffect(() => { onSelectRef.current = onNodeSelect }, [onNodeSelect])

  // ── keep activeCategories ref and update visibility ──────────────────────
  useEffect(() => {
    activeCatRef.current = activeCategories
    const objs  = objsRef.current
    const lines = linesRef.current
    if (!Object.keys(objs).length) return

    nodes.forEach(n => {
      const vis = activeCategories.has(n.category)
      const o   = objs[n.id]
      if (!o) return
      o.mesh.visible  = vis
      o.glow.visible  = vis
      o.label.visible = false // labels shown on hover only
      if (o.selGlow) o.selGlow.visible = vis
    })

    Object.values(lines).forEach(line => {
      const { source, target } = line.userData
      line.visible =
        activeCategories.has(nodesMap[source]?.category) &&
        activeCategories.has(nodesMap[target]?.category)
    })
  }, [activeCategories])

  // ── One-time scene setup ──────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // ── Scene / Camera / Renderer ─────────────────────────────────────────
    const scene    = new THREE.Scene()
    scene.background = new THREE.Color(0x030712)
    const camera   = new THREE.PerspectiveCamera(58, mount.clientWidth / mount.clientHeight, 0.1, 800)
    camera.position.set(0, 4, 30)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    // ── OrbitControls ─────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping    = true
    controls.dampingFactor    = 0.06
    controls.minDistance      = 14
    controls.maxDistance      = 55
    controls.autoRotate       = true
    controls.autoRotateSpeed  = 0.35

    // ── Lighting ──────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.4))
    const pl1 = new THREE.PointLight(0x4facfe, 3, 120)
    pl1.position.set(25, 25, 20)
    scene.add(pl1)
    const pl2 = new THREE.PointLight(0xf093fb, 3, 120)
    pl2.position.set(-25, -25, 20)
    scene.add(pl2)
    const pl3 = new THREE.PointLight(0xfb923c, 2, 80)
    pl3.position.set(0, -25, -20)
    scene.add(pl3)

    // ── Starfield ─────────────────────────────────────────────────────────
    const STARS = 5000
    const starPos = new Float32Array(STARS * 3)
    for (let i = 0; i < STARS; i++) {
      const r     = 100 + Math.random() * 200
      const theta = Math.acos(2 * Math.random() - 1)
      const phi   = 2 * Math.PI * Math.random()
      starPos[i * 3]     = r * Math.sin(theta) * Math.cos(phi)
      starPos[i * 3 + 1] = r * Math.cos(theta)
      starPos[i * 3 + 2] = r * Math.sin(theta) * Math.sin(phi)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.25, sizeAttenuation: true, transparent: true, opacity: 0.75 })
    scene.add(new THREE.Points(starGeo, starMat))

    // ── Ghost sphere guide ────────────────────────────────────────────────
    const ghostGeo = new THREE.SphereGeometry(SPHERE_RADIUS, 32, 24)
    const ghostMat = new THREE.MeshBasicMaterial({ color: 0x1e3a5f, wireframe: true, transparent: true, opacity: 0.07 })
    const ghostSphere = new THREE.Mesh(ghostGeo, ghostMat)
    scene.add(ghostSphere)

    // ── Node meshes ───────────────────────────────────────────────────────
    const objs  = {}
    const lines = {}
    const meshList = [] // for raycasting

    nodes.forEach(node => {
      const pos   = NODE_POSITIONS[node.id]
      const color = CAT_COLORS[node.category]

      // main sphere
      const mat  = new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.5,
        roughness: 0.3, metalness: 0.4, transparent: true,
      })
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(NODE_R, 20, 20), mat)
      mesh.position.copy(pos)
      mesh.userData.nodeId = node.id
      scene.add(mesh)
      meshList.push(mesh)

      // glow sprite
      const glowMat = new THREE.SpriteMaterial({
        map: GLOW_TEXTURES[node.category],
        blending: THREE.AdditiveBlending,
        transparent: true, opacity: 0.65, depthWrite: false,
      })
      const glow = new THREE.Sprite(glowMat)
      glow.position.copy(pos)
      glow.scale.set(2.2, 2.2, 1)
      scene.add(glow)

      // label sprite (hidden by default)
      const labelMat = new THREE.SpriteMaterial({
        map: makeLabelTexture(node.label),
        transparent: true, opacity: 0, depthWrite: false,
      })
      const label = new THREE.Sprite(labelMat)
      label.position.copy(pos).add(new THREE.Vector3(0, NODE_R + 0.7, 0))
      label.scale.set(2.8, 0.62, 1)
      scene.add(label)

      objs[node.id] = { mesh, glow, label, selGlow: null }
    })

    objsRef.current  = objs
    meshList.forEach(m => m) // keep in scope

    // ── Edge lines ────────────────────────────────────────────────────────
    edges.forEach(edge => {
      const srcPos = NODE_POSITIONS[edge.source]
      const tgtPos = NODE_POSITIONS[edge.target]
      if (!srcPos || !tgtPos) return

      const geo = new THREE.BufferGeometry().setFromPoints([srcPos.clone(), tgtPos.clone()])
      const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.11 })
      const line = new THREE.Line(geo, mat)
      line.userData = { source: edge.source, target: edge.target }
      scene.add(line)
      lines[`${edge.source}-${edge.target}`] = line
    })

    linesRef.current = lines

    // ── Helpers ───────────────────────────────────────────────────────────
    function getConnected(nodeId) {
      const set = new Set()
      edges.forEach(e => {
        if (e.source === nodeId) set.add(e.target)
        if (e.target === nodeId) set.add(e.source)
      })
      return set
    }

    function applyHover(nodeId) {
      const connected = getConnected(nodeId)
      // highlight hovered
      objs[nodeId].mesh.scale.setScalar(1.65)
      objs[nodeId].glow.scale.setScalar(3.6)
      objs[nodeId].glow.material.opacity = 1
      objs[nodeId].label.material.opacity = 1
      // highlight edges
      Object.values(lines).forEach(line => {
        const { source, target } = line.userData
        if (source === nodeId || target === nodeId) {
          line.material.color.set(CAT_COLORS[nodesMap[nodeId].category])
          line.material.opacity = 0.85
        } else {
          line.material.opacity = 0.04
        }
      })
      // dim others
      nodes.forEach(n => {
        if (n.id !== nodeId && !connected.has(n.id)) {
          objs[n.id].mesh.material.opacity = 0.22
          objs[n.id].glow.material.opacity = 0.15
        }
      })
    }

    function clearHover(nodeId) {
      if (!objs[nodeId]) return
      // don't shrink if this is the selected node
      const isSelected = selectedRef.current === nodeId
      objs[nodeId].mesh.scale.setScalar(isSelected ? 1.3 : 1)
      objs[nodeId].glow.scale.setScalar(isSelected ? 2.8 : 2.2)
      objs[nodeId].glow.material.opacity = 0.65
      objs[nodeId].label.material.opacity = 0

      Object.values(lines).forEach(line => {
        line.material.color.set(0xffffff)
        line.material.opacity = 0.11
      })
      nodes.forEach(n => {
        objs[n.id].mesh.material.opacity = 1
        objs[n.id].glow.material.opacity = 0.65
      })
    }

    function applySelection(nodeId) {
      // remove previous selection glow
      const prev = selectedRef.current
      if (prev && objs[prev]?.selGlow) {
        scene.remove(objs[prev].selGlow)
        objs[prev].selGlow.material.dispose()
        objs[prev].selGlow = null
        objs[prev].mesh.scale.setScalar(hoveredRef.current === prev ? 1.65 : 1)
        objs[prev].glow.scale.setScalar(hoveredRef.current === prev ? 3.6 : 2.2)
      }

      if (!nodeId || nodeId === prev) {
        selectedRef.current = null
        onSelectRef.current(null)
        return
      }

      selectedRef.current = nodeId
      // white selection glow
      const selGlowMat = new THREE.SpriteMaterial({
        map: WHITE_GLOW_TEX,
        blending: THREE.AdditiveBlending,
        transparent: true, opacity: 0.35, depthWrite: false,
      })
      const selGlow = new THREE.Sprite(selGlowMat)
      selGlow.position.copy(NODE_POSITIONS[nodeId])
      selGlow.scale.set(4.5, 4.5, 1)
      scene.add(selGlow)
      objs[nodeId].selGlow = selGlow
      objs[nodeId].mesh.scale.setScalar(1.3)
      objs[nodeId].glow.scale.setScalar(2.8)

      onSelectRef.current(nodesMap[nodeId] || null)
    }

    // ── Raycaster / Interaction ───────────────────────────────────────────
    const raycaster = new THREE.Raycaster()
    const mouse     = new THREE.Vector2()

    function toNDC(event) {
      const rect = mount.getBoundingClientRect()
      mouse.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1
      mouse.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1
    }

    function onMouseMove(event) {
      toNDC(event)
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(meshList)
      const newId = hits.length > 0 ? hits[0].object.userData.nodeId : null

      if (newId !== hoveredRef.current) {
        if (hoveredRef.current) clearHover(hoveredRef.current)
        if (newId) applyHover(newId)
        hoveredRef.current = newId
        mount.style.cursor = newId ? 'pointer' : 'default'
      }
    }

    function onClick(event) {
      toNDC(event)
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(meshList)
      const nodeId = hits.length > 0 ? hits[0].object.userData.nodeId : null

      // stop auto-rotate on first interaction
      controls.autoRotate = false
      applySelection(nodeId)
    }

    mount.addEventListener('mousemove', onMouseMove)
    mount.addEventListener('click', onClick)

    // ── Animation loop ────────────────────────────────────────────────────
    let frameId, t = 0
    const clock = new THREE.Clock()

    function animate() {
      frameId = requestAnimationFrame(animate)
      t = clock.getElapsedTime()

      // pulsing glow for non-hovered, non-selected nodes
      nodes.forEach((node, i) => {
        const o = objs[node.id]
        if (!o) return
        const isHov = hoveredRef.current === node.id
        const isSel = selectedRef.current === node.id
        if (!isHov && !isSel) {
          const s = 2.1 + Math.sin(t * 1.2 + i * 0.9) * 0.25
          o.glow.scale.set(s, s, 1)
        }
        // smooth label fade
        const targetOp = isHov ? 1 : 0
        o.label.material.opacity += (targetOp - o.label.material.opacity) * 0.12
      })

      // rotate ghost sphere slowly
      ghostSphere.rotation.y = t * 0.04

      controls.update()
      renderer.render(scene, camera)
    }

    animate()

    // ── Resize ───────────────────────────────────────────────────────────
    function onResize() {
      if (!mount) return
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener('resize', onResize)

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(frameId)
      mount.removeEventListener('mousemove', onMouseMove)
      mount.removeEventListener('click', onClick)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, []) // run once

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
}
