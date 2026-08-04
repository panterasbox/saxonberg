/**
 * OrganizationMixin — the org chart: positions, holders, and the authority
 * that fills them.
 *
 * **Business models participation in the economy; an organization models
 * the chart.** Everything here is the chart half, lifted verbatim out of
 * `BusinessMixin`: the authored {@link Position}s, the {@link Roster}, the
 * proprietor edge (which Wave 2 generalizes into a polymorphic appointing
 * authority), and the holder transitions the employment engine drives.
 * `BusinessMixin` **requires** this on its base and keeps only what trades
 * — `banksAt`, `operatingLocations`, the P&L account path, wage
 * settlement.
 *
 * The point of the split is that *"who holds position P in organization
 * O?"* has to be answerable of a ministry, a shop and a newspaper with one
 * read. Before it, a registry had to be a Business — a thing that does not
 * trade, standing up as a trading entity — purely because that is where
 * positions lived. See docs/subsystems/employment.md.
 *
 * Persistent fields are the raw seed shapes; the accessors wrap them in the
 * {@link Position} / {@link Roster} value objects on read (the `Biome`
 * field-plus-getter precedent).
 *
 * Every record write is keyed on THIS organization's own path — which is
 * exactly the participant contract on `Employed`'s gated mutators
 * (`FromMixin(Mixins.Organization)` + a `where` requiring the written key
 * to be the calling organization's path). An organization can never touch a
 * record it isn't party to.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
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
 * The organization's own mutation surface: itself, or the employment engine
 * orchestrating a lifecycle step. Reads stay Public.
 */
const OrganizationSurface = SecurityPolicies.AnyOf(
  SecurityPolicies.SelfOnly,
  SecurityPolicies.FromTemplate('/obj/api/employment'),
);

/**
 * Public method surface (methods only, per the inter-stuff contract). The
 * `proprietorPath` / `positions` / `rosterSlots` fields are public so the
 * Hydrator can reflect into them, but they are NOT the contract surface —
 * external code goes through these methods.
 */
export interface Organization {
  /** This organization's durable key — its own templatePath. */
  getOrganizationPath(): string;
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

  /** Hire `actor` into `positionKey` (employed, off-shift). */
  hire(
    actor: Stuff & Employed,
    positionKey: string,
    nowRaw: number,
  ): Employment | null;
  /** Flip `actor`'s record with this organization to a terminal status. */
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

/**
 * The persistent field slots this mixin declares. Public because the
 * Hydrator reflects into them by name — NOT the contract surface (other
 * Stuff go through the {@link Organization} methods). Named as an
 * interface so a mixin that requires this one can say so in its base
 * constraint (`BusinessMixin` does).
 */
export interface OrganizationFields {
  proprietorPath: string;
  positions: PositionData[];
  rosterSlots: RosterAssignment[];
}

export function OrganizationMixin<TBase extends MixinConstructor>(
  Base: TBase,
) {
  // Class *declaration* (not a returned expression) so the method
  // decorators are valid under legacy-decorator rules.
  class OrganizationMixin extends Base implements Organization {
    static _mixinName = 'OrganizationMixin';

    static fieldMeta: FieldMeta = {
      proprietorPath: {
        persistent: true,
        authorable: true,
        authorPicker: 'Template',
      },
      positions: { persistent: true, authorable: true },
      rosterSlots: { persistent: true, authorable: true },
    };

    /**
     * templatePath of the proprietor (a replaceable edge). Empty = vacant.
     */
    public proprietorPath: string = '';

    /**
     * Authored positions, stored raw; wrapped on read.
     */
    public positions: PositionData[] = [];

    /**
     * Roster assignments, stored raw; wrapped on read.
     */
    public rosterSlots: RosterAssignment[] = [];

    public getOrganizationPath(): string {
      return (this as unknown as Stuff).getTemplatePath() ?? '';
    }

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

    /* ───── employment transitions (the org acts on its employee) ─────
     *
     * The engine (`EmploymentLogic`) supplies the clock and keeps
     * orchestration (roster evaluation, wage settlement, capability
     * re-resolve); the relationship mutation is the organization's own
     * behavior.
     */

    @CallSecurity(OrganizationSurface)
    public hire(
      actor: Stuff & Employed,
      positionKey: string,
      nowRaw: number,
    ): Employment | null {
      const organizationPath = this.getOrganizationPath();
      if (!organizationPath) return null;
      const record: EmploymentData = {
        organizationPath,
        positionKey,
        status: 'employed',
        hiredAt: nowRaw,
        onShiftSince: null,
      };
      actor._upsertEmployment(record);
      return Employment.of(record);
    }

    @CallSecurity(OrganizationSurface)
    public endEmployment(
      actor: Stuff & Employed,
      status: 'fired' | 'quit',
    ): void {
      actor._setEmploymentStatus(this.getOrganizationPath(), status);
    }

    @CallSecurity(OrganizationSurface)
    public ensureRostered(
      actor: Stuff & Employed,
      positionKey: string,
      nowRaw: number,
    ): Employment {
      const organizationPath = this.getOrganizationPath();
      const existing = actor.getEmployment(organizationPath);
      if (existing) return existing;
      const record: EmploymentData = {
        organizationPath,
        positionKey,
        status: 'off-shift' as EmploymentStatus,
        hiredAt: nowRaw,
        onShiftSince: null,
      };
      actor._upsertEmployment(record);
      return Employment.of(record);
    }

    @CallSecurity(OrganizationSurface)
    public beginShift(actor: Stuff & Employed, nowRaw: number): void {
      const emp = actor.getEmployment(this.getOrganizationPath());
      if (!emp) return;
      actor._upsertEmployment(emp.withStatus('on-shift', nowRaw).serialize());
    }

    @CallSecurity(OrganizationSurface)
    public endShift(actor: Stuff & Employed): void {
      actor._setEmploymentStatus(this.getOrganizationPath(), 'off-shift');
    }

    @CallSecurity(OrganizationSurface)
    public beginCover(
      actor: Stuff & Employed,
      nowRaw: number,
    ): Employment | null {
      const organizationPath = this.getOrganizationPath();
      const positionKey = this.positions[0]?.key;
      if (!organizationPath || !positionKey) return null;
      const record: EmploymentData = {
        organizationPath,
        positionKey,
        status: 'on-shift',
        hiredAt: nowRaw,
        onShiftSince: nowRaw,
      };
      actor._upsertEmployment(record);
      return Employment.of(record);
    }

    @CallSecurity(OrganizationSurface)
    public endCover(actor: Stuff & Employed): void {
      actor._removeEmployment(this.getOrganizationPath());
    }
  }
  return OrganizationMixin;
}
