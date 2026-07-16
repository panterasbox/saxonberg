/**
 * Construction — a material worked into a *form*, with a per-channel
 * response profile.
 *
 * The three-axis model of a blow is `response = f(mechanism, material,
 * construction)`: the **channel** selects the *point* on the curve, the
 * **material** scales its *height* (steel vs bronze), and the
 * **construction** picks its *shape*. `Construction` owns the shape — and
 * only the shape. It ships the **qualitative** per-channel grid (the
 * taxonomy words: deflect / resist / transmit / …); the numeric
 * coefficients each token resolves to live in operator `AppSettings`, read
 * by `MaterialApi`. No magic balance number ships here.
 *
 * Two v1 vocabularies share one shape (the reusable thing is the
 * *pattern*, not one flat enum spanning mail and swords):
 *
 * - **armor forms** (`plate` / `mail` / `padded` / `hide`) carry a
 *   *resist* profile — a {@link ResistToken} per channel — plus a canonical
 *   outside-in {@link LAYER_DEPTH} so a covering stack orders itself
 *   (padded innermost … plate outermost) without an author writing a number.
 * - **weapon-delivery forms** (`bladed` / `pointed` / `hafted`) carry a
 *   *deliver* profile — a {@link DeliveryToken} per channel — so an
 *   implement *derives* which channel(s) it presents (a dagger delivers
 *   edge, a mace blunt).
 *
 * The `Grade` / `ToolCapability` / `WeatherType` value-object precedent:
 * a closed vocabulary + data tables + a thin immutable surface, persisted
 * by hosts as the form word and reconstructed via {@link Construction.of}.
 */

import { CHANNELS } from './Channel';
import type { Channel } from './Channel';

// ---------- form vocabularies ----------

/** The v1 armor forms (carry a resist profile). */
export const ARMOR_FORMS = ['plate', 'mail', 'padded', 'hide'] as const;
/** An armor form — one of {@link ARMOR_FORMS}. */
export type ArmorForm = (typeof ARMOR_FORMS)[number];

/**
 * The v1 weapon-delivery forms (carry a deliver profile). `flail` shares
 * `hafted`'s blunt delivery but is the **guardless** form — a flail/whip
 * can't be brought back to parry, so its derived `WeaponProfile.guard` is
 * `none` (the distinction is a *playstyle* one, keyed on the form in
 * `WeaponProfile`, not a delivery-shape one — the delivery grid is
 * blunt-primary like a mace).
 */
export const WEAPON_DELIVERY_FORMS = [
  'bladed',
  'pointed',
  'hafted',
  'flail',
] as const;
/** A weapon-delivery form — one of {@link WEAPON_DELIVERY_FORMS}. */
export type DeliveryForm = (typeof WEAPON_DELIVERY_FORMS)[number];

/** The full construction-form vocabulary (both domains). */
export const CONSTRUCTION_FORMS = [
  ...ARMOR_FORMS,
  ...WEAPON_DELIVERY_FORMS,
] as const;
/** A construction form — armor or weapon-delivery. */
export type ConstructionForm = ArmorForm | DeliveryForm;

/** Which vocabulary a form belongs to. */
export type ConstructionDomain = 'armor' | 'weapon-delivery';

// ---------- profile token vocabularies (SHAPE, not magnitude) ----------

/**
 * A qualitative armor-resistance token — the *shape* of the attenuation
 * curve a form presents to a channel, ascending-ish in how much it stops:
 *
 * - `deflect` — turns it almost entirely (edge off plate).
 * - `resist` — strong attenuation (edge off mail).
 * - `absorb` — strong attenuation of a spread load (blunt into padding).
 * - `moderate` — middling (hide, broadly).
 * - `poor` — little attenuation (edge into padding).
 * - `transmit` — passes almost undiminished (blunt through plate → the
 *   shock reaches the bone).
 * - `fail` — the construction is defeated (point through mail's rings).
 *
 * The numeric attenuation each token resolves to is an operator AppSetting
 * (`response.attenuation.<token>`), NOT authored here.
 */
export const RESIST_TOKENS = [
  'deflect',
  'resist',
  'absorb',
  'moderate',
  'poor',
  'transmit',
  'fail',
] as const;
/** An armor-resistance token — one of {@link RESIST_TOKENS}. */
export type ResistToken = (typeof RESIST_TOKENS)[number];

/**
 * A weapon-delivery token — whether a form presents a channel as its
 * `primary` delivery, a `secondary` one, or `none` at all.
 */
