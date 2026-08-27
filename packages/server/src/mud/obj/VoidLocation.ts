/**
 * VoidLocation — the bootstrap-pinned fallback location.
 *
 * Concrete `Location` subclass used by the `/world/void` seed
 * exclusively. Its role is the **`HasInteractive` evacuation fallback**:
 * when a `ContainerMixin` host destructs with no outer, any
 * `HasInteractive` containables escape to this singleton so live sessions
 * never end up with a `null` environment (see
 * `ContainerMixin.cleanupOnDestruct`). It is the default target of the
 * `evacuationFallback` app setting — the designed "nowhere safe left"
 * container, distinct from the new-player spawn (`defaultStartLocation`,
 * the lounge).
 *
 * The role relies on the singleton being live at all times —
 * `Container.cleanupOnDestruct` resolves it via sync
 * `findByTemplatePath`. `BootstrapManager` pins it at startup; this
 * subclass refuses destruct so a stray verb can't break the
 * invariant.
 *
 * Composes `SingletonMixin` to declare the one-instance-per-path
 * intent at the class level. Without it, persist-back of a Stuff
 * located in the void fails `TemplateApi.validateSingletonContainerTarget`
 * — `data.container: /world/void` requires the target's class to
 * be singleton-shaped.
 */

import Location from '../lib/stuff/Location';
import { SingletonMixin } from '../lib/stuff/Singleton';
import type { VetoResult } from '../lib/errors';

export default class VoidLocation extends SingletonMixin(Location) {
  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        'the void is a bootstrap-pinned fallback location and cannot ' +
        'be destructed; use forceDestruct (admin-gated) if you really mean it',
    };
  }
}
