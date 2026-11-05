/**
 * Edition — the frozen rung of a document.
 *
 * ⭐ **The Document is the source of truth; paper is one way of showing
 * it.** A screen shows a document live; a printed sheet shows what the
 * document said on the day it was run. That day's text is an **edition**:
 * a `kind: 'edition'` document at `<source>/editions/<hash of the pages>`,
 * minted by `DocumentApi.freezeEdition` and read by every sheet bound to
 * it. Five hundred copies are one record; a second run of the same text
 * finds the same edition.
 *
 * This file is the vocabulary the transport and its readers share — the
 * request a printing makes, the pages a document renders to, and what an
 * edition can teach the person who reads it.
 */

/** The directory an edition lives under, inside its source's own branch. */
export const EDITIONS_DIR = 'editions';

/**
 * What reading a page can teach — today, *known-of* a recipe (the
 * menu's rung: reading tells you a thing exists; making it is the deed).
 */
export interface EditionTeaching {
  recipeId: string;
  name: string;
}

/** A document rendered as pages — what a sheet, a book or a screen shows. */
export interface DocumentPages {
  /** A short title: a headline, a recipe's name, a book's label. */
  title: string;
  /** The pages, in order; never empty. */
  pages: string[];
  /** What reading these pages teaches (a recipe's known-of). */
  teaches?: EditionTeaching[];
}

/** What a printing asks `DocumentApi.freezeEdition` to freeze. */
export interface EditionRequest {
  /** The document (or register prefix) this edition was printed from. */
  source: string;
  /** The text AS SET — the forme's set text, misprints and all. */
  pages: string[];
  title?: string;
  teaches?: EditionTeaching[];
  /** A paper that stops meaning anything after a date (a ticket's day). */
  validUntilS?: number;
}

/** A frozen edition, as stored. */
export interface EditionData extends DocumentPages {
  source: string;
  hash: string;
  frozenAtMs: number;
  validUntilS?: number;
}
