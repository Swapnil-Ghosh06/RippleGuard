import { useGraphStore } from '../store/graphStore'

// Shubham owns this file — do not add graph logic here.
export default function GraphCanvas() {
  const graphData    = useGraphStore((s) => s.graphData)
  const selectedNode = useGraphStore((s) => s.selectedNode)

  return (
    <div className="w-full h-full bg-void flex items-center justify-center relative">
      <p className="font-mono text-muted text-xs">Graph canvas — Shubham Phase 4</p>
      {graphData !== null && (
        <p className="font-mono text-dim text-xs mt-2 absolute bottom-4 left-4">
          Nodes: {graphData.graph?.nodes?.length}
        </p>
      )}
    </div>
  )
}
