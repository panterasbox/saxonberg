/**
 * Dispatcher × drill-additive focus tests.
 *
 * Exercises the `updates_focus: extend | replace | none` modes on
 * the dispatcher via {@link CommandApi.resolveAndValidate}, including
 * the same-anchor compaction that lets `look bookcase` then
 * `look book` produce `here:bookcase:book` rather than redundantly
 * appending the bookcase fragment twice.
 *
 * Stash / pronoun-memory behavior lives in command-pronoun.test.ts;
 * this file focuses on the focus chain itself.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CommandApi,
  type CommandContext,
} from '../command';
import { CommandDefinition } from '../../lib/command/CommandDefinition';
import { ContainmentApi } from '../containment';
import { Idea } from '../../lib/stuff/Idea';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { ContainerMixin } from '../../lib/spatial/Container';
import { CommandGiverMixin } from '../../lib/command/CommandGiver';
import { DetailedMixin } from '../../lib/description/Detailed';
import { FocusedMixin } from '../../lib/command/Focused';
import { NamedMixin } from '../../lib/description/Named';
import { PerceptibleMixin } from '../../lib/description/Perceptible';
import { StuffApi } from '../stuff';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type Location from '../../lib/stuff/Location';
import type Interactive from '../../obj/Interactive';

class TestLocation extends ContainerMixin(
  DetailedMixin(NamedMixin(PerceptibleMixin(Idea)))
) {}
class TestThing extends ContainableMixin(
  DetailedMixin(NamedMixin(PerceptibleMixin(Idea)))
) {}
class TestGiver extends ContainerMixin(
  ContainableMixin(
    FocusedMixin(CommandGiverMixin(NamedMixin(PerceptibleMixin(Idea))))
  )
) {}

function lookCommand(): CommandDefinition {
  // Mirrors the production cmd/look.yaml — drill-first scope try
  // list, extend mode for the focus chain.
  return CommandDefinition.fromYaml(
    [
      'verbs: [look]',
      'controller: LookController',
      'description: examine',
      'args:',
      '  - name: target',
      '    type: object',
      '    required: false',
      '    scope: ["$focus", "reachable"]',
      '    updates_focus: extend',
    ].join('\n'),
    '<test>'
  );
}

function replaceCommand(): CommandDefinition {
  return CommandDefinition.fromYaml(
    [
      'verbs: [anchor]',
      'controller: LookController',
      'description: anchor',
      'args:',
      '  - name: target',
      '    type: object',
      '    required: false',
      '    scope: "reachable"',
      '    updates_focus: replace',
    ].join('\n'),
    '<test>'
  );
}

function noneCommand(): CommandDefinition {
  return CommandDefinition.fromYaml(
    [
      'verbs: [poke]',
      'controller: LookController',
      'description: poke',
      'args:',
      '  - name: target',
      '    type: object',
      '    required: false',
      '    scope: "reachable"',
    ].join('\n'),
    '<test>'
  );
}

function makeContext(
  giver: TestGiver,
  location: Location,
  command: CommandDefinition,
  text: string
): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location,
    commandText: text,
    executionId: 'test-exec',
    commandId: 'test-cmd',
    verb: command.getPrimaryVerb(),
    command,
  });
}

describe('Drill-additive focus (extend mode)', () => {
  let location: TestLocation;
  let giver: TestGiver;
  let rose: TestThing;

  beforeEach(() => {
    StuffApi.clearAll();
    location = makeStuff(() => new TestLocation()) as TestLocation;
    location.setName('Town Square');
    location.addKeyword('square');
    location.setDetail(
      ['bookcase'],
      'A tall oak bookcase, packed with old volumes.'
    );
    location.setDetail(
      ['book'],
      'A leather-bound tome, spine cracked with use.',
      'bookcase'
    );

    giver = makeStuff(() => new TestGiver()) as TestGiver;
    giver.setName('player');
    ContainmentApi.move(
      giver as unknown as Parameters<typeof ContainmentApi.move>[0],
      location as unknown as Parameters<typeof ContainmentApi.move>[1]
    );

    rose = makeStuff(() => new TestThing()) as TestThing;
    rose.setName('rose');
    rose.addKeyword('rose');
    rose.addKeyword('flower');
    ContainmentApi.move(
      rose as unknown as Parameters<typeof ContainmentApi.move>[0],
      location as unknown as Parameters<typeof ContainmentApi.move>[1]
    );
  });

  it("look bookcase from focus='here' produces focus='here:bookcase'", async () => {
    // Initial focus is 'here'; resolve(here) yields the location,
    // no via. Resolving 'bookcase' gives (location, via=[bookcase])
    // — same stuff, [] is a prefix of [bookcase], so compaction
    // appends just ':bookcase'.
    const cmd = lookCommand();
    const ctx = makeContext(
      giver,
      location as unknown as Location,
      cmd,
      'look bookcase'
    );
    await CommandApi.resolveAndValidate({ target: 'bookcase' }, ctx);
    expect(giver.getFocus()).toBe('here:bookcase');
  });

  it("look book from focus='here:bookcase' produces focus='here:bookcase:book'", async () => {
    giver.setFocus('here:bookcase');
    const cmd = lookCommand();
    const ctx = makeContext(
      giver,
      location as unknown as Location,
      cmd,
      'look book'
    );
    await CommandApi.resolveAndValidate({ target: 'book' }, ctx);
    expect(giver.getFocus()).toBe('here:bookcase:book');
  });

  it("re-resolving the same target leaves focus unchanged", async () => {
    giver.setFocus('here:bookcase');
    const cmd = lookCommand();
    const ctx = makeContext(
      giver,
      location as unknown as Location,
      cmd,
      'look bookcase'
    );
    await CommandApi.resolveAndValidate({ target: 'bookcase' }, ctx);
    expect(giver.getFocus()).toBe('here:bookcase');
  });

  it("look rose from focus='here:bookcase' falls back to reachable; focus replaces", async () => {
    // The bookcase detail tree has no rose; the YAML's scope try-list
    // falls through to 'reachable' to find it. Resolved (rose, no via)
    // is a different stuff than the focus's anchor (location), so
    // compaction doesn't apply.
    //
    // The chain step `:rose` doesn't walk into the location's peers
    // / adornments, so `here:bookcase:rose` parses but resolves to
    // nothing. Replacing focus with just `rose` lets the substrate
    // re-resolve via the reachable scope (which DOES include peers).
    giver.setFocus('here:bookcase');
    const cmd = lookCommand();
    const ctx = makeContext(
      giver,
      location as unknown as Location,
      cmd,
      'look rose'
    );
    await CommandApi.resolveAndValidate({ target: 'rose' }, ctx);
    expect(giver.getFocus()).toBe('rose');
  });

  it('extend mode does NOT fire on empty resolution', async () => {
    giver.setFocus('here:bookcase');
    const cmd = lookCommand();
    const ctx = makeContext(
      giver,
      location as unknown as Location,
      cmd,
      'look bathtub'
    );
    await CommandApi.resolveAndValidate({ target: 'bathtub' }, ctx);
    // Focus untouched — empty match keeps the trail intact.
    expect(giver.getFocus()).toBe('here:bookcase');
  });

  it("replaces focus when current focus resolves multi-cardinality", async () => {
    // Reproduces the disambiguation-leftover bug: after a `look brass`
    // disambig prompt, the dispatcher's updates_focus: extend wrote
    // the raw fragment `brass` into the focus chain. `brass` resolves
    // to multiple Stuffs (two brass things in the room). A follow-up
    // `look <one of them>` would silently no-op because resolveOne
    // on `brass` could land on the same Stuff the player just
    // targeted — sameStuff branch returned without updating focus,
    // leaving the player stuck on an ambiguous fragment.
    //
    // Two brass-keyword things in the room with shared keyword.
    const brassPin = makeStuff(() => new TestThing()) as TestThing;
    brassPin.setName('brass pin');
    brassPin.addKeyword('brass');
    brassPin.addKeyword('pin');
    ContainmentApi.move(
      brassPin as unknown as Parameters<typeof ContainmentApi.move>[0],
      location as unknown as Parameters<typeof ContainmentApi.move>[1]
    );
    const brassRing = makeStuff(() => new TestThing()) as TestThing;
    brassRing.setName('brass ring');
    brassRing.addKeyword('brass');
    brassRing.addKeyword('ring');
    ContainmentApi.move(
      brassRing as unknown as Parameters<typeof ContainmentApi.move>[0],
      location as unknown as Parameters<typeof ContainmentApi.move>[1]
    );

    // Simulate the post-disambig state — focus is the ambiguous fragment.
    giver.setFocus('brass');
    const cmd = lookCommand();
    // Player follows up with `look pin` — specific keyword for one
    // of the two brass things.
    await CommandApi.resolveAndValidate(
      { target: 'pin' },
      makeContext(giver, location as unknown as Location, cmd, 'look pin')
    );
    // Focus must move off the ambiguous fragment to the specific
    // keyword the player typed.
    expect(giver.getFocus()).toBe('pin');
  });

  it('pronoun substitution applies before extend (look it after look rose)', async () => {
    const cmd = lookCommand();
    await CommandApi.resolveAndValidate(
      { target: 'rose' },
      makeContext(giver, location as unknown as Location, cmd, 'look rose')
    );
    // `look rose` from focus='here' targets a peer (different stuff,
    // no detail-path continuation), so focus REPLACES with `rose`
    // rather than appending — the chain `here:rose` would not
    // resolve through the substrate's chain step.
    expect(giver.getFocus()).toBe('rose');

    // `look it` substitutes the stored fragment ("rose") for the
    // literal pronoun before extending — the trail tracks the
    // referent, never the unstable pronoun string. Re-looking at
    // `rose` from focus='rose' is the same Stuff with empty via —
    // the same-anchor `equal` branch returns without mutating focus.
    // The key check: the focus stays `rose`, not `it`.
    await CommandApi.resolveAndValidate(
      { target: 'it' },
      makeContext(giver, location as unknown as Location, cmd, 'look it')
    );
    expect(giver.getFocus()).toBe('rose');
    expect(giver.getFocus()).not.toContain('it');
  });
});

describe('Drill-additive focus (replace mode)', () => {
  let location: TestLocation;
  let giver: TestGiver;

  beforeEach(() => {
    StuffApi.clearAll();
    location = makeStuff(() => new TestLocation()) as TestLocation;
    location.setName('Town Square');
    location.setDetail(['bookcase'], 'A bookcase.');

    giver = makeStuff(() => new TestGiver()) as TestGiver;
    giver.setName('player');
    ContainmentApi.move(
      giver as unknown as Parameters<typeof ContainmentApi.move>[0],
      location as unknown as Parameters<typeof ContainmentApi.move>[1]
    );
  });

  it('replace mode sets focus to the typed fragment wholesale', async () => {
    giver.setFocus('here:bookcase');
    const cmd = replaceCommand();
    const ctx = makeContext(
      giver,
      location as unknown as Location,
      cmd,
      'anchor bookcase'
    );
    await CommandApi.resolveAndValidate({ target: 'bookcase' }, ctx);
    // Wholesale replacement; the prior chain doesn't carry over.
    expect(giver.getFocus()).toBe('bookcase');
  });
});

describe('Default scope when YAML omits scope:', () => {
  let location: TestLocation;
  let giver: TestGiver;
  let rose: TestThing;

  beforeEach(() => {
    StuffApi.clearAll();
    location = makeStuff(() => new TestLocation()) as TestLocation;
    location.setName('Town Square');
    location.setDetail(
      ['bookcase'],
      'A tall oak bookcase, packed with old volumes.'
    );

    giver = makeStuff(() => new TestGiver()) as TestGiver;
    giver.setName('player');
    ContainmentApi.move(
      giver as unknown as Parameters<typeof ContainmentApi.move>[0],
      location as unknown as Parameters<typeof ContainmentApi.move>[1]
    );

    rose = makeStuff(() => new TestThing()) as TestThing;
    rose.setName('rose');
    rose.addKeyword('rose');
    ContainmentApi.move(
      rose as unknown as Parameters<typeof ContainmentApi.move>[0],
      location as unknown as Parameters<typeof ContainmentApi.move>[1]
    );
  });

  function bareExamineCmd(): CommandDefinition {
    return CommandDefinition.fromYaml(
      [
        'verbs: [examine]',
        'controller: LookController',
        'description: examine',
        'args:',
        '  - name: target',
        '    type: object',
        '    required: false',
      ].join('\n'),
      '<test>'
    );
  }

  it("YAML without scope: defaults to ['$focus'] — drill chain IS the scope", async () => {
    // No scope: declared. Default is ['$focus']. From a drilled
    // focus 'here:bookcase', the bookcase detail's neighborhood
    // doesn't include peers like rose, and the default try-list has
    // no 'reachable' fallback. Resolution should miss; the wrapper
    // lands stuff=null.
    const cmd = bareExamineCmd();
    giver.setFocus('here:bookcase');
    const ctx = makeContext(
      giver,
      location as unknown as Location,
      cmd,
      'examine rose'
    );
    const r = await CommandApi.resolveAndValidate({ target: 'rose' }, ctx);
    expect('resolved' in r).toBe(true);
    if ('resolved' in r) {
      const target = r.resolved.target as { stuff: unknown };
      expect(target).toBeDefined();
      // Rose isn't in the bookcase detail tree; no fallback chain
      // declared, so the stuff lands null.
      expect(target.stuff).toBeNull();
    }
  });

  it('declaring scope: ["$focus", "reachable"] gets the drill-first-then-broad pattern', async () => {
    // The explicit fallback chain. Drill chain ('here:bookcase')
    // misses for rose; the second try ('reachable') finds it.
    const cmd = CommandDefinition.fromYaml(
      [
        'verbs: [examine]',
        'controller: LookController',
        'description: examine',
        'args:',
        '  - name: target',
        '    type: object',
        '    required: false',
        '    scope: ["$focus", "reachable"]',
      ].join('\n'),
      '<test>'
    );
    giver.setFocus('here:bookcase');
    const ctx = makeContext(
      giver,
      location as unknown as Location,
      cmd,
      'examine rose'
    );
    const r = await CommandApi.resolveAndValidate({ target: 'rose' }, ctx);
    expect('resolved' in r).toBe(true);
    if ('resolved' in r) {
      const target = r.resolved.target as { stuff: unknown };
      expect(target.stuff).toBe(rose);
    }
  });
});

describe('Drill-additive focus (none mode / default)', () => {
  let location: TestLocation;
  let giver: TestGiver;
  let rose: TestThing;

  beforeEach(() => {
    StuffApi.clearAll();
    location = makeStuff(() => new TestLocation()) as TestLocation;
    location.setName('Town Square');

    giver = makeStuff(() => new TestGiver()) as TestGiver;
    giver.setName('player');
    ContainmentApi.move(
      giver as unknown as Parameters<typeof ContainmentApi.move>[0],
      location as unknown as Parameters<typeof ContainmentApi.move>[1]
    );

    rose = makeStuff(() => new TestThing()) as TestThing;
    rose.setName('rose');
    rose.addKeyword('rose');
    ContainmentApi.move(
      rose as unknown as Parameters<typeof ContainmentApi.move>[0],
      location as unknown as Parameters<typeof ContainmentApi.move>[1]
    );
  });

  it('omitting updates_focus leaves focus unchanged on resolution', async () => {
    giver.setFocus('here:bookcase');
    const cmd = noneCommand();
    const ctx = makeContext(
      giver,
      location as unknown as Location,
      cmd,
      'poke rose'
    );
    await CommandApi.resolveAndValidate({ target: 'rose' }, ctx);
    expect(giver.getFocus()).toBe('here:bookcase');
  });
});
