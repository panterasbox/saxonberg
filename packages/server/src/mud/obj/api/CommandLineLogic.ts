// CommandLineLogic — the hot-reloadable logic singleton behind
// CommandLineApi. (Doc comment on the class below so @internal lands on
// the reflection.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type {
  RawToken,
  ParsedCommand,
  ParsedPipeline,
} from '../../api/command-line';

const CommandLineApiCallers = SecurityPolicies.FromModule(
  'api/command-line#CommandLineApi'
);

/* ─────────────────── Internal lexeme stage ─────────────────── */

/**
 * Low-level lexeme. The first stage flattens input into a stream of
 * tokens (verbatim source slices) and unquoted-pipe markers. Pipe
 * splitting and option classification both consume this stream.
 */
type Lexeme =
  | { kind: 'token'; value: string; raw: string; pos: number }
  | { kind: 'pipe'; pos: number };

/** Whitespace per §1.1 of the spec — collapses on token boundaries. */
function isWhitespace(ch: string | undefined): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}

/**
 * Process escape sequences inside a `"..."` body. Recognized escapes:
 *   \"  \\  \n  \t  \r
 * Anything else stays verbatim with the leading `\` (existing parser
 * behaviour, kept).
 *
 * Returns the unescaped value plus the index *after* the closing `"`
 * (or end-of-input if the quote was never closed — lenient).
 */
