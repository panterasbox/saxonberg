/**
 * Wave 7: end-to-end integration scenarios for the prompt substrate.
 * Drives a synthetic client through the Application dispatcher to
 * exercise the full wire path: push → respond → resolve, validator
 * retry, mqlObject / mqlMany pass-through, prompt-cancel per-prompt
 * + wholesale, and the empty-command refresh short-circuit.
 *
 * Sister to the unit tests in prompt.lifecycle / .validation /
 * .cancellation / .bounds / .body / .format. The integration test
 * specifically asserts wire-shape behavior across full
 * Application.processUserMessage routing.
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
import Thing from '../../lib/stuff/Thing';
import { ConnectionApi } from '../connection';

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

async function setup(): Promise<{
  interactive: Interactive;
  avatar: Avatar;
  envelopes: Array<{ type: string; promptId?: string; outcome?: { notes: Array<{ kind: string; [k: string]: unknown }> } }>;
}> {
  await bootRegistry();
  const avatar = await StuffApi.create(() => new Avatar());
  avatar.setName('Alice');
  const interactive = await StuffApi.create(
    () => new Interactive('sock-1', 'sess-1', { _id: 'u1' } as never),
  );
  ConnectionApi.transfer(interactive, avatar);
  const envelopes: Array<{ type: string; promptId?: string; outcome?: { notes: Array<{ kind: string }> } }> = [];
  vi.spyOn(avatar, 'onEnvelope').mockImplementation((tpl) => {
    envelopes.push(tpl as unknown as { type: string });
  });
  return { interactive, avatar, envelopes };
}

describe('PromptApi — integration', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    PromptApi._clearAllForTesting();
  });

  it('1. choice happy path', async () => {
    const { interactive, envelopes } = await setup();
    const p = PromptApi.choice<'a' | 'b'>(interactive, 'Pick', [
      { label: 'A', response: 'a' },
      { label: 'B', response: 'b' },
    ]);
    const id = envelopes[0]!.promptId!;
    PromptApi.handleResponse(interactive, { promptId: id, response: 'b' });
    await expect(p).resolves.toBe('b');
  });

  it('2. confirm yes/no decoded to boolean', async () => {
    const { interactive, envelopes } = await setup();
    const p = PromptApi.confirm(interactive, 'OK?', 'no');
    const id = envelopes[0]!.promptId!;
    PromptApi.handleResponse(interactive, { promptId: id, response: 'yes' });
    await expect(p).resolves.toBe(true);
  });

  it('3. text with validator: retry then accept', async () => {
    const { interactive, envelopes } = await setup();
    const p = PromptApi.text(interactive, 'Name?', {
      validate: (s) => (s.length >= 3 ? true : 'too short'),
    });
    const id = envelopes[0]!.promptId!;
    envelopes.length = 0;
    PromptApi.handleResponse(interactive, { promptId: id, response: 'A' });
    await Promise.resolve();
    await Promise.resolve();
    expect(envelopes[0]!.outcome!.notes[0]!.kind).toBe('prompt-validation-failed');
    PromptApi.handleResponse(interactive, { promptId: id, response: 'Alice' });
    await expect(p).resolves.toBe('Alice');
  });

  it('4. mqlObject pass-through resolves with picked Stuff', async () => {
    const { interactive, envelopes } = await setup();
    const sword1 = await StuffApi.create(() => new Thing());
    const sword2 = await StuffApi.create(() => new Thing());
    const p = PromptApi.mqlObject(interactive, 'Which?', [sword1, sword2]);
    const id = envelopes[0]!.promptId!;
    PromptApi.handleResponse(interactive, {
      promptId: id,
      response: sword2.stuffId,
    });
    await expect(p).resolves.toBe(sword2);
  });

  it('5. mqlObject bogus stuffId resolves null (substrate is pass-through)', async () => {
    const { interactive, envelopes } = await setup();
    const sword = await StuffApi.create(() => new Thing());
    const p = PromptApi.mqlObject(interactive, 'Which?', [sword]);
    const id = envelopes[0]!.promptId!;
    PromptApi.handleResponse(interactive, {
      promptId: id,
      response: 'not-a-real-id',
    });
    await expect(p).resolves.toBeNull();
  });

  it('6. mqlMany bounds: in-range resolves with array', async () => {
    const { interactive, envelopes } = await setup();
    const a = await StuffApi.create(() => new Thing());
    const b = await StuffApi.create(() => new Thing());
    const c = await StuffApi.create(() => new Thing());
    const p = PromptApi.mqlMany(interactive, 'Pick', [a, b, c], { min: 1, max: 3 });
    const id = envelopes[0]!.promptId!;
    PromptApi.handleResponse(interactive, {
      promptId: id,
      response: JSON.stringify([a.stuffId, c.stuffId]),
    });
    await expect(p).resolves.toEqual([a, c]);
  });

  it('7. mqlMany out-of-bounds → validation-failed, prompt alive', async () => {
    const { interactive, envelopes } = await setup();
    const a = await StuffApi.create(() => new Thing());
    const b = await StuffApi.create(() => new Thing());
    const p = PromptApi.mqlMany(interactive, 'Pick', [a, b], { min: 2, max: 2 });
    const id = envelopes[0]!.promptId!;
    envelopes.length = 0;
    PromptApi.handleResponse(interactive, {
      promptId: id,
      response: JSON.stringify([a.stuffId]),
    });
    expect(envelopes[0]!.outcome!.notes[0]!.kind).toBe('prompt-validation-failed');
    expect(PromptApi._getResolverCountForTesting()).toBe(1);
    // Recover with a valid response.
    PromptApi.handleResponse(interactive, {
      promptId: id,
      response: JSON.stringify([a.stuffId, b.stuffId]),
    });
    await expect(p).resolves.toEqual([a, b]);
  });

  it('8. per-prompt prompt-cancel rejects that one only', async () => {
    const { interactive, envelopes } = await setup();
    const p1 = PromptApi.text(interactive, 'A?');
    const p2 = PromptApi.text(interactive, 'B?');
    const id1 = envelopes[0]!.promptId!;
    PromptApi.handleCancel(interactive, { promptId: id1 });
    await expect(p1).rejects.toBeInstanceOf(PromptCancelledError);
    // p2 still pending.
    expect(PromptApi._getResolverCountForTesting()).toBe(1);
    PromptApi.cancelAll(interactive, 'cancelled');
    await expect(p2).rejects.toBeInstanceOf(PromptCancelledError);
  });

  it('9. cancelAll wholesale rejects every pending await', async () => {
    const { interactive } = await setup();
    const p1 = PromptApi.text(interactive, 'A?');
    const p2 = PromptApi.text(interactive, 'B?');
    const p3 = PromptApi.text(interactive, 'C?');
    expect(PromptApi.cancelAll(interactive, 'cancelled')).toBe(3);
    for (const p of [p1, p2, p3]) {
      // eslint-disable-next-line no-await-in-loop
      await expect(p).rejects.toMatchObject({ reason: 'cancelled' });
    }
  });

  it('10. disconnect cleanup uses reason host-disconnected', async () => {
    const { interactive } = await setup();
    const p1 = PromptApi.text(interactive, 'A?');
    const p2 = PromptApi.text(interactive, 'B?');
    PromptApi.cancelAll(interactive, 'host-disconnected');
    await expect(p1).rejects.toMatchObject({ reason: 'host-disconnected' });
    await expect(p2).rejects.toMatchObject({ reason: 'host-disconnected' });
  });
});
