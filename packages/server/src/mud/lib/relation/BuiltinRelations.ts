/**
 * ⭐ The built-in `~` words — the reserved vocabulary every player can type
 * (`~here`, `~inventory`, `~contacts` …): each word, its one-line meaning,
 * and whose it is. One table, two readers: MQL binds each word to its set
 * (`api/mql/relations.ts`, keyed by these names — a word missing there is a
 * compile error), and `which ~` lists them (the which build).
 *
 * `whose`: `anyone` answers for any left side the step applies to;
 * `self` answers only when the left side is the asker.
 *
 * ⚠ Reserved grammar words, owner-vetted — not a row a pack can add.
 */

/** One built-in `~` word. */
export interface BuiltinRelationWord {
  readonly name: string;
  /** The one line `which ~` prints for it. */
  readonly meaning: string;
  readonly whose: 'anyone' | 'self';
}

/** Every built-in word, in the order `which ~` lists them. */
export const BUILTIN_RELATION_WORDS = [
  { name: 'here', meaning: 'the place you stand in', whose: 'anyone' },
  { name: 'inventory', meaning: 'what is carried', whose: 'anyone' },
  { name: 'peers', meaning: 'what stands where you are, and one level into open things there', whose: 'self' },
  { name: 'reachable', meaning: 'everything within reach — carried, standing here, and the place', whose: 'self' },
  { name: 'person', meaning: 'your body and what you wear and hold', whose: 'self' },
  { name: 'horizon', meaning: 'what you can see from here that is not here', whose: 'self' },
  { name: 'buildings', meaning: 'the buildings whose door is at hand from this place', whose: 'anyone' },
  { name: 'contacts', meaning: 'everyone on your contact lists or in your groups who is in the world', whose: 'self' },
  { name: 'it', meaning: 'the thing you last named', whose: 'self' },
  { name: 'them', meaning: 'the things you last named', whose: 'self' },
  { name: 'him', meaning: 'the man you last named', whose: 'self' },
  { name: 'her', meaning: 'the woman you last named', whose: 'self' },
  { name: 'last', meaning: 'what your last query found', whose: 'self' },
] as const satisfies readonly BuiltinRelationWord[];

/** A built-in word's name. */
export type BuiltinRelationName = (typeof BUILTIN_RELATION_WORDS)[number]['name'];
