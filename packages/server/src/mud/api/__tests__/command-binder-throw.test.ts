/**
 * The binder, end to end, against a **real shipped YAML**.
 *
 * Every other command test starts after the binder: a controller test
 * is handed a pre-built model, and `command-empty-resolve` builds its
 * definitions from inline YAML strings. So verb *shape* — does
 * `throw rock at wolf` actually parse, do the args bind, do the
 * validators fire — was untested by construction, and two defects in
 * `throw.yaml` alone escaped the suite entirely: `$focus` beside a
 * preposition never matching a shape, and an `inventory` scope on an
 * argument the design wants resolved off the ground.
 *
 * This walks the whole chain the dispatcher walks —
 * parse → assemble (shape match) → resolve (MQL) → validate — reading
 * `cmd/inventory/throw.yaml` off disk. Edit that file wrongly and these
 * fail.
 *
 * ⚠ `CommandDefinition.fromYaml` does NOT resolve path-form validator
 * refs; only `CommandApi.preloadAll()` does. A harness that skips
 * `resolveFieldValidators` below reports a clean pass on input the real
 * dispatcher refuses.
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
import type Location from '../../lib/stuff/Location';
import type Interactive from '../../platform/idea/Interactive';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { CommandGiver } from '../../lib/command/CommandGiver';

const THROW_YAML = 'platform/cmd/inventory/throw.yaml';

class TestLocation extends ContainerMixin(NamedMixin(PerceptibleMixin(Idea))) {}
class TestThing extends TangibleMixin(
  VisibleMixin(ContainableMixin(NamedMixin(PerceptibleMixin(Idea))))
) {}
/** No mass — what `requires: TangibleMixin` exists to turn away. */
class Weightless extends ContainableMixin(NamedMixin(PerceptibleMixin(Idea))) {}
class TestGiver extends ContainerMixin(
  ContainableMixin(
    FocusedMixin(CommandGiverMixin(NamedMixin(PerceptibleMixin(Idea))))
  )
) {}

/**
 * The shipped `throw.yaml`. `itemScope` rewrites the item argument's
 * scope so a test can pin what a *narrower* scope would cost.
 */
function realThrow(itemScope?: string): CommandDefinition {
  const path = fileURLToPath(new URL('../../../../../content/platform/content/platform/cmd/inventory/throw.yaml', import.meta.url));
  let text = readFileSync(path, 'utf8');
  if (itemScope !== undefined) {
    text = text.replace(/scope: "reachable"/, `scope: "${itemScope}"`);
  }
  return CommandDefinition.fromYaml(text, THROW_YAML);
}

/**
 * Populate `_resolvedValidators` the way `preloadAll` would.
 *
 * ⚠⚠ This used to walk `cmd.args` and resolve each `validators:` entry
 * by hand, and that is precisely how it broke: when the kind gate moved
 * from a validator file onto the slot as `requires: TangibleMixin`, the
 * hand-rolled loop kept resolving the `validators:` list and silently
 * installed **no kind check at all** — so "refuses something with no
 * mass" passed a weightless wisp and reported `ok`. A fixture that
 * reimplements a framework step only knows the steps that existed when
 * it was written. Ask the framework.
 */
async function resolveFieldValidators(cmd: CommandDefinition): Promise<void> {
  await CommandApi.resolveValidators(cmd);
  // ⚠ …then drop the VERB-level gates. This fixture is about the
  // binder, and its `TestGiver` is a bare CommandGiver — no organism,
  // no body — so `requiresAnimate` / `requiresEmbodied` would refuse
  // every drive with "player can't do that" before an arg was ever
  // examined. Dropping them explicitly beats never resolving them:
  // this way the field gates come from the framework, whatever they
  // grow into, and the one thing being skipped is named.
  (cmd as unknown as { _resolvedValidators?: unknown })._resolvedValidators =
    undefined;
}

type DriveResult =
  | { stage: 'shape' | 'bind'; summary: string }
  | { stage: 'refused'; detail: string }
  | { stage: 'ok'; item: string; target: string };

