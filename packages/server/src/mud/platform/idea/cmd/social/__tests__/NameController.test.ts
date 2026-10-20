/**
 * `name` — ⭐⭐ the THING says who may name it (ceramics W2).
 *
 * `Named.canBeNamedBy(hand, by)` is overridden by each rule's holder:
 * `Crafted` (its maker, once, while it has none — *"name jug Mother's
 * jug"*), `Assembled` (the reforger; its own suite), `Bonded` (the person
 * an animal has chosen). The controller narrows on no class to pick a
 * rule. ⚠ A `Tool` composes Crafted INSIDE Named and Assembled outside —
 * the maker rule must survive both layers (the mixin-super chain).
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import NameController from '../NameController';
import Tool from '../../../../thing/Tool';
import Good from '../../../../../lib/stuff/Good';
import { NamedMixin } from '../../../../../lib/description/Named';
import { BondedMixin } from '../../../../../lib/husbandry/Bonded';
import { Character } from '../../../../../lib/character/Character';
import { MessageApi } from '../../../../../api/message';
import { StuffApi } from '../../../../../api/stuff';
import { PersistableApi } from '../../../../../api/persistable';
import { makeStuff, stampTemplatePathForTest } from '../../../../../lib/security/__tests__/test-setup';
import type { CommandContext } from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';
import type { Stuff } from '../../../../../lib/stuff/Stuff';

class TestCharacter extends Character {}
class TestPet extends BondedMixin(NamedMixin(Good)) {
  static _mixinName = 'NameControllerTestPet';
}

let notes: { kind: string; reason?: string }[];

function ctx(actor: unknown): CommandContext {
  return {
    commandGiver: actor,
    note: (n: { kind: string; reason?: string }) => notes.push(n),
  } as unknown as CommandContext;
}

async function name(actor: unknown, thing: Stuff, wanted: string): Promise<void> {
  await makeStuff(() => new NameController()).execute(
    { target: { stuff: thing } as unknown as MqlOneResult, animalName: wanted } as never,
    ctx(actor),
  );
}

let potter: TestCharacter;
let stranger: TestCharacter;

function madeBy(maker: string): Tool {
  const t = makeStuff(() => new Tool());
  t.setMaker(maker);
  return t;
}

beforeEach(() => {
  notes = [];
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = () => b;
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
  vi.spyOn(PersistableApi, 'captureHostOf').mockResolvedValue(undefined as never);
  potter = makeStuff(() => new TestCharacter());
  stampTemplatePathForTest(potter, '/x/agent/potter');
  stranger = makeStuff(() => new TestCharacter());
  stampTemplatePathForTest(stranger, '/x/agent/stranger');
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the maker names what they made — once', () => {
  it('⭐ the maker names it', async () => {
    const jug = madeBy(potter.getIdentityPath()!);
    await name(potter, jug, "Mother's jug");
    expect(jug.getName()).toBe("Mother's jug");
  });

  it('a stranger cannot', async () => {
    const jug = madeBy(potter.getIdentityPath()!);
    await name(stranger, jug, 'Mine');
    expect(jug.getName()).toBe('');
    expect(notes.some((n) => n.reason === 'not-nameable')).toBe(true);
  });

  it('a second naming by the maker is refused — the right is spent', async () => {
    const jug = madeBy(potter.getIdentityPath()!);
    await name(potter, jug, 'First');
    await name(potter, jug, 'Second');
    expect(jug.getName()).toBe('First');
    expect(notes.some((n) => n.reason === 'not-nameable')).toBe(true);
  });

  it('a thing with no maker stamped names to nobody', async () => {
    const plain = madeBy('');
    await name(potter, plain, 'Shiny');
    expect(plain.getName()).toBe('');
  });
});

describe('the bond rule is the animal’s', () => {
  it('⭐ only a person it has chosen may name it; and only once', async () => {
    const cat = makeStuff(() => new TestPet());
    const chosen = vi.spyOn(TestPet.prototype, 'hasChosen').mockImplementation(
      function (this: unknown, p: Stuff) {
        return p === potter || (p as { stuffId?: string }).stuffId === potter.stuffId;
      },
    );
    await name(stranger, cat, 'Mouse');
    expect(cat.getName()).toBe('');
    expect(notes.some((n) => n.reason === 'not-chosen')).toBe(true);
    expect(cat.canBeNamedBy(potter.getIdentityPath()!, potter)).toBe(true);
    expect(cat.canBeNamedBy(stranger.getIdentityPath()!, stranger)).toBe(false);
    cat.setName('Mouse');
    expect(cat.canBeNamedBy(potter.getIdentityPath()!, potter)).toBe(false);
    chosen.mockRestore();
  });
});
