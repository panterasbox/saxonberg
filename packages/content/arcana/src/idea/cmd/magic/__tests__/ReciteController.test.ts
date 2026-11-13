/**
 * `recite` — a scroll fires from saying it, and `read` never casts
 * (controllers-are-io D10). Before the split `read` called the working as a
 * side effect, and then read a destroyed scroll's `teach` (the drive's 15c).
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { PerceptionApi } from '@saxonberg/server/mud/api/perception';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import ReadController from '@saxonberg/server/mud/platform/idea/cmd/perception/ReadController';
import ReciteController from '../ReciteController';
import Scroll from '../../../../thing/Scroll';

let lines: string[];
let notes: { kind: string; reason?: string }[];

function context(giver: unknown): CommandContext {
  return {
    commandGiver: giver,
    location: null,
    note: (n: { kind: string; reason?: string }) => notes.push(n),
    requireInteractive: () => null,
  } as unknown as CommandContext;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  lines = [];
  notes = [];
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (m: unknown) => {
      lines.push(String(m));
      return b;
    };
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
  vi.spyOn(PerceptionApi, 'canMakeOutMarks').mockReturnValue(true);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

function scroll(): Scroll {
  const s = makeStuff(() => new Scroll());
  // The fixture never reads the spell dictionary; drop the setter's load (no store here).
  s.setCarriedSpellPath('/test/spell');
  s.markText = 'words';
  return s;
}

describe('who a scroll offers `recite` to', () => {
  // ⚠ `inventory` flows IN to a container's occupants, so a scroll naming only
  // that bucket offered the verb to nobody holding it: `recite` answered
  // *I don't understand* for the life of the verb (the drive, step 15).
  it('⭐ the hand that holds it (environment) and whoever stands beside it (peers)', () => {
    const view = 'system/arcana/cmd/magic/recite.yaml';
    expect(Scroll.commandContributions.environment).toContain(view);
    expect(Scroll.commandContributions.peers).toContain(view);
  });
});

describe('recite', () => {
  it('⭐ fires the working, says it, and spends the scroll', async () => {
    const s = scroll();
    const fire = vi
      .spyOn(s, 'dischargeAt')
      .mockResolvedValue({ ok: true, reports: ['It takes.'] } as never);
    vi.spyOn(s, 'requiresMark').mockReturnValue(false);
    const consume = vi.spyOn(s, 'consume').mockResolvedValue(undefined as never);
    const giver = makeStuff(() => new Idea());
    await makeStuff(() => new ReciteController()).execute(
      { scroll: { stuff: s, raw: 'scroll' } } as never,
      context(giver),
    );
    expect(fire).toHaveBeenCalledWith(undefined, { source: giver });
    expect(consume).toHaveBeenCalled();
    expect(lines.join(' ')).toMatch(/aloud/);
    expect(lines.join(' ')).toMatch(/It takes\./);
    expect(notes).toEqual([]);
  });

  it('a mark nobody chose spends nothing', async () => {
    const s = scroll();
    const fire = vi.spyOn(s, 'dischargeAt');
    vi.spyOn(s, 'requiresMark').mockReturnValue(true);
    await makeStuff(() => new ReciteController()).execute(
      { scroll: { stuff: s, raw: 'scroll' } } as never,
      context(makeStuff(() => new Idea())),
    );
    expect(fire).not.toHaveBeenCalled();
    expect(notes.map((n) => n.reason)).toContain('no-mark-chosen');
  });

  it('marks you cannot make out cannot be said', async () => {
    vi.spyOn(PerceptionApi, 'canMakeOutMarks').mockReturnValue(false);
    const s = scroll();
    const fire = vi.spyOn(s, 'dischargeAt');
    await makeStuff(() => new ReciteController()).execute(
      { scroll: { stuff: s, raw: 'scroll' } } as never,
      context(makeStuff(() => new Idea())),
    );
    expect(fire).not.toHaveBeenCalled();
    expect(notes.map((n) => n.reason)).toEqual(['too-dark-to-read']);
  });
});

describe('read', () => {
  it('⭐ never casts: it says the words and the scroll is as it was', async () => {
    const s = scroll();
    const fire = vi.spyOn(s, 'dischargeAt');
    await makeStuff(() => new ReadController()).execute(
      { target: { stuff: s, raw: 'scroll' } } as never,
      context(makeStuff(() => new Idea())),
    );
    expect(fire).not.toHaveBeenCalled();
    expect(s.isDestroyed()).toBe(false);
    expect(lines.join(' ')).toMatch(/reads:/);
  });
});
