import { motion } from 'framer-motion';
import { SEVERITY_COLORS } from '../utils/colorMapping';

/**
 * Slide-in detail panel for inspecting a selected React Flow package node.
 *
 * @param {object} props
 * @param {object|null} props.node - Currently selected React Flow node object.
 * @param {() => void} props.onClose - Callback triggered when panel close button is clicked.
 * @param {(nodeId: string) => void} props.onInjectCompromise - Callback triggered to simulate compromise.
 * @param {(nodeId: string) => void} props.onRemoveNode - Callback triggered to remove the node from the canvas.
 */
export default function NodeDetail({
  node,
  onClose,
  onInjectCompromise,
  onRemoveNode,
}) {
  if (!node) return null;

  const data = node.data || {};
  const label = data.label || data.name || node.id || 'Unknown Package';
  const version = data.version;
  const depth = data.depth ?? 0;
  const downloads = data.downloads ?? data.monthly_downloads;
  const formattedDownloads =
    downloads != null && !isNaN(downloads)
      ? Number(downloads).toLocaleString()
      : null;

  const vulns = Array.isArray(data.vulns)
    ? data.vulns
    : Array.isArray(data.vulnerabilities)
    ? data.vulnerabilities
    : [];

  const isBlasted = Boolean(data.isBlasted || data.blasted);

  return (
    <motion.aside
      key={node.id}
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className="absolute top-4 right-4 bottom-4 w-80 z-40 bg-[#0d1829] border border-[#1a2d4a] rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-200"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1a2d4a] flex items-center justify-between shrink-0 bg-[#0b1320]">
        <div className="min-w-0 pr-2">
          <h3 className="font-mono font-bold text-sm text-white truncate" title={label}>
            {label}
          </h3>
          {version && (
            <p className="font-mono text-xs text-slate-400">v{version}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#1a2d4a] transition-colors cursor-pointer text-lg leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
        {/* Quick Stats: Depth & Downloads */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-md bg-[#162238] border border-[#1a2d4a] font-mono text-[11px] text-cyan-400">
            Depth: {depth}
          </span>
          {formattedDownloads && (
            <span className="px-2 py-0.5 rounded-md bg-[#162238] border border-[#1a2d4a] font-mono text-[11px] text-slate-300">
              {formattedDownloads} dl/mo
            </span>
          )}
          {data.isRoot && (
            <span className="px-2 py-0.5 rounded-md bg-purple-900/60 border border-purple-500/50 font-mono text-[11px] text-purple-300 font-semibold">
              Root Package
            </span>
          )}
          {data.isShadowDependency && (
            <span className="px-2 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-400/40 font-mono text-[11px] text-indigo-300 flex items-center gap-1">
              <span>👻</span>
              <span>Shadow Dep</span>
            </span>
          )}
        </div>

        {/* Vulnerabilities Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono uppercase tracking-wider text-[10px] text-slate-400 font-semibold">
              Vulnerabilities ({vulns.length})
            </span>
            {isBlasted && (
              <span className="font-mono text-[10px] text-rose-400 flex items-center gap-1 font-semibold">
                <span>⚡</span>
                <span>Compromised</span>
              </span>
            )}
          </div>

          {vulns.length === 0 ? (
            <div className="p-3 rounded-lg bg-[#082017] border border-[#124d35] flex items-center gap-2 text-[#22c55e]">
              <span className="text-base">✓</span>
              <span className="font-medium">No known vulnerabilities</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {vulns.map((vuln, i) => {
                const cveId = vuln.id || vuln.cve || `VULN-${i + 1}`;
                const rawSev = (vuln.severity || 'LOW').toUpperCase();
                const sevColor = SEVERITY_COLORS[rawSev] || SEVERITY_COLORS.LOW;
                const cvss = vuln.cvss_score || vuln.cvss || null;
                const fixedVersion = vuln.fixed_version || vuln.fixedVersion;

                return (
                  <div
                    key={cveId}
                    className="p-3 rounded-lg bg-[#111c30] border border-[#1a2d4a] space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-xs text-white">
                        {cveId}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {cvss != null && (
                          <span className="font-mono text-[10px] text-slate-400">
                            CVSS {cvss}
                          </span>
                        )}
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-white uppercase"
                          style={{ backgroundColor: sevColor }}
                        >
                          {rawSev}
                        </span>
                      </div>
                    </div>

                    {vuln.summary && (
                      <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-3">
                        {vuln.summary}
                      </p>
                    )}

                    <div className="font-mono text-[10px] text-slate-400 pt-1 border-t border-[#1a2d4a]/70">
                      {fixedVersion ? (
                        <span className="text-emerald-400">
                          Fixed in: {fixedVersion}
                        </span>
                      ) : (
                        <span className="text-amber-400">
                          No fix available yet
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Actions Footer */}
      <div className="p-4 border-t border-[#1a2d4a] bg-[#0b1320] flex flex-col gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onInjectCompromise && onInjectCompromise(node.id)}
          disabled={isBlasted}
          className={`w-full py-2 px-3 rounded-lg font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isBlasted
              ? 'bg-rose-950/50 text-rose-400/50 border border-rose-900/30 cursor-not-allowed'
              : 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-950/50'
          }`}
        >
          <span>⚡</span>
          <span>{isBlasted ? 'Already Compromised' : 'Inject Compromise'}</span>
        </button>

        <button
          type="button"
          onClick={() => onRemoveNode && onRemoveNode(node.id)}
          disabled={data.isRoot}
          title={data.isRoot ? 'Cannot remove the root package — try analyzing a different package instead' : 'Remove Node'}
          className={`w-full py-2 px-3 rounded-lg font-mono text-xs font-medium border transition-colors cursor-pointer ${
            data.isRoot
              ? 'border-slate-800 text-slate-600 bg-slate-900/30 cursor-not-allowed'
              : 'text-slate-300 border-[#1a2d4a] hover:bg-[#162238] hover:text-white'
          }`}
        >
          {data.isRoot ? 'Root Package Cannot Be Removed' : 'Remove Node'}
        </button>
      </div>
    </motion.aside>
  );
}
