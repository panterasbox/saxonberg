/**
 * DocumentKinds — the closed vocabulary of **pack-installable document
 * kinds** in the path-addressed `documents` store.
 *
 * The one concept this module defines: which `kind` strings the content
 * installer knows how to read from a pack, where their files live, how
 * they are keyed, and what a vanished file does to its row. The store
 * itself stays kind-agnostic (it never inspects `data`); this table is
 * what turns a `content/<dir>/<file>` into `{ path, kind, data }` and
 * back.
 *
 * ⚠ **Editing this file is a platform act** (content-packs slate A11.5):
 * a pack cannot declare a new kind — the kind's consumer (a catalogue,
 * an engine) is code, and the installer needs the go-live hook for it.
 * A pack that ships a subdir not listed here ships nothing from it.
 * `requires.kinds:` (a pack declaring which kinds it needs the host to
 * know) is wave 3.
 *
 * Deliberately absent: `wiki` (not a document — pages have revisions
 * and a CAS edit path of their own), `settings` and `subject` (contribution
 * kinds with their own target collections; their strategies are
 * hand-written in `PackLogic`).
 *
 * Imports nothing — `PersistenceManager` reads it lazily to build the
 * kind-scoped indexes, and the reset policy reads it statically.
 */

/** What the installer does when a kind's file vanishes from its pack. */
export type DocumentVanishPolicy = 'delete' | 'archive' | 'keep';

export interface DocumentKindSpec {
  /** The `kind` string stored on the row. */
  kind: string;
  /**
   * Dotted field under `data` that is the natural key (`verb`,
   * `recipeId`, `key`, `blueprintId`), or null for a path-keyed kind.
   * Non-null ⇒ the installer adopts by `{kind, 'data.<naturalKey>'}` and
   * the flat-key check covers it; PersistenceManager creates
   * `{kind:1, 'data.<naturalKey>':1}` unique, partial on `kind`.
   */
  naturalKey: string | null;
  /** The pack subdir the kind's files live under (`emotes`). */
  contentDir: string;
  /** File extension the reader accepts. */
  ext: 'yaml' | 'msh' | 'md';
  onVanish: DocumentVanishPolicy;
}

export const DOCUMENT_KINDS = {
  /**
   * `msh` scripts — the language's name is the kind (was `'script'`
   * before wave 2; a boot migration renames the rows once). The stored
   * value is the source text verbatim in `data.source`.
   */
  msh: { kind: 'msh', naturalKey: null, contentDir: 'msh', ext: 'msh', onVanish: 'delete' },
  /** Press-owned; no pack ships one this wave. */
  release: { kind: 'release', naturalKey: null, contentDir: 'releases', ext: 'yaml', onVanish: 'delete' },
  emote: { kind: 'emote', naturalKey: 'verb', contentDir: 'emotes', ext: 'yaml', onVanish: 'delete' },
  recipe: { kind: 'recipe', naturalKey: 'recipeId', contentDir: 'recipes', ext: 'yaml', onVanish: 'delete' },
  'name-bank': { kind: 'name-bank', naturalKey: 'key', contentDir: 'name-banks', ext: 'yaml', onVanish: 'delete' },
  blueprint: { kind: 'blueprint', naturalKey: 'blueprintId', contentDir: 'blueprints', ext: 'yaml', onVanish: 'delete' },
  'command-view': { kind: 'command-view', naturalKey: null, contentDir: 'cmd', ext: 'yaml', onVanish: 'delete' },
  /** The venue archetype — an industry's floor in capabilities (content-packs A13/A14). */
  archetype: { kind: 'archetype', naturalKey: 'archetypeId', contentDir: 'archetypes', ext: 'yaml', onVanish: 'delete' },
} as const satisfies Record<string, DocumentKindSpec>;

export type DeclaredDocumentKind = keyof typeof DOCUMENT_KINDS;

export const DECLARED_DOCUMENT_KINDS = Object.keys(
  DOCUMENT_KINDS,
) as DeclaredDocumentKind[];

/** The kinds that carry a natural key (the flat-key kinds). */
export const FLAT_KEY_DOCUMENT_KINDS: DeclaredDocumentKind[] =
  DECLARED_DOCUMENT_KINDS.filter((k) => DOCUMENT_KINDS[k].naturalKey !== null);
