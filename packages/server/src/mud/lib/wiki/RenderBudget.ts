/**
 * RenderBudget — the hard bounds a single wiki render runs under.
 *
 * A page is **community-authored input that runs a resolver**. Snippets
 * expand to fixpoint, components reach live sources, and both are
 * written by players. Every bound below fails with an inline error
 * rather than a hang, because the failure mode this exists to prevent
 * is not a wrong answer — it is a request that never returns.
 *
 * A value object, constructed per render and carried through the
 * pipeline. **The pipeline charges it; a component only reads it**
 * (D-5): a component is untrusted input's executor, so self-charging
 * would make every bound advisory. `ComponentContext.budget` is typed
 * `Readonly`, and the charge methods are the pipeline's to call.
 *
 * Limits come from `app_settings` (`wiki.render.*`) so they are
 * operator-tunable without a deploy; {@link RenderBudget.DEFAULTS} is
 * the code-side fallback for tests and for a settings row that was
 * never seeded.
 */

import { ScheduleApi, type ScheduleHandle } from '../../api/schedule';

/** The tunable ceilings, all read from `wiki.render.*`. */
export interface RenderLimits {
  /** How deep snippet expansion may nest before it is a cycle in disguise. */
  snippetDepth: number;
  /** How many snippet expansions one render may perform in total. */
  maxSnippets: number;
  /** How many components one render may resolve. */
  maxComponents: number;
  /** How long any single component may take before it is abandoned. */
  componentTimeoutMs: number;
  /** The ceiling on the emitted body, in characters — the expansion bomb. */
  maxOutputChars: number;
}

/**
 * Thrown when a bound is hit. Carries which one, so the inline error
 * names the actual limit rather than saying "too big" — an author who
 * cannot tell which bound they crossed cannot fix the page.
 */
export class RenderBudgetExceeded extends Error {
  public readonly limit: keyof RenderLimits;
  constructor(limit: keyof RenderLimits, detail: string) {
    super(detail);
    this.name = 'RenderBudgetExceeded';
    this.limit = limit;
  }
}

export class RenderBudget {
  /**
   * Code-side fallbacks. Deliberately generous on structure and tight
   * on time: a big article is legitimate, a slow one is a stalled
   * request holding a connection.
   */
  static readonly DEFAULTS: RenderLimits = {
    snippetDepth: 8,
    maxSnippets: 200,
    maxComponents: 100,
    componentTimeoutMs: 2000,
    maxOutputChars: 200_000,
  };

  private readonly limits: RenderLimits;
  private snippets = 0;
  private components = 0;
  private depth = 0;

  constructor(limits?: Partial<RenderLimits>) {
    this.limits = { ...RenderBudget.DEFAULTS, ...(limits ?? {}) };
  }

  /** The ceilings this render is running under. */
  getLimits(): Readonly<RenderLimits> {
    return this.limits;
  }

  /** How many snippet expansions have been performed. */
  getSnippetCount(): number {
    return this.snippets;
  }

  /** How many components have been resolved. */
  getComponentCount(): number {
    return this.components;
  }

  /** The current snippet nesting depth. */
  getDepth(): number {
    return this.depth;
  }

  /** Components still affordable — what a component consults to decide
   *  whether it is worth emitting more work. */
  getRemainingComponents(): number {
    return Math.max(0, this.limits.maxComponents - this.components);
  }

  /**
   * Charge one snippet expansion. Throws {@link RenderBudgetExceeded}
   * past the total cap — which catches the *mutually*-including pair
   * that stays under the depth cap by alternating.
   */
  chargeSnippet(name: string): void {
    this.snippets += 1;
    if (this.snippets > this.limits.maxSnippets) {
      throw new RenderBudgetExceeded(
        'maxSnippets',
        `snippet budget exhausted at {{${name}}} ` +
          `(${this.limits.maxSnippets} expansions)`,
      );
    }
  }

  /** Charge one component resolution. */
  chargeComponent(tag: string): void {
    this.components += 1;
    if (this.components > this.limits.maxComponents) {
      throw new RenderBudgetExceeded(
        'maxComponents',
        `component budget exhausted at <${tag}> ` +
          `(${this.limits.maxComponents} components)`,
      );
    }
  }

  /**
   * Enter one level of snippet nesting. Throws past the depth cap —
   * which is what catches a snippet including *itself*.
   */
  enterDepth(name: string): void {
    this.depth += 1;
    if (this.depth > this.limits.snippetDepth) {
      throw new RenderBudgetExceeded(
        'snippetDepth',
        `snippet nesting too deep at {{${name}}} ` +
          `(limit ${this.limits.snippetDepth})`,
      );
    }
  }

  /** Leave one level of snippet nesting. */
  exitDepth(): void {
    if (this.depth > 0) this.depth -= 1;
  }

  /**
   * Check an intermediate or final body against the output ceiling.
   * Called between stages as well as at the end, so an expansion bomb
   * is stopped while it is inflating rather than after.
   */
  checkOutput(text: string): void {
    if (text.length > this.limits.maxOutputChars) {
      throw new RenderBudgetExceeded(
        'maxOutputChars',
        `render output exceeded ${this.limits.maxOutputChars} characters`,
      );
    }
  }

  /**
   * Run `work` under the per-component timeout. A slow source stalls
   * one widget, never the page.
   *
   * `ScheduleApi.schedule` rather than a bare `setTimeout` per the
   * antipatterns table — the handle is cancelled in `finally`, so a
   * fast component leaves nothing pending.
   *
   * The abandoned promise is deliberately not cancelled: JavaScript
   * has no cancellation, and pretending otherwise would be worse than
   * letting it settle unobserved. What matters is that the *render*
   * stops waiting.
   */
  async withTimeout<T>(tag: string, work: Promise<T>): Promise<T> {
    let handle: ScheduleHandle | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      handle = ScheduleApi.schedule(this.limits.componentTimeoutMs, () =>
        reject(
          new RenderBudgetExceeded(
            'componentTimeoutMs',
            `<${tag}> exceeded ${this.limits.componentTimeoutMs}ms`,
          ),
        ),
      );
    });
    try {
      return await Promise.race([work, timeout]);
    } finally {
      if (handle !== undefined) ScheduleApi.cancel(handle);
    }
  }
}
