/**
 * Emote — the value shape of a named expressive verb (wave, smile, bow,
 * cry, etc.).
 *
 * NOT a Stuff and, since content-packs wave 2, NOT a persistence
 * `Document` either: an emote is one `documents` row of `kind: 'emote'`
 * (`data` = this shape's `toData()`), installed by the `expression`
 * content pack at `/expression/emotes/<verb>` or minted by an author at
 * `/emotes/<verb>`. The live `SoulCatalogue` Stuff holds the verb→Emote
 * runtime cache, warmed from `DocumentApi.listOfKind('emote')`.
 *
 * Fields:
 *   - `path` — the document's path (the edit/delete address).
 *   - `verb` — canonical lookup key; unique per kind at the collection
 *     level (`{kind, data.verb}`), and the ONLY word that dispatches.
 *   - `searchTerms` — catalogue lookup words (`hi`, `hello` for `greet`),
 *     never dispatched: `;hi` does nothing, `soul search hi` finds greet.
 *     Replaces the retired `aliases` (a second dispatch namespace that
 *     shadowed `AliasMixin`).
 *   - `grammar` — single Liquid template + per-slot kind metadata. See
 *     `EmoteGrammar.ts` for the runtime types.
 *   - `echo` — reserved for the future remote-emote echo layer.
 *   - `emoji` — optional Layer-2 glyph payload.
 *   - `tags` — reactions / classification hook.
 *   - `valence` — signed renown valence.
 */

import type { EmoteGrammar } from './EmoteGrammar';
import type { StoredDocument } from '../document/StoredDocument';

export type EmoteEcho = 'default' | 'always' | 'never';

export class Emote {
  /** The document's path — where `edit` / `delete` write. */
  path: string = '';

  /** Canonical verb word; the one word that dispatches. */
  verb: string = '';

  /** Catalogue lookup words only — never dispatched. */
  searchTerms: string[] = [];

  /** Single Liquid template + per-slot metadata. */
  grammar: EmoteGrammar = { slots: {}, template: '' };

  /** Future remote-emote echo policy. Reserved; not enforced in v1. */
  echo: EmoteEcho = 'default';

  /** Optional single Layer-2 glyph. */
  emoji?: string;

  /** Free-form classification / reactions hook. */
  tags: string[] = [];

  /**
   * Signed renown valence: how this expressive act reads as a *reaction*
   * to another's act — positive = esteem, negative = notoriety, 0 =
   * neutral (the default; most emotes don't move standing). This is the
   * polity's declared value *for the emote*, read by the renown recompute
   * (`SoulApi.all()`), not a central config map.
   */
  valence: number = 0;

  /**
   * Hydrate from a `kind: 'emote'` document. Validates the two required
   * fields (`data.verb`, `data.grammar.template`) so a malformed pack
   * file or document fails loudly at warm, not silently at dispatch;
   * lowercases the verb and the search terms.
   */
  static fromDocument(doc: StoredDocument): Emote {
    const data = doc.getData();
    const e = Emote.fromData(data);
    e.path = doc.getPath();
    return e;
  }

  /** The same validation over a bare `data` object (the pack reader's use). */
  static fromData(data: Record<string, unknown>): Emote {
    if (typeof data.verb !== 'string' || data.verb.length === 0) {
      throw new Error(`Emote: document is missing a string 'verb'`);
    }
    const grammar = data.grammar as EmoteGrammar | undefined;
    if (!grammar || typeof grammar !== 'object' || typeof grammar.template !== 'string') {
      throw new Error(`Emote '${data.verb}' is missing required 'grammar.template'`);
    }
    const e = new Emote();
    e.verb = data.verb.toLowerCase();
    e.searchTerms = stringList(data.searchTerms).map((t) => t.toLowerCase());
    e.grammar = { slots: grammar.slots ?? {}, template: grammar.template };
    const echo = data.echo;
    e.echo = echo === 'always' || echo === 'never' ? echo : 'default';
    if (typeof data.emoji === 'string' && data.emoji.length > 0) e.emoji = data.emoji;
    e.tags = stringList(data.tags);
    e.valence = typeof data.valence === 'number' ? data.valence : 0;
    return e;
  }

  /** The inverse — the `data` the catalogue writes for this emote. */
  toData(): Record<string, unknown> {
    const data: Record<string, unknown> = {
      verb: this.verb,
      grammar: this.grammar,
      echo: this.echo,
      tags: [...this.tags],
      valence: this.valence,
    };
    if (this.searchTerms.length > 0) data.searchTerms = [...this.searchTerms];
    if (this.emoji !== undefined) data.emoji = this.emoji;
    return data;
  }
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}
