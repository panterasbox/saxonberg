/**
 * `usePaneFeed` — open the feed's panes and keep them in step with the
 * wire.
 *
 * ⭐⭐ **The client sends a NAME and an identity; never a query.** Every
 * subscription here is `{ pane: '<catalogue id>' }`, plus a `subject`
 * stuffId for the three panes that are about a particular thing. The
 * query, the cardinality, the field set, the dependency flags and the
 * hold all come from the server's own catalogue — which is what makes a
 * saved arrangement mean something a session later, and what stops MQL
 * ending up in a `.tsx` file again.
 *
 * ## ⚠ The holds are consumed, not re-derived
 *
 * Nothing in this file decides whether a pane should still be open. The
 * server evaluates the hold on the batch that was already running and
 * emits `mql-subscription-released` with a reason; this hook writes it
 * down. Client-side hold logic is the temptation the plan flags
 * explicitly, and it is the same category error as a client deciding
 * its own affordances: the conditions are facts about a world this tab
 * is not authoritative over.
 */

import { useEffect } from "react";
import type {
  Envelope,
  MqlSubscriptionDeltaEnvelope,
  MqlSubscriptionReleasedEnvelope,
  MqlSubscriptionResultEnvelope,
  PaneId,
  StuffDetailRecord,
  StuffRefRecord,
} from "@saxonberg/types";
import { useStore } from "../../store/index";
import { websocketClient } from "../../services/websocket";
import type { PaneKind, PaneRecord } from "../../store/paneFeedSlice";

/**
 * Which body each catalogue pane draws.
 *
 * ⚠ **Client-side by design.** The server owns what a pane IS; which
 * component renders the answer is the one thing only the client
 * observes. Same reasoning `PANE_IDS` records for the widget shelf's
 * labels and hatched-ness — modelling it server-side would be a second
 * source of truth for something the server cannot check.
 */
export const PANE_KIND_BY_ID: Readonly<Record<PaneId, PaneKind>> = {
  inspect: "inspect",
  location: "inspect",
  self: "inspect",
  place: "place",
  agent: "agent",
  instrument: "instrument",
  manifest: "manifest",
  subject: "subject",
};

/**
 * What a card is called before its subject arrives.
 *
 * ⚠ Client-side for the same reason `PANE_KIND_BY_ID` is: the server
 * owns what a pane IS; what a waiting card should say is a rendering
 * question only the client observes. These mirror the catalogue's own
 * `label` fields — if they drift, the cost is a placeholder reading
 * slightly differently for a fraction of a second.
 */
export const PANE_LABEL: Readonly<Record<PaneId, string>> = {
  inspect: "what you are looking at",
  location: "where you are",
  self: "your own figures",
  place: "where you are",
  agent: "someone you are dealing with",
  instrument: "something you are reading",
  manifest: "what you are carrying",
  subject: "what you are looking at",
};

/**
 * Apply a wire `Change[]` batch to a card's cached records.
 *
 * The four ops mirror `InspectionPane`'s reducer, which is the shape
 * the substrate emits: `add` appends, `remove` drops by key, `replace`
 * overwrites in place, `update` merges the fields present.
 */
function applyChanges(
  previous: readonly PaneRecord[],
  changes: MqlSubscriptionDeltaEnvelope["changes"],
): PaneRecord[] {
  const next = previous.slice();
  for (const change of changes) {
    const idx = next.findIndex((r) => r.stuffId === change.key);
    if (change.op === "remove") {
      if (idx >= 0) next.splice(idx, 1);
      continue;
    }
    const fields = (change.fields ?? {}) as Partial<StuffDetailRecord>;
    if (change.op === "update") {
      if (idx >= 0) {
        next[idx] = { ...next[idx], ...fields } as PaneRecord;
      }
      continue;
    }
    const record = {
      ...(fields as StuffDetailRecord),
      stuffId: change.key,
      displayName: fields.displayName ?? "",
    };
    if (change.op === "replace" && idx >= 0) next[idx] = record;
    else next.push(record);
  }
  return next;
}

/**
 * Open the standing panes and wire the three subscription envelopes.
 *
 * ⚠ `place` is opened here; `inspect` and `location` stay with the
 * inspection pane, which owns their paint/clear policy and its
 * breadcrumb. Splitting them is deliberate — the breadcrumb must never
 * close, and `place` is a card that fades when you walk out.
 */
