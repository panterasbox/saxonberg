/**
 * Test fixture brain — records every fire to a `globalThis` log so the
 * engine test can assert wiring / cadence / witness dispatch / re-resolve
 * without a real emission host. Lives at a real `/lib/` path so
 * `StuffApi.resolveExport('/lib/behavior/__tests__/fixtures/probe', 'brain')`
 * resolves it. Presence-gated (default) — used for the presence test.
 *
 * The `??=` guard keeps the shared log across HMR re-evaluation (the
 * `globalThis` slot persists; only the brain module URL is cache-busted).
 */

import type { BrainContext, BrainStatics } from '../../brain';

interface ProbeFire {
  subject: string | null;
  source: string;
}

const g = globalThis as unknown as { __probeFires?: ProbeFire[] };
g.__probeFires ??= [];

export const brain = class {
  static label = 'probe';

  static act(ctx: BrainContext): void {
    (globalThis as unknown as { __probeFires: ProbeFire[] }).__probeFires.push({
      subject: ctx.perceived?.subject?.stuffId ?? null,
      source: ctx.trigger.source,
    });
  }
} satisfies BrainStatics;
