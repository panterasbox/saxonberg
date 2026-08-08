/**
 * StreamController — single dispatch-on-subcommand controller for the
 * `stream` verb, the v1 sliver of the livestream control plane (PLAN
 * §3 / Phase 3). Mutates the `/obj/StreamState` singleton; the mutation
 * fires `Events.StreamStateChanged`, which the backend-layer
 * `BroadcastFeed` re-pushes to broadcast (overlay) connections.
 *
 * Gated to the streamer axis declaratively — see stream.yaml's
 * `validators: requiresStreamer`. The dispatcher rejects the command
 * before this controller runs when the giver isn't a streamer.
 *
 * Subcommands:
 *   - `away <duration>` — enter standby; the standby overlay counts down
 *     to `now + duration`. Duration is shell-style (`15m`, `1h`,
 *     `1h30m`, `90s`); a bare number is minutes.
 *   - `back` — clear standby, go live.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { StuffApi } from '../../../api/stuff';
import StreamState from '../../StreamState';

interface StreamModel extends CommandModel {
  duration?: string;
}

export default class StreamController extends CommandController<StreamModel> {
  async execute(model: StreamModel, context: CommandContext): Promise<void> {
    switch (model.subcommand) {
      case 'away':
        return this.executeAway(model, context);
      case 'back':
        return this.executeBack(context);
      default:
        return this.fail(
          context,
          `Unknown stream subcommand: ${model.subcommand ?? '(none)'}`,
          'unknown-subcommand',
        );
    }
  }

  private executeAway(model: StreamModel, context: CommandContext): void {
    const raw = (model.duration ?? '').trim();
    const ms = StreamController.parseDurationMs(raw);
    if (ms === null || ms <= 0) {
      return this.fail(
        context,
        `can't parse duration '${raw}' (try 15m, 1h, 1h30m, 90s)`,
        'bad-duration',
      );
    }
    const state = this.resolveState();
    if (!state) {
      return this.fail(context, 'stream state unavailable', 'no-stream-state');
    }
    const awayUntil = Date.now() + ms;
    state.setAway(awayUntil);
    this.tell(
      context,
      `\nstandby — back in ${StreamController.formatMs(ms)}.\n`,
    );
  }

  private executeBack(context: CommandContext): void {
    const state = this.resolveState();
    if (!state) {
      return this.fail(context, 'stream state unavailable', 'no-stream-state');
    }
    state.goLive();
    this.tell(context, `\nlive — standby cleared.\n`);
  }

  private resolveState(): StreamState | null {
    return (
      StuffApi.findByTemplatePath<StreamState>(StreamState.TEMPLATE_PATH) ??
      null
    );
  }

  /**
   * Parse a shell-style duration into milliseconds. Accepts a chain of
   * `<number><unit>` segments (`1h30m`, `90s`, `2h`), a single unit, or
   * a bare number interpreted as minutes. Units: `s`/`m`/`h`/`d`.
   * Returns `null` on anything it can't read.
   */
  private static parseDurationMs(input: string): number | null {
    const text = input.trim().toLowerCase();
    if (text.length === 0) return null;
    if (/^\d+$/.test(text)) return Number(text) * 60_000; // bare → minutes
    const unitMs: Record<string, number> = {
      s: 1_000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };
    const re = /(\d+)\s*([smhd])/g;
    let total = 0;
    let matched = false;
    let consumed = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      matched = true;
      consumed += m[0].length;
      total += Number(m[1]) * unitMs[m[2] as string]!;
    }
    // Reject trailing/embedded junk (e.g. "15x", "1h?"): every char must
    // belong to a matched segment (whitespace aside).
    if (!matched || consumed !== text.replace(/\s/g, '').length) return null;
    return total;
  }

  /** Compact human label for a millisecond span (e.g. `1h 30m`). */
  private static formatMs(ms: number): string {
    const totalSec = Math.round(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const min = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (min > 0) parts.push(`${min}m`);
    if (s > 0 && h === 0) parts.push(`${s}s`);
    return parts.length > 0 ? parts.join(' ') : '0s';
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string = 'unspecified',
  ): void {
    this.tell(context, `\n${detail}\n`);
    context.note({ kind: 'controller-rejected', reason, detail });
    return;
  }
}
