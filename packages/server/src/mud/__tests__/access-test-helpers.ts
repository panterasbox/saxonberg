/**
 * Test helpers for the access substrate.
 *
 * `grantTestTitle` titles a fixture extent to a fixture group and puts
 * `playerId` on it — the way a test gives a subject authority over a
 * path now that there is no state default (content-packs wave 3: an
 * untitled path is nobody's). `seedWizardMembership` is the orthogonal
 * code-trust axis.
 *
 * @internal
 */

import { StuffApi } from '../api/stuff';
import { GroupApi } from '../api/group';
import { ParcelApi } from '../api/parcel';

const ACCESS_REGISTRY_PATH = '/obj/AccessRegistry';

/** Ensure the AccessRegistry is cloned (idempotent). */
async function ensureAccessRegistry(): Promise<void> {
  if (StuffApi.findByTemplatePath(ACCESS_REGISTRY_PATH)) return;
  await StuffApi.clone(ACCESS_REGISTRY_PATH);
}

/**
 * Title `extent` (a fixture path, e.g. `/test/<name>`) to the managed
 * group `groupName` (minted if absent) and make `playerId` a member of
 * it with `role`. Idempotent.
 */
export async function grantTestTitle(
  extent: string,
  groupName: string,
  playerId: string,
  role: 'owner' | 'admin' | 'member' = 'member',
): Promise<void> {
  await ensureAccessRegistry();
  await ParcelApi.grant({ extent, holder: { kind: 'group', name: groupName } });
  const reg = await GroupApi.registry();
  const provider = reg.managed();
  const group = await provider.findByName(groupName);
  if (!group) throw new Error(`grantTestTitle: group '${groupName}' was not minted`);
  group.addMember(playerId, role);
  await group.save();
  if (group._id) provider.fireChange(group._id);
}

/**
 * Seed `playerId` as a `'wizards'` member. Used by tests that
 * exercise the wizard (code-trust) axis (eval / reload / source-tree
 * writes / the code-naming-field gate).
 */
export async function seedWizardMembership(playerId: string): Promise<void> {
  await ensureAccessRegistry();
  const reg = await GroupApi.registry();
  const provider = reg.managed();
  const wizards = await provider.findByName('wizards');
  if (!wizards) throw new Error('wizards group not seeded');
  wizards.addMember(playerId, 'member');
  await wizards.save();
}
