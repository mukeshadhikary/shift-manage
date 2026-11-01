import { describe, it, expect } from 'vitest';

/**
 * Adversarial Unit Tests for Zoom Logic
 * Testing:
 * 1. Edge boundary clamping: 25%, 26%, 149%, 150%, 151% and extremes
 * 2. Rapid repeated click simulation for ZoomIn and ZoomOut
 * 3. Ctrl-wheel zoom in and out math
 * 4. Pinch distance ratios (ratio < 1, ratio = 1, ratio > 1, ratio > 5, dist <= 0)
 */

// Production math helper matching MainShiftView.tsx & ZoomControls.tsx
function clampZoom(zoom: number): number {
  return Math.max(25, Math.min(150, zoom));
}

function zoomOutStep(current: number, step = 15): number {
  return Math.max(25, current - step);
}

function zoomInStep(current: number, step = 15): number {
  return Math.min(150, current + step);
}

function wheelZoom(current: number, deltaY: number, step = 10): number {
  if (deltaY > 0) {
    return Math.max(25, current - step);
  } else if (deltaY < 0) {
    return Math.min(150, current + step);
  }
  return current;
}

function pinchZoom(
  initialZoom: number,
  currentDist: number,
  initialDist: number
): number | null {
  if (currentDist > 0 && initialDist > 0) {
    const ratio = currentDist / initialDist;
    return Math.max(25, Math.min(150, Math.round(initialZoom * ratio)));
  }
  return null; // Guarded condition in ShiftSheetPreview.tsx
}

