// QuantityLogic — the hot-reloadable logic singleton behind QuantityApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import Ajv, { type ValidateFunction } from 'ajv';
import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { Quantity } from '../../lib/quantity';
import type { Unit, ScaleName, TagTableEntry } from '../../lib/quantity';
import type { TagTableLoadResult } from '../../api/quantity';

const QuantityApiCallers = SecurityPolicies.FromModule('/api/quantity#QuantityApi'
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Default quantity-tags YAML — the no-arg fallback for **tests only**. In
 * production the installer (`PackApi`) always passes the resolved pack path
 * (the YAML is content, owned by the base-library content pack — the source
 * of truth). Resolved **lazily** (not at module scope) so merely importing
 * `QuantityLogic` doesn't hard-require a content pack to be installed —
 * keeping the kernel decoupled from content. Memoized after first use.
 *
 * The JSON **schema**, by contrast, is a kernel validation contract (not
 * pack content), so it stays beside the engine in `config/`.
 */
let _defaultYamlPath: string | null = null;
function defaultYamlPath(): string {
  if (_defaultYamlPath === null) {
    _defaultYamlPath = createRequire(import.meta.url).resolve(
      '@saxonberg/content-base-library/content/quantity/quantity-tags.yaml'
    );
  }
  return _defaultYamlPath;
}
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
@Unshadowable
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
    const path = yamlPath ?? defaultYamlPath();
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
    const path = yamlPath ?? defaultYamlPath();
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
