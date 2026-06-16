import { describe, it, expect } from 'vitest';
import { calculateAttendancePercentage, calculateBunkRecovery } from '../lib/utils';

describe('Attendance & Bunk Calculations', () => {
  describe('calculateAttendancePercentage', () => {
    it('returns 0 when total classes is 0', () => {
      expect(calculateAttendancePercentage(0, 0)).toBe(0);
      expect(calculateAttendancePercentage(5, 0)).toBe(0);
    });

    it('calculates the correct rounded percentage', () => {
      expect(calculateAttendancePercentage(3, 4)).toBe(75);
      expect(calculateAttendancePercentage(2, 3)).toBe(67);
      expect(calculateAttendancePercentage(1, 3)).toBe(33);
      expect(calculateAttendancePercentage(10, 10)).toBe(100);
    });
  });

  describe('calculateBunkRecovery', () => {
    it('returns 0 if total is 0', () => {
      expect(calculateBunkRecovery(0, 0)).toBe(0);
    });

    it('returns 0 if attendance is already at or above 75%', () => {
      // 3/4 is 75%
      expect(calculateBunkRecovery(3, 4)).toBe(0);
      // 4/4 is 100%
      expect(calculateBunkRecovery(4, 4)).toBe(0);
      // 8/10 is 80%
      expect(calculateBunkRecovery(8, 10)).toBe(0);
    });

    it('calculates classes needed to recover to 75% when below 75%', () => {
      // 2/3 is 67% (needs 1 consecutive class: total=4, attended=3 => 3/4 = 75%)
      // Formula: 3*3 - 4*2 = 9 - 8 = 1
      expect(calculateBunkRecovery(2, 3)).toBe(1);

      // 1/3 is 33% (needs 5 consecutive classes: total=8, attended=6 => 6/8 = 75%)
      // Formula: 3*3 - 4*1 = 9 - 4 = 5
      expect(calculateBunkRecovery(1, 3)).toBe(5);

      // 5/8 is 62.5% (needs 4 consecutive classes: total=12, attended=9 => 9/12 = 75%)
      // Formula: 3*8 - 4*5 = 24 - 20 = 4
      expect(calculateBunkRecovery(5, 8)).toBe(4);
    });
  });
});
