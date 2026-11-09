import { Vector3 } from 'three';

/**
 * Wind direction/speed modifiers for a hanging banner that WAVES — a
 * cross-wind that swings through zero and a fast flutter on top, so ripples
 * run across the cloth instead of it bellying out like a sail. Dependency-free pseudo-noise (sum of incommensurate
 * sines at slow frequencies) approximates Perlin closely enough that the motion
 * never visibly repeats.
 */

// Smooth pseudo-noise ~[0, 1] at slow frequencies.
function gust(time: number): number {
  return (
    0.5 +
    0.5 *
      (0.5 * Math.sin(time / 1300) +
        0.3 * Math.sin(time / 2100 + 1.7) +
        0.2 * Math.sin(time / 470 + 4.2))
  );
}

export const windModifiers = {
  // Toward camera (+z) with a cross-wind (x) that swings through zero every
  // few seconds, plus a sub-second flutter in both axes. Only the x:z ratio
  // matters — Wind normalizes direction; magnitude comes from speed.
  hangingBannerDirection: (direction: Vector3, time: number): Vector3 =>
    direction.set(
      420 * Math.sin(time / 1900) + 160 * Math.sin(time / 610 + 0.8),
      0,
      620 + 220 * Math.sin(time / 2700) + 120 * Math.sin(time / 380 + 2.1),
    ),

  // Volatile gusting: ~0.45x–1.25x of base speed — lulls let the cloth fall
  // back and the swells lift it again.
  gustySpeed: (speed: number, time: number): number => speed * (0.45 + 0.8 * gust(time)),

  constantSpeed: (speed: number): number => speed,
};
