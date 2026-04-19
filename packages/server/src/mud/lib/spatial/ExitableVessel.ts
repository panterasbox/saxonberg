/**
 * ExitableVessel — an enterable, portable-by-shape container.
 *
 * Composition: `ExitableMixin(Vessel)` where `Vessel = ContainerMixin(Thing)`.
 * The result is a Thing that is both Containable (so it can live inside a
 * Location or another ExitableVessel) and Container + Exitable (so players
 * can enter it and look/act inside it).
 *
 * Containment constraint (enforced by `ContainmentApi.move`): an
 * ExitableVessel may only live inside another Exitable. This is the
 * "carry a chest with someone in it" exploit-closer — vessels cannot land
 * in an Avatar's inventory, even empty.
 *
 * Exit semantics: the explicit exit map is always consultable. In addition,
 * `getExit('out')` synthesizes a one-way exit from this vessel to its
 * current environment, and `getEntryExit()` synthesizes the matching
 * one-way exit from the current environment into this vessel — used by
 * `go <vessel-keyword>`. Both are cached and invalidated when the vessel's
 * environment changes.
 */

import { Vessel } from './Vessel';
import { ExitableMixin } from './Exitable';
import { Exit } from './Exit';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from './Container';

// Vessel already = ContainerMixin(Thing), and Thing = ContainableMixin(Stuff),
// so ExitableVessel is Container + Containable + Exitable without further churn.
const ExitableVesselBase = ExitableMixin(Vessel);

export class ExitableVessel extends ExitableVesselBase {
  /**
   * Cached synthesized `'out'` exit. Keyed implicitly by the current
   * environment; invalidated via `#outCacheEnvId` when it changes.
   */
  #outCache: Exit | null = null;
  #outCacheEnvId: string | null = null;

  /**
   * Cached synthesized entry exit (env → vessel). Same keying/invalidation
   * pattern as the `'out'` cache.
   */
  #entryCache: Exit | null = null;
  #entryCacheEnvId: string | null = null;

  /**
   * Optional display name used by the default vessel messages. Subclasses
   * (or seeders) are expected to set this; defaults to "vessel".
   */
  public name: string = 'vessel';

  public override getExit(direction: string): Exit | undefined {
    const explicit = this.exits.get(direction);
    if (explicit) return explicit;

    if (direction === 'out') return this.#getOrSynthesizeOutExit();

    return super.getExit(direction);
  }

  public override getObviousExits(): Exit[] {
    const base = super.getObviousExits();
    const out = this.#getOrSynthesizeOutExit();
    if (out && !out.hidden) base.push(out);
    return base;
  }

  /**
   * Override `setEnvironment` to invalidate the `'out'` exit cache whenever
   * the vessel moves. Called from `ContainableMixin.setEnvironment` through
   * `ContainmentApi.move`.
   */
  public override setEnvironment(container: (Stuff & Container) | null): void {
    super.setEnvironment(container);
    this.#outCache = null;
    this.#outCacheEnvId = null;
    this.#entryCache = null;
    this.#entryCacheEnvId = null;
  }

  /**
   * Synthesize the entry exit from the vessel's current environment into
   * this vessel. Returns `undefined` when the vessel has no environment
   * (i.e. it isn't placed anywhere). Used by `go <vessel-keyword>` so the
   * command controller doesn't need to hand-build an `Exit`.
   */
  public getEntryExit(): Exit | undefined {
    const env = this.environment;
    if (!env) return undefined;

    if (this.#entryCache && this.#entryCacheEnvId === env.stuffId) {
      return this.#entryCache;
    }

    const vesselName = this.name;
    const exit = new Exit({
      direction: 'in',
      source: env,
      destination: this as unknown as Stuff & Container,
      messageOut: `<name>{mover}</name> enters the <name>${vesselName}</name>.`,
      messageIn: `<name>{mover}</name> enters from outside.`,
    });
    this.#entryCache = exit;
    this.#entryCacheEnvId = env.stuffId;
    return exit;
  }

  #getOrSynthesizeOutExit(): Exit | undefined {
    const env = this.environment;
    if (!env) return undefined;

    if (this.#outCache && this.#outCacheEnvId === env.stuffId) {
      return this.#outCache;
    }

    const vesselName = this.name;
    const exit = new Exit({
      direction: 'out',
      source: this as unknown as Stuff & Container,
      destination: env,
      messageOut: `<name>{mover}</name> leaves the <name>${vesselName}</name>.`,
      messageIn: `<name>{mover}</name> emerges from the <name>${vesselName}</name>.`,
    });
    this.#outCache = exit;
    this.#outCacheEnvId = env.stuffId;
    return exit;
  }
}
