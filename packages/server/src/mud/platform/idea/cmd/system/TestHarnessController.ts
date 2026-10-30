/**
 * TestHarnessController — the `testharness` verb: test-world staging
 * from inside the game, over the same `TestHarnessApi` the wire
 * harness's routes call. One implementation, two doors, the same rules.
 *
 *   testharness clock                          read: game time, day, hour, season
 *   testharness clock advance <dur>            30m | 2h | 1d — one token, a day at most
 *   testharness weather [--at <place>]         read: the pin, and the weather here
 *   testharness weather pin <kind> [--at <place>] [--alive]
 *   testharness weather unpin [--at <place>]
 *
 * ⭐ Subcommands and options, never phrases: it is scaffolding, and the
 * owner's grammar is not natural language. A bare subcommand READS, so
 * state can be checked before and after an act.
 *
 * ⛔ It exists only in a test world: the view is `testOnly` (the loader
 * withholds it anywhere else) and carries `requiresTestWorld` +
 * `requiresWizard`. A refusal — the span rule past a day, the clock's own
 * parse, a weather kind that is not one — comes back in its own words.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { TestHarnessApi } from '../../../../api/test-harness';
import { WeatherApi } from '../../../../api/weather';
import { AddressApi } from '../../../../api/address';
import { CelestialApi } from '../../../../api/celestial';
import { MixinApi } from '../../../../api/mixin';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import type { Containable } from '../../../../lib/spatial/Containable';

const TOPIC = 'shell.result';

/** The one-token durations the verb takes, in the clock's own grammar. */
const UNIT_WORDS: Record<string, string> = {
  s: 'seconds',
  m: 'minutes',
  h: 'hours',
  d: 'days',
};

interface TestHarnessModel extends CommandModel {
  subcommand?: string;
  op?: string;
  value?: string;
  at?: string;
  alive?: boolean;
}

export default class TestHarnessController extends CommandController<TestHarnessModel> {
  async execute(model: TestHarnessModel, context: CommandContext): Promise<void> {
    try {
      switch (model.subcommand) {
        case 'clock':
          return await this.clock(model, context);
        case 'weather':
          return await this.weather(model, context);
        default:
          return this.refuse(
            context,
            TOPIC,
            'testharness: `clock` or `weather` (see `help testharness`).',
            'test-usage',
          );
      }
    } catch (err) {
      // ⭐ The refusal's own words — the span rule, the clock's parse, a
      // kind that is not a weather — verbatim.
      const message = err instanceof Error ? err.message : String(err);
      this.refuse(context, TOPIC, message, 'test-refused', message);
    }
  }

  private async clock(model: TestHarnessModel, context: CommandContext): Promise<void> {
    if (model.op === undefined) {
      return this.say(context, await this.clockLine(context.commandGiver));
    }
    if (model.op !== 'advance' || !model.value) {
      return this.refuse(
        context,
        TOPIC,
        'testharness clock: read it with `testharness clock`, or move it with ' +
          '`testharness clock advance <dur>` (30m, 2h, 1d).',
        'test-usage',
      );
    }
    const duration = TestHarnessController.durationOf(model.value);
    if (duration === null) {
      return this.refuse(
        context,
        TOPIC,
        `testharness clock: '${model.value}' is not a duration — one token, ` +
          'a number and a unit: 30m, 2h, 1d.',
        'test-usage',
      );
    }
    const jump = await TestHarnessApi.advanceClock(duration);
    this.say(
      context,
      `The clock moved ${duration}: ${Math.round(jump.before)}s → ` +
        `${Math.round(jump.after)}s (settled in ${jump.settledMs} ms` +
        `${jump.quiet ? '' : ', still draining'}).\n` +
        (await this.clockLine(context.commandGiver)),
    );
  }

  private async weather(model: TestHarnessModel, context: CommandContext): Promise<void> {
    const where = await this.scopeOf(model, context.commandGiver);
    if (where === null) {
      return this.refuse(
        context,
        TOPIC,
        'testharness weather: no Locality covers here — the weather here is ' +
          'the global field. Name one with --at <place>.',
        'test-no-locality',
      );
    }
    if (model.op === undefined) {
      const read = await TestHarnessApi.weatherPinAt(where);
      const here = await this.weatherHere(context.commandGiver);
      return this.say(
        context,
        `${read.locality}: ` +
          (read.pin ? `pinned ${read.pin.type} (${read.pin.mode})` : 'no pin') +
          (here ? `. Here: ${here}.` : '.'),
      );
    }
    if (model.op === 'pin') {
      if (!model.value) {
        return this.refuse(
          context,
          TOPIC,
          'testharness weather pin <kind> — clear, overcast, rain, storm, fog or snow.',
          'test-usage',
        );
      }
      const r = await TestHarnessApi.pinWeather(
        where,
        model.value,
        model.alive ? 'alive' : 'frozen',
      );
      return this.say(
        context,
        `The weather over ${r.locality} is held at ${model.value}` +
          `${model.alive ? ' (alive)' : ''} until \`testharness weather unpin\`.`,
      );
    }
    if (model.op === 'unpin') {
      const r = await TestHarnessApi.unpinWeather(where);
      return this.say(context, `The weather over ${r.locality} runs free again.`);
    }
    return this.refuse(
      context,
      TOPIC,
      `testharness weather: '${model.op}' — read with \`testharness weather\`, ` +
        'or `pin <kind>` / `unpin`.',
      'test-usage',
    );
  }

  /** A one-token duration (`30m`, `2h`, `1d`, `90s`) in the clock's grammar. */
  private static durationOf(token: string): string | null {
    const m = /^(\d+(?:\.\d+)?)([smhd])$/.exec(token.trim());
    if (!m) return null;
    return `${m[1]} ${UNIT_WORDS[m[2] as string]}`;
  }

  /**
   * `--at <place>` (a template path) or the Locality the giver stands in.
   * ⚠ Resolved from the giver's ROOM: a body has no address of its own,
   * so the avatar resolves to no Locality (the drive found it).
   */
  private async scopeOf(model: TestHarnessModel, giver: Stuff): Promise<string | null> {
    if (model.at) return model.at;
    const room = MixinApi.isContainable(giver)
      ? (giver as Stuff & Containable).getContainer()
      : null;
    const locality = await AddressApi.resolveLocalityFor(room ?? giver);
    return locality?.getTemplatePath() ?? null;
  }

  private async clockLine(giver: Stuff): Promise<string> {
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

  /** The resolved weather where the giver stands, if a room holds them. */
  private async weatherHere(giver: Stuff): Promise<string | null> {
    if (!MixinApi.isContainable(giver)) return null;
    const room = (giver as Stuff & Containable).getContainer();
    if (room === null || !MixinApi.isContainer(room)) return null;
    const w = await WeatherApi.resolveWeatherFor(room as Stuff & Container);
    const falling = w.precipitationHere === 'none' ? '' : `, ${w.precipitationHere} falling`;
    return `${w.sample.type} (${w.provenance})${falling}`;
  }

  private say(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.text(text))
      .send();
  }
}
