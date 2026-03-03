import { useState, useCallback, useRef, useEffect } from 'react'
import { KnowledgeGraph, MM_W, MM_H, MM_MARGIN } from './KnowledgeGraph.jsx'
import { nodes, edges, categories, nodesMap } from './data.js'

const LEVEL_COLORS = {
  Expert:       '#22c55e',
  Advanced:     '#3b82f6',
  Intermediate: '#f59e0b',
  Beginner:     '#64748b',
}

const MAX_YEARS = Math.max(...nodes.map(n => n.years))

// ── Stats Widget ─────────────────────────────────────────────────────────────
function StatsWidget({ statsRef }) {
  const fpsValRef = useRef(null)
  const fpsBarRef = useRef(null)
  const memValRef = useRef(null)
  const memBarRef = useRef(null)
  const gpuValRef = useRef(null)
  const gpuBarRef = useRef(null)

  useEffect(() => {
    let rafId
    const MEM_MAX = 500  // MB ceiling for bar scale
    const GPU_MAX = 33.3 // ms ceiling (≈ 30 fps budget)

    function tick() {
      rafId = requestAnimationFrame(tick)
      const { fps = 0, gpuMs = 0, gpuSupported = false } = statsRef.current ?? {}

      // FPS
      if (fpsValRef.current) {
        fpsValRef.current.textContent = fps
        const ok = fps >= 50, warn = fps >= 30
        fpsValRef.current.style.color = ok ? '#4ade80' : warn ? '#fbbf24' : '#f87171'
        fpsBarRef.current.style.width  = `${Math.min((fps / 60) * 100, 100)}%`
        fpsBarRef.current.style.background = ok ? '#4ade80' : warn ? '#fbbf24' : '#f87171'
      }

      // Memory
      if (memValRef.current) {
        if (performance.memory) {
          const mb = (performance.memory.usedJSHeapSize / 1048576).toFixed(1)
          memValRef.current.textContent = `${mb} MB`
          memBarRef.current.style.width = `${Math.min((mb / MEM_MAX) * 100, 100)}%`
        } else {
          memValRef.current.textContent = 'N/A'
          memBarRef.current.style.width = '0%'
        }
      }

      // GPU
      if (gpuValRef.current) {
        if (gpuSupported) {
          gpuValRef.current.textContent = `${gpuMs} ms`
          const ok = gpuMs < 8, warn = gpuMs < 16
          gpuValRef.current.style.color  = ok ? '#4ade80' : warn ? '#fbbf24' : '#f87171'
          gpuBarRef.current.style.width  = `${Math.min((gpuMs / GPU_MAX) * 100, 100)}%`
          gpuBarRef.current.style.background = ok ? '#4ade80' : warn ? '#fbbf24' : '#f87171'
        } else {
          gpuValRef.current.textContent = 'N/A'
          gpuBarRef.current.style.width = '0%'
        }
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [statsRef])

  return (
    <div className="stats-widget">
      <div className="stats-header">PERF</div>

      <div className="stat-row">
        <span className="stat-label">FPS</span>
        <span className="stat-value" ref={fpsValRef}>—</span>
      </div>
      <div className="stat-bar-track">
        <div className="stat-bar-fill" ref={fpsBarRef} style={{ width: '0%' }} />
      </div>

      <div className="stat-row">
        <span className="stat-label">MEM</span>
        <span className="stat-value" ref={memValRef}>—</span>
      </div>
      <div className="stat-bar-track">
        <div className="stat-bar-fill" ref={memBarRef} style={{ width: '0%', background: '#38bdf8' }} />
      </div>

      <div className="stat-row">
        <span className="stat-label">GPU</span>
        <span className="stat-value" ref={gpuValRef}>—</span>
      </div>
      <div className="stat-bar-track">
        <div className="stat-bar-fill" ref={gpuBarRef} style={{ width: '0%' }} />
      </div>
    </div>
  )
}

const TIER_LABELS = { 1: 'L1', 2: 'L2', 3: 'L3' }
const TIER_NAMES  = { 1: 'Core Platform', 2: 'Framework', 3: 'Library' }

// ── Info Panel ──────────────────────────────────────────────────────────────
function InfoPanel({ node, onClose, orbitActive, onToggleOrbit }) {
  const cat  = categories[node.category]
  const tier = node.tier || 2

  // Semantic connections only (exclude hierarchy edges)
  const connected = edges
    .filter(e => !e.type && (e.source === node.id || e.target === node.id))
    .map(e => e.source === node.id ? e.target : e.source)
    .map(id => nodesMap[id])
    .filter(Boolean)

  // Hierarchy: parents (edges where this node is the child)
  const parents = edges
    .filter(e => e.type === 'hierarchy' && e.target === node.id)
    .map(e => nodesMap[e.source])
    .filter(Boolean)

  // Hierarchy: children (edges where this node is the parent)
  const children = edges
    .filter(e => e.type === 'hierarchy' && e.source === node.id)
    .map(e => nodesMap[e.target])
    .filter(Boolean)

  const expPct = Math.round((node.years / MAX_YEARS) * 100)

  return (
    <aside className="info-panel" style={{ '--cat': cat.color }}>

      {/* ── Header ── */}
      <div className="panel-head">
        <div className="panel-head-left" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span className="panel-category-tag" style={{ color: cat.color, borderColor: cat.color }}>
            {cat.name}
          </span>
          <span className={`tier-badge tier-${tier}`} title={TIER_NAMES[tier]}>
            {TIER_LABELS[tier]}
          </span>
        </div>
        <button className="panel-close" onClick={onClose} aria-label="close">✕</button>
      </div>

      <h2 className="panel-title">{node.label}</h2>

      {/* ── Stats row ── */}
      <div className="panel-stats-row">
        <div className="panel-stat-cell">
          <span className="psc-label">LEVEL</span>
          <span className="level-badge" style={{ background: LEVEL_COLORS[node.level] }}>
            {node.level}
          </span>
        </div>
        <div className="panel-stat-cell">
          <span className="psc-label">EXPERIENCE</span>
          <span className="psc-value">{node.years} yr{node.years !== 1 ? 's' : ''}</span>
        </div>
        <div className="panel-stat-cell">
          <span className="psc-label">CONNECTIONS</span>
          <span className="psc-value">{connected.length}</span>
        </div>
      </div>

      {/* ── Experience bar ── */}
      <div className="exp-bar-wrap">
        <div className="exp-bar-header">
          <span className="exp-bar-label">Proficiency</span>
          <span className="exp-bar-pct">{expPct}%</span>
        </div>
        <div className="exp-bar-track">
          <div className="exp-bar-fill" style={{ width: `${expPct}%`, background: cat.color }} />
        </div>
      </div>

      <div className="panel-divider" />

      {/* ── Description ── */}
      <p className="panel-description">{node.description}</p>

      {/* ── Cross-category membership ── */}
      {node.secondaryCategories?.length > 0 && (
        <div className="panel-connections">
          <span className="panel-section-label">ALSO IN</span>
          <div className="connection-tags">
            {node.secondaryCategories.map(catId => (
              <span key={catId} className="conn-tag"
                style={{ borderColor: categories[catId].color, color: categories[catId].color }}>
                {categories[catId].name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Hierarchy: parents ── */}
      {parents.length > 0 && (
        <div className="panel-connections" style={{ marginTop: '8px' }}>
          <span className="panel-section-label">BUILT ON</span>
          <div className="connection-tags">
            {parents.map(n => (
              <span key={n.id} className="conn-tag conn-tag-parent"
                style={{ borderColor: categories[n.category].color, color: categories[n.category].color }}>
                ↑ {n.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Hierarchy: children ── */}
      {children.length > 0 && (
        <div className="panel-connections" style={{ marginTop: '8px' }}>
          <span className="panel-section-label">CHILDREN</span>
          <div className="connection-tags">
            {children.map(n => (
              <span key={n.id} className="conn-tag"
                style={{ borderColor: categories[n.category].color, color: categories[n.category].color }}>
                {n.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Semantic connections ── */}
      {connected.length > 0 && (
        <div className="panel-connections" style={{ marginTop: '8px' }}>
          <span className="panel-section-label">LINKED NODES</span>
          <div className="connection-tags">
            {connected.map(n => (
              <span key={n.id} className="conn-tag"
                style={{ borderColor: categories[n.category].color, color: categories[n.category].color }}>
                {n.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="panel-divider" />

      {/* ── Orbit action button ── */}
      <button
        className={`orbit-btn ${orbitActive ? 'active' : ''}`}
        onClick={onToggleOrbit}
        title={orbitActive ? '停止巡航' : '围绕星球巡航'}
      >
        <svg className="orbit-btn-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="10" cy="10" r="3" />
          <path d="M10 2 a8 8 0 0 1 0 16 a8 8 0 0 1 0 -16" strokeDasharray="3 2.5" />
          <path d="M18 10 l-2.5-2 M18 10 l-2.5 2" />
        </svg>
        <span className="orbit-btn-label">
          {orbitActive ? '停止巡航' : '主视角巡航'}
        </span>
        {orbitActive && <span className="orbit-live-badge">LIVE</span>}
      </button>

    </aside>
  )
}

// ── Filter Bar ───────────────────────────────────────────────────────────────
function FilterBar({ active, onToggle }) {
  return (
    <nav className="filter-bar">
      {Object.values(categories).map(cat => {
        const isActive = active.has(cat.id)
        return (
          <button
            key={cat.id}
            className={`filter-btn ${isActive ? 'active' : ''}`}
            style={{ '--cat-color': cat.color }}
            onClick={() => onToggle(cat.id)}
            title={isActive ? `Hide ${cat.name}` : `Show ${cat.name}`}
          >
            <span className="filter-dot" />
            {cat.name}
          </button>
        )
      })}
    </nav>
  )
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const graphStatsRef  = useRef({ fps: 0, gpuMs: 0, gpuSupported: false })
  const mmExpandedRef  = useRef(false)
  const mmFrameRef     = useRef(null)
  const orbitActiveRef = useRef(false)
  const [mmExpanded,   setMmExpanded]   = useState(false)
  const [orbitActive,  setOrbitActive]  = useState(false)
  const [selectedNode, setSelectedNode] = useState(null)
  const [activeCategories, setActiveCategories] = useState(
    () => new Set(Object.keys(categories))
  )

  const toggleCategory = useCallback((catId) => {
    setActiveCategories(prev => {
      const next = new Set(prev)
      if (next.has(catId)) {
        // keep at least one category visible
        if (next.size > 1) next.delete(catId)
      } else {
        next.add(catId)
      }
      return next
    })
  }, [])

  const handleNodeSelect = useCallback((node) => {
    setSelectedNode(node)
  }, [])

  const toggleMinimap = useCallback(() => {
    setMmExpanded(prev => {
      mmExpandedRef.current = !prev
      return !prev
    })
  }, [])

  const toggleOrbit = useCallback(() => {
    setOrbitActive(prev => {
      orbitActiveRef.current = !prev
      return !prev
    })
  }, [])

  return (
    <div className="app">
      {/* Three.js canvas */}
      <div className="canvas-wrap">
        <KnowledgeGraph
          activeCategories={activeCategories}
          onNodeSelect={handleNodeSelect}
          statsRef={graphStatsRef}
          mmExpandedRef={mmExpandedRef}
          mmFrameRef={mmFrameRef}
          orbitActiveRef={orbitActiveRef}
        />
      </div>

      {/* Performance stats widget */}
      <StatsWidget statsRef={graphStatsRef} />

      {/* Title */}
      <header className="title-block">
        <h1>Knowledge Graph</h1>
        <p>{nodes.length} skills &nbsp;·&nbsp; {edges.filter(e => !e.type).length} connections</p>
      </header>

      {/* Hint */}
      <p className="hint">Drag to orbit &nbsp;·&nbsp; Scroll to zoom &nbsp;·&nbsp; Click a node to inspect</p>

      {/* Category filter */}
      <FilterBar active={activeCategories} onToggle={toggleCategory} />

      {/* Minimap decorative frame overlay (actual 3D content is drawn by the renderer via scissor) */}
      <div
        ref={mmFrameRef}
        className="minimap-frame"
        style={{ width: MM_W, height: MM_H, right: MM_MARGIN, bottom: MM_MARGIN }}
      >
        <span className="minimap-label">NAV</span>
        <button
          className={`minimap-toggle ${mmExpanded ? 'expanded' : ''}`}
          onClick={toggleMinimap}
          title={mmExpanded ? '缩小小地图' : '放大小地图'}
        >
          {mmExpanded ? '⊡' : '⛶'}
        </button>
        <span className="minimap-hint">拖动可旋转视角</span>
      </div>

      {/* Node info panel */}
      {selectedNode && (
        <InfoPanel
          node={selectedNode}
          onClose={() => { setSelectedNode(null); setOrbitActive(false); orbitActiveRef.current = false }}
          orbitActive={orbitActive}
          onToggleOrbit={toggleOrbit}
        />
      )}
    </div>
  )
}
