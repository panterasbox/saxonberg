/**
 * BrandedMixin — the per-product corpo **mark**.
 *
 * A branded Stuff (a bottle, later a venue or an adornment) carries the
 * durable `key` of one {@link Brand}; the brand resolves (through
 * {@link CorpoApi}) to its owning {@link Corpo}, or to **none** for an
 * independent brand. The mark is the real, queryable thing every product a
 * corpo touches carries — so "every bottle is truthfully owned."
 *
 * **Cross-reference shape (the `Material` / `Radioactive` precedent).**
 * `_brandKey` stores the brand **key**, not a path — a `Brand` is a
 * pure-data leaf with no live Stuff to point a path at, and the key is the
 * durable join. `getBrand()` / `getCorpo()` resolve on **each call** via
 * `CorpoApi` (HMR-safe — no cached instance). An empty `_brandKey` is
 * unbranded; a brand whose `owner` is empty resolves to a `null` corpo (the
 * independent — the absence is itself legible).
 *
 * **Two surfaces beyond the accessors:**
 * - `subscribableFields` projects the mark (`brand` / `corpo` keys) into the
 *   live-query substrate, so the mark is MQL-visible — the method-derived
 *   projection seam `Tangible` uses for `bulkMaterial`, not a redundant
 *   `PropertiedMixin` prop.
 * - `markupAugmenters` appends a *derived* "a product of Veshko" line to the
 *   host's long description at render time (truthful even if the brand is
 *   re-pathed) — the same slot `Visible` / `Detailed` contribute through.
 *
 * The mark is **diegetic brand-ownership**, orthogonal to the
 * `AuthoringEvent` provenance ledger (real-world template authorship).
 */

import type { MixinConstructor, FieldMeta } from "../mixin";
import { Mixins } from "../mixin";
import { MixinApi } from "../../api/mixin";
import { CorpoApi } from "../../api/corpo";
import type { Stuff } from "../stuff/Stuff";
import type { SubscribableFieldDescriptor } from "../../api/mql-subscription";
import type { MarkupAugmenter } from "../../api/mml";
import type { BrandDescriptor } from "../../platform/idea/corpo/Brand";
import type { CorpoDescriptor } from "../../platform/idea/corpo/Corpo";

export interface Branded {
  /** The durable brand `key` this product is marked with (`''` if unbranded). */
  getBrandKey(): string;
  setBrandKey(value: string): void;
  /** The marked brand's descriptor, or `null` when unbranded. */
  getBrand(): BrandDescriptor | null;
  /**
   * The owning corpo's descriptor, or `null` when unbranded **or** when the
   * brand is an independent (no corpo). The null is the legible absence.
   */
  getCorpo(): CorpoDescriptor | null;
}

export function BrandedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class BrandedMixin extends Base implements Branded {
    static _mixinName = "BrandedMixin";
    static fieldMeta: FieldMeta = {
      _brandKey: { persistent: true, authorable: true, authorPicker: 'Brand' },
    };

    /**
     * The durable brand `key` (e.g. `'volk'`). Empty = unbranded. Resolved
     * to its `Brand` / `Corpo` lazily on each read via `CorpoApi`.
     */
    public _brandKey: string = "";

    public getBrandKey(): string {
      return this._brandKey;
    }
    public setBrandKey(value: string): void {
      if (typeof value !== "string") {
        throw new TypeError("Branded.brandKey must be a string");
      }
      this._brandKey = value;
    }

    public getBrand(): BrandDescriptor | null {
      if (!this._brandKey) return null;
      return CorpoApi.getBrand(this._brandKey);
    }

    public getCorpo(): CorpoDescriptor | null {
      if (!this._brandKey) return null;
      return CorpoApi.corpoOfBrand(this._brandKey);
    }

    /**
     * Live-query projection of the mark. Two flat fields — `brand` and
     * `corpo` keys (the `corpo` key is `null` for an independent). Keyed on
     * `_brandKey` so a re-stamp re-projects. The method-derived surface (no
     * `PropertiedMixin` prop), per the inter-Stuff method-only contract.
     */
    static subscribableFields: SubscribableFieldDescriptor[] = [
      {
        name: "brand",
        read: (stuff) => (stuff as unknown as Branded).getBrand()?.key ?? null,
        dependsOnFields: ["_brandKey"],
      },
      {
        name: "corpo",
        read: (stuff) => (stuff as unknown as Branded).getCorpo()?.key ?? null,
        dependsOnFields: ["_brandKey"],
      },
    ];

    /**
     * Derived corpo-mark line appended to the host's long description. Reads
     * the resolved brand / corpo at render time (truthful under re-pathing).
     */
    static markupAugmenters: MarkupAugmenter[] = [brandMarkAugmenter];
  };
}

/**
 * Append the mark line to a branded host's long description. Owned brands
 * read "a product of <Corpo>"; independents read as a no-corpo label.
 * Non-branded hosts (defensive) and unbranded products pass the text
 * through unchanged.
 */
function brandMarkAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!MixinApi.hasMixin(host, Mixins.Branded)) return text;
  const branded = host as unknown as Branded;
  const brand = branded.getBrand();
  if (!brand) return text;
  const corpo = branded.getCorpo();
  const line = corpo
    ? `${brand.name} — a product of ${corpo.label}.`
    : `${brand.name} — an independent label, carried by no corpo.`;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}
