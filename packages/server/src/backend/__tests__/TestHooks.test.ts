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
import { User } from '../../mud/lib/identity/User';
import { AppApi } from '../../mud/api/app';

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

  it('mints exactly one ready character for a fresh user', async () => {
    process.env.AUTH_MODE = 'test';
    const user = {
      _id: 'u1',
      playerIds: [] as string[],
      save: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(User, 'findById').mockResolvedValue(user as never);
    // Test seam writes a LEGACY-style template row (migrated to a
    // snapshot on first login by `materializeAvatar` — see the
    // method doc). Mock the seed read + the row write.
    vi.spyOn(Template, 'findByPath').mockResolvedValue({
      path: Avatar.SEED_TEMPLATE_PATH,
      class: '/platform/agent/Avatar',
      data: {},
      hydratorClass: '/platform/idea/persistence/PersistentHydrator',
    } as never);
    const tmplSave = vi
      .spyOn(TemplateApi, 'saveTemplate')
      .mockResolvedValue(undefined as never);

    await TestHooks.provisionCharacter('u1', 'Tester');
    expect(user.playerIds).toHaveLength(1);
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(tmplSave).toHaveBeenCalledTimes(1);
    const [path, , data] = tmplSave.mock.calls[0]! as [
      string,
      unknown,
      Record<string, unknown>,
    ];
    expect(path).toMatch(/^\/platform\/agent\/Avatar\//);
    // Spawn home injected from app config (defaultStartLocation).
    expect(data.startLocation).toBe('/test/idea/warren');
  });

  it('honors a startLocation override (spawn-room pin for co-location E2E)', async () => {
    process.env.AUTH_MODE = 'test';
    const user = {
      _id: 'u1',
      playerIds: [] as string[],
      save: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(User, 'findById').mockResolvedValue(user as never);
    vi.spyOn(Template, 'findByPath').mockResolvedValue({
      path: Avatar.SEED_TEMPLATE_PATH,
      class: '/platform/agent/Avatar',
      data: {},
      hydratorClass: '/platform/idea/persistence/PersistentHydrator',
    } as never);
    const tmplSave = vi
      .spyOn(TemplateApi, 'saveTemplate')
      .mockResolvedValue(undefined as never);

    await TestHooks.provisionCharacter('u1', 'Tester', '/test/location/bar');
    // The override wins over the app-config default — the avatar is
    // pinned to the named singleton room rather than the lounge Warren.
    const data = tmplSave.mock.calls[0]![2] as Record<string, unknown>;
    expect(data.startLocation).toBe('/test/location/bar');
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
