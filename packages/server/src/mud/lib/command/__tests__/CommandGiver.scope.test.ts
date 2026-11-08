/**
 * ⭐⭐ `verb@source` at the dispatcher (controllers-are-io D2, D3, D23).
 *
 * The scope after the `@` resolves as MQL; the chain sees only what that
 * source affords; the source fills the first object slot it fits; a NAME
 * matching several asks (or fails closed with nobody to ask); a plural
 * scope is a batch. And when the chain settles on a refusal, the binder —
 * never the controller — proves whether another source here would have
 * taken the line, and says so (`other-offer`).
 *
 * Fixtures: the shared MQL world (bob in the square, a rose and a daisy
 * on the ground — both `flower` — an apple in his pocket), with the
 * giver's affordances mocked to name which object offers which view, and
 * `_executeOne` mocked so no controller runs.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ContainmentApi } from '../../../api/containment';
import { CommandApi, type CommandContext, type CommandModel } from '../../../api/command';
import { CommandLineApi } from '../../../api/command-line';
import { MqlApi } from '../../../api/mql';
import { CommandDefinition } from '../CommandDefinition';
import { makeStuff } from '../../security/__tests__/test-setup';
import { makeWorld, type MqlWorld } from '../../../api/__tests__/fixtures/mql-world';
import { Idea } from '../../stuff/Idea';
import { ContainableMixin } from '../../spatial/Containable';
import { DetailedMixin } from '../../description/Detailed';
import { NamedMixin } from '../../description/Named';
import { PerceptibleMixin } from '../../description/Perceptible';
import { VisibleMixin } from '../../description/Visible';
import type { Stuff } from '../../stuff/Stuff';
import type { Affordance, RecencyBucket } from '../CommandGiver';
import type { MqlOneResult } from '../../../api/mql';
import type { Note } from '@saxonberg/types';

class TestThing extends ContainableMixin(
  DetailedMixin(VisibleMixin(NamedMixin(PerceptibleMixin(Idea)))),
) {}

const view = async (yaml: string): Promise<CommandDefinition> => {
  const def = CommandDefinition.fromYaml(yaml, '<test>');
  await CommandApi.resolveValidators(def);
  return def;
};

/** `windish <target>` — one object slot any Visible thing fits. */
const WIND = `
verbs: [windish]
controller: NoopController
description: scope fixture
args:
  - name: target
    type: object
    scope: [reachable]
    required: true
    requires: VisibleMixin
`;

/** `sayish <message...>` — no object slot at all. */
const SAY = `
verbs: [sayish]
controller: NoopController
description: no-slot fixture
args:
  - name: message
    type: string
    greedy: true
`;

interface Run {
  command: CommandDefinition;
  model: CommandModel;
  source: Stuff;
}

