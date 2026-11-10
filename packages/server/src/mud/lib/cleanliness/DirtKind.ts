/**
 * DirtKind — one KIND of dirt, as a `dirt` document (cleanliness D2; a
 * document since the path-identity build).
 *
 * What a dirt IS — the word for something carrying it, whether it is a film
 * you wash or a debris you sweep, which cleanser actions lift it, whether
 * hot water sets it, what it smells of — is data under any pack's
 * `content/dirt/`; what depositing and washing DO is `SoilableMixin`'s.
 * ⭐ So a new dirt is a file, under the pack that soils with it
 * (`/trade/mining/dirt/dust`), and nothing in the engine changes.
 *
 * A dirt is named by its PATH everywhere — a deposit is recorded against it,
 * a recipe's `soils[].kind` cites it, and the kernel's own vocabulary is the
 * {@link DirtKinds} constants. Resident by construction (documents D7): a
 * Soilable host loads the kernel's dirt in `onCreate`, its restored deposits
 * through their setters, and a pack soiling with its own kind awaits
 * {@link DirtKind.ensure} in its own act; a sync read is {@link DirtKind.need}.
 */

import { CLEANSER_ACTIONS, type CleanserAction } from '../../platform/idea/Cleanser';
import { Aroma } from '../perception/Aroma';
import { DocumentApi } from '../../api/document';
import { DocumentCache } from '../document/DocumentCache';

/**
 * What a dirt does on a surface — the three things the kernel does
 * something different with. `film` is washed off; `debris` is swept up;
 * a `stain` is a film that can SET (and then answers only to what its
 * row's `setAnswersTo` names).
 */
export const DIRT_FORMS = ['film', 'debris', 'stain'] as const;
export type DirtForm = (typeof DIRT_FORMS)[number];

/** The runtime descriptor the catalogue caches. */
export interface DirtKindDescriptor {
  key: string;
  /** The word a band sentence uses: *bloodied*, *greasy*, *muddy*. */
  adjective: string;
  form: DirtForm;
  /** Which cleanser actions remove it. Water alone always does a little. */
  answersTo: CleanserAction[];
  /** Washing at or above this sets it (blood: 318 K); `null` never sets. */
  setsAboveK: number | null;
  /** What a SET deposit still answers to (blood: `oxidiser` only). */
  setAnswersTo: CleanserAction[];
  /** A strewn absorbent turns this film into debris (blood, grease). */
  absorbedBy: boolean;
  /** What a deposit seeds on a Contaminable host: pathogen → severity. */
  contaminates: Record<string, number>;
  /** Water alone lifts this share per standard wash (mud a lot, grease
   * almost none). */
  waterLifts: number;
  /** ⭐ A dry brushing (or a beating) lifts this share — what is LOOSE:
   * crumbs, ash, flour, dried mud. Grease, sweat and a stain take nothing
   * from a brush. 0 by default. */
  brushLifts: number;
  /** ⭐ What it smells of, and how strongly — OU per unit of load (B57).
   * Sweat, dung, sour milk; `null` for a dirt with no nose (mud, ash). */
  odor: DirtOdor | null;
}

/** A dirt's smell (`DirtKind.odor`). */
export interface DirtOdor {
  /** The aroma's path (`/base-library/aromas/sweat/stale-sweat`). */
  aroma: string;
  /** OU emitted per unit of load. */
  ouPerLoad: number;
}

/** The kernel's own dirt vocabulary, by path — the platform pack's `content/dirt/`. */
export const DirtKinds = {
  ASH: '/platform/dirt/ash',
  BLOOD: '/platform/dirt/blood',
  CRUMBS: '/platform/dirt/crumbs',
  FLOUR: '/platform/dirt/flour',
  GREASE: '/platform/dirt/grease',
  MANURE: '/platform/dirt/manure',
  MILK: '/platform/dirt/milk',
  MUD: '/platform/dirt/mud',
  SOOT: '/platform/dirt/soot',
  SWEAT: '/platform/dirt/sweat',
} as const;

/** Where the kernel's dirt documents live — one prefix read loads them all. */
const KERNEL_DIRT_PREFIX = '/platform/dirt/';

/**
 * The dirt documents, by path — see the module header.
 *
 * @internal the cleanliness substrate's; an author names a path on a row.
 */
export class DirtKind {
  private static memo: DocumentCache<DirtKindDescriptor> | null = null;
  private static kernel: Promise<void> | null = null;
  private static get cache(): DocumentCache<DirtKindDescriptor> {
    // Built on first use: a static built at module load races an import
    // cycle through the document store.
    return (DirtKind.memo ??= new DocumentCache<DirtKindDescriptor>('dirt', async (doc) => {
      const d = DirtKind.fromData(doc.getData(), doc.getPath());
      // Its smell loads with it, so a dirt naming no aroma fails here.
      if (d.odor) await Aroma.ensure(d.odor.aroma);
      return d;
    }));
  }

  /** Validate a dirt document at `path` (the installer's validator too); throws naming what is wrong. */
  public static fromData(data: Record<string, unknown>, path: string): DirtKindDescriptor {
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
    if (odor && !Aroma.isAromaPath(odor.aroma)) why(`odor.aroma '${String(odor.aroma)}' is not an aroma path`);
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

  /** The dirt at `path`, read if it is not resident; throws naming a path with none. */
  public static ensure(path: string): Promise<DirtKindDescriptor> {
    return DirtKind.cache.ensure(path);
  }

  /** The resident dirt at `path`; `DocumentNotResidentError` if whatever soils with it never loaded it. */
  public static need(path: string): DirtKindDescriptor {
    return DirtKind.cache.need(path);
  }

  /** How a dirt reads in a sentence: its path's leaf, hyphens as spaces (`/platform/dirt/blood` → `blood`). */
  public static wordOf(path: string): string {
    return path.slice(path.lastIndexOf('/') + 1).replace(/-/g, ' ');
  }

  /** Whether the dirt at `path` is resident (the kernel's always are, on a Soilable host). */
  public static has(path: string): boolean {
    return DirtKind.cache.has(path);
  }

  /** Keep a dirt (a unit fixture with no store behind it). */
  public static remember(path: string, d: DirtKindDescriptor): DirtKindDescriptor {
    return DirtKind.cache.remember(path, d);
  }

  /**
   * ⭐ The kernel's own dirt vocabulary (`/platform/dirt/*`), loaded once for
   * the process — one prefix read. A Soilable host awaits it in `onCreate`,
   * so the kernel's literal `soil(DirtKinds.SOOT, …)` always finds its kind.
   */
  public static ensureKernel(): Promise<void> {
    if (Object.values(DirtKinds).every((p) => DirtKind.cache.has(p))) return Promise.resolve();
    return (DirtKind.kernel ??= (async () => {
      for (const doc of await DocumentApi.list(KERNEL_DIRT_PREFIX)) {
        if (doc.getKind() === 'dirt') await DirtKind.cache.ensure(doc.getPath());
      }
    })().catch((err: unknown) => {
      DirtKind.kernel = null;
      throw err;
    }));
  }
}
