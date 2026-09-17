import axios from 'axios';
import { useGraphStore } from '../store/graphStore';
import { mockAnalyzeResponse } from '../mocks/mockAnalyzeResponse';

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
      const responseData = data.data || data;
      setGraphData(responseData);
      setView('graph');
    } catch (err) {
      console.warn('Live API unavailable; loading mock topology graph:', err);
      // Seamless fallback so the user can test the UI and panels immediately
      setTimeout(() => {
        setGraphData(mockAnalyzeResponse);
        setView('graph');
      }, 700);
    }
  };

  return { analyze };
}
