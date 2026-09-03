/**
 * Wave 2: mqlMany substrate-side bounds enforcement.
 * - Under-min selection → prompt-validation-failed, prompt alive.
 * - Over-max selection → prompt-validation-failed, prompt alive.
 * - Malformed JSON → prompt-validation-failed, prompt alive.
 * - Non-string-array payload → prompt-validation-failed.
 * - In-bounds → resolves.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromptApi } from '../prompt';
import { EventApi } from '../event';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { Stuff } from '../../lib/stuff/Stuff';
import EventRegistry from '../../platform/idea/EventRegistry';
import Interactive from '../../platform/idea/Interactive';
import Avatar from '../../platform/agent/Avatar';
import Thing from '../../lib/stuff/Thing';

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/platform/idea/EventRegistry');
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
  interactive.transferTo(avatar);
  return { interactive, avatar };
}

interface CapturedEnvelope {
  type: string;
  promptId?: string;
  outcome?: { notes: Array<{ kind: string; message?: string }> };
}

function captureEnvelopes(avatar: Avatar): CapturedEnvelope[] {
  const collected: CapturedEnvelope[] = [];
  vi.spyOn(avatar, 'onEnvelope').mockImplementation((tpl) => {
    collected.push(tpl as unknown as CapturedEnvelope);
  });
  return collected;
}

describe('PromptApi.mqlMany — bounds enforcement', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    PromptApi._clearAllForTesting();
  });

  it('under-min selection emits validation-failed; prompt stays alive', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    const a = await StuffApi.create(() => new Thing());
    const b = await StuffApi.create(() => new Thing());
    const envelopes = captureEnvelopes(avatar);

    const p = interactive.promptMqlMany('Pick', [a, b], { min: 2, max: 2 });
    const id = envelopes[0]!.promptId!;
    envelopes.length = 0;

    // Selecting 1 is under min: 2.
    interactive.handlePromptResponse({
      promptId: id,
      response: JSON.stringify([a.stuffId]),
    });
    expect(envelopes).toHaveLength(1);
    const note = envelopes[0]!.outcome!.notes[0]!;
    expect(note.kind).toBe('prompt-validation-failed');
    expect(note.message).toContain('min');
    expect(PromptApi._getResolverCountForTesting()).toBe(1);

    // Valid response resolves.
    envelopes.length = 0;
    interactive.handlePromptResponse({
      promptId: id,
      response: JSON.stringify([a.stuffId, b.stuffId]),
    });
    await expect(p).resolves.toEqual([a, b]);
  });

  it('over-max selection emits validation-failed', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    const a = await StuffApi.create(() => new Thing());
    const b = await StuffApi.create(() => new Thing());
    const c = await StuffApi.create(() => new Thing());
    const envelopes = captureEnvelopes(avatar);

    const p = interactive.promptMqlMany('Pick', [a, b, c], { max: 2 });
    const id = envelopes[0]!.promptId!;
    envelopes.length = 0;

    interactive.handlePromptResponse({
      promptId: id,
      response: JSON.stringify([a.stuffId, b.stuffId, c.stuffId]),
    });
    const note = envelopes[0]!.outcome!.notes[0]!;
    expect(note.kind).toBe('prompt-validation-failed');
    expect(note.message).toContain('max');

    // Cleanup.
    PromptApi.cancel(id);
    await expect(p).rejects.toThrow();
  });

  it('malformed JSON emits validation-failed', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    const a = await StuffApi.create(() => new Thing());
    const envelopes = captureEnvelopes(avatar);

    const p = interactive.promptMqlMany('Pick', [a]);
    const id = envelopes[0]!.promptId!;
    envelopes.length = 0;

    interactive.handlePromptResponse({
      promptId: id,
      response: 'not-json',
    });
    expect(envelopes[0]!.outcome!.notes[0]!.kind).toBe('prompt-validation-failed');
    expect(envelopes[0]!.outcome!.notes[0]!.message).toContain('JSON');
    PromptApi.cancel(id);
    await expect(p).rejects.toThrow();
  });

  it('non-string-array payload emits validation-failed', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    const a = await StuffApi.create(() => new Thing());
    const envelopes = captureEnvelopes(avatar);

    const p = interactive.promptMqlMany('Pick', [a]);
    const id = envelopes[0]!.promptId!;
    envelopes.length = 0;

    interactive.handlePromptResponse({
      promptId: id,
      response: JSON.stringify([1, 2, 3]),  // numbers, not strings
    });
    expect(envelopes[0]!.outcome!.notes[0]!.kind).toBe('prompt-validation-failed');
    PromptApi.cancel(id);
    await expect(p).rejects.toThrow();
  });

  it('mqlMany without bounds opts accepts any size', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    const a = await StuffApi.create(() => new Thing());
    const b = await StuffApi.create(() => new Thing());
    const envelopes = captureEnvelopes(avatar);

    const p = interactive.promptMqlMany('Pick', [a, b]);
    const id = envelopes[0]!.promptId!;
    interactive.handlePromptResponse({
      promptId: id,
      response: JSON.stringify([]),  // empty array OK when no min
    });
    await expect(p).resolves.toEqual([]);
  });
});
