/**
 * Suppression — the anti-magic-field value + match logic.
 *
 * A `suppresses-magic` field on a Location/Zone makes magic governable
 * as a class: a cast-time validator vetoes casting inside it, and
 * ongoing **modifier** conditions go dormant on their next
 * reconcile-on-read. **The suppressible line IS the impulse/modifier
 * line** — suppression drops what magic is still holding up (a held
 * light, a maintained veil) and can never un-happen a fired impulse
 * (a lit brazier keeps burning; that's the honest meaning of "no magic
 * here").
 *
 * Because the provenance tag is the full grid address, the field is
 * grid-filterable at no extra cost: `{ all: true }` = no magic at all;
 * `{ nouns: ['fire'] }` = no ·fire magic; `{ verbs: ['create'] }` = no
 * create· magic. Absent field = no filter on that axis.
 *
 * Pure value + match logic (the `Channel` precedent). The *walk* that
 * resolves the field at a place (sync containment outward / async zone
 * chain) lives on `MagicLogic`.
 */

import type { MagicNoun, MagicVerb } from './Grid';
import { MagicGrid } from './Grid';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';

/** Containment-walk depth cap (the BiomeLogic guard). */
const WALK_DEPTH_CAP = 32;

/** The field-carrier surface (structural — importing `Location` here
 * would cycle Location → Suppression → Location, so the walk narrows on
 * the method the carrier declares; `Location` is the one declarer). */
interface SuppressionCarrier {
  getSuppressesMagic(): MagicSuppression | null;
}

/** The authored field value. */
export type MagicSuppression =
  | { readonly all: true }
  | { readonly verbs?: readonly MagicVerb[]; readonly nouns?: readonly MagicNoun[] };

/** Thin static holder — match + seed validation + the sync walk. */
export class Suppressions {
  /**
   * The **sync room-tier resolve**: walk outward from `place` through
   * containment (the biome-chain shape, depth-capped) and return the
   * first carried field, or `null`. SYNC by design — the sustained-
   * effect dormancy check runs inside the (sync) conditions reconcile.
   * The async zone tier folds in one layer up (`MagicApi.
   * suppressionAtDeep`) for cast-time reads.
   */
  public static fieldAt(place: Stuff | null | undefined): MagicSuppression | null {
    let cursor: Stuff | null = place ?? null;
    let depth = WALK_DEPTH_CAP;
    while (cursor !== null && depth-- > 0) {
      const carrier = cursor as Partial<SuppressionCarrier>;
      if (typeof carrier.getSuppressesMagic === 'function') {
        const field = carrier.getSuppressesMagic();
        if (field) return field;
      }
      cursor = MixinApi.isContainable(cursor)
        ? (cursor.getContainer() ?? null)
        : null;
    }
    return null;
  }
  /** Does this field suppress a cast at the given grid address? */
  public static suppresses(
    field: MagicSuppression | null | undefined,
    verb: MagicVerb,
    noun: MagicNoun,
  ): boolean {
    if (!field) return false;
    if ('all' in field && field.all) return true;
    const f = field as { verbs?: readonly MagicVerb[]; nouns?: readonly MagicNoun[] };
    if (f.verbs?.includes(verb)) return true;
    if (f.nouns?.includes(noun)) return true;
    return false;
  }

  /** Parse an authored field blob; `null` when absent. Throws on malformed data. */
  public static validate(raw: unknown): MagicSuppression | null {
    if (raw == null) return null;
    const f = raw as Record<string, unknown>;
    if (f.all === true) return { all: true };
    const verbs = Suppressions.validateAxis(f.verbs, MagicGrid.isVerb, 'verbs');
    const nouns = Suppressions.validateAxis(f.nouns, MagicGrid.isNoun, 'nouns');
    if (!verbs && !nouns) {
      throw new TypeError(
        "suppressesMagic: needs `all: true` or a verbs/nouns filter",
      );
    }
    return { verbs, nouns };
  }

  private static validateAxis<T extends string>(
    v: unknown,
    isMember: (x: unknown) => x is T,
    label: string,
  ): readonly T[] | undefined {
    if (v === undefined || v === null) return undefined;
    if (!Array.isArray(v) || v.length === 0 || !v.every(isMember)) {
      throw new TypeError(`suppressesMagic: bad ${label} filter`);
    }
    return v as readonly T[];
  }
}
