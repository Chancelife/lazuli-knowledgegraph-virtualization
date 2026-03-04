import { useRef, useEffect } from 'react'
import { KnowledgeGraph, MM_W, MM_H, MM_MARGIN } from './KnowledgeGraph.jsx'
import { nodes, edges, categories, nodesMap } from './data.js'
import { useKnowledgeStore } from './store.js'

const LEVEL_COLORS = {
  Expert:       '#22c55e',
  Advanced:     '#3b82f6',
  Intermediate: '#f59e0b',
  Beginner:     '#64748b',
}

const MAX_YEARS = Math.max(...nodes.map(n => n.years))

// ── Stats Widget ─────────────────────────────────────────────────────────────
function StatsWidget() {
  const statsRef = useKnowledgeStore(state => state.statsRef)
  const fpsValRef = useRef(null)
  const fpsBarRef = useRef(null)
  const memValRef = useRef(null)
  const memBarRef = useRef(null)
  const gpuValRef = useRef(null)
  const gpuBarRef = useRef(null)

  useEffect(() => {
    let rafId
    const MEM_MAX = 500
    const GPU_MAX = 33.3

    function tick() {
      rafId = requestAnimationFrame(tick)
      const { fps = 0, gpuMs = 0, gpuSupported = false } = statsRef.current ?? {}

      if (fpsValRef.current) {
        fpsValRef.current.textContent = fps
        const ok = fps >= 50, warn = fps >= 30
        fpsValRef.current.style.color = ok ? '#4ade80' : warn ? '#fbbf24' : '#f87171'
        fpsBarRef.current.style.width  = `${Math.min((fps / 60) * 100, 100)}%`
        fpsBarRef.current.style.background = ok ? '#4ade80' : warn ? '#fbbf24' : '#f87171'
      }

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

// ── Info Panel ──────────────────────────────────────────────────────────────
const TIER_LABELS = { 0: 'F', 1: 'L1', 2: 'L2', 3: 'L3' }
const TIER_NAMES  = { 0: 'Foundation', 1: 'Core Platform', 2: 'Framework', 3: 'Library' }

function InfoPanel() {
  const selectedNode = useKnowledgeStore(state => state.selectedNode)
  const orbitActive = useKnowledgeStore(state => state.orbitActive)
  const closePanel = useKnowledgeStore(state => state.closePanel)
  const toggleOrbit = useKnowledgeStore(state => state.toggleOrbit)
  const setSelectedNode = useKnowledgeStore(state => state.setSelectedNode)
  const setHoveredNodeId = useKnowledgeStore(state => state.setHoveredNodeId)
  const navigateToNode = useKnowledgeStore(state => state.navigateToNode)
  
  const handleNodeClick = (node, e) => {
    // Prevent default behavior and stop propagation
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    // Don't navigate if clicking the currently selected node
    if (selectedNode?.id === node.id) return
    
    // Navigate with camera animation - this updates both camera target and selected node
    navigateToNode(node)
  }
  
  const handleNodeHover = (nodeId) => {
    setHoveredNodeId(nodeId)
  }
  
  const handleNodeHoverEnd = () => {
    setHoveredNodeId(null)
  }

  if (!selectedNode) return null

  const node = selectedNode
  const cats = node.categories || []
  const primaryCat = categories[cats[0]]
  const otherCats = cats.slice(1)
  const tier = node.tier ?? 2

  const connected = edges
    .filter(e => !e.type && (e.source === node.id || e.target === node.id))
    .map(e => e.source === node.id ? e.target : e.source)
    .map(id => nodesMap[id])
    .filter(Boolean)

  const parents = edges
    .filter(e => e.type === 'hierarchy' && e.target === node.id)
    .map(e => nodesMap[e.source])
    .filter(Boolean)

  const children = edges
    .filter(e => e.type === 'hierarchy' && e.source === node.id)
    .map(e => nodesMap[e.target])
    .filter(Boolean)

  const expPct = Math.round((node.years / MAX_YEARS) * 100)

  return (
    <aside className="info-panel" style={{ '--cat': primaryCat.color }}>

      <div className="panel-head">
        <div className="panel-head-left" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span className="panel-category-tag" style={{ color: primaryCat.color, borderColor: primaryCat.color }}>
            {primaryCat.name}
          </span>
          <span className={`tier-badge tier-${tier}`} title={TIER_NAMES[tier]}>
            {TIER_LABELS[tier]}
          </span>
        </div>
        <button className="panel-close" onClick={closePanel} aria-label="close">✕</button>
      </div>

      <h2 className="panel-title">{node.label}</h2>

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
          <span className="psc-label">TIER</span>
          <span className="psc-value">{TIER_NAMES[tier]}</span>
        </div>
      </div>

      <div className="exp-bar-wrap">
        <div className="exp-bar-header">
          <span className="exp-bar-label">Proficiency</span>
          <span className="exp-bar-pct">{expPct}%</span>
        </div>
        <div className="exp-bar-track">
          <div className="exp-bar-fill" style={{ width: `${expPct}%`, background: primaryCat.color }} />
        </div>
      </div>

      <div className="panel-divider" />

      <p className="panel-description">{node.description}</p>

      {otherCats.length > 0 && (
        <div className="panel-connections">
          <span className="panel-section-label">ALSO IN</span>
          <div className="connection-tags">
            {otherCats.map(catId => (
              <span key={catId} className="conn-tag"
                style={{ borderColor: categories[catId].color, color: categories[catId].color }}>
                {categories[catId].name}
              </span>
            ))}
          </div>
        </div>
      )}

      {parents.length > 0 && (
        <div className="panel-connections" style={{ marginTop: '8px' }}>
          <span className="panel-section-label">BUILT ON</span>
          <div className="connection-tags">
            {parents.map(n => {
              const pCat = categories[n.categories?.[0]]
              return (
                <span 
                  key={n.id} 
                  className="conn-tag conn-tag-parent conn-tag-clickable"
                  style={{ borderColor: pCat.color, color: pCat.color }}
                  onClick={(e) => handleNodeClick(n, e)}
                  onMouseEnter={() => handleNodeHover(n.id)}
                  onMouseLeave={handleNodeHoverEnd}
                  title={`Go to ${n.label}`}
                >
                  ↑ {n.label}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {children.length > 0 && (
        <div className="panel-connections" style={{ marginTop: '8px' }}>
          <span className="panel-section-label">CHILDREN</span>
          <div className="connection-tags">
            {children.map(n => {
              const cCat = categories[n.categories?.[0]]
              return (
                <span 
                  key={n.id} 
                  className="conn-tag conn-tag-clickable"
                  style={{ borderColor: cCat.color, color: cCat.color }}
                  onClick={(e) => handleNodeClick(n, e)}
                  onMouseEnter={() => handleNodeHover(n.id)}
                  onMouseLeave={handleNodeHoverEnd}
                  title={`Go to ${n.label}`}
                >
                  {n.label}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {connected.length > 0 && (
        <div className="panel-connections" style={{ marginTop: '8px' }}>
          <span className="panel-section-label">LINKED NODES ({connected.length})</span>
          <div className="connection-tags">
            {connected.map(n => {
              const cCat = categories[n.categories?.[0]]
              return (
                <span 
                  key={n.id} 
                  className="conn-tag conn-tag-clickable"
                  style={{ borderColor: cCat.color, color: cCat.color }}
                  onClick={(e) => handleNodeClick(n, e)}
                  onMouseEnter={() => handleNodeHover(n.id)}
                  onMouseLeave={handleNodeHoverEnd}
                  title={`Go to ${n.label}`}
                >
                  {n.label}
                </span>
              )
            })}
          </div>
        </div>
      )}

      <div className="panel-divider" style={{ margin: '14px 0 10px' }} />

      <button
        className={`orbit-btn ${orbitActive ? 'active' : ''}`}
        onClick={toggleOrbit}
        title={orbitActive ? 'Stop Orbit' : 'Orbit Around Node'}
      >
        <svg className="orbit-btn-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="10" cy="10" r="3" />
          <path d="M10 2 a8 8 0 0 1 0 16 a8 8 0 0 1 0 -16" strokeDasharray="3 2.5" />
          <path d="M18 10 l-2.5-2 M18 10 l-2.5 2" />
        </svg>
        <span className="orbit-btn-label">
          {orbitActive ? 'Stop Orbit' : 'Cockpit View'}
        </span>
        {orbitActive && <span className="orbit-live-badge">LIVE</span>}
      </button>

    </aside>
  )
}

// ── Filter Bar ───────────────────────────────────────────────────────────────
function FilterBar() {
  const active = useKnowledgeStore(state => state.activeCategories)
  const toggleCategory = useKnowledgeStore(state => state.toggleCategory)
  const hoveredCat = useKnowledgeStore(state => state.hoveredCat)
  const setHoveredCat = useKnowledgeStore(state => state.setHoveredCat)
  const openCat = useKnowledgeStore(state => state.openCat)
  const setOpenCat = useKnowledgeStore(state => state.setOpenCat)
  const closeTimeoutRef = useRef(null)
  const CLOSE_DELAY = 200

  const getSkillNodes = (catId) => {
    return nodes.filter(n => 
      n.categories?.includes(catId) && (n.tier === 0 || n.tier === 1 || n.tier === 2)
    )
  }

  const handleMouseEnter = (catId) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    setHoveredCat(catId)
    setOpenCat(catId)
  }

  const handleMouseLeave = () => {
    setHoveredCat(null)
    closeTimeoutRef.current = setTimeout(() => {
      setOpenCat(null)
    }, CLOSE_DELAY)
  }

  return (
    <nav className="filter-bar">
      {Object.values(categories).map(cat => {
        const isActive = active.has(cat.id)
        const skillNodes = getSkillNodes(cat.id)
        const isOpen = openCat === cat.id

        return (
          <div key={cat.id} className="filter-btn-wrapper">
            <button
              className={`filter-btn ${isActive ? 'active' : ''}`}
              style={{ '--cat-color': cat.color }}
              onClick={() => toggleCategory(cat.id)}
              onMouseEnter={() => handleMouseEnter(cat.id)}
              onMouseLeave={handleMouseLeave}
              title={isActive ? `Hide ${cat.name}` : `Show ${cat.name}`}
            >
              <span className="filter-dot" />
              {cat.name}
            </button>

            {isOpen && skillNodes.length > 0 && (
              <div 
                className="skill-list-popup"
                style={{ '--cat-color': cat.color }}
                onMouseEnter={() => handleMouseEnter(cat.id)}
                onMouseLeave={handleMouseLeave}
              >
                <div className="skill-list-header">
                  <span className="skill-list-title">{cat.name}</span>
                  <span className="skill-list-count">{skillNodes.length} Skills</span>
                </div>
                <div className="skill-list">
                  {skillNodes.map((node, idx) => (
                    <div 
                      key={node.id}
                      className="skill-list-item"
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <span className="skill-list-name">{node.label}</span>
                      <span 
                        className="skill-list-level"
                        style={{ color: LEVEL_COLORS[node.level] }}
                      >
                        {node.level}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

// ── App ──────────────────────────────────────────────────────────────────────
// ── Settings Panel ───────────────────────────────────────────────────────────
function SettingsPanel() {
  const settingsOpen = useKnowledgeStore(state => state.settingsOpen)
  const showCategoryLabels = useKnowledgeStore(state => state.showCategoryLabels)
  const showClusterCenters = useKnowledgeStore(state => state.showClusterCenters)
  const toggleCategoryLabels = useKnowledgeStore(state => state.toggleCategoryLabels)
  const toggleClusterCenters = useKnowledgeStore(state => state.toggleClusterCenters)
  const setSettingsOpen = useKnowledgeStore(state => state.setSettingsOpen)
  
  if (!settingsOpen) return null
  
  return (
    <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
      <div className="settings-header">
        <span className="settings-title">Settings</span>
        <button className="settings-close" onClick={() => setSettingsOpen(false)}>✕</button>
      </div>
      
      <div className="settings-section">
        <span className="settings-section-title">Debug Tools</span>
        
        <label className="settings-toggle">
          <input 
            type="checkbox" 
            checked={showCategoryLabels}
            onChange={toggleCategoryLabels}
          />
          <span className="toggle-slider"></span>
          <span className="toggle-label">Show Category Labels</span>
        </label>
        
        <label className="settings-toggle">
          <input 
            type="checkbox" 
            checked={showClusterCenters}
            onChange={toggleClusterCenters}
          />
          <span className="toggle-slider"></span>
          <span className="toggle-label">Show Cluster Centers</span>
        </label>
      </div>
    </div>
  )
}

// ── Settings Button ──────────────────────────────────────────────────────────
function SettingsButton() {
  const settingsOpen = useKnowledgeStore(state => state.settingsOpen)
  const toggleSettings = useKnowledgeStore(state => state.toggleSettings)
  
  return (
    <>
      <button 
        className={`settings-btn ${settingsOpen ? 'active' : ''}`}
        onClick={toggleSettings}
        title="Settings"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
      <SettingsPanel />
    </>
  )
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const mmExpanded = useKnowledgeStore(state => state.mmExpanded)
  const selectedNode = useKnowledgeStore(state => state.selectedNode)
  const mmFrameRef = useKnowledgeStore(state => state.mmFrameRef)
  const toggleMinimap = useKnowledgeStore(state => state.toggleMinimap)
  const openCat = useKnowledgeStore(state => state.openCat)
  
  // Dynamic content panel position based on skill list visibility
  const panelTopPosition = openCat ? '35%' : '45%'

  return (
    <div className="app" style={{ '--panel-top': panelTopPosition }}>
      <div className="canvas-wrap">
        <KnowledgeGraph />
      </div>

      <StatsWidget />

      <header className="title-block">
        <h1>Knowledge Graph</h1>
        <p>{nodes.length} skills &nbsp;·&nbsp; {edges.filter(e => !e.type).length} connections</p>
      </header>

      <SettingsButton />

      <p className="hint">Drag to orbit &nbsp;·&nbsp; Scroll to zoom &nbsp;·&nbsp; Click a node to inspect</p>

      <FilterBar />

      <div
        ref={mmFrameRef}
        className="minimap-frame"
        style={{ width: MM_W, height: MM_H, right: MM_MARGIN, bottom: MM_MARGIN }}
      >
        <span className="minimap-label">NAV</span>
        <button
          className={`minimap-toggle ${mmExpanded ? 'expanded' : ''}`}
          onClick={toggleMinimap}
          title={mmExpanded ? 'Collapse Minimap' : 'Expand Minimap'}
        >
          {mmExpanded ? '⊡' : '⛶'}
        </button>
        <span className="minimap-hint">Drag to rotate view</span>
      </div>

      <InfoPanel />
    </div>
  )
}
