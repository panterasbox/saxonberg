/**
 * Template paths for the Terminus domain. Per-domain paths file (the
 * `LoungePaths` / `TpaPaths` convention) — the single home for this area's
 * paths, so seeds, controllers, and tests reference them from one place and a
 * backing class never exports its own path.
 */
export const TerminusPaths = {
  /** The terminal building zone (the Terminus municipality's owned zone). */
  zone: "/domain/terminus/terminal",
  /** The station hall — the concourse the gates open off. */
  hall: "/domain/terminus/terminal/hall",
  /** The arrival gate room (the arrival terminal seats here). */
  arrivalGate: "/domain/terminus/terminal/arrival-gate",
  /** The operational departure gate room (Gate A) — the fare's operating location. */
  departureGateA: "/domain/terminus/terminal/departure-gate-a",
  /** The ticket office (the clerk works here). */
  office: "/domain/terminus/terminal/office",
  /** The arrival terminal (a floor node; the lounge routes here). */
  arrivalTerminal: "/domain/terminus/terminal/arrival-terminal",
  /** The terminal clerk NPC (procures cards; the city budget's employee). */
  clerk: "/domain/terminus/terminal/clerk",
  /** The municipal city-budget Business (the fare collector + wage payer). */
  budget: "/domain/terminus/budget",
} as const;
