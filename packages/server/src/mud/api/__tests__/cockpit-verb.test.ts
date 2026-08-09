/**
 * The `cockpit` verb, through the real binder and the real registry.
 *
 * Acceptance criteria 2 and 3 ride here. Criterion 2 says the absorbed
 * verbs must be gone "asserted by a test, not by absence of a file" —
 * so this preloads the whole shipped `cmd/` tree and asks the registry
 * what verbs exist, rather than checking that three files are missing.
 * Re-adding `layout.yaml` tomorrow fails this test; a stat-the-file
 * check would not.
 *
 * The binder half matters because every controller test in the shell
 * suite hands its controller a pre-built model — so the YAML → model
 * mapping (`cockpit style theme x` → `styleSub='theme', a='x'`) is
 * untested by construction anywhere else, and that mapping is exactly
 * what the absorption changed.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { CommandApi } from '../command';
import { CommandLineApi } from '../command-line';
import { CommandDefinition } from '../../lib/command/CommandDefinition';
import { ContainmentApi } from '../containment';
import { Idea } from '../../lib/stuff/Idea';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { ContainerMixin } from '../../lib/spatial/Container';
import { CommandGiverMixin } from '../../lib/command/CommandGiver';
import { NamedMixin } from '../../lib/description/Named';
import { StuffApi } from '../stuff';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { CommandGiver } from '../../lib/command/CommandGiver';

const COCKPIT_YAML = 'shell/cockpit.yaml';

/** The three verbs the cockpit absorbed. None may resolve any more. */
const ABSORBED_VERBS = ['layout', 'style', 'mode'];

class TestLocation extends ContainerMixin(NamedMixin(Idea)) {}
class TestGiver extends ContainerMixin(
  ContainableMixin(CommandGiverMixin(NamedMixin(Idea)))
) {}

describe('the cockpit verb', () => {
  let cockpit: CommandDefinition | null;

  beforeAll(async () => {
    CommandApi.clearCache();
    const result = await CommandApi.preloadAll();
    expect(result.failed).toEqual([]);
    cockpit = CommandApi.getCommand(COCKPIT_YAML);
  });

  it('loads as a shipped spec', () => {
    expect(cockpit).toBeDefined();
    expect(cockpit!.hasVerb('cockpit')).toBe(true);
  });

  /*
   * Criterion 2. Asked of the registry, not the filesystem: "no shipped
   * command definition claims this verb". `mode` is the one that must be
   * gone entirely — `layout` and `style` survive as subcommands, but
   * neither may still be reachable as a top-level word.
   */
  it('has retired layout / style / mode as standalone verbs', () => {
    const all = CommandApi.allDefinitions();
    expect(all.length).toBeGreaterThan(0);
    for (const verb of ABSORBED_VERBS) {
      const claimants = all
        .filter((d) => d.hasVerb(verb))
        .map((d) => d.filePath);
      expect(claimants).toEqual([]);
    }
  });

  it('declares the absorbed controls as subcommands, each with a controller', () => {
    expect(cockpit!.getSubcommandNames().sort()).toEqual([
      'layout',
      'mode',
      'scope',
      'style',
    ]);
    expect(cockpit!.controllerForSubcommand('mode')).toBe(
      '/obj/command/shell/CockpitModeController'
    );
    expect(cockpit!.controllerForSubcommand('layout')).toBe(
      '/obj/command/shell/LayoutController'
    );
    expect(cockpit!.controllerForSubcommand('scope')).toBe(
      '/obj/command/shell/ModeController'
    );
    expect(cockpit!.controllerForSubcommand('style')).toBe(
      '/obj/command/shell/StyleController'
    );
  });

  it('routes the bare form to the reporting controller', () => {
    expect(cockpit!.resolvedController).toBe(
      '/obj/command/shell/CockpitController'
    );
  });

  describe('binding', () => {
    let location: TestLocation;
    let giver: TestGiver;

    beforeEach(() => {
      StuffApi.clearAll();
      location = makeStuff(() => new TestLocation()) as TestLocation;
      location.setName('Test Room');
      giver = makeStuff(() => new TestGiver()) as TestGiver;
      giver.setName('player');
      ContainmentApi.move(
        giver as unknown as Parameters<typeof ContainmentApi.move>[0],
        location as unknown as Parameters<typeof ContainmentApi.move>[1]
      );
    });

    /** parse → assemble. Every cockpit arg is a string, so no MQL runs. */
    function bind(line: string): Record<string, unknown> {
      const parsed = CommandLineApi.parsePipeline(line).commands[0]!;
      const asm = CommandApi.assemble(parsed, cockpit!, {
        commandGiver: giver as unknown as Stuff & CommandGiver,
        location: location as unknown as Stuff & Container,
      });
      if ('error' in asm) {
        throw new Error(
          `bind failed for "${line}": ${'summary' in asm ? asm.summary : asm.error}`
        );
      }
      return asm.model as unknown as Record<string, unknown>;
    }

    it('binds bare cockpit with no subcommand', () => {
      expect(bind('cockpit').subcommand).toBeUndefined();
    });

    it('binds cockpit mode <name>, and the bare report form', () => {
      const m = bind('cockpit mode watch');
      expect(m.subcommand).toBe('mode');
      expect(m.name).toBe('watch');
      expect(bind('cockpit mode').name).toBeUndefined();

      // The two-axis form the Views menu sends.
      const both = bind('cockpit mode watch streamer');
      expect(both.name).toBe('watch');
      expect(both.arrangement).toBe('streamer');
    });

    it('binds the cockpit layout action words', () => {
      const save = bind('cockpit layout save wide');
      expect(save.subcommand).toBe('layout');
      expect(save.name).toBe('save');
      expect(save.target).toBe('wide');

      expect(bind('cockpit layout forget wide').target).toBe('wide');
      expect(bind('cockpit layout list').name).toBe('list');
    });

    it('binds cockpit layout <name>', () => {
      const m = bind('cockpit layout world');
      expect(m.subcommand).toBe('layout');
      expect(m.name).toBe('world');
    });

    /*
     * The style tree is two levels deep but command subcommands are one
     * level framework-wide, so the second level rides positionals. These
     * are the assertions that would catch a slot being shifted.
     */
    it('binds the style tree onto positional slots', () => {
      const theme = bind('cockpit style theme high-contrast');
      expect(theme.subcommand).toBe('style');
      expect(theme.styleSub).toBe('theme');
      expect(theme.a).toBe('high-contrast');

      const channel = bind('cockpit style channel gossip color blue');
      expect(channel.styleSub).toBe('channel');
      expect(channel.a).toBe('gossip');
      expect(channel.b).toBe('color');
      expect(channel.c).toBe('blue');

      const plain = bind('cockpit style plain channel gossip on');
      expect(plain.styleSub).toBe('plain');
      expect(plain.a).toBe('channel');
      expect(plain.b).toBe('gossip');
      expect(plain.c).toBe('on');

      // Bare `cockpit style` is `show` — the controller's default.
      expect(bind('cockpit style').styleSub).toBeUndefined();
    });

    it('binds cockpit scope, greedily, and honours --bar', () => {
      const scoped = bind('cockpit scope chat gossip');
      expect(scoped.subcommand).toBe('scope');
      expect(scoped.prefix).toBe('chat gossip');

      expect(bind('cockpit scope off').prefix).toBe('off');
      expect(bind('cockpit scope').prefix).toBeUndefined();

      // The un-scoped affordance path: a button names its target bar.
      const named = bind('cockpit scope chat --bar stream-chat');
      expect(named.bar).toBe('stream-chat');
      expect(named.prefix).toBe('chat');
    });
  });
});
