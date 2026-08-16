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
 * ⚠ **It cannot open one even by mistake.** `MqlSubscribeMessage`
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
import type {
  CardClosedEnvelope,
  CardOpenedEnvelope,
  CardPinnedEnvelope,
  CardTouchedEnvelope,
  Envelope,
  MqlSubscriptionDeltaEnvelope,
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
  place: "where you are",
  who: "who's online",
  news: "the news",
  wiki: "the wiki",
  help: "the rulebook",
  prompt: "a question for you",
  cms: "the content editor",
  git: "version control",
  studio: "the composer",
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
  changes: MqlSubscriptionDeltaEnvelope["changes"],
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
      });
    };

    const handleTouched = (envelope: Envelope): void => {
      const env = envelope as CardTouchedEnvelope;
      useStore.getState().touchCard(env.instanceId, {
        key: env.key,
        ...(env.takenAt !== undefined ? { takenAt: env.takenAt } : {}),
        ...(env.title !== undefined ? { title: env.title } : {}),
        ...(env.prose ? { prose: env.prose } : {}),
        ...(env.payload ? { payload: env.payload } : {}),
        ...(env.result ? { records: env.result as CardRecord[] } : {}),
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
    const handleDelta = (envelope: Envelope): void => {
      const env = envelope as MqlSubscriptionDeltaEnvelope;
      const store = useStore.getState();
      const card = store.cards[env.subscriptionId];
      if (!card) return;
      store.setCardRecords(
        env.subscriptionId,
        applyChanges(card.records, env.changes),
      );
    };

    websocketClient.onEnvelope("card-opened", handleOpened);
    websocketClient.onEnvelope("card-touched", handleTouched);
    websocketClient.onEnvelope("card-closed", handleClosed);
    websocketClient.onEnvelope("card-pinned", handlePinned);
    websocketClient.onEnvelope("mql-subscription-delta", handleDelta);

    return () => {
      websocketClient.offEnvelope("card-opened", handleOpened);
      websocketClient.offEnvelope("card-touched", handleTouched);
      websocketClient.offEnvelope("card-closed", handleClosed);
      websocketClient.offEnvelope("card-pinned", handlePinned);
      websocketClient.offEnvelope("mql-subscription-delta", handleDelta);
    };
  }, []);
}
