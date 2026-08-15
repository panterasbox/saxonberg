/**
 * Acceptance criterion 9: **a mode gates nothing.**
 *
 * A mode is a view — it owns which arrangements ship, which one you
 * land in, and which pane kinds may be summoned. It does not own
 * permission. Everything runnable in `play` is runnable in `build`.
 *
 * ⚠ This test exists because "study mode shouldn't allow combat" is a
 * seductive one-liner, and taking it would put a permission check in
 * the UI layer with no audit trail, no ownership model and no way for
 * a player to discover why a verb vanished. It is written now, while
 * the temptation is live, rather than after someone acts on it.
 *
 * Two halves, because either alone is weak:
 *
 *   - behavioural — a real verb resolves identically in every mode;
 *   - structural  — nothing in the command tree so much as READS the
 *     mode. The behavioural half only covers the verbs it drives; the
 *     structural half is what catches a gate added to verb #300.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, relative } from 'path';
import { CommandApi, type CommandContext } from '../command';
import { CommandLineApi } from '../command-line';
import { CommandDefinition } from '../../lib/command/CommandDefinition';
import { ContainmentApi } from '../containment';
import { HasInteractiveMixin } from '../../lib/connection/HasInteractive';
import { Idea } from '../../lib/stuff/Idea';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { ContainerMixin } from '../../lib/spatial/Container';
import { CommandGiverMixin } from '../../lib/command/CommandGiver';
import { FocusedMixin } from '../../lib/command/Focused';
import { NamedMixin } from '../../lib/description/Named';
import { PerceptibleMixin } from '../../lib/description/Perceptible';
import { SensorMixin } from '../../lib/message/Sensor';
import { VisibleMixin } from '../../lib/description/Visible';
import { TangibleMixin } from '../../lib/material/Tangible';
import { StuffApi } from '../stuff';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type Location from '../../lib/stuff/Location';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { CommandGiver } from '../../lib/command/CommandGiver';
import { COCKPIT_MODES } from '@saxonberg/types';

const MUD_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/**
 * The only places allowed to read `cockpit.mode`: the mixin that
 * declares it, the cockpit's own controllers, the subscription
 * registry that resolves a mode's saved arrangement, and tests.
 *
 * ⚠ **The registry is a VIEW reader, not a gate**, and the distinction
 * is the whole criterion. `applyArrangement` asks the mode which panes
 * to open — which is the mode doing exactly what this file's header
 * says a mode owns (*"which arrangements ship, which one you land
 * in"*). It never asks the mode whether an action is permitted, and
 * the behavioural half below still proves a verb resolves identically
 * in every mode, which is the half that guards permission.
 *
 * ⚠ Adding a line here is a design decision, not a lint fix. The next
 * entry needs the same sentence: what does it do with the mode, and is
 * it a view question or a permission question?
 */
const MODE_READERS_ALLOWED = [
  'lib/connection/HasInteractive.ts',
  'obj/command/shell/CockpitController.ts',
  'obj/command/shell/CockpitModeController.ts',
  'obj/command/shell/LayoutController.ts',
  'obj/MqlSubscriptionRegistry.ts',
];

class TestLocation extends ContainerMixin(NamedMixin(PerceptibleMixin(Idea))) {}
class TestThing extends TangibleMixin(
  VisibleMixin(ContainableMixin(NamedMixin(PerceptibleMixin(Idea))))
) {}
class TestActor extends HasInteractiveMixin(
  SensorMixin(
    ContainerMixin(
      ContainableMixin(
        FocusedMixin(CommandGiverMixin(NamedMixin(PerceptibleMixin(Idea))))
      )
    )
  )
) {
  static _mixinName = 'ModeGateTestActor';
}

