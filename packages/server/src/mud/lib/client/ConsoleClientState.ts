/**
 * ConsoleClientStateMixin — contributes console-foundations'
 * client-state keys to the aggregated `ClientStateMixin` schema.
 *
 * Pure schema contribution for v1 — no methods. Future console
 * state related methods (e.g., a typed `getConsoleTabs()` helper)
 * can land here if/when they're worth the indirection.
 *
 * Composed onto Avatar above `ClientStateMixin` so the walker
 * picks up both layers' static schemas.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { ClientStateSchemaEntry } from './ClientState';
import type { ConsoleTab } from '@saxonberg/types';

export function ConsoleClientStateMixin<
  TBase extends MixinConstructor<Stuff>,
>(Base: TBase) {
  class ConsoleClientStateMixin extends Base {
    static _mixinName = 'ConsoleClientStateMixin';

    static clientStateSchema: ClientStateSchemaEntry[] = [
      {
        key: 'console.tabs',
        defaultValue: [{ name: 'All', muted: [] }] satisfies ConsoleTab[],
      },
      {
        key: 'console.activeTab',
        defaultValue: 'All',
      },
    ];
  }
  return ConsoleClientStateMixin;
}
