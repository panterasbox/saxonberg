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

import type { CardId } from '@saxonberg/types';
import { SourceTreeApi } from '../../api/source-tree';
import type {
  CommandView,
  SubcommandDefinition,
  OptionDefinition,
  PositionalDefinition,
  CommandValidator,
  ExampleDefinition,
} from '../../api/command';
import { CommandApi, SUBCOMMAND_FIELD } from '../../api/command';

/**
 * Resolve a raw `controller:` spec value to the `/`-rooted mud template
 * path that dispatch clones. The single rule:
 *   - starts with `/` → it IS the absolute template path; use verbatim.
 *   - otherwise → resolve relative to the spec file's own directory,
 *     then map to the posix `/`-rooted mud template path.
 * This is the one resolution axis for the `controller:` field — no
 * implicit `/obj/command/` prefix, no `world/` special case.
 */
function resolveController(rawController: string, specFilePath: string): string {
  if (rawController.startsWith('/')) return rawController;
  return SourceTreeApi.toMudPath(
    SourceTreeApi.resolveFrom(specFilePath, rawController)
  );
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
  /** Multi-line authored help prose for the verb (optional). */
  public readonly help: string | undefined;
  /** Worked invocations shown under an Examples heading (optional). */
  public readonly examples: ExampleDefinition[];
  /** Top-level positionals for flat verbs. Empty array for zero-arg verbs and subcommanded verbs. */
  public readonly args: PositionalDefinition[];
  public readonly subcommands: Record<string, SubcommandDefinition>;
  /**
   * Opt-in flag permitting top-level `args:` AND `subcommands:` to
   * coexist. When true, the matcher tries the subcommand map first;
   * an unknown first token does NOT error — it falls through to
   * Phase 3a, binding the token + remaining tokens against
   * `this.args`. Schema-enforced: the flag REQUIRES both fields.
   */
  public readonly fallthrough: boolean;
  /**
   * Default async-dispatch mode for this verb (default `false`). When
   * `true`, `CommandGiverMixin._executeOne` detaches the controller body
   * from the giver's own input chain at accept-time. Overridden
   * per-invocation by the reserved `--async` / `--sync` flags.
   */
  public readonly async: boolean;
  /**
   * ⭐ The cards this verb declares it opens (`opens_card:` in the
   * YAML), normalized to a list. `CardApi.open` refuses any card a
   * running command did not declare — see {@link CommandView.opens_card}.
   */
  public readonly opensCards: readonly CardId[];
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

  /**
   * ⭐ The verb's **category** — the directory its spec lives in.
   *
   * Derived rather than declared, because it already is: a spec at
   * `mud/cmd/<category>/<verb>.yaml` states its category by where it
   * sits, and a second `category:` key in the YAML would be a fact
   * expressible two ways and therefore a fact two authors can disagree
   * about.
   *
   * The affordance radial reads this and nothing else does. Geometry
   * is fixed per category and must never reflow to fit the verbs a
   * particular object happens to afford — muscle memory across objects
   * is the entire point of a radial, and a menu that rearranges itself
   * has none.
   *
   * ⚠ A **domain-local** verb (`world/<sphere>/<locality>/cmd/…`, or an
   * industry's `trade/<industry>/cmd/…`) reports `'domain'`. Its category is its content, not one of the
   * core ones, and forcing it into `perception` or `device` would put
   * a locality's private verb in a slot the player's muscle memory has
   * assigned to something else.
   */
  public get category(): string {
    const parts = this.filePath.replace(/\\/g, '/').split('/');
    // A content-tree view (`<mud>/world/<…>/cmd/<verb>.yaml`,
    // `<mud>/trade/<…>/cmd/<verb>.yaml`) carries a `cmd` directory
    // segment; an engine view's path is `<mud>/<category>/<verb>.yaml`
    // (the `content/cmd/` prefix is not part of its key) and carries none.
    if (parts.slice(0, -1).includes('cmd')) return 'domain';
    // …/cmd/<category>/<verb>.yaml → the segment before the file.
    const dir = parts[parts.length - 2];
    return dir && dir !== 'cmd' ? dir : 'system';
  }

  private constructor(view: CommandView, filePath: string) {
    this.verbs = view.verbs || [];
    this.controller = view.controller;
    this.description = view.description || '';
    this.help = view.help;
    this.examples = view.examples ?? [];
    this.args = view.args || [];
    this.subcommands = view.subcommands || {};
    this.fallthrough = view.fallthrough === true;
    this.async = view.async === true;
    this.opensCards =
      view.opens_card === undefined
        ? []
        : ((Array.isArray(view.opens_card)
            ? view.opens_card
            : [view.opens_card]) as CardId[]);
    this.verbOptions = normaliseOptions(view.options);
    this.payload = normaliseOptions(view.payload);
    this.validators = view.validators ?? [];
    this.filePath = filePath;

    this.normaliseShape();
    this.validate();
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
      view = SourceTreeApi.parseYaml(yamlContent);
    } catch (error) {
      throw new Error(`Failed to parse YAML in ${filePath}: ${error}`);
    }
    return CommandDefinition.fromView(view, filePath);
  }

  /**
   * Build from an already-parsed view (a `command-view` document's
   * `data`, or a parsed YAML). Validated against the command schema the
   * same way `fromYaml` is. `filePath` only labels errors and derives the
   * category — a store-served view passes the path its view key would
   * have had on disk.
   */
  static fromView(view: unknown, filePath: string = '<inline>'): CommandDefinition {
    const trail = CommandApi.validateCommandView(view);
    if (trail !== null) {
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

    if (this.fallthrough) {
      // Flag REQUIRES both args and subcommands. The schema already
      // enforces this, but defense-in-depth — direct CommandView
      // instantiation in tests bypasses the schema.
      if (!hasArgs || !hasSubcommands) {
        throw new Error(
          `Command definition ${this.filePath}: fallthrough: true requires both top-level args: AND subcommands: to be declared`
        );
      }
    } else if (hasArgs && hasSubcommands) {
      throw new Error(
        `Command definition ${this.filePath} cannot have both args and subcommands (set fallthrough: true to opt in to subcommand-then-flat dispatch)`
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
    validateReservedFlagNames(this);
  }

  /**
   * The verb-level controller resolved to its `/`-rooted mud template
   * path (see `resolveController`). Dispatch clones this path directly.
   * Undefined when the verb declares no verb-level controller (an
   * Option-E subcommanded verb).
   */
  get resolvedController(): string | undefined {
    return this.controller === undefined
      ? undefined
      : resolveController(this.controller, this.filePath);
  }

  /**
   * Resolve the controller template path for a given subcommand.
   * Per-subcommand `controller:` wins; otherwise falls back to the
   * verb-level controller. The returned value is the resolved
   * `/`-rooted template path (not the raw spec value). Returns
   * undefined when neither is set (load-time validation prevents this
   * for declared subcommands).
   */
  controllerForSubcommand(name: string): string | undefined {
    const sub = this.subcommands[name];
    const raw = sub?.controller ?? this.controller;
    if (raw === undefined) return undefined;
    return resolveController(raw, this.filePath);
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
   * Options in scope for the assemble() phase. The map keys are option
   * names; pre-resolve short-flag aliases via `getOption`.
   *
   * ⚠ **A subcommand's scope INCLUDES the verb's own options**, with the
   * subcommand's winning on a name collision (more specific wins). Every
   * YAML that writes `# verb-scoped: in scope for the bare form AND the
   * subcommands` was describing this — and before it was implemented, it
   * was describing a lie: verb options bind only in the binder's Phase 1,
   * *before* the subcommand token is consumed, so `verb --flag sub arg`
   * worked and `verb sub arg --flag` failed with "unknown option at
   * sub-level". It went unnoticed because controller suites drive a bound
   * model directly and never exercise the binder.
   */
  getOptions(scope: 'verb' | string): Record<string, OptionDefinition> {
    if (scope === 'verb') return this.verbOptions;
    const sub = this.subcommands[scope];
    if (!sub?.options) return this.verbOptions;
    return { ...this.verbOptions, ...sub.options };
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
      // Primary verb is the header; list only the alternates.
      lines.push(`Aliases: ${this.verbs.slice(1).join(', ')}`);
      lines.push('');
    }

    if (!this.hasSubcommands()) {
      lines.push('Syntax:');
      const rendered = renderArgs(this.args);
      const usage = rendered
        ? `${this.getPrimaryVerb()} ${rendered}`
        : this.getPrimaryVerb();
      lines.push(`  ${usage}`);
      const optionLines = renderOptionLines(this.verbOptions, '  ');
      if (optionLines.length > 0) {
        lines.push('Options:');
        optionLines.forEach((l) => lines.push(l));
      }
      lines.push('');
    }

    // Authored verb-level prose, below the synthesized syntax.
    if (this.help) {
      lines.push(this.help.trimEnd());
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
        if (sub?.help) {
          for (const line of sub.help.trimEnd().split('\n')) {
            lines.push(line ? `    ${line}` : '');
          }
        }
        renderOptionLines(sub?.options, '    ').forEach((l) => lines.push(l));
        renderExampleLines(sub?.examples, '    ').forEach((l) => lines.push(l));
      });
      lines.push('');
    }

    // Verb-level options on a subcommanded verb bind before the
    // subcommand word — surface them after the subcommand list.
    if (this.hasSubcommands()) {
      const optionLines = renderOptionLines(this.verbOptions, '  ');
      if (optionLines.length > 0) {
        lines.push('Options:');
        optionLines.forEach((l) => lines.push(l));
        lines.push('');
      }
    }

    // Verb-level examples close the entry.
    const exampleLines = renderExampleLines(this.examples, '  ');
    if (exampleLines.length > 0) {
      lines.push('Examples:');
      exampleLines.forEach((l) => lines.push(l));
      lines.push('');
    }

    return lines.join('\n');
  }
}

