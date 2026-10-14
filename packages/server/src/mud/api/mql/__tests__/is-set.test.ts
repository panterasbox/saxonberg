import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { MqlApi } from '../../mql';
import { StuffApi } from '../../stuff';
import { Idea } from '../../../lib/stuff/Idea';
import { CommandGiverMixin } from '../../../lib/command/CommandGiver';
import { ContainerMixin } from '../../../lib/spatial/Container';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

/**
 * ⭐ The result says whether the query NAMED things or named a SET
 * (maritime revision 2): the binder prompts only about a name.
 */
class Giver extends CommandGiverMixin(ContainerMixin(ContainableMixin(Idea))) {
  static _mixinName = 'IsSetGiver';
}

let g: Giver;
beforeEach(() => {
  StuffApi.clearAll();
  g = makeStuff(() => new Giver());
});

const isSet = (q: string): boolean =>
  MqlApi.resolveMany(q, { commandGiver: g as never, scope: '' }).isSet === true;

describe('MqlMany.isSet', () => {
  it('⭐ a seed, a pronoun, a transform chain, a predicate filter: a SET', () => {
    expect(isSet('horizon')).toBe(true);
    expect(isSet('peers')).toBe(true);
    expect(isSet('inventory')).toBe(true);
    expect(isSet('me:i')).toBe(true);
    expect(isSet('reachable:peers')).toBe(true);
  });

  it('⭐ a keyword search anywhere in it: a NAME, which can be ambiguous', () => {
    expect(isSet('brass')).toBe(false);
    expect(isSet('brass lamp')).toBe(false);
    expect(isSet('horizon:tower')).toBe(false);
    expect(isSet("'old chart'")).toBe(false);
  });

  it('one referent is not a set: `here`, `me`, `it` — a bare `look` is the room, not a list', () => {
    expect(isSet('here')).toBe(false);
    expect(isSet('me')).toBe(false);
  });

  it('resolveOne carries it too', () => {
    expect(MqlApi.resolveOne('peers', { commandGiver: g as never, scope: '' }).isSet).toBe(true);
    expect(MqlApi.resolveOne('brass', { commandGiver: g as never, scope: '' }).isSet).toBeUndefined();
  });
});
