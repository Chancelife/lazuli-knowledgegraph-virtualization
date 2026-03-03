import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { nodes, edges, nodesMap } from './data.js'

// ── Constants ─────────────────────────────────────────────────────────────────
const SPHERE_RADIUS = 12

// Per-tier sphere radius, glow, and label offset
const TIER_NODE_R = { 1: 0.52, 2: 0.32, 3: 0.18 }
const TIER_GLOW   = {
  1: { idleScale: 3.2, selScale: 4.2, hoverScale: 5.2, baseOpacity: 0.72 },
  2: { idleScale: 2.2, selScale: 2.8, hoverScale: 3.6, baseOpacity: 0.65 },
  3: { idleScale: 1.5, selScale: 2.0, hoverScale: 2.5, baseOpacity: 0.55 },
}
const TIER_LABEL_OFFSET = { 1: 1.1, 2: 0.7, 3: 0.5 }
// All tiers orbit OUTSIDE the ghost sphere; tier 1 closest, tier 3 furthest
const TIER_RADII = {
  1: { min: 1.03, max: 1.18, spread: 0.38 },  // just outside sphere surface
  2: { min: 1.22, max: 1.40, spread: 0.55 },  // mid ring
  3: { min: 1.44, max: 1.62, spread: 0.65 },  // outer ring
}

// Minimap viewport dimensions (CSS pixels)
export const MM_W      = 190
export const MM_H      = 190
export const MM_MARGIN = 20

const CAT_COLORS = {
  frontend: new THREE.Color(0x22d3ee),
  backend:  new THREE.Color(0xa855f7),
  devops:   new THREE.Color(0xfb923c),
  aiml:     new THREE.Color(0xf472b6),
  depipe:   new THREE.Color(0xfbbf24),
}

const CLUSTER_CENTERS = {
  frontend: new THREE.Vector3( 1,  0.7,  0.5).normalize(),
  backend:  new THREE.Vector3(-1,  0.7, -0.5).normalize(),
  devops:   new THREE.Vector3( 0.5, -0.7, -1).normalize(),
  aiml:     new THREE.Vector3(-0.5, -0.7,  1).normalize(),
  depipe:   new THREE.Vector3( 0, 0.9, -0.3).normalize(),
}

// ── Seeded RNG ────────────────────────────────────────────────────────────────
function seededRng(seed) {
  let s = seed >>> 0
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 >>> 0
    return s / 4294967295
  }
}

// ── Textures ──────────────────────────────────────────────────────────────────
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

function makeLabelTexture(text) {
  const W = 256, H = 52
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(3, 7, 18, 0.82)'
  ctx.beginPath()
  ctx.roundRect(3, 3, W - 6, H - 6, 9)
  ctx.fill()
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
    const tr     = TIER_RADII[node.tier || 2]
    const u = rng(), v = rng()
    const theta = tr.spread * Math.sqrt(u)
    const phi   = 2 * Math.PI * v
    const ref = Math.abs(center.y) < 0.99
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0)
    const t1 = new THREE.Vector3().crossVectors(center, ref).normalize()
    const t2 = new THREE.Vector3().crossVectors(center, t1).normalize()
    const pos = new THREE.Vector3()
    pos.addScaledVector(center, Math.cos(theta))
    pos.addScaledVector(t1, Math.sin(theta) * Math.cos(phi))
    pos.addScaledVector(t2, Math.sin(theta) * Math.sin(phi))
    // Tier 1 inside ghost sphere, tier 2 current shell, tier 3 outer shell
    pos.multiplyScalar(SPHERE_RADIUS * (tr.min + rng() * (tr.max - tr.min)))
    positions[node.id] = pos
  })
  return positions
}

const NODE_POSITIONS = buildNodePositions()

