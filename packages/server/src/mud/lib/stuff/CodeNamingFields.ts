/**
 * CodeNamingFields — the single source of truth for the **direct
 * code-naming fields** on a content template: the `data`/top-level
 * fields that resolve to an executable module export at clone / hydrate
 * / behavior-fire time. Writing one of these is, transitively, "name
 * code to run", so they are wizard-only-writable (see the code-field
 * gate in `TemplateLogic.saveTemplate` and the wizard/protowizard
 * partition in access.md).
 *
 * The transitive reference fields (`adornments[].template`,
 * `exits[].destination`, `props[]`, `cast[]`, `container`, …) are NOT listed
 * here: they name *another template*, which must itself have passed this
 * same gate on its own `class`, so they are closed by construction.
 *
 * ⭐⭐ **`extends` is one of those, and deliberately so.** A parent path
 * resolves to a ROW, not to code — a row that passed this same gate when
 * somebody authored it. It sits one hop further out than `props[]`: the
 * transitive set, not the direct set. That is what makes the mechanism
 * the refusal below has always described possible — *"protowizards author
 * by cloning/customizing wizard-made templates"* — because a class-less
 * child names no code-naming field at all and the delta rule has nothing
 * to refuse. Retargeting `extends` is likewise a content edit: the new
 * parent is vetted too.
 *
 * This vocabulary is also consumed by the drift-guard
 * (`__tests__/codeNamingDriftGuard.test.ts`), which fails if a new
 * module-resolving call site appears without being classified against
 * this set.
  *
 * @internal every caller of this class sits in the `template` subsystem
 * — it is that subsystem's private collaborator, not author surface.
 */
export class CodeNamingFields {
  /**
   * The direct code-naming fields, by their dotted access path on a
   * template. `behaviors[].brain` denotes the brain string on each
   * `data.behaviors[]` entry.
   */
  static readonly FIELDS = [
    "class",
    "hydratorClass",
    "behaviors[].brain",
  ] as const;

  /**
   * Extract the brain strings from a template `data` blob, tolerant of
   * missing/odd shapes. Reads `data.behaviors[].brain`, skipping entries
   * without a non-empty string `brain`.
   */
  static extractBrains(data: unknown): string[] {
    if (!data || typeof data !== "object") return [];
    const behaviors = (data as { behaviors?: unknown }).behaviors;
    if (!Array.isArray(behaviors)) return [];
    const out: string[] = [];
    for (const entry of behaviors) {
      if (entry && typeof entry === "object") {
        const brain = (entry as { brain?: unknown }).brain;
        if (typeof brain === "string" && brain.length > 0) out.push(brain);
      }
    }
    return out;
  }

  /**
   * True iff `candidate` is a sub-multiset of `reference` — every value
   * in `candidate` appears in `reference` at least as many times.
   * Reordering or dropping brains preserves the subset relation;
   * introducing a brain not already present breaks it.
   */
  static isMultisetSubset(
    candidate: readonly string[],
    reference: readonly string[]
  ): boolean {
    const counts = new Map<string, number>();
    for (const v of reference) counts.set(v, (counts.get(v) ?? 0) + 1);
    for (const v of candidate) {
      const n = counts.get(v) ?? 0;
      if (n === 0) return false;
      counts.set(v, n - 1);
    }
    return true;
  }
}
