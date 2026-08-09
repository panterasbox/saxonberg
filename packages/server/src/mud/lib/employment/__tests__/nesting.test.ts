/**
 * Nesting — the chart's two vertical edges (AC 4).
 *
 * `Position.reportsTo` walks *within* an organization; the organization's
 * own `parentOrganization` walks *between* them. Both are optional and had
 * no consumer before this build, so every shipped Position and Business is
 * unchanged.
 *
 * ⚠ Each walk is tested for its **cycle refusal**. A chart that eats its
 * own tail is an authoring error, and the failure mode a guard prevents —
 * an infinite loop inside a read — is one that takes the process with it,
 * so the refusal is loud rather than a silently truncated chain.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { OrganizationMixin } from '../Organization';
import { Idea } from '../../stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { EmploymentApi } from '../../../api/employment';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';
import type { PositionData } from '../Position';

class OrganizationEntity extends OrganizationMixin(Idea) {
  static _mixinName = 'OrganizationEntity';
}

const PMO = '/compact/executive';
const COMPACT = '/compact/press';

function position(
  key: string,
  reportsTo?: string,
): PositionData & { reportsTo?: string } {
  return {
    key,
    label: key,
    wageRate: 0,
    confers: [],
    ...(reportsTo ? { reportsTo } : {}),
  };
}

describe('Position.reportsTo', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it('resolves press-secretary as reporting to communications-director', () => {
    const org = makeStuffAtPath(() => new OrganizationEntity(), PMO);
    org.positions = [
      position('communications-director'),
      position('press-secretary', 'communications-director'),
    ];
    expect(
      org.getReportingChain('press-secretary').map((p) => p.key),
    ).toEqual(['communications-director']);
    // The top of the chart reports to nobody.
    expect(org.getReportingChain('communications-director')).toEqual([]);
  });

  it('round-trips reportsTo through the value object', () => {
    const org = makeStuffAtPath(() => new OrganizationEntity(), PMO);
    org.positions = [position('press-secretary', 'communications-director')];
    const p = org.getPosition('press-secretary')!;
    expect(p.reportsTo).toBe('communications-director');
    expect(p.serialize().reportsTo).toBe('communications-director');
    // ...and a position with no superior serializes without the key, so a
    // shipped Position round-trips byte-identically.
    expect(
      Object.hasOwn(
        org.getPosition('press-secretary')!.serialize(),
        'reportsTo',
      ),
    ).toBe(true);
    org.positions = [position('bartender')];
    expect(
      Object.hasOwn(org.getPosition('bartender')!.serialize(), 'reportsTo'),
    ).toBe(false);
  });

  it('walks a chain more than one deep', () => {
    const org = makeStuffAtPath(() => new OrganizationEntity(), PMO);
    org.positions = [
      position('chief-of-staff'),
      position('communications-director', 'chief-of-staff'),
      position('press-secretary', 'communications-director'),
    ];
    expect(
      org.getReportingChain('press-secretary').map((p) => p.key),
    ).toEqual(['communications-director', 'chief-of-staff']);
  });

  it('ends the chain on a dangling superior, and on an unknown position', () => {
    const org = makeStuffAtPath(() => new OrganizationEntity(), PMO);
    org.positions = [position('press-secretary', 'nobody-authored-this')];
    expect(org.getReportingChain('press-secretary')).toEqual([]);
    expect(org.getReportingChain('no-such-position')).toEqual([]);
  });

  it('⚠ refuses a reportsTo cycle at read rather than looping', () => {
    const org = makeStuffAtPath(() => new OrganizationEntity(), PMO);
    org.positions = [
      position('a', 'b'),
      position('b', 'a'),
    ];
    expect(() => org.getReportingChain('a')).toThrowError(/cycle/);
    // ...including the degenerate self-report.
    org.positions = [position('solo', 'solo')];
    expect(() => org.getReportingChain('solo')).toThrowError(/cycle/);
  });
});

describe('organization parentage', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it('walks the enclosing organizations, nearest parent first', () => {
    const parent = makeStuffAtPath(() => new OrganizationEntity(), PMO);
    const child = makeStuffAtPath(() => new OrganizationEntity(), COMPACT);
    child.parentOrganization = PMO;

    expect(child.getParentOrganizationPath()).toBe(PMO);
    expect(
      EmploymentApi.organizationChainOf(child).map((o) => o.getTemplatePath()),
    ).toEqual([PMO]);
    expect(EmploymentApi.organizationChainOf(parent)).toEqual([]);
  });

  it('ends the chain on a parent that does not resolve', () => {
    const child = makeStuffAtPath(() => new OrganizationEntity(), COMPACT);
    child.parentOrganization = '/compact/never-stood-up';
    expect(EmploymentApi.organizationChainOf(child)).toEqual([]);
  });

  it('⚠ refuses a parent cycle at read rather than looping', () => {
    const a = makeStuffAtPath(() => new OrganizationEntity(), PMO);
    const b = makeStuffAtPath(() => new OrganizationEntity(), COMPACT);
    a.parentOrganization = COMPACT;
    b.parentOrganization = PMO;
    expect(() => EmploymentApi.organizationChainOf(a)).toThrowError(/cycle/);

    // ...including a self-parenting organization.
    const solo = makeStuffAtPath(
      () => new OrganizationEntity(),
      '/compact/solo',
    );
    solo.parentOrganization = '/compact/solo';
    expect(() => EmploymentApi.organizationChainOf(solo)).toThrowError(
      /cycle/,
    );
  });
});
