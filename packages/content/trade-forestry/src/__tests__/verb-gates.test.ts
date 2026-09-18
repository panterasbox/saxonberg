/**
 * ⭐⭐ **The arg gate is a REACHABILITY link** — `fell.yaml` tested
 * against the classes and through the real binder, never a controller.
 *
 * Two things only this file can see:
 *
 *  1. `target` declares `requires: any` — gating nothing. It is polymorphic — a bole, a
 *     planted tree, or a bare species word that binds NOTHING (the stand
 *     is the ROOM, and a room is not a bindable target). A `requires:`
 *     would refuse two of the three at the binder; an alternation deletes
 *     a check. So the word must reach the controller as
 *     `{ stuff: null, raw: 'oak' }`, and this drives the shipped YAML
 *     through parse → assemble → resolve to prove it does.
 *  2. `axe` requires `ToolMixin`, which the shipped instrument composes,
 *     and its `default:` on the `[capability.felling]` atom binds the axe
 *     in hand when none is named.
 *
 * Plus the affordance: `fell` is in the `inventory` bucket of a Wood (the
 * people standing in it) and not of a plain singleton room.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import Wood from '../location/Wood';
import Bole from '../thing/Bole';
import Panel from '../thing/Panel';
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
import { CommandGiverMixin, type CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';
import { FocusedMixin } from '@saxonberg/server/mud/lib/command/Focused';
import { NamedMixin } from '@saxonberg/server/mud/lib/description/Named';
import { PerceptibleMixin } from '@saxonberg/server/mud/lib/description/Perceptible';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type Location from '@saxonberg/server/mud/lib/stuff/Location';
import type Interactive from '@saxonberg/server/mud/platform/idea/Interactive';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

const VIEW = fileURLToPath(new URL('../../content/trade/forestry/cmd/forestry/fell.yaml', import.meta.url));

interface ArgSpec { name: string; type?: string; required?: boolean; requires?: string | string[]; default?: string }
function args(): ArgSpec[] {
  return (YAML.parse(readFileSync(VIEW, 'utf8')) as { args?: ArgSpec[] }).args ?? [];
}

describe('fell.yaml — the arg gates', () => {
  it('`target` is polymorphic: `requires: any` — declared, gating nothing', () => {
    const target = args().find((a) => a.name === 'target')!;
    expect(target.type).toBe('object');
    expect(target.required).toBe(false);
    expect(target.requires).toBe('any');
  });
  it('`axe` is DECLARED on the felling atom and gated on ToolMixin, which the axe composes', () => {
    const axe = args().find((a) => a.name === 'axe')!;
    expect(axe.default).toBe('reachable:[capability.felling]');
    expect([axe.requires].flat()).toEqual(['ToolMixin']);
    expect(MixinApi.hasMixin(ToolItem, Mixins.Tool)).toBe(true);
  });
  it('the affordance: a Wood’s occupants have `fell`; a plain room’s do not; a Panel’s neighbours do; a bole itself does', () => {
    const verbs = (ctor: unknown, bucket: 'self' | 'inventory' | 'environment' | 'peers'): string[] =>
      CommandApi.collectContributions(ctor, bucket).map((d) => d.verbs).flat();
    expect(verbs(Wood, 'inventory')).toContain('fell');
    expect(verbs(Wood, 'environment')).not.toContain('fell');
    expect(verbs(SingletonCartesianLocation, 'inventory')).not.toContain('fell');
    expect(verbs(Panel, 'peers')).toContain('fell');
    expect(verbs(Panel, 'peers')).toContain('harvest'); // the copied-in four
    expect(verbs(Bole, 'self')).toContain('fell');
  });
});

/* ───────────────── through the whole binder ───────────────── */

class TestGiver extends ContainerMixin(
  ContainableMixin(FocusedMixin(CommandGiverMixin(NamedMixin(PerceptibleMixin(Idea))))),
) {}

const OAK = '/stuff/idea/species/plantae/tracheophyta/magnoliopsida/fagales/fagaceae/quercus/robur';

function realFell(): CommandDefinition {
  return CommandDefinition.fromYaml(readFileSync(VIEW, 'utf8'), 'trade/forestry/cmd/forestry/fell.yaml');
}

