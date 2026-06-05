/**
 * CommandDefinition - parsed YAML command (the "View" in MVC).
 *
 * Wraps a CommandView and surfaces accessors for syntax patterns,
 * subcommands, and options. Positional shape is declared by an
 * ordered `args:` array on each syntax variant / subcommand;
 * `args[0]` is positional slot 0, `args[1]` is slot 1, etc. Each
 * arg carries its own `name` so the YAML is self-documenting and
 * insensitive to YAML-formatter key-sort.
 *
 * Three load-time invariants run in `validate()`:
 *
 *   1. **Field-name uniqueness.** Across positional args of every
 *      syntax variant + verb-scoped options + every subcommand's
 *      options + that subcommand's positional args, no two
 *      declarations share a `name` (or option `field`) unless
 *      they're in mutually-exclusive syntax variants or
 *      subcommands.
 *   2. **Greedy must be last.** A `greedy: true` arg is the last
 *      arg in its `args:` array.
 *   3. **No required after optional.** A `required: true` arg
 *      cannot follow a `required: false` arg in the same array.
 *      Greedy is `required: true` by definition, so this rule
 *      subsumes "optional cannot precede greedy".
 */

import { parse as parseYaml } from 'yaml';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Ajv, { type ValidateFunction } from 'ajv';
import type {
  CommandView,
  SubcommandDefinition,
  OptionDefinition,
  PositionalDefinition,
  CommandValidator,
} from '../../api/command';
import { SUBCOMMAND_FIELD } from '../../api/command';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCHEMA_PATH = join(__dirname, '../../cmd/command.schema.json');

let _validate: ValidateFunction | null = null;

/**
 * Load the JSON schema once and return the compiled Ajv validator.
 * Pure-lazy: cost is paid on first YAML load, not at module import.
 */
function getSchemaValidator(): ValidateFunction {
  if (_validate) return _validate;
  const schemaJson = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8')) as object;
  const ajv = new Ajv({ allErrors: true, strict: false });
  _validate = ajv.compile(schemaJson);
  return _validate;
}

/**
 * Parsed command definition.
 */
export class CommandDefinition {
  public readonly verbs: string[];
  /**
   * Verb-level controller template name. May be undefined when the
   * verb declares subcommands and every subcommand carries its own
   * `controller:` (Option E — `analyze`, `measure`).
   */
  public readonly controller: string | undefined;
  public readonly description: string;
  /** Top-level positionals for flat verbs. Empty array for zero-arg verbs and subcommanded verbs. */
  public readonly args: PositionalDefinition[];
  public readonly subcommands: Record<string, SubcommandDefinition>;
  public readonly verbOptions: Record<string, OptionDefinition>;
  /**
   * Structured-form-only fields. Populated exclusively through
   * `CommandApi.assembleFromStructured` — the text-input path
   * doesn't surface these to the matcher at all. See
   * `command-spec.md § payload` for the full shape.
   */
  public readonly payload: Record<string, OptionDefinition>;
  /**
   * Verb-level validator path specs from the YAML. Resolved into
   * `_resolvedValidators` by `CommandApi.preloadAll`; the dispatch
   * pipeline reads only the resolved form.
   */
  public readonly validators: string[];
  /**
   * Live functions populated by `CommandApi.preloadAll`. Always
   * parallels `validators` 1-to-1; absence means preload hasn't run.
   * @internal
   */
  public _resolvedValidators?: CommandValidator[];
  public readonly filePath: string;

  private constructor(view: CommandView, filePath: string) {
    this.verbs = view.verbs || [];
    this.controller = view.controller;
    this.description = view.description || '';
    this.args = view.args || [];
    this.subcommands = view.subcommands || {};
    this.verbOptions = normaliseOptions(view.options);
    this.payload = normaliseOptions(view.payload);
    this.validators = view.validators ?? [];
    this.filePath = filePath;

    this.normaliseShape();
    this.validate();
  }

  /**
   * Load CommandDefinition from YAML file.
   */
  static fromFile(filePath: string): CommandDefinition {
    try {
      const yamlContent = readFileSync(filePath, 'utf-8');
      return this.fromYaml(yamlContent, filePath);
    } catch (error) {
      throw new Error(`Failed to load command definition from ${filePath}: ${error}`);
    }
  }

