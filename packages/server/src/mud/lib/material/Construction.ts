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
 * - **covering forms** (`plate` / `mail` / `padded` / `quilted` / `hide`,
 *   plus the registered fabrics below) carry a *resist* profile — a
 *   {@link ResistToken} per channel — plus a canonical outside-in
 *   {@link LAYER_DEPTH} so a covering stack orders itself (padded
 *   innermost … plate outermost) without an author writing a number.
 * - **weapon-delivery forms** (`bladed` / `pointed` / `hafted`) carry a
 *   *deliver* profile — a {@link DeliveryToken} per channel — so an
 *   implement *derives* which channel(s) it presents (a dagger delivers
 *   edge, a mace blunt).
 *
 * ## ⭐ The covering domain has TWO sources, and the split is deliberate
 *
 * A padded gambeson *is* quilted cloth, so a shirt is not armor but it
 * **is** a covering — and `responseFor()`'s domain guard should say so.
 * That is the rename: `armor` → `covering`.
 *
 * But the two halves of the covering vocabulary answer to different
 * people:
 *
 * | | where | may a pack add one? |
 * |---|---|---|
 * | **resist-bearing** (`plate` `mail` `padded` `quilted` `hide`) | this closed `as const` | **no** — a form's resist profile is combat mitigation |
 * | **non-resisting textile** (`woven` `knit` `felted`, and lace or netting later) | template rows at `/stuff/idea/fabric/`, registered here | **yes** — a pack must never need a kernel list edit |
 *
 * ⭐ **Content never authors a resist profile.** One kernel constant
 * answers for every textile form at once —
 * {@link TEXTILE_RESIST_PROFILE}, `poor` on all three mechanical
 * channels. *That is the split made literal:* content chooses drape,
 * loft and weave; **the kernel decides that cloth resists poorly.** It
 * is "a linen shirt is armor that does not work" as one line of kernel
 * data, and a pack adding `lace` changes nothing about combat.
 *
 * ⚠ **This module must stay import-pure** — it imports `./Channel` and
 * nothing else, because two build-time lint scripts
 * (`check-does-nothing`, `check-inert-weapon`) instantiate it OUTSIDE
 * the runtime and cannot read a template-backed registry. The bridge is
 * therefore a plain module-private `Map` filled by
 * {@link Construction.registerFabric}, and the lints assert over the
 * shared kernel constant rather than walking rows.
 *
 * The `Grade` / `ToolCapability` / `WeatherType` value-object precedent:
 * a closed vocabulary + data tables + a thin immutable surface, persisted
 * by hosts as the form word and reconstructed via {@link Construction.of}.
 */

import { MECHANICAL_CHANNELS, Channels } from './Channel';
import type { Channel, MechanicalChannel } from './Channel';

// ---------- form vocabularies ----------

/**
 * The **resist-bearing** covering forms — closed, kernel-only. A pack
 * may not add one: a form's resist profile is combat mitigation, and
 * letting content author that is a real objection.
 *
 * `quilted` is a gambeson — layered and stitched cloth, one band outside
 * `padded` and genuinely better against a blunt blow than loose padding.
 */
export const COVERING_FORMS = [
  'plate',
  'mail',
  'padded',
  'quilted',
  'hide',
] as const;
/** A resist-bearing covering form — one of {@link COVERING_FORMS}. */
export type KernelCoveringForm = (typeof COVERING_FORMS)[number];

/**
 * The v1 weapon-delivery forms (carry a deliver profile). Two of them are
 * **guardless** (a flexible weapon can't be brought back to parry, so its
 * derived `WeaponProfile.guard` is `none` — a *playstyle* distinction keyed
 * on the form in `WeaponProfile`, not a delivery-shape one):
 * - `flail` shares `hafted`'s blunt delivery (a chained head).
 * - `whip` delivers a cutting lash (edge-primary, a blunt welt secondary) and
 *   is the long-reach extreme — it controls at range and is helpless inside.
 * - `blunted` is a *sword-shaped implement presenting no edge* — the waster /
 *   practice-sword form. It delivers blunt like `hafted` but keeps a blade's
 *   self-guard (`WeaponProfile` keys `good` on it), so a trainer with a real
 *   sword's mass and length derives a real sword's playstyle while its blows
 *   resolve as contusions through the tissue fold. Harmlessness lives HERE,
 *   in the delivery shape — the live fold never reads a weapon's material.
 */
export const WEAPON_DELIVERY_FORMS = [
  'bladed',
  'pointed',
  'hafted',
  'flail',
  'whip',
  'blunted',
] as const;
/** A weapon-delivery form — one of {@link WEAPON_DELIVERY_FORMS}. */
export type DeliveryForm = (typeof WEAPON_DELIVERY_FORMS)[number];

