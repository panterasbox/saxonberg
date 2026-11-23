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
 * ⭐ The navigation card (`components/nav/NavCard`) draws both — and reads
 * the copy only through the views in `navSelectors.ts`, never directly.
 */

import type {
  RoutePlanNote,
  MapCopySnapshot,
  NavSectionName,
  NavSections,
  SubscriptionChange,
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
  /**
   * ⭐ The latest plan `route` answered with (navigation card D5) — the
   * note itself. Session-only: a plan is a hypothesis about NOW, and must
   * not come back after a restart as if it were current. A new plan
   * replaces it.
   */
  routePlan: RoutePlanNote | null;
  setRoutePlan: (note: RoutePlanNote | null) => void;
}

export const createNavSlice = (
  set: (
    partial: Partial<NavSlice> | ((state: NavSlice) => Partial<NavSlice>),
  ) => void,
): NavSlice => ({
  navSections: {},
  mapCopy: {},
  routePlan: null,
  setRoutePlan: (note) => set(() => ({ routePlan: note })),
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
      // A fresh copy (a new connection, another character) drops the
      // plan: it was a hypothesis about a moment that has passed.
      return { mapCopy, routePlan: null };
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
