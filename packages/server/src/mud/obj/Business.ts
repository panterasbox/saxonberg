/**
 * Business — an organization that **trades**: the economic face over the
 * org chart.
 *
 * **A Business is its own entity, not a property of a place** (the
 * governing decision). It is a dedicated `Idea` — NOT a mixin on the venue
 * `Location`. The Bar stays a dumb `Location` with zero employment data.
 * This is what lets a job span locations, a proprietor be absent, and (the
 * clincher) the business **outlive its proprietor** — the shipped
 * Dave→Augie→Mara succession lineage needs the business to be a standalone
 * entity with the proprietor as a replaceable edge.
 *
 * **The chart lives on {@link OrganizationMixin}**, which this composes:
 * positions, the roster, the proprietor edge and the holder transitions.
 * What stays here is what participation in the economy actually needs —
 * `banksAt`, `operatingLocations`, and the P&L account path. A registry is
 * an organization that does not trade; a newspaper is an organization that
 * trades *and* publishes. Only the second is a Business.
 *
 * The house **account keys on the Business's own path** (`getAccountPath`),
 * not the venue's — so order income and shift wages settle on one account
 * that survives a venue move. It is the organization path under another
 * name: an account is a fact about the trading face, and naming it
 * separately is what keeps a non-trading organization from implying one.
 *
 * Seeded as domain data (`/world/lounge/business`) and warmed / made
 * enumerable via the bootstrap manifest; `EmploymentLogic` finds businesses
 * by the `BusinessMixin` marker (never a field on the room).
 *
 * The mixin is separated from the concrete class so a future non-`Idea`
 * host (a chain, a franchise) can compose it.
 */

import { Idea } from '../lib/stuff/Idea';
import { PostRegistrationMixin } from '../lib/stuff/PostRegistration';
import type { MixinConstructor, FieldMeta } from '../lib/mixin';
import type { Stuff } from '../lib/stuff/Stuff';
import type { VetoResult } from '../lib/errors';
import {
  OrganizationMixin,
  type Organization,
  type OrganizationFields,
} from '../lib/employment/Organization';

/**
 * The trading half of the surface — what a Business adds to the chart
 * (methods only, per the inter-stuff contract). The `operatingLocations` /
 * `banksAt` fields are public so the Hydrator can reflect into them, but
 * they are NOT the contract surface.
 */
export interface BusinessTrade {
  /** The locations this Business operates in (templatePaths). */
  getOperatingLocations(): readonly string[];
  /** The account key for this Business — its own durable path. */
  getAccountPath(): string;
  /** The bank branch custodying the operating account ('' = unauthored). */
  getBanksAt(): string;
}

/**
 * The whole Business surface: the chart it requires plus the trade it
 * adds. Split from {@link BusinessTrade} because the mixin class only
 * declares its own half — the chart half arrives on the base, which the
 * factory's constraint requires.
 */
export interface Business extends Organization, BusinessTrade {}

/**
 * ⚠ The base must already carry {@link OrganizationMixin} — a Business is
 * an organization that trades, and there is no such thing as trade without
 * a chart. Stated as a **constraint on the base** rather than as a nested
 * `BusinessMixin extends OrganizationMixin(Base)`, which is the shipped
 * `MountableMixin`-requires-`Slotted` idiom: TypeScript loses an anonymous
 * mixin base's members through a nested generic factory, so nesting would
 * make `positions` and `getProprietor` invisible on every concrete
 * Business. Composition happens at the concrete class, where the whole
 * surface resolves — and applying this to a non-organization base is a
 * compile error rather than a convention.
 */
export function BusinessMixin<
  TBase extends MixinConstructor<Organization & OrganizationFields>,
>(Base: TBase) {
  class BusinessMixin extends Base implements BusinessTrade {
    static _mixinName = 'BusinessMixin';

    static fieldMeta: FieldMeta = {
      operatingLocations: {
        persistent: true,
        authorable: true,
        authorPicker: 'Template',
      },
      banksAt: { persistent: true, authorable: true, authorPicker: 'Template' },
    };

    /**
     * Locations this Business operates in (templatePaths).
     */
    public operatingLocations: string[] = [];

    /**
     * The bank branch (templatePath) custodying this business's operating
     * account — **where the business banks is an authored fact about the
     * business** (a term of its arrangement: the branch's Terms price its
     * fees, and fees route a royalty to that bank's corpo), never a code
     * default. Empty = not authored — the business cannot open an
     * operating account (an authoring error, refused loudly at
     * `EmploymentApi.operatingAccountOf`).
     */
    public banksAt: string = '';

    public getBanksAt(): string {
      return this.banksAt;
    }

    public getOperatingLocations(): readonly string[] {
      return [...this.operatingLocations];
    }

    public getAccountPath(): string {
      return (this as unknown as Stuff).getTemplatePath() ?? '';
    }
  }
  return BusinessMixin;
}

/**
 * BusinessEntity — the concrete seeded entity at `/world/lounge/business`.
 * A singleton-style domain `Idea` (warmed + made enumerable by the
 * bootstrap manifest); refuses ordinary destruct. Exported as the module
 * **default** so `class: /obj/Business` resolves it (the `Bank`→`BankCounter`
 * convention: the surface interface + the mixin share the concept name, the
 * concrete class has its own — keeps the interface from merging with the
 * class into a recursive base type).
 */
class BusinessEntity extends BusinessMixin(
  OrganizationMixin(PostRegistrationMixin(Idea)),
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

export default BusinessEntity;
