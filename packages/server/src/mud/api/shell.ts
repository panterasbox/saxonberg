/**
 * ShellApi — substrate helpers for the msh shell pipeline.
 *
 * The shell isn't a single mixin; it's a suite (`EnvironmentMixin`,
 * `FocusedMixin`, future `AliasMixin` / `HistoryMixin` / `PromptMixin`)
 * composed onto `ShelledCharacter`. ShellApi is the cross-cutting
 * static surface those mixins and the matcher reach into.
 *
 * v1 surface:
 *
 *   - {@link expandVariables} — expand `$name` / `${name}` references
 *     in command-line text. The matcher runs this per `WordToken`
 *     value before binding to a positional. `$$` is left intact for
 *     MQL.
 *   - {@link lookupSyntheticVar} — walk the giver's mixin chain and
 *     return the entry that owns a synthetic var name, or `null`.
 *
 * Synthetic vs stored vars (v1):
 *
 *   - Synthetic — read-only, sourced from a mixin's `static
 *     syntheticVars: SyntheticVarEntry[]`. v1 ships exactly one:
 *     `$focus` on `FocusedMixin`. Pronoun words (`me`, `here`,
 *     `it`/`him`/`her`/`them`) are NOT shell vars — they're
 *     first-class MQL keywords, recognized by the resolver.
 *   - Stored — `var set NAME VALUE` lands in `EnvironmentMixin`'s
 *     session store; `$<name>` reads it back.
 *
 * Synthetic precedence on collision: `var set focus foo` does not
 * shadow the synthetic `$focus`. The synthetic name is documented
 * and stable; surprise overrides are worse than a documented win.
 *
 * Unknown stored-var names soft-warn via `MudlogApi` (when the
 * giver is a Sensor) and substitute empty. Failing the command
 * mid-bind would break scripts on a typo; empty-substitute keeps
 * things moving and surfaces the warning.
 *
 * Quoting is irrelevant — shell-quoting is a token-grouping
 * concern only; `$X` always expands. One uniform rule.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Alias, AliasEntry } from '../lib/shell/Alias';
import type {
  AliasExpansionInfo,
} from './command';
import {
  CommandLineApi,
  type ParsedCommand,
  type RawToken,
} from './command-line';
import { MixinApi, type AnyConstructor } from './mixin';
import { Mml } from './mml';
import { MudlogApi } from './mudlog';
import { SecurityApi } from './security';

/**
 * One synthetic var declared by a mixin's static `syntheticVars`
 * field. Read on every expansion; the value is whatever the host
 * currently exposes via the underlying mixin state.
 */
export interface SyntheticVarEntry {
  /** The name without the `$` sigil. */
  name: string;
  description: string;
  /** Read the live value from this host instance. */
  read(giver: Stuff): string;
}

// `$$` (MQL last-result), `${name}`, `$name`.
const VAR_PATTERN = /\$(\$|\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*))/g;

export class ShellApi {
  private constructor() {}

  /**
   * Expand `$X` / `${X}` references inside `text` using `giver` as
   * the resolution context. `$$` is left intact for MQL.
   *
   * Caller's responsibility to gate (skip when the giver doesn't
   * compose `EnvironmentMixin`, or when `shell.interpolate-vars` is
   * off). This keeps the function pure on its inputs — the YAML
   * scope expander, for example, runs unconditionally.
   */
  static expandVariables(text: string, giver: Stuff): string {
    return text.replace(
      VAR_PATTERN,
      (
        _full,
        p1: string,
        brace: string | undefined,
        bare: string | undefined,
      ) => {
        if (p1 === '$') return '$$'; // MQL last-result — leave for MQL.
        const name = brace ?? bare ?? '';
        return resolveVar(name, giver);
      },
    );
  }

  /**
   * Walk the giver's mixin chain and return the first matching
   * synthetic var entry, or `null` if no mixin declares it.
   */
  static lookupSyntheticVar(
    giver: Stuff,
    name: string,
  ): SyntheticVarEntry | null {
    const ctor = giver.constructor as { prototype: unknown } & ((
      ...args: unknown[]
    ) => unknown);
    for (const mixin of MixinApi.queryMixins(ctor)) {
      const vars = (mixin as { syntheticVars?: SyntheticVarEntry[] })
        .syntheticVars;
      if (!vars) continue;
      for (const entry of vars) {
        if (entry.name === name) return entry;
      }
    }
    return null;
  }

