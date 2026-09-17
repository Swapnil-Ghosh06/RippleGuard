import { create } from 'zustand';

export const useGraphStore = create((set) => ({
  view: 'idle',
  setView: (v) => set({ view: v }),

  graphData: null,
  setGraphData: (data) => set({ graphData: data }),

  blastData: null,
  setBlastData: (data) => set({ blastData: data }),

  selectedNode: null,
  setSelectedNode: (node) => set({ selectedNode: node }),

  isSimulating: false,
  setIsSimulating: (b) => set({ isSimulating: b }),

  error: null,
  setError: (msg) => set({ error: msg }),

  compareData: null,
  setCompareData: (data) => set({ compareData: data }),

  activeTab: 'blast', // 'blast' | 'mitigation' | 'compare'
  setActiveTab: (tab) => set({ activeTab: tab }),

  activeDominoIndex: null,
  setActiveDominoIndex: (idx) => set((state) => ({
    activeDominoIndex: typeof idx === 'function' ? idx(state.activeDominoIndex) : idx,
  })),

  isDominoPlaying: false,
  setIsDominoPlaying: (b) => set({ isDominoPlaying: b }),

  sandboxPatches: [],
  toggleSandboxPatch: (nodeId) => set((state) => {
    const exists = state.sandboxPatches.includes(nodeId);
    return {
      sandboxPatches: exists
        ? state.sandboxPatches.filter((id) => id !== nodeId)
        : [...state.sandboxPatches, nodeId],
    };
  }),
  applyOptimalPatchSet: (nodeIds) => set({ sandboxPatches: Array.from(new Set(nodeIds)) }),
  clearSandboxPatches: () => set({ sandboxPatches: [] }),

  reset: () => set({
    view: 'idle',
    graphData: null,
    blastData: null,
    selectedNode: null,
    isSimulating: false,
    error: null,
    compareData: null,
    activeTab: 'blast',
    activeDominoIndex: null,
    isDominoPlaying: false,
    sandboxPatches: [],
  }),
}));
