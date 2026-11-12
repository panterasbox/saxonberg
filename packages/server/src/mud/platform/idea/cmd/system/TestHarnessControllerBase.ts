/**
 * TestHarnessControllerBase — what the `testharness` forms share
 * (controller-liquidity W7a, D13: one controller per subcommand over a
 * base per noun; the clock's and the weather's acts are nested stanzas,
 * D2): test-world staging from inside the game, over the same
 * `TestHarnessApi` the wire harness's routes call. One implementation,
 * two doors, the same rules.
 *
 *   testharness clock                          read: game time, day, hour, season
 *   testharness clock-advance <dur>            30m | 2h | 1d — one token, a day at most
 *   testharness weather [--at <place>]         read: the pin, and the weather here
 *   testharness weather-pin <kind> [--at <place>] [--alive]
 *   testharness weather-unpin [--at <place>]
 *   testharness ship <ship> at node:<path>      stage a ship lying at a sea's node
 *   testharness ship <ship> at <frame> <cite>   …or at a citation on a frame
 *
 * (`TestHarnessClockController`, `TestHarnessClockAdvanceController`,
 * `TestHarnessWeatherController`, `TestHarnessWeatherPinController`,
 * `TestHarnessWeatherUnpinController`, `TestHarnessShipController`.)
 *
 * ⭐ Subcommands and options, never phrases: it is scaffolding, and the
 * owner's grammar is not natural language. A bare subcommand READS, so
 * state can be checked before and after an act.
 *
 * ⛔ It exists only in a test world: the view is `testOnly` (the loader
 * withholds it anywhere else) and carries `requiresTestWorld`. No
 * credential: staging the clock is not authoring code. A refusal — the
 * span rule past a day, the clock's own parse, a weather kind that is not
 * one — comes back in its own words (`staged`).
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { TestHarnessApi } from '../../../../api/test-harness';
import { CelestialApi } from '../../../../api/celestial';
import { MixinApi } from '../../../../api/mixin';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Containable } from '../../../../lib/spatial/Containable';

export const TOPIC = 'shell.result';

export interface TestHarnessModel extends CommandModel {
  subcommand?: string;
  op?: string;
  value?: string;
  at?: string;
  alive?: boolean;
  /** `ship`'s fourth word: a frame citation after `at <frame>`. */
  cite?: string;
}

export abstract class TestHarnessControllerBase extends CommandController<TestHarnessModel> {
  /**
   * Run one staging act. ⭐ A refusal's own words — the span rule, the
   * clock's parse, a kind that is not a weather — come back verbatim.
   */
  protected async staged(
    context: CommandContext,
    act: () => Promise<void>,
  ): Promise<void> {
    try {
      await act();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.refuse(context, TOPIC, message, 'test-refused', message);
    }
  }

  /**
   * `--at <place>` (a template path) or the place the giver stands in,
   * as a PATH — resolved to its Locality by the same walk the harness
   * route uses (`TestHarnessApi`), never a second one here. ⚠ A body has
   * no address of its own; its room does (the drive found both).
   */
  protected static scopeOf(model: TestHarnessModel, giver: Stuff): string | null {
    if (model.at) return model.at;
    const room = MixinApi.isContainable(giver)
      ? (giver as Stuff & Containable).getContainer()
      : null;
    return room?.getTemplatePath() ?? null;
  }

  protected static async clockLine(giver: Stuff): Promise<string> {
    const now = TestHarnessApi.clockNow();
    const day = Math.floor(now / 86_400);
    const into = ((now % 86_400) + 86_400) % 86_400;
    const hh = String(Math.floor(into / 3_600)).padStart(2, '0');
    const mm = String(Math.floor((into % 3_600) / 60)).padStart(2, '0');
    let season = '';
    try {
      season = `, ${await CelestialApi.currentSeason(giver)}`;
    } catch {
      // A body with no sky (a sandbox, a void) has no season to report.
    }
    return `Game time ${Math.round(now)}s — day ${day}, ${hh}:${mm}${season}.`;
  }

  /** The weather subcommands' refusal when no Locality covers the scope. */
  protected noLocality(context: CommandContext): void {
    this.refuse(
      context,
      TOPIC,
      'testharness weather: no Locality covers here — the weather here is ' +
        'the global field. Name one with --at <place>.',
      'test-no-locality',
    );
  }

  protected static say(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.text(text))
      .send();
  }
}
