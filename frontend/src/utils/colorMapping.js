/**
 * Color mapping utilities and design system tokens for RippleGuard.
 */

export const SEVERITY_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
  NONE: '#38bdf8',
  gold: '#fbbf24', // Reserved ONLY for Butterfly Trace critical path
  // Aliases for convenience
  danger: '#ef4444',
  warn: '#f97316',
  safe: '#22c55e',
  accent: '#38bdf8',
}

const SEVERITY_RANK = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

/**
 * Returns the single highest-severity string among CRITICAL > HIGH > MEDIUM > LOW,
 * or "NONE" if the vulnerabilities array is empty or has no recognized severity.
 *
 * @param {Array<{ severity?: string }>} vulnerabilities
 * @returns {"CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE"}
 */
export function getMaxSeverity(vulnerabilities) {
  if (!Array.isArray(vulnerabilities) || vulnerabilities.length === 0) {
    return 'NONE'
  }

  let highestRank = 0
  let highestSeverity = 'NONE'

  for (const vuln of vulnerabilities) {
    if (!vuln || !vuln.severity) continue
    const norm = String(vuln.severity).toUpperCase()
    const rank = SEVERITY_RANK[norm] || 0
    if (rank > highestRank) {
      highestRank = rank
      highestSeverity = norm
      if (highestRank === 4) break // CRITICAL is highest possible
    }
  }

  return highestSeverity
}

// Background / surface tokens
// Note: 'void' is a reserved keyword in JavaScript, so we declare voidColor
// and export it both as 'voidColor' and aliased as 'void' for named export compatibility.
export const voidColor = '#050a14'
export { voidColor as void }
export const surface = '#0d1829'
export const border = '#1a2d4a'
export const muted = '#334155'
export const text = '#e2e8f0'
export const dim = '#94a3b8'

export const SURFACE_COLORS = {
  void: '#050a14',
  surface: '#0d1829',
  border: '#1a2d4a',
  muted: '#334155',
  text: '#e2e8f0',
  dim: '#94a3b8',
}
