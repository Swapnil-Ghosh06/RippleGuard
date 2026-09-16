import axios from 'axios';
import { useGraphStore } from '../store/graphStore';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function useSimulate() {
  const { graphData, setBlastData, setIsSimulating } = useGraphStore();

  const simulate = async (compromisedNodeId) => {
    if (!graphData) return;
    setIsSimulating(true);

    try {
      const { data } = await axios.post(`${API}/api/simulate`, {
        graph_data: graphData,
        compromised_node: compromisedNodeId,
      });

      const raw = data.data;

      // Normalize backend shape → what BlastRadiusPanel and MitigationPanel expect
      setBlastData({
        blast_score:                   raw.blast_radius?.blast_score ?? 0,
        packages_affected:             raw.blast_radius?.affected_package_count ?? 0,
        direct_affected:               raw.blast_radius?.affected_package_count ?? 0,
        transitive_affected:           0,
        monthly_downloads_affected:    formatDownloads(raw.blast_radius?.total_monthly_downloads_affected ?? 0),
        human_comparison:              getHumanComparison(raw.blast_radius?.total_monthly_downloads_affected ?? 0),
        mitigations: (raw.mitigation?.priority_actions ?? []).map(a => ({
          package:         a.node ?? a.action,
          fix_version:     a.fixed_version ?? '—',
          blast_reduction: a.eliminates_blast_percent ?? 0,
          description:     null,
        })),
        propagation_order: raw.propagation_order ?? [],
        affected_nodes:    raw.affected_nodes ?? [],
      });

    } catch (err) {
      console.error('Simulate failed:', err);
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
