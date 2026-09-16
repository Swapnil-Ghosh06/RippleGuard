// Custom React Flow node — package card with severity ring + CVE badge
// Shubham can extend this — add tooltips, click handlers, etc.

const SEVERITY = {
  CRITICAL: { border: '#C0392B', glow: 'rgba(192,57,43,0.4)',  label: 'CRIT'   },
  HIGH:     { border: '#C49A3C', glow: 'rgba(196,154,60,0.35)', label: 'HIGH'   },
  MEDIUM:   { border: '#AD9D87', glow: 'rgba(173,157,135,0.3)', label: 'MED'    },
  LOW:      { border: '#6B8F71', glow: 'rgba(107,143,113,0.3)', label: 'LOW'    },
};

function formatDL(n) {
  if (!n) return null;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + 'M/mo';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K/mo';
  return n + '/mo';
}

export default function PackageNode({ data }) {
  const { name, version, is_root, vulnerabilities = [], monthly_downloads, blasted, selected } = data;

  const topSev = ['CRITICAL','HIGH','MEDIUM','LOW'].find(s =>
    vulnerabilities.some(v => v.severity === s)
  );
  const sev = topSev ? SEVERITY[topSev] : null;

  const borderColor  = selected  ? '#F0EBE3'
                     : blasted   ? '#C0392B'
                     : sev       ? sev.border
                     : '#3a3530';

  const boxShadow    = blasted   ? '0 0 12px rgba(192,57,43,0.5)'
                     : sev       ? `0 0 8px ${sev.glow}`
                     : 'none';

  const bgColor      = blasted   ? 'rgba(192,57,43,0.18)'
                     : is_root   ? '#2a2720'
                     : '#201e1b';

  return (
    <div
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        boxShadow,
        borderRadius: 4,
        padding: '8px 12px',
        minWidth: 100,
        maxWidth: 140,
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        position: 'relative',
      }}
    >
      {/* Root badge */}
      {is_root && (
        <div style={{
          position: 'absolute', top: -8, left: 8,
          background: '#AD9D87', color: '#191615',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9, fontWeight: 600,
          padding: '1px 5px', borderRadius: 2,
        }}>
          ROOT
        </div>
      )}

      {/* Package name */}
      <p style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11, fontWeight: 500,
        color: blasted ? '#f08080' : '#F0EBE3',
        lineHeight: 1.3,
        marginBottom: 2,
        wordBreak: 'break-all',
      }}>
        {name}
      </p>

      {/* Version */}
      <p style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10, color: '#6C6B5A',
        lineHeight: 1.2, marginBottom: sev ? 4 : 0,
      }}>
        {version}
      </p>

      {/* Severity badge */}
      {sev && (
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9, fontWeight: 600,
          color: sev.border,
          display: 'block',
        }}>
          {sev.label} ·{' '}
          <span style={{ color: '#6C6B5A', fontWeight: 400 }}>CVE</span>
        </span>
      )}

      {/* Download count */}
      {monthly_downloads > 0 && (
        <p style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9, color: '#484638',
          marginTop: 3,
        }}>
          {formatDL(monthly_downloads)}
        </p>
      )}

      {/* Blasted indicator */}
      {blasted && (
        <p style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9, color: '#C0392B',
          marginTop: 3, fontWeight: 600,
        }}>
          ⚡ compromised
        </p>
      )}
    </div>
  );
}
