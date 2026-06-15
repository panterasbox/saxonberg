import { Vector3 } from 'three';

/**
 * Wind direction/speed modifiers tuned for a *calm* hanging banner — gentle
 * breathing, not snapping. Dependency-free pseudo-noise (sum of incommensurate
 * sines at slow frequencies) approximates Perlin closely enough that the motion
 * never visibly repeats.
 */

// Smooth pseudo-noise ~[0, 1] at slow frequencies.
function gust(time: number): number {
  return (
    0.5 +
    0.5 *
      (0.55 * Math.sin(time / 3100) +
        0.3 * Math.sin(time / 5300 + 1.7) +
        0.15 * Math.sin(time / 8200 + 4.2))
  );
}

export const windModifiers = {
  // Mostly toward camera (+z) with a gentle lateral sway (x). Only the x:z
  // ratio matters here — Wind normalizes direction; magnitude comes from speed.
  hangingBannerDirection: (direction: Vector3, time: number): Vector3 =>
    direction.set(120 + 140 * Math.sin(time / 6400), 0, 760 + 120 * Math.sin(time / 4700)),

  // Narrow, slow gusting: ~0.72x–1.08x of base speed. No sudden swells.
  gustySpeed: (speed: number, time: number): number => speed * (0.72 + 0.36 * gust(time)),

  constantSpeed: (speed: number): number => speed,
};
