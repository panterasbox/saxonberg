/**
 * PressController — the `press` verb maps the bound model onto
 * `PressApi.publish / edit / retract` (never the registry). Output is
 * captured by spying `Mml.fromMarkup` (it calls through) + a no-op scene
 * chainable, the ConfigController.test.ts harness. `PressApi` and
 * `AppApi.setting` are stubbed — no Mongo, no warmed AppSettings.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import PressController from '../PressController';
import { PressApi } from '../../../../api/press';
import { AppApi } from '../../../../api/app';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import type { CommandContext, CommandModel } from '../../../../api/command';

const PUBLISHER = '/compact/press';

interface ReleaseModel extends CommandModel {
  headline?: string;
  body?: string;
  id?: string;
  as?: string;
  visibility?: string;
  source?: string;
  kind?: string;
  pin?: boolean;
  expires?: string;
}

/** A minimal Release stand-in (only `getReleaseId` is read by the controller). */
function fakeRelease(id: string): { getReleaseId(): string } {
  return { getReleaseId: () => id };
}

describe('PressController', () => {
  let ctrl: PressController;
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
      .spyOn(PressApi, 'publish')
      .mockResolvedValue(fakeRelease('b-1') as never);
    edit = vi
      .spyOn(PressApi, 'edit')
      .mockResolvedValue(fakeRelease('b-1') as never);
    retract = vi
      .spyOn(PressApi, 'retract')
      .mockResolvedValue(fakeRelease('b-1') as never);

    ctrl = makeStuff(() => new PressController());

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

  function run(model: ReleaseModel) {
    return ctrl.execute(model as never, ctx);
  }

  it('⚠ refuses to guess a publisher — --as is required, never defaulted', async () => {
    // Picking one would turn a refusal ("you hold no publishing position
    // anywhere") into a silent downgrade ("...so here is the one you do").
    await run({ headline: 'Server maintenance' });
    expect(publish).not.toHaveBeenCalled();
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'publisher-required' }),
    );
  });

  it('publish maps the model onto PressApi.publish (no actor passed)', async () => {
    await run({
      as: PUBLISHER,
      headline: 'Server maintenance',
      kind: 'notice',
    });
    expect(publish).toHaveBeenCalledTimes(1);
    // ⚠ No `realm` on the request — it derives from the publisher, so the
    // controller has nothing to pass and no way to override it.
    expect(publish).toHaveBeenCalledWith({
      publisher: PUBLISHER,
      headline: 'Server maintenance',
      kind: 'notice',
      pinned: false,
      expiresAt: 0,
    });
    expect(note).not.toHaveBeenCalled();
    expect(output.join('\n')).toContain("Published release 'b-1'");
  });

  it('reads the overlaid body side-channel into the publish request', async () => {
    await run({
      as: PUBLISHER,
      headline: 'Patch notes',
      body: 'The long-form MML body.',
      kind: 'changelog',
    });
    expect(publish).toHaveBeenCalledWith({
      publisher: PUBLISHER,
      headline: 'Patch notes',
      kind: 'changelog',
      pinned: false,
      expiresAt: 0,
      body: 'The long-form MML body.',
    });
  });

  it('threads --pin and a parsed --expires into the request', async () => {
    const before = Date.now();
    await run({
      as: PUBLISHER,
      headline: 'Event tonight',
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
      as: PUBLISHER,
      headline: 'this headline is far too long',
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

  it('rejects an unknown visibility', async () => {
    await run({
      as: PUBLISHER,
      headline: 'h',
      visibility: 'everyone-on-earth',
      kind: 'notice',
    });
    expect(publish).not.toHaveBeenCalled();
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'controller-rejected',
        reason: 'bad-visibility',
      }),
    );
  });

  it('threads a --visibility narrowing and a repost --source through', async () => {
    await run({
      as: PUBLISHER,
      headline: 'What the Ministry said',
      kind: 'repost',
      visibility: 'members',
      source: '/compact/executive',
    });
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'repost',
        visibility: 'members',
        source: '/compact/executive',
      }),
    );
  });

  it('rejects a missing headline', async () => {
    await run({ as: PUBLISHER, kind: 'notice' });
    expect(publish).not.toHaveBeenCalled();
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'headline-required' }),
    );
  });

  it('edit maps id + patch onto PressApi.edit', async () => {
    await run({
      subcommand: 'edit',
      id: 'b-1',
      headline: 'Revised headline',
      pin: true,
    } as ReleaseModel);
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
    } as ReleaseModel);
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'no-such-release' }),
    );
  });

  it('retract maps id onto PressApi.retract', async () => {
    await run({ subcommand: 'retract', id: 'b-1' } as ReleaseModel);
    expect(retract).toHaveBeenCalledWith('b-1');
    expect(note).not.toHaveBeenCalled();
    expect(output.join('\n')).toContain("Retracted release 'b-1'");
  });
});
