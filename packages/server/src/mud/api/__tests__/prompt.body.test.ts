/**
 * Wave 2: PromptApi body MessageFrame correlation.
 *
 * Push with `opts.body` set emits a `world.prompt` MessageFrame
 * carrying `payload: { promptId }` BEFORE the PromptEnvelope so
 * the client can correlate the long-form prose with the prompt.
 *
 * Push without body emits only the envelope; no MessageFrame.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromptApi } from '../prompt';
import { EventApi } from '../event';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { Stuff } from '../../lib/stuff/Stuff';
import { EventRegistry } from '../../obj/EventRegistry';
import { Interactive } from '../../obj/Interactive';
import { Avatar } from '../../obj/Avatar';
import { ConnectionApi } from '../connection';
import { Mml } from '../mml';

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/obj/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

async function makeAvatarInteractive(): Promise<{
  interactive: Interactive;
  avatar: Avatar;
}> {
  const avatar = await StuffApi.create(() => new Avatar());
  avatar.setName('Alice');
  const interactive = await StuffApi.create(
    () => new Interactive('sock-1', 'sess-1', { _id: 'u1' } as never),
  );
  ConnectionApi.transfer(interactive, avatar);
  return { interactive, avatar };
}

describe('PromptApi — body MessageFrame correlation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    PromptApi._clearAllForTesting();
  });

  it('push with body emits MessageFrame before PromptEnvelope', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();

    // Capture both prose MessageFrames (onMessage) and envelopes
    // (onEnvelope) to verify ordering and correlation.
    const events: Array<
      | { kind: 'frame'; topic: string; payload: unknown }
      | { kind: 'envelope'; type: string; promptId?: string }
    > = [];
    vi.spyOn(avatar, 'onMessage').mockImplementation((frame) => {
      events.push({
        kind: 'frame',
        topic: frame.topic,
        payload: frame.payload,
      });
    });
    vi.spyOn(avatar, 'onEnvelope').mockImplementation((tpl) => {
      events.push({
        kind: 'envelope',
        type: tpl.type,
        promptId: (tpl as { promptId?: string }).promptId,
      });
    });

    const p = PromptApi.text(interactive, 'Name?', {
      body: 'Please enter the name you want for your character.',
    });

    // Frame first, envelope second.
    expect(events).toHaveLength(2);
    expect(events[0]!.kind).toBe('frame');
    expect((events[0]! as { topic: string }).topic).toBe('world.prompt');
    expect(events[1]!.kind).toBe('envelope');
    expect((events[1]! as { type: string }).type).toBe('prompt');

    // Frame's payload carries the promptId; matches the envelope's.
    const framePayload = (events[0]! as { payload: { promptId: string } })
      .payload;
    const envelopePromptId = (events[1]! as { promptId: string }).promptId;
    expect(framePayload.promptId).toBe(envelopePromptId);

    // Cleanup.
    PromptApi.cancel(envelopePromptId);
    await expect(p).rejects.toThrow();
  });

  it('push with Mml body works the same way', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();

    const frames: unknown[] = [];
    vi.spyOn(avatar, 'onMessage').mockImplementation((frame) => {
      frames.push(frame);
    });
    vi.spyOn(avatar, 'onEnvelope').mockImplementation(() => {});

    const p = PromptApi.text(interactive, 'Name?', {
      body: Mml.compose`Please ${Mml.compose`enter`} your name.`,
    });

    expect(frames).toHaveLength(1);
    PromptApi.cancelAll(interactive, 'cancelled');
    await expect(p).rejects.toThrow();
  });

  it('push without body emits only the envelope', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();

    const frames: unknown[] = [];
    const envelopes: unknown[] = [];
    vi.spyOn(avatar, 'onMessage').mockImplementation((frame) => {
      frames.push(frame);
    });
    vi.spyOn(avatar, 'onEnvelope').mockImplementation((tpl) => {
      envelopes.push(tpl);
    });

    const p = PromptApi.text(interactive, 'Name?');
    expect(frames).toHaveLength(0);
    expect(envelopes).toHaveLength(1);
    PromptApi.cancelAll(interactive, 'cancelled');
    await expect(p).rejects.toThrow();
  });
});
