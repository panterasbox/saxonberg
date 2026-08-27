/**
 * EnvironmentMixin — per-instance settings + session-var keyspace.
 *
 * The substrate of the shell subsystem (see
 * `docs/subsystems/shell-environment.md`). Owns two stores:
 *
 *   - persistent — schema-validated, declared by mixins via static
 *     `settings: SettingsSchemaEntry[]`. Saved through the Hydrator.
 *   - session   — transient, lives for the lifetime of the in-memory
 *     instance; not persisted. Holds ad-hoc `var` writes plus any
 *     setting whose schema declares `lifetime: 'session'`.
 *
 * Schema is static class data — declared as `static settings:
 * SettingsSchemaEntry[]` on a mixin layer (the common case) or
 * directly on a substrate class whose concept it owns (the
 * schema-on-owner generalization; see
 * `docs/subsystems/shell-environment.md`). The effective schema for
 * an instance is computed on demand by walking the host's full
 * prototype chain (mixin layers and concrete classes alike) and
 * unioning each layer's own `settings` array. There is no central
 * registry.
 *
 * Privacy: `setSetting` / `unsetSetting` take an `actor: Stuff`. For
 * entries with `private: true`, the call throws unless `actor` is
 * reference-equal to the host instance. Reads are unrestricted (D8).
 *
 * Cross-host resolution: `ShellApi.resolveSetting(host, key)` is the
 * public entry point for code that may hold a host that doesn't
 * compose `EnvironmentMixin` (e.g. NPCs reading templates declared on
 * `MobileMixin`). It transparently falls back to walking the host's
 * mixin chain for the schema default.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { CARD_IDS } from '@saxonberg/types';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi, type AnyConstructor } from '../../api/mixin';
import { Unshadowable } from '../security/decorators';
import type { CommandContributions } from '../../api/command';

/**
 * Supported value types for a schema entry. `struct` / `list` are
 * accepted by the type system today; the user-facing `set` command
 * rejects them until structured-value syntax exists.
 *
 * `SettingTypes` is the constants table; declare schema entries with
 * `type: SettingTypes.String` rather than the bare literal. Mirrors
 * the `PropOperations` pattern in `lib/stuff/Propertied.ts`.
 */
export const SettingTypes = {
  String: 'string',
  Number: 'number',
  Boolean: 'boolean',
  Enum: 'enum',
  Struct: 'struct',
  List: 'list',
} as const;

export type SettingType = (typeof SettingTypes)[keyof typeof SettingTypes];

/**
 * Schema for a single setting declared by a mixin's static
 * `settings` field. See `docs/subsystems/shell-environment.md`.
 */
export interface SettingsSchemaEntry<T = unknown> {
  /** Dotted-name convention: `<sourceMixinDomain>.<sub>...` */
  key: string;
  type: SettingType;
  default: T;
  description: string;
  /** Default `'persistent'`. */
  lifetime?: 'persistent' | 'session';
  /** Default `false`. Private writes require `actor === target`. */
  private?: boolean;
  /** Required when `type === 'enum'`. */
  enumValues?: T[];
  /** Returns `true` on success, an error message string on failure. */
  validator?: (value: T) => true | string;
  /**
   * ⭐ **One key with an optional per-form-factor override**, not two
   * mandatory keys.
   *
   * When true, `setSetting` also accepts `<key>.desktop` /
   * `<key>.mobile`, and `ShellApi.resolveSetting(host, key, factor)`
   * resolves `<key>.<factor>` → `<key>` → the schema default. A player
   * who wants the same behaviour everywhere sets one value; two
   * independent keys guarantee eventual silent drift.
   *
   * ⚠⚠ **This does not break the no-`cockpit.formFactor` rule.** That
   * key was never built because the server cannot know a viewport, so
   * such a key would be a fake fact. Two STORED PREFERENCES assert
   * nothing about which is in force: the server owns what is shown, and
   * the client — which genuinely knows its own viewport — picks. Same
   * split as `cockpit.shelf`.
   */
  perFactor?: true;
  /**
   * ⭐ **Suffixable by CARD KIND** — `cards.window.subject` overrides
   * `cards.window` for the cards you get by looking at things, leaving
   * the roster, the wiki and the editors on the general figure.
   *
   * Same shape as `perFactor` and the same reason: one key with an
   * optional override, not an open namespace. A suffix that is not a
   * real `CardId` refuses as *no such setting*.
   */
  perKind?: true;
}

