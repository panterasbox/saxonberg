/**
 * Weapon — a melee implement (delivery half + the derived playstyle).
 *
 * The symmetric dual of {@link Armor}: a `Thing` carrying a `Material` (on
 * `Thing`'s `Tangible`), a `Construction` (its weapon-delivery form), a
 * `Grade`, and a wear-on-use `condition`. It *derives* which channel(s) it
 * delivers from its form via `MaterialApi.deliverableChannels` — a dagger
 * (`bladed`) delivers edge, a mace (`hafted`) blunt — so harm can be driven
 * by real objects.
 *
 * A weapon is `WieldableMixin` (it claims a body-plan hand slot via
 * `slotClaims`, so you can `wield`/`unwield` it). The weapon-playstyle
 * build makes it more than holdable: from its **shape** — form × material ×
 * `mass` × `length` × hand-claim count — it derives a compact
 * {@link WeaponProfile} (reach / balance / guard / handedness / delivery),
 * each axis an input to a combat system that already exists. Nothing is
 * hand-tuned: you author a long balanced steel blade and the playstyle
 * follows. Two authored **dimensions** ground it — `mass` (→ balance →
 * tempo/poise) on `Tangible`, and `length` (→ reach) here — symmetric real
 * magnitudes, never free-floating bands.
 *
 * A weapon composes {@link DurableMixin} for its wear-on-use `condition`
 * gauge (a blade dulls with use) — a *durable good*, NOT a crafting tool, so
 * it carries no inert capability list.
 *
 * Seeded as content (e.g. `/stuff/thing/arms/steel-dagger`) with
 * `_materialPath`, `constructionForm: bladed`, a `grade`, `slotClaims`,
 * `mass`, and `length`.
 */

import Thing from '../../../lib/stuff/Thing';
import { DetailedMixin } from '../../../lib/description/Detailed';
import { ConstructedMixin } from '../../../lib/material/Constructed';
import { DurableMixin } from '../../../lib/material/Durable';
import { KeenMixin } from '../../../lib/material/Keen';
import { CraftedMixin } from '../../../lib/craft/Crafted';
import { ContaminableMixin } from '../../../lib/material/Contaminable';
import { SlottableMixin } from '../../../lib/slot/Slottable';
import { WieldableMixin } from '../../../lib/slot/Wieldable';
import { MixinApi } from '../../../api/mixin';
import { Quantity } from '../../../lib/quantity';
import { QuantityMarshaller } from '../../idea/persistence/QuantityMarshaller';
import {
  WeaponProfile,
  type WeaponProfileConfig,
  type WeaponProfileInputs,
} from '../../../lib/combat/WeaponProfile';
import type { DeliveryForm } from '../../../lib/material/Construction';
import type { MarkupAugmenter } from '../../../api/mml';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { FieldMeta } from '../../../lib/mixin';

// CraftedMixin (which composes GradedMixin) replaces the bare GradedMixin:
// a weapon can be a recipe output — its persisted `gradeBand` + grade
// surface ride the inner GradedMixin unchanged, and `maker`/`recipe`/
// `craftedAt` default empty on store-bought gear.
// KeenMixin adds the fast-cycling working-surface (edge) axis alongside
// Durable's structural condition — read only on edge/point delivery, so
// it's inert for hafted/blunt forms.
// ⚠ **Contaminable, because the knife a player actually owns is a Weapon.**
// The only blade in the general store is `clasp-knife`, class `Weapon`,
// `constructionForm: bladed` — and it is the thing that opens a carcass and
// then chops the vegetables. `Cutlery` is table serviceware and holds
// nothing, ever; a bespoke butchering class would fail the drive, which
// requires the SAME knife to do both jobs.
//
// ⭐ The two facts stay apart, and that split is the decision: **carrying**
// contamination is a property of a surface that touches food (this mixin,
// composed broadly), while **butchering** is an affordance of an edge (the
// verb, gated on `constructionForm`). Collapse them and you get either a
// sieve that can butcher or a knife that cannot chop.
const WeaponBase = ContaminableMixin(
  WieldableMixin(
    SlottableMixin(
      KeenMixin(
        CraftedMixin(DurableMixin(ConstructedMixin(DetailedMixin(Thing)))),
      ),
    ),
  ),
);

export default class Weapon extends WeaponBase {
  /**
   * Weapon **balance** — an *inert, reserved* authored override of the
   * derived tempo factor. Historically the sole (neutral-1.0) emergent-tempo
   * hook; the weapon-playstyle build made balance **derive** from `mass` ×
   * form ({@link WeaponProfile}), so the live tempo read no longer consults
   * this field — it is kept only so older rows hydrate unchanged (removing a
   * `persistentField` is the breaking move; keeping it is inert). A weapon
   * that truly wants a hand-set number is the reserved consumer.
   */
  public balanceFactor: number = 1;

  // `mass` restated identically so the static type extends `Tangible`'s
  // `{ mass }` (the marshaller map unions across the prototype chain, first
  // declaration wins — an identical restatement is a no-op at runtime).
  static fieldMeta: FieldMeta = {
    balanceFactor: { persistent: true, authorable: true },
    length: { persistent: true, marshaller: QuantityMarshaller.pathFor('m'), authorable: true },
    mass: { marshaller: QuantityMarshaller.pathFor('kg') },
  };

