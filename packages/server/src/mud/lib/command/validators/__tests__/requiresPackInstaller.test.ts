/**
 * requiresPackInstaller — the `pack` verb's gate: membership of the
 * `pack-installers` committee, and NOTHING else. A member passes; a
 * non-member gets the diegetic decline; a WIZARD who is not a member is
 * refused (the axis is membership, never wizardness); a missing group
 * fails closed.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import requiresPackInstaller from '../requiresPackInstaller';
import { GroupApi } from '../../../../api/group';
import { AccessApi } from '../../../../api/access';
import { Group } from '../../../social/Group';
import type { CommandContext } from '../../../../api/command';

const MEMBER = '/obj/Avatar/member';
const STRANGER = '/obj/Avatar/stranger';

function ctxFor(path: string | null): CommandContext {
  return {
    verb: 'pack',
    commandGiver: { getTemplatePath: () => path },
  } as unknown as CommandContext;
}

function stubCommittee(group: Group | null): void {
  vi.spyOn(GroupApi, 'registry').mockResolvedValue({
    managed: () => ({ findByName: async () => group }),
  } as never);
}

function committeeWith(...members: string[]): Group {
  const g = new Group();
  g.name = 'pack-installers';
  g.owner = 'office:prime-minister';
  for (const m of members) g.addMember(m);
  return g;
}

afterEach(() => vi.restoreAllMocks());

describe('requiresPackInstaller', () => {
  it('a committee member passes', async () => {
    stubCommittee(committeeWith(MEMBER));
    await expect(requiresPackInstaller.preload!(ctxFor(MEMBER))).resolves.toBe(true);
    expect(requiresPackInstaller(ctxFor(MEMBER), true)).toBeUndefined();
  });

  it('a non-member gets the diegetic decline', async () => {
    stubCommittee(committeeWith(MEMBER));
    await expect(requiresPackInstaller.preload!(ctxFor(STRANGER))).resolves.toBe(false);
    const msg = requiresPackInstaller(ctxFor(STRANGER), false);
    expect(msg).toMatch(/pack office does not recognize your commission/);
    expect(msg).toMatch(/Prime Minister/);
  });

  it('a WIZARD who is not a member is refused — the axis is membership, never wizardness', async () => {
    stubCommittee(committeeWith(MEMBER));
    const wiz = vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
    await expect(requiresPackInstaller.preload!(ctxFor(STRANGER))).resolves.toBe(false);
    expect(wiz).not.toHaveBeenCalled(); // the validator never even asks
  });

  it('a missing committee fails closed', async () => {
    stubCommittee(null);
    await expect(requiresPackInstaller.preload!(ctxFor(MEMBER))).resolves.toBe(false);
  });

  it('an unpathed giver fails closed', async () => {
    stubCommittee(committeeWith(MEMBER));
    await expect(requiresPackInstaller.preload!(ctxFor(null))).resolves.toBe(false);
  });
});