export const DELIVERY_TOKENS = ['primary', 'secondary', 'none'] as const;
/** A delivery token — one of {@link DELIVERY_TOKENS}. */
export type DeliveryToken = (typeof DELIVERY_TOKENS)[number];

// ---------- the profile tables (the taxonomy grid, verbatim) ----------

/**
 * Per-armor-form resistance profile — the slate's taxonomy grid. Every
 * `ArmorForm × Channel` cell is a {@link ResistToken}. The single
 * authoritative shape table; magnitudes live in AppSettings.
 */
const ARMOR_PROFILES: Record<ArmorForm, Record<Channel, ResistToken>> = {
  plate: { edge: 'deflect', point: 'resist', blunt: 'transmit' },
  mail: { edge: 'resist', point: 'fail', blunt: 'transmit' },
  padded: { edge: 'poor', point: 'poor', blunt: 'absorb' },
  hide: { edge: 'moderate', point: 'poor', blunt: 'moderate' },
};

/**
 * Per-delivery-form profile — which channel(s) an implement of this form
 * presents. Every `DeliveryForm × Channel` cell is a {@link DeliveryToken}.
 */
const DELIVERY_PROFILES: Record<DeliveryForm, Record<Channel, DeliveryToken>> =
  {
    bladed: { edge: 'primary', point: 'secondary', blunt: 'none' },
    pointed: { point: 'primary', edge: 'secondary', blunt: 'none' },
    hafted: { blunt: 'primary', edge: 'none', point: 'none' },
    flail: { blunt: 'primary', edge: 'none', point: 'none' },
  };

/**
 * Canonical outside-in depth per armor form (padded innermost … plate
 * outermost). The *form* implies its layer depth so a covering stack sorts
 * itself with no authored number (Settled 11 "authors author concepts").
 * An explicit per-item override is a reserved, unused-v1 seam.
 */
const LAYER_DEPTH: Record<ArmorForm, number> = {
  padded: 0,
  hide: 1,
  mail: 2,
  plate: 3,
};

/**
 * Armor-resistance tokens that provide **zero** mitigation — a construction
 * whose every channel resolves to one of these does nothing to anyone (the
 * does-nothing lint's smell). `fail` is the only genuinely-inert token
 * (`transmit` still attenuates a little). Kept beside the profile tables so
 * a new token forces a conscious inert/not decision.
 */
const INERT_RESIST_TOKENS: ReadonlySet<ResistToken> = new Set<ResistToken>([
  'fail',
]);

// ---------- predicates ----------

function isArmorForm(s: string): s is ArmorForm {
  return (ARMOR_FORMS as readonly string[]).includes(s);
}

function isDeliveryForm(s: string): s is DeliveryForm {
  return (WEAPON_DELIVERY_FORMS as readonly string[]).includes(s);
}

/**
 * Construction — an immutable value-object naming one {@link
 * ConstructionForm} and exposing its per-channel profile. Constructed via
 * {@link Construction.of}; hosts persist the form word and reconstruct.
 */
export class Construction {
  /** The armor-form vocabulary — re-exported for callers. */
  public static readonly ARMOR_FORMS: readonly ArmorForm[] = ARMOR_FORMS;
  /** The weapon-delivery-form vocabulary — re-exported for callers. */
  public static readonly DELIVERY_FORMS: readonly DeliveryForm[] =
    WEAPON_DELIVERY_FORMS;
  /** The full form vocabulary — re-exported for callers. */
  public static readonly FORMS: readonly ConstructionForm[] =
    CONSTRUCTION_FORMS;

  private readonly _form: ConstructionForm;

  private constructor(form: ConstructionForm) {
    this._form = form;
  }

  /** Narrowing predicate for a string against the full form vocabulary. */
  public static isForm(s: string): s is ConstructionForm {
    return isArmorForm(s) || isDeliveryForm(s);
  }

  /** Is `s` an armor form? */
  public static isArmorForm(s: string): s is ArmorForm {
    return isArmorForm(s);
  }

  /** Is `s` a weapon-delivery form? */
  public static isDeliveryForm(s: string): s is DeliveryForm {
    return isDeliveryForm(s);
  }

  /** Construct from a form word. Throws on an unknown form. */
  public static of(form: string): Construction {
    if (!Construction.isForm(form)) {
      throw new RangeError(
        `Construction.of: unknown form '${form}' (expected one of ${CONSTRUCTION_FORMS.join(', ')})`,
      );
    }
    return new Construction(form);
  }

