/**
 * Combine class names helper
 */
export function cn(...classes: (string | undefined | null | boolean)[]) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Format date helper
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Calculate attendance percentage
 */
export function calculateAttendancePercentage(attended: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((attended / total) * 100);
}

/**
 * Calculate consecutive classes needed to recover to 75%
 */
export function calculateBunkRecovery(attended: number, total: number): number {
  if (total <= 0) return 0;
  const needed = (3 * total) - (4 * attended);
  return needed > 0 ? needed : 0;
}