  /**
   * Resolve verb-position aliases on a `ParsedCommand`, returning the
   * (possibly rewritten) command plus an expansion record when one or
   * more aliases fired.
   *
   * Operates on classified `RawToken`s — leverages the tokenizer's
   * existing quoting/escape work rather than manipulating raw text.
   * Pure on its inputs except for reading `giver.getAlias`.
   *
   * Behaviors:
   *
   *   - **Bypass prefix.** A verb starting with `\` is stripped of the
   *     leading backslash and not subject to alias lookup. `\\look`
   *     produces the literal verb `\look` (the second `\` is taken as
   *     part of the verb).
   *   - **Positional substitution.** `$1`..`$9` and `$@` (bare or
   *     braced) inside `word` and `long-with-value.value` text expand
   *     against the user's args. A naked `$@` token expands to the
   *     full user-arg list as separate tokens; embedded `$@` is a
   *     space-joined string.
   *   - **Consume-vs-append.** If any positional ref appeared in the
   *     body, user-args were consumed and are NOT appended; otherwise
   *     they're appended bash-style.
   *   - **Recursion.** The expansion's resulting verb is itself
   *     subject to alias lookup, with a per-call in-flight Set as
   *     cycle guard and a hard depth ceiling (16). Cycles terminate
   *     silently; depth-cap fires a soft `MudlogApi.warn` when the
   *     giver is a Sensor.
   *   - **Source reconstruction.** The returned `ParsedCommand`
   *     carries a synthesized `source` faithful enough for greedy
   *     positionals: append case preserves the user's literal
   *     post-verb slice; consume case uses `CommandLineApi.format` so
   *     quoted user-args round-trip with their interior whitespace.
   *
   * Caller is responsible for gating on `MixinApi.isAlias(giver)` —
   * this function takes `Stuff & Alias` directly so the type
   * discipline is at the call site.
   */
  static expandAliases(
    parsed: ParsedCommand,
    giver: Stuff & Alias,
  ): { parsed: ParsedCommand; expansion?: AliasExpansionInfo } {
    // Bypass prefix: `\verb` → run real verb; not an "alias fired" event.
    if (parsed.verb.startsWith('\\')) {
      return { parsed: stripBypassPrefix(parsed) };
    }

    const inflight = new Set<string>();
    const chain: string[] = [];
    const result = expandRecursive(parsed, giver, inflight, 0, chain);

    if (chain.length === 0) {
      return { parsed: result };
    }

    const expansion: AliasExpansionInfo = {
      aliasName: chain[0]!,
      originalText: parsed.source,
      expandedText: CommandLineApi.format(result),
    };
    if (chain.length > 1) expansion.chain = chain;
    return { parsed: result, expansion };
  }

  /**
   * Cross-host setting resolution.
   *
   * Settings declared on a mixin that may be composed by hosts without
   * `EnvironmentMixin` (notably `MobileMixin` settings on NPCs) need a
   * single resolution entry point so consumers don't branch on the
   * host type. This walks the schema and falls back to the declared
   * default when the host can't carry overrides.
   */
  public static resolveSetting<T>(host: Stuff, key: string): T | undefined {
    if (MixinApi.isEnvironment(host)) {
      return host.getSetting<T>(key);
    }
    return MixinApi.collectSettingsSchema(host.constructor as AnyConstructor)
      .find((x) => x.entry.key === key)?.entry.default as T | undefined;
  }

  /**
   * Cross-host explicit-override resolution. Returns the user-explicit
   * override for `key` (no schema-default fallback), or `undefined`
   * when the host can't carry overrides (non-Environment) OR hasn't
   * set the key. Companion to {@link resolveSetting}; chain-resolution
   * consumers use this to distinguish "user set X" from "schema
   * default is X".
   */
  public static ownSetting<T>(host: Stuff, key: string): T | undefined {
    if (!MixinApi.isEnvironment(host)) return undefined;
    return host.getOwnSetting<T>(key);
  }
}

