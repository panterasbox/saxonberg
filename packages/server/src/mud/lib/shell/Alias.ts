/**
 * AliasMixin — per-instance command alias storage and resolution.
 *
 * Sibling of `EnvironmentMixin` in the shell substrate: same two-store
 * pattern (persistent + session), same composition-driven static-data
 * defaults pattern (`static defaultAliases` walked via
 * `MixinApi.queryMixins`). Composed onto `ShelledCharacter`; NPCs
 * without an interactive shell don't carry it.
 *
 * The lookup chain on `getAlias(name)`:
 *
 *   1. session override (write target of `--session` set / not persisted)
 *   2. persistent override
 *   3. tombstone (persistent[name] === null) → undefined; default suppressed
 *   4. defaults declared statically on any layer of the host's mixin chain
 *
 * `removeAlias` writes a tombstone (null) at the persistent tier when the
 * name has a default, so re-deploying a default after the player removed
 * it doesn't silently re-introduce the alias.
 *
 * Mutators (`setAlias`, `removeAlias`) are `@Unshadowable` — a buff or
 * polymorph shadow cannot intercept them. Aliases have no privacy
 * concept today; the `actor` argument is accepted for parity with
 * `setSetting` and may carry weight in a future hatch.
 *
 * Expansion (the verb-substitution pipeline) lives on `ShellApi` next
 * to the existing variable-expansion helpers — `ShellApi.expandAliases`
 * is the cross-cutting entry point invoked by `CommandGiverMixin.executeCommand`.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { CommandContributions } from '../../api/command';
import { CommandLineApi } from '../../api/command-line';
import { MixinApi } from '../../api/mixin';
import { Unshadowable } from '../security/decorators';

/**
 * One resolved alias entry. The `source` field reports which tier in
 * the lookup chain produced this value; consumers (the `alias list`
 * controller, the expander's audit trail) read it for display.
 *
 * `description` is populated only when `source === 'default'` —
 * persistent storage is body-only, so user-set descriptions don't
 * round-trip. See AliasMixin's class-level comment.
 */
export interface AliasEntry {
  name: string;
  body: string;
  source: 'default' | 'persistent' | 'session';
  description?: string;
}

/**
 * Diagnostic raw-state view returned by `listOverrides()`. Skips the
 * resolution chain — exposes the bare per-tier maps. Defaults are not
 * included (they live on mixin static data, not host state).
 */
export interface AliasOverridesSnapshot {
  /** name → body, or null for tombstone (default-suppressed). */
  persistent: Record<string, string | null>;
  /** Session never tombstones — string only. */
  session: Record<string, string>;
}

/**
 * One default alias declared by a mixin's static `defaultAliases`
 * field. Walked at resolution time via `MixinApi.queryMixins`; v1
 * ships an empty default set on AliasMixin itself — content mixins
 * populate.
 */
export interface DefaultAliasEntry {
  name: string;
  body: string;
  description?: string;
}

/**
 * Public shape provided by AliasMixin — methods only, per the
 * inter-stuff contract. The persistent (`aliases`) and session
 * (`aliasesSession`) stores live as public fields on the
 * implementing class so the Hydrator can reflect into them by name,
 * but they are NOT part of the contract surface; every external
 * read or write goes through the methods below. Tests that need to
 * seed raw state reach for the concrete class type rather than the
 * `Alias` narrowing.
 */
export interface Alias {
  /**
   * Set or override an alias. Persistent unless `opts.lifetime ===
   * 'session'`. Validates name shape and body shape at set-time;
   * throws on invalid input.
   */
  setAlias(
    name: string,
    body: string,
    opts: {
      lifetime?: 'persistent' | 'session';
      description?: string;
      actor: Stuff;
    },
  ): void;

  /**
   * Resolve a name through the lookup chain. Returns undefined when
   * the name is unknown OR has a tombstone-suppressed default.
   */
  getAlias(name: string): AliasEntry | undefined;

  /**
   * Drop an alias. Returns true iff something was effectively removed
   * (or a tombstone was newly written for a default-only name).
   * Tombstones the persistent tier when removing a name that has a
   * default; otherwise just deletes the override.
   */
  removeAlias(name: string, actor: Stuff): boolean;

  /** True iff `getAlias(name)` would return a defined entry. */
  hasAlias(name: string): boolean;

  /**
   * Resolved view: defaults layered with persistent layered with
   * session, tombstones honored. Read-only — mutate via `setAlias` /
   * `removeAlias`.
   */
  getAliases(): ReadonlyMap<string, AliasEntry>;

