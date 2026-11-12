/**
 * `print.yaml` through the whole binder (controller-liquidity W11): the
 * thing printed is an object arg (a forme or a ledger binds; a document's
 * name binds nothing and arrives raw), the run is a number arg, and the
 * instrument is `press` (it was `on`). The controller stopped splitting a
 * count off a greedy string and resolving the rest itself.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import Press from '../thing/Press';
import Printer from '../thing/Printer';
import Forme from '../thing/Forme';
import Place from '@saxonberg/server/mud/lib/stuff/Place';
import { CommandApi, type CommandContext } from '@saxonberg/server/mud/api/command';
import { CommandLineApi } from '@saxonberg/server/mud/api/command-line';
import type { MqlManyResult, MqlOneResult } from '@saxonberg/server/mud/api/mql';
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
import type Interactive from '@saxonberg/server/mud/platform/idea/Interactive';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

const VIEW = fileURLToPath(new URL('../../content/trade/printing/cmd/printing/print.yaml', import.meta.url));

class TestGiver extends ContainerMixin(
  ContainableMixin(FocusedMixin(CommandGiverMixin(NamedMixin(PerceptibleMixin(Idea))))),
) {}

describe('print.yaml through the whole binder', () => {
  let room: Place;
  let giver: TestGiver;

  beforeEach(() => {
    StuffApi.clearAll();
    room = makeStuff(() => new Place());
    giver = makeStuff(() => new TestGiver());
    giver.setName('Wynkyn');
    ContainmentApi.move(giver, room);
    const press = makeStuffAtPath(() => {
      const p = new Press();
      p.setShortDescription('hand press');
      p.setKeywords(['press']);
      return p;
    }, '/trade/printing/thing/_press');
    const printer = makeStuffAtPath(() => {
      const p = new Printer();
      p.setShortDescription('printer');
      p.setKeywords(['printer']);
      return p;
    }, '/trade/printing/thing/_printer');
    const forme = makeStuffAtPath(() => {
      const f = new Forme();
      f.setShortDescription('forme');
      f.setKeywords(['forme']);
      return f;
    }, '/trade/printing/thing/_forme');
    for (const s of [press, printer, forme]) ContainmentApi.move(s, room);
  });
  afterEach(() => StuffApi.clearAll());

  async function drive(line: string): Promise<{ what: string; raw: string; copies: unknown; press: string[] } | string> {
    const cmd = CommandDefinition.fromYaml(readFileSync(VIEW, 'utf8'), 'trade/printing/cmd/printing/print.yaml');
    await CommandApi.resolveValidators(cmd);
    (cmd as unknown as { _resolvedValidators?: unknown })._resolvedValidators = undefined;
    const parsed = CommandLineApi.parsePipeline(line).commands[0]!;
    const asm = CommandApi.assemble(parsed, cmd, {
      commandGiver: giver as unknown as Stuff & CommandGiver,
      location: room as unknown as Stuff & Container,
    });
    if ('error' in asm) return 'summary' in asm ? asm.summary : asm.error;
    const ctx: CommandContext = CommandApi.createCommandContext({
      commandGiver: giver as unknown as CommandContext['commandGiver'],
      interactive: {} as Interactive,
      location: room as unknown as Place,
      commandText: line,
      executionId: 'test-exec',
      commandId: 'test-cmd',
      verb: cmd.getPrimaryVerb(),
      command: cmd,
    });
    const r = await CommandApi.resolveAndValidate(asm.model, ctx);
    if (!('resolved' in r)) return 'refused';
    const w = r.resolved.what as MqlOneResult | undefined;
    const p = r.resolved.press as MqlManyResult | undefined;
    return {
      what: w?.stuff?.getPresentation() ?? 'NULL',
      raw: w?.raw ?? '',
      copies: r.resolved.copies,
      press: (p?.stuff ?? []).map((s) => s.getPresentation()),
    };
  }

  it('`print forme 20` binds the forme and the run', async () => {
    const out = await drive('print forme 20');
    expect(out).toMatchObject({ what: 'a forme' });
    expect(Number((out as { copies: unknown }).copies)).toBe(20);
  });

  it('`print prices 2 on printer` hands the document name over raw, and names the instrument', async () => {
    const out = await drive('print prices 2 on printer');
    expect(out).toMatchObject({ what: 'NULL', raw: 'prices', press: ['a printer'] });
    expect(Number((out as { copies: unknown }).copies)).toBe(2);
  });
});
