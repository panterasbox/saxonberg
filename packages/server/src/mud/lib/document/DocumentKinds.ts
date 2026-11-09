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
 * Imports nothing — the reset policy and the schema generator read it
 * statically. A document's PATH is its only identity (no kind carries a
 * second name); a kind's `keys` and `words` are how it is FOUND otherwise.
 */

/** What the installer does when a kind's file vanishes from its pack. */
export type DocumentVanishPolicy = 'delete' | 'archive' | 'keep';

/** A value a document's catalogue card may hold — what one index can order and compare. */
export type DocumentKeyValue = string | number | boolean | Array<string | number>;

/** The slice of a document a key derivation reads: its identity and its body. */
export interface DocumentKeySource {
  path: string;
  data: Record<string, unknown>;
}

/**
 * How a kind derives one key of its card. `undefined` means *this document
 * has no value for that key* — it is left off the card, so the index holds
 * nothing for it.
 */
export type DocumentKeyDerivation = (doc: DocumentKeySource) => DocumentKeyValue | undefined;

export interface DocumentKindSpec {
  /** The `kind` string stored on the row. */
  kind: string;
  /**
   * ⭐ The **catalogue card**: the keys every document of this kind can be
   * found by besides its path, each DERIVED from the document's own data —
   * never authored, so it can never drift from the value it repeats.
   * `StoredDocument.cardOf` writes them to the row's `keys`; one wildcard
   * index (`{kind, 'keys.$**'}`) serves equality, a range and an order on
   * any of them, whatever the kind's shape. A key nobody reads is a
   * declaration to delete. Absent ⇒ an empty card.
   */
  keys?: Readonly<Record<string, DocumentKeyDerivation>>;
  /**
   * The **typed words** of a kind a player names by a word (`smile`,
   * `carve stool`). Stored on the card as `keys.word`; a word means one
   * thing, so a second pack claiming one is refused at install, naming
   * both (`PackLogic` `wordFailures`, `lint:typed-words`). Absent ⇒ the
   * kind's documents are named by path only.
   */
  words?: (doc: DocumentKeySource) => string[];
  /** The pack subdir the kind's files live under (`emotes`). */
  contentDir: string;
  /** File extension the reader accepts. */
  ext: 'yaml' | 'msh' | 'md';
  onVanish: DocumentVanishPolicy;
}

/** The last segment of a document's path — the word a typed-word kind is named by. */
const leafWord = (doc: DocumentKeySource): string[] => {
  const leaf = doc.path.slice(doc.path.lastIndexOf('/') + 1);
  return leaf ? [leaf] : [];
};

/** A recipe's `outputTemplate` — `recipeFor(output)` reads it. */
const recipeOutput: DocumentKeyDerivation = (doc) =>
  typeof doc.data.outputTemplate === 'string' ? doc.data.outputTemplate : undefined;

/** A release's publication instant (epoch-ms) — the press reads newest first by it. */
const releasePublishedAt: DocumentKeyDerivation = (doc) =>
  typeof doc.data.publishedAt === 'number' ? doc.data.publishedAt : undefined;

/** Whether a release is pinned — the ticker reads its pins by it. */
const releasePinned: DocumentKeyDerivation = (doc) => doc.data.pinned === true;

/** A release's id — the press loads one by it (a permalink, a retraction). */
const releaseIdOf: DocumentKeyDerivation = (doc) =>
  typeof doc.data.releaseId === 'string' && doc.data.releaseId !== ''
    ? doc.data.releaseId
    : undefined;

