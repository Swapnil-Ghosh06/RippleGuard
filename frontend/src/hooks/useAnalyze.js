import axios from 'axios'
import { useGraphStore } from '../store/graphStore'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export function useAnalyze() {
  const { setView, setGraphData, setError } = useGraphStore()

  async function analyze({ packageName, ecosystem }) {
    if (!packageName || !packageName.trim()) return

    setView('loading')
    setError(null)

    try {
      const response = await axios.post(`${BASE_URL}/api/analyze`, {
        package:   packageName.trim(),
        ecosystem,
        version:   'latest',
        depth:     3,
      })
      setGraphData(response.data.data)
      setView('graph')
    } catch {
      setError('Analysis failed — check package name and try again')
      setView('idle')
    }
  }

  return { analyze }
}
