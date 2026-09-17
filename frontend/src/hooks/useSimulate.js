import axios from 'axios';
import { useGraphStore } from '../store/graphStore';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function useSimulate() {
  const { graphData, setBlastData, setIsSimulating } = useGraphStore();

  const simulate = async (compromisedNodeId) => {
    if (!graphData) return null;
    setIsSimulating(true);

    try {
      const graphId = graphData?.graph_id || (graphData?.root ? `${graphData.root.name}-${graphData.root.ecosystem || 'npm'}-${graphData.root.version}-depth${graphData.stats?.max_depth || 3}` : null);
      const graphPayload = graphData?.graph || graphData;

      const { data } = await axios.post(`${API}/api/simulate`, {
        graph_id: graphId,
        graph_data: graphPayload,
        compromised_node: compromisedNodeId,
        propagation_model: 'weighted_bfs',
      });

      const raw = data.data || data;
      const propOrder = raw.propagation?.propagation_order ?? raw.propagation_order ?? [];
      const affected = raw.propagation?.affected_nodes ?? raw.affected_nodes ?? [];

      const normalized = {
        blast_score:                   raw.blast_radius?.blast_score ?? 0,
        packages_affected:             raw.blast_radius?.affected_package_count ?? 0,
        direct_affected:               raw.blast_radius?.affected_package_count ?? 0,
        transitive_affected:           0,
        monthly_downloads_affected:    formatDownloads(raw.blast_radius?.total_monthly_downloads_affected ?? raw.total_monthly_downloads ?? 0),
        human_comparison:              raw.blast_summary || raw.blast_radius?.blast_summary || getHumanComparison(raw.blast_radius?.total_monthly_downloads_affected ?? 0),
        mitigations: (raw.mitigation?.priority_actions ?? []).map(a => ({
          package:         a.node ?? a.action,
          fix_version:     a.fixed_version ?? (a.action ? (a.action.match(/to\s+([^\s]+)/)?.[1] ?? 'patched') : 'patched'),
          blast_reduction: a.eliminates_blast_percent ?? 0,
          description:     a.why_this_matters || (a.effort ? `Effort: ${a.effort}` : null),
        })),
        propagation_order: propOrder,
        affected_nodes:    affected,
        critical_chain:    raw.critical_chain ?? raw.propagation?.critical_chain ?? [],
        shadow_dependencies: raw.shadow_dependencies ?? [],
      };

      setBlastData(normalized);
      return normalized;

    } catch (err) {
      console.error('Simulate failed:', err);
      return null;
    } finally {
      setIsSimulating(false);
    }
  };

  return { simulate };
}

function formatDownloads(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)         return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

const POPULATION_COMPARISONS = [
  { threshold: 1_400_000_000, label: 'the entire internet-connected world' },
  { threshold:   330_000_000, label: 'the entire population of the USA'    },
  { threshold:   142_000_000, label: 'the population of Russia'            },
  { threshold:    84_000_000, label: 'the population of Germany'           },
  { threshold:    67_000_000, label: 'the population of the UK'            },
  { threshold:     8_000_000, label: 'the population of Switzerland'       },
  { threshold:     1_000_000, label: 'the city of Mumbai (one neighbourhood)' },
];

function getHumanComparison(n) {
  for (const { threshold, label } of POPULATION_COMPARISONS) {
    if (n >= threshold) return `That's like sending malware to ${label}.`;
  }
  return `Targeted attack on ${n.toLocaleString()} users.`;
}
