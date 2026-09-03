/**
 * `converses` brain — trait-aware chatter: the same cadence emits more or
 * less, and warmer or terser, by the host's `sociability` position. The
 * first brain to read the **trait layer** (the demonstrator for Job 1 —
 * traits visibly driving behavior): a Gregarious host holds court; a Shy
 * one mostly keeps quiet. Claims `voice`. Presence-gated by default.
 *
 * This establishes the allowed `behavior → trait` read edge (brains may
 * read traits; the trait layer never reads behavior). It modulates only
 * what it *says* and how often — no new emission channel.
 *
 * config: `{ chatty: string[], terse: string[] }`
 *   - **chatty** — warm, talkative lines a Gregarious host favors.
 *   - **terse** — clipped lines a Shy host uses on the rare turn it speaks.
 */

import type { EngagementSlot } from '../activity/Engaged';
import { MixinApi } from '../../api/mixin';
import type { BrainContext, BrainStatics } from './brain';

/** The disposition axis this brain reads (Gregarious ↔ Shy). */
const AXIS = 'sociability';

function pool(config: Record<string, unknown>, key: string): string[] {
  const v = config[key];
  return Array.isArray(v) ? (v.filter((s) => typeof s === 'string') as string[]) : [];
}

function pick(lines: string[]): string | undefined {
  if (!lines.length) return undefined;
  return lines[Math.floor(Math.random() * lines.length)];
}

export const brain = class {
  static label = 'converses';
  static claims: readonly EngagementSlot[] = ['voice'];
  // Yield while the host is mid-conversation (voice/attention held) so its
  // trait-flavored chatter doesn't talk over the directed dialogue.
  static requiresFree: readonly EngagementSlot[] = ['voice', 'attention'];

  static async act(ctx: BrainContext): Promise<void> {
    const chatty = pool(ctx.config, 'chatty');
    const terse = pool(ctx.config, 'terse');
    if (!chatty.length && !terse.length) return;

    const { position } = MixinApi.isDispositioned(ctx.host)
      ? await ctx.host.traitPosition(AXIS)
      : { position: 0 };

    if (position < 0) {
      // Shy: the more pronounced the shyness, the more often silent.
      if (Math.random() * 100 < Math.abs(position)) return;
      const line = pick(terse.length ? terse : chatty);
      if (line) ctx.say(line);
      return;
    }

    // Gregarious (or neutral): speaks, favoring the warm pool.
    const line = pick(chatty.length ? chatty : terse);
    if (line) ctx.say(line);
  }
} satisfies BrainStatics;
