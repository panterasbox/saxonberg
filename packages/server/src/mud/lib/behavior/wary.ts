/**
 * `wary` brain — a watchful sentry that detects and reacts.
 *
 * The detection *response* half of the concealment vertical: an NPC is
 * already a valid `PerceptionApi.perceives` viewer (detection is free), so
 * the only new surface is behavior. On a presence-gated cadence (and/or a
 * witness `arrival`), the host scans the creatures sharing its room and, on
 * a **state-change to detected** (a per-`state` seen-set delta, the
 * `greets`/`introduces` precedent), reacts — a spoken challenge, an alert
 * emote, and (optionally) opening combat. On a failed detection it stays
 * oblivious: a good-enough hider walks straight past.
 *
 * The vigilance knob is `config.alertness` — the active attention the
 * sentry brings to the concealment gate (a lax guard misses a decent hide;
 * a sharp one sees through a mediocre one). This is deterministic: a hider
 * whose concealment requirement exceeds the sentry's alertness is not
 * perceived, full stop — no dice. A plainly-visible (`obvious`) intruder is
 * always detected regardless of alertness.
 *
 * config: `{
 *   alertness?: number,   // attention vs concealed intruders (default 4)
 *   lines?: string[],     // spoken challenges (one picked per new detection)
 *   emote?: string,       // catalogue emote verb on detection (e.g. "point")
 *   hostile?: boolean,    // also open combat on the intruder (default false)
 * }`
 */

import { MixinApi } from '../../api/mixin';
import { PerceptionApi } from '../../api/perception';
import { ContainmentApi } from '../../api/containment';
import { CombatApi } from '../../api/combat';
import { CombatTerms } from '../combat/CombatTerms';
import type { Stuff } from '../stuff/Stuff';
import type { Engaged } from '../activity/Engaged';
import type { EngagementSlot } from '../activity/Engaged';
import type { BrainContext, BrainStatics } from './brain';

/** Default active attention a sentry brings to the concealment gate. */
const DEFAULT_ALERTNESS = 4;

/** The creatures sharing the host's room (the host excluded). */
function roomCreatures(host: Stuff): Stuff[] {
  if (!MixinApi.isContainable(host)) return [];
  const room = ContainmentApi.getContainer(host);
  if (!room || !MixinApi.isContainer(room)) return [];
  const out: Stuff[] = [];
  for (const c of ContainmentApi.getContents(room)) {
    if (c === host) continue;
    if (MixinApi.isMobile(c)) out.push(c); // a mover = a possible intruder
  }
  return out;
}

/** Best-effort: open a fight on a detected intruder (non-lethal). */
function attack(host: Stuff, intruder: Stuff): void {
  if (!MixinApi.isEngaged(host) || !MixinApi.isEngaged(intruder)) return;
  if (CombatApi.sessionFor(host) || CombatApi.sessionFor(intruder)) return;
  const terms = CombatTerms.agreed(
    host.getTemplatePath() ?? 'sentry',
    { lethality: 'non-lethal', stopCondition: 'yield', stakes: '' },
    true,
  );
  try {
    CombatApi.openSession(host as Stuff & Engaged, intruder as Stuff & Engaged, terms);
  } catch {
    // A sentry that can't start the fight just keeps challenging.
  }
}

export const brain = class {
  static label = 'wary';
  static claims: readonly EngagementSlot[] = ['attention'];
  // A functional poller (its cadence is the watch interval), not ambient
  // chatter — honor the authored interval exactly.
  static ambient = false;

  static act(ctx: BrainContext): void {
    const host = ctx.host;
    const alertness =
      typeof ctx.config.alertness === 'number'
        ? ctx.config.alertness
        : DEFAULT_ALERTNESS;
    const lines = Array.isArray(ctx.config.lines)
      ? (ctx.config.lines as string[])
      : [];
    const emoteVerb =
      typeof ctx.config.emote === 'string' ? ctx.config.emote : undefined;
    const hostile = ctx.config.hostile === true;

    // The seen-set across fires (framework-owned scratch, not persisted) —
    // react ONCE per detection, and re-arm if the intruder leaves and
    // returns (the greets/introduces delta pattern).
    const seen: Set<string> =
      ctx.state.detected instanceof Set
        ? (ctx.state.detected as Set<string>)
        : new Set<string>();

    const detectedNow = new Set<string>();
    for (const cand of roomCreatures(host)) {
      if (!PerceptionApi.perceives(host, cand, alertness)) continue; // oblivious
      detectedNow.add(cand.stuffId);
      if (seen.has(cand.stuffId)) continue; // already reacted to this one

      // A fresh detection — react.
      if (lines.length) {
        // Deterministic pick: rotate by how many are already detected.
        const line = lines[detectedNow.size % lines.length];
        if (typeof line === 'string') ctx.say(line, cand);
      }
      if (emoteVerb) void ctx.emote(emoteVerb, cand);
      if (hostile) attack(host, cand);
    }

    ctx.state.detected = detectedNow;
  }
} satisfies BrainStatics;
