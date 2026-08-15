/**
 * MODE_REGISTRY — `(mode, arrangement) → component`.
 *
 * ⭐⭐ **This replaced `LAYOUT_REGISTRY`, and the replacement is the
 * point.** The cockpit has had two axes server-side since S3 —
 * `cockpit.mode` (what am I here to do) and an arrangement within it —
 * while the client went on swapping its whole frame off the single
 * `cockpit.layout` compatibility key, which S3's own types call *"a
 * compatibility projection, and it is meant to die"*.
 *
 * ⭐ `watch` is why the axes are two and not one: `livestream-viewer`
 * and `streamer` were never different activities, they were different
 * ARRANGEMENTS of one — which is exactly why
 * `LEGACY_LAYOUT_MIGRATION` is a mapping rather than a rename, and why
 * that collapse is lossy in the mode column and only the arrangement
 * column keeps them apart.
 *
 * ⚠ `govern` has no surface yet and falls back to `play`. It falls back
 * VISIBLY — see `resolveMode` — because a mode that silently renders as
 * another one is indistinguishable from a mode that is finished.
 */

import type { ComponentType } from "react";
import {
  COCKPIT_ARRANGEMENTS,
  LEGACY_LAYOUT_MIGRATION,
  type CockpitMode,
  type LayoutName,
} from "@saxonberg/types";
import type { LayoutProps } from "./types";
import { WorldLayout } from "./WorldLayout";
import { ForumLayout } from "./ForumLayout";
import { LivestreamViewerLayout } from "./LivestreamViewerLayout";
import { StreamerLayout } from "./StreamerLayout";
import { BuilderLayout } from "./BuilderLayout";

export interface ArrangementDef {
  label: string;
  Component: ComponentType<LayoutProps>;
}

/**
 * Every arrangement the client can render, per mode.
 *
 * ⚠ Sparse where the server is sparse: a mode whose arrangement has no
 * component yet is absent here rather than aliased to something that
 * looks finished.
 */
export const MODE_REGISTRY: Partial<
  Record<CockpitMode, Record<string, ArrangementDef>>
> = {
  play: { default: { label: "World", Component: WorldLayout } },
  chat: { default: { label: "Forums", Component: ForumLayout } },
  watch: {
    viewer: { label: "Viewer", Component: LivestreamViewerLayout },
    streamer: { label: "Streamer", Component: StreamerLayout },
  },
  build: { default: { label: "Builder", Component: BuilderLayout } },
};

/** What `resolveMode` decided, including whether it had to fall back. */
export interface ResolvedMode {
  mode: CockpitMode;
  arrangement: string;
  def: ArrangementDef;
  /**
   * Set when the requested (mode, arrangement) has no component and this
   * is a stand-in. The frame renders a visible notice — a silent
   * substitution is how an unbuilt mode comes to look finished.
   */
  fallbackFrom: { mode: CockpitMode; arrangement: string } | null;
}

const FLOOR: CockpitMode = "play";

/**
 * Resolve the frame to render from the server-authoritative cockpit
 * state.
 *
 * ⚠ **`cockpit.mode` is deliberately `null` for a legacy player.** The
 * server's `getCockpitMode()` reads that null as its cue to migrate a
 * stored `cockpit.layout` rather than assuming the default — so if the
 * pushed snapshot still carries the null, the client has to do the same
 * migration rather than silently landing everybody in `play`. That is
 * what the `legacyLayout` argument is for; it is read ONLY when `mode`
 * is absent, and never as a live source of truth.
 */
export function resolveMode(
  mode: CockpitMode | null | undefined,
  arrangements: Record<string, string> | undefined,
  legacyLayout: LayoutName | null | undefined,
): ResolvedMode {
  let effective: CockpitMode | null = mode ?? null;
  let requestedArrangement: string | null = null;

  if (effective === null && legacyLayout) {
    const migrated = LEGACY_LAYOUT_MIGRATION[legacyLayout];
    if (migrated) {
      effective = migrated.mode;
      requestedArrangement = migrated.arrangement;
    }
  }
  const resolvedMode: CockpitMode = effective ?? FLOOR;
  const arrangement =
    requestedArrangement ??
    arrangements?.[resolvedMode] ??
    COCKPIT_ARRANGEMENTS[resolvedMode]?.[0] ??
    "default";

  const found = MODE_REGISTRY[resolvedMode]?.[arrangement];
  if (found) {
    return { mode: resolvedMode, arrangement, def: found, fallbackFrom: null };
  }

  // A mode whose arrangement has no component. Fall back to the floor,
  // and SAY so — this is the seam `govern` sits in today.
  const floor = MODE_REGISTRY[FLOOR]!["default"]!;
  return {
    mode: FLOOR,
    arrangement: "default",
    def: floor,
    fallbackFrom: { mode: resolvedMode, arrangement },
  };
}
