/**
 * `useCardFeed` — keep the card set in step with the wire.
 *
 * ⭐⭐ **This hook opens nothing.** Every card arrives on a `card-opened`
 * envelope because a command caused the server to push it; the client's
 * focus-watching effect that used to mint a card from a changed
 * subscription result is gone, and with it `openSubjectCard`. The
 * `inspect` subscription that was *"the SIGNAL, not the card"* has no
 * successor, because there is nothing left for a signal to do.
 *
 * ⚠ **It cannot open one even by mistake.** `MqlSubscriptionParams`
 * carries no field that would name a card — only `chrome: 'self'`, the
 * widget shelf's subscription, which is not a card. That is acceptance
 * criterion 1 enforced by the protocol rather than by a grep.
 *
 * ## ⚠ The lifetime is consumed, not re-derived
 *
 * Nothing here decides whether a card should still be open. The server
 * runs one relevance-window sweep over the whole set and emits
 * `card-closed` with a reason; this hook writes it down. There is no
 * husk timer here either — two clocks disagree, and the one the player
 * cannot see is the one that wins arguments.
 */

import { useEffect } from "react";
import type React from "react";
import type {
  SubscriptionResultEnvelope,
  CardClosedEnvelope,
  CardOpenedEnvelope,
  CardPinnedEnvelope,
  CardArrangedEnvelope,
  CardTouchedEnvelope,
  Envelope,
  Change,
  SubscriptionDeltaEnvelope,
  CardId,
  StuffDetailRecord,
} from "@saxonberg/types";
import { useStore } from "../../store/index";
import { websocketClient } from "../../services/websocket";
import type { CardRecord } from "../../store/cardFeedSlice";

/**
 * What a card is called before its subject arrives.
 *
 * ⚠ **Client-side by design.** The server owns what a card IS; what a
 * waiting card should say is a rendering question only the client
 * observes. These mirror the catalogue's own `label` fields — if they
 * drift, the cost is a placeholder reading slightly differently for a
 * fraction of a second, which is the cheapest kind of drift there is.
 */
export const CARD_LABEL: Readonly<Record<CardId, string>> = {
  subject: "what you are looking at",
  who: "who's online",
  news: "the news",
  wiki: "the wiki",
  help: "the rulebook",
  prompt: "a question for you",
  cms: "the content editor",
  git: "version control",
  studio: "the composer",
  stock: "the stock sheet",
  survey: "the survey",
  terminal: "a terminal",
  settings: "your settings",
  map: "where you are",
  stream: "the stream controls",
};

/**
 * Apply a wire `Change[]` batch to a live card's cached records.
 *
 * The four ops are the shape the substrate emits: `add` appends,
 * `remove` drops by key, `replace` overwrites in place, `update` merges
 * the fields present.
 */