/* ───────────── Alias expansion — file-private helpers ───────────── */

const ALIAS_DEPTH_CEILING = 16;

/** Strip a leading `\` from the verb and rebuild the ParsedCommand. */
function stripBypassPrefix(parsed: ParsedCommand): ParsedCommand {
  const stripped = parsed.verb.slice(1);
  // Synthesize a new source from format() with the stripped verb in
  // front of the rest of the tokens — keeps round-trip property.
  const newTokens: RawToken[] = parsed.rawTokens.slice();
  newTokens[0] = { kind: 'word', value: stripped, raw: stripped, pos: 0 };
  const stub: ParsedCommand = {
    verb: stripped,
    rawTokens: newTokens,
    source: '',
    start: 0,
  };
  const synthSource = CommandLineApi.format(stub);
  return CommandLineApi.parsePipeline(synthSource).commands[0]!;
}

/** Naked `$@` token — match exactly, allow brace form. */
const NAKED_AT_RE = /^\$\{?@\}?$/;

/** Inline positional ref pattern — `$1..$9` or `$@`, bare or braced. */
const POS_INLINE_RE = /\$(?:\{([1-9@])\}|([1-9@]))/g;

/**
 * Substitute inline positional refs in a string. Naked `$@` is the
 * caller's concern (multi-token case); here `$@` is a space-joined
 * string substitution.
 */
function applyPosSubsToString(
  text: string,
  userArgs: RawToken[],
): { text: string; hadRef: boolean } {
  let hadRef = false;
  const out = text.replace(POS_INLINE_RE, (_, brace, bare) => {
    hadRef = true;
    const ref = brace ?? bare;
    if (ref === '@') {
      return userArgs.map((t) => tokenValue(t)).join(' ');
    }
    const idx = Number(ref) - 1;
    return idx >= 0 && idx < userArgs.length
      ? tokenValue(userArgs[idx]!)
      : '';
  });
  return { text: out, hadRef };
}

/** Best-effort string view of a RawToken's user-visible value. */
function tokenValue(t: RawToken): string {
  if (t.kind === 'word') return t.value;
  if (t.kind === 'long-flag') return `--${t.name}`;
  if (t.kind === 'long-with-value') return `--${t.name}=${t.value}`;
  if (t.kind === 'short-flags') return `-${t.flags}`;
  return '--';
}

/** One expansion step — substitute body tokens, decide consume/append. */
function expandOnce(
  parsed: ParsedCommand,
  entry: AliasEntry,
): { mergedTokens: RawToken[]; consumed: boolean; bodyText: string } {
  let bodyPipeline;
  try {
    bodyPipeline = CommandLineApi.parsePipeline(entry.body);
  } catch (e) {
    throw new Error(
      `alias '${entry.name}' has malformed body: ${(e as Error).message}`,
    );
  }
  if (bodyPipeline.commands.length !== 1) {
    throw new Error(
      `alias '${entry.name}' body has multiple commands (set-time validation should reject)`,
    );
  }
  const bodyTokens = bodyPipeline.commands[0]!.rawTokens;
  const userArgs = parsed.rawTokens.slice(1);

  let consumed = false;

  const expandedBodyTokens: RawToken[] = bodyTokens.flatMap((tok): RawToken[] => {
    if (tok.kind === 'word') {
      // Naked `$@` → multi-token expansion.
      if (NAKED_AT_RE.test(tok.value)) {
        consumed = true;
        return userArgs.length === 0 ? [] : userArgs.slice();
      }
      const sub = applyPosSubsToString(tok.value, userArgs);
      if (sub.hadRef) consumed = true;
      return [{ kind: 'word', value: sub.text, raw: sub.text, pos: 0 }];
    }
    if (tok.kind === 'long-with-value') {
      const sub = applyPosSubsToString(tok.value, userArgs);
      if (sub.hadRef) consumed = true;
      return [
        {
          kind: 'long-with-value',
          name: tok.name,
          value: sub.text,
          raw: `--${tok.name}=${sub.text}`,
          pos: 0,
        },
      ];
    }
    // short-flags, long-flag, stop-options: pass through unchanged.
    return [tok];
  });

  const mergedTokens = consumed
    ? expandedBodyTokens
    : [...expandedBodyTokens, ...userArgs];

  return { mergedTokens, consumed, bodyText: entry.body };
}