async function resolveFieldValidators(cmd: CommandDefinition): Promise<void> {
  await CommandApi.resolveValidators(cmd);
  // Drop the VERB-level gates (animate/embodied) — this fixture is about
  // the binder and its giver is a bare CommandGiver.
  (cmd as unknown as { _resolvedValidators?: unknown })._resolvedValidators = undefined;
}

type Drive =
  | { stage: 'shape' | 'bind'; summary: string }
  | { stage: 'refused'; detail: string }
  | { stage: 'ok'; target: string; raw: string; axe: string };

describe('fell.yaml through the whole binder', () => {
  let room: Wood;
  let giver: TestGiver;
  let axe: ToolItem;

  beforeEach(() => {
    StuffApi.clearAll();
    room = makeStuffAtPath(() => {
      const w = new Wood();
      w.setShortDescription('the ride');
      w.setMix([{ speciesPath: OAK, name: 'oak', woodMaterialPath: '/stuff/idea/material/wood/oak', seedPath: null, standing: 8, capacity: 10, incrementPerYear: 1 }]);
      return w;
    }, '/world/_test/hanging-wood/ride');
    giver = makeStuff(() => new TestGiver());
    giver.setName('Tam');
    ContainmentApi.move(giver, room);
    axe = makeStuffAtPath(() => {
      const t = new ToolItem();
      t.setShortDescription('felling axe');
      t.setKeywords(['axe', 'felling']);
      t.setCapabilities(['felling', 'cutting']);
      return t;
    }, '/trade/forestry/thing/felling-axe');
  });
  afterEach(() => StuffApi.clearAll());

  async function drive(line: string): Promise<Drive> {
    const cmd = realFell();
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
      const failed = ctx.getNotes().find((n) => n.kind === 'validator-failed') as { detail?: string } | undefined;
      return { stage: 'refused', detail: failed?.detail ?? '(no note)' };
    }
    const t = r.resolved.target as MqlOneResult | undefined;
    const a = r.resolved.axe as MqlOneResult | undefined;
    return {
      stage: 'ok',
      target: t === undefined ? '(absent)' : (t.stuff?.getPresentation() ?? 'NULL'),
      raw: t?.raw ?? '',
      axe: a === undefined ? '(absent)' : (a.stuff?.getPresentation() ?? 'NULL'),
    };
  }

  it('⭐⭐ `fell oak` binds NOTHING for the word and hands it over as raw — the stand is the room', async () => {
    ContainmentApi.move(axe, giver);
    expect(await drive('fell oak')).toEqual({ stage: 'ok', target: 'NULL', raw: 'oak', axe: 'a felling axe' });
  });

  it('bare `fell` — no target at all, and the axe in hand bound by the felling atom', async () => {
    ContainmentApi.move(axe, giver);
    const r = await drive('fell');
    expect(r.stage).toBe('ok');
    expect((r as { target: string }).target).toBe('(absent)');
    expect((r as { axe: string }).axe).toBe('a felling axe');
  });

  it('`fell bole` binds the bole on the floor', async () => {
    ContainmentApi.move(axe, giver);
    const bole = makeStuffAtPath(() => {
      const b = new Bole();
      b.setShortDescription('felled trunk');
      b.setKeywords(['bole', 'trunk']);
      return b;
    }, '/trade/forestry/thing/bole');
    ContainmentApi.move(bole, room);
    expect(await drive('fell bole')).toEqual({ stage: 'ok', target: 'a felled trunk', raw: 'bole', axe: 'a felling axe' });
  });

  it('with no axe anywhere the arg is simply unbound — the controller refuses in words, not the binder', async () => {
    const r = await drive('fell oak');
    expect(r.stage).toBe('ok');
    expect((r as { axe: string }).axe).toMatch(/NULL|\(absent\)/);
  });

  it('`fell oak with billhook` names the instrument (a ToolMixin), and the controller judges it', async () => {
    const hook = makeStuffAtPath(() => {
      const t = new ToolItem();
      t.setShortDescription('billhook');
      t.setKeywords(['billhook', 'hook']);
      t.setCapabilities(['cutting']);
      return t;
    }, '/trade/forestry/thing/billhook');
    ContainmentApi.move(hook, giver);
    expect(await drive('fell oak with billhook')).toEqual({ stage: 'ok', target: 'NULL', raw: 'oak', axe: 'a billhook' });
  });
});
