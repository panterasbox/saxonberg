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
 * `PostRegistration` carries its hook, `Singleton` enforces one-instance.
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
    };

    /** ⚠ `bowl` is the default because it is the commonest, not the only. */
    public feederKind: FeederKind = 'bowl';
    public lastFilledBy = '';

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
        if (MixinApi.isTangible(thing) && thing.isEdible()) out.push(thing);
      }
      return out;
    }

    public getLastFilledBy(): string {
      return this.lastFilledBy;
    }

    public noteFilledBy(person: Stuff): void {
      this.lastFilledBy = person.getIdentityPath() ?? '';
    }
  }
  return FeederMixin;
}
