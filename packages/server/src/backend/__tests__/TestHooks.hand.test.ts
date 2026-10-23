/**
 * TestHooks.handCharacter — a drive's people handed a coat for the winter
 * they will stand in (the ceramics drives lost the brickmaker and the
 * founder to one night at the brickfield, run 26). The garment lands in
 * the character's hands; wearing it is the character's own act.
 */

import '../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestHooks } from '../TestHooks';
import { PlayerApi } from '../../mud/api/player';
import { StuffApi } from '../../mud/api/stuff';
import { ContainmentApi } from '../../mud/api/containment';
import { MixinApi } from '../../mud/api/mixin';
import type Avatar from '../../mud/lib/character/Avatar';
import type { Stuff } from '../../mud/lib/stuff/Stuff';

describe('TestHooks.handCharacter', () => {
  beforeEach(() => {
    process.env.AUTH_MODE = 'test';
  });
  afterEach(() => {
    vi.restoreAllMocks();
    process.env.AUTH_MODE = 'test';
  });

  it('⭐ clones the garment into the character and returns its id', async () => {
    const body = { stuffId: 'body' } as unknown as Avatar;
    const coat = { stuffId: 'coat-1' } as unknown as Stuff;
    vi.spyOn(PlayerApi, 'findAvatarByName').mockReturnValue(body);
    vi.spyOn(MixinApi, 'isContainer').mockReturnValue(true);
    vi.spyOn(MixinApi, 'isContainable').mockReturnValue(true);
    const clone = vi.spyOn(StuffApi, 'clone').mockResolvedValue(coat as never);
    const move = vi.spyOn(ContainmentApi, 'move').mockImplementation(() => undefined);
    await expect(TestHooks.handCharacter('wire-brickmaker', '/stuff/thing/clothes/greatcoat')).resolves.toBe('coat-1');
    expect(clone).toHaveBeenCalledWith('/stuff/thing/clothes/greatcoat', undefined, undefined);
    expect(move).toHaveBeenCalledWith(coat, body);
  });

  it('⭐ a data overlay rides the clone — ore handed with the grade the face would stamp', async () => {
    const body = { stuffId: 'body' } as unknown as Avatar;
    const ore = { stuffId: 'ore-1' } as unknown as Stuff;
    vi.spyOn(PlayerApi, 'findAvatarByName').mockReturnValue(body);
    vi.spyOn(MixinApi, 'isContainer').mockReturnValue(true);
    vi.spyOn(MixinApi, 'isContainable').mockReturnValue(true);
    const clone = vi.spyOn(StuffApi, 'clone').mockResolvedValue(ore as never);
    vi.spyOn(ContainmentApi, 'move').mockImplementation(() => undefined);
    await TestHooks.handCharacter('wire-liner', '/x/copper-ore', { grade: 0.3 });
    expect(clone).toHaveBeenCalledWith('/x/copper-ore', undefined, { dataOverlay: { grade: 0.3 } });
  });

  it('⚠ says so when nobody answers to the handle', async () => {
    vi.spyOn(PlayerApi, 'findAvatarByName').mockReturnValue(undefined);
    await expect(TestHooks.handCharacter('nobody', '/stuff/thing/clothes/greatcoat')).rejects.toThrow(/no resident character/i);
  });

  it('⛔ refuses outright when AUTH_MODE is not test', async () => {
    delete process.env.AUTH_MODE;
    await expect(TestHooks.handCharacter('wire-brickmaker', '/x')).rejects.toThrow(/test-only/i);
  });
});
