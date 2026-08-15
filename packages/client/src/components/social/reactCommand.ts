/**
 * The one place a reaction command is spelled.
 *
 * ⭐⭐ **The preview and the send must be the same string, and the only
 * way to guarantee that is for them to be the same call.** Every
 * reaction affordance in the client — the inline quick row, the desktop
 * picker, the phone sheet — routes through `composeReactCommand`, and
 * `reactCommand.test.ts` asserts the equality rather than asserting the
 * literal twice. Two copies of one sentence is exactly how a second
 * renderer starts lying while every per-surface test still passes.
 *
 * The selector is always explicit. `re nod` is a real command, but it
 * means *the most recent act in view* — which is not what a picker
 * opened on message 112 does, and would silently retarget between the
 * hover and the click if anything else arrived in between.
 */

import type { EmoteCatalogueEntry } from "@saxonberg/types";

/** A slot's filled-in value, keyed by the slot's declared name. */
export type SlotValues = Readonly<Record<string, string>>;

export interface ReactCommandInput {
  /** The gutter number of the act being reacted to. */
  frameId: number;
  /** The canonical emote verb. */
  verb: string;
  /** Declared slots, in declaration order — the order they bind in. */
  slots?: readonly { name: string; kind: "stuff" | "free" }[];
  /** Values the player supplied; blank/absent entries are omitted. */
  values?: SlotValues;
  /** True when the viewer has already reacted with this verb, which
   *  makes the click an un-react rather than a second one. */
  remove?: boolean;
}

/**
 * Compose the command a reaction affordance sends.
 *
 * Slot values are appended positionally, in declaration order, because
 * that is the order `EmoteGrammarRunner.bind` consumes tokens in.
 *
 * ⚠ **A blank slot is skipped, not sent empty — but only a `stuff` one.**
 * The binder tries one token per slot and *skips on mismatch* for a
 * `stuff` slot that will not resolve, so omitting `<at>` and supplying
 * `<manner>` still binds correctly (`wave happily` → the free text
 * fails to resolve as a target, the binder moves on, `manner` takes it).
 * A `free` slot accepts anything, so the same omission there would bind
 * the later value into the earlier slot instead — the command stops at
 * the gap rather than composing something that means something else.
 * In practice free slots are declared last, so the stop is unreachable.
 */
export function composeReactCommand(input: ReactCommandInput): string {
  const { frameId, verb, slots = [], values = {}, remove = false } = input;
  const parts: string[] = [];
  for (const slot of slots) {
    const raw = (values[slot.name] ?? "").trim();
    if (raw === "") {
      if (slot.kind === "free") break;
      continue;
    }
    parts.push(raw);
  }
  /*
   * ⚠⚠ **The verb goes in BARE — no `;` sigil.**
   *
   * `;` marks an emote only at the START of a line (`msh`'s
   * `detectEmotePrefix` checks the first character). Mid-line it is a
   * statement separator, so `react --msg 22 ;wave` parses as TWO
   * commands: `react --msg 22`, which fails arity because `expression`
   * is required, and `wave`. Live, that produced
   *
   *     That doesn't match any known command shape: react.
   *     I don't understand 'wave'.
   *
   * ⚠ This is inherited, not introduced: the shipped `ReactionBar`
   * composed `react … ;${verb}` for every chip and every quick-react, so
   * the most-used interaction in the product had never worked. Found by
   * driving; no test could see it, because every test asserted the
   * client's own string against itself.
   *
   * `react --msg 22 nod` is the form that works, and the verb's own help
   * already says the expression is "any ordinary emote, exactly as you'd
   * type it bare".
   */
  const expression = [verb, ...parts].join(" ");
  return `react ${remove ? "--remove " : ""}--msg ${frameId} ${expression}`;
}

/**
 * The first required slot the player has not filled, or `null` when the
 * emote is ready to send. Drives the send control's enabled state, so
 * the control branches on the same fact the copy describes.
 */
export function firstUnfilledRequiredSlot(
  entry: Pick<EmoteCatalogueEntry, "slots">,
  values: SlotValues,
): string | null {
  for (const slot of entry.slots) {
    if (!slot.required) continue;
    if ((values[slot.name] ?? "").trim() === "") return slot.name;
  }
  return null;
}

/**
 * The quick row — the emoji-bearing emotes offered without opening the
 * full palette.
 *
 * ⚠ **Derived, never listed.** This replaced a hardcoded array of six
 * `{ verb, emoji }` pairs; a hardcoded pairing drifts from the server's
 * catalogue with nothing failing when it does, and the design
 * conventions rule out hardcoding "including just for now".
 *
 * Glyph-less emotes are skipped because a react without a glyph renders
 * as prose and never as a chip, so a cell for one would promise a chip
 * the act will not get.
 */
export function quickRow(
  catalogue: ReadonlyMap<string, EmoteCatalogueEntry>,
  recentVerbs: readonly string[],
  limit = 6,
): EmoteCatalogueEntry[] {
  // ⚠ Truthiness, not `!== undefined`. A glyph-less emote comes back
  // from Mongo as an explicit `null`, so a presence check passes and the
  // grid draws a verb with no glyph — eight of them, found live. The
  // projection strips it server-side too; this is the second belt.
  const emojiBearing = [...catalogue.values()].filter((e) => e.emoji);
  const rank = new Map(recentVerbs.map((v, i) => [v, i]));
  emojiBearing.sort((a, b) => {
    const ra = rank.get(a.verb) ?? Number.MAX_SAFE_INTEGER;
    const rb = rank.get(b.verb) ?? Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return a.verb.localeCompare(b.verb);
  });
  return emojiBearing.slice(0, limit);
}

/** Every emoji-bearing emote, for the full palette grid. */
export function paletteEntries(
  catalogue: ReadonlyMap<string, EmoteCatalogueEntry>,
): EmoteCatalogueEntry[] {
  return [...catalogue.values()]
    .filter((e) => e.emoji)
    .sort((a, b) => a.verb.localeCompare(b.verb));
}
