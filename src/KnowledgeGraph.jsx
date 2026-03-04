import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js'
import { nodes, edges, hierarchyEdges, nodesMap, nodeHasCategory, categories } from './data.js'
import { useKnowledgeStore } from './store.js'

// ── Constants ─────────────────────────────────────────────────────────────────
const SPHERE_RADIUS = 12

// Per-tier sphere radius, glow, and label offset
// Tier 0: Foundation (cross-category infrastructure) - largest, at center
// Tier 1: Core frameworks - large
// Tier 2: Tools - medium
// Tier 3: Sub-libraries - small
const TIER_NODE_R = { 0: 0.68, 1: 0.48, 2: 0.32, 3: 0.18 }
const TIER_GLOW   = {
  0: { idleScale: 4.0, selScale: 5.2, hoverScale: 6.5, baseOpacity: 0.78 },
  1: { idleScale: 3.0, selScale: 3.8, hoverScale: 4.8, baseOpacity: 0.70 },
  2: { idleScale: 2.2, selScale: 2.8, hoverScale: 3.6, baseOpacity: 0.62 },
  3: { idleScale: 1.5, selScale: 2.0, hoverScale: 2.5, baseOpacity: 0.52 },
}
const TIER_LABEL_OFFSET = { 0: 1.3, 1: 1.0, 2: 0.7, 3: 0.5 }
// Tier 0 is at center, Tier 1-3 orbit outside with tight category clustering
const TIER_RADII = {
  0: { min: 0.35, max: 0.55, spread: 0.25 },  // center core (foundation)
  1: { min: 1.08, max: 1.18, spread: 0.22 },  // tight cluster near sphere
  2: { min: 1.28, max: 1.38, spread: 0.28 },  // tight cluster mid ring
  3: { min: 1.48, max: 1.58, spread: 0.32 },  // tight cluster outer ring
}

// Satellite orbit parameters for tier-0 subtype='satellite' nodes
const SATELLITE_PARAMS = {
  aws:    { radius: 20, speed: 0.045, inclination: 0, phase: 0 },
  docker: { radius: 16, speed: 0.065, inclination: 0, phase: Math.PI * 0.6 },
}

// Pure helper: position on inclined circular orbit at angular time t
function getSatellitePos(params, t) {
  const θ   = t * params.speed + params.phase
  const r   = params.radius
  const yz  = r * Math.sin(θ)
  return new THREE.Vector3(
    r * Math.cos(θ),
    -yz * Math.sin(params.inclination),
     yz * Math.cos(params.inclination)
  )
}

// Same but with explicit angle (for orbit ring tracing)
function getSatellitePosAtAngle(params, θ) {
  const r  = params.radius
  const yz = r * Math.sin(θ)
  return new THREE.Vector3(
    r * Math.cos(θ),
    -yz * Math.sin(params.inclination),
     yz * Math.cos(params.inclination)
  )
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
  database: new THREE.Color(0x10b981),
}
// Neutral color for tier-0 language nodes that belong to no category
const NEUTRAL_COLOR = new THREE.Color(0xd1d5db)

const CLUSTER_CENTERS = {
  frontend: new THREE.Vector3( 1,  0.7,  0.5).normalize(),
  backend:  new THREE.Vector3(-1,  0.7, -0.5).normalize(),
  devops:   new THREE.Vector3( 0.5, -0.7, -1).normalize(),
  aiml:     new THREE.Vector3(-0.5, -0.7,  1).normalize(),
  depipe:   new THREE.Vector3( 0,   0.9, -0.3).normalize(),
  database: new THREE.Vector3( 1,  -0.6,  0.6).normalize(),
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

// ── AWS logo canvas texture ───────────────────────────────────────────────────
function makeAwsLogoTexture() {
  const S = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, S, S)

  // "aws" wordmark in white
  ctx.font = 'bold 72px Arial Black, Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.fillText('aws', S / 2, S / 2 - 18)

  // Amazon smile arc (orange) — centered below text
  const cx = S / 2, cy = S / 2 + 36
  const arcR = 72
  ctx.beginPath()
  ctx.arc(cx, cy, arcR, Math.PI * 0.15, Math.PI * 0.85)
  ctx.strokeStyle = '#FF9900'
  ctx.lineWidth = 9
  ctx.lineCap = 'round'
  ctx.stroke()

  // Arrow tip at end of arc
  const tipAngle = Math.PI * 0.85
  const tx = cx + arcR * Math.cos(tipAngle)
  const ty = cy + arcR * Math.sin(tipAngle)
  ctx.beginPath()
  ctx.moveTo(tx - 10, ty - 10)
  ctx.lineTo(tx + 4,  ty - 2)
  ctx.lineTo(tx - 6,  ty + 8)
  ctx.strokeStyle = '#FF9900'
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()

  return new THREE.CanvasTexture(canvas)
}
const AWS_LOGO_TEX = makeAwsLogoTexture()

