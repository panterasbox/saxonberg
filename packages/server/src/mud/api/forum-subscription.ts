/**
 * ForumSubscriptionApi — thin facade over the ForumSubscriptionRegistry
 * singleton (the forum document-change observer).
 *
 * The registry IS the gated logic singleton (its public methods carry
 * `FromModule('mud/api/forum-subscription#ForumSubscriptionApi')`); this
 * facade forwards to it via `StuffApi.singletonSync`, mirroring
 * `MqlSubscriptionApi`. Consumed by the `forum-subscribe` /
 * `forum-unsubscribe` inbound handlers.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import ForumSubscriptionRegistry, {
  type ForumSubscribeRequest,
} from '../obj/ForumSubscriptionRegistry';
import { TemplatePaths } from '../lib/paths';
import type Interactive from '../obj/Interactive';
import { fileURLToPath } from 'url';

const REGISTRY_PATH = TemplatePaths.forumSubscriptionRegistry;
const REGISTRY_CLASS_FILE = fileURLToPath(
  new URL('../obj/ForumSubscriptionRegistry', import.meta.url),
);

function registry(): ForumSubscriptionRegistry {
  return StuffApi.singletonSync(
    REGISTRY_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        REGISTRY_CLASS_FILE,
        'default',
      ) as typeof ForumSubscriptionRegistry | null) ??
        ForumSubscriptionRegistry)(),
  );
}

export class ForumSubscriptionApi {
  static handleSubscribe(req: ForumSubscribeRequest): Promise<void> {
    return registry().handleSubscribe(req);
  }

  static handleUnsubscribe(
    interactive: Interactive,
    subscriptionId: string,
  ): void {
    registry().handleUnsubscribe(interactive, subscriptionId);
  }

  static cancelAllForInteractive(interactive: Interactive): void {
    registry().cancelAllForInteractive(interactive);
  }
}

SecurityApi.decorateApiClass(ForumSubscriptionApi);
