/**
 * PromptApi — `foreground` opt is stamped on every push-shape Note.
 *
 * Default is `true` (auto-focus the new prompt). Callers pass
 * `foreground: false` to background-push (joins the stack without
 * seizing the active slot client-side).
 *
 * The flag is purely a wire/client UX hint — server-side substrate
 * doesn't read it after the Note builder, so the test only asserts
 * the envelope shape.
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

describe('PromptApi — foreground flag wire stamping', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    PromptApi._clearAllForTesting();
  });

  it.each([
    {
      name: 'choice',
      run: (iact: Interactive) =>
        iact.promptChoice('Pick?', [
          { label: 'A', response: 'a' },
        ]),
    },
    {
      name: 'confirm',
      run: (iact: Interactive) => iact.promptConfirm('Continue?'),
    },
    {
      name: 'text',
      run: (iact: Interactive) => iact.promptText('Name?'),
    },
    {
      name: 'mqlObject',
      run: (iact: Interactive) => iact.promptMqlObject('Which?', []),
    },
    {
      name: 'mqlMany',
      run: (iact: Interactive) => iact.promptMqlMany('Which?', []),
    },
  ])('$name defaults to foreground: true', async ({ run }) => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    let captured: { foreground?: boolean } | null = null;
    vi.spyOn(avatar, 'onEnvelope').mockImplementation((tpl) => {
      if (tpl.type !== 'prompt') return;
      const first = tpl.outcome.notes[0];
      if (!first || first.kind === 'prompt-dismissed') return;
      captured = first as { foreground?: boolean };
    });

    const p = run(interactive);
    expect(captured).not.toBeNull();
    expect(captured!.foreground).toBe(true);

    interactive.cancelPrompts('cancelled');
    await expect(p).rejects.toThrow();
  });

  it.each([
    {
      name: 'choice',
      run: (iact: Interactive) =>
        iact.promptChoice(
          'Pick?',
          [{ label: 'A', response: 'a' }],
          { foreground: false },
        ),
    },
    {
      name: 'confirm',
      run: (iact: Interactive) =>
        iact.promptConfirm('Continue?', 'no', { foreground: false }),
    },
    {
      name: 'text',
      run: (iact: Interactive) =>
        iact.promptText('Name?', { foreground: false }),
    },
    {
      name: 'mqlObject',
      run: (iact: Interactive) =>
        iact.promptMqlObject('Which?', [], { foreground: false }),
    },
    {
      name: 'mqlMany',
      run: (iact: Interactive) =>
        iact.promptMqlMany('Which?', [], { foreground: false }),
    },
  ])('$name honors foreground: false', async ({ run }) => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    let captured: { foreground?: boolean } | null = null;
    vi.spyOn(avatar, 'onEnvelope').mockImplementation((tpl) => {
      if (tpl.type !== 'prompt') return;
      const first = tpl.outcome.notes[0];
      if (!first || first.kind === 'prompt-dismissed') return;
      captured = first as { foreground?: boolean };
    });

    const p = run(interactive);
    expect(captured).not.toBeNull();
    expect(captured!.foreground).toBe(false);

    interactive.cancelPrompts('cancelled');
    await expect(p).rejects.toThrow();
  });
});