export const DOCUMENT_KINDS = {
  /**
   * `msh` scripts — the language's name is the kind (was `'script'`
   * before wave 2; a boot migration renames the rows once). The stored
   * value is the source text verbatim in `data.source`.
   */
  msh: { kind: 'msh', contentDir: 'msh', ext: 'msh', onVanish: 'delete' },
  /** Press-owned; no pack ships one this wave. */
  release: { kind: 'release', keys: { publishedAt: releasePublishedAt, pinned: releasePinned, releaseId: releaseIdOf }, contentDir: 'releases', ext: 'yaml', onVanish: 'delete' },
  emote: { kind: 'emote', words: leafWord, contentDir: 'emotes', ext: 'yaml', onVanish: 'delete' },
  /**
   * An aroma: what a nose can read, with its threshold, the discipline that
   * trains a nose to it, its hedonic curve and its `parent:` in the tree. Named
   * by its path (`/base-library/aromas/smoke`) like every document, and read by
   * that path when something names it (`lib/perception/Aroma.ts`). Authored
   * metadata: nothing writes one.
   */
  aroma: { kind: 'aroma', contentDir: 'aromas', ext: 'yaml', onVanish: 'delete' },
  recipe: { kind: 'recipe', words: leafWord, keys: { output: recipeOutput }, contentDir: 'recipes', ext: 'yaml', onVanish: 'delete' },
  /**
   * A **pump mechanism** — how a displacement machine moves its fluid, and
   * whether it `pulls` (and so meets the atmosphere's wall). Authored
   * metadata a pump cites by path (`lib/pump/PumpMechanism.ts`).
   */
  'pump-mechanism': { kind: 'pump-mechanism', contentDir: 'pump-mechanisms', ext: 'yaml', onVanish: 'delete' },
  'name-bank': { kind: 'name-bank', contentDir: 'name-banks', ext: 'yaml', onVanish: 'delete' },
  blueprint: { kind: 'blueprint', contentDir: 'blueprints', ext: 'yaml', onVanish: 'delete' },
  'command-view': { kind: 'command-view', contentDir: 'cmd', ext: 'yaml', onVanish: 'delete' },
  /** The venue archetype — an industry's floor in capabilities (content-packs A13/A14). */
  archetype: { kind: 'archetype', words: leafWord, contentDir: 'archetypes', ext: 'yaml', onVanish: 'delete' },
  /**
   * A **water right** — a volume per window plus a priority date.
   *
   * ⚠ Runtime-written, like `release`: rights are filed by claimants
   * over the life of a world, not shipped by a pack. Path-keyed
   * (`/system/water/rights/<course>/<node>/<id>`) because seniority is
   * `list(prefix)` plus a sort on the priority date, which wants the
   * reach in the path rather than in an index.
   *
   * `onVanish: 'keep'` and NOT `'delete'`: a right is a record of
   * something that happened, and no absent file should be able to erase
   * one. `release`'s `delete` is safe only because nothing files a
   * release from a pack either; here the stakes of getting it wrong are
   * somebody's water.
   *
   * The KIND is the platform's (a pack cannot declare one — the kind's
   * consumer is code and the installer needs its go-live hook); the
   * validated save that decides what a legitimate right looks like is
   * the water pack's.
   */
  'water-right': { kind: 'water-right', contentDir: 'water-rights', ext: 'yaml', onVanish: 'keep' },
  /**
   * A **map** — one player's knowledge of one locality: the places they
   * have been, and the edges they used (location-graph B3).
   *
   * ⭐⭐ **It is a CLAIM, not a view.** The server's own knowledge of the
   * world's shape lives in `location_graph`, and **the two never join**:
   * a map is written from what the player perceived, and nothing
   * reconciles it against the truth afterwards. ⭐ **Rot is the
   * feature** — wall up an exit somebody has walked and their map still
   * shows it until they next look, at which point both claims render and
   * the disagreement is visible. A map that corrected itself behind
   * your back would be the server telling you what you know.
   *
   * One document per `(player, finest covering locality)`, at
   * `/home/<key>/map/<locality address>`. ⭐ The address keeps its
   * slashes, so a coarser read is a PREFIX read with no join
   * (`map terminus` lists every map under it) — and copying one
   * locality's map hands over nothing about any other.
   *
   * A map has no card: it is not named by its content; it is named by
   * whose it is and where it is of.
   *
   * ⚠ `onVanish: 'keep'`, for `water-right`'s reason exactly: a map is a
   * record of where somebody went, and no absent pack file should be
   * able to erase one. The nightly reset keeps every declared kind, so
   * both axes are satisfied — walk somewhere, let the reset run, and the
   * map still says you were there.
   *
   * The KIND is the platform's and so is the writer: unlike a water
   * right, nothing authors a map by hand. It is written by the
   * perception seams and read by one verb.
   */
  map: { kind: 'map', contentDir: 'maps', ext: 'yaml', onVanish: 'keep' },
  /**
   * A **herd** — a register naming these head, this composition, this
   * age structure, on this ground (farmstead D20).
   *
   * ⭐⭐ **A record about you lives on a branch titled to somebody
   * else.** The path is `/trade/ranching/herds/<…>`, titled to the
   * ranching trade's own group, and that is the **security requirement
   * rather than a filing convenience**:
   *
   * > **You file; you do not hold the pen.**
   *
   * ⚠ Two obvious homes are refused for the same reason. `/home/<self>`
   * gives an owner their whole home branch with no broader grant, so the
   * subject could rewrite their own pedigree — and D79 makes the
   * herdbook a **sales document**, which is the lemons fraud with the
   * engine supplying the pen. The owning **parcel** is the same hole one
   * step out. This bug class was closed once already in this repo (land
   * use lives in the gated `parcels` collection rather than on the zone
   * template, because *"a content author could rezone their own land"*)
   * and must not be reopened.
   *
   * ⭐ It is also historically exact. Real herdbooks are kept by **breed
   * societies**, not by the animals' owners — Coates's Herd Book, 1822,
   * worked because it was independent of the men selling the bulls. The
   * record is trustworthy *because* its subject cannot edit it, which is
   * the same sentence as the security requirement.
   *
   * `onVanish: 'keep'`, and for `water-right`'s reason exactly: a herd
   * is a record of something that happened, and no absent file should be
   * able to erase one.
   *
   * The KIND is the platform's (a pack cannot declare one — its consumer
   * is code and the installer needs a go-live hook); what a legitimate
   * herd looks like is the ranching pack's.
   */
  herd: { kind: 'herd', contentDir: 'herds', ext: 'yaml', onVanish: 'keep' },
  /**
   * A **fishery** — what a reach has been drawn down by, and when it was
   * last reconciled (fishing D1). Everything else about a reach's fish —
   * which species, how many at full — DERIVES from the species'
   * habitats and the water the catalogue reports, so the record holds
   * only what cannot: the draw.
   *
   * ⚠ Runtime-written, on the `water-right` pattern: no pack ships one;
   * the water pack's register get-or-creates it on the first draw.
   * Path-keyed (`/system/water/fisheries/<course>/<node>`) because a
   * basin's book is `list(prefix)`. `onVanish: 'keep'` for the herd's
   * reason: it is a record of what happened to a reach, and no absent
   * file may restock a river.
   *
   * The KIND is the platform's; what a legitimate record looks like is
   * the water pack's (`FisheryRegistry`).
   */
  fishery: { kind: 'fishery', contentDir: 'fisheries', ext: 'yaml', onVanish: 'keep' },
  /**
   * A **fluid body's withdrawal** — how many litres have come out of one
   * reservoir, and by whose straw (drilling D2).
   *
   * ⭐⭐ **It is keyed on the BODY and not on the hole, and that is the
   * whole point of it.** A reservoir spans whatever holdings happen to
   * lie over it, so two bores into one body are *two straws in one
   * glass*; if withdrawal lived on each wellhead, each would think the
   * glass full. Remaining is the body's capacity less the **sum** of
   * every straw, which is why two owners who have never met watch the
   * same gauge fall — the fact a polity has to be able to argue about.
   *
   * Everything that can derive does: capacity is the body's authored pin
   * or its geometry and is **never stored**, so no copy of a record can
   * outlive an edit to the row. ⚠ Recharge is **zero** — not a missing
   * leg but depletion, the degenerate case of a recharge law, and the
   * reason an oil country is a boom with an end in it.
   *
   * ⚠ Runtime-written, on the `fishery` pattern and for its reasons: no
   * pack ships one; the ground pack's register get-or-creates it on the
   * first draw. Path-keyed
   * (`/system/ground/bodies/<locality address>/<body key>`) because a
   * country's book is `list(prefix)`. `onVanish: 'keep'` — it is a
   * record of what was taken out of the ground, and no absent pack file
   * may refill a reservoir.
   *
   * The KIND is the platform's; what a legitimate record looks like is
   * the ground pack's (`BodyRegister`).
   */
  body: { kind: 'body', contentDir: 'bodies', ext: 'yaml', onVanish: 'keep' },
  /**
   * A **bore log** — what one hole went through, metre by metre, and
   * what was found at the bottom of it (drilling D4).
   *
   * ⭐⭐ **You file; you do not hold the pen.** The log is the TRADE's,
   * not the driller's: every metre is appended by the swing that cut it,
   * nothing in the game rewrites an entry, and a driller who dislikes
   * what the ground said cannot unsay it. That is what makes a second
   * owner's survey worth reading — the herdbook's rule
   * ([ranching.md](../../../../../docs/subsystems/ranching.md)) applied
   * to the ground.
   *
   * ⭐ **`fluid: null` is a FINDING, not a missing value.** A dry metre
   * is the single most valuable row in the book, because the one thing
   * no instrument in this game reports is whether a trap is CHARGED — so
   * the only evidence a dry trap is dry is somebody's wasted payroll,
   * written down. A log that recorded only successes would delete the
   * trade's whole epistemics.
   *
   * ⚠ Runtime-written, on the `body` pattern and for its reasons: no
   * pack ships one; the drilling pack's register get-or-creates it at
   * the siting. Path-keyed (`/trade/drilling/bores/<...>`) because a
   * country's drilling history is `list(prefix)`. `onVanish: 'keep'` —
   * a plugged well's log is still a record of what is under that ground,
   * and the hole being gone is exactly when the log matters most.
   *
   * The KIND is the platform's; what a legitimate entry looks like is
   * the drilling pack's (`BoreRegistry`).
   */
  bore: { kind: 'bore', contentDir: 'bores', ext: 'yaml', onVanish: 'keep' },
  /**
   * A **bill of lading** — what, how much, from where, to where, whose,
   * and at what declared value, filed by a completed carriage.
   *
   * ⚠ Runtime-written, on the `water-right` pattern and for the same
   * reason: it is *a record of something that happened*, so
   * `onVanish: 'keep'` — no absent file may erase a shipment. Path-keyed
   * under the filing carrier's own branch
   * (`/trade/haulage/<business>/bills-of-lading/<id>`), because a
   * depot's coverage is `list(prefix)` — **its records cover exactly
   * what it handled, structurally**, which is the whole of the market-
   * share reading in logistics D12.
   *
   * ⭐ It is not a reporting feature. It is the paper a carrier needs to
   * prove what they took, and it happens to be the datum every freight
   * statistic in the design reads from.
   */
  'bill-of-lading': { kind: 'bill-of-lading', contentDir: 'bills-of-lading', ext: 'yaml', onVanish: 'keep' },
  /**
   * A **warehouse receipt** — a bailee's acknowledgement that it holds
   * named goods for a named depositor. A document of TITLE: you transfer
   * the receipt instead of moving anything. Runtime-written, path-keyed,
   * `keep` — same three reasons as the bill of lading.
   */
  'warehouse-receipt': { kind: 'warehouse-receipt', contentDir: 'warehouse-receipts', ext: 'yaml', onVanish: 'keep' },
  /**
   * An **instrument** — the readable paper behind a claim on the
   * `contracts` collection: the Arrival Note, a loan, an unclaimed-
   * property claim (economic bootstrap D10). Its terms in words, the
   * contract id, the date, and an appended line when it discharges, is
   * repaid, defaults or is recovered.
   *
   * ⚠ Runtime-written on the `water-right` pattern — a record of
   * something that happened, so `onVanish: 'keep'`. Path-keyed under EACH
   * PARTY'S OWN BRANCH: a member's note at `/home/<key>/papers/…` (the
   * player's own record store — never a Thing carried in inventory, never
   * handed over by anyone in the fiction), a business's loan at
   * `<business>/papers/…`, the Treasury's copy at `/compact/treasury/papers/…`.
   * Written only by the contract logic, as the machine, through
   * `DocumentApi.saveInstrument`. The contract row is the live claim; the
   * paper is what a person reads.
   */
  instrument: { kind: 'instrument', contentDir: 'papers', ext: 'yaml', onVanish: 'keep' },
  /**
   * A **rate card** — a carrier's published charges by route, weight and
   * commodity.
   *
   * ⚠ `keep` rather than `delete` even though a card is *current* rather
   * than historical: rate discrimination is evidence, and a superseded
   * card is exactly the row an antitrust argument needs. Publishing a
   * new one writes a new path; nothing overwrites the old.
   */
  'rate-card': { kind: 'rate-card', contentDir: 'rate-cards', ext: 'yaml', onVanish: 'keep' },
  /**
   * ⭐ An **edition** — what a printing froze: the pages of a document AS
   * SET on the day it was run. The document is the truth;
   * paper is one way of showing it, and the frozen rung is this record.
   *
   * Path-keyed at `<source>/editions/<hash of the pages>`, so a second run
   * of the same text finds the same edition and five hundred copies are
   * one record. Owned by the source's owner. Written only by
   * `DocumentApi.freezeEdition` (the press, the printer, the bearer
   * receipt, the ledger's extract); read by every sheet bound to it, with
   * no title check — whoever holds the paper reads it.
   *
   * `onVanish: 'keep'`: an edition is a record of what was printed, and
   * the source's edit or retraction never reaches it — that is the
   * point of paper.
   */
  edition: { kind: 'edition', contentDir: 'editions', ext: 'yaml', onVanish: 'keep' },
  /**
   * A **ship's register entry** — her name in this register, her kind, her
   * identity, her flag, when she was entered, and the company that owns
   * her (title only — her owners are that company's cap table).
   *
   * ⭐⭐ **You file; you do not hold the pen** — the herd's rule. An entry
   * lives under the GOVERNMENT's own branch
   * (`/platform/ships/<government key>/<name slug>`), written only by its
   * register (`DocumentApi.saveToRegister`), so a shipowner cannot rewrite
   * whose she is. ⭐ The slug IS the uniqueness: a register refuses a
   * second ship of a name because the path is taken; the same name under
   * another flag is another prefix.
   *
   * Pack-shipped AND runtime-written: the authored ships' entries ship in
   * the platform pack (`content/ships/<gov>/<slug>.yaml`); a yard sale
   * files the rest. `onVanish: 'keep'` for the water right's reason: an
   * entry is a record of title, and no absent pack file may erase whose a
   * ship is.
   *
   * The KIND is the platform's; what a legitimate entry looks like is
   * the register's (`ShipRegister`).
   */
  ship: { kind: 'ship', contentDir: 'ships', ext: 'yaml', onVanish: 'keep' },
  /**
   * A **berth roll** — the ships a landing has lying at it, by durable
   * handle, in the order they came. A landing
   * reads its own roll the first time it is used after a restart and
   * stands up every ship on it that is not loaded, so her way aboard
   * comes back.
   *
   * ⭐ The reference points the right way: the landing is never asked to
   * search a register for who lies at it — each ship writes her own line
   * as she makes fast and strikes it as she leaves.
   *
   * ⭐⭐ **Only the ship holds the pen for her line, and she cannot lie
   * with it.** The write (`DocumentApi.saveBerth`) is gated to the ship
   * herself, and it takes no "lying / gone" flag: the store reads whether
   * she is made fast at that landing NOW off the ship and writes that.
   *
   * One document per landing, at `/platform/berths<landing path>` — the
   * landing's path keeps its slashes, so a harbor's berths are a prefix
   * read. Owned by the landing (its path), which is whose list it is.
   *
   * ⚠ Runtime-written, on the `map` pattern: no pack ships one and
   * nothing authors one by hand. `onVanish: 'keep'` for the declared
   * kinds' reason — a night going by must not cast a ship adrift.
   */
  'berth-roll': { kind: 'berth-roll', contentDir: 'berth-rolls', ext: 'yaml', onVanish: 'keep' },
  /**
   * ⭐ A **berth book**'s record — a harbor's lines (berths given, ships
   * alongside, debts with their dues stamped paid) and the last hail each
   * ship was answered. The book on the office desk is where it
   * is kept and read; the RECORD is this document, filed by the harbor
   * itself in its own branch (`DocumentApi.saveToRegister` — *you file;
   * you do not hold the pen*), so burning or losing the book never forgives
   * a debt: the next book reads the record again.
   *
   * One document per harbor, at `<registerPrefix>/record`. Runtime-written;
   * no pack ships one. `onVanish: 'keep'` — a debt outlives a night.
   */
  'berth-book': { kind: 'berth-book', contentDir: 'berth-books', ext: 'yaml', onVanish: 'keep' },
} as const satisfies Record<string, DocumentKindSpec>;

export type DeclaredDocumentKind = keyof typeof DOCUMENT_KINDS;

export const DECLARED_DOCUMENT_KINDS = Object.keys(
  DOCUMENT_KINDS,
) as DeclaredDocumentKind[];
