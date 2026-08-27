/**
 * requiresPackInstaller — the `pack` verb's gate: holding the executive
 * (`/compact/executive`, titled to the Office of the Prime Minister), and
 * NOTHING else. A holder passes; a non-holder gets the diegetic decline; a
 * WIZARD who holds nothing is refused (the axis is title, never
 * wizardness); an unpathed giver fails closed. The title dispatch itself
 * (staff-or-head) is AccessRegistry's, tested beside it.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import requiresPackInstaller from '../requiresPackInstaller';
import { AccessApi } from '../../../../api/access';
import type { CommandContext } from '../../../../api/command';

const MEMBER = '/platform/agent/Avatar/member';
const STRANGER = '/platform/agent/Avatar/stranger';

function ctxFor(path: string | null): CommandContext {
  return {
    verb: 'pack',
    commandGiver: { getTemplatePath: () => path, getIdentityPath: () => path },
  } as unknown as CommandContext;
}

function stubExecutive(...holders: string[]) {
  return vi.spyOn(AccessApi, 'canAtPath').mockImplementation(
    async (subject, action, path) =>
      action === 'install' &&
      path === '/compact/executive' &&
      holders.includes((subject as { getIdentityPath(): string }).getIdentityPath()),
  );
}

afterEach(() => vi.restoreAllMocks());

describe('requiresPackInstaller', () => {
  it('somebody holding the executive passes', async () => {
    const can = stubExecutive(MEMBER);
    await expect(requiresPackInstaller.preload!(ctxFor(MEMBER))).resolves.toBe(true);
    expect(can).toHaveBeenCalledWith(expect.anything(), 'install', '/compact/executive');
    expect(requiresPackInstaller(ctxFor(MEMBER), true)).toBeUndefined();
  });

  it('a non-holder gets the diegetic decline', async () => {
    stubExecutive(MEMBER);
    await expect(requiresPackInstaller.preload!(ctxFor(STRANGER))).resolves.toBe(false);
    const msg = requiresPackInstaller(ctxFor(STRANGER), false);
    expect(msg).toMatch(/pack office does not recognize your commission/);
    expect(msg).toMatch(/Prime Minister/);
  });

  it('a WIZARD who holds nothing is refused — the axis is title, never wizardness', async () => {
    stubExecutive(MEMBER);
    const wiz = vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
    await expect(requiresPackInstaller.preload!(ctxFor(STRANGER))).resolves.toBe(false);
    expect(wiz).not.toHaveBeenCalled(); // the validator never even asks
  });

  it('an unpathed giver fails closed without asking', async () => {
    const can = stubExecutive(MEMBER);
    await expect(requiresPackInstaller.preload!(ctxFor(null))).resolves.toBe(false);
    expect(can).not.toHaveBeenCalled();
  });
});
