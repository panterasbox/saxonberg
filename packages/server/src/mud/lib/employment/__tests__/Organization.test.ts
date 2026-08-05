/**
 * OrganizationMixin — the chart, factored out of Business.
 *
 * Two things are asserted that the Business suite cannot assert, because
 * before this split there was nothing but a Business to ask:
 *
 *   - **AC 1** — `who holds position P in organization O?` and its inverse
 *     `what does actor A hold?` answer identically for a Business and for
 *     a non-trading organization. The point of the substrate is that a
 *     ministry and a shop are the same read. (The publisher organization,
 *     the third kind, joins this matrix in Wave 5.)
 *   - **The participant contract survived the move.** It now names
 *     `OrganizationMixin` rather than `BusinessMixin`, so the test that an
 *     organization cannot write a record it isn't party to has to be
 *     re-proved against the new marker — a silently-widened `where` is the
 *     failure mode the lift was most likely to introduce.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Idea } from '../../stuff/Idea';
import { OrganizationMixin } from '../Organization';
import { EmployedMixin, type Employed } from '../Employed';
import BusinessEntity from '../../../obj/Business';
import { StuffApi } from '../../../api/stuff';
import { EmploymentApi } from '../../../api/employment';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';
import { SecurityError } from '../../security/errors';
import type { Stuff } from '../../stuff/Stuff';

/** A non-trading organization — a ministry, a press office, a registry. */
class OrganizationEntity extends OrganizationMixin(Idea) {
  static _mixinName = 'OrganizationEntity';

  /**
   * White-box probe for the participant contract: attempt an employment
   * write keyed on an arbitrary path rather than this organization's own.
   * No production method can do this — the mixin's transitions always pass
   * `getOrganizationPath()` — so the `where` is only reachable from a
   * deliberate seam like this one.
   */
  public writeForeign(actor: Employed, keyedPath: string): void {
    actor._setEmploymentStatus(keyedPath, 'fired');
  }
}

class EmployedHost extends EmployedMixin(Idea) {
  static _mixinName = 'EmployedHost';
}

const SHOP = '/domain/lounge/business';
const MINISTRY = '/compact/press';
const HOLDER = '/obj/Avatar/holder';

const POSITION = {
  key: 'communications-director',
  label: 'speaking for the office',
  wageRate: 0,
  confers: [],
};

