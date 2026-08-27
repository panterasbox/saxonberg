/**
 * Government — one diegetic government as a leaf Idea.
 *
 * A government *inside the fiction* — the City of Terminus, the Realm of
 * Terminus, the Eternal University — is plural authored content: a
 * **reference-identity** (the `Corpo` / `Material` / `Species` shape), a
 * pure-data leaf template authored under `/obj/Government/<key>`,
 * read by the catalogue directly from `template.data` (never cloned as
 * live Stuff). It is emphatically NOT the Compact (the real
 * meta-institution) or any projection of it — see
 * `docs/subsystems/civics.md` and the staging capture it points at.
 *
 * **`key`, not templatePath, is the durable join.** A `Locality` declares
 * its government by key (`_governmentKey`), and the jurisdiction chain is
 * derived on read from the address coverage walk — the government carries
 * no claims list (consent-by-construction: authoring the Locality is
 * already landowner-gated). Precedent: `Corpo.key` / `Discipline.key`.
 *
 * **Every non-identity field is a durable-string reference into an
 * existing substrate**, never a live ref: `charter` (a document-store
 * path), `treasury` (a bank-account key), `departments` (Business
 * templatePaths — a Business's path IS its durable key), `seats`
 * ((department, position) references — a seat is an employment position,
 * never a second Office apparatus).
 */

import { Idea } from "../../lib/stuff/Idea";
import { TemplatePathPrefixes } from "../../lib/paths";
import type { FieldMeta } from "../../lib/mixin";

/**
 * One seat of a government: a named reference to a department position.
 * `holdsSeat` resolves it against live Employment records and the
 * authored roster — no seat-occupancy storage of its own.
 */
export interface GovernmentSeat {
  /** Durable seat key within the government (e.g. `'magistrate'`). */
  key: string;
  /** Display label (e.g. `'Magistrate of Terminus'`). */
  label: string;
  /** The department Business templatePath the position lives on. */
  department: string;
  /** The position key on that Business (e.g. `'magistrate'`). */
  positionKey: string;
}

/**
 * The runtime descriptor the catalogue caches — a plain projection of a
 * Government template's `data`, the shape consumers read (never the
 * Stuff instance).
 */
export interface GovernmentDescriptor {
  key: string;
  displayName: string;
  description: string;
  /** Document-store path of the charter (pointer only in v1). */
  charter: string;
  /** Bank-account key of the treasury (`''` = none authored). */
  treasury: string;
  /** Department Business templatePaths. */
  departments: string[];
  /** The seat roster. */
  seats: GovernmentSeat[];
}

export default class Government extends Idea {
  /** Per-instance template path prefix: `/obj/Government/<key>`. */
  static readonly TEMPLATE_PATH_PREFIX = TemplatePathPrefixes.government;

  /** Durable join key (e.g. `'terminus-city'`). Non-empty. */
  public key: string = "";
  /** Friendly display name (e.g. `'the City of Terminus'`). Non-empty. */
  public displayName: string = "";
  /** Authored prose description. */
  public description: string = "";
  /** Document-store path of the charter (pointer only in v1). */
  public charter: string = "";
  /** Bank-account key of the treasury (`''` = none authored). */
  public treasury: string = "";
  /** Department Business templatePaths. */
  public departments: string[] = [];
  /** The seat roster ((department, position) references). */
  public seats: GovernmentSeat[] = [];

  static fieldMeta: FieldMeta = {
    key: { persistent: true },
    displayName: { persistent: true },
    description: { persistent: true },
    charter: { persistent: true },
    treasury: { persistent: true },
    departments: { persistent: true },
    seats: { persistent: true },
  };

  public getKey(): string {
    return this.key;
  }
  public setKey(value: string): void {
    if (typeof value !== "string" || value.length === 0) {
      throw new TypeError("Government.key must be a non-empty string");
    }
    this.key = value;
  }

  public getDisplayName(): string {
    return this.displayName;
  }
  public setDisplayName(value: string): void {
    if (typeof value !== "string" || value.length === 0) {
      throw new TypeError("Government.displayName must be a non-empty string");
    }
    this.displayName = value;
  }

  public getDescription(): string {
    return this.description;
  }
  public setDescription(value: string): void {
    if (typeof value !== "string") {
      throw new TypeError("Government.description must be a string");
    }
    this.description = value;
  }

  public getCharter(): string {
    return this.charter;
  }
  public setCharter(value: string): void {
    if (typeof value !== "string") {
      throw new TypeError("Government.charter must be a string");
    }
    this.charter = value;
  }

  public getTreasury(): string {
    return this.treasury;
  }
  public setTreasury(value: string): void {
    if (typeof value !== "string") {
      throw new TypeError("Government.treasury must be a string");
    }
    this.treasury = value;
  }

  /** Department Business templatePaths, defensively copied. */
  public getDepartments(): string[] {
    return [...this.departments];
  }

  /** The seat roster, defensively copied. */
  public getSeats(): GovernmentSeat[] {
    return this.seats.map((s) => ({ ...s }));
  }
}