describe('throw.yaml through the whole binder', () => {
  let location: TestLocation;
  let giver: TestGiver;
  let rock: TestThing;

  beforeEach(() => {
    StuffApi.clearAll();
    location = makeStuff(() => new TestLocation()) as TestLocation;
    location.setName('Town Square');

    giver = makeStuff(() => new TestGiver()) as TestGiver;
    giver.setName('player');
    move(giver, location);

    rock = makeStuff(() => new TestThing()) as TestThing;
    rock.setName('rock');
  });

  function move(what: unknown, where: unknown): void {
    ContainmentApi.move(
      what as Parameters<typeof ContainmentApi.move>[0],
      where as Parameters<typeof ContainmentApi.move>[1]
    );
  }

  /** parse → assemble → resolve → validate, exactly as dispatch does. */
  async function drive(cmd: CommandDefinition, line: string): Promise<DriveResult> {
    await resolveFieldValidators(cmd);
    const parsed = CommandLineApi.parsePipeline(line).commands[0]!;
    const asm = CommandApi.assemble(parsed, cmd, {
      commandGiver: giver as unknown as Stuff & CommandGiver,
      location: location as unknown as Stuff & Container,
    });
    if ('error' in asm) {
      const summary = 'summary' in asm ? asm.summary : asm.error;
      return { stage: asm.error === 'shape' ? 'shape' : 'bind', summary };
    }
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
    if (!('resolved' in r)) {
      const failed = ctx
        .getNotes()
        .find((n) => n.kind === 'validator-failed') as { detail?: string } | undefined;
      return { stage: 'refused', detail: failed?.detail ?? '(no note)' };
    }
    const name = (v: unknown): string =>
      v === undefined ? '(absent)' : ((v as MqlOneResult).stuff?.getPresentation() ?? 'NULL');
    return { stage: 'ok', item: name(r.resolved.item), target: name(r.resolved.target) };
  }

  it('binds an item you are holding', async () => {
    move(rock, giver);
    expect(await drive(realThrow(), 'throw rock')).toEqual({
      stage: 'ok',
      item: 'rock',
      target: '(absent)',
    });
  });

  it('binds an item lying on the ground, then tells you to pick it up', async () => {
    move(rock, location);
    // The point of the wide scope: the rock RESOLVES, so the refusal
    // can name the fix instead of claiming the rock is not there.
    // Picking it up is a public act, and that tell is worth imposing.
    expect(await drive(realThrow(), 'throw rock')).toEqual({
      stage: 'refused',
      detail: "you'll have to pick up rock first",
    });
  });

  it('⚠ an `inventory` scope cannot see the ground at all', async () => {
    move(rock, location);
    // Why the scope must stay wide. Under `inventory` the same command
    // binds NOTHING — no match, no refusal, no way for `mustBeHeld` to
    // ever run. This is the defect the wide scope fixes; narrowing it
    // back silently removes the teaching refusal above.
    expect(await drive(realThrow('inventory'), 'throw rock')).toEqual({
      stage: 'ok',
      item: 'NULL',
      target: '(absent)',
    });
  });

  it('prefers the one in your hand when two share a name', async () => {
    // `reachable` emits on-person candidates FIRST, so widening the
    // scope does not cost you the obvious reading: with a rock in hand
    // and another at your feet, `throw rock` throws the one you are
    // holding rather than refusing with "pick it up first".
    move(rock, giver);
    const other = makeStuff(() => new TestThing()) as TestThing;
    other.setName('rock');
    move(other, location);
    expect(await drive(realThrow(), 'throw rock')).toEqual({
      stage: 'ok',
      item: 'rock',
      target: '(absent)',
    });
  });

  it('parses the two-argument form and binds both sides', async () => {
    // The regression for `$focus` beside a preposition: an arg carrying
    // `$focus` in its scope chain never matches a shape, so this whole
    // line fell through to "no known command shape".
    move(rock, giver);
    const wolf = makeStuff(() => new TestThing()) as TestThing;
    wolf.setName('wolf');
    move(wolf, location);
    expect(await drive(realThrow(), 'throw rock at wolf')).toEqual({
      stage: 'ok',
      item: 'rock',
      target: 'wolf',
    });
  });

  it('refuses something with no mass', async () => {
    const wisp = makeStuff(() => new Weightless()) as Weightless;
    wisp.setName('wisp');
    move(wisp, giver);
    expect(await drive(realThrow(), 'throw wisp')).toEqual({
      stage: 'refused',
      detail: "wisp isn't tangible",
    });
  });
});
