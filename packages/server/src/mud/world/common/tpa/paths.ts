/**
 * Template paths for the generic Teleport Authority content. Per-domain paths
 * file — the single home for this domain's paths, so a backing class never
 * exports its own path and consumers (seeds, the `clone` command, tests)
 * reference them from one place.
 */
export const TpaPaths = {
  /** The cloneable TPA travel card (a credential you can hand to someone). */
  travelCard: '/world/common/tpa/travel-card',
} as const;
