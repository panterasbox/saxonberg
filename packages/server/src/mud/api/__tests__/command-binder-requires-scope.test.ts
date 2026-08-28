/**
 * `requires:` is part of the scope SCAN, not only a post-bind check.
 *
 * The libations live drive found `talk dave` in Dave's Bar answering
 * "Dave's Bar has nothing to say": the `$focus` scope (`here` — the
 * room) matched the room by name first, the scan stopped at the first
 * scope with any match, and the field's `requires: BehavedMixin` then
 * refused the room — with the barkeep standing right there in the
 * `reachable` scope the scan never reached. A scope's answer counts
 * only if something in it can satisfy `requires:`; otherwise the scan
 * moves on. When NOTHING anywhere is admissible the first raw match is
 * still bound, so the validator can say why (the massless-rock refusal
 * pinned by `command-binder-throw.test.ts`).
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
import { TangibleMixin } from '../../lib/material/Tangible';
import { VisibleMixin } from '../../lib/description/Visible';
import { StuffApi } from '../stuff';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../lib/stuff/Stuff';
import type Location from '../../lib/stuff/Location';
import type Interactive from '../../platform/idea/Interactive';
import type { Container } from '../../lib/spatial/Container';
import type { CommandGiver } from '../../lib/command/CommandGiver';

class TestLocation extends ContainerMixin(NamedMixin(PerceptibleMixin(Idea))) {}
class TestThing extends TangibleMixin(
  VisibleMixin(ContainableMixin(NamedMixin(PerceptibleMixin(Idea))))
) {}
class TestGiver extends ContainerMixin(
  ContainableMixin(
    FocusedMixin(CommandGiverMixin(NamedMixin(PerceptibleMixin(Idea))))
  )
) {}

/** throw.yaml with the item scanned focus-first, the way `talk` is. */
function throwFocusFirst(): CommandDefinition {
  const path = fileURLToPath(
    new URL('../../../../../content/platform/content/platform/cmd/inventory/throw.yaml', import.meta.url)
  );
  const text = readFileSync(path, 'utf8').replace(
    /scope: "reachable"/,
    'scope: ["$focus", "reachable"]'
  );
  return CommandDefinition.fromYaml(text, 'platform/cmd/inventory/throw.yaml');
}

describe('a `requires:`-aware scope scan', () => {
  let location: TestLocation;
  let giver: TestGiver;

  beforeEach(() => {
    StuffApi.clearAll();
    location = makeStuff(() => new TestLocation()) as TestLocation;
    // The room's own name matches the fragment the player types.
    location.setName("Dave's Bar");
    giver = makeStuff(() => new TestGiver()) as TestGiver;
    giver.setName('player');
    ContainmentApi.move(
      giver as unknown as Parameters<typeof ContainmentApi.move>[0],
      location as unknown as Parameters<typeof ContainmentApi.move>[1]
    );
  });

  it('falls through a focus match that cannot satisfy `requires:` to the reachable one that can', async () => {
    const dave = makeStuff(() => new TestThing()) as TestThing;
    dave.setName('dave');
    ContainmentApi.move(
      dave as unknown as Parameters<typeof ContainmentApi.move>[0],
      giver as unknown as Parameters<typeof ContainmentApi.move>[1]
    );
    const cmd = throwFocusFirst();
    await CommandApi.resolveValidators(cmd);
    (cmd as unknown as { _resolvedValidators?: unknown })._resolvedValidators = undefined;
    const line = 'throw dave';
    const parsed = CommandLineApi.parsePipeline(line).commands[0]!;
    const asm = CommandApi.assemble(parsed, cmd, {
      commandGiver: giver as unknown as Stuff & CommandGiver,
      location: location as unknown as Stuff & Container,
    });
    expect('error' in asm).toBe(false);
    if ('error' in asm) return;
    const ctx: CommandContext = CommandApi.createCommandContext({
      commandGiver: giver as unknown as CommandContext['commandGiver'],
      interactive: {} as Interactive,
      location: location as unknown as Location,
      commandText: line,
      executionId: 'test-exec',
      commandId: 'test-cmd',
      verb: cmd.getPrimaryVerb(),
      command: cmd,
    });
    const r = await CommandApi.resolveAndValidate(asm.model, ctx);
    expect('resolved' in r).toBe(true);
    if (!('resolved' in r)) return;
    const item = r.resolved['item'] as MqlOneResult;
    // The tangible Dave in hand, never the room that shares his name.
    expect(item.stuff).toBe(dave);
  });
});