  /**
   * The weapon's **length** in metres — the authored dimension reach derives
   * from (symmetric with `mass` on `Tangible`). A dagger ≈ 0.25, an arming
   * sword ≈ 0.9, a spear ≈ 2.4. Unset (0) → {@link WeaponProfile} defaults
   * it from the delivery form × mass, so a bare form still yields a working
   * profile (the universe-default rule). Round-trips via the m-bound
   * `QuantityMarshaller`; the accessor pair stays strict on `Quantity<'m'>`.
   */
  private _length: Quantity<'m'> = Quantity.of(0, 'm');

  protected get length(): Quantity<'m'> {
    return this._length;
  }

  protected set length(value: Quantity<'m'>) {
    if (!(value instanceof Quantity) || value.unit !== 'm') {
      throw new TypeError(
        `Weapon.length must be a Quantity<'m'>; got ${
          value instanceof Quantity ? `Quantity<'${value.unit}'>` : typeof value
        }`,
      );
    }
    if (value.rawValue() < 0) {
      throw new RangeError(
        `Weapon.length must be non-negative, got ${value.rawValue()}`,
      );
    }
    this._length = value;
  }

  getBalanceFactor(): number {
    return this.balanceFactor;
  }

  /** The weapon's length as a `Quantity<'m'>` (0 when unauthored). */
  getLength(): Quantity<'m'> {
    return this._length;
  }

  /** Set the weapon's length. Strict on `Quantity<'m'>`; callers holding a
   * raw number wrap via `Quantity.of(n, 'm')`. */
  setLength(value: Quantity<'m'>): void {
    this.length = value;
  }

  /**
   * The number of hand slots this weapon claims (handedness): the max claim
   * length across the authored body plans (a two-handed weapon claims both
   * grips). Defaults to 1 when nothing is authored.
   */
  getHandSlotCount(): number {
    let max = 0;
    for (const slots of Object.values(this.getSlotClaims())) {
      if (slots.length > max) max = slots.length;
    }
    return Math.max(1, max);
  }

  /**
   * Extract the raw shape the playstyle derives from. Consumed by
   * {@link getProfile} and by `CombatApi.weaponProfileOf` (the config-
   * injecting live path).
   */
  getProfileInputs(): WeaponProfileInputs {
    const construction = MixinApi.isConstructed(this)
      ? this.getConstruction()
      : null;
    const deliveryForm: DeliveryForm | null =
      construction && construction.isWeapon()
        ? (construction.getForm() as DeliveryForm)
        : null;
    const material = MixinApi.isTangible(this) ? this.getMaterial() : null;
    const hardness = material?.getHardness();
    return {
      deliveryForm,
      massKg: MixinApi.isTangible(this) ? this.getMass().rawValue() : 0,
      lengthM: this._length.rawValue(),
      handSlots: this.getHandSlotCount(),
      materialHardnessMpa: hardness ? hardness.rawValue() : undefined,
    };
  }

  /**
   * The weapon's derived {@link WeaponProfile} at the given config (default
   * config when omitted — a convenience for item description / tests). The
   * live combat path injects `combat.weapon.*` dials via
   * `CombatApi.weaponProfileOf`; the authoritative `analyze weapon` preview
   * uses that config-injected read.
   */
  getProfile(config?: WeaponProfileConfig): WeaponProfile {
    return WeaponProfile.derive(this.getProfileInputs(), config);
  }

  /**
   * The combat-owned **playstyle pips** — a derived reach/balance/guard/
   * handedness line appended to the weapon's long description, for author
   * *and* player (the `Constructed` delivery-pips + `Branded` "a product of
   * X" precedent). Unioned with `ConstructedMixin`'s delivery-response pips
   * (markup augmenters aggregate across the prototype chain), NOT a
   * replacement — this is the playstyle half, that is the materials-response
   * half. Default-config bands; `analyze weapon` is the config-injected
   * authoritative preview.
   */
  static markupAugmenters: MarkupAugmenter[] = [playstylePipsAugmenter];
}

/** A 4-cell filled/empty pip bar over a 0..maxRank scale. */
function pipBar(rank: number, maxRank: number): string {
  const n = Math.max(0, Math.min(4, Math.round((rank / maxRank) * 4)));
  return '●'.repeat(n) + '○'.repeat(4 - n);
}

/**
 * Append the derived playstyle line to a Weapon's long description:
 * `Playstyle — reach medium ●●○○ · guard good ●●●○ · balance heavy · two-handed`.
 * A non-Weapon / formless host passes through unchanged.
 */
function playstylePipsAugmenter(
  text: string,
  host: Stuff,
  _viewer: Stuff,
): string {
  if (!(host instanceof Weapon)) return text;
  const profile = host.getProfile();
  if (profile.isInert()) return text;
  const reach = `reach ${profile.reach()} ${pipBar(profile.reachRank(), 2)}`;
  const guard = `guard ${profile.guard()} ${pipBar(profile.guardRank(), 4)}`;
  const balance = `balance ${profile.balance()}`;
  const hands = profile.handedness();
  const line = `Playstyle — ${reach} · ${guard} · ${balance} · ${hands}`;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}
