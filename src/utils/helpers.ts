/**
 * Percentage calculation utility
 */
export function getPercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

/**
 * Capitalize first letter of string
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