// Per-tier color variants: tier 1 = full brightness, tier 2 = 75%, tier 3 = 55%
const TIER_LIGHTNESS = { 1: 1.0, 2: 0.75, 3: 0.55 }
const TIER_CAT_COLORS    = { 1: {}, 2: {}, 3: {} }
const TIER_GLOW_TEXTURES = { 1: {}, 2: {}, 3: {} }
for (const [cat, base] of Object.entries(CAT_COLORS)) {
  const hsl = {}; base.getHSL(hsl)
  for (let t = 1; t <= 3; t++) {
    const col = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l * TIER_LIGHTNESS[t])
    TIER_CAT_COLORS[t][cat]    = col
    TIER_GLOW_TEXTURES[t][cat] = makeGlowTexture(col)
  }
}
// Full-brightness glow textures (for secondary category rings)
const GLOW_TEXTURES = TIER_GLOW_TEXTURES[1]
const WHITE_GLOW_TEX  = makeGlowTexture(new THREE.Color(1, 1, 1))
const CAM_GLOW_TEX    = makeGlowTexture(new THREE.Color(0x00ffd0))

// ── Main component ────────────────────────────────────────────────────────────
export function KnowledgeGraph({ activeCategories, onNodeSelect, statsRef, mmExpandedRef, mmFrameRef, orbitActiveRef }) {
  const mountRef     = useRef(null)
  const objsRef      = useRef({})
  const linesRef     = useRef({})
  const hierLinesRef = useRef({})
  const hoveredRef   = useRef(null)
  const selectedRef  = useRef(null)
  const onSelectRef  = useRef(onNodeSelect)

  useEffect(() => { onSelectRef.current = onNodeSelect }, [onNodeSelect])

  // ── Sync category visibility ──────────────────────────────────────────────
  useEffect(() => {
    const objs      = objsRef.current
    const lines     = linesRef.current
    const hierLines = hierLinesRef.current
    if (!Object.keys(objs).length) return
    nodes.forEach(n => {
      const vis = activeCategories.has(n.category)
      const o   = objs[n.id]
      if (!o) return
      o.mesh.visible  = vis
      o.glow.visible  = vis
      o.label.visible = false
      if (o.selGlow) o.selGlow.visible = vis
      o.secondaryGlows?.forEach(sg => { sg.visible = vis })
    })
    const lineVis = line => {
      const { source, target } = line.userData
      line.visible =
        activeCategories.has(nodesMap[source]?.category) &&
        activeCategories.has(nodesMap[target]?.category)
    }
    Object.values(lines).forEach(lineVis)
    Object.values(hierLines).forEach(lineVis)
  }, [activeCategories])

  // ── One-time scene setup ──────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // ── Scene ─────────────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x030712)

    // ── Main camera ───────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(58, mount.clientWidth / mount.clientHeight, 0.1, 800)
    camera.position.set(0, 4, 30)

    // ── Renderer ──────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    // autoClear stays true; scissor test ensures each render only clears its own region
    mount.appendChild(renderer.domElement)

    // ── Main OrbitControls ────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping    = true
    controls.dampingFactor    = 0.06
    controls.minDistance      = 14
    controls.maxDistance      = 55
    controls.autoRotate       = true
    controls.autoRotateSpeed  = 0.35

    // ── Minimap camera (isometric-ish perspective) ────────────────────────
    const mmCamera = new THREE.PerspectiveCamera(50, MM_W / MM_H, 0.1, 300)
    mmCamera.position.set(0, 50, 22)
    mmCamera.lookAt(0, 0, 0)

    // ── Minimap OrbitControls (disabled until drag starts in minimap) ──────
    const mmControls = new OrbitControls(mmCamera, renderer.domElement)
    mmControls.enableDamping    = true
    mmControls.dampingFactor    = 0.08
    mmControls.minDistance      = 18
    mmControls.maxDistance      = 120
    mmControls.enabled          = false

    // ── Lighting ──────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.4))
    const pl1 = new THREE.PointLight(0x4facfe, 3, 120); pl1.position.set( 25,  25,  20); scene.add(pl1)
    const pl2 = new THREE.PointLight(0xf093fb, 3, 120); pl2.position.set(-25, -25,  20); scene.add(pl2)
    const pl3 = new THREE.PointLight(0xfb923c, 2,  80); pl3.position.set(  0, -25, -20); scene.add(pl3)

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
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.25, sizeAttenuation: true, transparent: true, opacity: 0.75,
    })))

    // ── Ghost sphere guide ────────────────────────────────────────────────
    const ghostSphere = new THREE.Mesh(
      new THREE.SphereGeometry(SPHERE_RADIUS, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0x1e3a5f, wireframe: true, transparent: true, opacity: 0.07 })
    )
    scene.add(ghostSphere)

    // ── Camera indicator (visible only during minimap render) ──────────────
    // Arrow showing main camera position + look direction
    const camArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1),  // initial dir
      new THREE.Vector3(0, 0,  0),  // initial pos
      5, 0x00ffd0, 1.6, 0.9
    )
    camArrow.visible = false
    scene.add(camArrow)

    // Glow halo at camera position
    const camGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: CAM_GLOW_TEX, blending: THREE.AdditiveBlending,
      transparent: true, opacity: 0.85, depthWrite: false,
    }))
    camGlow.scale.set(5, 5, 1)
    camGlow.visible = false
    scene.add(camGlow)

    // ── Node meshes ───────────────────────────────────────────────────────
    const objs     = {}
    const lines    = {}
    const meshList = []

    nodes.forEach(node => {
      const pos   = NODE_POSITIONS[node.id]
      const tier  = node.tier || 2
      const color = TIER_CAT_COLORS[tier][node.category]
      const tg    = TIER_GLOW[tier]
      const nodeR = TIER_NODE_R[tier]

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(nodeR, 20, 20),
        new THREE.MeshStandardMaterial({
          color, emissive: color, emissiveIntensity: 0.5,
          roughness: 0.3, metalness: 0.4, transparent: true,
        })
      )
      mesh.position.copy(pos)
      mesh.userData.nodeId = node.id
      scene.add(mesh)
      meshList.push(mesh)

      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: TIER_GLOW_TEXTURES[tier][node.category],
        blending: THREE.AdditiveBlending, transparent: true, opacity: tg.baseOpacity, depthWrite: false,
      }))
      glow.position.copy(pos)
      glow.scale.set(tg.idleScale, tg.idleScale, 1)
      scene.add(glow)

      // Secondary category glow rings (cross-category nodes only)
      const secondaryGlows = []
      node.secondaryCategories?.forEach(secCat => {
        const sg = new THREE.Sprite(new THREE.SpriteMaterial({
          map: GLOW_TEXTURES[secCat],
          blending: THREE.AdditiveBlending, transparent: true, opacity: 0.28, depthWrite: false,
        }))
        sg.position.copy(pos)
        sg.scale.set(tg.idleScale * 1.55, tg.idleScale * 1.55, 1)
        scene.add(sg)
        secondaryGlows.push(sg)
      })

      const labelOffset = TIER_LABEL_OFFSET[tier]
      const label = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeLabelTexture(node.label), transparent: true, opacity: 0, depthWrite: false,
      }))
      label.position.copy(pos).add(new THREE.Vector3(0, nodeR + labelOffset, 0))
      label.scale.set(2.8, 0.62, 1)
      scene.add(label)

      objs[node.id] = { mesh, glow, label, selGlow: null, secondaryGlows, tg }
    })

    objsRef.current  = objs
    linesRef.current = lines

    // ── Semantic edge lines ───────────────────────────────────────────────
    edges.filter(e => !e.type).forEach(edge => {
      const srcPos = NODE_POSITIONS[edge.source]
      const tgtPos = NODE_POSITIONS[edge.target]
      if (!srcPos || !tgtPos) return
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([srcPos.clone(), tgtPos.clone()]),
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.11 })
      )
      line.userData = { source: edge.source, target: edge.target, type: 'semantic' }
      scene.add(line)
      lines[`${edge.source}-${edge.target}`] = line
    })
    linesRef.current = lines

    // ── Hierarchy edge lines (dashed, category-colored) ───────────────────
    const hierLines = {}
    // Collect semantic pairs so we skip hierarchy lines that duplicate them
    const semanticPairs = new Set(edges.filter(e => !e.type).map(e => `${e.source}|${e.target}`))
    edges.filter(e => e.type === 'hierarchy').forEach(edge => {
      const srcPos = NODE_POSITIONS[edge.source]
      const tgtPos = NODE_POSITIONS[edge.target]
      if (!srcPos || !tgtPos) return
      // Skip drawing a visual hierarchy line if a semantic line already connects this pair
      const fwd = `${edge.source}|${edge.target}`
      const rev = `${edge.target}|${edge.source}`
      if (semanticPairs.has(fwd) || semanticPairs.has(rev)) return
      const srcColor = CAT_COLORS[nodesMap[edge.source]?.category] ?? new THREE.Color(0xffffff)
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([srcPos.clone(), tgtPos.clone()]),
        new THREE.LineDashedMaterial({
          color: srcColor, opacity: 0.22, transparent: true,
          dashSize: 0.55, gapSize: 0.38, depthWrite: false,
        })
      )
      line.computeLineDistances()  // must call on Line, not BufferGeometry
      line.userData = { source: edge.source, target: edge.target, type: 'hierarchy' }
      scene.add(line)
      hierLines[`h-${edge.source}-${edge.target}`] = line
    })
    hierLinesRef.current = hierLines

    // ── Interaction helpers ───────────────────────────────────────────────
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
      const tg = objs[nodeId].tg
      objs[nodeId].mesh.scale.setScalar(1.65)
      objs[nodeId].glow.scale.setScalar(tg.hoverScale)
      objs[nodeId].glow.material.opacity = 1
      objs[nodeId].label.material.opacity = 1
      objs[nodeId].secondaryGlows?.forEach(sg => { sg.material.opacity = 0.75 })
      const catColor = CAT_COLORS[nodesMap[nodeId].category]
      Object.values(lines).forEach(line => {
        const { source, target } = line.userData
        if (source === nodeId || target === nodeId) {
          line.material.color.set(catColor)
          line.material.opacity = 0.85
        } else {
          line.material.opacity = 0.04
        }
      })
      Object.values(hierLines).forEach(line => {
        const { source, target } = line.userData
        line.material.opacity = (source === nodeId || target === nodeId) ? 0.75 : 0.02
      })
      nodes.forEach(n => {
        if (n.id !== nodeId && !connected.has(n.id)) {
          objs[n.id].mesh.material.opacity = 0.22
          objs[n.id].glow.material.opacity = 0.15
          objs[n.id].secondaryGlows?.forEach(sg => { sg.material.opacity = 0.05 })
        }
      })
    }

    function clearHover(nodeId) {
      if (!objs[nodeId]) return
      const isSel = selectedRef.current === nodeId
      const tg = objs[nodeId].tg
      objs[nodeId].mesh.scale.setScalar(isSel ? 1.3 : 1)
      objs[nodeId].glow.scale.setScalar(isSel ? tg.selScale : tg.idleScale)
      objs[nodeId].glow.material.opacity = tg.baseOpacity
      objs[nodeId].label.material.opacity = 0
      objs[nodeId].secondaryGlows?.forEach(sg => { sg.material.opacity = 0.28 })
      Object.values(lines).forEach(line => {
        line.material.color.set(0xffffff)
        line.material.opacity = 0.11
      })
      Object.values(hierLines).forEach(line => { line.material.opacity = 0.22 })
      nodes.forEach(n => {
        objs[n.id].mesh.material.opacity = 1
        objs[n.id].glow.material.opacity = objs[n.id].tg.baseOpacity
        objs[n.id].secondaryGlows?.forEach(sg => { sg.material.opacity = 0.28 })
      })
    }

    function applySelection(nodeId) {
      const prev = selectedRef.current
      if (prev && objs[prev]?.selGlow) {
        scene.remove(objs[prev].selGlow)
        objs[prev].selGlow.material.dispose()
        objs[prev].selGlow = null
        const prevTg = objs[prev].tg
        objs[prev].mesh.scale.setScalar(hoveredRef.current === prev ? 1.65 : 1)
        objs[prev].glow.scale.setScalar(hoveredRef.current === prev ? prevTg.hoverScale : prevTg.idleScale)
      }
      if (!nodeId || nodeId === prev) {
        selectedRef.current = null
        onSelectRef.current(null)
        return
      }
      selectedRef.current = nodeId
      const tg = objs[nodeId].tg
      const selGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: WHITE_GLOW_TEX, blending: THREE.AdditiveBlending,
        transparent: true, opacity: 0.35, depthWrite: false,
      }))
      selGlow.position.copy(NODE_POSITIONS[nodeId])
      selGlow.scale.set(tg.selScale * 1.5, tg.selScale * 1.5, 1)
      scene.add(selGlow)
      objs[nodeId].selGlow = selGlow
      objs[nodeId].mesh.scale.setScalar(1.3)
      objs[nodeId].glow.scale.setScalar(tg.selScale)
      onSelectRef.current(nodesMap[nodeId] || null)
    }

    // ── Minimap region check ──────────────────────────────────────────────
    function isInMinimap(clientX, clientY) {
      const rect = mount.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top
      return (
        x >= rect.width  - mmCurW - MM_MARGIN &&
        x <= rect.width  - MM_MARGIN &&
        y >= rect.height - mmCurH - MM_MARGIN &&
        y <= rect.height - MM_MARGIN
      )
    }

    // ── Raycaster ─────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster()
    const mouse     = new THREE.Vector2()

    function toNDC(event) {
      const rect = mount.getBoundingClientRect()
      mouse.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1
      mouse.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1
    }

    function onMouseMove(event) {
      if (isInMinimap(event.clientX, event.clientY)) {
        if (hoveredRef.current) { clearHover(hoveredRef.current); hoveredRef.current = null }
        mount.style.cursor = 'grab'
        return
      }
      toNDC(event)
      raycaster.setFromCamera(mouse, camera)
      const hits  = raycaster.intersectObjects(meshList)
      const newId = hits.length > 0 ? hits[0].object.userData.nodeId : null
      if (newId !== hoveredRef.current) {
        if (hoveredRef.current) clearHover(hoveredRef.current)
        if (newId) applyHover(newId)
        hoveredRef.current = newId
        mount.style.cursor = newId ? 'pointer' : 'default'
      }
    }

    function onClick(event) {
      if (isInMinimap(event.clientX, event.clientY)) return
      toNDC(event)
      raycaster.setFromCamera(mouse, camera)
      const hits   = raycaster.intersectObjects(meshList)
      const nodeId = hits.length > 0 ? hits[0].object.userData.nodeId : null
      controls.autoRotate = false
      applySelection(nodeId)
    }

    // ── Route pointer events between main / minimap controls ───────────────
    function onPointerDown(e) {
      if (isInMinimap(e.clientX, e.clientY)) {
        controls.enabled    = false
        mmControls.enabled  = true
        controls.autoRotate = false
      }
    }
    function onPointerUp() {
      controls.enabled   = true
      mmControls.enabled = false
    }

    mount.addEventListener('mousemove',   onMouseMove)
    mount.addEventListener('click',       onClick)
    mount.addEventListener('pointerdown', onPointerDown, true)  // capture phase → runs before OrbitControls
    mount.addEventListener('pointerup',   onPointerUp,   true)

    // ── Stats setup ───────────────────────────────────────────────────────
    const gl       = renderer.getContext()
    const timerExt = gl.getExtension('EXT_disjoint_timer_query_webgl2')
    let gpuQueryObj = null, thisFrameQ = null, lastGpuMs = 0
    let fpsCount = 0, fpsLastTime = performance.now(), currentFps = 0

    // ── Minimap animated size (lerped each frame) ─────────────────────────
    const MM_EXPANDED = 310   // target size when expanded
    let mmCurW = MM_W
    let mmCurH = MM_H

    // ── Cinematic close-orbit state ───────────────────────────────────────
    const CLOSE_ORBIT_SPEED  = 0.08   // rad/s  →  full revolution ≈ 79 s
    const CLOSE_ORBIT_R_INIT = 3.2    // initial distance from node (units)
    const CLOSE_ORBIT_R_MIN  = 1.4
    const CLOSE_ORBIT_R_MAX  = 8.0
    let closeOrbitR     = CLOSE_ORBIT_R_INIT
    let closeOrbitTheta = 0
    let closeOrbitPhi   = Math.PI / 2
    let prevOrbitActive = false
    const _orbitPos = new THREE.Vector3()

    // Scroll wheel adjusts orbit radius when cockpit mode is active
    function onOrbitWheel(e) {
      if (!(orbitActiveRef?.current)) return
      e.preventDefault()
      e.stopPropagation()
      const delta = e.deltaY > 0 ? 1.12 : 1 / 1.12
      closeOrbitR = Math.max(CLOSE_ORBIT_R_MIN, Math.min(CLOSE_ORBIT_R_MAX, closeOrbitR * delta))
    }
    mount.addEventListener('wheel', onOrbitWheel, { passive: false })

    // ── Animation loop ────────────────────────────────────────────────────
    let frameId, t = 0, prevT = 0
    const clock  = new THREE.Clock()
    const _dir   = new THREE.Vector3()

    function animate() {
      frameId = requestAnimationFrame(animate)
      t = clock.getElapsedTime()

      // ── FPS tracking ──
      fpsCount++
      const now = performance.now()
      if (now - fpsLastTime >= 500) {
        currentFps  = Math.round((fpsCount * 1000) / (now - fpsLastTime))
        fpsCount    = 0
        fpsLastTime = now
      }

      // ── GPU timer: read last frame's result ──
      if (gpuQueryObj && timerExt) {
        if (gl.getQueryParameter(gpuQueryObj, gl.QUERY_RESULT_AVAILABLE)) {
          if (!gl.getParameter(timerExt.GPU_DISJOINT_EXT)) {
            lastGpuMs = parseFloat((gl.getQueryParameter(gpuQueryObj, gl.QUERY_RESULT) / 1e6).toFixed(2))
          }
          gl.deleteQuery(gpuQueryObj)
          gpuQueryObj = null
        }
      }
      // ── GPU timer: begin this frame ──
      thisFrameQ = null
      if (!gpuQueryObj && timerExt) {
        thisFrameQ = gl.createQuery()
        gl.beginQuery(timerExt.TIME_ELAPSED_EXT, thisFrameQ)
      }

      // ── Scene animations ──
      nodes.forEach((node, i) => {
        const o = objs[node.id]; if (!o) return
        const isHov = hoveredRef.current === node.id
        const isSel = selectedRef.current === node.id
        const tg    = o.tg
        if (!isHov && !isSel) {
          const s = tg.idleScale + Math.sin(t * 1.2 + i * 0.9) * (tg.idleScale * 0.12)
          o.glow.scale.set(s, s, 1)
        }
        // Secondary glows pulse at a slightly offset phase
        if (o.secondaryGlows?.length) {
          const ss = tg.idleScale * 1.55 + Math.sin(t * 0.85 + i * 0.9 + 1.6) * (tg.idleScale * 0.09)
          o.secondaryGlows.forEach(sg => sg.scale.set(ss, ss, 1))
        }
        const targetOp = isHov ? 1 : 0
        o.label.material.opacity += (targetOp - o.label.material.opacity) * 0.12
      })
      ghostSphere.rotation.y = t * 0.04

      // ── Cinematic orbit (takes over main camera when active) ──
      const dt = Math.min(t - prevT, 0.1)  // cap to avoid big jump on tab re-focus
      prevT = t
      const isOrbiting = orbitActiveRef?.current ?? false

      const selId    = selectedRef.current
      const hasTarget = selId && NODE_POSITIONS[selId]

      if (isOrbiting && hasTarget) {
        // Cockpit mode: full manual control disabled, camera flies to node and orbits it
        controls.enabled = false

        if (!prevOrbitActive) {
          // Init angles from current camera position relative to node
          const np = NODE_POSITIONS[selId]
          closeOrbitR     = CLOSE_ORBIT_R_INIT
          closeOrbitTheta = Math.atan2(
            camera.position.x - np.x,
            camera.position.z - np.z
          )
          closeOrbitPhi   = Math.PI / 2
        }

        const np = NODE_POSITIONS[selId]

        // Advance azimuth; oscillate elevation for a sweeping cinematic arc
        closeOrbitTheta += CLOSE_ORBIT_SPEED * dt
        closeOrbitPhi    = Math.PI / 2 + Math.sin(t * 0.18) * 0.28

        // Target position orbiting around the node
        _orbitPos.set(
          np.x + closeOrbitR * Math.sin(closeOrbitPhi) * Math.sin(closeOrbitTheta),
          np.y + closeOrbitR * Math.cos(closeOrbitPhi),
          np.z + closeOrbitR * Math.sin(closeOrbitPhi) * Math.cos(closeOrbitTheta)
        )

        // Smooth fly-in / follow via exponential decay lerp
        camera.position.lerp(_orbitPos, 0.05)
        camera.lookAt(np.x, np.y, np.z)
      } else {
        if (prevOrbitActive) {
          // Restore full manual control when orbit stops
          controls.enabled      = true
          controls.enableRotate = true
          controls.enablePan    = true
          controls.target.set(0, 0, 0)
          closeOrbitR = CLOSE_ORBIT_R_INIT
        }
        controls.update()
      }
      prevOrbitActive = isOrbiting && !!hasTarget
      mmControls.update()

      // ── Update camera indicator ──
      camera.getWorldDirection(_dir)
      camArrow.position.copy(camera.position)
      camArrow.setDirection(_dir)
      camGlow.position.copy(camera.position)

      const fw = mount.clientWidth
      const fh = mount.clientHeight

      // ── Render 1: main view (full screen) ──────────────────────────────
      camArrow.visible = false
      camGlow.visible  = false
      renderer.setScissorTest(false)
      renderer.setViewport(0, 0, fw, fh)
      renderer.render(scene, camera)

      // ── Lerp minimap size toward target ────────────────────────────────
      const mmTarget = (mmExpandedRef?.current) ? MM_EXPANDED : MM_W
      mmCurW += (mmTarget - mmCurW) * 0.1
      mmCurH += (mmTarget - mmCurH) * 0.1
      const mmW = Math.round(mmCurW)
      const mmH = Math.round(mmCurH)

      // Sync CSS overlay to match WebGL viewport exactly
      if (mmFrameRef?.current) {
        mmFrameRef.current.style.width  = `${mmW}px`
        mmFrameRef.current.style.height = `${mmH}px`
      }

      // ── Render 2: minimap (scissored bottom-right viewport) ────────────
      camArrow.visible = true
      camGlow.visible  = true
      const mmX = fw - mmW - MM_MARGIN
      const mmY = MM_MARGIN  // y is measured from the bottom in WebGL
      renderer.setScissorTest(true)
      renderer.setScissor(mmX, mmY, mmW, mmH)
      renderer.setViewport(mmX, mmY, mmW, mmH)
      renderer.render(scene, mmCamera)
      // restore
      renderer.setScissorTest(false)
      renderer.setViewport(0, 0, fw, fh)
      camArrow.visible = false
      camGlow.visible  = false

      // ── GPU timer: end ──
      if (thisFrameQ && timerExt) {
        gl.endQuery(timerExt.TIME_ELAPSED_EXT)
        gpuQueryObj = thisFrameQ
      }

      // ── Push stats ──
      if (statsRef) {
        statsRef.current = { fps: currentFps, gpuMs: lastGpuMs, gpuSupported: !!timerExt }
      }
    }

    animate()

    // ── Resize ────────────────────────────────────────────────────────────
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
      mount.removeEventListener('mousemove',   onMouseMove)
      mount.removeEventListener('click',       onClick)
      mount.removeEventListener('pointerdown', onPointerDown, true)
      mount.removeEventListener('pointerup',   onPointerUp,   true)
      mount.removeEventListener('wheel',       onOrbitWheel)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      mmControls.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, []) // run once

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
}
