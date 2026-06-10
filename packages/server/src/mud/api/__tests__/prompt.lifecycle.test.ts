/**
 * Wave 2: PromptApi push → respond → resolve lifecycle for each
 * Tier 1 kind. Tests drive the substrate via the public
 * `handleResponse` entry point (Wave 3 wires Application; here we
 * call directly).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromptApi } from '../prompt';
import { EventApi } from '../event';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { Stuff } from '../../lib/stuff/Stuff';
import EventRegistry from '../../obj/EventRegistry';
import Interactive from '../../obj/Interactive';
import Avatar from '../../obj/Avatar';
import Thing from '../../lib/stuff/Thing';
import { ConnectionApi } from '../connection';

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

interface CapturedEnvelope {
  type: string;
  promptId?: string;
  outcome?: { notes: Array<{ kind: string; [k: string]: unknown }> };
  [k: string]: unknown;
}

function captureEnvelopes(avatar: Avatar): CapturedEnvelope[] {
  const collected: CapturedEnvelope[] = [];
  vi.spyOn(avatar, 'onEnvelope').mockImplementation((tpl) => {
    collected.push(tpl as unknown as CapturedEnvelope);
  });
  return collected;
}

describe('PromptApi — lifecycle (choice / confirm / text)', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    PromptApi._clearAllForTesting();
  });

  it('choice resolves with the picked response token', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    const envelopes = captureEnvelopes(avatar);
    const promise = PromptApi.choice(interactive, 'Pick', [
      { label: 'A', response: 'a' },
      { label: 'B', response: 'b' },
    ]);
    expect(envelopes).toHaveLength(1);
    expect(envelopes[0]!.type).toBe('prompt');
    const promptId = envelopes[0]!.promptId!;
    expect(envelopes[0]!.outcome!.notes[0]!.kind).toBe('prompt-choice');

    PromptApi.handleResponse(interactive, { promptId, response: 'b' });
    await expect(promise).resolves.toBe('b');

    // Dismissed envelope shipped.
    const dismissed = envelopes.find(
      (e) =>
        e.outcome?.notes[0]?.kind === 'prompt-dismissed' &&
        e.promptId === promptId,
    );
    expect(dismissed).toBeDefined();
    expect(dismissed!.outcome!.notes[0]!.reason).toBe('answered');

    expect(PromptApi._getResolverCountForTesting()).toBe(0);
  });

  it('confirm resolves with boolean from yes/no wire string', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    captureEnvelopes(avatar);

    const promiseYes = PromptApi.confirm(interactive, 'Continue?');
    const idYes = PromptApi._getResolverCountForTesting() === 1
      ? // grab via test seam? We need the promptId; capture from envelope.
        null
      : null;
    void idYes;
    // Recapture by walking the spy mock.calls — re-spy fresh.
    const envelopes2: CapturedEnvelope[] = [];
    vi.spyOn(avatar, 'onEnvelope').mockImplementation((tpl) => {
      envelopes2.push(tpl as unknown as CapturedEnvelope);
    });
    // The first envelope is gone; we need a different fixture pattern.
    // Reset and re-run cleanly:
    PromptApi._clearAllForTesting();

    const envelopes = captureEnvelopes(avatar);
    const p = PromptApi.confirm(interactive, 'Continue?');
    const promptId = envelopes[0]!.promptId!;
    PromptApi.handleResponse(interactive, { promptId, response: 'yes' });
    await expect(p).resolves.toBe(true);

    PromptApi._clearAllForTesting();
    const envelopes3 = captureEnvelopes(avatar);
    const p2 = PromptApi.confirm(interactive, 'Sure?');
    const id2 = envelopes3[0]!.promptId!;
    PromptApi.handleResponse(interactive, { promptId: id2, response: 'no' });
    await expect(p2).resolves.toBe(false);

    void promiseYes;
  });

  it('text resolves with the response string', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    const envelopes = captureEnvelopes(avatar);
    const p = PromptApi.text(interactive, 'Name?');
    const id = envelopes[0]!.promptId!;
    PromptApi.handleResponse(interactive, { promptId: id, response: 'Bob' });
    await expect(p).resolves.toBe('Bob');
  });
});

describe('PromptApi — mqlObject lifecycle', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    PromptApi._clearAllForTesting();
  });

  it('mqlObject resolves with the picked Stuff via StuffApi.findById', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    const sword1 = await StuffApi.create(() => new Thing());
    const sword2 = await StuffApi.create(() => new Thing());
    const envelopes = captureEnvelopes(avatar);
    const p = PromptApi.mqlObject(interactive, 'Which?', [sword1, sword2]);
    const id = envelopes[0]!.promptId!;
    const note = envelopes[0]!.outcome!.notes[0]!;
    expect(note.kind).toBe('prompt-mql-object');
    expect((note as unknown as { matches: unknown[] }).matches).toHaveLength(2);

    PromptApi.handleResponse(interactive, {
      promptId: id,
      response: sword2.stuffId,
    });
    await expect(p).resolves.toBe(sword2);
  });

  it('mqlObject resolves with null for bogus stuffId', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    const sword = await StuffApi.create(() => new Thing());
    const envelopes = captureEnvelopes(avatar);
    const p = PromptApi.mqlObject(interactive, 'Which?', [sword]);
    const id = envelopes[0]!.promptId!;
    PromptApi.handleResponse(interactive, {
      promptId: id,
      response: 'not-a-real-id',
    });
    await expect(p).resolves.toBeNull();
  });

  it('mqlObject resolves with null when picked Stuff is destroyed', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    const sword = await StuffApi.create(() => new Thing());
    const envelopes = captureEnvelopes(avatar);
    const p = PromptApi.mqlObject(interactive, 'Which?', [sword]);
    const id = envelopes[0]!.promptId!;
    const stuffId = sword.stuffId;
    StuffApi.destruct(sword);
    PromptApi.handleResponse(interactive, { promptId: id, response: stuffId });
    await expect(p).resolves.toBeNull();
  });
});

describe('PromptApi — mqlMany lifecycle', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    PromptApi._clearAllForTesting();
  });

  it('mqlMany resolves with array of picked Stuffs', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    const a = await StuffApi.create(() => new Thing());
    const b = await StuffApi.create(() => new Thing());
    const c = await StuffApi.create(() => new Thing());
    const envelopes = captureEnvelopes(avatar);
    const p = PromptApi.mqlMany(interactive, 'Pick', [a, b, c]);
    const id = envelopes[0]!.promptId!;
    PromptApi.handleResponse(interactive, {
      promptId: id,
      response: JSON.stringify([a.stuffId, c.stuffId]),
    });
    await expect(p).resolves.toEqual([a, c]);
  });

  it('mqlMany drops destroyed Stuffs from the resolved array', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    const a = await StuffApi.create(() => new Thing());
    const b = await StuffApi.create(() => new Thing());
    const envelopes = captureEnvelopes(avatar);
    const p = PromptApi.mqlMany(interactive, 'Pick', [a, b]);
    const id = envelopes[0]!.promptId!;
    const bId = b.stuffId;
    StuffApi.destruct(b);
    PromptApi.handleResponse(interactive, {
      promptId: id,
      response: JSON.stringify([a.stuffId, bId]),
    });
    await expect(p).resolves.toEqual([a]);
  });
});
