/**
 * SubscriptionApi — THE subscription protocol's facade
 * (navigation-server D1): let a body poke a source it feeds. A session's
 * own subscriptions are verbs on the session — `interactive.subscribe`,
 * `cancelSubscription`, `cancelAllSubscriptions`, `hasSubscription`.
 *
 * ⭐⭐ One protocol for every state push. The client's `subscribe` names a
 * source by template path; the {@link SubscriptionRegistry} loads it on
 * use, checks that its class composes `SubscriptionSourceMixin` before
 * standing anything up, stamps `rev`, and sends `subscription-result` /
 * `-delta` / `-error`. The MQL registry, the forum registry and every
 * newer source sit behind it; none of them builds an envelope.
 *
 * Read-only by construction: nothing here writes anything a client asks
 * it to (`backend/inbound/README.md`).
 *
 * See `docs/subsystems/subscription.md`.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { TemplatePaths } from '../lib/paths';
import type { Stuff } from '../lib/stuff/Stuff';
import SubscriptionRegistry, {
  type SubscriptionOpenOptions,
} from '../platform/idea/SubscriptionRegistry';
import { fileURLToPath } from 'url';

export type { SubscriptionOpenOptions };

const REGISTRY_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/SubscriptionRegistry', import.meta.url),
);

function registry(): SubscriptionRegistry {
  return StuffApi.singletonSync(
    TemplatePaths.subscriptionRegistry,
    () =>
      new ((HotReloadApi.getCurrentExport(
        REGISTRY_CLASS_FILE,
        'default',
      ) as typeof SubscriptionRegistry | null) ?? SubscriptionRegistry)(),
  );
}

export class SubscriptionApi {
  /**
   * ⭐ A body's own poke: the source at `source` is told `holder`'s
   * answer may have changed. A source nobody subscribed to is not standing
   * and is not stood up to be told.
   */
  static poke(source: string, holder: Stuff, hint?: unknown): void {
    registry().poke(source, holder, hint);
  }

  /** Every open subscription, counted (tests). */
  static _countForTesting(): number {
    SecurityApi.assertTestOnly('_countForTesting');
    return registry().count();
  }
}

SecurityApi.decorateApiClass(SubscriptionApi);
