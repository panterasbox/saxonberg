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
 *
 * ⭐ controller-liquidity W7b: `card`, `shelf`, `layout` and `style` NEST
 * (D2) — each action is a stanza with its own controller, and every
 * closed word is a `values:` slot the binder refuses by name.
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
import { SHELF_ROW_IDS } from '@saxonberg/types';

const COCKPIT_YAML = 'platform/cmd/shell/cockpit.yaml';

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
      'card',
      'cli',
      'layout',
      'mode',
      'shelf',
      'style',
      'terminal',
    ]);
    expect(cockpit!.controllerForSubcommand('card')).toBe(
      '/platform/idea/cmd/shell/CockpitCardListController'
    );
    expect(cockpit!.controllerForSubcommand('shelf')).toBe(
      '/platform/idea/cmd/shell/CockpitShelfListController'
    );
    expect(cockpit!.controllerForSubcommand('mode')).toBe(
      '/platform/idea/cmd/shell/CockpitModeController'
    );
    expect(cockpit!.controllerForSubcommand('layout')).toBe(
      '/platform/idea/cmd/shell/LayoutRecallController'
    );
    expect(cockpit!.controllerForSubcommand('cli')).toBe(
      '/platform/idea/cmd/shell/CliController'
    );
    expect(cockpit!.controllerForSubcommand('style')).toBe(
      '/platform/idea/cmd/shell/StyleShowController'
    );
  });

  it('⭐ resolves each nested action to its own controller', () => {
    const C = '/platform/idea/cmd/shell/';
    const at = (path: string) => cockpit!.controllerForSubcommand(path);
    expect(at('layout save')).toBe(`${C}LayoutSaveController`);
    expect(at('layout forget')).toBe(`${C}LayoutForgetController`);
    expect(at('layout list')).toBe(`${C}LayoutListController`);
    expect(at('layout recall')).toBe(`${C}LayoutRecallController`);
    expect(at('card pin')).toBe(`${C}CockpitCardPinController`);
    expect(at('card dismiss')).toBe(`${C}CockpitCardUnpinController`);
    expect(at('card grow')).toBe(`${C}CockpitCardArrangeController`);
    expect(at('card move')).toBe(`${C}CockpitCardMoveController`);
    expect(at('shelf first')).toBe(`${C}CockpitShelfFirstController`);
    expect(at('style theme')).toBe(`${C}StyleThemeController`);
    expect(at('style mention self')).toBe(`${C}StyleMentionController`);
    expect(at('style plain')).toBe(`${C}StylePlainController`);
    expect(at('style plain channel')).toBe(`${C}StylePlainChannelController`);
  });

  /*
   * ⚠ The shelf's `values:` is a copy of `SHELF_ROW_IDS` (a view is YAML
   * and cannot import it). Pinned here so the two cannot drift: a row
   * added to the catalogue and not to the view would be refused by the
   * binder with a list that omits it.
   */
  it('⚠ the shelf rows the view accepts ARE SHELF_ROW_IDS', () => {
    for (const leaf of ['pin', 'unpin', 'first']) {
      const row = cockpit!.getSubcommand(`shelf ${leaf}`)!.args!.find((a) => a.name === 'row')!;
      expect(row.values).toEqual([...SHELF_ROW_IDS]);
    }
  });

  it('routes the bare form to the reporting controller', () => {
    expect(cockpit!.resolvedController).toBe(
      '/platform/idea/cmd/shell/CockpitController'
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

    /** parse → assemble, expecting the binder to refuse; the summary. */
    function refuse(line: string): { error: string; summary?: string } {
      const parsed = CommandLineApi.parsePipeline(line).commands[0]!;
      const asm = CommandApi.assemble(parsed, cockpit!, {
        commandGiver: giver as unknown as Stuff & CommandGiver,
        location: location as unknown as Stuff & Container,
      });
      expect('error' in asm, `"${line}" should be refused`).toBe(true);
      return asm as unknown as { error: string; summary?: string };
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

    it('⭐ binds the cockpit layout stanzas — and a layout NAMED `list` round-trips', () => {
      const save = bind('cockpit layout save wide');
      expect(save.subcommand).toBe('save');
      expect(save.subcommandPath).toEqual(['layout', 'save']);
      expect(save.name).toBe('wide');

      expect(bind('cockpit layout forget wide').name).toBe('wide');
      expect(bind('cockpit layout list').subcommandPath).toEqual(['layout', 'list']);

      // Drive step 9's grammar half: save a layout called `list`, then
      // recall it — the word that used to be caught before names.
      const named = bind('cockpit layout save list');
      expect(named.subcommandPath).toEqual(['layout', 'save']);
      expect(named.name).toBe('list');
      const recall = bind('cockpit layout recall list');
      expect(recall.subcommandPath).toEqual(['layout', 'recall']);
      expect(recall.name).toBe('list');

      // Bare `cockpit layout` reaches the recall stanza with no name (it lists).
      const bare = bind('cockpit layout');
      expect(bare.subcommand).toBe('layout');
      expect(bare.name).toBeUndefined();
    });

    it('binds the cockpit card stanzas; an unknown action is the binder\'s', () => {
      const pin = bind('cockpit card pin focus');
      expect(pin.subcommandPath).toEqual(['card', 'pin']);
      expect(pin.cardId).toBe('focus');

      expect(bind('cockpit card dismiss focus').subcommand).toBe('dismiss');
      expect(bind('cockpit card').subcommand).toBe('card');
      expect(refuse('cockpit card juggle focus').error).toBe('unknown-subcommand');
    });

    it('binds `cockpit card move <card> <col> <row>` (client-surface D8)', () => {
      const move = bind('cockpit card move who 1 2');
      expect(move.subcommand).toBe('move');
      expect(move.cardId).toBe('who');
      // A typed positional is coerced now (W1): numbers, not strings.
      expect(move.col).toBe(1);
      expect(move.row).toBe(2);
      expect(bind('cockpit card grow who').subcommand).toBe('grow');
    });

    /*
     * ⚠ `cockpit pane` is REFUSED, not aliased. The old name was a
     * typed subcommand with its own help and examples; leaving it
     * accepted would leave two names for one thing, which is the
     * vocabulary drift the rename exists to end. Asserted on the
     * assembler's own error rather than on a thrown string, so a
     * future alias would fail this test rather than pass it silently.
     */
    it('refuses the retired `cockpit pane` name', () => {
      const parsed = CommandLineApi.parsePipeline('cockpit pane list')
        .commands[0]!;
      const asm = CommandApi.assemble(parsed, cockpit!, {
        commandGiver: giver as unknown as Stuff & CommandGiver,
        location: location as unknown as Stuff & Container,
      });
      expect('error' in asm).toBe(true);
      expect((asm as { error: string }).error).toBe('unknown-subcommand');
    });

    /*
     * ⚠ Through the REAL parser, because a controller test binds
     * nothing: `cockpit shelf pin play` has to survive tokenizing into
     * two positional slots before the controller ever sees an action.
     */
    it('binds the cockpit shelf pin', () => {
      const pin = bind('cockpit shelf pin play');
      expect(pin.subcommandPath).toEqual(['shelf', 'pin']);
      expect(pin.row).toBe('play');

      expect(bind('cockpit shelf unpin coin').subcommand).toBe('unpin');
      const bare = bind('cockpit shelf');
      expect(bare.subcommand).toBe('shelf');
      expect(bare.row).toBeUndefined();

      // ⭐ The closed row set is the view's — refused by name, before a
      // controller is cloned.
      const bad = refuse('cockpit shelf pin nonsense');
      expect(bad.error).toBe('bind');
      expect(bad.summary).toContain('docket');
    });

    it('binds cockpit layout <name>', () => {
      const m = bind('cockpit layout world');
      expect(m.subcommand).toBe('layout');
      expect(m.name).toBe('world');
    });

    it('⭐ binds the style tree as stanzas, its closed words as values', () => {
      const theme = bind('cockpit style theme high-contrast');
      expect(theme.subcommandPath).toEqual(['style', 'theme']);
      expect(theme.theme).toBe('high-contrast');
      // `default` is retired and refused by the binder, naming the three.
      const retired = refuse('cockpit style theme default');
      expect(retired.error).toBe('bind');
      expect(retired.summary).toContain('marble');

      const channel = bind('cockpit style channel gossip color blue');
      expect(channel.subcommand).toBe('channel');
      expect(channel.key).toBe('gossip');
      expect(channel.action).toBe('color');
      expect(channel.value).toBe('blue');
      expect(bind('cockpit style channel gossip clear').action).toBe('clear');

      const plain = bind('cockpit style plain channel gossip on');
      expect(plain.subcommandPath).toEqual(['style', 'plain', 'channel']);
      expect(plain.key).toBe('gossip');
      expect(plain.state).toBe('on');
      const global = bind('cockpit style plain off');
      expect(global.subcommandPath).toEqual(['style', 'plain']);
      expect(global.state).toBe('off');

      expect(bind('cockpit style mention self on').subcommandPath).toEqual([
        'style',
        'mention',
        'self',
      ]);
      expect(bind('cockpit style links ids').choice).toBe('ids');
      expect(refuse('cockpit style links names').error).toBe('bind');

      // Bare `cockpit style` is the style stanza's own controller — show.
      expect(bind('cockpit style').subcommand).toBe('style');
    });

    /*
     * ⚠ `cockpit cli` is the INVERTED shape, and the inversion is the
     * point: the prefix is an option (it is free text, and free text
     * as a greedy positional is what made `off` a magic word), while
     * the line being configured is the positional.
     */
    it('binds cockpit cli — prefix is an option, the line is positional', () => {
      const set = bind('cockpit cli --prefix "chat gossip"');
      expect(set.subcommand).toBe('cli');
      expect(set.prefix).toBe('chat gossip');
      expect(set.cli).toBeUndefined();

      // `off` is an ordinary prefix now, not a reserved word.
      expect(bind('cockpit cli --prefix off').prefix).toBe('off');

      // Bare is a REPORT — no prefix bound, nothing cleared.
      const bare = bind('cockpit cli');
      expect(bare.prefix).toBeUndefined();
      expect(bare.clear).toBeUndefined();

      expect(bind('cockpit cli --clear').clear).toBe(true);

      // The un-prefixed affordance path: a button names its target line.
      const named = bind('cockpit cli stream-chat --prefix chat');
      expect(named.cli).toBe('stream-chat');
      expect(named.prefix).toBe('chat');
    });
  });
});