describe('OrganizationMixin', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it('is composed by BusinessMixin, so every Business is an organization', () => {
    const shop = makeStuffAtPath(() => new BusinessEntity(), SHOP);
    expect(MixinApi.isOrganization(shop as unknown as Stuff)).toBe(true);
    expect(MixinApi.isBusiness(shop as unknown as Stuff)).toBe(true);
    // ...and the converse does not hold: a ministry does not trade.
    const ministry = makeStuffAtPath(() => new OrganizationEntity(), MINISTRY);
    expect(MixinApi.isOrganization(ministry as unknown as Stuff)).toBe(true);
    expect(MixinApi.isBusiness(ministry as unknown as Stuff)).toBe(false);
  });

  it('answers who-holds-P and what-does-A-hold identically for a shop and a ministry (AC 1)', () => {
    const shop = makeStuffAtPath(() => new BusinessEntity(), SHOP);
    shop.positions = [POSITION];
    const ministry = makeStuffAtPath(() => new OrganizationEntity(), MINISTRY);
    ministry.positions = [POSITION];

    const holder = makeStuffAtPath(() => new EmployedHost(), HOLDER);

    // Nobody holds it anywhere yet.
    expect(EmploymentApi.holdersOf(shop, POSITION.key)).toEqual([]);
    expect(EmploymentApi.holdersOf(ministry, POSITION.key)).toEqual([]);
    expect(holder.getActiveEmployments()).toEqual([]);

    EmploymentApi.hire(shop, holder as unknown as Stuff, POSITION.key);
    EmploymentApi.hire(ministry, holder as unknown as Stuff, POSITION.key);

    // One read, two kinds of organization, the same answer.
    expect(EmploymentApi.holdersOf(shop, POSITION.key)).toEqual([HOLDER]);
    expect(EmploymentApi.holdersOf(ministry, POSITION.key)).toEqual([HOLDER]);

    // The inverse: what does this actor hold, anywhere?
    const held = holder
      .getActiveEmployments()
      .map((e) => e.organizationPath)
      .sort();
    expect(held).toEqual([MINISTRY, SHOP].sort());
  });

  it('proves an authored roster holder before anyone is ever hired', () => {
    const ministry = makeStuffAtPath(() => new OrganizationEntity(), MINISTRY);
    ministry.positions = [POSITION];
    ministry.rosterSlots = [
      { positionKey: POSITION.key, assignee: HOLDER, schedule: [] },
    ];
    expect(EmploymentApi.holdersOf(ministry, POSITION.key)).toEqual([HOLDER]);
  });

  it('never resurrects an explicit exit from the authored roster', () => {
    const ministry = makeStuffAtPath(() => new OrganizationEntity(), MINISTRY);
    ministry.positions = [POSITION];
    ministry.rosterSlots = [
      { positionKey: POSITION.key, assignee: HOLDER, schedule: [] },
    ];
    const holder = makeStuffAtPath(() => new EmployedHost(), HOLDER);

    EmploymentApi.hire(ministry, holder as unknown as Stuff, POSITION.key);
    expect(EmploymentApi.holdersOf(ministry, POSITION.key)).toEqual([HOLDER]);

    EmploymentApi.quit(holder as unknown as Stuff, MINISTRY);
    expect(EmploymentApi.holdersOf(ministry, POSITION.key)).toEqual([]);
  });

  it('supports a wage-0 position — a volunteer is a wage-0 employee (AC 5)', () => {
    const ministry = makeStuffAtPath(() => new OrganizationEntity(), MINISTRY);
    ministry.positions = [POSITION];
    expect(ministry.getPosition(POSITION.key)?.wageRate).toBe(0);

    const holder = makeStuffAtPath(() => new EmployedHost(), HOLDER);
    const record = EmploymentApi.hire(
      ministry,
      holder as unknown as Stuff,
      POSITION.key,
    );
    expect(record?.positionKey).toBe(POSITION.key);
    expect(holder.getEmployment(MINISTRY)?.status).toBe('employed');
  });

  describe('the participant contract moved with the counterparty', () => {
    it('names OrganizationMixin, not BusinessMixin', () => {
      // The `where` on `Employed`'s gated mutators keys on this marker; a
      // ministry composing only OrganizationMixin has to satisfy it.
      expect(MixinApi.hasMixin(OrganizationEntity, Mixins.Organization)).toBe(
        true,
      );
      expect(MixinApi.hasMixin(OrganizationEntity, Mixins.Business)).toBe(
        false,
      );
    });

    it('refuses an organization writing a record it is not party to', () => {
      const ministry = makeStuffAtPath(
        () => new OrganizationEntity(),
        MINISTRY,
      );
      const other = makeStuffAtPath(
        () => new OrganizationEntity(),
        '/compact/other',
      );
      const holder = makeStuffAtPath(() => new EmployedHost(), HOLDER);
      EmploymentApi.hire(ministry, holder as unknown as Stuff, POSITION.key);

      // `other` is a bona fide organization — and still cannot touch a
      // record keyed on the ministry's path.
      expect(() =>
        other.writeForeign(holder as unknown as Employed, MINISTRY),
      ).toThrowError(SecurityError);
      expect(holder.getEmployment(MINISTRY)?.status).toBe('employed');

      // The admit case, so the refusal above isn't passing vacuously: the
      // party to the record writes it fine through the same seam.
      ministry.writeForeign(holder as unknown as Employed, MINISTRY);
      expect(holder.getEmployment(MINISTRY)?.status).toBe('fired');
    });
  });
});
