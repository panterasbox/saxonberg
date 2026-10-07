/**
 * ⭐⭐ Continuity declares its namespace; the mint is asserted against
 * it.
 *
 * A **continuity** identity is one that several lineages wear — the
 * Avatar family's `/platform/agent/Avatar/<playerId>` belongs to
 * `PrimaryAvatar`, to the anonymous guest and to the sandbox wire body
 * — so nothing about the identity's shape can be derived from the row
 * it is cloned from. A typo in the prefix files a person somewhere no
 * ledger will ever look, and nothing would say so.
 *
 * So a family that owns a namespace declares it, and
 * `StuffApi.clone`'s mint checks against the declaration, beside the
 * singleton guard that reads the same string.
 *
 * ⚠ A class that declares NOTHING is not asserted. **Individuation**
 * derives its identity from its own row and the census
 * (`lint:identity-mints`) is its gate; a default namespace on `Stuff`
 * would admit every mint everywhere and assert nothing.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '../stuff';
import { Party } from '../../platform/idea/Party';
import Avatar from '../../lib/character/Avatar';
import ShadeAvatar from '../../platform/agent/ShadeAvatar';
import PrimaryAvatar from '../../platform/agent/PrimaryAvatar';
import { Idea } from '../../lib/stuff/Idea';
import { seedKernelContentStore } from '../../lib/security/__tests__/test-setup';

const PARTY_ROW = '/platform/idea/Party';
const PLAIN_ROW = '/platform/idea/exits/passage';

beforeEach(() => {
  seedKernelContentStore([
    { path: PARTY_ROW, class: PARTY_ROW, data: {} },
  ]);
});

afterEach(() => {
  StuffApi.clearAll();
});

describe('what the shipped families declare', () => {
  it('⭐ the Avatar family declares once, on the ABSTRACT root', () => {
    // The root is where it belongs: `PrimaryAvatar`, the guest and the
    // wire body are all held to the claim without saying anything.
    expect(Avatar.identityNamespace).toBe('/platform/agent/Avatar/');
    expect(
      (PrimaryAvatar as unknown as { identityNamespace: string })
        .identityNamespace,
    ).toBe('/platform/agent/Avatar/');
  });

  it('every shipped avatar identity lies inside the declaration', () => {
    expect(Avatar.getTemplatePath('p1')).toMatch(
      new RegExp(`^${Avatar.identityNamespace}`),
    );
  });

  it('⭐ a member that owns a different prefix SHADOWS the ancestor', () => {
    // A shade is the same person, but its namespace is its own —
    // inheriting the family's would have been wrong.
    expect(ShadeAvatar.identityNamespace).toBe('/platform/agent/ShadeAvatar/');
    expect(ShadeAvatar.identityNamespace).not.toBe(Avatar.identityNamespace);
  });

  it('a party declares the branch its record is read from', () => {
    expect(Party.identityNamespace).toBe('/platform/idea/party/');
  });

  it('⚠ a class that declares nothing has nothing to declare', () => {
    expect(
      Object.hasOwn(Idea as unknown as object, 'identityNamespace'),
    ).toBe(false);
  });
});

describe('the assertion at the mint', () => {
  it('a mint inside the declared namespace stands up', async () => {
    const party = await StuffApi.clone<Party>(PARTY_ROW, undefined, {
      asIdentityPath: '/platform/idea/party/abc-123',
    });
    expect(party.getIdentityPath()).toBe('/platform/idea/party/abc-123');
    expect(party.getTemplatePath()).toBe(PARTY_ROW);
  });

  it('⭐⭐ a mint OUTSIDE it throws, naming the class and the namespace', async () => {
    await expect(
      StuffApi.clone(PARTY_ROW, undefined, {
        asIdentityPath: '/platform/idea/parties/abc-123',
      }),
    ).rejects.toThrow(
      /identity '\/platform\/idea\/parties\/abc-123' is outside Party's declared namespace \(\/platform\/idea\/party\/\)/,
    );
  });

  it('a mint on a class that declares nothing is NOT asserted', async () => {
    // Individuation's gate is the census, not this assertion.
    const exit = await StuffApi.clone(PLAIN_ROW, undefined, {
      asIdentityPath: '/anywhere/at/all',
    });
    expect(exit.getIdentityPath()).toBe('/anywhere/at/all');
  });

  it('an unminted clone is never asserted', async () => {
    const exit = await StuffApi.clone(PLAIN_ROW);
    expect(exit.getIdentityPath()).toBe(PLAIN_ROW);
  });
});
