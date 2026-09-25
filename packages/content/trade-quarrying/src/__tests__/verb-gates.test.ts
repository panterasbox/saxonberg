/**
 * ⭐⭐ **The arg gate is a REACHABILITY link, and it is invisible to every
 * controller test.** `dig.yaml` and `split.yaml` driven through the REAL
 * binder — parse → assemble → resolve — against the classes that ship.
 *
 * Three things only this file can see:
 *
 *  1. `dig`'s `target` declares `requires: any`, gating nothing, because
 *     three things can stand in it and they share no mixin: a diggable
 *     object, a **bare band word that binds nothing** (`dig clay` — a band
 *     in the column is not a bindable target), or nothing at all. So the
 *     word has to reach the controller as `{ stuff: null, raw: 'clay' }`,
 *     and this proves it does.
 *  2. ⚠⚠ **`dig`'s tool default is `[mixin.ToolMixin]`, not
 *     `[capability.digging]`** — the one place in the tree an instrument arg
 *     departs from the capability atom, and the reason is load-bearing: a
 *     spade offers `digging` and a pick offers `winning` and BOTH are the
 *     right tool for some ground. A capability default would silently fail
 *     to bind the pick, and the player would be told there is no face
 *     rather than that they have the wrong tool. **This file is what would
 *     notice somebody "tidying" it back.**
 *  3. The affordance: `dig` is on the **SPADE**, not on the working — which
 *     is what makes it a platform verb and the trade's next working rows.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import OpenWorkingLocation from '../location/OpenWorking';
import Block from '../thing/Block';
import Spade from '@saxonberg/server/mud/platform/thing/Spade';
import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import SingletonCartesianLocation from '@saxonberg/server/mud/platform/location/SingletonCartesianLocation';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mixins } from '@saxonberg/server/mud/lib/mixin';
import { CommandApi, type CommandContext } from '@saxonberg/server/mud/api/command';
import { CommandLineApi } from '@saxonberg/server/mud/api/command-line';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { CommandDefinition } from '@saxonberg/server/mud/lib/command/CommandDefinition';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import {
  CommandGiverMixin,
  type CommandGiver,
} from '@saxonberg/server/mud/lib/command/CommandGiver';
import { FocusedMixin } from '@saxonberg/server/mud/lib/command/Focused';
import { NamedMixin } from '@saxonberg/server/mud/lib/description/Named';
import { PerceptibleMixin } from '@saxonberg/server/mud/lib/description/Perceptible';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type Location from '@saxonberg/server/mud/lib/stuff/Location';
import type Interactive from '@saxonberg/server/mud/platform/idea/Interactive';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

const VIEWS = fileURLToPath(
  new URL(
    '../../../platform/content/platform/cmd/ground/',
    import.meta.url,
  ),
);

interface ArgSpec {
  name: string;
  type?: string;
  required?: boolean;
  requires?: string | string[];
  default?: string;
}
function args(view: string): ArgSpec[] {
  return (
    (YAML.parse(readFileSync(`${VIEWS}${view}`, 'utf8')) as { args?: ArgSpec[] })
      .args ?? []
  );
}

describe('dig.yaml / split.yaml — the arg gates', () => {
  it('⭐ `dig target` is polymorphic: `requires: any` — declared, gating nothing', () => {
    const target = args('dig.yaml').find((a) => a.name === 'target')!;
    expect(target.type).toBe('object');
    expect(target.required).toBe(false);
    expect(target.requires).toBe('any');
  });

  it('⚠⚠ `dig tool` defaults on the MIXIN atom, not the capability one', () => {
    // A spade offers `digging`, a pick offers `winning`, and both are right
    // for some ground. `[capability.digging]` here would refuse to bind the
    // pick, and the player would be told there is no face rather than that
    // they have the wrong tool. Which tool is right is the GROUND's to say.
    const tool = args('dig.yaml').find((a) => a.name === 'tool')!;
    expect(tool.default).toBe('me:i:[mixin.ToolMixin]');
    expect([tool.requires].flat()).toEqual(['ToolMixin']);
    expect(MixinApi.hasMixin(ToolItem, Mixins.Tool)).toBe(true);
    expect(MixinApi.hasMixin(Spade, Mixins.Tool)).toBe(true);
  });

  it('`split target` is required and polymorphic; its tool is declared', () => {
    const target = args('split.yaml').find((a) => a.name === 'target')!;
    expect(target.required).toBe(true);
    expect(target.requires).toBe('any');
    const tool = args('split.yaml').find((a) => a.name === 'tool')!;
    expect(tool.default).toBe('me:i:[mixin.ToolMixin]');
  });

  it('⭐⭐ the affordance: `dig` is on the SPADE, and NOT on the working', () => {
    const verbs = (
      ctor: unknown,
      bucket: 'self' | 'inventory' | 'environment' | 'peers',
    ): string[] =>
      CommandApi.collectContributions(ctor, bucket)
        .map((d) => d.verbs)
        .flat();
    // The instrument affords it, which is what makes it a PLATFORM verb: a
    // spade in your hand means you can try it anywhere.
    expect(verbs(Spade, 'self')).toContain('dig');
    // ⭐⭐ **And so does the WORKING — two rungs, and the drive is why.** It
    // was the instrument alone at first, and a player who walked into a quarry
    // empty-handed got *"I don't understand 'dig'"* rather than a refusal
    // naming the spade. The refusal IS the progression UI: if something lifts
    // it, the verb has to exist so you can be told.
    //
    // ⚠ The trade still ships no VIEW and no controller — the working names
    // the platform's view, exactly as `ImprovableMixin` does for `ditch`.
    expect(verbs(OpenWorkingLocation, 'self')).toContain('dig');
    expect(verbs(OpenWorkingLocation, 'inventory')).toContain('dig');
    // …and a plain room does not, which is what keeps it from being a global.
    expect(verbs(SingletonCartesianLocation, 'inventory')).not.toContain('dig');
    // ⭐⭐ The block affords its own splitting, wherever it lies — and on
    // `peers`, which the live drive corrected: `self` reaches a thing's HOLDER,
    // and nobody holds a 1375 kg block, so `split block` parsed as *"I don't
    // understand 'split'"* with a block standing right there.
    expect(verbs(Block, 'peers')).toContain('split');
    expect(verbs(Block, 'self')).toContain('split');
    expect(verbs(Block, 'peers')).not.toContain('dig');
  });
});

/* ───────────────── through the whole binder ───────────────── */

