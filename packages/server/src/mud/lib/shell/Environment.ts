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
 * Schema is static class data on each mixin layer; the effective
 * schema for an instance is computed on demand by walking the
 * composed mixin chain via `MixinApi.queryMixins`. There is no
 * central registry.
 *
 * Privacy: `setSetting` / `unsetSetting` take an `actor: Stuff`. For
 * entries with `private: true`, the call throws unless `actor` is
 * reference-equal to the host instance. Reads are unrestricted (D8).
 *
 * Cross-host resolution: `resolveSetting(host, key)` is the public
 * entry point for code that may hold a host that doesn't compose
 * `EnvironmentMixin` (e.g. NPCs reading templates declared on
 * `MobileMixin`). It transparently falls back to walking the host's
 * mixin chain for the schema default.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';
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
 * Public shape provided by `EnvironmentMixin`.
 */
export interface Environment {
  persistentStore?: Record<string, unknown>;
  sessionStore: Record<string, unknown>;

  getSetting<T>(key: string): T | undefined;
  setSetting<T>(key: string, value: T, actor: Stuff): void;
  unsetSetting(key: string, actor: Stuff): void;
  listSettings(): SettingsSnapshotEntry[];
  describeSetting(key: string): SettingsSchemaEntry | undefined;

  setVar(name: string, value: string): void;
  unsetVar(name: string): void;
  listVars(): Record<string, string>;
}

/**
 * Shape of a mixin layer that may carry settings. `MixinApi.queryMixins`
 * returns these by prototype-chain walk; `settings` is read via
 * `hasOwnProperty` to avoid pulling in inherited entries.
 */
interface MixinLayerWithSettings {
  _mixinName?: string;
  name?: string;
  settings?: SettingsSchemaEntry[];
}

/**
 * Walk the host constructor's mixin chain and return one
 * `(entry, sourceMixin)` pair per declared key. Throws on duplicate
 * keys across layers — defensive: a setting can only legitimately
 * exist in one place.
 */
function collectSchema(host: object): Array<{
  entry: SettingsSchemaEntry;
  sourceMixin: string;
}> {
  const ctor = (host as { constructor: unknown }).constructor as
    | (Function & { prototype: unknown })
    | undefined;
  if (!ctor) return [];
  const layers = MixinApi.queryMixins(ctor) as MixinLayerWithSettings[];

  const out: Array<{ entry: SettingsSchemaEntry; sourceMixin: string }> = [];
  const seen = new Map<string, string>();

  for (const layer of layers) {
    if (!Object.prototype.hasOwnProperty.call(layer, 'settings')) continue;
    const entries = layer.settings;
    if (!Array.isArray(entries)) continue;
    const sourceMixin = layer._mixinName ?? layer.name ?? '<anonymous>';
    for (const entry of entries) {
      const prev = seen.get(entry.key);
      if (prev) {
        throw new Error(
          `EnvironmentMixin: setting '${entry.key}' is declared on ` +
            `both '${prev}' and '${sourceMixin}'. Each setting may ` +
            `only be declared once across the host's mixin chain.`,
        );
      }
      seen.set(entry.key, sourceMixin);
      out.push({ entry, sourceMixin });
    }
  }
  return out;
}

function findSchema(
  host: object,
  key: string,
): { entry: SettingsSchemaEntry; sourceMixin: string } | undefined {
  return collectSchema(host).find((x) => x.entry.key === key);
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
    static persistentFields = ['persistentStore'];

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
    ];

    /**
     * Player-facing commands that operate on this mixin's stores.
     * Picked up by `CommandGiver` discovery via the `self` slot.
     */
    static commandContributions: CommandContributions = {
      self: ['settings.yaml', 'var.yaml'],
      environment: [],
      inventory: [],
      peers: [],
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

/**
 * Cross-host setting resolution.
 *
 * Settings declared on a mixin that may be composed by hosts without
 * `EnvironmentMixin` (notably `MobileMixin` settings on NPCs) need a
 * single resolution entry point so consumers don't branch on the
 * host type. This walks the schema and falls back to the declared
 * default when the host can't carry overrides.
 */
export function resolveSetting<T>(host: Stuff, key: string): T | undefined {
  if (MixinApi.isEnvironment(host)) {
    return host.getSetting<T>(key);
  }
  return findSchema(host, key)?.entry.default as T | undefined;
}