function applyChanges(
  previous: readonly CardRecord[],
  changes: readonly Change[],
): CardRecord[] {
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
        next[idx] = { ...next[idx], ...fields } as CardRecord;
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
 * Wire the four card envelopes plus the delta a live card rides.
 *
 * ⚠⚠ **Mount this at a component that renders at BOTH form factors and
 * in EVERY mode.** This is the third occurrence of the
 * wiring-at-the-layout bug: the inspection pane's subscriptions and the
 * mobile bar's `self` subscription both hung off one desktop layout and
 * were dead everywhere else, and every component test passed through
 * both. `build` mode needs cards too, so hoisting is not optional.
 */
export function useCardFeed(): void {
  useEffect(() => {
    const handleOpened = (envelope: Envelope): void => {
      const env = envelope as CardOpenedEnvelope;
      useStore.getState().openCard({
        instanceId: env.instanceId,
        cardId: env.cardId,
        key: env.key,
        live: env.live,
        pinned: env.pinned,
        ...(env.takenAt !== undefined ? { takenAt: env.takenAt } : {}),
        ...(env.title !== undefined ? { title: env.title } : {}),
        ...(env.subjectId ? { subjectId: env.subjectId } : {}),
        ...(env.subjectKind ? { subjectKind: env.subjectKind } : {}),
        ...(env.promptId ? { promptId: env.promptId } : {}),
        ...(env.prose ? { prose: env.prose } : {}),
        ...(env.payload ? { payload: env.payload } : {}),
        records: (env.result ?? []) as CardRecord[],
        openedAt: Date.now(),
        ...(env.segments ? { segments: env.segments } : {}),
        ...(env.size ? { size: env.size } : {}),
        ...(env.placed ? { placed: env.placed } : {}),
        ...(env.minimized ? { minimized: true } : {}),
        ...(env.role ? { role: env.role } : {}),
        ...(env.private !== undefined ? { private: env.private } : {}),
      });
    };

    const handleTouched = (envelope: Envelope): void => {
      const env = envelope as CardTouchedEnvelope;
      // A re-run carries a body; a liveness flip (pin, place) does not —
      // only a re-run is a TOUCH that moves a card in a feed.
      const rerun = env.prose !== undefined || env.segments !== undefined || env.payload !== undefined;
      useStore.getState().touchCard(env.instanceId, {
        key: env.key,
        ...(rerun ? { touchedAt: Date.now() } : {}),
        // ⭐ A demotion: this card stopped being the current one.
        ...(env.live !== undefined ? { live: env.live } : {}),
        ...(env.takenAt !== undefined ? { takenAt: env.takenAt } : {}),
        ...(env.title !== undefined ? { title: env.title } : {}),
        ...(env.prose ? { prose: env.prose } : {}),
        ...(env.payload ? { payload: env.payload } : {}),
        ...(env.result ? { records: env.result as CardRecord[] } : {}),
        ...(env.segments ? { segments: env.segments } : {}),
        // ⭐ The `here` card rebound: same card, new subject (#53/#92).
        ...(env.subjectId ? { subjectId: env.subjectId } : {}),
        ...(env.subjectKind ? { subjectKind: env.subjectKind } : {}),
        ...(env.role ? { role: env.role } : {}),
        ...(env.private !== undefined ? { private: env.private } : {}),
        // ⭐ A terminal's role IS its payload's `primary` flag: a demoted
        // terminal's touch carries no role, and must still lose it.
        ...(env.payload?.kind === "terminal"
          ? { role: env.payload.primary ? ("primary" as const) : undefined }
          : {}),
      });
    };

    const handleArranged = (envelope: Envelope): void => {
      const env = envelope as CardArrangedEnvelope;
      useStore.getState().arrangeCardState(env.instanceId, {
        size: env.size,
        placed: env.placed,
        minimized: env.minimized,
        pinned: env.pinned,
        live: env.live,
        role: env.role,
      });
    };

    const handleClosed = (envelope: Envelope): void => {
      const env = envelope as CardClosedEnvelope;
      useStore.getState().closeCard(env.instanceId, env.reason);
    };

    const handlePinned = (envelope: Envelope): void => {
      const env = envelope as CardPinnedEnvelope;
      useStore.getState().setCardPinnedState(env.instanceId, env.pinned);
    };

    /*
     * ⭐ A LIVE card's updates ride the ordinary subscription delta,
     * because `instanceId === subscriptionId` by construction. No new
     * envelope and no join table — the card OWNS the handle.
     */
    /*
     * ⭐ A RESULT for a card's id means RESUMED (crowded-rooms D5): until
     * now a card's only snapshot rode `card-opened`. It is a reset — the
     * card's records are replaced.
     */
    const handleResult = (envelope: Envelope): void => {
      const env = envelope as SubscriptionResultEnvelope;
      const store = useStore.getState();
      if (!store.cards[env.subscriptionId]) return;
      store.setCardRecords(env.subscriptionId, (env.snapshot ?? []) as CardRecord[]);
    };

    const handleDelta = (envelope: Envelope): void => {
      const env = envelope as SubscriptionDeltaEnvelope<Change["fields"]>;
      const store = useStore.getState();
      const card = store.cards[env.subscriptionId];
      if (!card) return;
      store.setCardRecords(
        env.subscriptionId,
        applyChanges(card.records, env.changes as Change[]),
      );
      // ⭐ The card remembers which command changed it (navigation-server review).
      store.noteSurfaceChange(`card:${env.subscriptionId}`, env.causes);
    };

    websocketClient.onEnvelope("card-opened", handleOpened);
    websocketClient.onEnvelope("card-touched", handleTouched);
    websocketClient.onEnvelope("card-closed", handleClosed);
    websocketClient.onEnvelope("card-pinned", handlePinned);
    websocketClient.onEnvelope("card-arranged", handleArranged);
    websocketClient.onEnvelope("subscription-delta", handleDelta);
    websocketClient.onEnvelope("subscription-result", handleResult);

    return () => {
      websocketClient.offEnvelope("card-opened", handleOpened);
      websocketClient.offEnvelope("card-touched", handleTouched);
      websocketClient.offEnvelope("card-closed", handleClosed);
      websocketClient.offEnvelope("card-pinned", handlePinned);
      websocketClient.offEnvelope("card-arranged", handleArranged);
      websocketClient.offEnvelope("subscription-delta", handleDelta);
      websocketClient.offEnvelope("subscription-result", handleResult);
    };
  }, []);
}

/** Pause after this long continuously unseen; resume at once (D4). */
const PAUSE_AFTER_MS = 500;

/** Per live card: has the server been told it is hidden, and the pending pause. */
const shown = new Map<string, { paused: boolean; timer: ReturnType<typeof setTimeout> | null }>();

/** Tell the server what is on screen — debounced away, immediate back. */
function setCardShown(instanceId: string, visible: boolean): void {
  let st = shown.get(instanceId);
  if (!st) {
    st = { paused: false, timer: null };
    shown.set(instanceId, st);
  }
  if (visible) {
    if (st.timer !== null) {
      clearTimeout(st.timer);
      st.timer = null;
    }
    if (st.paused) {
      st.paused = false;
      websocketClient.resumeSubscription(instanceId);
    }
    return;
  }
  if (st.paused || st.timer !== null) return;
  const entry = st;
  entry.timer = setTimeout(() => {
    entry.timer = null;
    entry.paused = true;
    websocketClient.pauseSubscription(instanceId);
  }, PAUSE_AFTER_MS);
}

/** Forget a card that closed or stopped being live — nothing to tell. */
function forgetCardShown(instanceId: string): void {
  const st = shown.get(instanceId);
  if (st?.timer) clearTimeout(st.timer);
  shown.delete(instanceId);
}

/**
 * ⭐⭐ The client says what is ON SCREEN (crowded-rooms D4): a live card is
 * shown while its body is mounted, intersects the viewport, and the
 * document is visible. Unseen for half a second, the server is told to
 * pause it (nothing computed, nothing sent); seen again, it resumes and
 * sends one fresh result. The server never guesses — a client that never
 * reports keeps every card current. A card in the tray or displaced by a
 * `medium`/`full` card has no mounted body, so it pauses on unmount.
 */
export function useCardShown(
  instanceId: string,
  live: boolean,
  bodyRef: React.RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!live) {
      forgetCardShown(instanceId);
      return;
    }
    const el = bodyRef.current;
    let intersecting = true;
    const update = (): void =>
      setCardShown(instanceId, intersecting && document.visibilityState !== "hidden");
    let observer: IntersectionObserver | null = null;
    if (el && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver((entries) => {
        intersecting = entries.some((e) => e.isIntersecting);
        update();
      });
      observer.observe(el);
    }
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", update);
      // Unmounted (trayed, displaced, closed): unseen.
      setCardShown(instanceId, false);
    };
  }, [instanceId, live, bodyRef]);
}
