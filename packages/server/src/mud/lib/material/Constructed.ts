/**
 * ConstructedMixin — the *form* axis of a made thing.
 *
 * The sibling of {@link TangibleMixin}'s material axis: a `Tangible` says
 * "made of steel"; a `Constructed` says "worked into plate". Composing this
 * mixin declares that a Stuff carries a {@link Construction} — a material
 * worked into a form with a per-channel response profile. Armor composes it
 * (its resist profile) and so do weapons (their delivery profile); later,
 * structures will (their crush profile).
 *
 * **Carrier shape (mirrors Tangible).** The durable field is the form
 * *word* (`constructionForm: string`, stable + human-readable in seeds),
 * validated against the `Construction` vocabulary on set. The inter-Stuff
 * contract is the value-object surface `getConstruction(): Construction |
 * null` / `setConstruction(Construction)` — other Stuff read the form as a
 * `Construction`, never the raw string. Immutable value reconstructed on
 * each read (HMR-safe, no cached instance).
 */

import type { MixinConstructor } from '../mixin';
import { Construction } from './Construction';
import { MECHANICAL_CHANNELS } from './Channel';
import type { MechanicalChannel } from './Channel';
import { MixinApi } from '../../api/mixin';
import { MaterialApi, OUTCOME_BANDS } from '../../api/material';
import type { MarkupAugmenter } from '../../api/mml';
import type { Stuff } from '../stuff/Stuff';

export interface Constructed {
  /** The persisted form word (e.g. `'plate'`). Host/persist surface. */
  getConstructionForm(): string;
  setConstructionForm(value: string): void;
  /** The construction as a value-object, or `null` when unset. The
   * inter-Stuff contract. */
  getConstruction(): Construction | null;
  setConstruction(value: Construction): void;
}

export function ConstructedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class ConstructedMixin extends Base implements Constructed {
    static _mixinName = 'ConstructedMixin';
    static persistentFields = ['constructionForm'];

    /**
     * The construction form word; empty = unset (no construction). Authored
     * on armor/weapon seeds (`constructionForm: plate`).
     *
     * @authorable
     */
    public constructionForm: string = '';

    getConstructionForm(): string {
      return this.constructionForm;
    }

    setConstructionForm(value: string): void {
      if (value !== '' && !Construction.isForm(value)) {
        throw new RangeError(
          `ConstructedMixin.setConstructionForm: unknown form '${value}'`,
        );
      }
      this.constructionForm = value;
    }

    getConstruction(): Construction | null {
      return this.constructionForm
        ? Construction.of(this.constructionForm)
        : null;
    }

    setConstruction(value: Construction): void {
      this.constructionForm = value.getForm();
    }

    /**
     * The per-item legibility pips — a derived per-channel profile line
     * appended to the host's long description, for author *and* player (the
     * `BrandedMixin` "a product of X" precedent). Pure server projection
     * over `MaterialApi.previewBand` — the same chokepoint `inflict` reads.
     */
    static markupAugmenters: MarkupAugmenter[] = [responsePipsAugmenter];
  };
}

/** A 4-cell filled/empty pip bar. */
function pipBar(intensity: number): string {
  const n = Math.max(0, Math.min(4, Math.round(intensity)));
  return '●'.repeat(n) + '○'.repeat(4 - n);
}

/**
 * Append the derived per-channel response profile to a Constructed host's
 * long description. Armor renders **protection** pips (how well it turns
 * each channel — turned ●●●● … bites-deep ●○○○); a weapon renders
 * **delivery** pips (the threat it presents on each channel — none ○○○○ …
 * bites-deep ●●●●). Non-Constructed / formless hosts pass through unchanged.
 */
function responsePipsAugmenter(
  text: string,
  host: Stuff,
  _viewer: Stuff,
): string {
  if (!MixinApi.isConstructed(host)) return text;
  const construction = host.getConstruction();
  if (!construction) return text;
  const material = MaterialApi.materialOf(host);
  // isGraded / isDurable are type predicates — they narrow `host` directly.
  const grade = MixinApi.isGraded(host) ? host.getGrade() : undefined;
  const condition = MixinApi.isDurable(host)
    ? host.getCondition()
    : undefined;

  const armor = construction.isArmor();
  const cells = MECHANICAL_CHANNELS.map((channel: MechanicalChannel) => {
    const band = MaterialApi.previewBand(
      channel,
      material,
      construction,
      grade,
      condition,
    );
    const bandIndex = OUTCOME_BANDS.indexOf(band); // 0 turned … 3 bites-deep
    let intensity: number;
    if (armor) {
      intensity = 4 - bandIndex; // turned → best protection
    } else {
      intensity =
        construction.deliveryFor(channel) === 'none' ? 0 : bandIndex + 1;
    }
    return `${channel} ${pipBar(intensity)}`;
  });
  // The shock column — the armor inversion, made legible. Protection against
  // a shock is INVERSE to conductivity: an insulating layer (rubber/leather)
  // protects (full pips); a conductor (metal plate/mail) betrays you (empty
  // pips — "conducts, barely protects"). Only meaningful for armor.
  if (armor && material) {
    cells.push(`shock ${pipBar(shockProtectionPips(material))}`);
  }
  const label = armor ? 'Protection' : 'Delivery';
  const line = `${label} — ${cells.join(' · ')}`;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

/**
 * Shock-protection pips from a material's electrical conductivity (the
 * inverse of the mechanical channels): a good insulator turns a shock (4
 * pips), a good conductor conducts it into you (0 pips). Log-scaled across
 * the ~20-order-of-magnitude conductivity span. Reads the same
 * `electricalConductivity` axis the shock model resolves against — the
 * inversion is emergent, never an `isElectrical` flag.
 */
function shockProtectionPips(material: {
  getElectricalConductivity(): { rawValue(): number };
}): number {
  const sigma = material.getElectricalConductivity().rawValue();
  if (!(sigma > 0)) return 4; // a perfect insulator (unauthored / vacuum)
  // Map log10(σ): insulators (σ ≤ 1e-6, log ≤ -6) → 4 pips; conductors
  // (σ ≥ 1, log ≥ 0) → 0 pips; linear between.
  const l = Math.log10(sigma);
  const t = (l - -6) / (0 - -6); // 0 at log-6 (insulator) … 1 at log0 (conductor)
  return Math.max(0, Math.min(4, Math.round(4 * (1 - t))));
}
