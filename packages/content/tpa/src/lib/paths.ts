/**
 * Template paths for the Teleport Authority's own content. Per-pack paths
 * file — the single home for this pack's paths, so a backing class never
 * exports its own path and consumers (seeds, the `clone` command, tests)
 * reference them from one place.
 */
export const TpaPaths = {
  /** The cloneable TPA travel card (a credential you can hand to someone). */
  travelCard: '/system/tpa/thing/travel-card',
} as const;