/**
 * One row of `listSettings()` output — a snapshot of one effective
 * schema entry plus its current value and override state.
 */
export interface SettingsSnapshotEntry {
  schema: SettingsSchemaEntry;
  /** Stored override if present, else `schema.default`. */
  currentValue: unknown;
  /** True iff a value lives in this entry's `lifetime`-specified store. */
  isOverridden: boolean;
  /** `_mixinName` of the layer that declared the entry. */
  sourceMixin: string;
}

/**
 * Public shape provided by `EnvironmentMixin` — methods only, per
 * the inter-stuff contract. The `persistentStore` (Hydrator-saved)
 * and `sessionStore` (transient) stores live as public fields on the
 * implementing class so the Hydrator can reflect into them by name,
 * but they are NOT part of the contract surface; external code goes
 * through `getSetting` / `setSetting` / `setVar` / `listVars`. Tests
 * that need raw state reach for the concrete class type, not the
 * `Environment` narrowing.
 */
export interface Environment {
  getSetting<T>(key: string): T | undefined;
  /**
   * Return the user-explicit override for `key` without falling back to
   * the schema default. `undefined` when nothing has been
   * `setSetting`'d — even when the schema declares a default. Lets
   * consumers distinguish "user explicitly set this" from "schema
   * default is in effect" for chain-resolution flows (e.g.,
   * `LocomotionApi.defaultModeFor` defers to the bodyplan default
   * only when there's no explicit override).
   */
  getOwnSetting<T>(key: string): T | undefined;
  setSetting<T>(key: string, value: T, actor: Stuff): void;
  unsetSetting(key: string, actor: Stuff): void;
  listSettings(): SettingsSnapshotEntry[];
  describeSetting(key: string): SettingsSchemaEntry | undefined;

  setVar(name: string, value: string): void;
  unsetVar(name: string): void;
  listVars(): Record<string, string>;
}

/**
 * Walk the host constructor's full prototype chain and return one
 * `(entry, sourceMixin)` pair per declared key. The raw prototype-chain
 * walk lives on `MixinApi.collectSettingsSchema` (sibling of
 * `getAllFieldMarshallers`); this wrapper layers the duplicate-key
 * validation on top — defensive: a setting can only legitimately exist
 * in one place, so a key declared on two layers is a config bug.
 */
function collectSchema(host: object): Array<{
  entry: SettingsSchemaEntry;
  sourceMixin: string;
}> {
  const ctor = (host as { constructor: unknown }).constructor as
    | AnyConstructor
    | undefined;
  if (!ctor) return [];

  const out = MixinApi.collectSettingsSchema(ctor);

  const seen = new Map<string, string>();
  for (const { entry, sourceMixin } of out) {
    const prev = seen.get(entry.key);
    if (prev) {
      throw new Error(
        `EnvironmentMixin: setting '${entry.key}' is declared on ` +
          `both '${prev}' and '${sourceMixin}'. Each setting may ` +
          `only be declared once across the host's mixin chain.`,
      );
    }
    seen.set(entry.key, sourceMixin);
  }
  return out;
}

function findSchema(
  host: object,
  key: string,
): { entry: SettingsSchemaEntry; sourceMixin: string } | undefined {
  const exact = collectSchema(host).find((x) => x.entry.key === key);
  if (exact) return exact;
  /*
   * ⭐ A per-form-factor override (`shell.result.mobile`) is not its own
   * schema entry — it is the SAME setting, stored under a suffix. So a
   * suffixed key resolves to the base entry, and only when that entry
   * declares `perFactor`. Writing `shell.interpolate-vars.mobile`
   * therefore refuses as *no such setting*, which is what makes this
   * "one key with an optional override" rather than an open namespace.
   */
  const dot = key.lastIndexOf('.');
  if (dot <= 0) return undefined;
  const suffix = key.slice(dot + 1);
  const base = collectSchema(host).find(
    (x) => x.entry.key === key.slice(0, dot),
  );
  if (!base) return undefined;
  if (suffix === 'desktop' || suffix === 'mobile') {
    return base.entry.perFactor === true ? base : undefined;
  }
  // ⭐ …or by card kind, for an entry that declares it.
  if (base.entry.perKind === true && (CARD_IDS as readonly string[]).includes(suffix)) {
    return base;
  }
  return undefined;
}