  /**
   * Parse CommandDefinition from YAML string. The parsed view is
   * validated against `cmd/command.schema.json`; schema failures
   * throw with the full Ajv error trail so authoring mistakes
   * surface at boot, not at first verb invocation.
   */
  static fromYaml(
    yamlContent: string,
    filePath: string = '<inline>'
  ): CommandDefinition {
    let view: unknown;
    try {
      view = parseYaml(yamlContent);
    } catch (error) {
      throw new Error(`Failed to parse YAML in ${filePath}: ${error}`);
    }
    const validate = getSchemaValidator();
    if (!validate(view)) {
      const trail = (validate.errors ?? [])
        .map((e) => `  ${e.instancePath || '/'} ${e.message ?? ''}`)
        .join('\n');
      throw new Error(
        `Schema validation failed for ${filePath}:\n${trail}`
      );
    }
    return new CommandDefinition(view as CommandView, filePath);
  }

  /**
   * Per-subcommand `options` table normalisation, plus per-positional
   * `scope` coercion. The YAML/spec record accepts
   * `scope: string | string[]`; downstream code treats it as
   * `string[] | undefined` after this pass, so consumers don't have
   * to branch on `Array.isArray` at every call site.
   */
  private normaliseShape(): void {
    for (const a of this.args) normalisePositionalScope(a);
    for (const [, opt] of Object.entries(this.verbOptions)) {
      normaliseOptionScope(opt);
    }
    for (const [, opt] of Object.entries(this.payload)) {
      normaliseOptionScope(opt);
    }
    for (const [, sub] of Object.entries(this.subcommands)) {
      sub.options = normaliseOptions(sub.options);
      for (const a of sub.args ?? []) normalisePositionalScope(a);
      for (const [, opt] of Object.entries(sub.options ?? {})) {
        normaliseOptionScope(opt);
      }
    }
  }

  /**
   * Run load-time invariants. Throws on violation.
   */
  private validate(): void {
    if (!this.verbs || this.verbs.length === 0) {
      throw new Error(
        `Command definition ${this.filePath} must have at least one verb`
      );
    }

    const hasArgs = this.args.length > 0;
    const hasSubcommands = Object.keys(this.subcommands).length > 0;

    if (hasArgs && hasSubcommands) {
      throw new Error(
        `Command definition ${this.filePath} cannot have both args and subcommands`
      );
    }

    // Controller resolution rule: a verb must either have a top-level
    // `controller:` OR declare subcommands where every subcommand has
    // its own `controller:` (Option E). A verb with no controller and
    // no subcommands has nothing to dispatch to.
    if (!this.controller) {
      if (!hasSubcommands) {
        throw new Error(
          `Command definition ${this.filePath} must specify a controller`
        );
      }
      const missing: string[] = [];
      for (const [name, sub] of Object.entries(this.subcommands)) {
        if (!sub.controller) missing.push(name);
      }
      if (missing.length > 0) {
        throw new Error(
          `Command definition ${this.filePath} omits the verb-level controller, but subcommand(s) [${missing.join(', ')}] do not declare a per-subcommand controller`
        );
      }
    }

    if (hasArgs) {
      validateArgOrdering(this.args, this.filePath, 'args');
      for (const a of this.args) {
        validateCardinality(a, this.filePath, 'args');
      }
    }

    if (hasSubcommands) {
      Object.entries(this.subcommands).forEach(([name, sub]) => {
        validateArgOrdering(sub.args, this.filePath, name);
        for (const a of sub.args ?? []) {
          validateCardinality(a, this.filePath, name);
        }
        for (const [, opt] of Object.entries(sub.options ?? {})) {
          validateCardinality(opt, this.filePath, name);
        }
      });
    }

    for (const [, opt] of Object.entries(this.verbOptions)) {
      validateCardinality(opt, this.filePath, 'verbOptions');
    }
    for (const [, opt] of Object.entries(this.payload)) {
      validateCardinality(opt, this.filePath, 'payload');
    }

    validateFieldNameUniqueness(this);
  }

  /**
   * Resolve the controller template name for a given subcommand.
   * Per-subcommand `controller:` wins; otherwise falls back to the
   * verb-level controller. Returns undefined when neither is set
   * (load-time validation prevents this for declared subcommands).
   */
  controllerForSubcommand(name: string): string | undefined {
    const sub = this.subcommands[name];
    if (sub?.controller) return sub.controller;
    return this.controller;
  }

  hasSubcommands(): boolean {
    return Object.keys(this.subcommands).length > 0;
  }

  getSubcommand(name: string): SubcommandDefinition | undefined {
    return this.subcommands[name];
  }

  getSubcommandNames(): string[] {
    return Object.keys(this.subcommands);
  }

