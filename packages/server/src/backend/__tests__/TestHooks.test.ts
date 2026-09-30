/**
 * TestHooks — the test-only backend seams (login without Google, a
 * ready-made character, a known room). DB-free: `User.findById`, the
 * seed read and the row write are stubbed.
 */

import "../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestHooks } from '../TestHooks';
import Avatar from '../../mud/platform/agent/Avatar';
import { Template } from '../../mud/lib/stuff/Template';
import { TemplateApi } from '../../mud/api/template';
import EmbodyController from '../../mud/platform/idea/cmd/charactergen/EmbodyController';
import { StuffApi } from '../../mud/api/stuff';
import { User } from '../../mud/lib/identity/User';
import { AppApi } from '../../mud/api/app';

/**
 * The mint clones the SEED row through the real `StuffApi.clone`
 * channel. Stub it: this is a unit test of the hook's contract, not of
 * the clone pipeline (which has its own suite), and an unstubbed clone
 * here needs a booted world and a database.
 */
function stubSeedClone() {
  // The hook reads the seed row first (and refuses loudly when the
  // platform pack has not installed it), so the read is stubbed too.
  vi.spyOn(Template, 'findByPath').mockResolvedValue({
    path: Avatar.SEED_TEMPLATE_PATH,
    class: '/platform/agent/Avatar',
    data: {},
    hydratorClass: '/platform/idea/persistence/PersistentHydrator',
  } as never);
  // ⭐ `wearGarments` as well as `save`: the mint DRESSES the character
  // it mints (`TestHooks.#dress`, envelope W1 — a naked body spends
  // food on cold at room temperature). The stub stands in for a real
  // `Avatar`, which is a `Character` and has both.
  return vi.spyOn(StuffApi, 'clone').mockResolvedValue({
    save: vi.fn().mockResolvedValue(undefined),
    wearGarments: vi.fn().mockResolvedValue(undefined),
  } as never);
}

describe('TestHooks.provisionCharacter', () => {
  const ORIG_AUTH_MODE = process.env.AUTH_MODE;
  beforeEach(() => {
    // The mint path reads the spawn default from app config; mock the
    // cached read (no AppSettings boot warm in this unit test).
    vi.spyOn(AppApi, 'setting').mockReturnValue('/test/idea/warren');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    if (ORIG_AUTH_MODE === undefined) delete process.env.AUTH_MODE;
    else process.env.AUTH_MODE = ORIG_AUTH_MODE;
  });

  it('refuses unless AUTH_MODE=test', async () => {
    delete process.env.AUTH_MODE;
    await expect(TestHooks.provisionCharacter('u1')).rejects.toThrow(
      /test-only/,
    );
  });

  it('mints exactly one ready character for a fresh user — and writes NO template row', async () => {
    process.env.AUTH_MODE = 'test';
    const user = {
      _id: 'u1',
      playerIds: [] as string[],
      save: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(User, 'findById').mockResolvedValue(user as never);
    const tmplSave = vi
      .spyOn(TemplateApi, 'saveTemplate')
      .mockResolvedValue(undefined as never);
    const clone = stubSeedClone();

    await TestHooks.provisionCharacter('u1', 'Tester');
    expect(user.playerIds).toHaveLength(1);
    expect(user.save).toHaveBeenCalledTimes(1);

    // ⭐ The D17 shape (residences build): the mint CLONES THE SEED ROW
    // and stamps a per-player IDENTITY. It used to write a legacy
    // per-player template row, which is exactly the rowless
    // `templatePath` the identity split retired — so the strongest
    // assertion here is the negative one.
    expect(tmplSave).not.toHaveBeenCalled();
    // ⭐ One avatar clone, and the first aspiration's outfit HANDED TO
    // THE BODY — the test character is dressed as an enrolled one (a
    // naked body spends food on cold at room temperature; the fishing
    // drive found it collapsing at the seventh game hour).
    //
    // ⚠ This used to count `StuffApi.clone` calls, because the hook
    // cloned each garment itself. Since the envelope build (W1) the
    // recipe is `Character.wearGarments` — authored NPCs needed the
    // same thing and a second copy would have been the third — so what
    // this hook owns is WHICH outfit, and the assertion follows it
    // there. The wearing itself is `Character.wearGarments`'s own
    // suite.
    const outfit = EmbodyController.loadConfig().aspirations[0]?.outfit ?? [];
    expect(clone).toHaveBeenCalledTimes(1);
    const dressed = (await clone.mock.results[0]!.value) as {
      wearGarments: { mock: { calls: unknown[][] } };
    };
    expect(dressed.wearGarments.mock.calls).toHaveLength(1);
    expect(dressed.wearGarments.mock.calls[0]![0]).toEqual(outfit);
    const [seedPath, , opts] = clone.mock.calls[0]! as [
      string,
      unknown,
      { dataOverlay: Record<string, unknown>; asIdentityPath: string },
    ];
    expect(seedPath).toBe(Avatar.SEED_TEMPLATE_PATH);
    expect(opts.asIdentityPath).toBe(
      Avatar.getTemplatePath(user.playerIds[0]!),
    );
    // Spawn home injected from app config (defaultStartLocation).
    expect(opts.dataOverlay.startLocation).toBe('/test/idea/warren');
    expect(opts.dataOverlay.name).toBe('Tester');
  });

  it('honors a startLocation override (spawn-room pin for co-location E2E)', async () => {
    process.env.AUTH_MODE = 'test';
    const user = {
      _id: 'u1',
      playerIds: [] as string[],
      save: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(User, 'findById').mockResolvedValue(user as never);
    const clone = stubSeedClone();

    await TestHooks.provisionCharacter('u1', 'Tester', '/test/location/bar');
    // The override wins over the app-config default — the avatar is
    // pinned to the named singleton room rather than the lounge Warren.
    const opts = clone.mock.calls[0]![2] as {
      dataOverlay: Record<string, unknown>;
    };
    expect(opts.dataOverlay.startLocation).toBe('/test/location/bar');
  });

  it('is idempotent — no-op when the user already has a character', async () => {
    process.env.AUTH_MODE = 'test';
    const user = {
      _id: 'u1',
      playerIds: ['existing'],
      save: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(User, 'findById').mockResolvedValue(user as never);
    const tmplSave = vi
      .spyOn(TemplateApi, 'saveTemplate')
      .mockResolvedValue(undefined as never);

    await TestHooks.provisionCharacter('u1');
    expect(user.playerIds).toEqual(['existing']);
    expect(tmplSave).not.toHaveBeenCalled();
    expect(user.save).not.toHaveBeenCalled();
  });
});
