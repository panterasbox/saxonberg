/**
 * ⭐ `write <words> on <thing>` through the real binder (underwater
 * review): a free-text tail BEFORE a prepositioned object is the shape a
 * controller test can never see, so this drives the shipped `write.yaml`
 * end to end — parse, assemble, resolve, validate.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { CommandApi, type CommandContext } from '../command';
import { CommandLineApi } from '../command-line';
import type { MqlOneResult } from '../mql';
import { CommandDefinition } from '../../lib/command/CommandDefinition';
import { ContainmentApi } from '../containment';
import { Idea } from '../../lib/stuff/Idea';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { ContainerMixin } from '../../lib/spatial/Container';
import { CommandGiverMixin } from '../../lib/command/CommandGiver';
import { FocusedMixin } from '../../lib/command/Focused';
import { NamedMixin } from '../../lib/description/Named';
import { PerceptibleMixin } from '../../lib/description/Perceptible';
import { VisibleMixin } from '../../lib/description/Visible';
import { MarkedMixin } from '../../lib/description/Marked';
import { StuffApi } from '../stuff';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type Place from '../../lib/stuff/Place';
import type Interactive from '../../platform/idea/Interactive';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { CommandGiver } from '../../lib/command/CommandGiver';

const WRITE_YAML = 'platform/cmd/inventory/write.yaml';

class TestLocation extends ContainerMixin(NamedMixin(PerceptibleMixin(Idea))) {}
class TestSlate extends MarkedMixin(VisibleMixin(ContainableMixin(NamedMixin(PerceptibleMixin(Idea))))) {}
class TestGiver extends ContainerMixin(
  ContainableMixin(FocusedMixin(CommandGiverMixin(NamedMixin(PerceptibleMixin(Idea))))),
) {}

function realWrite(): CommandDefinition {
  const path = fileURLToPath(new URL('../../../../../content/platform/content/platform/cmd/inventory/write.yaml', import.meta.url));
  return CommandDefinition.fromYaml(readFileSync(path, 'utf8'), WRITE_YAML);
}

describe('write.yaml through the whole binder', () => {
  let location: TestLocation;
  let giver: TestGiver;
  let slate: TestSlate;

  beforeEach(() => {
    StuffApi.clearAll();
    location = makeStuff(() => new TestLocation()) as TestLocation;
    location.setName('Quay');
    giver = makeStuff(() => new TestGiver()) as TestGiver;
    giver.setName('diver');
    ContainmentApi.move(giver as never, location as never);
    slate = makeStuff(() => new TestSlate()) as TestSlate;
    slate.setName('slate');
    ContainmentApi.move(slate as never, giver as never);
  });

  async function drive(line: string): Promise<{ stage: string; words?: string; surface?: string }> {
    const cmd = realWrite();
    await CommandApi.resolveValidators(cmd);
    (cmd as unknown as { _resolvedValidators?: unknown })._resolvedValidators = undefined;
    const parsed = CommandLineApi.parsePipeline(line).commands[0]!;
    const asm = CommandApi.assemble(parsed, cmd, {
      commandGiver: giver as unknown as Stuff & CommandGiver,
      location: location as unknown as Stuff & Container,
    });
    if ('error' in asm) return { stage: asm.error };
    const ctx: CommandContext = CommandApi.createCommandContext({
      commandGiver: giver as unknown as CommandContext['commandGiver'],
      interactive: {} as Interactive,
      location: location as unknown as Place,
      commandText: line,
      executionId: 'test-exec',
      commandId: 'test-cmd',
      verb: cmd.getPrimaryVerb(),
      command: cmd,
    });
    const r = await CommandApi.resolveAndValidate(asm.model, ctx);
    if (!('resolved' in r)) return { stage: 'refused' };
    const resolved = r.resolved as { words?: string; surface?: MqlOneResult };
    return {
      stage: 'ok',
      words: resolved.words,
      surface: resolved.surface?.stuff?.getPresentation() ?? 'NULL',
    };
  }

  it('⭐ binds every word before `on`, and the thing after it', async () => {
    expect(await drive('write meet at the anchor on slate')).toEqual({
      stage: 'ok',
      words: 'meet at the anchor',
      surface: 'slate',
    });
  });

  it('one word works the same', async () => {
    expect(await drive('write anchor on slate')).toEqual({ stage: 'ok', words: 'anchor', surface: 'slate' });
  });
});