/** Build the result `ParsedCommand` from an expansion step (§8 option B). */
function buildResultParsed(
  step: { mergedTokens: RawToken[]; consumed: boolean; bodyText: string },
  originalParsed: ParsedCommand,
): ParsedCommand {
  let synthSource: string;
  if (step.consumed) {
    // Body tokens carry user-args inlined as values; format() canonicalizes
    // and re-quotes — quoted user-args keep interior whitespace via this path.
    synthSource = CommandLineApi.format({
      verb: '',
      rawTokens: step.mergedTokens,
      source: '',
      start: 0,
    });
  } else {
    // Append case: literal body text + user's literal post-verb slice.
    let userTailSlice = '';
    if (originalParsed.rawTokens.length > 1) {
      const firstUserArgPos =
        originalParsed.rawTokens[1]!.pos - originalParsed.start;
      userTailSlice = originalParsed.source.slice(firstUserArgPos);
      // Ensure a space between body text and the user's tail slice;
      // the slice typically begins with the original whitespace, but
      // if greedy-quoting put the args flush, format()'s canonical
      // single-space reconstruction handles the boundary.
      if (
        userTailSlice.length > 0 &&
        !/^\s/.test(userTailSlice) &&
        step.bodyText.length > 0 &&
        !/\s$/.test(step.bodyText)
      ) {
        userTailSlice = ' ' + userTailSlice;
      }
    }
    synthSource = step.bodyText + userTailSlice;
  }
  // Re-tokenize the synthesized source — fixes up pos/raw cleanly.
  const reparsed = CommandLineApi.parsePipeline(synthSource);
  return reparsed.commands[0]!;
}

/** Recursive expansion with cycle guard + depth ceiling. */
function expandRecursive(
  parsed: ParsedCommand,
  giver: Stuff & Alias,
  inflight: Set<string>,
  depth: number,
  chain: string[],
): ParsedCommand {
  if (depth >= ALIAS_DEPTH_CEILING) {
    const giverStuff = giver as unknown as Stuff;
    if (MixinApi.isSensor(giverStuff)) {
      MudlogApi.warn(
        'shell',
        Mml.compose`alias expansion depth limit reached at '${parsed.verb}'`,
        { to: giverStuff },
      );
    }
    return parsed;
  }

  const entry = giver.getAlias(parsed.verb);
  if (!entry) return parsed;

  if (inflight.has(parsed.verb)) {
    // Cycle — break out silently. Bash convention.
    return parsed;
  }

  inflight.add(parsed.verb);
  chain.push(parsed.verb);
  try {
    const step = expandOnce(parsed, entry);
    const next = buildResultParsed(step, parsed);
    return expandRecursive(next, giver, inflight, depth + 1, chain);
  } finally {
    inflight.delete(parsed.verb);
  }
}

/**
 * Resolve a single var name to its expanded value.
 *
 * - Synthetic var → read from the owning mixin (always wins).
 * - Stored var → `giver.listVars()` lookup, only when the giver
 *   composes `EnvironmentMixin`.
 * - Unknown → empty string + soft-warn (when giver is a Sensor).
 */
function resolveVar(name: string, giver: Stuff): string {
  const synth = ShellApi.lookupSyntheticVar(giver, name);
  if (synth) return synth.read(giver);

  if (MixinApi.isEnvironment(giver)) {
    const stored = giver.listVars();
    if (Object.prototype.hasOwnProperty.call(stored, name)) {
      return stored[name]!;
    }
  }

  if (MixinApi.isSensor(giver)) {
    MudlogApi.warn('shell', Mml.compose`unknown variable: $${name}`, {
      to: giver,
    });
  }
  return '';
}

SecurityApi.decorateApiClass(ShellApi);
