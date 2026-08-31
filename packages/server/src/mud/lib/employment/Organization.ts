/**
 * OrganizationMixin — the org chart: positions, holders, and the authority
 * that fills them.
 *
 * **Business models participation in the economy; an organization models
 * the chart.** Everything here is the chart half: the authored
 * {@link Position}s, the {@link Roster}, the **appointing authority**, and
 * the holder transitions the employment engine drives.
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
import { Authority, type PrincipalRef } from './Authority';
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
  SecurityPolicies.FromTemplate('/platform/idea/api/employment'),
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
  /**
   * Who may fill this organization's positions, or `null` when nothing
   * resolvable is authored (in which case nobody may — the resolver fails
   * closed). See {@link PrincipalRef}.
   */
  getAppointingAuthority(): PrincipalRef | null;
  /**
   * The proprietor's templatePath, or undefined — the *entity* case of the
   * appointing authority, kept because the economic half asks it directly
   * (the unpaid-cover rule, `businessOfProprietor`). An authority that
   * names an office or a committee has no proprietor.
   */
  getProprietor(): string | undefined;
  /** The authored positions, as value objects. */
  getPositions(): readonly Position[];
  /** The position with `key`, or undefined. */
  getPosition(key: string): Position | undefined;
  /** The roster (schedule) value object. */
  getRoster(): Roster;
  /** The roster assignments in list order. */
  getRosterAssignments(): readonly RosterAssignment[];
  /**
   * The organization this one sits inside (a durable templatePath), or
   * undefined at the top. A department inside a ministry; a desk inside a
   * paper.
   */
  getParentOrganizationPath(): string | undefined;
  /**
   * The reporting chain above `positionKey`, nearest superior first —
   * `[Communications Director]` for a Press Secretary that reports to it.
   * Empty when the position reports to nobody or does not exist.
   *
   * ⚠ **A `reportsTo` cycle is refused, not looped on**: the walk throws
   * rather than returning a truncated chain, because a chart that eats its
   * own tail is an authoring error and a quiet partial answer hides it.
   */
  getReportingChain(positionKey: string): readonly Position[];

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
  appointingAuthority: PrincipalRef | string | null;
  parentOrganization: string;
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
      appointingAuthority: { persistent: true, authorable: true },
      parentOrganization: {
        persistent: true,
        authorable: true,
        authorPicker: 'Template',
      },
      proprietorPath: {
        persistent: true,
        authorable: true,
        authorPicker: 'Template',
      },
      positions: { persistent: true, authorable: true },
      rosterSlots: { persistent: true, authorable: true },
      name: { persistent: true, authorable: true },
    };

    /**
     * How the organization is called in prose — "the house account of
     * Dave's Bar", "Stock at the cash-and-carry". Authored on the row;
     * empty falls through to the Stuff default ("something"), which is
     * what every business read as until the libations live drive.
     */
    public name: string = '';

    public getName(): string {
      return this.name;
    }

    public setName(value: string): void {
      this.name = typeof value === 'string' ? value.trim() : '';
    }

    public getPresentation(): string {
      return this.name.length > 0 ? this.name : super.getPresentation();
    }

    /**
     * Who may fill this organization's positions — a {@link PrincipalRef},
     * or a bare templatePath string (the legacy shape, normalized on read).
     * `null` = unauthored, and the resolver refuses everyone.
     */
    public appointingAuthority: PrincipalRef | string | null = null;

    /**
     * ⚠⚠ **Legacy hydration slot. Do NOT delete it because the seeds are
     * clean.** No shipped seed authors `proprietorPath` any more — that is
     * asserted by `world/__tests__/business-authority.test.ts` — so a grep
     * makes this look dead. It is not.
     *
     * The retired seeder was insert-only, so every box seeded before the
     * port still has `proprietorPath` in its `content` rows (the installer
     * adopts a row's body only where the file changed). This
     * slot is what makes those rows keep working: it reads as
     * `{kind: 'entity', path}`, which is byte-identical to what they resolved
     * to before.
     *
     * `appointingAuthority` wins when both are present, so a reseeded row
     * upgrades silently and no migration is required to *stay* correct.
     */
    public proprietorPath: string = '';

    /**
     * The enclosing organization's templatePath. Empty = top of the chart.
     */
    public parentOrganization: string = '';

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

    public getAppointingAuthority(): PrincipalRef | null {
      return (
        Authority.fromData(this.appointingAuthority) ??
        Authority.fromData(this.proprietorPath)
      );
    }

    public getProprietor(): string | undefined {
      const authority = this.getAppointingAuthority();
      return authority?.kind === 'entity' ? authority.path : undefined;
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

    public getParentOrganizationPath(): string | undefined {
      return this.parentOrganization || undefined;
    }

    public getReportingChain(positionKey: string): readonly Position[] {
      const out: Position[] = [];
      const seen = new Set<string>([positionKey]);
      let current = this.getPosition(positionKey);
      while (current?.reportsTo) {
        const next = current.reportsTo;
        if (seen.has(next)) {
          throw new Error(
            `OrganizationMixin.getReportingChain: reportsTo cycle at ` +
              `'${next}' in ${this.getOrganizationPath()}`,
          );
        }
        seen.add(next);
        const superior = this.getPosition(next);
        // A dangling `reportsTo` ends the chain rather than throwing: the
        // position it names may simply not be authored yet, which is a gap
        // and not a contradiction.
        if (!superior) break;
        out.push(superior);
        current = superior;
      }
      return out;
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
