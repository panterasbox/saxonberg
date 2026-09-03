/**
 * Wave 2: PromptApi validator paths — sync, async, throwing.
 * Verifies that a validator returning a string keeps the prompt
 * alive and emits `prompt-validation-failed`; subsequent valid
 * response resolves.
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
  outcome?: { notes: Array<{ kind: string; [k: string]: unknown }> };
}

function captureEnvelopes(avatar: Avatar): CapturedEnvelope[] {
  const collected: CapturedEnvelope[] = [];
  vi.spyOn(avatar, 'onEnvelope').mockImplementation((tpl) => {
    collected.push(tpl as unknown as CapturedEnvelope);
  });
  return collected;
}

describe('PromptApi — validator', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    PromptApi._clearAllForTesting();
  });

  it('sync validator returning string keeps prompt alive', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    const envelopes = captureEnvelopes(avatar);

    const p = interactive.promptText('Name?', {
      validate: (s) => (s.length >= 3 ? true : 'too short'),
    });
    const id = envelopes[0]!.promptId!;
    envelopes.length = 0;

    interactive.handlePromptResponse({ promptId: id, response: 'A' });
    // Validation runs through an async path even for sync
    // validators (`await record.validate(...)`); flush microtasks.
    await Promise.resolve();
    await Promise.resolve();
    expect(envelopes).toHaveLength(1);
    expect(envelopes[0]!.outcome!.notes[0]!.kind).toBe('prompt-validation-failed');
    expect((envelopes[0]!.outcome!.notes[0] as unknown as { message: string }).message).toBe('too short');

    // Prompt still alive; resolve has not been called.
    expect(PromptApi._getResolverCountForTesting()).toBe(1);

    // Valid response resolves.
    envelopes.length = 0;
    interactive.handlePromptResponse({ promptId: id, response: 'Alice' });
    await expect(p).resolves.toBe('Alice');
    expect(PromptApi._getResolverCountForTesting()).toBe(0);
  });

  it('async validator returning Promise<true> resolves', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    const envelopes = captureEnvelopes(avatar);

    const p = interactive.promptText('Name?', {
      validate: async (s) => {
        await Promise.resolve();
        return s.length >= 3 ? true : 'too short';
      },
    });
    const id = envelopes[0]!.promptId!;
    interactive.handlePromptResponse({ promptId: id, response: 'Bob' });
    await expect(p).resolves.toBe('Bob');
  });

  it('async validator returning Promise<string> emits validation-failed', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    const envelopes = captureEnvelopes(avatar);

    const p = interactive.promptText('Name?', {
      validate: async (_s) => 'always invalid',
    });
    const id = envelopes[0]!.promptId!;
    envelopes.length = 0;
    interactive.handlePromptResponse({ promptId: id, response: 'Bob' });
    // Async validator — wait one microtask for it to settle.
    await Promise.resolve();
    await Promise.resolve();
    const failed = envelopes.find(
      (e) => e.outcome?.notes[0]?.kind === 'prompt-validation-failed',
    );
    expect(failed).toBeDefined();
    expect(PromptApi._getResolverCountForTesting()).toBe(1);
    // Clean up by cancelling.
    PromptApi.cancel(id);
    await expect(p).rejects.toThrow();
  });

  it('validator throwing → validation-failed with error message', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    const envelopes = captureEnvelopes(avatar);

    const p = interactive.promptText('Name?', {
      validate: (_s) => {
        throw new Error('database down');
      },
    });
    const id = envelopes[0]!.promptId!;
    envelopes.length = 0;
    interactive.handlePromptResponse({ promptId: id, response: 'Bob' });
    await Promise.resolve();
    const failed = envelopes.find(
      (e) => e.outcome?.notes[0]?.kind === 'prompt-validation-failed',
    );
    expect(failed).toBeDefined();
    expect(
      (failed!.outcome!.notes[0] as unknown as { message: string }).message,
    ).toContain('database down');
    expect(PromptApi._getResolverCountForTesting()).toBe(1);
    PromptApi.cancel(id);
    await expect(p).rejects.toThrow();
  });

  it('confirm validator sees boolean, not wire string', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    const envelopes = captureEnvelopes(avatar);
    let received: unknown = null;

    const p = interactive.promptConfirm('OK?', 'no', {
      validate: (b) => {
        received = b;
        return true;
      },
    });
    const id = envelopes[0]!.promptId!;
    interactive.handlePromptResponse({ promptId: id, response: 'yes' });
    await p;
    expect(received).toBe(true);
    expect(typeof received).toBe('boolean');
  });
});