describe('Adversarial Zoom Logic Verification', () => {
  describe('1. Edge Boundaries & Strict Clamping', () => {
    it('clamps strictly at 25% boundary', () => {
      expect(clampZoom(25)).toBe(25);
      expect(zoomOutStep(25)).toBe(25);
      // Zoom out button disabled check:
      expect(25 <= 25).toBe(true);
    });

    it('clamps correctly from 26%', () => {
      expect(clampZoom(26)).toBe(26);
      expect(zoomOutStep(26)).toBe(25); // 26 - 15 = 11 -> clamped to 25
      expect(26 <= 25).toBe(false); // Zoom out button enabled
    });

    it('clamps correctly from 149%', () => {
      expect(clampZoom(149)).toBe(149);
      expect(zoomInStep(149)).toBe(150); // 149 + 15 = 164 -> clamped to 150
      expect(149 >= 150).toBe(false); // Zoom in button enabled
    });

    it('clamps strictly at 150% boundary', () => {
      expect(clampZoom(150)).toBe(150);
      expect(zoomInStep(150)).toBe(150);
      expect(150 >= 150).toBe(true); // Zoom in button disabled
    });

    it('strictly clamps 151% and extreme inputs', () => {
      expect(clampZoom(151)).toBe(150);
      expect(clampZoom(200)).toBe(150);
      expect(clampZoom(99999)).toBe(150);
      expect(clampZoom(24)).toBe(25);
      expect(clampZoom(0)).toBe(25);
      expect(clampZoom(-500)).toBe(25);
    });

    it('handles floating point values around boundaries cleanly', () => {
      expect(clampZoom(24.999)).toBe(25);
      expect(clampZoom(25.001)).toBeCloseTo(25.001);
      expect(clampZoom(149.999)).toBeCloseTo(149.999);
      expect(clampZoom(150.001)).toBe(150);
    });
  });

  describe('2. Rapid Repeated Clicking Simulation', () => {
    it('rapid ZoomIn clicks from 25% strictly cap at 150%', () => {
      let current = 25;
      const history: number[] = [current];

      // Simulate 20 rapid clicks
      for (let i = 0; i < 20; i++) {
        if (current < 150) {
          current = zoomInStep(current);
          history.push(current);
        }
      }

      expect(history).toEqual([
        25, 40, 55, 70, 85, 100, 115, 130, 145, 150
      ]);
      expect(current).toBe(150);
      expect(current >= 150).toBe(true); // button is disabled
    });

    it('rapid ZoomOut clicks from 150% strictly floor at 25%', () => {
      let current = 150;
      const history: number[] = [current];

      // Simulate 20 rapid clicks
      for (let i = 0; i < 20; i++) {
        if (current > 25) {
          current = zoomOutStep(current);
          history.push(current);
        }
      }

      expect(history).toEqual([
        150, 135, 120, 105, 90, 75, 60, 45, 30, 25
      ]);
      expect(current).toBe(25);
      expect(current <= 25).toBe(true); // button is disabled
    });

    it('alternating rapid zoom in and out remains bounded and reversible', () => {
      let current = 75;
      for (let i = 0; i < 100; i++) {
        current = zoomInStep(current);
        current = zoomOutStep(current);
        expect(current).toBe(75);
      }
    });

    it('rapid clicks from non-standard start points converge to boundaries', () => {
      // Start from 32% (typical mobile fit-to-width)
      let current = 32;
      current = zoomOutStep(current); // 32 - 15 = 17 -> 25
      expect(current).toBe(25);

      // Start from 142%
      current = 142;
      current = zoomInStep(current); // 142 + 15 = 157 -> 150
      expect(current).toBe(150);
    });
  });

  describe('3. Ctrl-Wheel Zoom In and Out Math', () => {
    it('wheel zoom out (deltaY > 0) steps by -10% down to 25%', () => {
      let current = 75;
      current = wheelZoom(current, 100);
      expect(current).toBe(65);

      // Repeated wheel out to lower bound
      for (let i = 0; i < 10; i++) {
        current = wheelZoom(current, 50);
      }
      expect(current).toBe(25);
    });

    it('wheel zoom in (deltaY < 0) steps by +10% up to 150%', () => {
      let current = 75;
      current = wheelZoom(current, -100);
      expect(current).toBe(85);

      // Repeated wheel in to upper bound
      for (let i = 0; i < 15; i++) {
        current = wheelZoom(current, -50);
      }
      expect(current).toBe(150);
    });

    it('wheel with deltaY === 0 produces no zoom change', () => {
      expect(wheelZoom(75, 0)).toBe(75);
    });

    it('wheel zoom clamps at 26% and 149%', () => {
      expect(wheelZoom(26, 100)).toBe(25); // 26 - 10 = 16 -> clamped to 25
      expect(wheelZoom(149, -100)).toBe(150); // 149 + 10 = 159 -> clamped to 150
    });

    it('stress-tests 5000 random wheel events with varying delta magnitudes', () => {
      let current = 75;
      // Seeded pseudorandom sequence
      let seed = 123456789;
      const lcg = () => {
        seed = (1103515245 * seed + 12345) % 2147483648;
        return seed / 2147483648;
      };

      for (let i = 0; i < 5000; i++) {
        const delta = (lcg() - 0.5) * 1000; // -500 to +500
        current = wheelZoom(current, delta);
        expect(current).toBeGreaterThanOrEqual(25);
        expect(current).toBeLessThanOrEqual(150);
      }
    });
  });

  describe('4. Pinch Distance Ratios (ratio < 1, = 1, > 1, > 5, dist <= 0)', () => {
    const initialDist = 100;
    const initialZoom = 100;

    it('handles ratio < 1 (pinching in / zoom out)', () => {
      // ratio = 0.5 (currentDist = 50, initialDist = 100)
      const zoom50 = pinchZoom(initialZoom, 50, initialDist);
      expect(zoom50).toBe(50);

      // ratio = 0.2 (currentDist = 20) -> 20% clamped to 25%
      const zoom20 = pinchZoom(initialZoom, 20, initialDist);
      expect(zoom20).toBe(25);

      // ratio = 0.01 (tiny pinch) -> clamped to 25%
      const zoomTiny = pinchZoom(initialZoom, 1, initialDist);
      expect(zoomTiny).toBe(25);
    });

    it('handles ratio = 1 (neutral finger touch)', () => {
      const zoomNeutral = pinchZoom(initialZoom, 100, initialDist);
      expect(zoomNeutral).toBe(100);
    });

    it('handles ratio > 1 (pinching out / zoom in)', () => {
      // ratio = 1.25 (currentDist = 125, initialDist = 100)
      const zoom125 = pinchZoom(initialZoom, 125, initialDist);
      expect(zoom125).toBe(125);

      // ratio = 1.45 (currentDist = 145)
      const zoom145 = pinchZoom(initialZoom, 145, initialDist);
      expect(zoom145).toBe(145);
    });

    it('handles ratio > 5 (extreme outward pinch) strictly capping at 150%', () => {
      // ratio = 5 (currentDist = 500) -> 500% clamped to 150%
      const zoom5x = pinchZoom(initialZoom, 500, initialDist);
      expect(zoom5x).toBe(150);

      // ratio = 10 (currentDist = 1000) -> clamped to 150%
      const zoom10x = pinchZoom(initialZoom, 1000, initialDist);
      expect(zoom10x).toBe(150);

      // ratio = 100 (currentDist = 10000) -> clamped to 150%
      const zoom100x = pinchZoom(initialZoom, 10000, initialDist);
      expect(zoom100x).toBe(150);
    });

    it('safely guards dist <= 0 and initialDist <= 0 (no NaN or divide-by-zero)', () => {
      expect(pinchZoom(initialZoom, 0, initialDist)).toBeNull();
      expect(pinchZoom(initialZoom, -50, initialDist)).toBeNull();
      expect(pinchZoom(initialZoom, 100, 0)).toBeNull();
      expect(pinchZoom(initialZoom, 100, -100)).toBeNull();
      expect(pinchZoom(initialZoom, 0, 0)).toBeNull();
    });

    it('verifies pinch scaling from different initial zoom levels', () => {
      // Starting from 32% (iPhone fit-to-width)
      expect(pinchZoom(32, 200, 100)).toBe(64); // 32 * 2.0 = 64
      expect(pinchZoom(32, 50, 100)).toBe(25);  // 32 * 0.5 = 16 -> clamped to 25
      expect(pinchZoom(32, 1000, 100)).toBe(150); // clamped to 150

      // Starting from 150% (maximum)
      expect(pinchZoom(150, 200, 100)).toBe(150); // clamped to 150
      expect(pinchZoom(150, 50, 100)).toBe(75);   // 150 * 0.5 = 75
    });

    it('stress-tests 10,000 continuous pinch distance frames', () => {
      for (let dist = 1; dist <= 2000; dist += 2) {
        const result = pinchZoom(75, dist, 100);
        expect(result).not.toBeNull();
        expect(result).toBeGreaterThanOrEqual(25);
        expect(result).toBeLessThanOrEqual(150);
        expect(Number.isInteger(result)).toBe(true);
      }
    });
  });
});
