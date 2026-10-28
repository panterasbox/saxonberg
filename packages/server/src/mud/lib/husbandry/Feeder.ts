/**
 * Feeder — ⭐ **a vessel an animal feeds from**, and what KIND of vessel
 * it is.
 *
 * ⚠⚠ **This was a bare marker and that was wrong.** It carried a
 * `_mixinName` and nothing else — the only mixin in the tree that
 * conferred nothing, and the file justified itself by citing
 * `HandledMixin` as a "pure carrier" exemplar. `HandledMixin` is not one:
 * it carries `commandContributions` and confers the `handle` verb. Every
 * other near-empty mixin in the tree confers something real —
 * `Palatable` and `NutritionLabel` each carry a `markupAugmenter`,
 * `Singleton` enforces one-instance.
 * A mixin that is only a tag is a tag pretending to be architecture.
 *
 * What it confers now, all of which something reads:
 *
 *  - **`feederKind`** — `bowl · trough · hopper`. ⭐ The load-bearing
 *    one: a species declares which kinds it eats from, so a canary
 *    feeds at a hopper and never a horse trough, and a cat at a bowl.
 *    Before this, every vessel fed every animal and the difference
 *    between a bird and an ox was nothing.
 *  - **`offerings()`** — what is in here that an animal would eat. The
 *    `feeds` brain used to rummage through the contents itself, which is
 *    a brain doing the vessel's job; the vessel answers now.
 *  - **`lastFilledBy`** — who last put food in. ⭐ This is what makes
 *    *"have somebody else fill it"* legible: the floor is delegable, and
 *    you can see that it was delegated.
 *  - **a `markupAugmenter`** — *it is empty* / *there is food in it*,
 *    because whether the bowl needs filling is the single thing a keeper
 *    looks at it to find out.
 *
 * It still composes over the shipped vessel shape and adds no hunger
 * read and no schedule: interior bulk carries water and milk (`fill`,
 * `pour`, `drink`), contents carry scraps (`put`), and food left in it
 * turns on the shipped spoilage clock with no code at all — the neglect
 * signal, arriving free.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { Quantity } from '../quantity';
import type { MarkupAugmenter } from '../../api/mml';
import type { FeederKind } from '../../platform/idea/species/Species';

/**
 * What a keeper sees. ⚠ Deliberately not *"the cat has not been fed"* —
 * the vessel knows what is in it and nothing else. Whether that matters
 * is the keeper's to judge, which is the no-gauge rule.
 */
function feederAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!MixinApi.isFeeder(host) || host.isDestroyed()) return text;
  const line = host.offerings().length > 0 ? undefined : 'It is empty.';
  if (!line) return text;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

export interface Feeder {
  /** What kind of vessel this is — a species eats from kinds it names. */
  getFeederKind(): FeederKind;
  setFeederKind(value: FeederKind): void;
  /** What is in here that an animal would eat. */
  offerings(): readonly Stuff[];
  /** Identity path of whoever last put food in, or `''`. */
  getLastFilledBy(): string;
  /** Record who filled it — the delegable floor, made legible. */
  noteFilledBy(person: Stuff): void;
  /**
   * ⭐ The store this feeder is kept from — the identity path of a rick, a
   * bin, a loft — or `''` (cover build D11). A trough whose keeper stacks
   * the rick in season is kept full from it while nobody is watching: the
   * staff's standing job, abstracted over an interval no brain can act
   * in, which still costs somebody the mowing and the stacking.
   */
  getSuppliedBy(): string;
  setSuppliedBy(path: string): void;
  /**
   * Take up to `kg` of edible matter out of this feeder by MASS — off its
   * own offerings first, then, when they run out, off the store it is
   * kept from. Returns the kilograms actually taken. A good eaten to
   * nothing is destroyed. Sync: the field's grazing integral calls it
   * inside its stepped loop.
   */
  drawFodder(kg: number): number;
}

export function FeederMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  class FeederMixin extends Base implements Feeder {
    static _mixinName = 'FeederMixin';

    /** Whether it needs filling is what a keeper looks at it to learn. */
    static markupAugmenters: MarkupAugmenter[] = [feederAugmenter];

    static fieldMeta: FieldMeta = {
      feederKind: { persistent: true, authorable: true },
      lastFilledBy: { persistent: true },
      suppliedBy: { persistent: true, authorable: true },
    };

    /** ⚠ `bowl` is the default because it is the commonest, not the only. */
    public feederKind: FeederKind = 'bowl';
    public lastFilledBy = '';
    /** Identity path of the store this is kept from; `''` = none. */
    public suppliedBy = '';

    public getFeederKind(): FeederKind {
      return this.feederKind;
    }

    public setFeederKind(value: FeederKind): void {
      this.feederKind = value;
    }

    /**
     * The edible things in here. ⚠ Contents only — the interior bulk
     * (water, milk) is drunk through the shipped `drink` path and is not
     * an *offering* in this sense.
     */
    public offerings(): readonly Stuff[] {
      const self = this as unknown as Stuff;
      if (!MixinApi.isContainer(self)) return [];
      const out: Stuff[] = [];
      for (const thing of self.getContents()) {
        // A good eaten down to nothing is gone, whatever its teardown is
        // still doing.
        if (thing.isDestroyed()) continue;
        if (MixinApi.isTangible(thing) && thing.isEdible() && thing.getMass().rawValue() > 0) {
          out.push(thing);
        }
      }
      return out;
    }

    public getLastFilledBy(): string {
      return this.lastFilledBy;
    }

    public noteFilledBy(person: Stuff): void {
      this.lastFilledBy = person.getIdentityPath() ?? '';
    }

    public getSuppliedBy(): string {
      return this.suppliedBy;
    }

    public setSuppliedBy(path: string): void {
      this.suppliedBy = path ?? '';
    }

    public drawFodder(kg: number): number {
      if (!Number.isFinite(kg) || kg <= 0) return 0;
      const self = this as unknown as Stuff;
      let left = drawFrom(self, kg);
      if (left > 0 && this.suppliedBy) {
        // ⚠ Load on use: the authored path names the store; nothing is
        // searched for. A store that is not loaded supplies nothing.
        const store = StuffApi.findByTemplatePath(this.suppliedBy);
        if (store) left = drawFrom(store, left);
      }
      return kg - left;
    }
  }
  return FeederMixin;
}

/**
 * Draw up to `kg` of edible matter off `holder`'s contents by mass, and
 * return what is still wanted. A good eaten to nothing is weighed to zero
 * at once (so a second draw in the same integral skips it) and destroyed.
 */
function drawFrom(holder: Stuff, kg: number): number {
  if (!MixinApi.isContainer(holder)) return kg;
  let left = kg;
  for (const thing of holder.getContents()) {
    if (left <= 0) break;
    if (thing.isDestroyed()) continue;
    if (!MixinApi.isTangible(thing) || !thing.isEdible()) continue;
    const mass = thing.getMass().rawValue();
    if (!(mass > 0)) continue;
    const take = Math.min(mass, left);
    left -= take;
    const rest = Math.round((mass - take) * 1000) / 1000;
    thing.setMass(Quantity.of(rest, 'kg'));
    if (rest <= 0) void StuffApi.destruct(thing);
  }
  return left;
}