/** The full KERNEL construction-form vocabulary (both domains). */
export const CONSTRUCTION_FORMS = [
  ...COVERING_FORMS,
  ...WEAPON_DELIVERY_FORMS,
] as const;

/**
 * A covering form — a kernel resist-bearing one, or a registered fabric
 * key. The type genuinely spans both domains (cloth and plate are both
 * coverings), which is why the kernel *type* keeps the general name
 * while the registration method is {@link Construction.registerFabric}.
 */
export type CoveringForm = string;

/**
 * A construction form. Open on the covering side (a pack registers a
 * fabric), closed on the weapon side.
 */
export type ConstructionForm = string;

/** Which vocabulary a form belongs to. */
export type ConstructionDomain = 'covering' | 'weapon-delivery';

/**
 * One registered non-resisting textile form, hydrated from a
 * `/stuff/idea/fabric/<key>` row by {@link Fabric}.
 *
 * ⚠ `layerBand` is **required and range-validated on set** — that is
 * exactly what keeps {@link Construction.getLayerDepth} total, and
 * `getLayerDepth()` is called unconditionally in three hot paths (the
 * heat fold, the struck-site armor stack, the trauma covering walk). An
 * out-of-range row throws at hydration, loudly, rather than at the
 * moment somebody swings.
 */
export interface FabricSpec {
  /** The form word an author writes (`woven`, `knit`, `felted`). */
  key: string;
  /** Outside-in depth band, `0..4`, sharing the kernel ladder. */
  layerBand: number;
  /** Trapped-air fraction `0..1` — the thermal parameter. */
  loft: number;
  /** Thread closeness `0..1` — windproofing, and cover for concealment. */
  weaveDensity: number;
  /** How it hangs, `0..1`. Reserved: authored, not yet consumed. */
  drape: number;
}

/**
 * ⭐ **The one resist profile every textile form shares.** Content
 * chooses drape, loft and weave; the kernel decides that cloth resists
 * poorly — so `responseFor()` on a fabric neither throws nor consults a
 * row, and adding `lace` changes nothing about combat.
 *
 * `poor` is deliberately NOT in {@link INERT_RESIST_TOKENS}: a shirt
 * attenuates a little, which is the honest answer and keeps
 * `doesNothing()` false for every fabric.
 */
export const TEXTILE_RESIST_PROFILE: Readonly<
  Record<MechanicalChannel, ResistToken>
> = { edge: 'poor', point: 'poor', blunt: 'poor' };

/**
 * The registered fabric forms. Module-private and plain — the bridge
 * that lets a template-backed roster extend the vocabulary without
 * `Construction.ts` importing anything.
 */
const FABRICS = new Map<string, FabricSpec>();

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
 * Per-kernel-covering-form resistance profile — the slate's taxonomy
 * grid. Every `KernelCoveringForm × Channel` cell is a
 * {@link ResistToken}. The single authoritative shape table; magnitudes
 * live in AppSettings. Fabrics share {@link TEXTILE_RESIST_PROFILE}
 * instead and appear nowhere in this table.
 */
const COVERING_PROFILES: Record<
  KernelCoveringForm,
  Record<MechanicalChannel, ResistToken>
> = {
  plate: { edge: 'deflect', point: 'resist', blunt: 'transmit' },
  mail: { edge: 'resist', point: 'fail', blunt: 'transmit' },
  padded: { edge: 'poor', point: 'poor', blunt: 'absorb' },
  // A gambeson: layered and stitched, so it soaks a blunt blow the way
  // padding does and is one band further out.
  quilted: { edge: 'poor', point: 'poor', blunt: 'absorb' },
  hide: { edge: 'moderate', point: 'poor', blunt: 'moderate' },
};

/**
 * Per-delivery-form profile — which channel(s) an implement of this form
 * presents. Every `DeliveryForm × MechanicalChannel` cell is a
 * {@link DeliveryToken}. (Shock delivery is a source capability, not a
 * construction shape — it lives on `EnergizedMixin`, not here.)
 */
const DELIVERY_PROFILES: Record<
  DeliveryForm,
  Record<MechanicalChannel, DeliveryToken>
> = {
    bladed: { edge: 'primary', point: 'secondary', blunt: 'none' },
    pointed: { point: 'primary', edge: 'secondary', blunt: 'none' },
    hafted: { blunt: 'primary', edge: 'none', point: 'none' },
    flail: { blunt: 'primary', edge: 'none', point: 'none' },
    whip: { edge: 'primary', blunt: 'secondary', point: 'none' },
    blunted: { blunt: 'primary', edge: 'none', point: 'none' },
  };

