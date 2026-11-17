/**
 * SubscriptionSourceMixin — the provider side of THE subscription
 * protocol (navigation-server D1): a singleton that answers a standing
 * question for a session and keeps the answer current.
 *
 * ⭐⭐ One protocol for every state push. A client sends `subscribe`
 * naming a source by its TEMPLATE PATH; `SubscriptionRegistry` loads that
 * singleton on use (there is no list of sources anywhere), refuses it
 * unless its class composes this mixin — read from the row BEFORE
 * anything is stood up — and hands it a {@link Subscription}. The source
 * answers the snapshot; from then on it calls `sub.push(changes)` when the
 * answer changes. It never builds an envelope, never stamps a `rev` and
 * never keeps an id table: the registry does all three, once, for every
 * source.
 *
 * Events stay events: a subscription keeps a COPY current, so a reconnect
 * is repaired by asking for the snapshot again. Something that happened
 * once (a dispatch, a prompt, a card being born) has no copy to keep.
 *
 * Composers: the MQL and forum registries, `ClientStateSource`,
 * `PressFeedSource`, `MapCopySource`, `WhereaboutsSource`.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { SubscriptionChange } from '@saxonberg/types';
import type Interactive from '../../platform/idea/Interactive';

/**
 * The registry's handle on one subscription, given to its source. The
 * source keeps what it needs in `state`.
 */
export interface Subscription {
  /** The id the client chose — unique per session. */
  readonly id: string;
  /** The session it belongs to. */
  readonly interactive: Interactive;
  /** The source's template path. */
  readonly source: string;
  /** The body the session drives now (it can change: the sandbox crossing). */
  holder(): Stuff | null;
  /** Send these changes as one delta (`rev + 1`). Empty is a no-op. */
  push(changes: SubscriptionChange[]): void;
  /** Refuse or end it in a word: an error goes out and it is closed. */
  fail(reason: string, detail?: string): void;
  /** The source has ended it itself, quietly (its state is already gone). */
  end(): void;
  /** Still open? */
  isOpen(): boolean;
  /** What the source keeps for this subscription. */
  state: unknown;
}

/** An `openSubscription` that refuses answers this. */
export interface SubscriptionRefusal {
  refused: true;
  reason: string;
  detail?: string;
}

export interface SubscriptionSource {
  /**
   * Answer the snapshot for `params`, or refuse in a word. Answering
   * synchronously keeps the open synchronous (a live card's open is).
   */
  openSubscription(
    sub: Subscription,
    params: unknown,
  ): unknown | SubscriptionRefusal | Promise<unknown | SubscriptionRefusal>;
  /** The subscriber is gone (unsubscribe, disconnect, a failed open). */
  closeSubscription(sub: Subscription): void;
  /**
   * Somebody says this holder's answer may have changed — the body's own
   * poke; `null` when the answer is everyone's (the press ticker). A
   * source that wakes itself (an event index, a ledger) says so and does
   * nothing.
   */
  pokeSubscriptions(holder: Stuff | null, hint?: unknown): void;
}

export function SubscriptionSourceMixin<TBase extends MixinConstructor>(
  Base: TBase,
) {
  return class SubscriptionSourceMixin extends Base implements SubscriptionSource {
    static _mixinName = 'SubscriptionSourceMixin';

    /**
     * @hook Every source answers its own snapshot. Default: refused — a
     *   class that composes the mixin and answers nothing is not a source.
     */
    openSubscription(
      sub: Subscription,
      params: unknown,
    ): unknown | SubscriptionRefusal | Promise<unknown | SubscriptionRefusal> {
      void sub;
      void params;
      return { refused: true, reason: 'source', detail: 'this source answers nothing' };
    }

    /** @hook A source that keeps per-subscription state drops it here. Default: nothing kept. */
    closeSubscription(sub: Subscription): void {
      void sub;
    }

    /** @hook A source poked by the body recomputes. Default: it wakes itself. */
    pokeSubscriptions(holder: Stuff | null, hint?: unknown): void {
      void holder;
      void hint;
    }
  };
}
