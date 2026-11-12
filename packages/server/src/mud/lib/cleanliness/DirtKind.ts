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

import type { CleanserAction } from './Cleanser';

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
/** Where the kernel's own dirt kinds live. */
export const KERNEL_DIRT_PREFIX = '/platform/dirt/';