/**
 * Canonical outside-in depth per kernel covering form (padded innermost
 * … plate outermost). The *form* implies its layer depth so a covering
 * stack sorts itself with no authored number (Settled 11 "authors author
 * concepts"). An explicit per-item override is a reserved, unused-v1
 * seam.
 *
 * ⚠ The ladder widened from `0..3` to `0..4` when `quilted` arrived, and
 * a registered fabric's `layerBand` shares the SAME `0..4` scale — one
 * ladder over two sources, which is what keeps
 * {@link Construction.getLayerDepth} total.
 */
const LAYER_DEPTH: Record<KernelCoveringForm, number> = {
  padded: 0,
  quilted: 1,
  hide: 2,
  mail: 3,
  plate: 4,
};

/**
 * Covering-resistance tokens that provide **zero** mitigation — a construction
 * whose every channel resolves to one of these does nothing to anyone (the
 * does-nothing lint's smell). `fail` is the only genuinely-inert token
 * (`transmit` still attenuates a little). Kept beside the profile tables so
 * a new token forces a conscious inert/not decision.
 */
const INERT_RESIST_TOKENS: ReadonlySet<ResistToken> = new Set<ResistToken>([
  'fail',
]);

// ---------- predicates ----------

function isKernelCoveringForm(s: string): s is KernelCoveringForm {
  return (COVERING_FORMS as readonly string[]).includes(s);
}

/** Is `s` a REGISTERED textile form? */
function isFabricForm(s: string): boolean {
  return FABRICS.has(s);
}

