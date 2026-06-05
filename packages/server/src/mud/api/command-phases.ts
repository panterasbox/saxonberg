/**
 * Dispatcher lifecycle phases + option-declared effects vocabulary.
 *
 * The command dispatcher runs a fixed sequence of named phases
 * between parse and emit. Options declared in YAML can attach
 * `effects:` against any phase to skip or replace its default
 * behavior — the substrate's mechanism for "this flag changes the
 * framework's lifecycle, not the verb's semantics."
 *
 * Concrete examples (current + anticipated):
 *
 *   - `look --peek` → `{ phase: 'focus-update', action: 'skip' }`
 *     Render prose without updating the focus chain. The only
 *     phase that has a real hookable implementation today.
 *
 *   - `--async` → `{ phase: 'dispatch', action: 'replace',
 *                    with: 'deferred-dispatch' }`
 *     Defer controller execution to a background queue.
 *
 *   - `--dryrun` / `--explain` → `{ phase: 'dispatch',
 *                                   action: 'replace',
 *                                   with: 'explain-plan' }`
 *     Resolve + validate, then dump the plan instead of running.
 *
 *   - `--force` → `{ phase: 'confirm-prompt', action: 'skip' }`
 *
 *   - `--quiet` → `{ phase: 'emit-scene', action: 'skip' }`
 *
 * Most of the phases above don't have hookable implementations
 * yet — they're named placeholders the YAML schema accepts and the
 * dispatcher throws against until the matching substrate ships.
 * The vocabulary is documented up-front so feature work lands by
 * filling phases in, not by inventing new schema fields.
 *
 * This file is data + types only. No registry, no Api class. The
 * dispatcher consults this taxonomy directly.
 */

/**
 * Names of the lifecycle phases an option's `effects:` can target.
 *
 * **Implementation status:**
 *  - `focus-update` — hookable. Per-arg focus chain push/replace
 *    fires inside the arg-resolution loop. `skip` is honored.
 *  - `dispatch` — placeholder. Controller execution. `replace`
 *    handlers (`deferred-dispatch`, `explain-plan`) throw at run
 *    time until the substrate lands.
 *  - `validate`, `confirm-prompt`, `emit-scene` — placeholders.
 *    Schema validates against the name; the dispatcher throws if
 *    a player command actually triggers a phase that hasn't been
 *    made hookable yet (e.g. `--force` reaching the unimplemented
 *    `confirm-prompt` phase).
 *
 * Adding a phase to this list documents new vocabulary; the
 * dispatcher only honors effects against phases its code path
 * has actually instrumented.
 */
export const COMMAND_PHASES = [
  'focus-update',
  'validate',
  'confirm-prompt',
  'dispatch',
  'emit-scene',
] as const;

export type CommandPhase = (typeof COMMAND_PHASES)[number];

/**
 * Subset of `COMMAND_PHASES` whose dispatcher path currently honors
 * effects. Used by the dispatcher's effect-consultation helper to
 * throw a clear error when content reaches for a phase that's
 * schema-valid but not yet wired through to runtime behavior.
 *
 * Adding a phase here is the substrate-side completion signal —
 * the dispatcher's phase walk consults effects and the runtime
 * honors `skip` / `replace` for that phase.
 */
export const HOOKABLE_PHASES = new Set<CommandPhase>([
  'focus-update',
]);

/**
 * Names of registered `replace` handlers — the value an effect
 * carries in its `with:` slot when `action === 'replace'`.
 *
 * The schema validates that a referenced handler exists in this
 * set; the runtime dispatcher resolves the name to a handler
 * implementation. Adding a handler here documents the vocabulary;
 * a runtime dispatch entry must accompany it for `replace` to
 * actually fire.
 *
 * Today both handler names are placeholders — the vocabulary is
 * documented so authoring conventions stabilize, but any command
 * whose option declares `replace` against them throws at dispatch
 * time. Each becomes real when its substrate ships.
 */
export const REPLACE_HANDLERS = ['deferred-dispatch', 'explain-plan'] as const;

export type ReplaceHandler = (typeof REPLACE_HANDLERS)[number];

/**
 * Subset of `REPLACE_HANDLERS` whose runtime implementation exists.
 * Effects referencing a handler outside this set are schema-valid
 * but throw at dispatch time.
 */
export const IMPLEMENTED_REPLACE_HANDLERS = new Set<ReplaceHandler>([]);

/**
 * The shape an option declares in YAML under `effects:`. Discriminated
 * on `action`; `replace` requires a `with` handler name.
 */
export type PhaseEffect =
  | { phase: CommandPhase; action: 'skip' }
  | { phase: CommandPhase; action: 'replace'; with: ReplaceHandler };

/**
 * Validate that a value parsed from YAML conforms to `PhaseEffect`.
 * Returns null on success, an error message on failure. The
 * dispatcher's load-time validator uses this to reject malformed
 * effects with a single clear message.
 */
export function validatePhaseEffect(value: unknown): string | null {
  if (value === null || typeof value !== 'object') {
    return 'effect must be an object';
  }
  const obj = value as Record<string, unknown>;
  const phase = obj.phase;
  if (typeof phase !== 'string' || !COMMAND_PHASES.includes(phase as CommandPhase)) {
    return `effect phase '${String(phase)}' is not one of ${COMMAND_PHASES.join(', ')}`;
  }
  const action = obj.action;
  if (action === 'skip') {
    if ('with' in obj) {
      return `effect action 'skip' does not accept 'with'`;
    }
    return null;
  }
  if (action === 'replace') {
    const handler = obj.with;
    if (typeof handler !== 'string') {
      return `effect action 'replace' requires a string 'with' handler name`;
    }
    if (!(REPLACE_HANDLERS as readonly string[]).includes(handler)) {
      return (
        `effect 'with' handler '${handler}' is not one of ` +
        REPLACE_HANDLERS.join(', ')
      );
    }
    return null;
  }
  return `effect action must be 'skip' or 'replace' (got '${String(action)}')`;
}

/**
 * Walk the verb's active option-definition map and collect every
 * `PhaseEffect` whose option is truthy on the bound model and whose
 * declared phase matches `phase`.
 *
 * The dispatcher passes its `collectActiveOptionDefs(...)` output as
 * `optionDefs` — that map's keys are already field-keys (`field ??
 * name`), so the lookup against `activeModel` is direct.
 *
 * Truthiness mirrors the prior `skip_focus_when_option` semantics:
 * an option's effects fire when the bound model's value at that
 * field is truthy. Boolean options are the natural fit; other types
 * coerce per JS truthiness.
 */
export function collectPhaseEffects(
  phase: CommandPhase,
  activeModel: Record<string, unknown>,
  optionDefs: Record<string, { effects?: PhaseEffect[] }>,
): PhaseEffect[] {
  const out: PhaseEffect[] = [];
  for (const [fieldName, def] of Object.entries(optionDefs)) {
    const effects = def.effects;
    if (!effects || effects.length === 0) continue;
    if (!activeModel[fieldName]) continue;
    for (const effect of effects) {
      if (effect.phase === phase) out.push(effect);
    }
  }
  return out;
}
