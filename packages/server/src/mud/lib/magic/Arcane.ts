/**
 * ArcaneMixin — *this thing produces magic-tagged effects, and here is
 * where they sit on the verb × noun grid.*
 *
 * Four consumers need a magic-producing object's **grid footprint**, and
 * before this mixin there was no common way to ask for it:
 *
 * | Consumer | Needs it to… |
 * |---|---|
 * | **Suppression** | decide whether a grid-filtered ward blocks it |
 * | **Dispel / detect** | key on the tag |
 * | **Rarity** | price it via the arcane price list |
 * | **Census** | derive a census key |
 *
 * `Circulating` carries `effectTags`, but that is the **distribution**
 * mixin — and if the footprint lived there, a ward would have to consult
 * the distribution subsystem to know whether to suppress a wand. That is
 * backwards. The footprint sits *below* distribution and `Circulating`
 * **reads** it. See requirements D35.
 *
 * **Named for the property, not the object kind.** The effect spine
 * deliberately serves traps and NPC powers too, and a trap has a grid
 * address for exactly the same four reasons. A `MagicItem` mixin would
 * leave traps either duplicating it or outside the ward logic, so the
 * concept is `Arcane` — composed by all three item classes now,
 * available to traps and powers later with no rename.
 *
 * **Structured, never scalar — and this is forced, not preferred.** The
 * shipped code reads the two axes *independently* in all three places:
 * `MagicSuppression` matches `verbs?.includes(verb) || nouns?.includes
 * (noun)`; competence is two separate Discipline leaves; and Tarn's Rule
 * takes the **minimum** of the two. A scalar `'create-fire'` would have
 * to be split apart again at every one of those sites.
 *
 * **A set, not a cell**, because multi-effect items exist: rarity takes
 * the most expensive cell, suppression matches if **any** cell matches.
 *
 * **Two sources, one accessor.** An item carrying a `spellId` *derives*
 * its footprint from that spell and never copies it — a duplicated
 * address would drift from the spell it came from. A bespoke item with
 * its own effect bundle *declares* directly. Both answer
 * {@link Arcane.getArcaneFootprint}.
 *
 * **The address belongs to the act, not the effect.** The `Effect` union
 * carries no verb or noun, and a spell declares one address for the
 * whole spell even when it fires several effects — so a footprint is
 * declared or inherited, **never derived from the effect list**.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { StuffApi } from '../../api/stuff';
import { MagicGrid } from './Grid';
import type { MagicNoun, MagicVerb } from './Grid';
import type SpellCatalogue from '../../platform/idea/SpellCatalogue';
// eslint-disable-next-line no-restricted-imports -- the F3 object face: an arcane item's requiresMark() forwards into the magic logic singleton exactly as the api/magic facade does (the Combustible/Energized precedent)
import { MagicLogic } from '../../platform/idea/api/MagicLogic';
import type { Stuff } from '../stuff/Stuff';
import { Final, Unshadowable } from '../security/decorators';
import type { CastOutcome, DischargeOptions } from '../../api/magic';

/** One grid cell — the `MagicProvenance` axes, typed. */
export interface ArcaneAddress {
  readonly verb: MagicVerb;
  readonly noun: MagicNoun;
}

/** Where the catalogue that resolves a carried `spellId` lives. */
const SPELL_CATALOGUE_PATH = '/platform/idea/SpellCatalogue';

export interface Arcane {
  /** Would firing this item's working demand a mark? (F3 read) */
  requiresMark(): boolean;
  /** Fire the bound working at an optional target (the item trigger). */
  dischargeAt(target?: Stuff, opts?: DischargeOptions): Promise<CastOutcome>;

  /**
   * The grid cells this thing's effects occupy. **Derived** from the
   * carried spell when there is one, **declared** otherwise. Never
   * both — a carried spell wins, so an author who sets a spell and
   * stale addresses gets the spell's truth rather than their copy.
   */
  getArcaneFootprint(): readonly ArcaneAddress[];
  /** The spell whose address this item inherits, or `''` for a bespoke one. */
  getCarriedSpellPath(): string;
  setCarriedSpellPath(spellId: string): void;
  /** The bespoke declaration — ignored while a spell is carried. */
  getDeclaredAddresses(): readonly ArcaneAddress[];
  setDeclaredAddresses(addresses: readonly ArcaneAddress[]): void;
  /** Does any cell of this footprint sit at `verb`? */
  hasArcaneVerb(verb: MagicVerb): boolean;
  /** Does any cell of this footprint sit at `noun`? */
  hasArcaneNoun(noun: MagicNoun): boolean;

  /**
   * The durable id of whoever **specified** the working — what the
   * provenance tag's `specifiedBy` carries when this thing fires (D2).
   * `''` for an unattributed one, which the tag fills with the item's
   * own id rather than leaving half-formed.
   */
  getMakerId(): string;
  setMakerId(id: string): void;
  /**
   * The maker's **delivery efficiency**, fixed at manufacture (D7) — the
   * potency multiplier an item discharge supplies where a cast supplies
   * a competence-scaled one. This is the whole of *"a master-made wand
   * delivers more per charge forever, and a novice using one genuinely
   * outperforms that novice casting"*. Never mutates with use: a wand
   * runs out of charge, it does not get worse at spending it.
   */
  getDeliveryEfficiency(): number;
  setDeliveryEfficiency(value: number): void;

