/**
 * check-committees-are-players' pure decision core: an NPC row enrolled
 * in a group that holds title (in any manifest) is a seat an NPC holds;
 * an NPC in a group that holds NO title (a staff group, a subject) is
 * nobody's business; a player key is never an NPC. And the gate FIRES on
 * the shape it exists for — the 1.0 Walter/Katie manifests.
 */

import '../../src/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { classify, isAgentPath, viewOf, NPC_COMMITTEE_CEILING } from '../check-committees-are-players';

describe('check-committees-are-players', () => {
  it('⭐ fires on the 1.0 shape (Walter): a pack claims an extent for a group and enrols its own NPC in it', () => {
    const landlordPack = viewOf(
      {
        id: 'p',
        requires: {
          groups: [
            { name: 'landlord', members: [{ id: '/test/row/agent/letting-agent' }] },
          ],
          title: [{ extent: '/test/row/house', holder: { group: 'landlord' } }],
        },
      },
      'p',
    );
    expect(classify([landlordPack])).toEqual([
      { pack: 'p', group: 'landlord', member: '/test/row/agent/letting-agent' },
    ]);
  });

  it('a claim may name a HOST\'s group: the enrolment is caught wherever it is declared', () => {
    const host = viewOf(
      { id: 'host', requires: { groups: [{ name: 'g', members: [{ id: '/test/x/agent/npc' }] }] } },
      'host',
    );
    const claimer = viewOf({ id: 'claimer', requires: { title: [{ extent: '/test/x', holder: { group: 'g' } }] } }, 'claimer');
    expect(classify([host, claimer])).toHaveLength(1);
    // Without the claim, a staff group with an NPC in it is fine.
    expect(classify([host])).toEqual([]);
  });

  it('a player member is never an NPC; an organization holder has no group to check', () => {
    const m = viewOf(
      {
        id: 'p',
        requires: {
          groups: [{ name: 'g', members: [{ id: '/platform/agent/Avatar/alice' }] }],
          title: [
            { extent: '/test/x', holder: { group: 'g' } },
            { extent: '/test/trade', holder: { organization: '/compact/trade' } },
          ],
        },
      },
      'p',
    );
    expect(classify([m])).toEqual([]);
    expect(isAgentPath('/platform/agent/Avatar/alice')).toBe(false);
    expect(isAgentPath('/test/x/agent/npc')).toBe(true);
  });

  it('the ceiling is zero — the retrofit took Walter and Katie off their committees', () => {
    expect(NPC_COMMITTEE_CEILING).toBe(0);
  });
});
