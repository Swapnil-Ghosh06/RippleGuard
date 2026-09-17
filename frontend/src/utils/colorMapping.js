/**
 * Color mapping configuration and severity calculation utilities.
 */

export const SEVERITY_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
  NONE: '#3b82f6',
};

const SEVERITY_PRIORITY = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

/**
 * Returns the highest severity present among vulnerabilities based on the priority:
 * CRITICAL > HIGH > MEDIUM > LOW. Returns 'NONE' if empty or undefined.
 *
 * @param {Array<{ severity?: string }>} [vulnerabilities] - Array of vulnerability objects.
 * @returns {'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'} The single highest severity level.
 */
export function getMaxSeverity(vulnerabilities) {
  if (!Array.isArray(vulnerabilities) || vulnerabilities.length === 0) {
    return 'NONE';
  }

  let maxSev = 'NONE';
  let maxScore = 0;

  for (const vuln of vulnerabilities) {
    const sev = vuln?.severity?.toUpperCase();
    const score = SEVERITY_PRIORITY[sev] || 0;
    if (score > maxScore) {
      maxScore = score;
      maxSev = sev;
      if (maxScore === 4) break;
    }
  }

  return maxSev;
}
