import axios from 'axios';
import { useGraphStore } from '../store/graphStore';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function useAnalyze() {
  const { setView, setGraphData, setError } = useGraphStore();

  const analyze = async ({ packageName, ecosystem, version = 'latest', depth = 3 }) => {
    setError(null);
    setView('loading');
    try {
      const { data } = await axios.post(`${API}/api/analyze`, {
        package: packageName,
        ecosystem,
        version,
        depth,
      });
      setGraphData(data.data);
      setView('graph');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Backend unreachable. Is the API running?';
      setError(msg);
      setView('idle');
    }
  };

  return { analyze };
}