// ── Multi-category pie-slice glow texture (for foundation nodes) ──────────────
function makeMultiCategoryGlowTexture(categoryIds, tier = 0) {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const cx = size / 2, cy = size / 2, r = size / 2 - 4
  
  // Clear canvas
  ctx.clearRect(0, 0, size, size)
  
  if (categoryIds.length === 1) {
    // Single category - use simple glow
    return makeGlowTexture(CAT_COLORS[categoryIds[0]])
  }
  
  // Draw pie slices for each category
  const sliceAngle = (2 * Math.PI) / categoryIds.length
  categoryIds.forEach((catId, i) => {
    const color = CAT_COLORS[catId]
    const startAngle = i * sliceAngle - Math.PI / 2
    const endAngle = (i + 1) * sliceAngle - Math.PI / 2
    
    // Create gradient for this slice
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    const rVal = Math.round(color.r * 255)
    const gVal = Math.round(color.g * 255)
    const bVal = Math.round(color.b * 255)
    
    grad.addColorStop(0, `rgba(${rVal},${gVal},${bVal},1)`)
    grad.addColorStop(0.3, `rgba(${rVal},${gVal},${bVal},0.6)`)
    grad.addColorStop(0.7, `rgba(${rVal},${gVal},${bVal},0.2)`)
    grad.addColorStop(1, `rgba(${rVal},${gVal},${bVal},0)`)
    
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, startAngle, endAngle)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()
  })
  
  // Add central white glow core
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.4)
  coreGrad.addColorStop(0, 'rgba(255,255,255,0.4)')
  coreGrad.addColorStop(0.5, 'rgba(255,255,255,0.1)')
  coreGrad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.4, 0, 2 * Math.PI)
  ctx.fillStyle = coreGrad
  ctx.fill()
  
  return new THREE.CanvasTexture(canvas)
}