export function usePaneFeed(): void {
  const openPaneCard = useStore((s) => s.openPaneCard);
  const setPaneRecords = useStore((s) => s.setPaneRecords);
  const releasePane = useStore((s) => s.releasePane);

  /*
   * ⭐ The husk sweep. Here rather than in the feed component for the
   * same reason the subscriptions are: this hook runs at BOTH form
   * factors, and a sweep hung off the desktop column would never run on
   * a phone.
   */
  useEffect(() => {
    const handle = window.setInterval(
      () => useStore.getState().expireHusks(),
      10_000,
    );
    return () => window.clearInterval(handle);
  }, []);

  useEffect(() => {
    const handleResult = (envelope: Envelope) => {
      const env = envelope as MqlSubscriptionResultEnvelope;
      const store = useStore.getState();
      /*
       * ⭐ A result flagged `pushed` is a pane the SERVER opened — a mode
       * switch resolving its saved arrangement and pushing the set. The
       * envelope carries `pane` and `hold` for exactly this: the client
       * has to know which body to draw and what words to put in the
       * header for a handle it did not mint.
       *
       * ⚠⚠ The FLAG, not an inference. "A handle I do not currently
       * know" was tried and is wrong twice over: the chrome's own named
       * panes (`inspect`, `location`, `self`) echo `pane` too, and a
       * result arriving after the client's own unsubscribe — which
       * React's double-mount produces on every dev page load — looks
       * unknown as well. Both showed up live as spurious cards, and no
       * unit test could see either, because the adoption path only
       * fires for an envelope a test would have to mint by hand.
       */
      if (!store.paneCards[env.subscriptionId] && env.pane && env.pushed) {
        store.openPaneCard({
          subscriptionId: env.subscriptionId,
          paneId: env.pane,
          kind: PANE_KIND_BY_ID[env.pane],
          ...(env.hold ? { hold: env.hold } : {}),
        });
      }
      if (!store.paneCards[env.subscriptionId]) return;
      store.setPaneRecords(
        env.subscriptionId,
        env.result as (StuffRefRecord | StuffDetailRecord)[],
      );
      /*
       * ⚠ The pin's answer, mirrored from the server rather than set
       * when the button was clicked. `cockpit pane pin` is a real
       * command and the server may refuse it; a local toggle would show
       * a pin that is not there.
       */
      if (env.pinned !== undefined) {
        store.setPanePinnedState(env.subscriptionId, env.pinned);
      }
    };

    const handleDelta = (envelope: Envelope) => {
      const env = envelope as MqlSubscriptionDeltaEnvelope;
      const store = useStore.getState();
      const card = store.paneCards[env.subscriptionId];
      if (!card) return;
      store.setPaneRecords(
        env.subscriptionId,
        applyChanges(card.records, env.changes),
      );
    };

    const handleReleased = (envelope: Envelope) => {
      const env = envelope as MqlSubscriptionReleasedEnvelope;
      const store = useStore.getState();
      if (!store.paneCards[env.subscriptionId]) return;
      store.releasePane(env);
      /*
       * ⚠ The server has already torn the subscription down — the
       * release IS the teardown. Dropping the client's bookkeeping stops
       * it being re-issued on the next reconnect, which would otherwise
       * resurrect a pane the world ended.
       */
      websocketClient.unsubscribe(env.subscriptionId);
    };

    websocketClient.onEnvelope("mql-subscription-result", handleResult);
    websocketClient.onEnvelope("mql-subscription-delta", handleDelta);
    websocketClient.onEnvelope("mql-subscription-released", handleReleased);

    return () => {
      websocketClient.offEnvelope("mql-subscription-result", handleResult);
      websocketClient.offEnvelope("mql-subscription-delta", handleDelta);
      websocketClient.offEnvelope("mql-subscription-released", handleReleased);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * ⭐⭐ **Attention drives the feed.** Every time the focus resolves to
   * a subject the client has not already got a live card for, it opens
   * one. That is the whole model: you look at things, and the things
   * you looked at stack up newest-first and age away.
   *
   * ⚠ The `inspect` subscription is the SIGNAL, not the card. It
   * re-points as focus moves — one subscription, changing subject —
   * which is exactly what you do not want a card to do: a card that
   * silently became about something else would make the stack a lie.
   * So the signal opens a per-subject subscription and that one stays
   * about the thing it was opened for.
   */
  const focusStuffId = useStore((s) => s.paneLastResult?.[0]?.stuffId ?? null);
  useEffect(() => {
    if (!focusStuffId) return;
    const store = useStore.getState();
    const already = Object.values(store.paneCards).some(
      (c) =>
        c.released === undefined &&
        c.paneId === "subject" &&
        c.records[0]?.stuffId === focusStuffId,
    );
    // ⚠ Re-looking at something you already have a live card for brings
    // it back into view rather than stacking a second identical card.
    if (already) return;
    const subscriptionId = websocketClient.subscribeMql({
      pane: "subject",
      subject: focusStuffId,
    });
    store.openPaneCard({
      subscriptionId,
      paneId: "subject",
      kind: "subject",
    });
  }, [focusStuffId]);

  void openPaneCard;
  void setPaneRecords;
  void releasePane;
}

/**
 * Open a pane ABOUT something — the `agent` / `instrument` / `manifest`
 * cards, which are caused by what you just did to a particular thing.
 *
 * ⚠ The `subject` is a `stuffId`. The catalogue's query carries the
 * `$subject` slot and the server fills it; the client is naming an
 * object, not describing a query, and the distinction is the whole
 * reason the catalogue exists.
 */
export function openSubjectPane(
  pane: Extract<PaneId, "agent" | "instrument" | "manifest">,
  stuffId: string,
): string | null {
  if (!stuffId) return null;
  const store = useStore.getState();
  // One card per (pane, subject). Re-acting on the same thing should
  // bring its card back into view, not stack a second identical one.
  for (const card of Object.values(store.paneCards)) {
    if (card.paneId === pane && card.records[0]?.stuffId === stuffId) {
      return card.subscriptionId;
    }
  }
  const subscriptionId = websocketClient.subscribeMql({
    pane,
    subject: stuffId,
  });
  store.openPaneCard({
    subscriptionId,
    paneId: pane,
    kind: PANE_KIND_BY_ID[pane],
  });
  return subscriptionId;
}
