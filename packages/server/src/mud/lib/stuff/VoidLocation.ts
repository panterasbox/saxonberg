/**
 * VoidLocation — the bootstrap-pinned fallback location.
 *
 * Concrete `Location` subclass used by the `/domain/void` seed
 * exclusively. Two roles:
 *
 *   1. **Starting location.** New avatars resolve into the void on
 *      first session-start (`DEFAULT_STARTING_LOCATION_PATH`); content
 *      will move them out of it as real spawn destinations land.
 *   2. **HasInteractive fallback.** When a `ContainerMixin` host
 *      destructs with no outer, any `HasInteractive` containables
 *      escape to this singleton so live sessions never end up with a
 *      `null` environment (see `ContainerMixin.cleanupOnDestruct`).
 *
 * Both roles rely on the singleton being live at all times —
 * `Container.cleanupOnDestruct` resolves it via sync
 * `findByTemplatePath`. `BootstrapManager` pins it at startup; this
 * subclass refuses destruct so a stray verb can't break the
 * invariant.
 *
 * Composes `SingletonMixin` to declare the one-instance-per-path
 * intent at the class level. Without it, persist-back of a Stuff
 * located in the void fails `TemplateApi.validateSingletonContainerTarget`
 * — `data.container: /domain/void` requires the target's class to
 * be singleton-shaped.
 */

import Location from './Location';
import { SingletonMixin } from './Singleton';
import type { VetoResult } from '../errors';

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