/**
 * Type-shape check. Returns `true` on success, an error message on
 * failure. The check is intentionally narrow — `struct` and `list`
 * accept any non-null object / array respectively (see D4).
 */
function checkType(entry: SettingsSchemaEntry, value: unknown): true | string {
  switch (entry.type) {
    case 'string':
      return typeof value === 'string'
        ? true
        : `expected string, got ${typeof value}`;
    case 'number':
      return typeof value === 'number' && !Number.isNaN(value)
        ? true
        : `expected number, got ${typeof value}`;
    case 'boolean':
      return typeof value === 'boolean'
        ? true
        : `expected boolean, got ${typeof value}`;
    case 'enum': {
      const enumValues = entry.enumValues ?? [];
      return enumValues.includes(value as never)
        ? true
        : `expected one of [${enumValues.join(', ')}], got ${String(value)}`;
    }
    case 'struct':
      return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? true
        : `expected object, got ${value === null ? 'null' : typeof value}`;
    case 'list':
      return Array.isArray(value) ? true : `expected array`;
  }
}

/**
 * EnvironmentMixin factory. The class form is `@Unshadowable` only on
 * the privacy-gated methods (`setSetting`, `unsetSetting`); other
 * methods remain shadowable for tracing / extension.
 */
export function EnvironmentMixin<TBase extends MixinConstructor>(Base: TBase) {
  class EnvironmentMixin extends Base implements Environment {
    static _mixinName = 'EnvironmentMixin';

    /**
     * Persistent fields declared by this mixin. The Hydrator uses
     * this list; `persistentStore` is a plain `Record` so it
     * round-trips through Mongo without a custom handler.
     */
    /**
     * Fork the settings keyspace onto a wire body (sandbox Decision Q).
     * Same argument as the cockpit's client state: a player's settings
     * are their shell, and crossing a threshold is not a reason to hand
     * them somebody else's defaults. Fork-only — no merge back.
     */
    forkSlice_Environment(): unknown {
      return { persistentStore: { ...this.persistentStore } };
    }

    /** Apply a forked settings keyspace (mint direction only). */
    mergeSlice_Environment(slice: unknown): void {
      const s = slice as { persistentStore?: Record<string, unknown> };
      if (s?.persistentStore) {
        this.persistentStore = { ...s.persistentStore };
      }
    }

    static fieldMeta: FieldMeta = {
      persistentStore: { persistent: true, runtimeState: true },
    };

    /**
     * Shell-tier settings the substrate owns. The substrate
     * historically declared none (D6); `shell.interpolate-vars`
     * lives here because it gates a substrate-wide behavior that
     * keys off `EnvironmentMixin`'s presence — declaring it
     * elsewhere would split the contract.
     */
    static settings: SettingsSchemaEntry[] = [
      {
        key: 'shell.interpolate-vars',
        type: SettingTypes.Boolean,
        default: true,
        description:
          'When true, the matcher expands $name / ${name} ' +
          'references in command input before binding. False ' +
          'turns expansion off for the host (scripts can use ' +
          'literal `$X` text).',
      },
      {
        /*
         * ⭐ **A FILTER, not a placement** — the server still sends the
         * frame; the client decides whether to render it.
         *
         * Placement (the server declines to send) saves the wire, but
         * the frame then never reaches the frame store and `recall`
         * cannot find it. Filtering keeps your `who` history searchable
         * while keeping it out of sight.
         *
         * ⚠ `both` is the two-copies-of-one-sentence shape: two
         * renderings of one payload that can drift. It is a legitimate
         * player choice, and it is safe here only because the card
         * carries the SAME MML the terminal rendered — so the assertion
         * is that the two are EQUAL, never that each contains the
         * expected words.
         *
         * ⭐ `terminal` is a first-class mode, not a fallback: MML
         * renders markdown, inline wiki and spoiler tags, so a player
         * who wants one scrollback is well served.
         */
        key: 'shell.result',
        type: SettingTypes.String,
        default: 'card',
        perFactor: true,
        description:
          'Where a structured command result appears: `card` (the ' +
          'default — the feed only), `terminal` (the prose only), or ' +
          '`both`. Override per viewport with `shell.result.mobile` / ' +
          '`shell.result.desktop`; the client picks, because only it ' +
          'knows its own width.',
        validator: (v) =>
          v === 'card' || v === 'terminal' || v === 'both'
            ? true
            : `expected card | terminal | both, got '${String(v)}'`,
      },
      {
        /*
         * ⭐ **The card feed's relevance window**, in seconds.
         *
         * ⚠ **A fact about TIME, not about the world** — which is the
         * distinction that makes it a legitimate duration. A card's
         * lifetime used to be a world CONDITION (is that person still
         * here), and a clock on one of those would end something still
         * actionable. A relevance window is the husk-TTL argument
         * generalised: how long an answer you asked for stays worth
         * keeping on screen.
         *
         * ⚠ The window is not the sweep's CADENCE. The sweep is how
         * often we look (coarse, ~30 s); this is how long a card stays.
         * Conflating them means changing one silently changes the
         * other.
         *
         * ⚠ Pinned cards never see it — pinned-ness IS the lifetime
         * axis, and a clock that could end a pinned card would make the
         * axis a suggestion.
         */
        key: 'cards.window',
        type: SettingTypes.Number,
        default: 600,
        perKind: true,
        description:
          'How long an unpinned card stays in the feed after you last ' +
          'touched it, in seconds. Pinned cards ignore it entirely. ' +
          'Override one kind by suffixing it — `cards.window.subject ' +
          '3600` keeps what you have looked at for an hour while ' +
          'everything else ages normally.',
        validator: (v) =>
          typeof v === 'number' && v >= 5 && v <= 86_400
            ? true
            : 'expected 5–86400 seconds',
      },
      {
        /**
         * ⭐ **How many cards the feed keeps** — the scrollback bound.
         *
         * A duration alone cannot bound a feed: walk around for ten
         * minutes and you have ten minutes of cards whatever the window
         * says. This is the count a terminal would call scrollback, and
         * the oldest goes first.
         *
         * ⚠ Pinned cards are exempt from the cap as well as the clock.
         * Pinning means *survives*, and half a guarantee is worse than
         * none.
         */
        key: 'cards.keep',
        type: SettingTypes.Number,
        default: 40,
        description:
          'How many cards the feed keeps before the oldest falls off, ' +
          'like terminal scrollback. Pinned cards never count against ' +
          'it and never fall off.',
        validator: (v) =>
          typeof v === 'number' && v >= 3 && v <= 500
            ? true
            : 'expected 3–500 cards',
      },
      {
        key: 'prompt.format',
        type: SettingTypes.String,
        default: '{{ focus }}>',
        description:
          'Liquid template rendered into the client-side base ' +
          'prompt area after every command. v1 context exposes ' +
          'one variable, `focus` (the giver\'s current MQL ' +
          'focus). Future tokens (posture, location.name, time) ' +
          'land additively in the prompt-context builder.',
      },
    ];

    /**
     * Player-facing commands that operate on this mixin's stores.
     * Picked up by `CommandGiver` discovery via the `self` slot.
     */
    static commandContributions: CommandContributions = {
      self: ['platform/cmd/shell/settings.yaml', 'platform/cmd/shell/var.yaml'],
      peers: [],
      environment: [],
    };

    /**
     * Schema-declared persistent overrides. Optional + default `{}`
     * matches the legacy-tolerant Propertied.savedProps pattern, so
     * existing avatar docs don't need migration.
     */
    persistentStore?: Record<string, unknown> = {};

    /**
     * Schema-declared session overrides PLUS ad-hoc vars. Transient;
     * lives only as long as the in-memory instance.
     */
    sessionStore: Record<string, unknown> = {};

    getSetting<T>(key: string): T | undefined {
      const found = findSchema(this, key);
      if (!found) return undefined;
      const lifetime = found.entry.lifetime ?? 'persistent';
      const store =
        lifetime === 'persistent' ? this.persistentStore : this.sessionStore;
      if (store && Object.prototype.hasOwnProperty.call(store, key)) {
        return store[key] as T;
      }
      return found.entry.default as T;
    }

    getOwnSetting<T>(key: string): T | undefined {
      const found = findSchema(this, key);
      if (!found) return undefined;
      const lifetime = found.entry.lifetime ?? 'persistent';
      const store =
        lifetime === 'persistent' ? this.persistentStore : this.sessionStore;
      if (store && Object.prototype.hasOwnProperty.call(store, key)) {
        return store[key] as T;
      }
      return undefined;
    }

    @Unshadowable
    setSetting<T>(key: string, value: T, actor: Stuff): void {
      const found = findSchema(this, key);
      if (!found) {
        throw new Error(`EnvironmentMixin: no such setting '${key}'`);
      }
      const { entry } = found;
      const typeOk = checkType(entry, value);
      if (typeOk !== true) {
        throw new Error(
          `EnvironmentMixin: invalid value for '${key}': ${typeOk}`,
        );
      }
      if (entry.validator) {
        const result = (entry.validator as (v: unknown) => true | string)(
          value,
        );
        if (result !== true) {
          throw new Error(
            `EnvironmentMixin: invalid value for '${key}': ${result}`,
          );
        }
      }
      if (entry.private && (actor as unknown) !== this) {
        throw new Error(
          `EnvironmentMixin: '${key}' is private; actor must be the ` +
            `target host instance`,
        );
      }
      const lifetime = entry.lifetime ?? 'persistent';
      // ⚠ Stored under the key as WRITTEN, suffix included: the whole
      // point of the override is that it sits beside the base value
      // rather than replacing it.
      if (lifetime === 'persistent') {
        if (!this.persistentStore) this.persistentStore = {};
        this.persistentStore[key] = value;
      } else {
        this.sessionStore[key] = value;
      }
    }

    @Unshadowable
    unsetSetting(key: string, actor: Stuff): void {
      const found = findSchema(this, key);
      if (!found) {
        throw new Error(`EnvironmentMixin: no such setting '${key}'`);
      }
      const { entry } = found;
      if (entry.private && (actor as unknown) !== this) {
        throw new Error(
          `EnvironmentMixin: '${key}' is private; actor must be the ` +
            `target host instance`,
        );
      }
      const lifetime = entry.lifetime ?? 'persistent';
      if (lifetime === 'persistent') {
        if (this.persistentStore) delete this.persistentStore[key];
      } else {
        delete this.sessionStore[key];
      }
    }

    listSettings(): SettingsSnapshotEntry[] {
      return collectSchema(this).map(({ entry, sourceMixin }) => {
        const lifetime = entry.lifetime ?? 'persistent';
        const store =
          lifetime === 'persistent' ? this.persistentStore : this.sessionStore;
        const isOverridden =
          !!store && Object.prototype.hasOwnProperty.call(store, entry.key);
        const currentValue = isOverridden ? store![entry.key] : entry.default;
        return { schema: entry, currentValue, isOverridden, sourceMixin };
      });
    }

    describeSetting(key: string): SettingsSchemaEntry | undefined {
      return findSchema(this, key)?.entry;
    }

    setVar(name: string, value: string): void {
      const found = findSchema(this, name);
      if (found) {
        throw new Error(
          `EnvironmentMixin: '${name}' is a declared setting; ` +
            `use \`settings set ${name}\``,
        );
      }
      this.sessionStore[name] = String(value);
    }

    unsetVar(name: string): void {
      const found = findSchema(this, name);
      if (found) {
        throw new Error(
          `EnvironmentMixin: '${name}' is a declared setting; ` +
            `use \`settings unset ${name}\``,
        );
      }
      delete this.sessionStore[name];
    }

    listVars(): Record<string, string> {
      const declared = new Set(collectSchema(this).map((x) => x.entry.key));
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(this.sessionStore)) {
        if (declared.has(k)) continue;
        out[k] = String(v);
      }
      return out;
    }
  }
  return EnvironmentMixin;
}
