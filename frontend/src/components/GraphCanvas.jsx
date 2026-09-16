import { useGraphStore } from '../store/graphStore';
import { useSimulate } from '../hooks/useSimulate';

// Shubham replaces the inner placeholder div with React Flow in Phase 6+
export default function GraphCanvas() {
  const { graphData, selectedNode, setSelectedNode, isSimulating } = useGraphStore();
  const { simulate } = useSimulate();

  const nodes = graphData?.graph?.nodes ?? graphData?.nodes ?? [];

  return (
    <div className="w-full h-full bg-void flex flex-col items-center justify-center relative gap-4 p-6">

      {/* Placeholder — Shubham replaces this with React Flow */}
      <p className="font-mono text-muted text-xs">
        Graph canvas — Shubham Phase 6
      </p>

      {nodes.length > 0 && (
        <p className="font-mono text-dim text-xs">
          Nodes: {nodes.length}
        </p>
      )}

      {/* Temporary node selector — Shubham wires React Flow click events here */}
      {nodes.length > 0 && (
        <div className="flex flex-col gap-2 mt-4 max-h-64 overflow-y-auto w-full max-w-xs">
          <p className="font-mono text-muted text-xs tracking-widest mb-1">SELECT NODE TO COMPROMISE</p>
          {nodes.slice(0, 20).map((node) => {
            const id = node.id ?? `${node.name}@${node.version}`;
            return (
              <button
                key={id}
                onClick={() => setSelectedNode(id)}
                className={`text-left font-mono text-xs px-3 py-2 border rounded-sm transition-colors duration-150 ${
                  selectedNode === id
                    ? 'border-accent text-text bg-surface'
                    : 'border-border text-dim hover:text-text hover:border-dim'
                }`}
              >
                {id}
              </button>
            );
          })}
        </div>
      )}

      {selectedNode && (
        <button
          onClick={() => simulate(selectedNode)}
          disabled={isSimulating}
          className="mt-2 font-mono text-xs px-4 py-2 bg-danger text-text border border-danger rounded-sm hover:bg-opacity-80 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSimulating ? 'Simulating…' : `⚡ Inject Compromise — ${selectedNode}`}
        </button>
      )}

    </div>
  );
}
