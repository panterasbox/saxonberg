/**
 * Default-alias contributions on MobileMixin — the 10 canonical
 * cardinal directions (long-form + abbreviation) all expand to
 * `go <full-name>`, so a Mobile host that also composes AliasMixin
 * sees `n`, `north`, `ne`, `northeast`, ... as defaults.
 */

import { describe, it, expect } from 'vitest';
import { MobileMixin } from '../Mobile';
import { NavigationApi } from '../../../api/navigation';

describe('MobileMixin default aliases', () => {
  // Pull static defaultAliases off the mixin's anonymous class via a
  // disposable host. The mixin can't be referenced directly because
  // it's a class factory, not a class.
  class Host extends MobileMixin(
    class {
      static persistentFields: string[] = [];
    } as never,
  ) {}

  const defaults = (Host as unknown as {
    defaultAliases: Array<{ name: string; body: string }>;
  }).defaultAliases;

  const aliasByName = new Map(defaults.map((e) => [e.name, e.body]));

  it('declares one entry per canonical cardinal (long + short)', () => {
    // 10 cardinals × 2 forms = 20 entries.
    expect(defaults).toHaveLength(20);
  });

  it.each(NavigationApi.cardinalDirections())(
    'maps long-form %s to "go %s"',
    (direction) => {
      expect(aliasByName.get(direction)).toBe(`go ${direction}`);
    },
  );

  it.each([
    ['n', 'north'],
    ['s', 'south'],
    ['e', 'east'],
    ['w', 'west'],
    ['ne', 'northeast'],
    ['nw', 'northwest'],
    ['se', 'southeast'],
    ['sw', 'southwest'],
    ['u', 'up'],
    ['d', 'down'],
  ])('maps abbreviation %s to "go %s"', (abbrev, fullName) => {
    expect(aliasByName.get(abbrev)).toBe(`go ${fullName}`);
  });
});