  hasVerb(verb: string): boolean {
    return this.verbs.some((v) => v.toLowerCase() === verb.toLowerCase());
  }

  getPrimaryVerb(): string {
    return this.verbs[0] || '';
  }

  /**
   * Verb-scoped options for the assemble() phase. The map keys are
   * option names; pre-resolve short-flag aliases via `getOption`.
   */
  getOptions(scope: 'verb' | string): Record<string, OptionDefinition> {
    if (scope === 'verb') return this.verbOptions;
    const sub = this.subcommands[scope];
    return sub?.options ?? {};
  }

  /**
   * Resolve an option by long-name OR short-flag char within a scope
   * ('verb' or a subcommand name). Returns the canonical name and
   * its definition, or undefined when the scope doesn't declare it.
   */
  getOption(
    scope: 'verb' | string,
    nameOrShort: string
  ): { name: string; def: OptionDefinition } | undefined {
    const opts = this.getOptions(scope);
    const direct = opts[nameOrShort];
    if (direct) return { name: nameOrShort, def: direct };
    for (const [name, def] of Object.entries(opts)) {
      if (def.short === nameOrShort) return { name, def };
    }
    return undefined;
  }

  /**
   * Set of all field names this verb may produce, across positional
   * args, verb-scoped options, every subcommand's options, and every
   * subcommand's positional args. Used by `assembleFromStructured`
   * to validate incoming `fields` keys.
   */
  getAllFieldNames(): Set<string> {
    const names = new Set<string>();
    for (const a of this.args) names.add(a.name);
    for (const [, def] of Object.entries(this.verbOptions)) {
      names.add(def.field ?? optionFieldName(this.verbOptions, def));
    }
    for (const [, def] of Object.entries(this.payload)) {
      names.add(def.field ?? optionFieldName(this.payload, def));
    }
    for (const sub of Object.values(this.subcommands)) {
      for (const a of sub.args ?? []) names.add(a.name);
      for (const [, def] of Object.entries(sub.options ?? {})) {
        names.add(def.field ?? optionFieldName(sub.options ?? {}, def));
      }
    }
    if (this.hasSubcommands()) names.add(SUBCOMMAND_FIELD);
    return names;
  }

  /**
   * Render man-page-style usage from the args block. Format is the
   * *output* of the schema, not part of it.
   */
  getUsage(): string {
    const verb = this.getPrimaryVerb();

    if (this.hasSubcommands()) {
      const subcommands = this.getSubcommandNames().join('|');
      return `${verb} <${subcommands}> [args...]`;
    }

    const rendered = renderArgs(this.args);
    return rendered ? `${verb} ${rendered}` : verb;
  }

  /**
   * Multi-line help text — verb header, aliases, then per-syntax /
   * per-subcommand lines.
   */
  getHelpText(): string {
    const lines: string[] = [];

    lines.push(`${this.getPrimaryVerb().toUpperCase()}: ${this.description}`);
    lines.push('');

    if (this.verbs.length > 1) {
      lines.push(`Aliases: ${this.verbs.join(', ')}`);
      lines.push('');
    }

    if (!this.hasSubcommands()) {
      lines.push('Syntax:');
      const rendered = renderArgs(this.args);
      const usage = rendered
        ? `${this.getPrimaryVerb()} ${rendered}`
        : this.getPrimaryVerb();
      lines.push(`  ${usage}`);
      lines.push('');
    }

    if (this.hasSubcommands()) {
      lines.push('Subcommands:');
      Object.entries(this.subcommands).forEach(([name, sub]) => {
        const rendered = renderArgs(sub?.args);
        const usage = rendered
          ? `${this.getPrimaryVerb()} ${name} ${rendered}`
          : `${this.getPrimaryVerb()} ${name}`;
        lines.push(`  ${usage}`);
        if (sub?.description) {
          lines.push(`    ${sub.description}`);
        }
      });
      lines.push('');
    }

    return lines.join('\n');
  }
}

/* ────────────────────── helpers ────────────────────── */

function normaliseOptions(
  raw: Record<string, OptionDefinition> | undefined
): Record<string, OptionDefinition> {
  if (!raw) return {};
  return raw;
}

/**
 * Coerce `scope: 'foo'` to `['foo']` in place. Empty strings are
 * normalised to `undefined` (so the dispatcher's "default to
 * 'here'" branch fires). Idempotent — re-running on an already-
 * arrayed scope leaves it alone.
 */