/** Every `.ts` under `src/mud`, excluding tests. */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      sourceFiles(full, out);
    } else if (entry.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

describe('a cockpit mode gates nothing', () => {
  /*
   * Structural. A gate has to read the mode to enforce it, so "who
   * reads `cockpit.mode`" is the complete list of places a gate could
   * live — and it is a short, reviewable list of cockpit-internal
   * files.
   */
  it('is read by nothing outside the cockpit itself', () => {
    const files = sourceFiles(MUD_ROOT);
    // The scan must actually be scanning. An empty walk, or an
    // allowlist that has drifted off the real filenames, would make
    // this assertion pass while checking nothing at all.
    expect(files.length).toBeGreaterThan(500);

    const reads = (text: string): boolean =>
      text.includes('cockpit.mode') || text.includes('getCockpitMode');

    const seenAllowed = new Set<string>();
    const offenders: string[] = [];
    for (const file of files) {
      const rel = relative(MUD_ROOT, file).split('\\').join('/');
      const text = readFileSync(file, 'utf8');
      if (!reads(text)) continue;
      if (MODE_READERS_ALLOWED.includes(rel)) {
        seenAllowed.add(rel);
        continue;
      }
      offenders.push(rel);
    }
    expect(offenders).toEqual([]);
    // Every allowlisted file really does read the mode — so the
    // allowlist is a live record, not a pile of stale exemptions that
    // would silently start covering something else after a rename.
    expect([...seenAllowed].sort()).toEqual([...MODE_READERS_ALLOWED].sort());
  });

  it('is not named by any command spec’s validators', async () => {
    CommandApi.clearCache();
    await CommandApi.preloadAll();
    const named: string[] = [];
    for (const def of CommandApi.allDefinitions()) {
      const specs = [
        ...def.validators,
        ...Object.values(def.subcommands).flatMap((s) => s.validators ?? []),
      ];
      for (const spec of specs) {
        if (/mode/i.test(spec)) named.push(`${def.filePath}: ${spec}`);
      }
    }
    expect(named).toEqual([]);
  });

  /*
   * Behavioural. The same verb, the same world, every mode — same
   * answer. If a mode ever became a gate, the resolve would start
   * diverging across this loop.
   */
  describe('a verb runnable in play is runnable in every mode', () => {
    let look: CommandDefinition | null;
    let location: TestLocation;
    let actor: TestActor;
    let lantern: TestThing;

    beforeAll(async () => {
      CommandApi.clearCache();
      await CommandApi.preloadAll();
      look = CommandApi.getCommand('perception/look.yaml');
      expect(look).toBeDefined();
    });

    beforeEach(() => {
      StuffApi.clearAll();
      location = makeStuff(() => new TestLocation()) as TestLocation;
      location.setName('Town Square');
      actor = makeStuff(() => new TestActor()) as TestActor;
      actor.setName('player');
      ContainmentApi.move(
        actor as unknown as Parameters<typeof ContainmentApi.move>[0],
        location as unknown as Parameters<typeof ContainmentApi.move>[1]
      );
      lantern = makeStuff(() => new TestThing()) as TestThing;
      lantern.setName('lantern');
      ContainmentApi.move(
        lantern as unknown as Parameters<typeof ContainmentApi.move>[0],
        location as unknown as Parameters<typeof ContainmentApi.move>[1]
      );
    });

    async function resolveLook(): Promise<string> {
      const parsed = CommandLineApi.parsePipeline('look at lantern')
        .commands[0]!;
      const asm = CommandApi.assemble(parsed, look!, {
        commandGiver: actor as unknown as Stuff & CommandGiver,
        location: location as unknown as Stuff & Container,
      });
      if ('error' in asm) return `assemble:${asm.error}`;
      const ctx: CommandContext = CommandApi.createCommandContext({
        commandGiver: actor as unknown as CommandContext['commandGiver'],
        location: location as unknown as Location,
        commandText: 'look at lantern',
        executionId: 'test-exec',
        commandId: 'test-cmd',
        verb: 'look',
        command: look!,
      });
      const r = await CommandApi.resolveAndValidate(asm.model, ctx);
      return 'resolved' in r ? 'resolved' : 'refused';
    }

    for (const mode of COCKPIT_MODES) {
      it(`resolves in ${mode}`, async () => {
        actor.setClientState('cockpit.mode', mode);
        expect(actor.getCockpitMode()).toBe(mode);
        expect(await resolveLook()).toBe('resolved');
      });
    }
  });
});
