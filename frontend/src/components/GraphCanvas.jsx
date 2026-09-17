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
  graphData,
  onNodeClick = (event, node) => console.log('Node clicked:', node),
}) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => transformToReactFlow(graphData),
    [graphData]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync state whenever graphData prop updates
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = transformToReactFlow(graphData);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [graphData, setNodes, setEdges]);

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
        onNodeClick={onNodeClick}
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
