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
import { CHANNELS } from './Channel';
import type { Channel } from './Channel';
import { MixinApi } from '../../api/mixin';
import { MaterialApi, OUTCOME_BANDS } from '../../api/material';
import type { MarkupAugmenter } from '../../api/mml';
import type { Stuff } from '../stuff/Stuff';
import type { Graded } from '../craft/Graded';
import type { Durable } from './Durable';

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

    /** The construction form word; empty = unset (no construction). */
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
  const grade = MixinApi.isGraded(host)
    ? (host as unknown as Graded).getGrade()
    : undefined;
  const condition = MixinApi.isDurable(host)
    ? (host as unknown as Durable).getCondition()
    : undefined;

  const armor = construction.isArmor();
  const cells = CHANNELS.map((channel: Channel) => {
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
  const label = armor ? 'Protection' : 'Delivery';
  const line = `${label} — ${cells.join(' · ')}`;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}
