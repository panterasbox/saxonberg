/**
 * LoungeMixin — the lounge room's own, lounge-specific member behavior.
 *
 * Lives with the lounge content (`/world/lounge/`), not the generic
 * Warren substrate (`/lib/location/`). Sits on top of
 * `WarrenMemberMixin` (composition constraint, enforced at register time):
 * it is a *consumer* of the Warren back-ref, not a second carrier of it.
 * It supplies the lounge-room behaviors that are NOT generic Warren
 * mechanism:
 *
 *   1. **Self-register** — a declared `warren` instruction field
 *      (`applyWarren`) joins this room to its Warren on hydrate. The
 *      Warren owns the relationship; this only *initiates* it.
 *   2. **Population witnesses** — `onContainableAdded` /
 *      `onContainableRemoved` notify the Warren of `HasInteractive`
 *      population changes (event-driven reconcile).
 *   3. **Over-capacity re-seat** — when an arrival lands in the host and
 *      pushes it past the bud threshold, hand off to the Warren's
 *      `admitArrival`, which re-seats to an eligible satellite (synchronous
 *      when one exists — single sense) or buds a fresh one.
 *
 * This is also the home for the lounge's *future* room functionality —
 * v1 ships a basic warren participant; later these rooms gain function
 * (toppings, matchmaking, the order console, …), which lands here.
 *
 * What this mixin is NOT: a host marker (host-ness is the Warren's
 * `getHost()` / `isCurrentHost`, never a flag here), a container tier, or
 * the durable-recall hook (that rides `WarrenMember.getWarren()` from the
 * persistence spine's `PersistableLogic.capturePlacement`).
 */

import type { MixinConstructor, FieldMeta } from '../../lib/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';
import type { WarrenMember } from '../../lib/location/WarrenMember';
import { Warren } from '../../lib/location/Warren';
import { StuffApi } from '../../api/stuff';
import { MixinApi, type AnyConstructor } from '../../api/mixin';
import { Mixins } from '../../lib/mixin';

/**
 * Public shape provided by LoungeMixin. The instruction-field applier is
 * the only added surface; the witnesses are optional Container hooks the
 * framework dispatches.
 */
export interface Lounge {
  /**
   * Instruction-field applier for the declared `warren` seed path.
   * Resolves (or lazily creates, for a stray clone) the Warren singleton
   * and self-registers via the Warren-owned `addMember`.
   */
  applyWarren(warrenPath: string): Promise<void>;
}

/** Structural view of the lounge Warren surface this mixin consults. */
interface LoungeWarrenView {
  isCurrentHost(room: Stuff & Container): boolean;
  notifyPopulationChange(room: Stuff & Container): void;
  admitArrival(host: Stuff & Container, actor: Stuff): Promise<void>;
  getBudThreshold(): number;
}

export function LoungeMixin<
  TBase extends MixinConstructor<Stuff & Container & WarrenMember>,
>(Base: TBase) {
  return class LoungeMixin extends Base {
    static _mixinName = 'LoungeMixin';

    /**
     * Declared-warren seed. Consumed once by Phase 2 of the Hydrator —
     * an instruction field, not a stored property (no paired getter; the
     * live affiliation is `WarrenMember.getWarren()`).
     */
    static fieldMeta: FieldMeta = {
      warren: { instruction: true, authorable: true, authorPicker: 'Template' },
    };

    /**
     * Composition constraint: LoungeMixin requires WarrenMemberMixin on
     * the chain (it reads/writes the back-ref via `getWarren`). The TS
     * bound documents it; this runtime check enforces it the first time
     * an instance registers (mirrors GlobbableMixin's opt-in).
     */
    static __validateComposition__(ctor: AnyConstructor): void {
      if (!MixinApi.hasMixin(ctor, Mixins.WarrenMember)) {
        throw new Error(
          `LoungeMixin requires WarrenMemberMixin on the composition ` +
            `chain (it consumes the Warren back-ref), but ` +
            `${(ctor as { name?: string }).name ?? '<anonymous>'} does not ` +
            `compose it.`,
        );
      }
    }

    /**
     * Self-register with the declared Warren. Resolves the singleton
     * (creating it if absent — the stray-clone heal), then joins via the
     * Warren-owned `addMember`. The Warren check is a real `instanceof`
     * against the canonical base class (unspoofable) — a non-Warren
     * target or missing template warns and leaves the room an orphan
     * (QA-catches tradeoff).
     */
    async applyWarren(warrenPath: string): Promise<void> {
      let warren: Stuff;
      try {
        warren = await StuffApi.singleton<Stuff>(warrenPath);
      } catch (err) {
        console.warn(
          `LoungeMixin.applyWarren: could not resolve Warren at ` +
            `'${warrenPath}' for ${(this as unknown as Stuff).stuffId}`,
          err,
        );
        return;
      }
      if (!(warren instanceof Warren)) {
        console.warn(
          `LoungeMixin.applyWarren: '${warrenPath}' is not a Warren; ` +
            `${(this as unknown as Stuff).stuffId} stays an orphan.`,
        );
        return;
      }
      warren.addMember(this as unknown as Stuff & Container);
    }

    /**
     * Population witness — an arrival entered this room. Notify the
     * Warren of the population change; when this room is the host and the
     * arrival pushes it past the bud threshold, hand the newcomer to the
     * Warren's `admitArrival` for re-seating. The handoff's synchronous
     * prefix re-seats to an existing satellite within this very move
     * (single perception); only a bud awaits.
     */
    onContainableAdded(thing: Stuff & Containable): void {
      if (!MixinApi.isHasInteractive(thing as unknown as Stuff)) return;
      const warren = (this as unknown as WarrenMember).getWarren() as unknown as
        | LoungeWarrenView
        | null;
      if (!warren) return;
      const self = this as unknown as Stuff & Container;
      warren.notifyPopulationChange(self);
      if (!warren.isCurrentHost(self)) return;
      const occupants = self
        .getContents()
        .filter((c) => MixinApi.isHasInteractive(c)).length;
      if (occupants > warren.getBudThreshold()) {
        void warren
          .admitArrival(self, thing as unknown as Stuff)
          .catch((err) => {
            console.error(
              `LoungeMixin.onContainableAdded: admitArrival failed`,
              err,
            );
          });
      }
    }

    /** Population witness — an occupant left this room. */
    onContainableRemoved(thing: Stuff & Containable): void {
      if (!MixinApi.isHasInteractive(thing as unknown as Stuff)) return;
      const warren = (this as unknown as WarrenMember).getWarren() as unknown as
        | LoungeWarrenView
        | null;
      if (!warren) return;
      warren.notifyPopulationChange(this as unknown as Stuff & Container);
    }
  };
}
