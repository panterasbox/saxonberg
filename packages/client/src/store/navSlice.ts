/**
 * navSlice — your map and where you are, as the client holds them
 * (navigation-server D1).
 *
 * Two subscriptions every played session opens at session start
 * (`services/websocket.ts`): the where-you-are source's seven SECTIONS,
 * each replaced whole by name, and your map's COPY, each claim replaced
 * by `<locality>|<claim key>`. A reconnect is repaired by the snapshot
 * that answers the replayed subscribe — the slice is overwritten, never
 * patched across a gap.
 *
 * ⭐ The map copy is held and rendered by nothing yet (the pane ships
 * later). The navigator card reads the sections through
 * {@link whereaboutsOf}, which builds the shape its body always read.
 */

import type {
  MapCopySnapshot,
  NavSectionName,
  NavSections,
  SubscriptionChange,
  WayRecord,
  WireClaim,
} from "@saxonberg/types";

/** One claim of your map, keyed as the copy's changes key it. */
export interface CopyClaim {
  locality: string;
  claim: WireClaim;
}

export interface NavSlice {
  /** What you perceive from here, now — the where-you-are sections. */
  navSections: NavSections;
  /** Your map: `<locality>|<claim key>` → the claim. */
  mapCopy: Record<string, CopyClaim>;
  applyNavSnapshot: (sections: NavSections) => void;
  applyNavChanges: (changes: readonly SubscriptionChange[]) => void;
  applyMapSnapshot: (snapshot: MapCopySnapshot) => void;
  applyMapChanges: (changes: readonly SubscriptionChange[]) => void;
}

export const createNavSlice = (
  set: (
    partial: Partial<NavSlice> | ((state: NavSlice) => Partial<NavSlice>),
  ) => void,
): NavSlice => ({
  navSections: {},
  mapCopy: {},
  applyNavSnapshot: (sections) => set(() => ({ navSections: { ...sections } })),
  applyNavChanges: (changes) =>
    set((s) => {
      const next: NavSections = { ...s.navSections };
      for (const change of changes) {
        const name = change.key as NavSectionName;
        if (change.op === "remove") delete next[name];
        else (next as Record<string, unknown>)[name] = change.fields;
      }
      return { navSections: next };
    }),
  applyMapSnapshot: (snapshot) =>
    set(() => {
      const mapCopy: Record<string, CopyClaim> = {};
      for (const doc of snapshot.documents) {
        for (const claim of doc.claims) {
          mapCopy[`${doc.locality}|${claim.key}`] = { locality: doc.locality, claim };
        }
      }
      return { mapCopy };
    }),
  applyMapChanges: (changes) =>
    set((s) => {
      const mapCopy = { ...s.mapCopy };
      for (const change of changes) {
        if (change.op === "remove") delete mapCopy[change.key];
        else mapCopy[change.key] = change.fields as CopyClaim;
      }
      return { mapCopy };
    }),
});

/**
 * ⭐ Where you are, at zone level — the navigator card's body, the shape it
 * has always read. Built from the sections; `null` until the place
 * section has arrived. Every field is what the server sent; an absent one
 * says it is not known rather than showing a guess.
 */
export interface Whereabouts {
  place: { stuffId: string; name: string };
  structure?: { name: string };
  /** The covering Localities, OUTERMOST first. */
  localities: { name: string; address: string }[];
  coords?: { x: number; y: number; z: number };
  exits: WhereaboutsExit[];
  conditions: { weather?: string; season?: string; daylight?: "day" | "night" };
  /** The innermost government whose ground this is; null = none claims it. */
  jurisdiction: string | null;
}

/** A whereabouts exit — a {@link WayRecord}. */
export type WhereaboutsExit = WayRecord;

export function whereaboutsOf(sections: NavSections): Whereabouts | null {
  const place = sections.place;
  if (!place) return null;
  const loc = sections.localities;
  return {
    place: { stuffId: place.stuffId, name: place.name },
    ...(sections.building?.name ? { structure: { name: sections.building.name } } : {}),
    localities: loc?.chain.map((c) => ({ name: c.name, address: c.address })) ?? [],
    ...(place.at ? { coords: place.at } : {}),
    exits: sections.ways?.ways ?? [],
    conditions: {
      ...(place.weather ? { weather: place.weather } : {}),
      ...(place.season ? { season: place.season } : {}),
      ...(place.daylight ? { daylight: place.daylight } : {}),
    },
    jurisdiction: loc?.jurisdiction[0]?.name ?? null,
  };
}
