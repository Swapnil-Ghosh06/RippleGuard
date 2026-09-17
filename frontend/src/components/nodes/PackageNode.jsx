import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { getMaxSeverity, SEVERITY_COLORS } from '../../utils/colorMapping.js';

/**
 * Compact formatting for download numbers (e.g. 82000000 -> "82M", 145000 -> "145K").
 */
function formatDownloads(n) {
  if (n == null || isNaN(n) || n === 0) return null;
  const num = Number(n);
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(num);
}

/**
 * Custom React Flow node component representing a package in the dependency graph.
 * Supports root highlighting, shadow dependency spotlight (Idea 3), and blast cascade state.
 *
 * @param {object} props
 * @param {object} props.data - Node data attributes
 * @param {boolean} props.selected - React Flow built-in selection state
 */
function PackageNode({ data = {}, selected = false }) {
  const label = data.label || data.name || (typeof data.id === 'string' ? data.id.split('@')[0] : 'package');
  const version = data.version || (typeof data.id === 'string' ? data.id.split('@')[1] : '');
  const vulns = data.vulns || data.vulnerabilities || [];
  const downloads = data.downloads ?? data.monthly_downloads;
  const isRoot = Boolean(data.isRoot || data.is_root || data.depth === 0);
  const riskScore = data.riskScore ?? data.risk_score;
  const isShadowDependency = Boolean(data.isShadowDependency || data.is_shadow_dependency);
  const isBlasted = Boolean(data.isBlasted || data.blasted);

  const maxSeverity = getMaxSeverity(vulns);
  const severityColor = SEVERITY_COLORS[maxSeverity] || SEVERITY_COLORS.NONE;
  const formattedDownloads = formatDownloads(downloads);

  // Dynamic style calculation based on state priority: Blasted > Shadow > Root > Standard
  let background = '#1e293b';
  let border = `2px solid ${severityColor}`;
  let boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
  let minWidth = '140px';
  let padding = '8px 12px';

  if (isBlasted) {
    background = '#7f1d1d';
    border = '2px solid #ef4444';
    boxShadow = '0 0 20px 6px rgba(239, 68, 68, 0.45)';
  } else if (isShadowDependency) {
    background = '#1a1a2e';
    border = '2px solid #94a3b8';
    boxShadow = '0 0 20px 6px rgba(148, 163, 184, 0.35)';
  } else if (isRoot) {
    background = '#7c3aed';
    border = '2px solid #a78bfa';
    minWidth = '155px';
    padding = '10px 14px';
    boxShadow = '0 4px 14px rgba(124, 58, 237, 0.4)';
  }

  const nodeCardStyle = {
    background,
    border,
    boxShadow,
    minWidth,
    padding,
    borderRadius: '8px',
    fontSize: '11px',
    color: '#e2e8f0',
    cursor: 'pointer',
    outline: selected ? '2px solid #38bdf8' : 'none',
    outlineOffset: selected ? '2px' : '0px',
    transition: 'background 150ms ease, box-shadow 150ms ease, border-color 150ms ease, outline 150ms ease',
    position: 'relative',
  };

  return (
    <div style={nodeCardStyle} className="select-none font-sans">
      {/* Target handle at the top */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#64748b',
          width: 8,
          height: 8,
          border: '2px solid #0f172a',
        }}
      />

      {/* Top Header Row: Status icons (Ghost for shadow dependency, circle for severity) */}
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1">
          {isShadowDependency && (
            <span
              title="Shadow Dependency"
              className="text-xs leading-none select-none"
              role="img"
              aria-label="Shadow Dependency"
            >
              👻
            </span>
          )}
          {isRoot && (
            <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.2 bg-purple-900/70 border border-purple-400/40 rounded text-purple-200">
              ROOT
            </span>
          )}
        </div>

        {/* Severity Dot Badge */}
        <span
          title={`Severity: ${maxSeverity}`}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: severityColor,
            display: 'inline-block',
            boxShadow: maxSeverity !== 'NONE' ? `0 0 6px ${severityColor}` : 'none',
          }}
        />
      </div>

      {/* Package Name (Bold) */}
      <div className="font-mono font-bold text-xs truncate leading-tight text-white">
        {label || 'package'}
      </div>

      {/* Version */}
      {version && (
        <div className="font-mono text-[10px] text-slate-400 mt-0.5 truncate">
          v{version}
        </div>
      )}

      {/* Bottom Metadata: Downloads & Risk */}
      {(formattedDownloads || (riskScore != null && riskScore > 0)) && (
        <div className="text-[10px] text-slate-400 font-mono mt-1.5 pt-1 border-t border-slate-700/50 flex items-center justify-between gap-1">
          {formattedDownloads ? <span>{formattedDownloads} dl</span> : <span />}
          {riskScore != null && riskScore > 0 && (
            <span className="text-amber-400 font-medium">Risk: {riskScore}</span>
          )}
        </div>
      )}

      {/* Source handle at the bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#64748b',
          width: 8,
          height: 8,
          border: '2px solid #0f172a',
        }}
      />
    </div>
  );
}

export default memo(PackageNode);
