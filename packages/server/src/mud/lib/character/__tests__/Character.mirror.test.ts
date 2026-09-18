/**
 * ⭐⭐ The mirror (nutrition-and-fitness W3 / plan D14). `look <person>`
 * ends with one sentence about a body — flesh × lean in the person
 * register — and names nobody. It is a static on the `Character`
 * class, so it reaches every person and no animal: a `Creature` that is
 * not a `Character` renders exactly what it rendered before.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Character } from '../Character';
import { Creature } from '../../creature/Creature';
import { NamedMixin } from '../../description/Named';
import { AppApi } from '../../../api/app';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../quantity';
import type { Stuff } from '../../stuff/Stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class Person extends NamedMixin(Character) {}
class Beast extends Creature {}

const set = (c: Creature, key: string, level: number): void => {
  const cur = c.getReserve(key)!.current.rawValue();
  c.adjustReserve(key, Quantity.of(level - cur, '%'));
};

describe('the mirror — the body line on look', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    vi.spyOn(AppApi, 'setting').mockReturnValue('');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  const look = (target: Stuff): string => {
    const viewer = makeStuff(() => new Person()) as unknown as Stuff;
    return target.getMarkupLong(viewer);
  };

  it('⭐ a person ends with the body line, and it is the species baseline on a fresh body', () => {
    const p = makeStuff(() => new Person());
    p.setName('Hal');
    p.setLongDescription('A tall figure in a coat.');
    const out = look(p);
    expect(out).toContain('A tall figure in a coat.');
    expect(out.trimEnd().endsWith('In good flesh.')).toBe(true);
  });

  it('⭐⭐ an animal renders exactly what it rendered before — no body line', () => {
    const b = makeStuff(() => new Beast());
    b.setLongDescription('A brindled ox.');
    expect(look(b)).not.toContain('In good flesh');
  });

  it('two bodies that spent a season differently read differently, from one starting point', () => {
    const worked = makeStuff(() => new Person());
    const idle = makeStuff(() => new Person());
    set(worked, 'lean', 70);
    set(worked, 'flesh', 25);
    set(idle, 'flesh', 80);
    const a = look(worked);
    const b = look(idle);
    expect(a).toContain('Wiry.');
    expect(b).toContain('Heavyset.');
    expect(a).not.toBe(b);
  });

  it('the line names nobody and shows no number', () => {
    const p = makeStuff(() => new Person());
    p.setName('Hal');
    const out = look(p);
    const line = out.split('\n').filter((l) => l.trim().length > 0).pop() ?? '';
    expect(line).not.toContain('Hal');
    expect(line).not.toMatch(/\d/);
    expect(line).not.toMatch(/\b(he|she|they|his|her|their)\b/i);
  });
});
