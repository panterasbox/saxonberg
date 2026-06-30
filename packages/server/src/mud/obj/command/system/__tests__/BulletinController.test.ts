/**
 * BulletinController — the `bulletin` verb maps the bound model onto
 * `BulletinApi.publish / edit / retract` (never the registry). Output is
 * captured by spying `Mml.fromMarkup` (it calls through) + a no-op scene
 * chainable, the ConfigController.test.ts harness. `BulletinApi` and
 * `AppApi.setting` are stubbed — no Mongo, no warmed AppSettings.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import BulletinController from '../BulletinController';
import { BulletinApi } from '../../../../api/bulletin';
import { AppApi } from '../../../../api/app';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import type { CommandContext, CommandModel } from '../../../../api/command';

interface BulletinModel extends CommandModel {
  headline?: string;
  body?: string;
  id?: string;
  realm?: string;
  kind?: string;
  pin?: boolean;
  expires?: string;
}

/** A minimal Bulletin stand-in (only `getBulletinId` is read by the controller). */
function fakeBulletin(id: string): { getBulletinId(): string } {
  return { getBulletinId: () => id };
}

describe('BulletinController', () => {
  let ctrl: BulletinController;
  let ctx: CommandContext;
  let output: string[];
  let note: ReturnType<typeof vi.fn>;
  let publish: MockInstance<(...args: never[]) => unknown>;
  let edit: MockInstance<(...args: never[]) => unknown>;
  let retract: MockInstance<(...args: never[]) => unknown>;

  beforeEach(() => {
    vi.restoreAllMocks();

    // Generous length caps by default — individual tests override.
    vi.spyOn(AppApi, 'setting').mockReturnValue('100000');

    publish = vi
      .spyOn(BulletinApi, 'publish')
      .mockResolvedValue(fakeBulletin('b-1') as never);
    edit = vi
      .spyOn(BulletinApi, 'edit')
      .mockResolvedValue(fakeBulletin('b-1') as never);
    retract = vi
      .spyOn(BulletinApi, 'retract')
      .mockResolvedValue(fakeBulletin('b-1') as never);

    ctrl = makeStuff(() => new BulletinController());

    output = [];
    const realFromMarkup = Mml.fromMarkup.bind(Mml);
    vi.spyOn(Mml, 'fromMarkup').mockImplementation((s: string) => {
      output.push(s);
      return realFromMarkup(s);
    });
    vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
      const b: Record<string, unknown> = {};
      b.topic = () => b;
      b.toSelf = () => b;
      b.send = () => {};
      return b as never;
    });

    note = vi.fn();
    ctx = { commandGiver: {} as never, note } as unknown as CommandContext;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function run(model: BulletinModel) {
    return ctrl.execute(model as never, ctx);
  }

  it('publish maps the model onto BulletinApi.publish (no actor passed)', async () => {
    await run({ headline: 'Server maintenance', realm: 'ooc', kind: 'notice' });
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith({
      headline: 'Server maintenance',
      realm: 'ooc',
      kind: 'notice',
      pinned: false,
      expiresAt: 0,
    });
    expect(note).not.toHaveBeenCalled();
    expect(output.join('\n')).toContain("Published bulletin 'b-1'");
  });

  it('reads the overlaid body side-channel into the publish request', async () => {
    await run({
      headline: 'Patch notes',
      body: 'The long-form MML body.',
      realm: 'world',
      kind: 'changelog',
    });
    expect(publish).toHaveBeenCalledWith({
      headline: 'Patch notes',
      realm: 'world',
      kind: 'changelog',
      pinned: false,
      expiresAt: 0,
      body: 'The long-form MML body.',
    });
  });

  it('threads --pin and a parsed --expires into the request', async () => {
    const before = Date.now();
    await run({
      headline: 'Event tonight',
      realm: 'ooc',
      kind: 'event',
      pin: true,
      expires: '2h',
    });
    expect(publish).toHaveBeenCalledTimes(1);
    const arg = publish.mock.calls[0]![0] as unknown as {
      pinned: boolean;
      expiresAt: number;
    };
    expect(arg.pinned).toBe(true);
    expect(arg.expiresAt).toBeGreaterThanOrEqual(before + 2 * 3_600_000);
  });

  it('rejects an over-long headline (void return + ctx.note), no publish', async () => {
    vi.spyOn(AppApi, 'setting').mockReturnValue('5');
    const result = await run({
      headline: 'this headline is far too long',
      realm: 'ooc',
      kind: 'notice',
    });
    expect(result).toBeUndefined();
    expect(publish).not.toHaveBeenCalled();
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'controller-rejected',
        reason: 'headline-too-long',
      }),
    );
  });

  it('rejects an unknown realm', async () => {
    await run({ headline: 'h', realm: 'bogus', kind: 'notice' });
    expect(publish).not.toHaveBeenCalled();
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'controller-rejected',
        reason: 'bad-realm',
      }),
    );
  });

  it('rejects a missing headline', async () => {
    await run({ realm: 'ooc', kind: 'notice' });
    expect(publish).not.toHaveBeenCalled();
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'headline-required' }),
    );
  });

  it('edit maps id + patch onto BulletinApi.edit', async () => {
    await run({
      subcommand: 'edit',
      id: 'b-1',
      headline: 'Revised headline',
      pin: true,
    } as BulletinModel);
    expect(edit).toHaveBeenCalledTimes(1);
    expect(edit).toHaveBeenCalledWith('b-1', {
      headline: 'Revised headline',
      pinned: true,
    });
    expect(note).not.toHaveBeenCalled();
  });

  it('edit on an unknown id rejects', async () => {
    edit.mockResolvedValue(null as never);
    await run({
      subcommand: 'edit',
      id: 'missing',
      headline: 'x',
    } as BulletinModel);
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'no-such-bulletin' }),
    );
  });

  it('retract maps id onto BulletinApi.retract', async () => {
    await run({ subcommand: 'retract', id: 'b-1' } as BulletinModel);
    expect(retract).toHaveBeenCalledWith('b-1');
    expect(note).not.toHaveBeenCalled();
    expect(output.join('\n')).toContain("Retracted bulletin 'b-1'");
  });
});
