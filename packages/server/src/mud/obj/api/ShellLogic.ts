// ShellLogic — the hot-reloadable logic singleton behind ShellApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from "../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import type { Stuff } from "../../lib/stuff/Stuff";
import type { Alias, AliasEntry } from "../../lib/shell/Alias";
import type { AliasExpansionInfo } from "../../api/command";
import {
  CommandLineApi,
  type ParsedCommand,
  type RawToken,
} from "../../api/command-line";
import { MixinApi, type AnyConstructor } from "../../api/mixin";
import { Mml } from "../../api/mml";
import { MudlogApi } from "../../api/mudlog";
import type { SyntheticVarEntry } from "../../api/shell";
import type { FormFactor } from "@saxonberg/types";

const ShellApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule("/api/shell#ShellApi"),
  SecurityPolicies.SelfOnly
);

// `$$` (MQL last-result), `${name}`, `$name`.
const VAR_PATTERN =
  /\$(\$|\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*))/g;

/**
 * ShellLogic — the hot-reloadable logic singleton behind
 * {@link ShellApi}.
 *
 * Holds the msh shell substrate helpers: `$X` variable expansion,
 * synthetic-var lookup over the mixin chain, verb-position alias
 * expansion (with cycle guard + depth ceiling), and cross-host setting
 * resolution. Lives at `/obj/api/shell`; `ShellApi`'s statics forward
 * here via `StuffApi.singletonSync`. `dest /obj/api/shell` reloads it.
 *
 * Gating (the guts-variant recipe): every public method carries
 * `AnyOf(FromModule('/api/shell#ShellApi'), SelfOnly)`. `FromModule`
 * admits the Api facade; `SelfOnly` admits any intra-singleton self-call
 * (caller and target both this singleton). Stateless sub-logic lives in
 * module-private free functions — off-class, ungated, un-callable from
 * outside, and (since `#`-private instance methods don't survive the
 * call-security proxy) the only correct home for them.
 *
 * The gate is applied **per public method**, never at the class level:
 * a class-level default would also cover the inherited `Stuff`/`Idea`
 * framework methods the framework itself invokes (e.g. during
 * `register`), whose caller is `StuffApi`, not `ShellApi` — and they'd
 * be denied. (Mirrors `MaterialLogic` / `LocomotionLogic`.)
 *
 * @internal
 */
@Unshadowable
export class ShellLogic extends ApiLogic {
  /** See {@link ShellApi.expandVariables}. */
  @CallSecurity(ShellApiCallers)
  public expandVariables(text: string, giver: Stuff): string {
    return text.replace(
      VAR_PATTERN,
      (
        _full,
        p1: string,
        brace: string | undefined,
        bare: string | undefined
      ) => {
        if (p1 === "$") return "$$"; // MQL last-result — leave for MQL.
        const name = brace ?? bare ?? "";
        return resolveVar(name, giver);
      }
    );
  }

  /** See {@link ShellApi.lookupSyntheticVar}. */
  @CallSecurity(ShellApiCallers)
  public lookupSyntheticVar(
    giver: Stuff,
    name: string
  ): SyntheticVarEntry | null {
    return lookupSyntheticVarOf(giver, name);
  }

