// QuantityLogic — the hot-reloadable logic singleton behind QuantityApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import Ajv, { type ValidateFunction } from 'ajv';
import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { Quantity } from '../../lib/quantity';
import type { Unit, ScaleName, TagTableEntry } from '../../lib/quantity';
import type { TagTableLoadResult } from '../../api/quantity';

const QuantityApiCallers = SecurityPolicies.FromModule(
  'mud/api/quantity#QuantityApi'
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Default config locations. Tests can override via the path arg. */
const DEFAULT_YAML_PATH = join(__dirname, '../../config/quantity-tags.yaml');
const DEFAULT_SCHEMA_PATH = join(
  __dirname,
  '../../config/quantity-tags.schema.json'
);

/**
 * Natural-language unit-token lexicon → canonical {@link Unit}. The
 * single home for "what does the word `cups` mean as a unit" — consumed
 * by both the formal `:{N unit}` parser (`mql/parser.ts`) and the
 * natural-language measure desugar (`mql/desugar.ts`). Keys are
 * lowercase (the MQL lexer lowercases barewords); singular and plural
 * forms both map.
 *
 * v1 covers the bulk liquid-volume units only. New measurable units add
 * their tokens here as natural-language authoring/play surfaces appear.
 */
const UNIT_TOKENS: ReadonlyMap<string, Unit> = new Map<string, Unit>([
  ['l', 'L'],
  ['liter', 'L'],
  ['litre', 'L'],
  ['liters', 'L'],
  ['litres', 'L'],
  ['ml', 'mL'],
  ['milliliter', 'mL'],
  ['millilitre', 'mL'],
  ['milliliters', 'mL'],
  ['millilitres', 'mL'],
  ['cup', 'cup'],
  ['cups', 'cup'],
]);

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
 * Parse + validate the YAML, returning the per-unit/scale map.
 *
 * Throws on YAML syntax errors, schema violations, or non-object
 * top-level shapes — boot fails loud rather than silently starting with
 * stale tables.
 */
function parseAndValidate(
  yamlPath: string,
  schemaPath: string
): Record<Unit, Record<ScaleName, TagTableEntry[]>> {
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
  return parsed as Record<Unit, Record<ScaleName, TagTableEntry[]>>;
}

/**
 * QuantityLogic — the hot-reloadable logic singleton behind
 * {@link QuantityApi}.
 *
 * Lives at `/obj/api/quantity` (a stateless `Stuff` singleton, no
 * backing `Template`); `QuantityApi`'s public statics forward here via
 * `StuffApi.singletonSync`. The unit-token lexicon, schema compilation,
 * and YAML parse/validate live in module-private free functions; each
 * public method carries the `FromModule` gate per method.
 *
 * @internal
 */
export class QuantityLogic extends Idea {
  /** See {@link QuantityApi.resolveUnitToken}. */
  @CallSecurity(QuantityApiCallers)
  public resolveUnitToken(token: string): Unit | null {
    return UNIT_TOKENS.get(token.toLowerCase()) ?? null;
  }

  /** See {@link QuantityApi.isUnitToken}. */
  @CallSecurity(QuantityApiCallers)
  public isUnitToken(token: string): boolean {
    return UNIT_TOKENS.has(token.toLowerCase());
  }

  /** See {@link QuantityApi.loadTagTables}. */
  @CallSecurity(QuantityApiCallers)
  public loadTagTables(yamlPath?: string): TagTableLoadResult {
    const path = yamlPath ?? DEFAULT_YAML_PATH;
    const tables = parseAndValidate(path, DEFAULT_SCHEMA_PATH);
    const registered: Array<{ unit: Unit; scaleName: ScaleName }> = [];
    for (const [unitKey, scales] of Object.entries(tables)) {
      const unit = unitKey as Unit;
      for (const [scaleName, entries] of Object.entries(scales)) {
        Quantity.registerTagTable(unit, scaleName, entries);
        registered.push({ unit, scaleName });
      }
    }
    return { registered, removed: [], path };
  }

  /** See {@link QuantityApi.reloadTagTables}. */
  @CallSecurity(QuantityApiCallers)
  public reloadTagTables(yamlPath?: string): TagTableLoadResult {
    const path = yamlPath ?? DEFAULT_YAML_PATH;
    const before = new Set<string>(
      Quantity._registeredScales().map(
        ({ unit, scaleName }) => `${unit}\0${scaleName}`
      )
    );
    const tables = parseAndValidate(path, DEFAULT_SCHEMA_PATH);
    const incoming = new Set<string>();
    const registered: Array<{ unit: Unit; scaleName: ScaleName }> = [];
    for (const [unitKey, scales] of Object.entries(tables)) {
      const unit = unitKey as Unit;
      for (const [scaleName, entries] of Object.entries(scales)) {
        Quantity.registerTagTable(unit, scaleName, entries);
        registered.push({ unit, scaleName });
        incoming.add(`${unit}\0${scaleName}`);
      }
    }
    const removed: Array<{ unit: Unit; scaleName: ScaleName }> = [];
    for (const key of before) {
      if (incoming.has(key)) continue;
      const [unit, scaleName] = key.split('\0') as [Unit, ScaleName];
      Quantity._clearTagTable(unit, scaleName);
      removed.push({ unit, scaleName });
    }
    return { registered, removed, path };
  }
}