/* ────────────────────── helpers ────────────────────── */

/**
 * Render an `examples` list to aligned `<indent><cmd>  — <note>` lines.
 * Returns `[]` for an absent / empty list so callers can gate a heading.
 */
function renderExampleLines(
  examples: ExampleDefinition[] | undefined,
  indent: string
): string[] {
  if (!examples || examples.length === 0) return [];
  const width = Math.max(...examples.map((e) => e.cmd.length));
  return examples.map((e) =>
    e.note
      ? `${indent}${e.cmd.padEnd(width)}  — ${e.note}`
      : `${indent}${e.cmd}`
  );
}

/**
 * Render an options map to aligned `<indent>-x, --name <val>   desc`
 * lines. Booleans carry no value placeholder; everything else shows
 * `<field>`. Returns `[]` for an empty map so callers can gate a
 * heading.
 */
function renderOptionLines(
  options: Record<string, OptionDefinition> | undefined,
  indent: string
): string[] {
  if (!options) return [];
  const entries = Object.entries(options);
  if (entries.length === 0) return [];
  const forms = entries.map(([name, def]) => {
    const flag = def.short ? `-${def.short}, --${name}` : `--${name}`;
    const val = def.type === 'boolean' ? '' : ` <${def.field ?? name}>`;
    return { form: `${flag}${val}`, desc: def.description ?? '' };
  });
  const width = Math.max(...forms.map((f) => f.form.length));
  return forms.map((f) =>
    f.desc ? `${indent}${f.form.padEnd(width)}   ${f.desc}` : `${indent}${f.form}`
  );
}

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
 * Render an args array as `[at] <req> [opt] <greedy...>` form. A
 * field's `prepositions` render as a leading `[at]` / `[at|on]` marker
 * (always optional — the matcher consumes them only if present).
 */
