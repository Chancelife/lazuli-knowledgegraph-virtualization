import { create } from 'zustand'
import { nodes, categories } from './data.js'

export const useKnowledgeStore = create((set, get) => ({
  // ── State ───────────────────────────────────────────────────────────────
  selectedNode: null,
  activeCategories: new Set(Object.keys(categories)),
  mmExpanded: false,
  orbitActive: false,
  hoveredCat: null,
  openCat: null,
  hoveredNodeId: null,
  cameraTargetNode: null,
  
  // ── Settings ─────────────────────────────────────────────────────────────
  settingsOpen: false,
  showCategoryLabels: true,
  showClusterCenters: false,
  showStats: true,
  lockView: false,
  showNodeLabels: false,

  // ── Refs for 3D component synchronization ───────────────────────────────
  statsRef: { current: { fps: 0, gpuMs: 0, gpuSupported: false } },
  mmExpandedRef: { current: false },
  orbitActiveRef: { current: false },
  lockViewRef:       { current: false },
  showNodeLabelsRef: { current: false },
  mmFrameRef: { current: null },
  hoveredNodeIdRef: { current: null },
  
  // ── Actions ─────────────────────────────────────────────────────────────
  setSelectedNode: (node) => set({ selectedNode: node }),
  
  toggleCategory: (catId) => set((state) => {
    const next = new Set(state.activeCategories)
    if (next.has(catId)) {
      if (next.size > 1) next.delete(catId)
    } else {
      next.add(catId)
    }
    return { activeCategories: next }
  }),
  
  setActiveCategories: (categories) => set({ 
    activeCategories: new Set(categories) 
  }),
  
  toggleMinimap: () => set((state) => {
    state.mmExpandedRef.current = !state.mmExpanded
    return { mmExpanded: !state.mmExpanded }
  }),
  
  toggleOrbit: () => set((state) => {
    state.orbitActiveRef.current = !state.orbitActive
    return { orbitActive: !state.orbitActive }
  }),
  
  setOrbitActive: (active) => set((state) => {
    state.orbitActiveRef.current = active
    return { orbitActive: active }
  }),
  
  setHoveredCat: (catId) => set({ hoveredCat: catId }),
  setOpenCat: (catId) => set({ openCat: catId }),
  
  setHoveredNodeId: (nodeId) => set((state) => {
    state.hoveredNodeIdRef.current = nodeId
    return { hoveredNodeId: nodeId }
  }),
  
  setCameraTargetNode: (node) => set({ cameraTargetNode: node }),
  
  navigateToNode: (node) => set((state) => {
    state.orbitActiveRef.current = false
    return { 
      cameraTargetNode: node,
      selectedNode: node,
      orbitActive: false 
    }
  }),
  
  closePanel: () => set((state) => {
    state.orbitActiveRef.current = false
    return { selectedNode: null, orbitActive: false }
  }),
  
  updateStats: (stats) => {
    get().statsRef.current = stats
  },
  
  // ── Settings actions ─────────────────────────────────────────────────────
  toggleSettings: () => set(state => ({ settingsOpen: !state.settingsOpen })),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  toggleCategoryLabels: () => set(state => ({ showCategoryLabels: !state.showCategoryLabels })),
  toggleClusterCenters: () => set(state => ({ showClusterCenters: !state.showClusterCenters })),
  toggleShowStats:      () => set(state => ({ showStats: !state.showStats })),
  toggleShowNodeLabels: () => set(state => {
    state.showNodeLabelsRef.current = !state.showNodeLabels
    return { showNodeLabels: !state.showNodeLabels }
  }),
  toggleLockView: () => set(state => {
    state.lockViewRef.current = !state.lockView
    return { lockView: !state.lockView }
  }),
}))