  // ---------- storage (public for the Hydrator) ----------
  carriedSpellPath: string;
  declaredAddresses: ArcaneAddress[];
  makerId: string;
  deliveryEfficiency: number;
}

export function ArcaneMixin<TBase extends MixinConstructor>(Base: TBase) {
  class ArcaneMixin extends Base implements Arcane {
    static _mixinName = 'ArcaneMixin';

    static fieldMeta: FieldMeta = {
      carriedSpellPath: { persistent: true, authorable: true },
      declaredAddresses: { persistent: true, authorable: true },
      makerId: { persistent: true, authorable: true },
      deliveryEfficiency: { persistent: true, authorable: true, spoiler: 1 },
    };

    /** The spell whose grid address this thing inherits. `''` = bespoke. */
    public carriedSpellPath: string = '';

    /** The bespoke footprint. Plain scalars → persists free. */
    public declaredAddresses: ArcaneAddress[] = [];

    /** The specifier's durable id. `''` = unattributed. */
    public makerId: string = '';

    /** Delivery efficiency, fixed at manufacture. 1 = the cast baseline. */
    public deliveryEfficiency: number = 1;

    public getMakerId(): string {
      return this.makerId;
    }

    public setMakerId(id: string): void {
      this.makerId = typeof id === 'string' ? id : '';
    }

    public getDeliveryEfficiency(): number {
      return this.deliveryEfficiency;
    }

    public setDeliveryEfficiency(value: number): void {
      const n = Number(value);
      if (!Number.isFinite(n) || n <= 0) {
        throw new RangeError(
          `deliveryEfficiency: must be a positive number, got '${String(value)}'`,
        );
      }
      this.deliveryEfficiency = n;
    }

    public getCarriedSpellPath(): string {
      return this.carriedSpellPath;
    }

    public setCarriedSpellPath(path: string): void {
      // ⚠ A bare id is the mistake this field exists to prevent, and the
      // type system cannot catch it — both are strings. So the setter
      // does, which turns the rename from a naming convention into an
      // actual guardrail: `firebolt` throws, `/stuff/idea/magic/Spell/firebolt`
      // does not. Empty clears.
      const v = typeof path === 'string' ? path.trim() : '';
      if (v.length > 0 && !v.startsWith('/')) {
        throw new RangeError(
          `carriedSpellPath: '${v}' is a bare id, not a template path ` +
            `(did you mean '/stuff/idea/magic/Spell/${v}'?)`,
        );
      }
      this.carriedSpellPath = v;
    }

    public getDeclaredAddresses(): readonly ArcaneAddress[] {
      return this.declaredAddresses;
    }

    /** Validates every cell — an unknown verb or noun throws at authoring. */
    public setDeclaredAddresses(addresses: readonly ArcaneAddress[]): void {
      if (!Array.isArray(addresses)) {
        throw new TypeError('arcaneAddresses: expected a list of {verb, noun}');
      }
      this.declaredAddresses = addresses.map((a) => {
        const cell = a as { verb?: unknown; noun?: unknown };
        if (!MagicGrid.isVerb(cell.verb) || !MagicGrid.isNoun(cell.noun)) {
          throw new TypeError(
            `arcaneAddresses: bad cell '${String(cell.verb)}·${String(cell.noun)}'`,
          );
        }
        return { verb: cell.verb, noun: cell.noun };
      });
    }

    public getArcaneFootprint(): readonly ArcaneAddress[] {
      if (this.carriedSpellPath.length > 0) {
        const spell = StuffApi.findByTemplatePath<SpellCatalogue>(
          SPELL_CATALOGUE_PATH,
        )?.getSpellAt(this.carriedSpellPath);
        // A carried spell the catalogue does not know is an authoring
        // error, not a licence to fall back on a stale declaration —
        // an empty footprint is suppressible by nothing and priced as
        // nothing, which is the legible failure.
        return spell ? [{ verb: spell.verb, noun: spell.noun }] : [];
      }
      return this.declaredAddresses;
    }

    public hasArcaneVerb(verb: MagicVerb): boolean {
      return this.getArcaneFootprint().some((a) => a.verb === verb);
    }

    public hasArcaneNoun(noun: MagicNoun): boolean {
      return this.getArcaneFootprint().some((a) => a.noun === noun);
    }
    /**
     * **Would firing this item's working demand a mark?** True only
     * when *every* effect needs one. The question a door asks BEFORE
     * spending anything (the F3 item-side read).
     */
    public requiresMark(): boolean {
      return arcaneMagicLogic().requiresMark(this as unknown as Stuff);
    }

    /**
     * Fire the working bound into this item at an optional target — the
     * one entry point every item class uses (wand zap, scroll read,
     * quaffed potion). No band gate, no cast time, no Transcript
     * credit; the capability mixin that calls it has already spent the
     * charge / consumed the dose. Sealed — the working pipeline is the
     * one writer.
     */
    @Final
    @Unshadowable
    public dischargeAt(
      target?: Stuff,
      opts?: DischargeOptions,
    ): Promise<CastOutcome> {
      return arcaneMagicLogic().discharge(
        this as unknown as Stuff,
        target,
        opts,
      );
    }
  }

  return ArcaneMixin;
}

/** Resolve the HMR-able MagicLogic singleton (the working pipeline). */
function arcaneMagicLogic(): MagicLogic {
  return StuffApi.singletonSync(
    '/platform/idea/api/magic',
    () => new MagicLogic(),
  );
}