// ── Node positions (deterministic) ───────────────────────────────────────────
function buildNodePositions() {
  const rng = seededRng(7)
  const positions = {}
  
  // First pass: position Tier 1-3 nodes with tight category clustering
  // Group nodes by primary category for better clustering
  const nodesByCategory = {}
  nodes.forEach(node => {
    const tier = node.tier ?? 2
    if (tier === 0) return // Skip Tier 0
    
    const primaryCat = node.categories?.[0] || 'backend'
    if (!nodesByCategory[primaryCat]) nodesByCategory[primaryCat] = []
    nodesByCategory[primaryCat].push(node)
  })
  
  // Position each category's nodes in a tight cluster
  Object.entries(nodesByCategory).forEach(([catId, catNodes]) => {
    const clusterCenter = CLUSTER_CENTERS[catId]
    
    // Sort by tier (1, 2, 3) for consistent layering
    catNodes.sort((a, b) => (a.tier ?? 2) - (b.tier ?? 2))
    
    catNodes.forEach((node, index) => {
      const tier = node.tier ?? 2
      const tr = TIER_RADII[tier]
      
      // Use tier to determine radius layer (inner = higher tier)
      // Add small jitter within tier range
      const radiusFactor = tr.min + (rng() * 0.5 + 0.5) * (tr.max - tr.min)
      const radius = SPHERE_RADIUS * radiusFactor
      
      // Tight angular clustering around category center
      // Use smaller spread for tighter grouping
      const tightSpread = tr.spread * 0.6
      const u = rng(), v = rng()
      const theta = tightSpread * Math.sqrt(u)
      const phi = 2 * Math.PI * v
      
      // Build local coordinate system around cluster center
      const ref = Math.abs(clusterCenter.y) < 0.99
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(1, 0, 0)
      const t1 = new THREE.Vector3().crossVectors(clusterCenter, ref).normalize()
      const t2 = new THREE.Vector3().crossVectors(clusterCenter, t1).normalize()
      
      // Calculate position with tight angular deviation from center
      const pos = new THREE.Vector3()
      pos.addScaledVector(clusterCenter, Math.cos(theta))
      pos.addScaledVector(t1, Math.sin(theta) * Math.cos(phi))
      pos.addScaledVector(t2, Math.sin(theta) * Math.sin(phi))
      pos.multiplyScalar(radius)
      
      positions[node.id] = pos
    })
  })
  
  // Repulsion pass for Tier 1-3 nodes: push overlapping nodes apart
  const tier13Nodes = nodes.filter(n => (n.tier ?? 2) > 0)
  const TIER13_MIN_DISTANCE = SPHERE_RADIUS * 0.12 // Minimum distance between T1-T3 nodes
  const TIER13_REPULSION_STRENGTH = 0.3
  const TIER13_ITERATIONS = 25
  
  if (tier13Nodes.length > 0) {
    for (let iter = 0; iter < TIER13_ITERATIONS; iter++) {
      for (let i = 0; i < tier13Nodes.length; i++) {
        for (let j = i + 1; j < tier13Nodes.length; j++) {
          const node1 = tier13Nodes[i]
          const node2 = tier13Nodes[j]
          const p1 = positions[node1.id]
          const p2 = positions[node2.id]
          
          if (!p1 || !p2) continue
          
          const diff = new THREE.Vector3().subVectors(p1, p2)
          const dist = diff.length()
          
          if (dist < TIER13_MIN_DISTANCE && dist > 0.001) {
            // Push apart
            const force = (TIER13_MIN_DISTANCE - dist) * TIER13_REPULSION_STRENGTH
            diff.normalize().multiplyScalar(force)
            
            p1.add(diff)
            p2.sub(diff)
            
            // Maintain radial distance (keep on shell)
            const tier1 = node1.tier ?? 2
            const tier2 = node2.tier ?? 2
            const avgRadius1 = SPHERE_RADIUS * (TIER_RADII[tier1].min + TIER_RADII[tier1].max) / 2
            const avgRadius2 = SPHERE_RADIUS * (TIER_RADII[tier2].min + TIER_RADII[tier2].max) / 2
            
            p1.normalize().multiplyScalar(avgRadius1)
            p2.normalize().multiplyScalar(avgRadius2)
          }
        }
      }
    }
  }
  
  // Second pass: position Tier 0 (Foundation) nodes on inner sphere surface
  // Create a smaller inner sphere where T0 nodes are distributed evenly
  const tier0Nodes = nodes.filter(n => n.tier === 0)
  const INNER_SPHERE_RADIUS = SPHERE_RADIUS * 0.45 // Inner sphere radius
  const minDistance = SPHERE_RADIUS * 0.20 // Minimum distance between T0 nodes
  
  if (tier0Nodes.length > 0) {
    // Calculate target position on inner sphere surface based on categories
    const getTargetDirection = (node) => {
      const cats = node.categories || ['backend']
      const dir = new THREE.Vector3(0, 0, 0)
      cats.forEach(catId => {
        dir.add(CLUSTER_CENTERS[catId])
      })
      return dir.normalize()
    }
    
    // Initialize positions: on inner sphere surface, biased toward category direction
    const tier0Positions = tier0Nodes.map((node, i) => {
      const targetDir = getTargetDirection(node)
      
      // Use seeded random for deterministic distribution
      // Golden angle spiral for even distribution on sphere
      const goldenAngle = Math.PI * (3 - Math.sqrt(5))
      const y = 1 - (i / (tier0Nodes.length - 1)) * 2 // y goes from 1 to -1
      const radiusAtY = Math.sqrt(1 - y * y)
      const theta = goldenAngle * i
      
      const basePos = new THREE.Vector3(
        radiusAtY * Math.cos(theta) * INNER_SPHERE_RADIUS,
        y * INNER_SPHERE_RADIUS,
        radiusAtY * Math.sin(theta) * INNER_SPHERE_RADIUS
      )
      
      // Blend toward target direction (40% influence)
      const blendFactor = 0.4
      const blendedDir = new THREE.Vector3()
        .addScaledVector(basePos.clone().normalize(), 1 - blendFactor)
        .addScaledVector(targetDir, blendFactor)
        .normalize()
      
      return blendedDir.multiplyScalar(INNER_SPHERE_RADIUS)
    })
    
    // Repulsion iterations to ensure separation while staying on sphere surface
    const iterations = 60
    const repulsionStrength = 0.4
    
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < tier0Positions.length; i++) {
        for (let j = i + 1; j < tier0Positions.length; j++) {
          const p1 = tier0Positions[i]
          const p2 = tier0Positions[j]
          const diff = new THREE.Vector3().subVectors(p1, p2)
          const dist = diff.length()
          
          if (dist < minDistance && dist > 0.001) {
            // Push apart
            const force = (minDistance - dist) * repulsionStrength
            diff.normalize().multiplyScalar(force)
            
            p1.add(diff)
            p2.sub(diff)
            
            // Re-project to sphere surface
            p1.normalize().multiplyScalar(INNER_SPHERE_RADIUS)
            p2.normalize().multiplyScalar(INNER_SPHERE_RADIUS)
          }
        }
      }
    }
    
    // Assign final positions
    tier0Nodes.forEach((node, i) => {
      if (node.subtype === 'satellite') {
        const params = SATELLITE_PARAMS[node.id]
        if (params) { positions[node.id] = getSatellitePos(params, 0); return }
      }
      positions[node.id] = tier0Positions[i]
    })
  }
  
  return positions
}

const NODE_POSITIONS = buildNodePositions()