  /**
   * Bare per-tier override view. Defaults excluded. Used by
   * diagnostics (`alias list` rendering, debug introspection) and for
   * round-trip persistence assertions.
   */
  listOverrides(): AliasOverridesSnapshot;
}

/* ─────────────────────── Internal helpers ─────────────────────── */

/**
 * Shape of a mixin layer that may carry default aliases. Read via
 * `hasOwnProperty` to avoid pulling in inherited entries from
 * subclasses.
 */
interface MixinLayerWithDefaults {
  _mixinName?: string;
  name?: string;
  defaultAliases?: DefaultAliasEntry[];
}

/**
 * Walk the host's mixin chain and union every layer's
 * `static defaultAliases`. Throws on duplicate name across layers —
 * mirrors `collectSchema`'s collision detection in Environment.ts.
 */
function collectDefaultAliases(host: object): DefaultAliasEntry[] {
  const ctor = (host as { constructor?: { prototype?: unknown } })
    .constructor;
  if (!ctor) return [];
  const layers = MixinApi.queryMixins(
    ctor as Parameters<typeof MixinApi.queryMixins>[0],
  ) as MixinLayerWithDefaults[];

  const out: DefaultAliasEntry[] = [];
  const seen = new Map<string, string>();

  for (const layer of layers) {
    if (!Object.prototype.hasOwnProperty.call(layer, 'defaultAliases')) continue;
    const entries = layer.defaultAliases;
    if (!Array.isArray(entries)) continue;
    const sourceMixin = layer._mixinName ?? layer.name ?? '<anonymous>';
    for (const entry of entries) {
      const prev = seen.get(entry.name);
      if (prev) {
        throw new Error(
          `AliasMixin: default alias '${entry.name}' is declared on ` +
            `both '${prev}' and '${sourceMixin}'. Each default may ` +
            `only be declared once across the host's mixin chain.`,
        );
      }
      seen.set(entry.name, sourceMixin);
      out.push(entry);
    }
  }
  return out;
}

function findDefaultAlias(
  host: object,
  name: string,
): DefaultAliasEntry | undefined {
  return collectDefaultAliases(host).find((d) => d.name === name);
}

/** Match the alias name shape: identifier-like, allows hyphen/underscore. */
const NAME_RE = /^[A-Za-z_][A-Za-z0-9_-]*$/;

/** Detects any positional ref — `$1`..`$9` or `$@` (bare or braced). */
const POS_REF_RE = /\$(?:[1-9@]|\{[1-9@]\})/;

/* ───────────────────────── Mixin factory ───────────────────────── */

