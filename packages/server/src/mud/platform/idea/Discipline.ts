/**
 * Discipline — one node of the advancement Catalog as a leaf Idea.
 *
 * The Catalog is a faceted field-of-study taxonomy; each node is a
 * Discipline (a field of study/practice at any grain — Mixology,
 * Recipe-knowledge, Darts, Alcohol-tolerance). The finest-grained
 * Discipline is a knowledge component — a **referent, never a quantity.**
 * The impersonal, shared-canon map guilds will later project over.
 *
 * Mirrors {@link Topic}'s shape: a pure-data leaf template authored under
 * `/platform/idea/Discipline/<key>`, read by the catalogue directly from
 * `template.data` (never cloned as live Stuff). The catalogue
 * (`/platform/idea/DisciplineCatalogue`) scans these templates at boot to build its
 * descriptor cache.
 *
 * **`key`, not templatePath, is the durable join.** Edges and Transcript
 * rows reference a Discipline by its `key` (`'mixology'`), distinct from
 * its templatePath — so re-pathing / re-parenting the Catalog (additive
 * evolution) leaves edges and recorded evidence valid. Precedent:
 * `Topic.topic` / `Emote.verb` are domain keys separate from the path.
 *
 * **Edges are fields on the node** (`requires` / `specializes` /
 * `synergizes`, each a list of Discipline `key`s) — mirroring
 * `Entry.relation`, no separate edge documents. Authored and stored here;
 * their runtime *consumption* (prerequisite gating, evidence propagation)
 * is deferred — the graph is real and queryable, but the estimator treats
 * each Discipline independently this increment.
 */

import { Idea } from "../../lib/stuff/Idea";
import type { CompetenceBandName } from "../../lib/advancement/CompetenceBand";
import type { FieldMeta } from "../../lib/mixin";

/**
 * Which channel of learning a Discipline lives on — the procedural /
 * conceptual / bodily split (Bloom / Kolb). `skill` = technique,
 * `knowledge` = know-what, `conditioning` = the body adapts (bounded,
 * bidirectional — e.g. alcohol tolerance).
 */
export type DisciplineChannel = "skill" | "knowledge" | "conditioning";

export const DISCIPLINE_CHANNELS: readonly DisciplineChannel[] = [
  "skill",
  "knowledge",
  "conditioning",
];

/**
 * One band-gated conferral: at or above `band` competence in this
 * Discipline, `verbs` become afforded (the knowing→doing seam). Authored
 * on the node, consumed by `CompetenceMixin`.
 */
export interface ConferralRule {
  band: CompetenceBandName;
  verbs: string[];
}

/**
 * The runtime descriptor the catalogue caches — a plain projection of a
 * Discipline template's `data`, the shape consumers read (never the Stuff
 * instance).
 */
export interface DisciplineDescriptor {
  key: string;
  channel: DisciplineChannel;
  label: string;
  description: string;
  /** ISCED-F field-of-education code (the real-taxonomy anchor); `''` if none. */
  iscedf: string;
  requires: string[];
  specializes: string[];
  synergizes: string[];
  conferrals: ConferralRule[];
}

export default class Discipline extends Idea {
  /** Per-instance template path prefix: `/platform/idea/Discipline/<key>`. */
  /** The class every Discipline row names — what the catalogue warms by. */
  static readonly CLASS_PATH = "/platform/idea/Discipline";

  /** Durable join key (e.g. `'mixology'`). Non-empty. */
  public key: string = "";
  /** The learning channel this Discipline lives on. */
  public channel: DisciplineChannel = "skill";
  /** Friendly display label (e.g. `'Mixology'`). Non-empty. */
  public label: string = "";
  /** Authored prose description. */
  public description: string = "";
  /**
   * Real-taxonomy anchor: the UNESCO **ISCED-F 2013** field-of-education
   * code this Discipline classifies under (e.g. `'1013'` = Hotel,
   * restaurants and catering; `'1014'` = Sports). The reality-seeded
   * pattern materials (`formula`) and species (`binomial`) follow — the
   * impersonal canon references the standard the world's institutions use.
   * `''` when there is no field-of-education anchor (e.g. a `conditioning`
   * Discipline is bodily adaptation, not a field of study). Authored and
   * stored; inert in v1 (designed in for the academy / LMS bridge that
   * will map real coursework onto Disciplines by code).
   */
  public iscedf: string = "";
  /** Prerequisite Discipline `key`s (the `requires` edge). */
  public requires: string[] = [];
  /** Parent-discipline `key`s this specializes under (the `specializes` edge). */
  public specializes: string[] = [];
  /** Combo-link Discipline `key`s (the `synergizes` edge). */
  public synergizes: string[] = [];
  /** Band-gated verb conferrals (the knowing→doing seam). */
  public conferrals: ConferralRule[] = [];

  static fieldMeta: FieldMeta = {
    key: { persistent: true },
    channel: { persistent: true },
    label: { persistent: true },
    description: { persistent: true },
    iscedf: { persistent: true },
    requires: { persistent: true },
    specializes: { persistent: true },
    synergizes: { persistent: true },
    conferrals: { persistent: true },
  };

  public getKey(): string {
    return this.key;
  }
  public setKey(value: string): void {
    if (typeof value !== "string" || value.length === 0) {
      throw new TypeError("Discipline.key must be a non-empty string");
    }
    this.key = value;
  }

  public getChannel(): DisciplineChannel {
    return this.channel;
  }
  public setChannel(value: DisciplineChannel): void {
    if (!DISCIPLINE_CHANNELS.includes(value)) {
      throw new TypeError(
        `Discipline.channel must be one of ${DISCIPLINE_CHANNELS.join(", ")}`
      );
    }
    this.channel = value;
  }

  public getLabel(): string {
    return this.label;
  }
  public setLabel(value: string): void {
    if (typeof value !== "string" || value.length === 0) {
      throw new TypeError("Discipline.label must be a non-empty string");
    }
    this.label = value;
  }

  public getDescription(): string {
    return this.description;
  }
  public setDescription(value: string): void {
    if (typeof value !== "string") {
      throw new TypeError("Discipline.description must be a string");
    }
    this.description = value;
  }

  public getIscedf(): string {
    return this.iscedf;
  }

  public getRequires(): string[] {
    return [...this.requires];
  }
  public getSpecializes(): string[] {
    return [...this.specializes];
  }
  public getSynergizes(): string[] {
    return [...this.synergizes];
  }
  public getConferrals(): ConferralRule[] {
    return this.conferrals.map((c) => ({ band: c.band, verbs: [...c.verbs] }));
  }
}
