// Physics constants — ported verbatim from flagwaver (src/assets/js/flagwaver/constants.js).
export const TIME_STEP = 1 / 60;
export const DAMPING = 0.03;
export const DRAG = 1 - DAMPING;
export const DRAG_COEFFICIENT = 0.12;
export const AIR_DENSITY = 1.225; // kg/m^3
export const G = 9.80665; // m/s^2

export const Side = {
  TOP: 'top',
  LEFT: 'left',
  BOTTOM: 'bottom',
  RIGHT: 'right',
} as const;
export type SideKind = (typeof Side)[keyof typeof Side];