// Per-tier color variants: tier 0 = 1.0, tier 1 = 0.9, tier 2 = 0.7, tier 3 = 0.5
const TIER_LIGHTNESS = { 0: 1.0, 1: 0.9, 2: 0.7, 3: 0.5 }
const TIER_CAT_COLORS    = { 0: {}, 1: {}, 2: {}, 3: {} }
const TIER_GLOW_TEXTURES = { 0: {}, 1: {}, 2: {}, 3: {} }
for (const [cat, base] of Object.entries(CAT_COLORS)) {
  const hsl = {}; base.getHSL(hsl)
  for (let t = 0; t <= 3; t++) {
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
export function KnowledgeGraph() {
  const mountRef          = useRef(null)
  const objsRef           = useRef({})
  const linesRef          = useRef({})
  const hierLinesRef      = useRef({})
  const satelliteEdgesRef = useRef([])
  const hullsRef          = useRef({})
  const hoveredRef        = useRef(null)
  const selectedRef       = useRef(null)
  const debugObjectsRef   = useRef({})
  
  // Zustand store
  const activeCategories = useKnowledgeStore(state => state.activeCategories)
  const setSelectedNode = useKnowledgeStore(state => state.setSelectedNode)
  const statsRef = useKnowledgeStore(state => state.statsRef)
  const mmExpandedRef = useKnowledgeStore(state => state.mmExpandedRef)
  const mmFrameRef = useKnowledgeStore(state => state.mmFrameRef)
  const orbitActiveRef = useKnowledgeStore(state => state.orbitActiveRef)
  const setOrbitActive = useKnowledgeStore(state => state.setOrbitActive)
  const lockViewRef         = useKnowledgeStore(state => state.lockViewRef)
  const showNodeLabelsRef   = useKnowledgeStore(state => state.showNodeLabelsRef)
  const hoveredNodeId = useKnowledgeStore(state => state.hoveredNodeId)
  const cameraTargetNode = useKnowledgeStore(state => state.cameraTargetNode)
  const setCameraTargetNode = useKnowledgeStore(state => state.setCameraTargetNode)
  const showCategoryLabels = useKnowledgeStore(state => state.showCategoryLabels)
  const showClusterCenters = useKnowledgeStore(state => state.showClusterCenters)
  
  // Keep refs in sync with store
  const onSelectRef = useRef(setSelectedNode)
  useEffect(() => { onSelectRef.current = setSelectedNode }, [setSelectedNode])
  
  // Camera animation refs
  const cameraAnimRef = useRef({
    isAnimating: false,
    isReturn: false,
    targetPos: new THREE.Vector3(),
    startPos: new THREE.Vector3(),
    startTime: 0,
    duration: 1200,
    edgeThreshold: 0.65,
  })
  const triggerCameraPanRef = useRef(null)

  // ── Sync category visibility ──────────────────────────────────────────────
  useEffect(() => {
    const objs      = objsRef.current
    const lines     = linesRef.current
    const hierLines = hierLinesRef.current
    if (!Object.keys(objs).length) return
    
    // Nodes with no categories are always visible (cross-cutting foundation nodes)
    const nodeIsVisible = n => !n.categories?.length || n.categories.some(cat => activeCategories.has(cat))

    // Update node visibility
    nodes.forEach(n => {
      const vis = nodeIsVisible(n)
      const o   = objs[n.id]
      if (!o) return
      o.mesh.visible  = vis
      o.glow.visible  = vis
      o.label.visible = false
      if (o.selGlow) o.selGlow.visible = vis
      o.secondaryGlows?.forEach(sg => { sg.visible = vis })
    })

    // Update line visibility
    const lineVis = line => {
      const { source, target } = line.userData
      const srcNode = nodesMap[source]
      const tgtNode = nodesMap[target]
      line.visible = nodeIsVisible(srcNode) && nodeIsVisible(tgtNode)
    }
    Object.values(lines).forEach(lineVis)
    Object.values(hierLines).forEach(lineVis)

    // Update convex hull visibility
    Object.entries(hullsRef.current).forEach(([catId, { fill, edges }]) => {
      const vis = activeCategories.has(catId)
      fill.visible  = vis
      edges.visible = vis
    })
  }, [activeCategories])

  // ── Sync debug visualization (cluster centers) ────────────────────────────
  useEffect(() => {
    const debugObjects = debugObjectsRef.current
    if (!debugObjects || !Object.keys(debugObjects).length) return
    
    Object.keys(categories).forEach(catId => {
      const isActive = activeCategories.has(catId)
      
      // Show/hide center sphere
      const center = debugObjects.centers?.[catId]
      if (center) {
        center.visible = showClusterCenters && isActive
      }
      
      // Show/hide label
      const label = debugObjects.labels?.[catId]
      if (label) {
        label.visible = showCategoryLabels && isActive
        label.material.opacity = showCategoryLabels && isActive ? 0.9 : 0
      }
      
      // Show/hide connecting lines
      const lines = debugObjects.lines?.[catId]
      if (lines) {
        lines.visible = showClusterCenters && isActive
      }
    })
  }, [showCategoryLabels, showClusterCenters, activeCategories])

  // ── Sync panel hover highlighting ─────────────────────────────────────────
  useEffect(() => {
    const objs = objsRef.current
    const lines = linesRef.current
    if (!Object.keys(objs).length) return
    
    // Clear previous hover effects if no hovered node
    if (!hoveredNodeId) {
      // Reset all nodes to normal (except selected)
      nodes.forEach(n => {
        const o = objs[n.id]
        if (!o || selectedRef.current === n.id) return
        const tg = o.tg
        o.mesh.scale.setScalar(selectedRef.current === n.id ? 1.3 : 1)
        o.glow.scale.setScalar(selectedRef.current === n.id ? tg.selScale : tg.idleScale)
        o.mesh.material.opacity = 1
        o.glow.material.opacity = tg.baseOpacity
        o.label.material.opacity = 0
      })
      // Reset lines
      Object.values(lines).forEach(line => {
        line.material.color.set(0xffffff)
        line.material.opacity = 0.11
      })
      return
    }
    
    // Apply hover effect to panel-hovered node
    const hoveredNode = nodes.find(n => n.id === hoveredNodeId)
    if (!hoveredNode) return
    
    const o = objs[hoveredNodeId]
    if (!o) return
    
    // Get connected nodes
    const connected = new Set()
    edges.forEach(e => {
      if (e.source === hoveredNodeId) connected.add(e.target)
      if (e.target === hoveredNodeId) connected.add(e.source)
    })
    
    // Highlight hovered node
    o.mesh.scale.setScalar(1.65)
    o.glow.scale.setScalar(o.tg.hoverScale)
    o.glow.material.opacity = 1
    o.label.material.opacity = 1
    
    // Highlight connections
    Object.values(lines).forEach(line => {
      const { source, target } = line.userData
      if (source === hoveredNodeId || target === hoveredNodeId) {
        const catColor = CAT_COLORS[hoveredNode.categories?.[0]]
        line.material.color.set(catColor)
        line.material.opacity = 0.85
      } else {
        line.material.opacity = 0.04
      }
    })
    
    // Dim other nodes
    nodes.forEach(n => {
      if (n.id === hoveredNodeId || connected.has(n.id)) return
      const nodeObj = objs[n.id]
      if (!nodeObj || selectedRef.current === n.id) return
      nodeObj.mesh.material.opacity = 0.22
      nodeObj.glow.material.opacity = 0.15
    })
  }, [hoveredNodeId])

  // ── Camera animation for panel tag clicks ────────────────────────────────
  useEffect(() => {
    if (!cameraTargetNode) return
    
    // Use ref to trigger camera pan (function is inside main useEffect)
    if (triggerCameraPanRef.current) {
      triggerCameraPanRef.current(cameraTargetNode.id)
    }
    
    // Clear camera target after triggering
    setCameraTargetNode(null)
  }, [cameraTargetNode, setCameraTargetNode])

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

    // ── Equatorial ring ───────────────────────────────────────────────────
    const equatorRing = new THREE.Mesh(
      new THREE.TorusGeometry(SPHERE_RADIUS, 0.045, 8, 160),
      new THREE.MeshBasicMaterial({ color: 0x4facfe, transparent: true, opacity: 0.45, depthWrite: false })
    )
    equatorRing.rotation.x = Math.PI / 2
    scene.add(equatorRing)

    // ── Debug visualization (cluster centers) ──────────────────────────────
    const debugObjects = { centers: {}, labels: {}, lines: {} }
    
    // Calculate actual cluster centers from Tier 1-3 node positions only (exclude Tier 0)
    const computedCenters = {}
    Object.keys(categories).forEach(catId => {
      // Only include Tier 1, 2, 3 nodes (exclude Tier 0 Foundation nodes)
      const catNodes = nodes.filter(n => {
        const tier = n.tier ?? 2
        return tier > 0 && n.categories?.includes(catId)
      })
      
      if (catNodes.length === 0) {
        // Fallback to cluster center direction if no Tier 1-3 nodes
        computedCenters[catId] = CLUSTER_CENTERS[catId].clone().multiplyScalar(SPHERE_RADIUS)
        return
      }
      
      const center = new THREE.Vector3()
      catNodes.forEach(n => {
        center.add(NODE_POSITIONS[n.id])
      })
      center.divideScalar(catNodes.length)
      computedCenters[catId] = center
    })
    
    // Create debug visualizations for each category
    Object.entries(categories).forEach(([catId, cat]) => {
      const centerPos = computedCenters[catId]
      const catColor = new THREE.Color(cat.color)
      
      // 1. Center point (small sphere)
      const centerSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 16, 12),
        new THREE.MeshBasicMaterial({ 
          color: catColor, 
          transparent: true, 
          opacity: 0.8 
        })
      )
      centerSphere.position.copy(centerPos)
      centerSphere.visible = false
      centerSphere.raycast = () => {} // Non-interactive
      scene.add(centerSphere)
      debugObjects.centers[catId] = centerSphere
      
      // 2. Label sprite
      const labelTexture = makeLabelTexture(cat.name.toUpperCase())
      const labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: labelTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }))
      labelSprite.position.copy(centerPos).add(new THREE.Vector3(0, 0.8, 0))
      labelSprite.scale.set(3, 0.7, 1)
      labelSprite.visible = false
      labelSprite.raycast = () => {} // Non-interactive
      scene.add(labelSprite)
      debugObjects.labels[catId] = labelSprite
      
      // 3. Lines from center to each node in category
      const lineGeo = new THREE.BufferGeometry()
      const linePositions = []
      const catNodes = nodes.filter(n => n.categories?.includes(catId))
      catNodes.forEach(n => {
        const nodePos = NODE_POSITIONS[n.id]
        linePositions.push(centerPos.x, centerPos.y, centerPos.z)
        linePositions.push(nodePos.x, nodePos.y, nodePos.z)
      })
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
      const lineMat = new THREE.LineBasicMaterial({ 
        color: catColor, 
        transparent: true, 
        opacity: 0.3 
      })
      const lineMesh = new THREE.LineSegments(lineGeo, lineMat)
      lineMesh.visible = false
      lineMesh.raycast = () => {} // Non-interactive
      scene.add(lineMesh)
      debugObjects.lines[catId] = lineMesh
    })
    
    // Store debug objects in ref for external access
    debugObjectsRef.current = debugObjects

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
      const tier  = node.tier ?? 2
      const cats  = node.categories?.length ? node.categories : []
      const primaryCat = cats[0]
      const tg    = TIER_GLOW[tier]
      const nodeR = TIER_NODE_R[tier]

      // Color: neutral for T0, single-cat for single-category, equal blend for multi-category
      let color
      if (!cats.length) {
        color = NEUTRAL_COLOR
      } else if (cats.length === 1) {
        color = TIER_CAT_COLORS[tier][primaryCat]
      } else {
        // Equal-weight average of all category colors for this tier
        color = new THREE.Color(0, 0, 0)
        cats.forEach(cat => {
          const c = TIER_CAT_COLORS[tier][cat]
          if (c) { color.r += c.r; color.g += c.g; color.b += c.b }
        })
        color.multiplyScalar(1 / cats.length)
      }

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(nodeR, 20, 20),
        new THREE.MeshStandardMaterial({
          color, emissive: color, emissiveIntensity: tier === 0 ? 0.6 : 0.5,
          roughness: 0.3, metalness: 0.4, transparent: true,
        })
      )
      mesh.position.copy(pos)
      mesh.userData.nodeId = node.id

      // AWS logo texture on the sphere
      if (node.id === 'aws') {
        mesh.material.map = AWS_LOGO_TEX
        mesh.material.color.set(0xffffff)
        mesh.material.emissive.set(0xFF9900)
        mesh.material.emissiveIntensity = 0.3
        mesh.material.needsUpdate = true
      }

      scene.add(mesh)
      meshList.push(mesh)

      // Glow texture: uncategorized → white, multi-cat → pie-slice blend, single-cat → standard
      const glowTexture = !cats.length
        ? WHITE_GLOW_TEX
        : cats.length > 1
          ? makeMultiCategoryGlowTexture(cats, tier)
          : TIER_GLOW_TEXTURES[tier][primaryCat]

      const glowOpacity = !cats.length ? 0.55 : tg.baseOpacity
      
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture,
        blending: THREE.AdditiveBlending, transparent: true, opacity: glowOpacity, depthWrite: false,
      }))
      glow.position.copy(pos)
      glow.scale.set(tg.idleScale, tg.idleScale, 1)
      scene.add(glow)

      // Secondary glow rings for additional categories (for tier 1+ nodes)
      const secondaryGlows = []
      if (tier > 0 && cats.length > 1) {
        cats.slice(1).forEach(secCat => {
          const sg = new THREE.Sprite(new THREE.SpriteMaterial({
            map: TIER_GLOW_TEXTURES[tier][secCat],
            blending: THREE.AdditiveBlending, transparent: true, opacity: 0.25, depthWrite: false,
          }))
          sg.position.copy(pos)
          sg.scale.set(tg.idleScale * 1.45, tg.idleScale * 1.45, 1)
          scene.add(sg)
          secondaryGlows.push(sg)
        })
      }

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

    // ── Satellite orbit rings ─────────────────────────────────────────────
    nodes.filter(n => n.subtype === 'satellite').forEach(node => {
      const params = SATELLITE_PARAMS[node.id]
      if (!params) return
      const pts = []
      for (let i = 0; i <= 128; i++) {
        pts.push(getSatellitePosAtAngle(params, (i / 128) * Math.PI * 2))
      }
      const catColor = CAT_COLORS[node.categories?.[0]] ?? new THREE.Color(0xffffff)
      const ring = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: catColor, transparent: true, opacity: 0.18, depthWrite: false })
      )
      scene.add(ring)
    })

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

    // ── Track edges connected to satellite nodes ───────────────────────────
    const satelliteIds = new Set(nodes.filter(n => n.subtype === 'satellite').map(n => n.id))
    const satEdges = []
    const checkLine = (line) => {
      const { source, target } = line.userData
      const srcSat = satelliteIds.has(source)
      const tgtSat = satelliteIds.has(target)
      if (!srcSat && !tgtSat) return
      satEdges.push({ line, satIndex: srcSat ? 0 : 1, satId: srcSat ? source : target })
    }
    Object.values(linesRef.current).forEach(checkLine)
    Object.values(hierLinesRef.current).forEach(checkLine)
    satelliteEdgesRef.current = satEdges

    // ── Category convex hulls ─────────────────────────────────────────────
    const HULL_SHRINK = 1.20   // expand each vertex this fraction away from centroid
    const hulls = {}
    Object.entries(categories).forEach(([catId, cat]) => {
      // Only tier 1-3 nodes that belong to this category
      const catNodes = nodes.filter(n => (n.tier ?? 2) > 0 && n.categories?.includes(catId))
      if (catNodes.length < 4) return

      const pts = catNodes.map(n => NODE_POSITIONS[n.id].clone())
      const centroid = new THREE.Vector3()
      pts.forEach(p => centroid.add(p))
      centroid.divideScalar(pts.length)
      const shrunkPts = pts.map(p => new THREE.Vector3().lerpVectors(centroid, p, HULL_SHRINK))

      try {
        const catColor = new THREE.Color(cat.color)
        const geo = new ConvexGeometry(shrunkPts)

        const fill = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
          color: catColor, transparent: true, opacity: 0.04,
          side: THREE.DoubleSide, depthWrite: false,
        }))
        scene.add(fill)

        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({ color: catColor, transparent: true, opacity: 0.30, depthWrite: false })
        )
        scene.add(edges)

        hulls[catId] = { fill, edges }
      } catch (e) {
        console.warn(`Convex hull skipped for ${catId}:`, e)
      }
    })
    hullsRef.current = hulls

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
      
      // ── Camera pan animation when node is near screen edge ───────────────
      triggerCameraPanIfNeeded(nodeId)
    }
    
    // Check if node is near screen edge and trigger smooth camera pan
    function triggerCameraPanIfNeeded(nodeId) {
      const nodePos = NODE_POSITIONS[nodeId]
      if (!nodePos) return
      
      // Project node position to screen space (NDC)
      const projected = nodePos.clone().project(camera)
      
      // Check if node is near any edge of the screen
      const threshold = cameraAnimRef.current.edgeThreshold
      const isNearEdge = 
        Math.abs(projected.x) > threshold || 
        Math.abs(projected.y) > threshold * 0.8 // slightly more sensitive for top/bottom
      
      if (!isNearEdge) return
      
      // Calculate how far the node is from center in screen space
      const offsetX = projected.x // -0 to +1 range in NDC
      const offsetY = projected.y
      
      // Get camera's right and up vectors in world space
      const cameraDir = new THREE.Vector3()
      camera.getWorldDirection(cameraDir)
      const cameraRight = new THREE.Vector3().crossVectors(camera.up, cameraDir).normalize()
      const cameraUp = camera.up.clone()
      
      // Calculate camera movement to center the node
      // If node is at +0.7 (right side), we need to move camera right
      // Target is to bring node to x = -0.2 (slight left of center, accounting for panel)
      const targetScreenX = -0.15
      const targetScreenY = 0
      
      const deltaScreenX = offsetX - targetScreenX
      const deltaScreenY = offsetY - targetScreenY
      
      // Convert screen offset to world space movement
      // Approximate: at distance d, screen width ~ 2*d*tan(fov/2)
      const dist = camera.position.distanceTo(nodePos)
      const fovRad = (camera.fov * Math.PI) / 180
      const screenWidthAtDist = 2 * dist * Math.tan(fovRad / 2)
      const screenHeightAtDist = screenWidthAtDist / camera.aspect
      
      // Movement needed in world space
      const moveRight = cameraRight.multiplyScalar(-deltaScreenX * screenWidthAtDist * 0.5)
      const moveUp = cameraUp.multiplyScalar(-deltaScreenY * screenHeightAtDist * 0.5)
      
      // Target camera position
      const targetPos = camera.position.clone().add(moveRight).add(moveUp)
      
      // Ensure minimum height and comfortable distance
      const minHeight = nodePos.y + 8
      if (targetPos.y < minHeight) targetPos.y = minHeight
      
      // Maintain distance if too close
      const finalDist = targetPos.distanceTo(nodePos)
      if (finalDist < 22) {
        const dirFromNode = targetPos.clone().sub(nodePos).normalize()
        targetPos.copy(nodePos).add(dirFromNode.multiplyScalar(22))
      }
      
      // Start camera animation
      cameraAnimRef.current.isAnimating = true
      cameraAnimRef.current.startPos.copy(camera.position)
      cameraAnimRef.current.targetPos.copy(targetPos)
      cameraAnimRef.current.startTime = performance.now()
      
      // Disable controls during animation
      controls.enabled = false
    }
    
    // Smooth easing function (ease-in-out-cubic)
    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    }
    
    // Trigger camera pan to specific node (for panel tag clicks)
    function triggerCameraPan(nodeId) {
      const nodePos = NODE_POSITIONS[nodeId]
      if (!nodePos) return
      
      // Safety check: ensure camera position is valid
      if (!camera.position || camera.position.length() === 0) return
      
      // Fixed camera distance constraints
      const MIN_CAMERA_DIST = 22  // Minimum comfortable viewing distance
      const MAX_CAMERA_DIST = 32  // Maximum allowed viewing distance
      const DEFAULT_DIST = 28     // Default preferred distance
      
      // Calculate current distance to node
      const currentDist = camera.position.distanceTo(nodePos)
      
      // If camera is too close to node, use a default offset direction
      let viewDir
      if (currentDist < 0.1) {
        viewDir = new THREE.Vector3(0, 0, 1) // Default: view from +Z
      } else {
        viewDir = camera.position.clone().sub(nodePos).normalize()
      }
      
      // Clamp target distance to fixed range (prevents drifting)
      // Use current direction but enforce distance limits
      let targetDist = DEFAULT_DIST
      if (currentDist >= MIN_CAMERA_DIST && currentDist <= MAX_CAMERA_DIST) {
        // Current distance is acceptable, keep it
        targetDist = currentDist
      } else if (currentDist < MIN_CAMERA_DIST) {
        // Too close, push back
        targetDist = MIN_CAMERA_DIST
      } else {
        // Too far, pull in
        targetDist = MAX_CAMERA_DIST
      }
      
      // Target position: view direction at controlled distance
      // with slight offset to account for left panel
      const idealOffset = new THREE.Vector3(6, 0, 0)
      const targetPos = nodePos.clone()
        .add(viewDir.clone().multiplyScalar(targetDist))
        .add(idealOffset)
      
      // Ensure minimum height
      targetPos.y = Math.max(targetPos.y, nodePos.y + 6)
      
      // Safety check: ensure target position is valid
      if (!isFinite(targetPos.x) || !isFinite(targetPos.y) || !isFinite(targetPos.z)) {
        console.warn('Invalid camera target position, aborting pan')
        return
      }
      
      // Start camera animation
      cameraAnimRef.current.isAnimating = true
      cameraAnimRef.current.startPos.copy(camera.position)
      cameraAnimRef.current.targetPos.copy(targetPos)
      cameraAnimRef.current.startTime = performance.now()
      
      // Disable controls during animation
      controls.enabled = false
    }
    
    // Expose triggerCameraPan via ref for external access
    triggerCameraPanRef.current = triggerCameraPan

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
    const CLOSE_ORBIT_R_INIT = 5.5    // initial distance from node (units)
    const CLOSE_ORBIT_R_MIN  = 2.5
    const CLOSE_ORBIT_R_MAX  = 10.0
    let closeOrbitR     = CLOSE_ORBIT_R_INIT
    let closeOrbitTheta = 0
    let closeOrbitPhi   = Math.PI / 2
    let prevOrbitActive = false
    let prevLockView    = false
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
        const alwaysLabel = showNodeLabelsRef?.current && (node.tier ?? 2) <= 2
        const targetOp = (isHov || alwaysLabel) ? 1 : 0
        o.label.material.opacity += (targetOp - o.label.material.opacity) * 0.12
      })

      // ── Satellite orbital positions ──────────────────────────────────────
      nodes.forEach(node => {
        if (node.subtype !== 'satellite') return
        const params = SATELLITE_PARAMS[node.id]
        if (!params) return
        const o = objs[node.id]
        if (!o) return

        const pos = getSatellitePos(params, t)

        o.mesh.position.copy(pos)
        o.glow.position.copy(pos)
        o.secondaryGlows?.forEach(sg => sg.position.copy(pos))
        if (o.selGlow) o.selGlow.position.copy(pos)
        o.label.position.set(pos.x, pos.y + TIER_NODE_R[0] + TIER_LABEL_OFFSET[0], pos.z)
      })

      // ── Update edges connected to satellites ─────────────────────────────
      satelliteEdgesRef.current.forEach(({ line, satIndex, satId }) => {
        const satMesh = objsRef.current[satId]?.mesh
        if (!satMesh) return
        const pa = line.geometry.attributes.position
        pa.setXYZ(satIndex, satMesh.position.x, satMesh.position.y, satMesh.position.z)
        pa.needsUpdate = true
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
        
        // ── Handle camera pan animation when selecting edge nodes ───────────
        if (cameraAnimRef.current.isAnimating) {
          const anim = cameraAnimRef.current
          const elapsed = performance.now() - anim.startTime
          const progress = Math.min(elapsed / anim.duration, 1)
          const eased = easeInOutCubic(progress)
          
          // Interpolate camera position
          camera.position.lerpVectors(anim.startPos, anim.targetPos, eased)
          
          // Continue looking at the selected node
          const selId = selectedRef.current
          if (selId && NODE_POSITIONS[selId]) {
            const target = NODE_POSITIONS[selId]
            camera.lookAt(target.x, target.y, target.z)
          }
          
          // Animation complete
          if (progress >= 1) {
            anim.isAnimating = false
            controls.enabled = true
            // Update controls target to maintain relative orientation
            const selId = selectedRef.current
            if (selId && NODE_POSITIONS[selId]) {
              const target = NODE_POSITIONS[selId]
              controls.target.set(target.x, target.y, target.z)
            }
          }
        } else {
          controls.update()
        }
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