/** Is `s` any covering form — kernel resist-bearing OR registered fabric? */
function isCoveringForm(s: string): boolean {
  return isKernelCoveringForm(s) || isFabricForm(s);
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
  /** The kernel covering-form vocabulary — re-exported for callers. */
  public static readonly COVERING_FORMS: readonly KernelCoveringForm[] =
    COVERING_FORMS;
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

  /**
   * Narrowing predicate against the full form vocabulary — **both
   * covering sources plus the weapon forms.** A fabric registered by a
   * pack answers `true` here with no kernel edit, which is the whole
   * point of the second source.
   */
  public static isForm(s: string): s is ConstructionForm {
    return isCoveringForm(s) || isDeliveryForm(s);
  }

  /** Is `s` a covering form (kernel resist-bearing OR registered fabric)? */
  public static isCoveringForm(s: string): boolean {
    return isCoveringForm(s);
  }

  /** Is `s` a registered textile form? */
  public static isFabricForm(s: string): boolean {
    return isFabricForm(s);
  }

  /**
   * Register one textile form. Called by `Fabric.postRegister` as each
   * `/stuff/idea/fabric/<key>` row stands up (the roster's warm is
   * `FabricCatalogue`'s job).
   *
   * ⚠ Validated HERE rather than trusted, because `layerBand` is what
   * keeps {@link getLayerDepth} total across both sources — and that
   * method is called unconditionally in three hot paths, so a bad band
   * must fail at hydration, not at the moment somebody swings.
   * Re-registering the same key overwrites (a pack go-live re-warms).
   */
  public static registerFabric(spec: FabricSpec): void {
    if (!spec.key || !/^[a-z][a-z0-9-]*$/.test(spec.key)) {
      throw new RangeError(
        `Construction.registerFabric: '${spec.key}' is not a kebab form word`,
      );
    }
    if (isKernelCoveringForm(spec.key) || isDeliveryForm(spec.key)) {
      throw new RangeError(
        `Construction.registerFabric: '${spec.key}' is already a kernel form`,
      );
    }
    for (const [field, value] of [
      ['layerBand', spec.layerBand],
      ['loft', spec.loft],
      ['weaveDensity', spec.weaveDensity],
      ['drape', spec.drape],
    ] as const) {
      if (!Number.isFinite(value)) {
        throw new RangeError(
          `Construction.registerFabric('${spec.key}'): ${field} must be a number`,
        );
      }
    }
    const maxBand = Object.keys(LAYER_DEPTH).length - 1;
    if (
      !Number.isInteger(spec.layerBand) ||
      spec.layerBand < 0 ||
      spec.layerBand > maxBand
    ) {
      throw new RangeError(
        `Construction.registerFabric('${spec.key}'): layerBand ` +
          `${spec.layerBand} is outside the 0..${maxBand} ladder`,
      );
    }
    for (const [field, value] of [
      ['loft', spec.loft],
      ['weaveDensity', spec.weaveDensity],
      ['drape', spec.drape],
    ] as const) {
      if (value < 0 || value > 1) {
        throw new RangeError(
          `Construction.registerFabric('${spec.key}'): ${field} ${value} ` +
            `is outside 0..1`,
        );
      }
    }
    FABRICS.set(spec.key, { ...spec });
  }

  /** The registered spec for a fabric form, or `null`. */
  public static fabric(key: string): FabricSpec | null {
    return FABRICS.get(key) ?? null;
  }

  /** Every registered fabric key (HMR / test introspection). */
  public static fabricKeys(): readonly string[] {
    return [...FABRICS.keys()];
  }

  /** Drop the whole textile registry — the HMR / go-live re-warm seam. */
  public static clearFabrics(): void {
    FABRICS.clear();
  }

  /** Is `s` a weapon-delivery form? */
  public static isDeliveryForm(s: string): s is DeliveryForm {
    return isDeliveryForm(s);
  }

  /** Construct from a form word. Throws on an unknown form. */
  public static of(form: string): Construction {
    if (!Construction.isForm(form)) {
      throw new RangeError(
        `Construction.of: unknown form '${form}' (expected one of ` +
          `${CONSTRUCTION_FORMS.join(', ')}` +
          (FABRICS.size > 0 ? `, ${[...FABRICS.keys()].join(', ')}` : '') +
          `)`,
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
    return isCoveringForm(this._form) ? 'covering' : 'weapon-delivery';
  }

  /**
   * Is this a covering? True for plate and for linen alike — a shirt is
   * not armor, but it *is* a covering, and it resists poorly rather than
   * not at all.
   */
  public isCovering(): boolean {
    return isCoveringForm(this._form);
  }

  /** The registered textile spec for this form, or `null` if it is not one. */
  public getFabric(): FabricSpec | null {
    return FABRICS.get(this._form) ?? null;
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
    if (!isCoveringForm(this._form)) {
      throw new RangeError(
        `Construction.responseFor: '${this._form}' is a weapon-delivery form, not a covering`,
      );
    }
    if (!Channels.isMechanicalChannel(channel)) {
      throw new RangeError(
        `Construction.responseFor: '${channel}' is not a mechanical channel (shock resolves by circuit, not the covering fold)`,
      );
    }
    // ⭐ A fabric does not throw and is not authored: one kernel
    // constant answers for every textile form at once.
    if (!isKernelCoveringForm(this._form)) return TEXTILE_RESIST_PROFILE[channel];
    return COVERING_PROFILES[this._form][channel];
  }

  /**
   * The delivery token this weapon form presents on `channel`. Throws when
   * called on an armor form (domain guard — plate doesn't deliver).
   */
  public deliveryFor(channel: Channel): DeliveryToken {
    if (!isDeliveryForm(this._form)) {
      throw new RangeError(
        `Construction.deliveryFor: '${this._form}' is a covering form, not a weapon`,
      );
    }
    if (!Channels.isMechanicalChannel(channel)) return 'none';
    return DELIVERY_PROFILES[this._form][channel];
  }

  /**
   * The channels this weapon form actually delivers (token !== `none`),
   * primary channel(s) first. Empty for a covering form. Only the mechanical
   * channels — shock delivery is a source capability, not a weapon form.
   */
  public deliveredChannels(): MechanicalChannel[] {
    if (!isDeliveryForm(this._form)) return [];
    const primaries = MECHANICAL_CHANNELS.filter(
      (c) => DELIVERY_PROFILES[this._form as DeliveryForm][c] === 'primary',
    );
    const secondaries = MECHANICAL_CHANNELS.filter(
      (c) => DELIVERY_PROFILES[this._form as DeliveryForm][c] === 'secondary',
    );
    return [...primaries, ...secondaries];
  }

  /** The single primary channel this weapon delivers, or null. */
  public primaryChannel(): MechanicalChannel | null {
    if (!isDeliveryForm(this._form)) return null;
    return (
      MECHANICAL_CHANNELS.find(
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
    if (!isCoveringForm(this._form)) {
      throw new RangeError(
        `Construction.getLayerDepth: '${this._form}' is not a covering form`,
      );
    }
    // ⚠ TOTAL across BOTH sources. Three hot paths call this
    // unconditionally (the heat fold, the struck-site armor stack, the
    // trauma covering walk), so a fabric must answer here rather than
    // throw — which is why `layerBand` is required and range-validated
    // at registration.
    if (!isKernelCoveringForm(this._form)) {
      return FABRICS.get(this._form)!.layerBand;
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
    if (isCoveringForm(this._form)) {
      const profile = isKernelCoveringForm(this._form)
        ? COVERING_PROFILES[this._form]
        : TEXTILE_RESIST_PROFILE;
      const tokens = MECHANICAL_CHANNELS.map((c) => profile[c]);
      return !Construction.resistProfileHasEffect(tokens);
    }
    const tokens = MECHANICAL_CHANNELS.map(
      (c) => DELIVERY_PROFILES[this._form as DeliveryForm][c],
    );
    return !Construction.deliveryProfileHasEffect(tokens);
  }

  /** Does a covering resist profile mitigate on at least one channel? (pure —
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
