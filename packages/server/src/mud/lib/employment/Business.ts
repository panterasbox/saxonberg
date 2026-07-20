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
import { CallSecurity } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';
import { Position, type PositionData } from './Position';
import { Roster, type RosterAssignment } from './Roster';
import {
  Employment,
  type EmploymentData,
  type EmploymentStatus,
} from './Employment';
import type { Employed } from './Employed';

/**
 * The business's own mutation surface: itself, or the employment engine
 * orchestrating a lifecycle step. Reads stay Public.
 */
const BusinessSurface = SecurityPolicies.AnyOf(
  SecurityPolicies.SelfOnly,
  SecurityPolicies.FromTemplate('/obj/api/employment'),
);

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

  /** Hire `actor` into `positionKey` (employed, off-shift). */
  hire(
    actor: Stuff & Employed,
    positionKey: string,
    nowRaw: number,
  ): Employment | null;
  /** Flip `actor`'s record with this business to a terminal status. */
  endEmployment(actor: Stuff & Employed, status: 'fired' | 'quit'): void;
  /** The existing record, or a lazily-materialized off-shift one. */
  ensureRostered(
    actor: Stuff & Employed,
    positionKey: string,
    nowRaw: number,
  ): Employment;
  /** Stamp `actor` on-shift (`onShiftSince = nowRaw`). */
  beginShift(actor: Stuff & Employed, nowRaw: number): void;
  /** Flip `actor` off-shift (caller settles the wage off the captured
   * record first). */
  endShift(actor: Stuff & Employed): void;
  /** Begin a proprietor's transient on-shift cover. */
  beginCover(actor: Stuff & Employed, nowRaw: number): Employment | null;
  /** End a proprietor's cover: drop the transient record. */
  endCover(actor: Stuff & Employed): void;
}

export function BusinessMixin<TBase extends MixinConstructor>(Base: TBase) {
  // Class *declaration* (not a returned expression) so the method
  // decorators are valid under legacy-decorator rules.
  class BusinessMixin extends Base implements Business {
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

    /* ───── employment transitions (the business acts on its employee) ─────
     *
     * Every record write is keyed on THIS business's own path — which is
     * exactly the participant contract on `Employed`'s gated mutators
     * (`FromMixin(Mixins.Business)` + a `where` requiring the written key
     * to be the calling business's path). A business can never touch a
     * record it isn't party to. The engine (`EmploymentLogic`) supplies
     * the clock and keeps orchestration (roster evaluation, wage
     * settlement, capability re-resolve); the relationship mutation is
     * the business's own behavior.
     */

    @CallSecurity(BusinessSurface)
    public hire(
      actor: Stuff & Employed,
      positionKey: string,
      nowRaw: number,
    ): Employment | null {
      const businessPath = this.getAccountPath();
      if (!businessPath) return null;
      const record: EmploymentData = {
        businessPath,
        positionKey,
        status: 'employed',
        hiredAt: nowRaw,
        onShiftSince: null,
      };
      actor._upsertEmployment(record);
      return Employment.of(record);
    }

    @CallSecurity(BusinessSurface)
    public endEmployment(
      actor: Stuff & Employed,
      status: 'fired' | 'quit',
    ): void {
      actor._setEmploymentStatus(this.getAccountPath(), status);
    }

    @CallSecurity(BusinessSurface)
    public ensureRostered(
      actor: Stuff & Employed,
      positionKey: string,
      nowRaw: number,
    ): Employment {
      const businessPath = this.getAccountPath();
      const existing = actor.getEmployment(businessPath);
      if (existing) return existing;
      const record: EmploymentData = {
        businessPath,
        positionKey,
        status: 'off-shift' as EmploymentStatus,
        hiredAt: nowRaw,
        onShiftSince: null,
      };
      actor._upsertEmployment(record);
      return Employment.of(record);
    }

    @CallSecurity(BusinessSurface)
    public beginShift(actor: Stuff & Employed, nowRaw: number): void {
      const emp = actor.getEmployment(this.getAccountPath());
      if (!emp) return;
      actor._upsertEmployment(emp.withStatus('on-shift', nowRaw).serialize());
    }

    @CallSecurity(BusinessSurface)
    public endShift(actor: Stuff & Employed): void {
      actor._setEmploymentStatus(this.getAccountPath(), 'off-shift');
    }

    @CallSecurity(BusinessSurface)
    public beginCover(
      actor: Stuff & Employed,
      nowRaw: number,
    ): Employment | null {
      const businessPath = this.getAccountPath();
      const positionKey = this.positions[0]?.key;
      if (!businessPath || !positionKey) return null;
      const record: EmploymentData = {
        businessPath,
        positionKey,
        status: 'on-shift',
        hiredAt: nowRaw,
        onShiftSince: nowRaw,
      };
      actor._upsertEmployment(record);
      return Employment.of(record);
    }

    @CallSecurity(BusinessSurface)
    public endCover(actor: Stuff & Employed): void {
      actor._removeEmployment(this.getAccountPath());
    }
  }
  return BusinessMixin;
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