  /** See {@link ShellApi.expandAliases}. */
  @CallSecurity(ShellApiCallers)
  public expandAliases(
    parsed: ParsedCommand,
    giver: Stuff & Alias
  ): { parsed: ParsedCommand; expansion?: AliasExpansionInfo } {
    // Bypass prefix: `\verb` → run real verb; not an "alias fired" event.
    if (parsed.verb.startsWith("\\")) {
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

  /** See {@link ShellApi.resolveSetting}. */
  @CallSecurity(ShellApiCallers)
  public resolveSetting<T>(
    host: Stuff,
    key: string,
    factor?: FormFactor,
  ): T | undefined {
    if (MixinApi.isEnvironment(host)) {
      /*
       * ⭐ **Three rungs, and the order is the whole feature:**
       *
       *   1. the stored override at `<key>.<factor>`, when a factor was
       *      named — the per-viewport answer;
       *   2. the stored override at `<key>` — the player's one answer
       *      for everywhere;
       *   3. the schema default.
       *
       * ⚠ Rung 1 uses `getOwnSetting`, not `getSetting`. `getSetting`
       * falls back to the schema default, so a suffixed read would
       * ALWAYS return something and rung 2 could never be reached —
       * the override would silently become mandatory, which is exactly
       * the two-independent-keys shape this design refused.
       */
      if (factor !== undefined) {
        const perFactor = host.getOwnSetting<T>(`${key}.${factor}`);
        if (perFactor !== undefined) return perFactor;
      }
      return host.getSetting<T>(key);
    }
    return MixinApi.collectSettingsSchema(host.constructor as AnyConstructor)
      .find((x) => x.entry.key === key)?.entry.default as T | undefined;
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
  newTokens[0] = { kind: "word", value: stripped, raw: stripped, pos: 0 };
  const stub: ParsedCommand = {
    verb: stripped,
    rawTokens: newTokens,
    source: "",
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
  userArgs: RawToken[]
): { text: string; hadRef: boolean } {
  let hadRef = false;
  const out = text.replace(POS_INLINE_RE, (_, brace, bare) => {
    hadRef = true;
    const ref = brace ?? bare;
    if (ref === "@") {
      return userArgs.map((t) => tokenValue(t)).join(" ");
    }
    const idx = Number(ref) - 1;
    return idx >= 0 && idx < userArgs.length
      ? tokenValue(userArgs[idx]!)
      : "";
  });
  return { text: out, hadRef };
}

/** Best-effort string view of a RawToken's user-visible value. */
function tokenValue(t: RawToken): string {
  if (t.kind === "word") return t.value;
  if (t.kind === "long-flag") return `--${t.name}`;
  if (t.kind === "long-with-value") return `--${t.name}=${t.value}`;
  if (t.kind === "short-flags") return `-${t.flags}`;
  return "--";
}

/** One expansion step — substitute body tokens, decide consume/append. */
function expandOnce(
  parsed: ParsedCommand,
  entry: AliasEntry
): { mergedTokens: RawToken[]; consumed: boolean; bodyText: string } {
  let bodyPipeline;
  try {
    bodyPipeline = CommandLineApi.parsePipeline(entry.body);
  } catch (e) {
    throw new Error(
      `alias '${entry.name}' has malformed body: ${(e as Error).message}`
    );
  }
  if (bodyPipeline.commands.length !== 1) {
    throw new Error(
      `alias '${entry.name}' body has multiple commands (set-time validation should reject)`
    );
  }
  const bodyTokens = bodyPipeline.commands[0]!.rawTokens;
  const userArgs = parsed.rawTokens.slice(1);

  let consumed = false;

  const expandedBodyTokens: RawToken[] = bodyTokens.flatMap(
    (tok): RawToken[] => {
      if (tok.kind === "word") {
        // Naked `$@` → multi-token expansion.
        if (NAKED_AT_RE.test(tok.value)) {
          consumed = true;
          return userArgs.length === 0 ? [] : userArgs.slice();
        }
        const sub = applyPosSubsToString(tok.value, userArgs);
        if (sub.hadRef) consumed = true;
        return [{ kind: "word", value: sub.text, raw: sub.text, pos: 0 }];
      }
      if (tok.kind === "long-with-value") {
        const sub = applyPosSubsToString(tok.value, userArgs);
        if (sub.hadRef) consumed = true;
        return [
          {
            kind: "long-with-value",
            name: tok.name,
            value: sub.text,
            raw: `--${tok.name}=${sub.text}`,
            pos: 0,
          },
        ];
      }
      // short-flags, long-flag, stop-options: pass through unchanged.
      return [tok];
    }
  );

  const mergedTokens = consumed
    ? expandedBodyTokens
    : [...expandedBodyTokens, ...userArgs];

  return { mergedTokens, consumed, bodyText: entry.body };
}

/** Build the result `ParsedCommand` from an expansion step (§8 option B). */
function buildResultParsed(
  step: { mergedTokens: RawToken[]; consumed: boolean; bodyText: string },
  originalParsed: ParsedCommand
): ParsedCommand {
  let synthSource: string;
  if (step.consumed) {
    // Body tokens carry user-args inlined as values; format() canonicalizes
    // and re-quotes — quoted user-args keep interior whitespace via this path.
    synthSource = CommandLineApi.format({
      verb: "",
      rawTokens: step.mergedTokens,
      source: "",
      start: 0,
    });
  } else {
    // Append case: literal body text + user's literal post-verb slice.
    let userTailSlice = "";
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
        userTailSlice = " " + userTailSlice;
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
  chain: string[]
): ParsedCommand {
  if (depth >= ALIAS_DEPTH_CEILING) {
    const giverStuff = giver as unknown as Stuff;
    if (MixinApi.isSensor(giverStuff)) {
      MudlogApi.warn(
        "shell",
        Mml.compose`alias expansion depth limit reached at '${parsed.verb}'`,
        { to: giverStuff }
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
 * Walk the giver's mixin chain and return the first matching synthetic
 * var entry, or `null` if no mixin declares it. Shared by the public
 * `lookupSyntheticVar` surface and the internal `resolveVar` helper.
 */
function lookupSyntheticVarOf(
  giver: Stuff,
  name: string
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
 * Resolve a single var name to its expanded value.
 *
 * - Synthetic var → read from the owning mixin (always wins).
 * - Stored var → `giver.listVars()` lookup, only when the giver
 *   composes `EnvironmentMixin`.
 * - Unknown → empty string + soft-warn (when giver is a Sensor).
 */
function resolveVar(name: string, giver: Stuff): string {
  const synth = lookupSyntheticVarOf(giver, name);
  if (synth) return synth.read(giver);

  if (MixinApi.isEnvironment(giver)) {
    const stored = giver.listVars();
    if (Object.prototype.hasOwnProperty.call(stored, name)) {
      return stored[name]!;
    }
  }

  if (MixinApi.isSensor(giver)) {
    MudlogApi.warn("shell", Mml.compose`unknown variable: $${name}`, {
      to: giver,
    });
  }
  return "";
}