function renderArgs(args: PositionalDefinition[] | undefined): string {
  if (!args || args.length === 0) return '';
  return args
    .map((def) => {
      const core = def.greedy
        ? `<${def.name}...>`
        : def.required
          ? `<${def.name}>`
          : `[${def.name}]`;
      const preps =
        def.prepositions && def.prepositions.length > 0
          ? `[${def.prepositions.join('|')}] `
          : '';
      return `${preps}${core}`;
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

/**
 * `--async` / `--sync` are reserved framework flags (parsed ahead of
 * per-command option binding — see `CommandLogic.assemble`). A command
 * that declared an option, option-`field`, or positional named `async`
 * or `sync` would have that token silently swallowed by the reserved-flag
 * interceptor, never reaching its binder. Fail such a definition at load
 * so the collision surfaces at boot, not as a mystery at dispatch.
 */
function validateReservedFlagNames(def: CommandDefinition): void {
  const RESERVED = new Set(['async', 'sync']);
  const check = (name: string | undefined, where: string): void => {
    if (name !== undefined && RESERVED.has(name)) {
      throw new Error(
        `name "${name}" is a reserved framework flag (--async / --sync) and cannot be used as ${where} in ${def.filePath}`
      );
    }
  };
  const checkOptions = (
    opts: Record<string, OptionDefinition>,
    where: string
  ): void => {
    for (const [name, opt] of Object.entries(opts)) {
      check(name, `an option name (${where})`);
      check(opt.field, `an option field (${where})`);
    }
  };
  for (const a of def.args) check(a.name, 'a positional arg');
  checkOptions(def.verbOptions, 'verb');
  checkOptions(def.payload, 'payload');
  for (const [subName, sub] of Object.entries(def.subcommands)) {
    checkOptions(sub.options ?? {}, `subcommand "${subName}"`);
    for (const a of sub.args ?? []) check(a.name, `subcommand "${subName}" arg`);
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

  // Fallthrough verbs: a subcommand name MUST NOT collide with the
  // first top-level positional's name. (The matcher distinguishes them
  // by position — known sub-name wins, unknown token falls through to
  // bind against the positional — but identical names produce confusing
  // help/error text.)
  if (def.fallthrough && def.args.length > 0) {
    const firstArgName = def.args[0]!.name;
    if (def.subcommands[firstArgName]) {
      throw new Error(
        `top-level positional "${firstArgName}" collides with subcommand of the same name in ${def.filePath}`
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
