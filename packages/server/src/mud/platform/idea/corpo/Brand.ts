/**
 * Brand — one product brand of the corpos Catalog as a leaf Idea.
 *
 * A `Brand` is a named product line (Volk vodka, Vionne Noir) that resolves
 * to **one** owning {@link Corpo} — or to **none** (the independent). Like
 * {@link Corpo}, a pure-data leaf template authored under
 * `/stuff/idea/corpo/Brand/<key>`, read by the catalogue from `template.data`,
 * never cloned as live Stuff.
 *
 * **`owner` is a Corpo `key`; the empty string is the independent.** A
 * brand with `owner === ''` is a real, named brand carried by no corpo —
 * the microdistiller / family operation (Crowsfoot Gin). The independent
 * path falls out of the model as the *absence of an owner edge*, not a
 * special-cased second mechanism. The `''` sentinel mirrors
 * `Discipline.iscedf: ''` ("no anchor") and round-trips cleanly through the
 * descriptor coercer.
 *
 * **Real categories, fictional brands.** `category` is the honest product
 * category (`'gin'`, `'vodka'`, `'whiskey'`); the brand name is invented
 * (no trademark risk). `positioning` is an authored label as **data only**
 * — the price→quality economics (price tracks brand positioning, not the
 * verdict) belong to the bar / economy builds, not here.
 */

import { Idea } from "../../../lib/stuff/Idea";
import { TemplatePathPrefixes } from "../../../lib/paths";
import type { FieldMeta } from "../../../lib/mixin";

/**
 * The runtime descriptor the catalogue caches — a plain projection of a
 * Brand template's `data`. `owner === ''` is the independent marker the
 * catalogue / logic interprets (resolves to a null corpo).
 */
export interface BrandDescriptor {
  key: string;
  name: string;
  /** Owning Corpo `key`, or `''` for an independent (no corpo mark). */
  owner: string;
  category: string;
  positioning: string;
  descriptor: string;
}

export default class Brand extends Idea {
  /** Per-instance template path prefix: `/stuff/idea/corpo/Brand/<key>`. */
  static readonly TEMPLATE_PATH_PREFIX = TemplatePathPrefixes.brand;

  /** Durable join key (e.g. `'volk'`). Non-empty. */
  public key: string = "";
  /** Display name (e.g. `'Volk'`). Non-empty. */
  public name: string = "";
  /** Owning Corpo `key`, or `''` = independent (no corpo mark). */
  public owner: string = "";
  /** Honest product category (e.g. `'vodka'`, `'gin'`, `'whiskey'`). */
  public category: string = "";
  /** Authored positioning label (data only; not a price). */
  public positioning: string = "";
  /** Authored flavor / descriptor line. */
  public descriptor: string = "";

  static fieldMeta: FieldMeta = {
    key: { persistent: true },
    name: { persistent: true },
    owner: { persistent: true },
    category: { persistent: true },
    positioning: { persistent: true },
    descriptor: { persistent: true },
  };

  public getKey(): string {
    return this.key;
  }
  public setKey(value: string): void {
    if (typeof value !== "string" || value.length === 0) {
      throw new TypeError("Brand.key must be a non-empty string");
    }
    this.key = value;
  }

  public getName(): string {
    return this.name;
  }
  public setName(value: string): void {
    if (typeof value !== "string" || value.length === 0) {
      throw new TypeError("Brand.name must be a non-empty string");
    }
    this.name = value;
  }

  /** The owning Corpo `key`, or `''` for an independent. */
  public getOwner(): string {
    return this.owner;
  }
  public setOwner(value: string): void {
    if (typeof value !== "string") {
      throw new TypeError(
        "Brand.owner must be a string (a Corpo key, or '' for independent)"
      );
    }
    this.owner = value;
  }

  /** Whether this brand belongs to no corpo (the independent). */
  public isIndependent(): boolean {
    return this.owner.length === 0;
  }

  public getCategory(): string {
    return this.category;
  }
  public setCategory(value: string): void {
    if (typeof value !== "string") {
      throw new TypeError("Brand.category must be a string");
    }
    this.category = value;
  }

  public getPositioning(): string {
    return this.positioning;
  }
  public setPositioning(value: string): void {
    if (typeof value !== "string") {
      throw new TypeError("Brand.positioning must be a string");
    }
    this.positioning = value;
  }

  public getDescriptor(): string {
    return this.descriptor;
  }
  public setDescriptor(value: string): void {
    if (typeof value !== "string") {
      throw new TypeError("Brand.descriptor must be a string");
    }
    this.descriptor = value;
  }
}
