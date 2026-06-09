/**
 * EmoteGrammar — types + runtime for the emote-substrate's authoring
 * surface (slot vocabulary) and dispatch surface (binding + rendering).
 *
 * Authors describe each emote with a single Liquid template plus a slot
 * map. Slots are typed: `stuff` slots resolve via MQL to a Stuff ref,
 * `free` slots accept arbitrary text. At dispatch time
 * `EmoteGrammarRunner.bind` walks the speaker's tokens against the slot
 * declarations; `EmoteGrammarRunner.render` produces per-audience prose
 * by pre-binding `actor` / `target` / `s` / `es` / `ies` differently for
 * self / peer / target.
 *
 * NOT a verb conjugator or template-cascade engine. One Liquid template
 * per emote handles all slot-presence permutations via Liquid
 * conditionals.
 */

import type { Stuff } from '../stuff/Stuff';
import { Mml } from '../../api/mml';
import { ProseApi } from '../../api/prose';
import { MqlApi } from '../../api/mql';
import { MixinApi } from '../../api/mixin';
import { DescribeApi } from '../../api/describe';
import type { CommandGiver } from '../command/CommandGiver';
import type { Emote } from './Emote';

/**
 * Slot kind vocabulary. The slate's `literal` and `enum` kinds were
 * dropped:
 *   - `literal` is redundant with the template text the author writes.
 *   - `enum` was the moderation foundation, and moderation is deferred.
 */
export type SlotKind = 'stuff' | 'free';

export interface EmoteSlot {
  kind: SlotKind;
  optional?: boolean;
  /**
   * For `stuff` slots only. Scope defaults to `'online'` (universal ESP
   * target delivery — the target needn't be in the room). Override with
   * a finer scope when desired.
   */
  scope?: string;
}

export interface EmoteGrammar {
  slots: Record<string, EmoteSlot>;
  /** Single Liquid template handling all slot-presence permutations. */
  template: string;
  /**
   * Optional irregular-verb override. When absent the engine binds
   * `s` / `es` / `ies` per audience; authors using the helpers cover
   * the regular cases. When present, the renderer additionally binds
   * `verbForm` directly (`self` for `actor=you`, `third` for
   * `actor=name`).
   */
  verbForm?: { self: string; third: string };
}

export interface BoundEmote {
  target: Stuff | null;
  fills: Record<string, string>;
}

export type Audience = 'self' | 'peer' | 'target';

export class EmoteGrammarRunner {
  /**
   * Bind a speaker's positional tokens against the emote's slot
   * declarations. Iterates slots in YAML order, trying to consume one
   * token per slot. Skip-on-mismatch for optional `stuff` slots that
   * fail to resolve. Required slots that don't bind raise.
   *
   * For `stuff` slots, target resolution uses `MqlApi.resolveOne` at
   * the slot's `scope` (default `'online'`). For `free` slots whose
   * declaration is the last one, the rest of the tokens are
   * consumed greedily.
   *
   * Heuristic: the conventional shape is `verb [stuff-slot] [free-slot]`
   * — i.e. one target then a manner clause. The binder honors that
   * with skip-on-mismatch on optional `stuff` slots so
   * `wave happily` (no target, manner is "happily") works against
   * the same grammar as `wave iffy` (target, no manner).
   */
  static bind(
    emote: Emote,
    tokens: string[],
    speaker: Stuff,
  ): BoundEmote {
    if (!MixinApi.isCommandGiver(speaker)) {
      throw new Error(
        `EmoteGrammarRunner.bind: speaker ${speaker.stuffId} is not a CommandGiver`,
      );
    }
    const giver = speaker as Stuff & CommandGiver;
    const slots = Object.entries(emote.grammar.slots);
    const fills: Record<string, string> = {};
    let target: Stuff | null = null;
    let cursor = 0;

    const isLastSlot = (idx: number): boolean => idx === slots.length - 1;

    for (let i = 0; i < slots.length; i++) {
      const slotEntry = slots[i]!;
      const [name, spec] = slotEntry;
      if (cursor >= tokens.length) {
        if (spec.optional) continue;
        throw new EmoteBindError(
          `Missing required slot '${name}' for emote '${emote.verb}'.`,
        );
      }
      if (spec.kind === 'stuff') {
        const scope = spec.scope ?? 'online';
        const result = MqlApi.resolveOne(tokens[cursor]!, {
          commandGiver: giver,
          scope,
        });
        if (result.stuff) {
          fills[name] = DescribeApi.getDisplayName(result.stuff);
          if (!target) target = result.stuff;
          cursor++;
        } else if (spec.optional) {
          // Skip-on-mismatch: leave the cursor; next slot may consume it.
          continue;
        } else {
          throw new EmoteBindError(
            `Could not resolve '${tokens[cursor]}' for slot '${name}' on emote '${emote.verb}'.`,
          );
        }
      } else {
        // `free` slot: greedy if last, single token otherwise.
        if (isLastSlot(i)) {
          fills[name] = tokens.slice(cursor).join(' ');
          cursor = tokens.length;
        } else {
          fills[name] = tokens[cursor]!;
          cursor++;
        }
      }
    }
    return { target, fills };
  }

  /**
   * Render the emote for one audience. Pre-binds audience-specific
   * `actor` / `target` / `s` / `es` / `ies` variables (and `verbForm`
   * when the grammar carries one), then runs the template through
   * `ProseApi.format`. The Mml-aware output escape ensures Mml
   * fragments emit verbatim while raw strings (slot fills) get the
   * five-entity escape.
   */
  static render(
    emote: Emote,
    bound: BoundEmote,
    audience: Audience,
    actor: Stuff,
  ): Mml {
    const ctx = buildRenderContext(emote, bound, audience, actor);
    return ProseApi.format(emote.grammar.template, ctx);
  }
}

export class EmoteBindError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmoteBindError';
  }
}

function buildRenderContext(
  emote: Emote,
  bound: BoundEmote,
  audience: Audience,
  actor: Stuff,
): Record<string, unknown> {
  const actorName = Mml.name(actor);
  const target = bound.target;
  const targetName = target ? Mml.name(target) : null;

  const ctx: Record<string, unknown> = { ...bound.fills };

  if (audience === 'self') {
    ctx.actor = Mml.fromMarkup('You');
    ctx.actorPossessive = Mml.fromMarkup('your');
    ctx.s = '';
    ctx.es = '';
    ctx.ies = 'y';
  } else {
    ctx.actor = actorName;
    ctx.actorPossessive = Mml.fromMarkup(`${escapeName(actor)}'s`);
    ctx.s = 's';
    ctx.es = 'es';
    ctx.ies = 'ies';
  }

  if (target) {
    if (audience === 'target') {
      ctx.target = Mml.fromMarkup('you');
      ctx.targetPossessive = Mml.fromMarkup('your');
    } else {
      ctx.target = targetName;
      ctx.targetPossessive = Mml.fromMarkup(`${escapeName(target)}'s`);
    }
  }

  if (emote.grammar.verbForm) {
    ctx.verbForm =
      audience === 'self'
        ? emote.grammar.verbForm.self
        : emote.grammar.verbForm.third;
  }

  return ctx;
}

function escapeName(stuff: Stuff): string {
  // Escape the display name in HTML-safe form for the possessive
  // helpers. `DescribeApi.getDisplayName` returns a plain string;
  // wrapping in apostrophe-s without escaping would inject any
  // ampersand or angle-bracket lurking in a player name.
  const raw = DescribeApi.getDisplayName(stuff);
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