export function AliasMixin<TBase extends MixinConstructor>(Base: TBase) {
  class AliasMixin extends Base implements Alias {
    static _mixinName = 'AliasMixin';

    /** Hydrator round-trips `aliases` by reflection. `aliasesSession` is transient. */
    /**
     * Fork per-character verb aliases onto a wire body (sandbox
     * Decision Q). An alias is a typing habit, not a possession; a
     * maker who has to retype full verbs inside their own workshop is
     * being punished for using it. Fork-only — no merge back.
     */
    forkSlice_Alias(): unknown {
      return { aliases: { ...this.aliases } };
    }

    /** Apply forked aliases (mint direction only). */
    mergeSlice_Alias(slice: unknown): void {
      const s = slice as { aliases?: Record<string, string> };
      if (s?.aliases) this.aliases = { ...s.aliases };
    }

    static fieldMeta: FieldMeta = {
      aliases: { persistent: true, runtimeState: true },
    };

    /**
     * Player-facing `alias` command, contributed via the `self` slot
     * just like `settings.yaml` / `var.yaml` on EnvironmentMixin.
     */
    static commandContributions: CommandContributions = {
      self: ['shell/alias.yaml'],
      peers: [],
      environment: [],
    };

    /**
     * v1 default set is empty by design. The mechanism is wired:
     * future content mixins declare `static defaultAliases` on
     * themselves and `collectDefaultAliases` picks them up.
     */
    static defaultAliases: DefaultAliasEntry[] = [];

    /**
     * Optional + default `{}`. Matches the legacy-tolerant
     * Propertied.savedProps pattern so existing avatar docs without
     * the field hydrate cleanly.
     */
    aliases?: Record<string, string | null> = {};

    /** Transient. Not in persistentFields. */
    aliasesSession: Record<string, string> = {};

    getAlias(name: string): AliasEntry | undefined {
      // 1. Session.
      if (Object.prototype.hasOwnProperty.call(this.aliasesSession, name)) {
        return {
          name,
          body: this.aliasesSession[name]!,
          source: 'session',
        };
      }
      // 2. Persistent (with tombstone semantics).
      if (this.aliases && Object.prototype.hasOwnProperty.call(this.aliases, name)) {
        const v = this.aliases[name];
        if (v === null) return undefined; // tombstone — default suppressed
        return { name, body: v as string, source: 'persistent' };
      }
      // 3. Defaults via mixin walk.
      const def = findDefaultAlias(this, name);
      if (def) {
        const out: AliasEntry = { name: def.name, body: def.body, source: 'default' };
        if (def.description !== undefined) out.description = def.description;
        return out;
      }
      return undefined;
    }

    hasAlias(name: string): boolean {
      return this.getAlias(name) !== undefined;
    }

    getAliases(): ReadonlyMap<string, AliasEntry> {
      const out = new Map<string, AliasEntry>();
      for (const def of collectDefaultAliases(this)) {
        const entry: AliasEntry = {
          name: def.name,
          body: def.body,
          source: 'default',
        };
        if (def.description !== undefined) entry.description = def.description;
        out.set(def.name, entry);
      }
      if (this.aliases) {
        for (const [k, v] of Object.entries(this.aliases)) {
          if (v === null) {
            out.delete(k); // tombstone removes default
          } else {
            out.set(k, { name: k, body: v, source: 'persistent' });
          }
        }
      }
      for (const [k, v] of Object.entries(this.aliasesSession)) {
        out.set(k, { name: k, body: v, source: 'session' });
      }
      return out;
    }

    listOverrides(): AliasOverridesSnapshot {
      return {
        persistent: { ...(this.aliases ?? {}) },
        session: { ...this.aliasesSession },
      };
    }

    @Unshadowable
    setAlias(
      name: string,
      body: string,
      opts: {
        lifetime?: 'persistent' | 'session';
        description?: string;
        actor: Stuff;
      },
    ): void {
      if (!NAME_RE.test(name)) {
        throw new Error(
          `AliasMixin: invalid alias name '${name}' (must match ` +
            `[A-Za-z_][A-Za-z0-9_-]*)`,
        );
      }

      let pipeline;
      try {
        pipeline = CommandLineApi.parsePipeline(body);
      } catch (e) {
        throw new Error(
          `AliasMixin: alias body fails to tokenize: ${(e as Error).message}`,
        );
      }
      if (pipeline.commands.length !== 1) {
        throw new Error(
          `AliasMixin: alias body must be a single command (no pipes)`,
        );
      }
      const cmd = pipeline.commands[0]!;
      const firstTok = cmd.rawTokens[0];
      // Tokenizer forces the first token to `kind: 'word'` regardless
      // of leading dashes (command-parsing.md), so the value-shape
      // check is the actual gate for "starts with a verb."
      if (
        !firstTok ||
        firstTok.kind !== 'word' ||
        firstTok.value.startsWith('-')
      ) {
        throw new Error(
          `AliasMixin: alias body must start with a verb (word token)`,
        );
      }

      // Self-loop check: body verb === alias name AND no positional
      // ref anywhere in the body would loop infinitely.
      if (firstTok.value === name) {
        const hasPosRef = cmd.rawTokens.some((t) => {
          if (t.kind === 'word') return POS_REF_RE.test(t.value);
          if (t.kind === 'long-with-value') return POS_REF_RE.test(t.value);
          return false;
        });
        if (!hasPosRef) {
          throw new Error(
            `AliasMixin: alias '${name}' body refers to itself without ` +
              `positional refs — would loop infinitely`,
          );
        }
      }

      const lifetime = opts.lifetime ?? 'persistent';
      if (lifetime === 'session') {
        this.aliasesSession[name] = body;
      } else {
        if (!this.aliases) this.aliases = {};
        this.aliases[name] = body;
      }
      // opts.actor and opts.description retained on signature for
      // surface parity with setSetting; not consulted today.
      void opts.actor;
      void opts.description;
    }

    @Unshadowable
    removeAlias(name: string, actor: Stuff): boolean {
      void actor;
      // Session first.
      if (Object.prototype.hasOwnProperty.call(this.aliasesSession, name)) {
        delete this.aliasesSession[name];
        return true;
      }
      // Persistent override.
      if (this.aliases && Object.prototype.hasOwnProperty.call(this.aliases, name)) {
        delete this.aliases[name];
        if (findDefaultAlias(this, name)) {
          this.aliases[name] = null; // tombstone
        }
        return true;
      }
      // Default-only: write a tombstone.
      if (findDefaultAlias(this, name)) {
        if (!this.aliases) this.aliases = {};
        this.aliases[name] = null;
        return true;
      }
      return false;
    }
  }
  return AliasMixin;
}