function normalisePositionalScope(def: PositionalDefinition): void {
  const s = def.scope;
  if (Array.isArray(s)) return;
  if (typeof s !== 'string') {
    delete def.scope;
    return;
  }
  if (s.length === 0) {
    delete def.scope;
    return;
  }
  def.scope = [s];
}

/**
 * Same shape as `normalisePositionalScope` but for an option's
 * `scope` field. Options of `type: object` / `type: objects` ride
 * through the same `resolveAndValidate` pipeline as positionals;
 * having the field always-arrayed simplifies the dispatcher.
 */
function normaliseOptionScope(def: OptionDefinition): void {
  const s = def.scope;
  if (Array.isArray(s)) return;
  if (typeof s !== 'string') {
    delete def.scope;
    return;
  }
  if (s.length === 0) {
    delete def.scope;
    return;
  }
  def.scope = [s];
}

function optionFieldName(
  scope: Record<string, OptionDefinition>,
  def: OptionDefinition
): string {
  for (const [name, candidate] of Object.entries(scope)) {
    if (candidate === def) return name;
  }
  return def.field ?? '';
}

/**
 * Render an args array as `<req> [opt] <greedy...>` form.
 */
function renderArgs(args: PositionalDefinition[] | undefined): string {
  if (!args || args.length === 0) return '';
  return args
    .map((def) => {
      if (def.greedy) return `<${def.name}...>`;
      if (def.required) return `<${def.name}>`;
      return `[${def.name}]`;
    })
    .join(' ');
}

/**
 * Enforce greedy-must-be-last and no-required-after-optional
 * invariants on a single args array.
 */
function validateArgOrdering(
  args: PositionalDefinition[] | undefined,
  filePath: string,
  label: string
): void {
  if (!args) return;

  let sawOptional = false;
  for (let i = 0; i < args.length; i++) {
    const def = args[i]!;
    if (!def.name) {
      throw new Error(
        `arg at ${label}[${i}] is missing required \`name\` field (${filePath})`
      );
    }

    if (def.greedy && i !== args.length - 1) {
      throw new Error(
        `greedy arg must be last: ${filePath} ${label} arg "${def.name}"`
      );
    }

    const isOptional = def.required === false;
    const isRequired = def.required === true || def.greedy === true;

    if (sawOptional && isRequired) {
      throw new Error(
        `required arg cannot follow optional: ${filePath} ${label} arg "${def.name}"`
      );
    }
    if (isOptional) sawOptional = true;
  }
}

/**
 * Field-name uniqueness across the entire command. Mutually-
 * exclusive syntax variants and mutually-exclusive subcommands are
 * allowed to repeat names.
 *
 * Also enforces the `subcommand` reserved name when the verb has
 * subcommands — the matcher stamps the active subcommand on
 * `model.subcommand`, so a YAML can't compete with that key.
 */
/**
 * Validate `cardinality` / `onExcess` / `onShortage` for a single
 * field. Throws at YAML-load time on invalid combos.
 */
function validateCardinality(
  field: { type?: string; name?: string; cardinality?: { min?: number; max?: number; exactly?: number }; onExcess?: string; onShortage?: string },
  filePath: string,
  scope: string,
): void {
  const fname = field.name ?? '<option>';

  // `exactly` is sugar for min == max; reject coexisting with min/max.
  if (field.cardinality?.exactly !== undefined) {
    if (
      field.cardinality.min !== undefined ||
      field.cardinality.max !== undefined
    ) {
      throw new Error(
        `${filePath} (${scope}.${fname}): cardinality.exactly cannot coexist with cardinality.min or cardinality.max`
      );
    }
    if (
      !Number.isFinite(field.cardinality.exactly) ||
      field.cardinality.exactly < 0
    ) {
      throw new Error(
        `${filePath} (${scope}.${fname}): cardinality.exactly must be a non-negative number`
      );
    }
  }
  if (
    field.cardinality?.min !== undefined &&
    field.cardinality?.max !== undefined &&
    field.cardinality.min > field.cardinality.max
  ) {
    throw new Error(
      `${filePath} (${scope}.${fname}): cardinality.min (${field.cardinality.min}) cannot exceed cardinality.max (${field.cardinality.max})`
    );
  }

  // Cardinality / onExcess policies are only meaningful for MQL
  // fields; reject on non-MQL types.
  if (
    (field.cardinality !== undefined || field.onExcess !== undefined || field.onShortage !== undefined) &&
    field.type !== 'object' &&
    field.type !== 'objects'
  ) {
    throw new Error(
      `${filePath} (${scope}.${fname}): cardinality / onExcess / onShortage are only valid on object / objects fields (got type=${field.type ?? 'undefined'})`
    );
  }

  // Per-type onExcess policy enums.
  if (field.onExcess !== undefined) {
    const validForObject = ['top', 'prompt', 'error'];
    const validForObjects = ['take-all', 'prompt', 'truncate', 'error'];
    if (field.type === 'object' && !validForObject.includes(field.onExcess)) {
      throw new Error(
        `${filePath} (${scope}.${fname}): onExcess='${field.onExcess}' invalid on type='object'; valid: ${validForObject.join(', ')}`
      );
    }
    if (field.type === 'objects' && !validForObjects.includes(field.onExcess)) {
      throw new Error(
        `${filePath} (${scope}.${fname}): onExcess='${field.onExcess}' invalid on type='objects'; valid: ${validForObjects.join(', ')}`
      );
    }
  }

  // onShortage v1 enum.
  if (field.onShortage !== undefined && field.onShortage !== 'error') {
    throw new Error(
      `${filePath} (${scope}.${fname}): onShortage='${field.onShortage}' invalid in v1; only 'error' is supported`
    );
  }

  // `cardinality` and `onShortage` make no sense on `object` (cardinality
  // is implicit `{ exactly: 1 }`).
  if (field.type === 'object' && field.cardinality !== undefined) {
    throw new Error(
      `${filePath} (${scope}.${fname}): cardinality is not valid on type='object' (implicit { exactly: 1 })`
    );
  }
}

