/**
 * Business — a standalone economic entity: the thing that owns a
 * proprietor, its positions, its roster, its account, and the list of
 * locations it operates in.
 *
 * **A Business is its own entity, not a property of a place** (the
 * governing decision). It is a dedicated `Idea` — NOT a mixin on the venue
 * `Location`. The Bar stays a dumb `Location` with zero employment data.
 * This is what lets a job span locations, a proprietor be absent, and (the
 * clincher) the business **outlive its proprietor** — the shipped
 * Dave→Augie→Mara succession lineage needs the business to be a standalone
 * entity with the proprietor as a replaceable edge.
 *
 * The house **account keys on the Business's own path** (`getAccountPath`),
 * not the venue's — so order income and shift wages settle on one account
 * that survives a venue move.
 *
 * Seeded as domain data (`/domain/lounge/business`) and warmed / made
 * enumerable via the bootstrap manifest; `EmploymentLogic` finds businesses
 * by the `BusinessMixin` marker (never a field on the room).
 *
 * Persistent fields are the raw seed shapes; the accessors wrap them in the
 * {@link Position} / {@link Roster} value objects on read (the `Biome`
 * field-plus-getter precedent). The mixin is separated from the concrete
 * class so a future non-`Idea` host (a chain, a franchise) can compose it.
 */

import { Idea } from '../stuff/Idea';
import { PostRegistrationMixin } from '../stuff/PostRegistration';
import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { VetoResult } from '../errors';
import { Position, type PositionData } from './Position';
import { Roster, type RosterAssignment } from './Roster';

/**
 * Public method surface (methods only, per the inter-stuff contract). The
 * `proprietorPath` / `positions` / `rosterSlots` / `operatingLocations`
 * fields are public so the Hydrator can reflect into them, but they are
 * NOT the contract surface — external code goes through these methods.
 */
export interface Business {
  /** The proprietor's templatePath, or undefined when the seat is empty. */
  getProprietor(): string | undefined;
  /** The authored positions, as value objects. */
  getPositions(): readonly Position[];
  /** The position with `key`, or undefined. */
  getPosition(key: string): Position | undefined;
  /** The roster (schedule) value object. */
  getRoster(): Roster;
  /** The roster assignments in list order. */
  getRosterAssignments(): readonly RosterAssignment[];
  /** The locations this Business operates in (templatePaths). */
  getOperatingLocations(): readonly string[];
  /** The account key for this Business — its own durable path. */
  getAccountPath(): string;
}

export function BusinessMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class BusinessMixin extends Base implements Business {
    static _mixinName = 'BusinessMixin';

    static persistentFields = [
      'proprietorPath',
      'positions',
      'rosterSlots',
      'operatingLocations',
    ];

    /**
     * templatePath of the proprietor (a replaceable edge). Empty = vacant.
     * @authorable ref:Template
     */
    public proprietorPath: string = '';

    /**
     * Authored positions, stored raw; wrapped on read.
     * @authorable
     */
    public positions: PositionData[] = [];

    /**
     * Roster assignments, stored raw; wrapped on read.
     * @authorable
     */
    public rosterSlots: RosterAssignment[] = [];

    /**
     * Locations this Business operates in (templatePaths).
     * @authorable ref:Template
     */
    public operatingLocations: string[] = [];

    public getProprietor(): string | undefined {
      return this.proprietorPath || undefined;
    }

    public getPositions(): readonly Position[] {
      return this.positions.map((p) => Position.fromData(p));
    }

    public getPosition(key: string): Position | undefined {
      const p = this.positions.find((entry) => entry.key === key);
      return p ? Position.fromData(p) : undefined;
    }

    public getRoster(): Roster {
      return Roster.fromData(this.rosterSlots);
    }

    public getRosterAssignments(): readonly RosterAssignment[] {
      return this.getRoster().getAssignments();
    }

    public getOperatingLocations(): readonly string[] {
      return [...this.operatingLocations];
    }

    public getAccountPath(): string {
      return (this as unknown as Stuff).getTemplatePath() ?? '';
    }
  };
}

/**
 * BusinessEntity — the concrete seeded entity at `/domain/lounge/business`.
 * A singleton-style domain `Idea` (warmed + made enumerable by the
 * bootstrap manifest); refuses ordinary destruct. Exported as the module
 * **default** so `class: /lib/employment/Business` resolves it (the
 * `Bank`→`BankCounter` convention: the surface interface + the mixin share
 * the concept name, the concrete class has its own — keeps the interface
 * from merging with the class into a recursive base type).
 */
export default class BusinessEntity extends BusinessMixin(
  PostRegistrationMixin(Idea),
) {
  /** Singleton refusal (mirrors the catalogue singletons). */
  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        'Business is a seeded domain singleton and cannot be destructed; ' +
        'use forceDestruct (admin-gated) if you really mean it',
    };
  }
}
