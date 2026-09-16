import { AnimatePresence, motion } from 'framer-motion'
import { useGraphStore } from './store/graphStore'
import AppShell from './layouts/AppShell'
import SearchView from './views/SearchView'
import LoadingView from './views/LoadingView'
import GraphView from './views/GraphView'

const views = {
  idle:    <SearchView  key="search"  />,
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
          className="flex-1 flex flex-col"
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
