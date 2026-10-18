/**
 * `name <thing> <name>` — the reforger's one naming (repair W5, D9, D18).
 *
 * A blade that bore a name loses it when it is broken and reforged; the
 * hand that re-made it may name it — a right READ off the reforge's mend
 * record (`nameLost`), never stored. Once named it bears a name, so the
 * right is spent. Anybody else, or a thing nobody re-made, is "not
 * something you can name". The name is `Named`'s. The animal arm is
 * untouched (its own suite).
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import NameController from '../NameController';
import Tool from '../../../../thing/Tool';
import { Character } from '../../../../../lib/character/Character';
import { MessageApi } from '../../../../../api/message';
import { StuffApi } from '../../../../../api/stuff';
import { PersistableApi } from '../../../../../api/persistable';
import { makeStuff, stampTemplatePathForTest } from '../../../../../lib/security/__tests__/test-setup';
import type { CommandContext } from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';

class TestCharacter extends Character {}

let notes: { kind: string; reason?: string }[];
let said: string[];

function ctx(actor: unknown): CommandContext {
  return {
    commandGiver: actor,
    note: (n: { kind: string; reason?: string }) => notes.push(n),
  } as unknown as CommandContext;
}

function blade(reforgedBy: string): Tool {
  const t = makeStuff(() => new Tool());
  t.setBill({
    parts: [
      { part: 'blade', template: '/x/blade', count: 1, role: 'structural', form: 'bladed' },
      { part: 'grip', template: '/x/grip', count: 1, role: 'structural' },
    ],
  });
  t.ensureParts();
  // A reforge records the name it took on the LINE it re-made (`mendLine`).
  if (reforgedBy) {
    t.recordLineMend('blade', {
      at: 1, by: reforgedBy, byName: 'Berta', band: 'expert', discipline: 'smithing',
      part: 'blade', kind: 'reforged', result: 'sound', nameLost: 'Hollin',
    });
  }
  return t;
}

async function name(actor: unknown, thing: Tool, wanted: string): Promise<void> {
  await makeStuff(() => new NameController()).execute(
    { target: { stuff: thing } as unknown as MqlOneResult, animalName: wanted } as never,
    ctx(actor),
  );
}

let smith: TestCharacter;

beforeEach(() => {
  notes = [];
  said = [];
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (m: unknown) => {
      said.push(String(m));
      return b;
    };
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
  vi.spyOn(PersistableApi, 'captureHostOf').mockResolvedValue(undefined as never);
  smith = makeStuff(() => new TestCharacter());
  stampTemplatePathForTest(smith, '/x/agent/berta');
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('naming a reforged blade', () => {
  it('⭐ the reforger names it — the name is the blade\'s, and having one, it cannot be renamed', async () => {
    const sword = blade(smith.getIdentityPath()!);
    await name(smith, sword, 'Dawnbreaker');
    expect(sword.getLine('blade')!.name).toBe('Dawnbreaker');
    expect(sword.getName()).toBe('Dawnbreaker');
    expect(said.join(' ')).toMatch(/Dawnbreaker/);
    // It bears a name now: the right is spent.
    await name(smith, sword, 'Other');
    expect(sword.getName()).toBe('Dawnbreaker');
    expect(notes.some((n) => n.reason === 'not-nameable')).toBe(true);
  });

  it('⛔ nobody else may — and a thing nobody re-made cannot be named at all', async () => {
    const stranger = makeStuff(() => new TestCharacter());
    stampTemplatePathForTest(stranger, '/x/agent/stranger');
    const sword = blade(smith.getIdentityPath()!);
    await name(stranger, sword, 'Mine');
    expect(sword.getName()).toBe('');
    const plain = blade('');
    await name(smith, plain, 'Shiny');
    expect(plain.getName()).toBe('');
    expect(notes.filter((n) => n.reason === 'not-nameable')).toHaveLength(2);
  });
});