  /** The form word (e.g. `'plate'`). */
  public getForm(): ConstructionForm {
    return this._form;
  }

  /** Which vocabulary this form belongs to. */
  public getDomain(): ConstructionDomain {
    return isArmorForm(this._form) ? 'armor' : 'weapon-delivery';
  }

  /** Is this an armor form? */
  public isArmor(): boolean {
    return isArmorForm(this._form);
  }

  /** Is this a weapon-delivery form? */
  public isWeapon(): boolean {
    return isDeliveryForm(this._form);
  }

  /**
   * The resistance token this armor form presents to `channel` (the shape
   * of the attenuation curve). Throws when called on a weapon-delivery
   * form (domain guard — a sword doesn't resist).
   */
  public responseFor(channel: Channel): ResistToken {
    if (!isArmorForm(this._form)) {
      throw new RangeError(
        `Construction.responseFor: '${this._form}' is a weapon-delivery form, not armor`,
      );
    }
    return ARMOR_PROFILES[this._form][channel];
  }

  /**
   * The delivery token this weapon form presents on `channel`. Throws when
   * called on an armor form (domain guard — plate doesn't deliver).
   */
  public deliveryFor(channel: Channel): DeliveryToken {
    if (!isDeliveryForm(this._form)) {
      throw new RangeError(
        `Construction.deliveryFor: '${this._form}' is an armor form, not a weapon`,
      );
    }
    return DELIVERY_PROFILES[this._form][channel];
  }

  /**
   * The channels this weapon form actually delivers (token !== `none`),
   * primary channel(s) first. Empty for an armor form.
   */
  public deliveredChannels(): Channel[] {
    if (!isDeliveryForm(this._form)) return [];
    const primaries = CHANNELS.filter(
      (c) => DELIVERY_PROFILES[this._form as DeliveryForm][c] === 'primary',
    );
    const secondaries = CHANNELS.filter(
      (c) => DELIVERY_PROFILES[this._form as DeliveryForm][c] === 'secondary',
    );
    return [...primaries, ...secondaries];
  }

  /** The single primary channel this weapon delivers, or null. */
  public primaryChannel(): Channel | null {
    if (!isDeliveryForm(this._form)) return null;
    return (
      CHANNELS.find(
        (c) => DELIVERY_PROFILES[this._form as DeliveryForm][c] === 'primary',
      ) ?? null
    );
  }

  /** Does this weapon form deliver a primary channel? */
  public deliversPrimary(): boolean {
    return this.primaryChannel() !== null;
  }

  /** Does this weapon form deliver any channel at all? */
  public deliversAny(): boolean {
    return this.deliveredChannels().length > 0;
  }

  /**
   * The canonical outside-in layer depth for an armor form (padded 0 …
   * plate 3). Throws on a weapon-delivery form (a weapon has no depth in a
   * covering stack).
   */
  public getLayerDepth(): number {
    if (!isArmorForm(this._form)) {
      throw new RangeError(
        `Construction.getLayerDepth: '${this._form}' is not an armor form`,
      );
    }
    return LAYER_DEPTH[this._form];
  }

  /** Form-word equality. */
  public equals(other: Construction): boolean {
    return this._form === other._form;
  }

  /**
   * True iff this construction has **no effect on any channel** — an armor
   * form that mitigates nothing everywhere, or a weapon form that delivers
   * nothing everywhere. The authoring smell the does-nothing lint flags. A
   * healthy roster returns `false` for every form.
   */
  public doesNothing(): boolean {
    if (isArmorForm(this._form)) {
      const tokens = CHANNELS.map((c) => ARMOR_PROFILES[this._form as ArmorForm][c]);
      return !Construction.resistProfileHasEffect(tokens);
    }
    const tokens = CHANNELS.map(
      (c) => DELIVERY_PROFILES[this._form as DeliveryForm][c],
    );
    return !Construction.deliveryProfileHasEffect(tokens);
  }

  /** Does an armor resist profile mitigate on at least one channel? (pure —
   * fixture-testable by the does-nothing lint). */
  public static resistProfileHasEffect(
    tokens: readonly ResistToken[],
  ): boolean {
    return tokens.some((t) => !INERT_RESIST_TOKENS.has(t));
  }

  /** Does a weapon delivery profile deliver on at least one channel? (pure). */
  public static deliveryProfileHasEffect(
    tokens: readonly DeliveryToken[],
  ): boolean {
    return tokens.some((t) => t !== 'none');
  }
}
