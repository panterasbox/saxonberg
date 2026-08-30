/**
 * Technique — how a build was worked, and what the working does to it.
 *
 * **The vocabulary is open.** A technique is any non-empty kebab string a
 * tool row names, and its physical effect is that row's own data — the
 * same open-tag contract as {@link ToolCapabilities} and Material's tags.
 * The kernel keeps no list and no effect table: a pack that ships a
 * churn, a whisk or a still-head names the technique on the tool and
 * nothing in the kernel changes (the libations rule — *a pack never needs
 * a kernel LIST edit*).
 *
 * ⭐ **The tool is what knows.** A shaker is what makes a drink shaken,
 * and a shaker is what knows shaking chills ~8 K and folds in ~20 mL of
 * meltwater. Putting those numbers in a kernel table said, wrongly, that
 * `shaken | stirred | built | muddled` is a fact about crafting rather
 * than a fact about bar tools — so a cheese-making pack could not have
 * `pressed` without a kernel MR.
 *
 * The effects are honest numbers, not flavour text: shaking with ice
 * chills harder and dilutes more than stirring, and aerates (cloudy); a
 * built drink is neither chilled nor diluted by the working itself (the
 * ice in the glass does that over time — see
 * `CraftVessel.reconcileThermal`).
 */

/**
 * A technique word. Open by construction — the type is documentation,
 * not a constraint; validation is {@link Techniques.isTechniqueName}.
 */
export type Technique = string;

/** What a technique does to the output at the fill. */
export interface TechniqueEffect {
  /** Kelvin removed from the fill temperature by the working. */
  chillK: number;
  /** Litres of water folded in by the working (dilution). */
  dilutionL: number;
  /** Whether the working folds air in (reads "cloudy"). */
  aerated: boolean;
}

/**
 * A technique as a tool row authors it, inside a capability entry:
 * `capabilities: [{ kind: shaker, technique: { name: shaken, chillK: 8,
 * dilutionL: 0.02, aerated: true } }]`.
 */
export interface TechniqueSpec extends Partial<TechniqueEffect> {
  /** The word stamped on the output (`shaken`, `pressed`, `churned`). */
  name: string;
  /**
   * Higher wins when several reachable tools would each name a working.
   * **The finishing instrument names the drink**: a mojito is muddled
   * then built, a whiskey smash muddled then shaken, so the shaker and
   * the mixing glass outrank the muddler. Default 0.
   */
  priority?: number;
}

/** What a working does when nothing authors one — a built drink. */
const NEUTRAL: TechniqueEffect = { chillK: 0, dilutionL: 0, aerated: false };

/** A technique word + the effect the authoring tool gave it. */
export interface ResolvedTechnique {
  name: Technique;
  effect: TechniqueEffect;
}

/** One instrument's working, with the capability kind that carries it. */
export interface ConferredTechnique {
  kind: string;
  technique: TechniqueSpec;
}

/** Anything that can report the workings its capabilities confer. */
export interface TechniqueSource {
  capabilityTechniques(): readonly ConferredTechnique[];
}

export class Techniques {
  /** The working of a build nothing worked: neither chilled nor diluted. */
  public static readonly BUILT = 'built';

  /** The neutral effect — a built drink, and the fallback everywhere. */
  public static neutral(): TechniqueEffect {
    return { ...NEUTRAL };
  }

  /** A well-formed technique word: a non-empty kebab token. */
  public static isTechniqueName(s: unknown): s is Technique {
    return typeof s === 'string' && /^[a-z][a-z0-9-]*$/.test(s);
  }

  /** Fill a spec's absent numbers with the neutral ones. */
  public static effectOf(spec: TechniqueSpec): TechniqueEffect {
    return {
      chillK: spec.chillK ?? NEUTRAL.chillK,
      dilutionL: spec.dilutionL ?? NEUTRAL.dilutionL,
      aerated: spec.aerated ?? NEUTRAL.aerated,
    };
  }

  /**
   * The working the reachable instruments imply, given what the recipe
   * asked for: `built` with the neutral effect when nothing in reach
   * names one.
   *
   * ⚠ **The recipe's `toolCapabilities` filter the field.** A daiquiri
   * says it needs a shaker; a bar has a shaker AND a mixing glass on the
   * well, and it is still shaken. Only instruments offering a capability
   * the recipe actually required get to name the working — otherwise the
   * furniture in the room would decide, and the same recipe would come
   * out differently in two bars. With no requirement (the hand path's
   * fallback) every reachable instrument is eligible.
   *
   * Among the eligible, highest `priority` wins — the FINISHING
   * instrument names the drink (a whiskey smash is muddled, then
   * shaken). Ties break on gather order: deterministic, and the author's
   * lever is `priority`.
   */
  public static fromTools(
    tools: readonly TechniqueSource[],
    required: readonly string[],
  ): ResolvedTechnique {
    if (required.length === 0) {
      return { name: Techniques.BUILT, effect: Techniques.neutral() };
    }
    let best: TechniqueSpec | null = null;
    for (const tool of tools) {
      for (const { kind, technique } of tool.capabilityTechniques()) {
        if (!required.includes(kind)) continue;
        if (!Techniques.isTechniqueName(technique.name)) continue;
        if (
          best === null ||
          (technique.priority ?? 0) > (best.priority ?? 0)
        ) {
          best = technique;
        }
      }
    }
    return best === null
      ? { name: Techniques.BUILT, effect: Techniques.neutral() }
      : { name: best.name, effect: Techniques.effectOf(best) };
  }

  /**
   * The effect the reachable tools give a technique word the HAND path
   * named (`stir` / `shake` / `muddle` record the word; the numbers still
   * come from the instrument — you cannot shake without a shaker). Falls
   * back to neutral when no reachable tool authors that working.
   */
  public static effectFor(
    name: string | null | undefined,
    tools: readonly TechniqueSource[],
  ): TechniqueEffect {
    if (!name) return Techniques.neutral();
    for (const tool of tools) {
      for (const { technique } of tool.capabilityTechniques()) {
        if (technique.name === name) return Techniques.effectOf(technique);
      }
    }
    return Techniques.neutral();
  }
}
