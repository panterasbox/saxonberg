/**
 * Corpo — one megacorp of the corpos Catalog as a leaf Idea.
 *
 * A handful of fictional megacorps own most of the private sector. A
 * `Corpo` is a **reference-identity** (the `Material` / `Species` /
 * `Discipline` shape): a pure-data leaf template authored under
 * `/stuff/idea/corpo/Corpo/<key>`, read by the catalogue directly from
 * `template.data` (never cloned as live Stuff). The catalogue
 * (`/platform/idea/CorpoCatalogue`) scans these templates at boot to build its
 * descriptor cache.
 *
 * **`key`, not templatePath, is the durable join.** Brand `owner` edges,
 * `rivals` edges, and the per-product mark reference a Corpo by its `key`
 * (`'veshko'`), distinct from its templatePath — so re-pathing /
 * re-parenting the canon (additive evolution) leaves edges and stamped
 * products valid. Precedent: `Discipline.key` / `Topic.topic`.
 *
 * **The rivalry edge is a field on the node** (`rivals`, a list of Corpo
 * `key`s) — mirroring `Discipline.requires` / `synergizes`. Authored and
 * stored here; its runtime *consumption* (the player-facing faction
 * gameplay) is deferred — the fault-line map is real and queryable, but
 * nothing reads it this build.
 *
 * A corpo is distinguished by **sector-of-origin + ethos + aesthetic**,
 * *not* Good/Evil — the fault line is tribal, not moralistic. The mark a
 * product carries is **diegetic brand-ownership** ("made by Veshko"),
 * orthogonal to the `AuthoringEvent` provenance ledger (which records the
 * real-world author of a template).
 */

import { Idea } from "../../../lib/stuff/Idea";
import { TemplatePathPrefixes } from "../../../lib/paths";
import type { FieldMeta } from "../../../lib/mixin";

/**
 * The runtime descriptor the catalogue caches — a plain projection of a
 * Corpo template's `data`, the shape consumers read (never the Stuff
 * instance).
 */
export interface CorpoDescriptor {
  key: string;
  label: string;
  sector: string;
  ethos: string;
  aesthetic: string;
  temperament: string;
  description: string;
  /** Rival Corpo `key`s (the fault-line map; authored, inert this build). */
  rivals: string[];
}

export default class Corpo extends Idea {
  /** Per-instance template path prefix: `/stuff/idea/corpo/Corpo/<key>`. */
  static readonly TEMPLATE_PATH_PREFIX = TemplatePathPrefixes.corpo;

  /** Durable join key (e.g. `'veshko'`). Non-empty. */
  public key: string = "";
  /** Friendly display label (e.g. `'Veshko'`). Non-empty. */
  public label: string = "";
  /** Sector-of-origin (e.g. `'heavy industry / materials / logistics'`). */
  public sector: string = "";
  /** Culture / ethos — the load-bearing slot (e.g. `'the Ruthless Optimizer'`). */
  public ethos: string = "";
  /** Visual / brand aesthetic (e.g. `'brutalist grey, a wordmark not a logo'`). */
  public aesthetic: string = "";
  /** The player temperament this corpo magnetizes (e.g. `'pragmatists'`). */
  public temperament: string = "";
  /** Authored prose description. */
  public description: string = "";
  /** Rival Corpo `key`s (the `rivals` edge). */
  public rivals: string[] = [];

  static fieldMeta: FieldMeta = {
    key: { persistent: true },
    label: { persistent: true },
    sector: { persistent: true },
    ethos: { persistent: true },
    aesthetic: { persistent: true },
    temperament: { persistent: true },
    description: { persistent: true },
    rivals: { persistent: true },
  };

  public getKey(): string {
    return this.key;
  }
  public setKey(value: string): void {
    if (typeof value !== "string" || value.length === 0) {
      throw new TypeError("Corpo.key must be a non-empty string");
    }
    this.key = value;
  }

  public getLabel(): string {
    return this.label;
  }
  public setLabel(value: string): void {
    if (typeof value !== "string" || value.length === 0) {
      throw new TypeError("Corpo.label must be a non-empty string");
    }
    this.label = value;
  }

  public getSector(): string {
    return this.sector;
  }
  public setSector(value: string): void {
    if (typeof value !== "string") {
      throw new TypeError("Corpo.sector must be a string");
    }
    this.sector = value;
  }

  public getEthos(): string {
    return this.ethos;
  }
  public setEthos(value: string): void {
    if (typeof value !== "string") {
      throw new TypeError("Corpo.ethos must be a string");
    }
    this.ethos = value;
  }

  public getAesthetic(): string {
    return this.aesthetic;
  }
  public setAesthetic(value: string): void {
    if (typeof value !== "string") {
      throw new TypeError("Corpo.aesthetic must be a string");
    }
    this.aesthetic = value;
  }

  public getTemperament(): string {
    return this.temperament;
  }
  public setTemperament(value: string): void {
    if (typeof value !== "string") {
      throw new TypeError("Corpo.temperament must be a string");
    }
    this.temperament = value;
  }

  public getDescription(): string {
    return this.description;
  }
  public setDescription(value: string): void {
    if (typeof value !== "string") {
      throw new TypeError("Corpo.description must be a string");
    }
    this.description = value;
  }

  /** The `rivals` edge targets (Corpo keys), defensively copied. */
  public getRivals(): string[] {
    return [...this.rivals];
  }
}
