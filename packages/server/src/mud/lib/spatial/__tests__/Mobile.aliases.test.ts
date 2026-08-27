/**
 * Default-alias contributions on MobileMixin — the 10 canonical
 * cardinal directions (long-form + abbreviation) all expand to
 * `go <full-name>`, so a Mobile host that also composes AliasMixin
 * sees `n`, `north`, `ne`, `northeast`, ... as defaults.
 */

// Import-ORDER, not wiring: this file composes a mixin at module
// scope, and the mixin's own module sits in an import cycle that only
// resolves once the graph is loaded in bootstrap order. The global
// `setupFiles` used to do that incidentally for all 964 files; with it
// gone, the four files relying on it say so. Removing this line fails
// the file at COLLECTION ("MixinName is not a function"), which is why
// it survived unnoticed — see docs/testing.md § The four cycle files.
import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { MobileMixin } from '../Mobile';
import { ContainableMixin } from '../Containable';
import { Idea } from '../../stuff/Idea';
import { NavigationApi } from '../../../api/navigation';

describe('MobileMixin default aliases', () => {
  // Compose a real Mobile host to surface the static `defaultAliases`
  // — the mixin's a class factory, so the static lives on the
  // returned class rather than on `MobileMixin` itself.
  const MobileHost = MobileMixin(ContainableMixin(Idea));

  const defaults = (
    MobileHost as unknown as {
      defaultAliases: Array<{ name: string; body: string }>;
    }
  ).defaultAliases;

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

describe('MobileMixin command contributions', () => {
  const MobileHost = MobileMixin(ContainableMixin(Idea));
  const selfContributions = (
    MobileHost as unknown as { commandContributions: { self: string[] } }
  ).commandContributions.self;

  it('affords the care↔speed movement verbs (sneak + run) so a player can invoke them', () => {
    // Regression guard: a movement verb YAML being loaded is NOT enough —
    // it must be CONTRIBUTED here or a player gets "I don't understand
    // 'sneak'". sneak/run shipped afforded only after a live run caught it;
    // every unit/integration test drove resolveTraversal directly, past the
    // affordance gate.
    expect(selfContributions).toContain('platform/cmd/movement/go.yaml');
    expect(selfContributions).toContain('platform/cmd/movement/sneak.yaml');
    expect(selfContributions).toContain('platform/cmd/movement/run.yaml');
  });
});
