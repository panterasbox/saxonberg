/**
 * LAYOUT_REGISTRY — the `layout name → component` map the cockpit swaps
 * on a `cockpit.layout` clientState change.
 *
 * `App` reads the server-authoritative `cockpit.layout` key and renders
 * `LAYOUT_REGISTRY[layout]?.Component`, falling back to `world` for any
 * unregistered name. The registry is `Partial` so layouts can be added
 * incrementally; an unbuilt layout simply renders as `world` until its
 * entry lands. The "Views" menu offers every `LayoutName` regardless.
 */

import type { LayoutName } from "@saxonberg/types";
import type { LayoutDef } from "./types";
import { WorldLayout } from "./WorldLayout";
import { ForumLayout } from "./ForumLayout";
import { LivestreamViewerLayout } from "./LivestreamViewerLayout";
import { StreamerLayout } from "./StreamerLayout";
import { BuilderLayout } from "./BuilderLayout";

export const LAYOUT_REGISTRY: Partial<Record<LayoutName, LayoutDef>> = {
  world: { label: "World", Component: WorldLayout },
  forum: { label: "Forum", Component: ForumLayout },
  "livestream-viewer": {
    label: "Livestream",
    Component: LivestreamViewerLayout,
  },
  streamer: { label: "Streamer", Component: StreamerLayout },
  builder: { label: "Builder", Component: BuilderLayout },
};

export type { LayoutProps, LayoutDef } from "./types";
