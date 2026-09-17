import { AnimatePresence, motion } from 'framer-motion'
import { useGraphStore } from './store/graphStore'
import AppShell from './layouts/AppShell'
import SearchView from './views/SearchView'
import LoadingView from './views/LoadingView'
import GraphView from './views/GraphView'

import GraphCanvas from './components/GraphCanvas'
import { mockAnalyzeResponse } from './mocks/mockAnalyzeResponse'

const views = {
  idle: (
    <div className="w-full flex-1 relative flex" style={{ height: 'calc(100vh - 56px)' }}>
      <GraphCanvas
        graphData={mockAnalyzeResponse.graph}
        onNodeClick={(e, node) => console.log('Node clicked:', node)}
      />
    </div>
  ),
  loading: <LoadingView key="loading" />,
  graph:   <GraphView   key="graph"   />,
}

export default function App() {
  const view = useGraphStore((s) => s.view)

  return (
    <AppShell>
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          className="flex-1 flex flex-col h-[calc(100vh-56px)] w-full"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {views[view]}
        </motion.div>
      </AnimatePresence>
    </AppShell>
  )
}
