import { useState, useCallback } from 'react'
import { KnowledgeGraph } from './KnowledgeGraph.jsx'
import { nodes, edges, categories, nodesMap } from './data.js'

const LEVEL_COLORS = {
  Expert:       '#22c55e',
  Advanced:     '#3b82f6',
  Intermediate: '#f59e0b',
  Beginner:     '#64748b',
}

const MAX_YEARS = Math.max(...nodes.map(n => n.years))

// ── Info Panel ──────────────────────────────────────────────────────────────
function InfoPanel({ node, onClose }) {
  const cat = categories[node.category]
  const connected = edges
    .filter(e => e.source === node.id || e.target === node.id)
    .map(e => e.source === node.id ? e.target : e.source)
    .map(id => nodesMap[id])
    .filter(Boolean)

  const expPct = Math.round((node.years / MAX_YEARS) * 100)

  return (
    <aside className="info-panel">
      <button className="panel-close" onClick={onClose} aria-label="close">✕</button>

      <p className="panel-category" style={{ color: cat.color }}>
        {cat.name}
      </p>

      <h2 className="panel-title">{node.label}</h2>

      <div className="panel-meta">
        <span
          className="level-badge"
          style={{ background: LEVEL_COLORS[node.level] }}
        >
          {node.level}
        </span>
        <span className="years-text">
          {node.years} yr{node.years !== 1 ? 's' : ''} exp
        </span>
      </div>

      <div className="exp-bar-wrap">
        <div className="exp-bar-label">Experience</div>
        <div className="exp-bar-track">
          <div
            className="exp-bar-fill"
            style={{ width: `${expPct}%`, background: cat.color }}
          />
        </div>
      </div>

      <p className="panel-description">{node.description}</p>

      {connected.length > 0 && (
        <div className="panel-connections">
          <h4>Connected to</h4>
          <div className="connection-tags">
            {connected.map(n => (
              <span
                key={n.id}
                className="conn-tag"
                style={{ borderColor: categories[n.category].color, color: categories[n.category].color }}
              >
                {n.label}
              </span>
            ))}
          </div>
        </div>
      )}
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

  return (
    <div className="app">
      {/* Three.js canvas */}
      <div className="canvas-wrap">
        <KnowledgeGraph
          activeCategories={activeCategories}
          onNodeSelect={handleNodeSelect}
        />
      </div>

      {/* Title */}
      <header className="title-block">
        <h1>Knowledge Graph</h1>
        <p>{nodes.length} skills &nbsp;·&nbsp; {edges.length} connections</p>
      </header>

      {/* Hint */}
      <p className="hint">Drag to orbit &nbsp;·&nbsp; Scroll to zoom &nbsp;·&nbsp; Click a node to inspect</p>

      {/* Category filter */}
      <FilterBar active={activeCategories} onToggle={toggleCategory} />

      {/* Node info panel */}
      {selectedNode && (
        <InfoPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}
    </div>
  )
}
