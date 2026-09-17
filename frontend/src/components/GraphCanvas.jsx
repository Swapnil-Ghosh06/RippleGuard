import { useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { transformToReactFlow } from '../utils/graphTransform.js';
import { useGraphLayout } from '../hooks/useGraphLayout.js';
import { useGraphStore } from '../store/graphStore.js';

// Custom package node to render React Flow handles and labels with dark-theme styling
const nodeTypes = {
  packageNode: ({ data }) => (
    <div className="text-center select-none">
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#64748b', width: 8, height: 8 }}
      />
      <div className="font-mono font-bold text-xs">{data.label}</div>
      {data.version && (
        <div className="font-mono text-[10px] text-slate-400 mt-0.5">
          v{data.version}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#64748b', width: 8, height: 8 }}
      />
    </div>
  ),
};

function GraphCanvasInner({
  graphData: propGraphData,
  onNodeClick: propOnNodeClick,
}) {
  const storeGraphData = useGraphStore((s) => s.graphData);
  const selectedNode = useGraphStore((s) => s.selectedNode);
  const setSelectedNode = useGraphStore((s) => s.setSelectedNode);

  const activeGraphData = propGraphData || storeGraphData;

  // 1. Transform raw graph data into base nodes & edges
  const { nodes: rawNodes, edges: rawEdges } = useMemo(
    () => transformToReactFlow(activeGraphData),
    [activeGraphData]
  );

  // 2. Compute ELK layered DAG layout
  const { layoutedNodes, layoutedEdges, isLayouting } = useGraphLayout(rawNodes, rawEdges);

  // 3. Feed layouted elements into React Flow node & edge state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Sync React Flow nodes and edges when ELK layout calculation completes
  useEffect(() => {
    setNodes(layoutedNodes);
  }, [layoutedNodes, setNodes]);

  useEffect(() => {
    setEdges(layoutedEdges);
  }, [layoutedEdges, setEdges]);

  // Update selection highlight when selectedNode changes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const isSelected = selectedNode && node.id === selectedNode;
        return {
          ...node,
          style: {
            ...node.style,
            boxShadow: isSelected ? '0 0 0 3px #f43f5e, 0 0 20px rgba(244, 63, 94, 0.4)' : undefined,
          },
        };
      })
    );
  }, [selectedNode, setNodes]);

  const handleNodeClick = (event, node) => {
    if (propOnNodeClick) {
      propOnNodeClick(event, node);
    }
    setSelectedNode(node.id);
  };


  return (
    <div
      style={{ width: '100%', height: '100%', minHeight: 'calc(100vh - 56px)' }}
      className="relative w-full h-full bg-[#050a14]"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        style={{ width: '100%', height: '100%', backgroundColor: '#050a14' }}
      >
        <Background color="#1e293b" gap={16} size={1} />
        <Controls className="!bg-[#0d1829] !border-[#1a2d4a] [&>button]:!bg-[#0d1829] [&>button]:!border-[#1a2d4a] [&>button]:!fill-[#94a3b8] [&>button:hover]:!bg-[#1e293b]" />
        <MiniMap
          nodeColor={(n) => {
            const styleBorder = n.style?.border;
            if (typeof styleBorder === 'string') {
              const parts = styleBorder.split(' ');
              return parts[parts.length - 1] || '#3b82f6';
            }
            return '#3b82f6';
          }}
          maskColor="rgba(5, 10, 20, 0.75)"
          style={{
            backgroundColor: '#0d1829',
            border: '1px solid #1a2d4a',
            borderRadius: '6px',
          }}
        />
      </ReactFlow>

      {isLayouting && (
        <div className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-md bg-[#0d1829]/90 border border-[#1a2d4a] text-slate-300 font-mono text-xs flex items-center gap-2 backdrop-blur-sm shadow-md pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>Computing ELK Layout...</span>
        </div>
      )}
    </div>
  );
}

export default function GraphCanvas(props) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

