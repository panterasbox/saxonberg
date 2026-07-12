/**
 * FixtureMixin — a self-seating fixture: content that, on registration,
 * seats ITSELF into a declared target. The object-owns inverse of the
 * container-owns spawn framework (`Spawner` / `Spawned` / `Populates`):
 * there a host creates and places its contents; here the object names where
 * it belongs (`seatIn`) and asks to be placed there.
 *
 * The `seatIn` target is resolved by `ContainmentApi.resolveLanding`, which
 * accepts EITHER a Warren or a plain singleton location:
 *
 *   - a **Warren** → the warren's live host holds the fixture, and the
 *     fixture registers with the warren so it RE-SEATS when the host
 *     migrates (a fixture is furniture that follows the host, not a
 *     transient occupant that gets drained).
 *   - a **plain location** → the fixture moves directly into it (this
 *     subsumes a static `container` self-placement).
 *
 * The fixture knows nothing about "hosts" or warrens — it names a target and
 * delegates the warren-vs-location decision to the Api. Seating is driven by
 * the composing class from its `postRegister` (so it runs after the fixture
 * is a registered singleton); the mixin exposes `seatSelf()` for that call
 * rather than hooking the lifecycle itself, because a host class typically
 * already owns `postRegister`.
 *
 * Precedent for an object self-registering with its Warren: `Lounge`
 * declares a `warren` field and self-registers via `LoungeMixin.applyWarren`.
 *
 * What this mixin is NOT: a containment tier, a host marker, or a spawner
 * (it places only itself, never other objects).
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from './Stuff';
import type { Containable } from '../spatial/Containable';
import { ContainmentApi } from '../../api/containment';

/** Public shape provided by FixtureMixin. */
export interface Fixture {
  /** The declared seat target — a Warren or a singleton location path. */
  getSeatIn(): string | null;
  setSeatIn(ref: string): void;
  /** Resolve `seatIn` and place self into it (Warren host or location). */
  seatSelf(): Promise<void>;
}

export function FixtureMixin<
  TBase extends MixinConstructor<Stuff & Containable>,
>(Base: TBase) {
  return class FixtureMixin extends Base implements Fixture {
    static _mixinName = 'FixtureMixin';

    /** The seat target path (a Warren or a singleton location). */
    static persistentFields = ['seatIn'];

    /** @authorable ref:Template */
    private _seatIn: string | null = null;

    getSeatIn(): string | null {
      return this._seatIn;
    }
    setSeatIn(ref: string): void {
      this._seatIn = ref;
    }

    async seatSelf(): Promise<void> {
      const ref = this._seatIn;
      if (!ref) return;
      const self = this as unknown as Stuff & Containable;
      const { container, warren } = await ContainmentApi.resolveLanding(ref);
      // A Warren target: register so the fixture re-seats on host migration.
      if (warren) warren.registerFixture(self);
      ContainmentApi.move(self, container);
    }
  };
}
