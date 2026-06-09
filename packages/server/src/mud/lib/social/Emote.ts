/**
 * Emote — catalog record for a named expressive verb (wave, smile, bow,
 * cry, etc.).
 *
 * NOT a Stuff. Authored content lives in MongoDB's `emotes` collection
 * (`Collections.Emotes`); the live `SoulCatalogue` Stuff holds the
 * verb→Emote runtime cache. Loaded once at boot from the seed YAML +
 * any author-minted records, then mutated via `SoulApi.mint / edit /
 * delete`.
 *
 * Storage shape:
 *   - `verb` — canonical lookup key. Unique-indexed.
 *   - `aliases` — narrow exception for true synonyms (usually empty).
 *   - `grammar` — single Liquid template + per-slot kind metadata. See
 *     `EmoteGrammar.ts` for the runtime types.
 *   - `echo` — reserved for the future remote-emote echo layer.
 *   - `emoji` — optional Layer-2 glyph payload.
 *   - `tags` — reactions / classification hook.
 *
 * Per the "scalars and arrays of scalars" persistence rule, `grammar`
 * is the one structured field; the Marshaller escape hatch isn't wired
 * for v1 (the same pragma `AliasMixin.aliases` uses — a structured
 * field stored as-is, accepted on the persistence-track precedent).
 */

import { Document } from '../persistence/Document';
import type { EmoteGrammar } from './EmoteGrammar';

export type EmoteEcho = 'default' | 'always' | 'never';

export class Emote extends Document {
  static collectionName = 'emotes';
  static persistentFields = [
    'verb',
    'aliases',
    'grammar',
    'echo',
    'emoji',
    'tags',
  ];

  /** Canonical verb word; unique-indexed at the collection level. */
  verb: string = '';

  /** Aliases for true synonyms only — discouraged; usually empty. */
  aliases: string[] = [];

  /** Single Liquid template + per-slot metadata. */
  grammar: EmoteGrammar = { slots: {}, template: '' };

  /** Future remote-emote echo policy. Reserved; not enforced in v1. */
  echo: EmoteEcho = 'default';

  /** Optional single Layer-2 glyph. */
  emoji?: string;

  /** Free-form classification / reactions hook. */
  tags: string[] = [];
}