function validateFieldNameUniqueness(def: CommandDefinition): void {
  if (def.hasSubcommands()) {
    const collide = (label: string, names: Iterable<string>): void => {
      for (const n of names) {
        if (n === SUBCOMMAND_FIELD) {
          throw new Error(
            `field name "${SUBCOMMAND_FIELD}" is reserved when subcommands are declared (${label}, ${def.filePath})`
          );
        }
      }
    };
    collide('verb-scoped option', Object.keys(def.verbOptions));
    for (const [subName, sub] of Object.entries(def.subcommands)) {
      collide(`subcommand "${subName}" option`, Object.keys(sub.options ?? {}));
      collide(
        `subcommand "${subName}" arg`,
        (sub.args ?? []).map((a) => a.name)
      );
    }
  }

  // Verb-scoped option names — collisions with positionals,
  // payload, or subcommand-scoped options are reportable.
  const verbOptionNames = new Set<string>();
  for (const [name, opt] of Object.entries(def.verbOptions)) {
    verbOptionNames.add(opt.field ?? name);
  }

  // Payload field names — same uniqueness story.
  const payloadNames = new Set<string>();
  for (const [name, opt] of Object.entries(def.payload)) {
    const fname = opt.field ?? name;
    if (verbOptionNames.has(fname)) {
      throw new Error(
        `payload field "${fname}" collides with verb-scoped option in ${def.filePath}`
      );
    }
    payloadNames.add(fname);
  }

  // Top-level positional args.
  {
    const seen = new Set<string>();
    for (const a of def.args) {
      if (seen.has(a.name)) {
        throw new Error(
          `arg name "${a.name}" duplicated in top-level args in ${def.filePath}`
        );
      }
      seen.add(a.name);
      if (verbOptionNames.has(a.name)) {
        throw new Error(
          `arg name "${a.name}" collides with verb-scoped option in ${def.filePath}`
        );
      }
      if (payloadNames.has(a.name)) {
        throw new Error(
          `arg name "${a.name}" collides with payload field in ${def.filePath}`
        );
      }
    }
  }

  for (const [subName, sub] of Object.entries(def.subcommands)) {
    const subOptionNames = new Set<string>();
    for (const [name, opt] of Object.entries(sub.options ?? {})) {
      subOptionNames.add(opt.field ?? name);
    }

    for (const n of subOptionNames) {
      if (verbOptionNames.has(n)) {
        throw new Error(
          `field name "${n}" collides between verb-scoped option and subcommand "${subName}" option in ${def.filePath}`
        );
      }
    }

    const seenArg = new Set<string>();
    for (const a of sub.args ?? []) {
      if (seenArg.has(a.name)) {
        throw new Error(
          `arg name "${a.name}" duplicated in subcommand "${subName}" of ${def.filePath}`
        );
      }
      seenArg.add(a.name);
      if (verbOptionNames.has(a.name) || subOptionNames.has(a.name)) {
        throw new Error(
          `arg name "${a.name}" collides in subcommand "${subName}" of ${def.filePath}`
        );
      }
    }
  }
}
