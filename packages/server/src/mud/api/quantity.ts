/**
 * QuantityApi — load / reload Quantity tag tables from the YAML
 * config file at `mud/config/quantity-tags.yaml`.
 *
 * Tag tables (`{ tag, threshold }` rows keyed by unit) are pure
 * data with no behavior — the API forces every consumer through
 * `Quantity.tag()` / `Quantity.fromTag()` / `Quantity.parse()`.
 * Centralizing them in YAML lets content authors tune thresholds
 * and tag vocabulary without TS edits, and lets the engine reload
 * the registry at runtime.
 *
 * Boot wiring: `AppBootstrap` calls `QuantityApi.loadTagTables()`
 * after `SeederManager.run()`. Tests bypass this and use the
 * `installV1QuantityTagTables` helper from
 * `lib/persistence/__tests__/` (or call `loadTagTables` directly).
 *
 * Reload semantics: `reloadTagTables()` re-reads the YAML and
 * applies the changes to the live registry — replacing tables for
 * units present in the new file, deleting tables for units that
 * disappeared. Existing `Quantity` instances see new tags on their
 * next `tag()` call (no caching layer to invalidate).
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import Ajv, { type ValidateFunction } from 'ajv';
import { Quantity } from '../lib/quantity';
import type { Unit, TagTableEntry } from '../lib/quantity';
import { SecurityApi } from './security';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Default config locations. Tests can override via the path arg. */
const DEFAULT_YAML_PATH = join(__dirname, '../config/quantity-tags.yaml');
const DEFAULT_SCHEMA_PATH = join(
  __dirname,
  '../config/quantity-tags.schema.json'
);

/**
 * Result of a load / reload run. Surfaces actionable counts for
 * boot logs and the future `tags reload` admin command.
 */
export interface TagTableLoadResult {
  /** Units whose tables were freshly registered (added or replaced). */
  registered: Unit[];
  /** Units whose tables were removed because they disappeared from the YAML. */
  removed: Unit[];
  /** Resolved YAML path used for this run. */
  path: string;
}

let _validator: ValidateFunction | null = null;

/**
 * Compile the schema once. Mirrors `CommandDefinition`'s lazy
 * compilation pattern.
 */
function getSchemaValidator(schemaPath: string): ValidateFunction {
  if (_validator) return _validator;
  const schemaJson = JSON.parse(readFileSync(schemaPath, 'utf-8')) as object;
  const ajv = new Ajv({ allErrors: true, strict: false });
  _validator = ajv.compile(schemaJson);
  return _validator;
}

/**
 * Parse + validate the YAML, returning the per-unit map.
 *
 * Throws on YAML syntax errors, schema violations, or non-object
 * top-level shapes — boot fails loud rather than silently
 * starting with stale tables.
 */
function parseAndValidate(
  yamlPath: string,
  schemaPath: string
): Record<Unit, TagTableEntry[]> {
  let raw: string;
  try {
    raw = readFileSync(yamlPath, 'utf-8');
  } catch (cause) {
    throw new Error(
      `QuantityApi.loadTagTables: cannot read '${yamlPath}': ` +
        (cause instanceof Error ? cause.message : String(cause))
    );
  }
  let parsed: unknown;
  try {
    parsed = YAML.parse(raw);
  } catch (cause) {
    throw new Error(
      `QuantityApi.loadTagTables: invalid YAML at '${yamlPath}': ` +
        (cause instanceof Error ? cause.message : String(cause))
    );
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(
      `QuantityApi.loadTagTables: '${yamlPath}' must be a top-level object keyed by unit`
    );
  }
  const validate = getSchemaValidator(schemaPath);
  if (!validate(parsed)) {
    const trail = (validate.errors ?? [])
      .map((e) => `  ${e.instancePath || '/'} ${e.message ?? ''}`)
      .join('\n');
    throw new Error(
      `QuantityApi.loadTagTables: schema validation failed for '${yamlPath}':\n${trail}`
    );
  }
  return parsed as Record<Unit, TagTableEntry[]>;
}

export class QuantityApi {
  /**
   * Read the tag-tables YAML and register each declared unit's
   * table with `Quantity`. Idempotent — calling twice with the
   * same file just re-registers the same tables (the registry
   * stores arrays, not Set semantics).
   *
   * Boot path: `AppBootstrap` calls this after `SeederManager.run`
   * so the tables are available before any code that hits
   * `tag()` / `parse(tagString)` runs (the marshallers, the
   * propagation walks, controllers).
   *
   * Tests can pass an explicit path to load fixture files.
   */
  public static loadTagTables(yamlPath?: string): TagTableLoadResult {
    const path = yamlPath ?? DEFAULT_YAML_PATH;
    const tables = parseAndValidate(path, DEFAULT_SCHEMA_PATH);
    const registered: Unit[] = [];
    for (const [unit, entries] of Object.entries(tables) as Array<
      [Unit, TagTableEntry[]]
    >) {
      Quantity.registerTagTable(unit, entries);
      registered.push(unit);
    }
    return { registered, removed: [], path };
  }

  /**
   * Re-read the YAML and apply the diff to the live registry:
   *   - Units present in the new file get re-registered (replacing
   *     any prior table).
   *   - Units present in the registry but absent from the new file
   *     get cleared.
   *
   * Existing Quantity instances see new tags on their next `tag()`
   * call — there's no caching layer to invalidate.
   *
   * Production trigger is a future admin slash command; v1 calls
   * it from a test harness when needed.
   */
  public static reloadTagTables(yamlPath?: string): TagTableLoadResult {
    const path = yamlPath ?? DEFAULT_YAML_PATH;
    const before = new Set<Unit>(Quantity._registeredTagTableUnits());
    const tables = parseAndValidate(path, DEFAULT_SCHEMA_PATH);
    const incoming = new Set<Unit>(
      Object.keys(tables) as Unit[]
    );
    const registered: Unit[] = [];
    for (const [unit, entries] of Object.entries(tables) as Array<
      [Unit, TagTableEntry[]]
    >) {
      Quantity.registerTagTable(unit, entries);
      registered.push(unit);
    }
    const removed: Unit[] = [];
    for (const unit of before) {
      if (!incoming.has(unit)) {
        Quantity._clearTagTable(unit);
        removed.push(unit);
      }
    }
    return { registered, removed, path };
  }
}

SecurityApi.decorateApiClass(QuantityApi);