function readDoubleQuoted(
  input: string,
  pos: number
): { value: string; next: number } {
  // Caller has confirmed input[pos] === '"'.
  let i = pos + 1;
  let out = '';
  while (i < input.length) {
    const c = input[i]!;
    if (c === '"') return { value: out, next: i + 1 };
    if (c === '\\' && i + 1 < input.length) {
      const next = input[i + 1]!;
      switch (next) {
        case '"':
          out += '"';
          break;
        case '\\':
          out += '\\';
          break;
        case 'n':
          out += '\n';
          break;
        case 't':
          out += '\t';
          break;
        case 'r':
          out += '\r';
          break;
        default:
          out += '\\' + next;
          break;
      }
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return { value: out, next: input.length };
}

/**
 * Outside-quote escapes. The escapable set is the small one from the
 * spec (whitespace, `\`, `"`, `|`); any other `\X` keeps `\` plus `X`
 * verbatim.
 */
function consumeUnquotedEscape(
  input: string,
  pos: number
): { value: string; next: number } {
  // Caller has confirmed input[pos] === '\\'.
  if (pos + 1 >= input.length) {
    return { value: '\\', next: pos + 1 };
  }
  const next = input[pos + 1]!;
  if (
    next === '\\' ||
    next === '"' ||
    next === '|' ||
    next === ' ' ||
    next === '\t' ||
    next === '\n' ||
    next === '\r'
  ) {
    return { value: next, next: pos + 2 };
  }
  return { value: '\\' + next, next: pos + 2 };
}

/**
 * Walk the input and yield lexemes. Token boundaries are unquoted
 * whitespace or unquoted `|`. Adjacent quoted/unquoted segments glue
 * into a single token (bash convention).
 */
function lex(input: string): Lexeme[] {
  const out: Lexeme[] = [];
  let i = 0;

  while (i < input.length) {
    while (i < input.length && isWhitespace(input[i])) i++;
    if (i >= input.length) break;

    if (input[i] === '|') {
      out.push({ kind: 'pipe', pos: i });
      i++;
      continue;
    }

    const start = i;
    let value = '';
    while (i < input.length) {
      const c = input[i]!;
      if (isWhitespace(c) || c === '|') break;
      if (c === '"') {
        const r = readDoubleQuoted(input, i);
        value += r.value;
        i = r.next;
        continue;
      }
      if (c === '\\') {
        const r = consumeUnquotedEscape(input, i);
        value += r.value;
        i = r.next;
        continue;
      }
      value += c;
      i++;
    }
    out.push({
      kind: 'token',
      value,
      raw: input.substring(start, i),
      pos: start,
    });
  }

  return out;
}

/**
 * Split a lexeme stream on unquoted-pipe markers. Each chunk carries the
 * source slice from just-after the previous pipe (or 0) up to
 * just-before the next pipe (or end). The slice is what the greedy field
 * grabs verbatim.
 */
function splitOnPipe(
  input: string,
  lexemes: Lexeme[]
): { tokens: Lexeme[]; source: string; start: number }[] {
  const chunks: { tokens: Lexeme[]; source: string; start: number }[] = [];
  let cursor = 0;
  let acc: Lexeme[] = [];

  for (const lx of lexemes) {
    if (lx.kind === 'pipe') {
      chunks.push({
        tokens: acc,
        source: input.substring(cursor, lx.pos),
        start: cursor,
      });
      cursor = lx.pos + 1;
      acc = [];
      continue;
    }
    acc.push(lx);
  }
  chunks.push({
    tokens: acc,
    source: input.substring(cursor),
    start: cursor,
  });

  return chunks;
}

/**
 * Classify a token-only lexeme stream into typed `RawToken`s.
 * Verb-position rules: the first token must be a `word`. After a
 * stop-options (`--`) sentinel, every subsequent token is forced to
 * `word` regardless of leading characters. A token starts a flag stack
 * iff it matches `^-[A-Za-z][A-Za-z0-9]*$` — `-5`, `-3.14`, etc. are
 * positional.
 */
function classify(tokens: Lexeme[]): RawToken[] {
  const out: RawToken[] = [];
  let stopped = false;
  let isFirst = true;

  for (const lx of tokens) {
    if (lx.kind !== 'token') continue;
    const { value, raw, pos } = lx;

    if (stopped) {
      out.push({ kind: 'word', value, raw, pos });
      continue;
    }

    if (value === '--') {
      out.push({ kind: 'stop-options', raw, pos });
      stopped = true;
      isFirst = false;
      continue;
    }

    if (isFirst) {
      // The verb is always a word. If it leads with `-` or `--`, we
      // still emit a word so the matcher's "unknown command" path fires
      // with a useful summary instead of having the tokenizer reject it.
      out.push({ kind: 'word', value, raw, pos });
      isFirst = false;
      continue;
    }

    if (value.startsWith('--') && value.length > 2) {
      const body = value.slice(2);
      const eq = body.indexOf('=');
      const name = eq >= 0 ? body.slice(0, eq) : body;
      // Flag-name shape: alpha lead, then alpha/digit/hyphen.
      if (/^[A-Za-z][A-Za-z0-9-]*$/.test(name)) {
        if (eq >= 0) {
          out.push({
            kind: 'long-with-value',
            name,
            value: body.slice(eq + 1),
            raw,
            pos,
          });
        } else {
          out.push({ kind: 'long-flag', name, raw, pos });
        }
        continue;
      }
    }

    if (/^-[A-Za-z][A-Za-z0-9]*$/.test(value)) {
      out.push({
        kind: 'short-flags',
        flags: value.slice(1),
        raw,
        pos,
      });
      continue;
    }

    out.push({ kind: 'word', value, raw, pos });
  }

  return out;
}

function formatCommand(cmd: ParsedCommand): string {
  return cmd.rawTokens.map(formatToken).join(' ');
}

function formatToken(t: RawToken): string {
  switch (t.kind) {
    case 'word':
      return quoteIfNeeded(t.value);
    case 'short-flags':
      return `-${t.flags}`;
    case 'long-flag':
      return `--${t.name}`;
    case 'long-with-value':
      return `--${t.name}=${quoteValueIfNeeded(t.value)}`;
    case 'stop-options':
      return '--';
  }
}

const NEEDS_QUOTING_RE = /[\s"\\|]/;

function quoteIfNeeded(value: string): string {
  if (value === '') return '""';
  if (!NEEDS_QUOTING_RE.test(value)) return value;
  return `"${escapeForDoubleQuote(value)}"`;
}

function quoteValueIfNeeded(value: string): string {
  // The leading `--name=` part is always plain; quoting kicks in for the
  // value only.
  if (value === '') return '';
  if (!NEEDS_QUOTING_RE.test(value)) return value;
  return `"${escapeForDoubleQuote(value)}"`;
}

function escapeForDoubleQuote(value: string): string {
  let out = '';
  for (const ch of value) {
    if (ch === '"') out += '\\"';
    else if (ch === '\\') out += '\\\\';
    else out += ch;
  }
  return out;
}

/** Parse text into a `ParsedPipeline`. See {@link CommandLineApi.parsePipeline}. */
function parsePipelineImpl(input: string): ParsedPipeline {
  const lexemes = lex(input);
  const chunks = splitOnPipe(input, lexemes);

  const nonEmpty = chunks.filter((c) => c.tokens.length > 0);
  if (nonEmpty.length > 1) {
    throw new Error('Command piping is not yet implemented');
  }

  const commands: ParsedCommand[] = nonEmpty.map((c) => {
    const rawTokens = classify(c.tokens);
    const verbToken = rawTokens[0];
    const verb =
      verbToken && verbToken.kind === 'word' ? verbToken.value : '';
    return {
      verb,
      rawTokens,
      source: c.source,
      start: c.start,
    };
  });

  return { commands, raw: input };
}

/**
 * CommandLineLogic — the hot-reloadable logic singleton behind
 * {@link CommandLineApi}.
 *
 * Lives at `/obj/api/command-line` (a stateless `Stuff` singleton, no
 * backing `Template`); `CommandLineApi`'s public statics forward here
 * via `StuffApi.singletonSync`. The tokenizer's lexeme stage, pipe
 * split, token classification, and format helpers live in module-private
 * free functions; each public method carries the `FromModule` gate per
 * method.
 *
 * @internal
 */
@Unshadowable
export class CommandLineLogic extends Idea {
  /** See {@link CommandLineApi.parsePipeline}. */
  @CallSecurity(CommandLineApiCallers)
  public parsePipeline(input: string): ParsedPipeline {
    return parsePipelineImpl(input);
  }

  /** See {@link CommandLineApi.format}. */
  @CallSecurity(CommandLineApiCallers)
  public format(parsed: ParsedPipeline | ParsedCommand): string {
    if ('commands' in parsed) {
      return parsed.commands.map((c) => formatCommand(c)).join(' | ');
    }
    return formatCommand(parsed);
  }

  /** See {@link CommandLineApi.processOutsideEscapes}. */
  @CallSecurity(CommandLineApiCallers)
  public processOutsideEscapes(s: string): string {
    let out = '';
    let i = 0;
    while (i < s.length) {
      if (s[i] === '\\') {
        const r = consumeUnquotedEscape(s, i);
        out += r.value;
        i = r.next;
        continue;
      }
      out += s[i];
      i++;
    }
    return out;
  }
}
