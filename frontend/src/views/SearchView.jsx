import SearchPanel from '../components/SearchPanel'
import { motion } from 'framer-motion'

export default function SearchView() {
  return (
    <motion.div
      className="w-full flex-1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <SearchPanel />
    </motion.div>
  )
}
