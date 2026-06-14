/**
 * msh — Mud SHell. The framework's default command parser.
 *
 * Wraps `CommandLineApi.parsePipeline` as a `Parser`. Returns a
 * `parsed` result so the dispatcher runs the full match → assemble
 * → resolve → execute pipeline.
 *
 * One pre-tokenization hook lives here: `:`/`;` emote-prefix
 * detection. A message whose first non-whitespace char is `:` or `;`
 * AND whose next char begins a verb word (alpha / underscore — NOT
 * whitespace, NOT punctuation) is dispatched as an emote. The sigil
 * is stripped and the resulting `ParsedCommand` carries
 * `emotePrefixed: true` so the router can fall back to free-form
 * emote on a catalog miss.
 *
 * The prefix is shorthand for `wave iffy` / `emote ...` — the
 * primary use case is in channel context (`chat foo ;wave iffy`),
 * which is handled by `ChatPostController` rather than at the top
 * level; the top-level prefix still works for muscle memory.
 *
 * `chat foo :)` and similar ASCII-smiley patterns are NOT
 * mis-dispatched: the detection requires the next char to begin a
 * verb word.
 */

import { CommandLineApi } from '../../../api/command-line';
import type { Parser, ParseResult } from '../../../api/command';

/**
 * True when `s` starts with `:` or `;` followed by a verb-starting
 * character. Whitespace, punctuation, or end-of-input after the
 * sigil all reject the dispatch.
 */
// eslint-disable-next-line no-restricted-syntax -- documented exception: test-only export (white-box parser test); the msh Parser below uses it internally. See architecture.md § sanctioned-exception registry.
export function detectEmotePrefix(s: string): boolean {
  const trimmed = s.replace(/^[\s]+/, '');
  if (trimmed.length < 2) return false;
  const first = trimmed.charAt(0);
  if (first !== ':' && first !== ';') return false;
  const second = trimmed.charAt(1);
  return /[A-Za-z_]/.test(second);
}

/**
 * Strip a leading `:`/`;` sigil from a message that has already been
 * detected as emote-prefixed. Returns the message with the sigil
 * removed (along with any leading whitespace before it).
 */
// eslint-disable-next-line no-restricted-syntax -- documented exception: test-only export (white-box parser test); the msh Parser below uses it internally. See architecture.md § sanctioned-exception registry.
export function stripEmotePrefix(s: string): string {
  return s.replace(/^[\s]*[:;]/, '');
}

const msh: Parser = {
  name: 'msh',

  parse(text, _context): ParseResult {
    const prefixed = detectEmotePrefix(text);
    const cleaned = prefixed ? stripEmotePrefix(text) : text;

    let pipeline;
    try {
      pipeline = CommandLineApi.parsePipeline(cleaned);
    } catch (err) {
      return {
        error:
          err instanceof Error ? err.message : 'Command execution failed',
      };
    }
    const parsed = pipeline.commands[0];
    if (!parsed || !parsed.verb) {
      return { error: 'No command entered' };
    }
    if (prefixed) {
      parsed.emotePrefixed = true;
    }
    return { parsed };
  },
};

export default msh;
