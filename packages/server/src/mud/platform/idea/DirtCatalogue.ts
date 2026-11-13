/**
 * DirtCatalogue — the singleton that serves the `dirt` documents (what can
 * soil a thing: `soot`, `blood`, `sweat`, `/trade/mining/dirt/dust`, any
 * pack's `content/dirt/`), reached as `MaterialApi.dirtKinds()`. What a dirt
 * IS: `lib/cleanliness/DirtKind.ts`.
 *
 * ⭐ A dirt is named by its path everywhere and loaded on reach: a Soilable
 * host awaits the kernel's kinds ({@link DirtCatalogue.ensureKernel}) in
 * `onCreate`; a pack's own kind is loaded by the act that lands it; a read
 * loads the dirt's smell with it.
 */

import { DocumentCatalogue } from '../../lib/document/DocumentCatalogue';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';
import { CLEANSER_ACTIONS, type CleanserAction } from '../../lib/cleanliness/Cleanser';
import {
  DIRT_FORMS,
  DirtKinds,
  KERNEL_DIRT_PREFIX,
  type DirtForm,
  type DirtKindDescriptor,
} from '../../lib/cleanliness/DirtKind';
import { AROMA_PATH_SHAPE } from '../../lib/perception/Aroma';
import { PerceptionApi } from '../../api/perception';

export default class DirtCatalogue extends DocumentCatalogue<DirtKindDescriptor> {
  /** A reference catalogue everyone reads (the commons). */
  static boundaryRole: BoundaryRole = 'commons';

  protected readonly kind = 'dirt';

  private kernel: Promise<void> | null = null;

  /** Validate a dirt document at `path` (the installer's validator too); throws naming what is wrong. */
  public parse(data: Record<string, unknown>, path: string): DirtKindDescriptor {
    const why = (r: string): never => {
      throw new Error(`dirt '${path}': ${r}`);
    };
    const form = (data.form ?? 'film') as DirtForm;
    if (!(DIRT_FORMS as readonly string[]).includes(String(form))) {
      why(`form '${String(form)}' is not one of ${DIRT_FORMS.join('|')}`);
    }
    const actions = (v: unknown, field: string): CleanserAction[] => {
      if (!Array.isArray(v)) return [];
      for (const a of v) {
        if (!(CLEANSER_ACTIONS as readonly string[]).includes(String(a))) {
          why(`${field} names '${String(a)}', not one of ${CLEANSER_ACTIONS.join('|')}`);
        }
      }
      return [...(v as CleanserAction[])];
    };
    const contaminates: Record<string, number> = {};
    for (const [k, v] of Object.entries((data.contaminates ?? {}) as Record<string, unknown>)) {
      if (typeof v === 'number' && v > 0) contaminates[k] = Math.min(1, v);
    }
    const unit = (v: unknown, fallback: number): number =>
      typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
    const word = path.slice(path.lastIndexOf('/') + 1);
    const odor = data.odor as { aroma?: unknown; ouPerLoad?: unknown } | null | undefined;
    if (odor && !(typeof odor.aroma === 'string' && AROMA_PATH_SHAPE.test(odor.aroma))) why(`odor.aroma '${String(odor.aroma)}' is not an aroma path`);
    return {
      key: path,
      adjective: typeof data.adjective === 'string' && data.adjective ? data.adjective : word,
      form,
      answersTo: actions(data.answersTo, 'answersTo'),
      setsAboveK:
        typeof data.setsAboveK === 'number' && Number.isFinite(data.setsAboveK) ? data.setsAboveK : null,
      setAnswersTo: actions(data.setAnswersTo, 'setAnswersTo'),
      absorbedBy: data.absorbedBy === true,
      contaminates,
      waterLifts: unit(data.waterLifts, 0.3),
      brushLifts: unit(data.brushLifts, 0),
      odor:
        odor && typeof odor.ouPerLoad === 'number' && odor.ouPerLoad > 0
          ? { aroma: String(odor.aroma), ouPerLoad: odor.ouPerLoad }
          : null,
    };
  }

  /** A dirt's smell loads with it, so a dirt naming no aroma fails here. */
  protected override async afterRead(d: DirtKindDescriptor): Promise<void> {
    if (d.odor) await PerceptionApi.aromas().ensure(d.odor.aroma);
  }

  /** How a dirt reads in a sentence: its path's leaf, hyphens as spaces (`/platform/dirt/blood` → `blood`). */
  public wordOf(path: string): string {
    return path.slice(path.lastIndexOf('/') + 1).replace(/-/g, ' ');
  }

  /**
   * ⭐ The kernel's own dirt vocabulary (`/platform/dirt/*`), loaded once for
   * the process — one prefix read. A Soilable host awaits it in `onCreate`,
   * so the kernel's literal `soil(DirtKinds.SOOT, …)` always finds its kind.
   */
  public ensureKernel(): Promise<void> {
    if (Object.values(DirtKinds).every((p) => this.has(p))) return Promise.resolve();
    return (this.kernel ??= (async () => {
      for (const doc of await (await import('../../api/document')).DocumentApi.list(KERNEL_DIRT_PREFIX)) {
        if (doc.getKind() === 'dirt') await this.ensure(doc.getPath());
      }
    })().catch((err: unknown) => {
      this.kernel = null;
      throw err;
    }));
  }
}
