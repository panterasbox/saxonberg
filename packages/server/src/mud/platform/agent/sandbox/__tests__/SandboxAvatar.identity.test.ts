/**
 * ⭐⭐ The wire body projects the player through the METHOD, and is no
 * longer FILED under the identity it projects.
 *
 * Both halves matter and the order they landed in is the whole fix.
 *
 * ⚠⚠ The override asserted here was described in `SandboxAvatar`'s
 * header and in `Stuff.getIdentityPath`'s docblock for a year before it
 * existed. The projection was carried entirely by a raw
 * `asIdentityPath` stamp on the clone — which files the wire body in
 * the registry under the player's own identity, the one thing
 * `Stuff.ts` says must never happen. With a circle open the wire body
 * and the parked field body shared one exact index bucket, so
 * `findByTemplatePath('/platform/agent/Avatar/<pid>')` threw *expected
 * singleton, found 2* for that player mid-visit.
 *
 * ⛔ And removing the stamp WITHOUT the override would have been worse
 * than the defect: the body would answer with its own row, and every
 * in-circle act would attribute to
 * `/platform/agent/sandbox/SandboxAvatar` instead of to the person —
 * silently, for every visitor, breaking the promise `sandbox.md` makes
 * hardest.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  seedKernelContentStore,
  stampTemplatePathForTest,
} from '../../../../lib/security/__tests__/test-setup';
import { SandboxApi } from '../../../../api/sandbox';
import { StuffApi } from '../../../../api/stuff';
import { PlayerApi } from '../../../../api/player';
import { ExecutionContextApi, OMNI_SCOPE } from '../../../../api/execution-context';
import { Stuff } from '../../../../lib/stuff/Stuff';
import Avatar from '../../PrimaryAvatar';
import SandboxAvatar from '../SandboxAvatar';
import Interactive from '../../../idea/Interactive';
import EventRegistry from '../../../idea/EventRegistry';
import { Document } from '../../../../lib/persistence/Document';
import { ShadowApi } from '../../../../api/shadow';
import { EventApi } from '../../../../api/event';

vi.setConfig({ testTimeout: 20_000 });

const PLAYER = 'wire-identity-tester';
const IDENTITY = Avatar.getTemplatePath(PLAYER);
const WIRE_ROW = '/platform/agent/sandbox/SandboxAvatar';

let sockSeq = 0;

function asSystem<T>(fn: () => T): T {
  return ExecutionContextApi.runRoot(null, 'test.system', fn, {
    circleScope: OMNI_SCOPE,
  });
}

async function makeRig(): Promise<{ avatar: Avatar }> {
  const avatar = await StuffApi.create(() => new Avatar(), {
    playerId: PLAYER,
  });
  // ⚠ `stampTemplatePathForTest`, not a bare `_stampTemplatePath`: the
  // bare seam does not re-key the registry index (only
  // `Stuff.setTemplatePath` does, via `_reindexTemplatePath`), so a
  // fixture that stamps after registering leaves the body FILED
  // NOWHERE — and an assertion about the player's index bucket would
  // then pass against an empty bucket for the wrong reason. The helper
  // unregisters and re-registers, which is what production's
  // stamp-before-register ordering achieves.
  stampTemplatePathForTest(avatar as unknown as Stuff, IDENTITY);
  avatar.setName('Wirey');
  const interactive = await StuffApi.create(
    () =>
      new Interactive(`sock-${++sockSeq}`, `sess-${sockSeq}`, {
        _id: 'u1',
      } as never),
  );
  interactive.transferTo(avatar);
  return { avatar };
}

beforeEach(async () => {
  seedKernelContentStore([
    {
      path: '/platform/location/sandbox/CircleFloor',
      class: '/platform/location/sandbox/CircleFloor',
      data: {},
    },
    { path: WIRE_ROW, class: WIRE_ROW, data: { playerId: '' } },
  ]);
  // A body that knows its own playerId resolves its own identity path,
  // so the persistence spine engages at `onCreate` and wants the
  // resolver a booted world wires (the crossing suite's note).
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
  StuffApi.clearAll();
  ShadowApi._clearAllForTesting();
  EventApi._clearAllForTesting();
  ExecutionContextApi._clearForTesting();
  await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/platform/idea/EventRegistry');
    return r;
  });
});

afterEach(async () => {
  const session = SandboxApi.sessionForScope(`/home/${PLAYER}`);
  if (session) await SandboxApi.closeSession(`/home/${PLAYER}`);
  ExecutionContextApi._clearForTesting();
  StuffApi.clearAll();
  vi.restoreAllMocks();
});

describe('the projection is the method', () => {
  it('⭐⭐ the wire body answers with the PLAYER\'s identity', async () => {
    const { avatar } = await makeRig();
    await SandboxApi.enter(avatar);
    const body = SandboxApi.activeBodyFor(PLAYER)!;

    expect(body).toBeInstanceOf(SandboxAvatar);
    expect(body.getIdentityPath()).toBe(IDENTITY);
    expect(body.getIdentityPath()).toBe(avatar.getIdentityPath());
  });

  it('⭐⭐ and carries NO identity stamp — the slot is empty', async () => {
    const { avatar } = await makeRig();
    await SandboxApi.enter(avatar);
    const body = SandboxApi.activeBodyFor(PLAYER)!;

    // A `*.test.ts` may call the gated stamp seam. The raw slot is what
    // the registry index reads, and it must be empty for a wire body.
    expect(Stuff._identityStampOf(body as unknown as Stuff)).toBeNull();
    expect(body.getTemplatePath()).toBe(WIRE_ROW);
  });

  it('⭐⭐ the player\'s index bucket holds ONE body, the field one', async () => {
    const { avatar } = await makeRig();
    await SandboxApi.enter(avatar);

    const filed = StuffApi.findByIdentityPath(IDENTITY);
    expect(filed).toHaveLength(1);
    expect(filed[0]).toBe(avatar);
    // The read that used to throw *expected singleton, found 2* for a
    // player standing inside their own circle.
    expect(() => StuffApi.findByTemplatePath(IDENTITY)).not.toThrow();
    expect(StuffApi.findByTemplatePath(IDENTITY)).toBe(avatar);
  });

  it('the wire body is filed under its OWN row, where it belongs', async () => {
    const { avatar } = await makeRig();
    await SandboxApi.enter(avatar);
    const body = SandboxApi.activeBodyFor(PLAYER)!;

    expect(StuffApi.findByIdentityPath(WIRE_ROW)).toContain(body);
    expect(StuffApi.findAllByTemplatePath(WIRE_ROW)).toContain(body);
  });

  it('⭐⭐ the OVERRIDE is what carries it — the row would be wrong', async () => {
    const { avatar } = await makeRig();
    await SandboxApi.enter(avatar);
    const body = SandboxApi.activeBodyFor(PLAYER)!;

    // With the stamp gone, `getIdentityPath()`'s default would answer
    // with the body's own template path. Every identity-keyed reader —
    // the belief viewer key, the chronicle, the transcript, grants,
    // chattel stamps, the snapshot owner — reads the METHOD, so if the
    // override were missing they would all attribute in-circle acts to
    // this row, pooling every visitor's history into one. The two
    // strings differing is what makes the override load-bearing rather
    // than decorative.
    expect(body.getTemplatePath()).toBe(WIRE_ROW);
    expect(body.getIdentityPath()).not.toBe(body.getTemplatePath());
    expect(body.getIdentityPath()).toBe(IDENTITY);
  });

  it('the projection is DERIVED from playerId, not carried', async () => {
    const { avatar } = await makeRig();
    await SandboxApi.enter(avatar);
    const body = SandboxApi.activeBodyFor(PLAYER)!;

    // `playerId` lands on the clone overlay in hydration Phase 1,
    // before `onCreate`, so it is in place by the time anything asks.
    expect(body.getPlayerId()).toBe(PLAYER);
    expect(body.getIdentityPath()).toBe(Avatar.getTemplatePath(body.getPlayerId()));
  });

  it('the parked field body keeps the PlayerApi slot, as before', async () => {
    const { avatar } = await makeRig();
    await SandboxApi.enter(avatar);
    asSystem(() => {
      expect(PlayerApi.findAvatarByPlayerId(PLAYER)).toBe(avatar);
    });
  });
});
