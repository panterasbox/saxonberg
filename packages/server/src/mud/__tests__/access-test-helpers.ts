/**
 * Test helpers for the access substrate.
 *
 * `seedCoreMembership` ensures the `AccessRegistry` is cloned, finds
 * the bootstrap-seeded `'core'` Group, adds `playerId` to its member
 * list, and saves. `clearCoreMembership` wipes the member list.
 *
 * These replace the retired `_MqlAdminFlag.granter` seam — tests that
 * used to flip the granter now seed group membership directly.
 *
 * @internal
 */

import { StuffApi } from '../api/stuff';
import { GroupApi } from '../api/group';

const ACCESS_REGISTRY_PATH = '/obj/AccessRegistry';

/** Ensure the AccessRegistry is cloned (idempotent). */
async function ensureAccessRegistry(): Promise<void> {
  if (StuffApi.findByTemplatePath(ACCESS_REGISTRY_PATH)) return;
  await StuffApi.clone(ACCESS_REGISTRY_PATH);
}

/**
 * Seed `playerId` as a `'core'` member with optional role (default
 * `'member'`). Triggers AccessRegistry bootstrap when needed.
 */
export async function seedCoreMembership(
  playerId: string,
  role: 'owner' | 'admin' | 'member' = 'member',
): Promise<void> {
  await ensureAccessRegistry();
  const reg = await GroupApi.registry();
  const provider = reg.managed();
  const core = await provider.findByName('core');
  if (!core) throw new Error('core group not seeded');
  core.addMember(playerId, role);
  await core.save();
}

/**
 * Wipe the `'core'` member list. Idempotent — no-op if the group
 * isn't seeded yet.
 */
export async function clearCoreMembership(): Promise<void> {
  const reg = await GroupApi.registry();
  const provider = reg.managed();
  const core = await provider.findByName('core');
  if (!core) return;
  core.memberIds = [];
  core.memberRoles = [];
  await core.save();
}

/**
 * Seed `playerId` as a `'developers'` member. Used by tests that
 * exercise the developer axis (eval / reload / source-tree writes).
 */
export async function seedDeveloperMembership(playerId: string): Promise<void> {
  await ensureAccessRegistry();
  const reg = await GroupApi.registry();
  const provider = reg.managed();
  const developers = await provider.findByName('developers');
  if (!developers) throw new Error('developers group not seeded');
  developers.addMember(playerId, 'member');
  await developers.save();
}