class TestGiver extends ContainerMixin(
  ContainableMixin(
    FocusedMixin(CommandGiverMixin(NamedMixin(PerceptibleMixin(Idea)))),
  ),
) {}

function realView(file: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    readFileSync(`${VIEWS}${file}`, 'utf8'),
    `platform/cmd/ground/${file}`,
  );
}

async function resolveFieldValidators(cmd: CommandDefinition): Promise<void> {
  await CommandApi.resolveValidators(cmd);
  // Drop the VERB-level gates (animate/embodied) — this fixture is about the
  // binder, and its giver is a bare CommandGiver.
  (cmd as unknown as { _resolvedValidators?: unknown })._resolvedValidators =
    undefined;
}

type Drive =
  | { stage: 'shape' | 'bind'; summary: string }
  | { stage: 'refused'; detail: string }
  | { stage: 'ok'; target: string; raw: string; tool: string };

describe('dig.yaml through the whole binder', () => {
  let room: SingletonCartesianLocation;
  let giver: TestGiver;

  beforeEach(() => {
    StuffApi.clearAll();
    room = makeStuffAtPath(() => {
      const r = new SingletonCartesianLocation();
      r.setShortDescription('the bench');
      return r;
    }, '/world/_test/quarry/bench');
    giver = makeStuff(() => new TestGiver());
    giver.setName('Tam');
    ContainmentApi.move(giver, room);
  });
  afterEach(() => StuffApi.clearAll());

  function spade(): Spade {
    return makeStuffAtPath(() => {
      const t = new Spade();
      t.setShortDescription('spade');
      t.setKeywords(['spade']);
      t.setCapabilities(['digging']);
      return t;
    }, '/world/_test/thing/spade');
  }

  function pick(): ToolItem {
    return makeStuffAtPath(() => {
      const t = new ToolItem();
      t.setShortDescription('pick');
      t.setKeywords(['pick']);
      t.setCapabilities(['winning', 'striking']);
      return t;
    }, '/world/_test/thing/pick');
  }

  async function drive(line: string, view = 'dig.yaml'): Promise<Drive> {
    const cmd = realView(view);
    await resolveFieldValidators(cmd);
    const parsed = CommandLineApi.parsePipeline(line).commands[0]!;
    const asm = CommandApi.assemble(parsed, cmd, {
      commandGiver: giver as unknown as Stuff & CommandGiver,
      location: room as unknown as Stuff & Container,
    });
    if ('error' in asm) {
      const summary = 'summary' in asm ? asm.summary : asm.error;
      return { stage: asm.error === 'shape' ? 'shape' : 'bind', summary };
    }
    const ctx: CommandContext = CommandApi.createCommandContext({
      commandGiver: giver as unknown as CommandContext['commandGiver'],
      interactive: {} as Interactive,
      location: room as unknown as Location,
      commandText: line,
      executionId: 'test-exec',
      commandId: 'test-cmd',
      verb: cmd.getPrimaryVerb(),
      command: cmd,
    });
    const r = await CommandApi.resolveAndValidate(asm.model, ctx);
    if (!('resolved' in r)) {
      const failed = ctx.getNotes().find((n) => n.kind === 'validator-failed') as
        | { detail?: string }
        | undefined;
      return { stage: 'refused', detail: failed?.detail ?? '(no note)' };
    }
    const t = r.resolved.target as MqlOneResult | undefined;
    const tool = r.resolved.tool as MqlOneResult | undefined;
    return {
      stage: 'ok',
      target: t === undefined ? '(absent)' : (t.stuff?.getPresentation() ?? 'NULL'),
      raw: t?.raw ?? '',
      tool: tool === undefined ? '(absent)' : (tool.stuff?.getPresentation() ?? 'NULL'),
    };
  }

  it('⭐⭐ `dig clay` binds NOTHING for the word and hands it over as raw', async () => {
    // A band in the column is not an object, so the controller reads `raw`
    // against the wall. The `fell oak` shape.
    ContainmentApi.move(spade(), giver);
    expect(await drive('dig clay')).toEqual({
      stage: 'ok',
      target: 'NULL',
      raw: 'clay',
      tool: 'a spade',
    });
  });

  it('⭐⭐ a PICK binds on the same default — which a capability atom would refuse', async () => {
    // This is the assertion the departure exists for. With
    // `[capability.digging]` the pick would bind as `(absent)` and a player
    // holding the right tool for stone would be told there was no face.
    ContainmentApi.move(pick(), giver);
    const out = await drive('dig granite');
    expect(out).toEqual({
      stage: 'ok',
      target: 'NULL',
      raw: 'granite',
      tool: 'a pick',
    });
  });

  it('bare-handed, `dig` still reaches the controller — with no tool', async () => {
    // ⭐ The refusal is the GROUND's, so the binder must not swallow the
    // command: *"You would want a spade"* is a sentence somebody has to be
    // able to hear.
    // ⚠ `NULL` rather than `(absent)`: the default query RAN and matched
    // nothing, so the arg is present and empty. The controller reads
    // `model.tool?.stuff ?? null`, which is the same answer either way — but
    // the distinction is worth pinning, because a view whose default stopped
    // running would also report `(absent)` and nothing else would notice.
    expect(await drive('dig')).toEqual({
      stage: 'ok',
      target: '(absent)',
      raw: '',
      tool: 'NULL',
    });
  });

  it('`dig up` reaches the controller as the raw word, not as a direction', async () => {
    ContainmentApi.move(spade(), giver);
    const out = await drive('dig up');
    expect(out.stage).toBe('ok');
    if (out.stage === 'ok') expect(out.raw).toBe('up');
  });

  it('`split` with nothing named is refused at the BINDER — it is required', async () => {
    const out = await drive('split', 'split.yaml');
    expect(out.stage === 'shape' || out.stage === 'bind' || out.stage === 'refused').toBe(
      true,
    );
  });
});