describe('verb@source at the dispatcher', () => {
  let world: MqlWorld;
  let runs: Run[];
  let wind: CommandDefinition;
  let rejectWhen: (target: Stuff | null) => boolean;

  const giver = (): Stuff & {
    getAffordances(): Affordance[];
    _executeOne(c: CommandDefinition, m: CommandModel, ctx: CommandContext): Promise<void>;
    _runChain(p: unknown, o: unknown): Promise<CommandContext>;
  } => world.giver as never;

  const offer = (source: Stuff, command: CommandDefinition, bucket: RecencyBucket = 'environment'): Affordance =>
    ({ command, source, bucket }) as Affordance;

  const dispatch = async (
    text: string,
    affordances: Affordance[],
    interactive?: unknown,
  ): Promise<CommandContext> => {
    vi.spyOn(giver(), 'getAffordances').mockReturnValue(affordances);
    const parsed = CommandLineApi.parsePipeline(text).commands[0]!;
    const outer = CommandApi.createCommandContext({
      commandGiver: world.giver,
      location: world.location as never,
      commandText: text,
      executionId: 'test',
      commandId: 'test',
      verb: '',
      command: undefined as never,
      ...(interactive !== undefined ? { interactive: interactive as never } : {}),
    });
    return giver()._runChain(parsed, outer);
  };

  const targetOf = (r: Run): Stuff | null => (r.model.target as MqlOneResult | undefined)?.stuff ?? null;
  const reasons = (ctx: CommandContext): string[] =>
    ctx
      .getNotes()
      .map((n) => (n as { reason?: string }).reason)
      .filter((r): r is string => r !== undefined);

  beforeEach(async () => {
    runs = [];
    rejectWhen = () => false;
    world = makeWorld();
    wind = await view(WIND);
    vi.spyOn(giver(), '_executeOne').mockImplementation(async (command, model, ctx) => {
      const run = { command, model, source: ctx.commandSource };
      runs.push(run);
      if (rejectWhen(targetOf(run))) {
        ctx.note({ kind: 'controller-rejected', reason: 'not-ready', detail: 'not yet' });
      }
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('⭐ an unscoped line is untouched: the first match claims, as today', async () => {
    await dispatch('windish daisy', [offer(world.rose, wind), offer(world.daisy, wind)]);
    expect(runs).toHaveLength(1);
    expect(runs[0]!.source).toBe(world.rose);
    expect(targetOf(runs[0]!)).toBe(world.daisy);
  });

  it('(a) nothing typed → the source fills its slot: `windish@me:i:apple`', async () => {
    await dispatch('windish@me:i:apple', [offer(world.rose, wind), offer(world.apple, wind, 'inventory')]);
    expect(runs).toHaveLength(1);
    expect(runs[0]!.source).toBe(world.apple);
    expect(targetOf(runs[0]!)).toBe(world.apple);
  });

  it('(b) a typed word that matches the source → the source wins the slot', async () => {
    await dispatch('windish@daisy flower', [offer(world.rose, wind), offer(world.daisy, wind)]);
    expect(runs[0]!.source).toBe(world.daisy);
    expect(targetOf(runs[0]!)).toBe(world.daisy);
  });

  it('(c) a typed word that does not match → the typed words win', async () => {
    await dispatch('windish@daisy rose', [offer(world.rose, wind), offer(world.daisy, wind)]);
    expect(runs[0]!.source).toBe(world.daisy);
    expect(targetOf(runs[0]!)).toBe(world.rose);
  });

  it('a view with no slot binds as unscoped: `sayish@me hello`', async () => {
    const say = await view(SAY);
    await dispatch('sayish@me hello there', [offer(world.giver, say, 'self')]);
    expect(runs).toHaveLength(1);
    expect(runs[0]!.source).toBe(world.giver);
    expect(runs[0]!.model.message).toBe('hello there');
  });

  it('a scope naming nothing → `source-not-found`, nothing runs', async () => {
    const ctx = await dispatch('windish@teapot', [offer(world.rose, wind)]);
    expect(runs).toHaveLength(0);
    expect(reasons(ctx)).toContain('source-not-found');
  });

  it('a scope naming something that affords nothing → `source-affords-nothing`', async () => {
    const ctx = await dispatch('windish@me:i:apple', [offer(world.rose, wind)]);
    expect(runs).toHaveLength(0);
    expect(reasons(ctx)).toContain('source-affords-nothing');
  });

  it('⭐ a NAME matching several asks the player which', async () => {
    const promptMqlObject = vi.fn(async (_l: string, c: Stuff[]) => c.find((s) => s === world.daisy)!);
    await dispatch('windish@flower', [offer(world.rose, wind), offer(world.daisy, wind)], { promptMqlObject });
    expect(promptMqlObject).toHaveBeenCalledTimes(1);
    expect(runs).toHaveLength(1);
    expect(runs[0]!.source).toBe(world.daisy);
  });

  it('⭐⭐ …and with nobody to ask (a script, an NPC) fails CLOSED, naming the input', async () => {
    const ctx = await dispatch('windish@flower', [offer(world.rose, wind), offer(world.daisy, wind)]);
    expect(runs).toHaveLength(0);
    const note = ctx.getNotes().find((n) => (n as { reason?: string }).reason === 'needs-input') as
      | { detail?: string }
      | undefined;
    expect(note?.detail).toMatch(/^windish needs a choice of source .* when run from a script$/);
  });

  it('⭐ a plural scope is a BATCH: once per source, one envelope', async () => {
    const ctx = await dispatch('windish@"all flower"', [offer(world.rose, wind), offer(world.daisy, wind)]);
    expect(runs.map((r) => r.source).sort((a, b) => a.stuffId.localeCompare(b.stuffId))).toEqual(
      [world.rose, world.daisy].sort((a, b) => a.stuffId.localeCompare(b.stuffId)),
    );
    // Each source filled its own slot.
    for (const r of runs) expect(targetOf(r)).toBe(r.source);
    // The outer ctx is the envelope: one per line, whatever the batch.
    expect(ctx.commandId).toBe('test');
  });

  describe('③ the other offer (D3)', () => {
    let near: Stuff;
    let far: Stuff;

    beforeEach(() => {
      const add = (name: string): Stuff => {
        const s = makeStuff(() => new TestThing()) as unknown as Stuff & {
          setName(n: string): void;
          addKeyword(k: string): void;
        };
        s.setName(name);
        s.addKeyword('wheat');
        ContainmentApi.move(s as never, world.location as never);
        return s;
      };
      near = add('green wheat');
      far = add('ripe wheat');
    });

    it('⭐⭐ a refused line names the source that would have taken it — proved, not run', async () => {
      rejectWhen = (t) => t === near;
      const promptMqlObject = vi.fn();
      const ctx = await dispatch('windish wheat', [offer(near, wind), offer(far, wind)], { promptMqlObject });
      // The controller ran ONCE — the claiming attempt; the probe never runs one.
      expect(runs).toHaveLength(1);
      expect(targetOf(runs[0]!)).toBe(near);
      // …and never prompts.
      expect(promptMqlObject).not.toHaveBeenCalled();
      const offered = ctx.getNotes().find((n) => n.kind === 'other-offer') as
        | Extract<Note, { kind: 'other-offer' }>
        | undefined;
      expect(offered).toBeDefined();
      expect(offered!.verb).toBe('windish');
      expect(offered!.source.stuffId).toBe(far.stuffId);
      // The scoped form is PROVED: it resolves to exactly that source.
      const proved = MqlApi.resolveMany(offered!.scopedForm, {
        commandGiver: world.giver,
        scope: 'reachable',
      }).stuff;
      expect(proved).toEqual([far]);
    });

    it('⭐ a typed word that keeps its slot is no second offer (`harvest #pot`, the plant inside it)', async () => {
      rejectWhen = (t) => t === near;
      const ctx = await dispatch(`windish #${near.stuffId}`, [offer(near, wind), offer(far, wind)], {});
      expect(targetOf(runs[0]!)).toBe(near);
      expect(ctx.getNotes().some((n) => n.kind === 'other-offer')).toBe(false);
    });

    it('⚠ an act that ended its giver still gets its context back, with no probe', async () => {
      const running = vi.spyOn(giver() as never as { isDestroyed(): boolean }, 'isDestroyed');
      running.mockReturnValue(false);
      vi.spyOn(giver(), '_executeOne').mockImplementation(async () => {
        running.mockReturnValue(true);
      });
      const probe = vi.spyOn(giver() as never as { _otherOffer(): unknown }, '_otherOffer');
      const ctx = await dispatch('windish wheat', [offer(near, wind)], {});
      running.mockReturnValue(false);
      expect(ctx).toBeDefined();
      expect(probe).not.toHaveBeenCalled();
    });

    it('⭐ the word bound the refused thing: that thing is no offer of itself, the other is', async () => {
      rejectWhen = (t) => t === near;
      const room = makeStuff(() => new TestThing()) as unknown as Stuff;
      ContainmentApi.move(room as never, world.location as never);
      const ctx = await dispatch('windish wheat', [offer(room, wind), offer(near, wind), offer(far, wind)], {});
      const offered = ctx.getNotes().find((n) => n.kind === 'other-offer') as
        | Extract<Note, { kind: 'other-offer' }>
        | undefined;
      expect(offered?.source.stuffId).toBe(far.stuffId);
    });

    it('⭐ `--strict` on a name two things answer to refuses, naming both', async () => {
      const ctx = await dispatch('windish wheat --strict', [offer(near, wind)], {});
      expect(runs).toHaveLength(0);
      const refused = ctx.getNotes().find((n) => n.kind === 'validator-failed') as
        | { validator?: string; detail?: string }
        | undefined;
      expect(refused?.validator).toBe('cardinality:ambiguous');
      expect(refused?.detail).toMatch(/green wheat/);
      expect(refused?.detail).toMatch(/ripe wheat/);
    });

    it('⭐ nobody to read it, no probe: a script or an NPC pays nothing', async () => {
      rejectWhen = (t) => t === near;
      const ctx = await dispatch('windish wheat', [offer(near, wind), offer(far, wind)]);
      expect(ctx.getNotes().some((n) => n.kind === 'other-offer')).toBe(false);
    });

    it('⚠ a shop of offers: the probe stops, nearest first', async () => {
      rejectWhen = (t) => t === near;
      const room = Array.from({ length: 12 }, () => {
        const s = makeStuff(() => new TestThing()) as unknown as Stuff;
        ContainmentApi.move(s as never, world.location as never);
        return offer(s, wind);
      });
      const probe = vi.spyOn(giver() as never as { _probeOffer(): Promise<boolean> }, '_probeOffer');
      probe.mockResolvedValue(false);
      await dispatch('windish wheat', [offer(near, wind), ...room], {});
      expect(probe.mock.calls.length).toBeLessThanOrEqual(6);
    });

    it('a line that succeeds offers nothing', async () => {
      const ctx = await dispatch('windish wheat', [offer(near, wind), offer(far, wind)], {});
      expect(ctx.getNotes().some((n) => n.kind === 'other-offer')).toBe(false);
    });

    it('no other source → no offer', async () => {
      rejectWhen = () => true;
      const ctx = await dispatch('windish wheat', [offer(near, wind)], {});
      expect(ctx.getNotes().some((n) => n.kind === 'other-offer')).toBe(false);
    });
  });

  it('every shape failing names each shape’s usage', async () => {
    const two = await view(`
verbs: [windish]
controller: NoopController
description: two-slot fixture
args:
  - name: target
    type: string
  - name: key
    type: string
    prepositions: [with]
    prepositionRequired: true
`);
    const one = await view(`
verbs: [windish]
controller: NoopController
description: no-arg fixture
`);
    const ctx = await dispatch('windish a b c', [offer(world.rose, two), offer(world.daisy, one)]);
    const note = ctx.getNotes().find((n) => (n as { reason?: string }).reason === 'shape-fall-through') as
      | { detail?: string }
      | undefined;
    expect(note?.detail).toBe('windish [target] [with <key>] · windish');
  });
});

describe('`prepositionRequired` (D17)', () => {
  const THROW_TO = `
verbs: [tossish]
controller: NoopController
description: prepositionRequired fixture
args:
  - name: item
    type: string
    required: true
  - name: recipient
    type: string
    required: true
    prepositions: [to]
    prepositionRequired: true
`;
  const assemble = (def: CommandDefinition, text: string) => {
    const world = makeWorld();
    return CommandApi.assemble(CommandLineApi.parsePipeline(text).commands[0]!, def, {
      commandGiver: world.giver,
      location: world.location as never,
    });
  };

  it('binds when the preposition is present', () => {
    const r = assemble(CommandDefinition.fromYaml(THROW_TO, '<t>'), 'tossish ball to ann');
    expect('error' in r).toBe(false);
    expect((r as { model: CommandModel }).model).toMatchObject({ item: 'ball', recipient: 'ann' });
  });

  it('a missing preposition is a SHAPE error that names it', () => {
    const r = assemble(CommandDefinition.fromYaml(THROW_TO, '<t>'), 'tossish ball ann');
    expect(r).toEqual({ error: 'shape', summary: "missing 'to' before recipient" });
  });

  it('an optional slot stays unbound without its preposition', () => {
    const def = CommandDefinition.fromYaml(
      THROW_TO.replace(/required: true\n {4}prepositions/, 'required: false\n    prepositions'),
      '<t>',
    );
    const r = assemble(def, 'tossish ball');
    expect('error' in r).toBe(false);
    expect((r as { model: CommandModel }).model.recipient).toBeUndefined();
  });

  it('the usage line shows the preposition as part of the shape', () => {
    expect(CommandDefinition.fromYaml(THROW_TO, '<t>').getUsage()).toBe('tossish <item> to <recipient>');
  });

  it('is refused at load without `prepositions:`', () => {
    expect(() =>
      CommandDefinition.fromYaml(
        `
verbs: [tossish]
controller: NoopController
description: bad
args:
  - name: recipient
    type: string
    prepositionRequired: true
`,
        '<t>',
      ),
    ).toThrow(/prepositionRequired/);
  });
});

describe('reserved `--strict` / `--loose` (D23)', () => {
  const VIEW = `
verbs: [lookish]
controller: NoopController
description: reserved fixture
args:
  - name: target
    type: string
`;
  const assemble = (text: string) => {
    const world = makeWorld();
    return CommandApi.assemble(
      CommandLineApi.parsePipeline(text).commands[0]!,
      CommandDefinition.fromYaml(VIEW, '<t>'),
      { commandGiver: world.giver, location: world.location as never },
    );
  };

  it('`--strict` forces `onFiltered: error` and binds no option', () => {
    const r = assemble('lookish --strict rose');
    expect(r).toMatchObject({ model: { target: 'rose' }, reservedFiltered: 'error' });
  });

  it('`--loose` forces `take`; last wins', () => {
    expect(assemble('lookish rose --strict --loose')).toMatchObject({ reservedFiltered: 'take' });
  });

  it('after `--` they are literals', () => {
    const r = assemble('lookish -- --strict');
    expect(r).toMatchObject({ model: { target: '--strict' } });
    expect((r as { reservedFiltered?: unknown }).reservedFiltered).toBeUndefined();
  });

  it('the context carries the override into the filtered policy', async () => {
    const world = makeWorld();
    const ctx = CommandApi.createCommandContext({
      commandGiver: world.giver,
      location: world.location as never,
      commandText: 'x',
      executionId: 'x',
      commandId: 'x',
      verb: 'x',
      command: CommandDefinition.fromYaml(VIEW, '<t>'),
      filterPolicy: 'error',
    });
    expect(ctx.filterPolicy).toBe('error');
  });
});

describe('a prompt with nobody to answer fails closed (D23)', () => {
  it('the cardinality prompt names the input it needed', async () => {
    const world = makeWorld();
    const ctx = CommandApi.createCommandContext({
      commandGiver: world.giver,
      location: world.location as never,
      commandText: 'pickish flower',
      executionId: 'x',
      commandId: 'x',
      verb: 'pickish',
      command: undefined as never,
    });
    const out = await CommandApi.applyCardinalityPolicy(
      { type: 'object', onExcess: 'prompt' },
      [world.rose, world.daisy],
      'target',
      ctx,
      { raw: 'flower' },
    );
    expect(out).toBeNull();
    expect(ctx.getNotes()).toEqual([
      {
        kind: 'command-rejected',
        reason: 'needs-input',
        detail: "pickish needs a choice of target ('flower' could be any of 2) when run from a script",
      },
    ]);
  });
});
