/**
 * Wave 2: PromptApi cancellation — single-prompt `cancel`,
 * wholesale `cancelAll`, cancel-during-validate race safety.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromptApi, PromptCancelledError } from '../prompt';
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

describe('PromptApi — cancellation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    PromptApi._clearAllForTesting();
  });

  it('handleCancel rejects await with PromptCancelledError(cancelled)', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    const envelopes = captureEnvelopes(avatar);
    const p = interactive.promptText('Name?');
    const id = envelopes[0]!.promptId!;
    envelopes.length = 0;

    interactive.handlePromptCancel({ promptId: id });
    await expect(p).rejects.toBeInstanceOf(PromptCancelledError);
    await expect(p).rejects.toMatchObject({ reason: 'cancelled' });

    const dismissed = envelopes.find(
      (e) => e.outcome?.notes[0]?.kind === 'prompt-dismissed',
    );
    expect(dismissed).toBeDefined();
    expect(
      (dismissed!.outcome!.notes[0] as unknown as { reason: string }).reason,
    ).toBe('cancelled');

    expect(PromptApi._getResolverCountForTesting()).toBe(0);
  });

  it('cancel(promptId) returns true/false based on existence', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    const envelopes = captureEnvelopes(avatar);
    const p = interactive.promptText('Name?');
    const id = envelopes[0]!.promptId!;

    expect(PromptApi.cancel('not-real')).toBe(false);
    expect(PromptApi.cancel(id)).toBe(true);
    await expect(p).rejects.toBeInstanceOf(PromptCancelledError);
  });

  it('cancelAll rejects every pending await for an Interactive', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    captureEnvelopes(avatar);
    const p1 = interactive.promptText('A?');
    const p2 = interactive.promptText('B?');
    const p3 = interactive.promptText('C?');

    expect(PromptApi._getInteractivePromptCountForTesting(interactive)).toBe(3);
    const count = interactive.cancelPrompts('host-disconnected');
    expect(count).toBe(3);

    for (const p of [p1, p2, p3]) {
      // eslint-disable-next-line no-await-in-loop
      await expect(p).rejects.toMatchObject({ reason: 'host-disconnected' });
    }

    expect(PromptApi._getResolverCountForTesting()).toBe(0);
    expect(PromptApi._getInteractivePromptCountForTesting(interactive)).toBe(0);
  });

  it('cancelAll returns 0 for an Interactive with no prompts', async () => {
    await bootRegistry();
    const { interactive } = await makeAvatarInteractive();
    expect(interactive.cancelPrompts('cancelled')).toBe(0);
  });

  it('cancel-during-validate: late async validator does not call resolve', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    const envelopes = captureEnvelopes(avatar);

    let releaseValidator: (() => void) | null = null;
    const validatorPromise = new Promise<void>((res) => {
      releaseValidator = res;
    });

    const p = interactive.promptText('Name?', {
      validate: async (_s): Promise<true | string> => {
        await validatorPromise;
        return true;
      },
    });
    const id = envelopes[0]!.promptId!;

    // Submit a response — validator starts and parks.
    interactive.handlePromptResponse({ promptId: id, response: 'Bob' });
    // Cancel before validator settles.
    interactive.handlePromptCancel({ promptId: id });
    // Now release the validator.
    releaseValidator!();
    // The promise rejects with cancellation, not resolves with 'Bob'.
    await expect(p).rejects.toBeInstanceOf(PromptCancelledError);
  });
});
