// DocumentLogic — the hot-reloadable logic singleton behind DocumentApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { GrammarApi, type NameAnswer } from '../../../api/grammar';
import { ApiLogic } from "../../../lib/stuff/ApiLogic";
import { WorldClockApi } from "../../../api/worldclock";
import { ProseApi } from "../../../api/prose";
import { DefaultCalendar } from "../../../lib/time/DefaultCalendar";
import { Quantity } from "../../../lib/quantity";
import { CallSecurity, Unshadowable } from "../../../lib/security/decorators";
import { SecurityPolicies } from "../../../lib/security/SecurityPolicies";
import { AccessApi } from "../../../api/access";
import { ParcelApi } from "../../../api/parcel";
import { ProvenanceApi } from "../../../api/provenance";
import { ExecutionContextApi } from "../../../api/execution-context";
import {
  StoredDocument,
  type DocumentKeyQuery,
} from "../../../lib/document/StoredDocument";
import { Refusal } from "../../../lib/errors";
import { MixinApi } from "../../../api/mixin";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { Publisher } from "../../../lib/press/Publisher";
import type { Business } from "../Business";
import { RELEASE_DOCUMENT_KIND } from "../../../lib/press/Release";
import { CommandApi } from "../../../api/command";
import type { Registrar } from '../../../lib/document/Registrar';
import type { Berthed } from '../BerthExit';
import { DocumentKind, type FilingTransport } from '../../../lib/document/DocumentKind';
import DocumentKindCatalogue from '../DocumentKindCatalogue';
import { createHash } from 'node:crypto';
import { Release } from '../../../lib/press/Release';
import {
  EDITIONS_DIR,
  type DocumentPages,
  type EditionData,
  type EditionRequest,
  type EditionTeaching,
} from '../../../lib/document/Edition';
import type { ServesDocuments } from '../../../lib/document/DocumentCatalogue';
import { StuffApi } from '../../../api/stuff';

const DocumentApiCallers = SecurityPolicies.FromModule("/api/document#DocumentApi",
);

/* ─────────────────────────── impl ─────────────────────────── */
//
// All logic lives in module-private functions (the `ScriptLogic` /
// `CraftingLogic` precedent), so there are no intra-singleton `this.x()`
// calls to trip the gate.

/**
 * The acting author — transport-agnostic (in-world command-frame giver OR
 * a REST `tagActingAuthor` stamp), the anti-spoof source for the owner of
 * a write (memory: gated-api-actor-from-context). Never a parameter.
 */
function actingAuthor(): Stuff | null {
  return (ExecutionContextApi.getActingAuthor() as Stuff | null) ?? null;
}

/**
 * True when `path` lies in `actor`'s own `/home/<self>/` branch — keyed on
 * the durable-path basename, so an owner owns exactly the subtree the
 * runtime banks under their name (a player's saved scripts, a
 * future dorm's customization).
 *
 * Consumes the shared self-home rule via `ParcelApi.selfHomeOwnerOf` (the
 * property build generalized this base case into the `ownerOf` chain's
 * rung 2 — one `/home/<key>/` rule, kept in one place, not forked). The
 * ownership self-home yields a `player` owner at `/home/<key>`; this
 * actor owns it iff that key is the actor's own. Byte-identical to the
 * former `path.startsWith('/home/${key}/')` check.
 */
function isOwnHomePath(actor: Stuff, path: string): boolean {
  const owner = ParcelApi.selfHomeOwnerOf(path);
  if (!owner || owner.kind !== "player") return false;
  const key = actor.getIdentityPath()?.split("/").filter(Boolean).pop();
  return key !== undefined && owner.templatePath === `/home/${key}`;
}

/**
 * Access-gate a document mutation by path on PARCEL TITLE (content-packs
 * wave 2, D11): an owner always owns their own `/home/<self>/` branch
 * (no broader grant needed); otherwise `AccessApi.canAtPath` resolves
 * the covering title through `ParcelApi.ownerOf` — rung 1 a parcel, rung
 * 2 the self-home, rung 3 the state — and asks that owner's `can()`
 * dispatch. No zone walk, no `core` literal. Returns a denial message,
 * or null when permitted.
 */
async function gateMutation(
  actor: Stuff | null,
  path: string,
): Promise<string | null> {
  // who is acting must be who is named (call-security pass D5)
  AccessApi.requireActor(actor);
  if (actor !== null && isOwnHomePath(actor, path)) return null;
  if (!(await AccessApi.canAtPath(actor, "write-document", path))) {
    return "you don't have permission to write that document";
  }
  return null;
}

async function readImpl(path: string): Promise<StoredDocument | null> {
  return StoredDocument.findByPath(path);
}

/** The upper bound of a path subtree range: every path under `p/` sorts below it. */
const PATH_RANGE_END = '\uffff';

/** The path range a subtree `prefix/…` occupies — served by the unique path index. */
function subtreeRange(prefix: string): { $gte: string; $lt: string } {
  const under = prefix.endsWith('/') ? prefix : `${prefix}/`;
  return { $gte: under, $lt: under + PATH_RANGE_END };
}

/**
 * Every document whose path is `prefix` or lies under `prefix/` — a range
 * over the unique path index, never a collection scan.
 */
async function documentsUnder(prefix: string): Promise<StoredDocument[]> {
  const bare = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
  return StoredDocument.find<StoredDocument>({
    $or: [{ path: bare }, { path: subtreeRange(prefix) }],
  });
}

/**
 * Every document under `prefix` — except a `secret` kind's, which is never
 * listed (a stream token is read by its exact path only).
 */
async function listImpl(prefix: string): Promise<StoredDocument[]> {
  return (await documentsUnder(prefix)).filter((d) => kindNamed(d.getKind())?.isSecret() !== true);
}

async function listOfKindImpl(kind: string): Promise<StoredDocument[]> {
  return StoredDocument.findByKind(kind);
}

/**
 * ⭐ Documents of `kind` found by one key of their catalogue card. One
 * query shape, served by the `{kind, 'keys.$**'}` wildcard index:
 * equality, or an inclusive range, on `keys.<key>`; an ordered read with no
 * bound still constrains the key (`$exists`) so the sort runs on the index
 * (and a document with no value for the key is not returned); a prefix is a
 * path range, never a regex.
 */
async function findByKeyImpl(
  kind: string,
  key: string,
  q: DocumentKeyQuery,
): Promise<StoredDocument[]> {
  const field = `keys.${key}`;
  let cond: unknown;
  if (q.eq !== undefined) {
    cond = q.eq;
  } else {
    const range: Record<string, unknown> = {};
    if (q.min !== undefined) range.$gte = q.min;
    if (q.max !== undefined) range.$lte = q.max;
    cond = Object.keys(range).length > 0 ? range : { $exists: true };
  }
  const query: Record<string, unknown> = { kind, [field]: cond };
  if (q.prefix) query.path = subtreeRange(q.prefix);
  const options: { sort?: Record<string, 1 | -1>; limit?: number } = {};
  if (q.order) options.sort = { [field]: q.order === 'asc' ? 1 : -1 };
  if (q.limit !== undefined) options.limit = q.limit;
  return StoredDocument.find<StoredDocument>(query, options);
}

/**
 * Write a release document **owned by its publisher organization**.
 *
 * ⚠⚠ **This is an ownership bypass by construction, and the only thing
 * keeping it narrow is the shape of its signature plus its gate.**
 * `save` gates on self-home / covering zone / slice-walk, which admits the
 * *parcel owner* — not the comms director. Making every comms director a
 * landowner is obviously wrong, so the press path writes through here
 * instead, the way `PersistableApi` routes capture as the owning
 * principal.
 *
 * Three things keep it honest, and all three are load-bearing:
 *
 *   1. **It takes no caller-supplied owner.** It takes the publisher
 *      organization and derives the owner from it, so there is no
 *      parameter to lie in.
 *   2. **It refuses a path outside that publisher's own feed branch.**
 *      Otherwise a publisher could stamp its ownership anywhere in the
 *      tree.
 *   3. **The `kind` is fixed here, not passed.** It cannot be used to
 *      write anything but a release.
 *
 * The authorization that the caller may publish as this publisher is
 * `mayPublishAs`, in front of this — see `PressLogic`.
 */
/* ───────────────────────── the write funnel ───────────────────────── */

/** Where the kind declarations are served. */
const KIND_CATALOGUE = '/platform/idea/DocumentKindCatalogue';

/** The kind catalogue (resident — `DocumentApi`'s need stands it at boot). */
function kinds(): DocumentKindCatalogue {
  return StuffApi.singletonSync(KIND_CATALOGUE, () => new DocumentKindCatalogue());
}

/** The declared kind named `name`, or null. */
function kindNamed(name: string): DocumentKind | null {
  return kinds().byName(name);
}

/** The resident service that reads `kind`, or null (nothing to forget). */
function residentService(kind: DocumentKind): ServesDocuments | null {
  const by = kind.servedBy();
  if (by === null) return null;
  if (by === KIND_CATALOGUE) return kinds();
  return (StuffApi.findByTemplatePath(by) as unknown as ServesDocuments | undefined) ?? null;
}

/**
 * ⭐ Check one document's MEANING with the service that reads its kind —
 * the resident service, else its class's `parse` read without standing it
 * up (a catalogue that warms in `onCreate` would read the store mid-install;
 * every `parse` reads only its arguments). A logic singleton's service path
 * names the feature (`/platform/idea/api/command`) and its class the logic
 * (`CommandLogic`). Throws the service's error; a kind with no service, or
 * a service with no `parse`, passes.
 */
async function checkMeaningImpl(kind: DocumentKind, data: Record<string, unknown>, path: string): Promise<void> {
  const by = kind.servedBy();
  if (by === null) return;
  let service = residentService(kind);
  if (service === null) {
    let Cls = (await StuffApi.resolveExport(by, 'default')) as { prototype: ServesDocuments } | null;
    if (Cls === null && by.includes('/idea/api/')) {
      const leaf = by.slice(by.lastIndexOf('/') + 1);
      const logic = `${leaf.charAt(0).toUpperCase()}${leaf.slice(1)}Logic`;
      Cls = (await StuffApi.resolveExport(`${by.slice(0, by.lastIndexOf('/'))}/${logic}`, logic)) as {
        prototype: ServesDocuments;
      } | null;
    }
    if (Cls === null) throw new Error(`document kind '${kind.getName()}': its service ${by} resolves to no class`);
    service = Cls.prototype;
  }
  if (service.parse) service.parse(data, path);
}

/**
 * ⭐ A declaration edit the existing documents do not satisfy is refused,
 * naming them (D-A8): every document of the kind must still fit the new
 * `fields:`; a newly `unique` kind must have no word two documents share;
 * and a kind's filing may not change while any document of it exists —
 * they were written by some other path, by definition.
 */
async function vetDeclarationEdit(path: string, data: Record<string, unknown>): Promise<void> {
  const name = path.slice(path.lastIndexOf('/') + 1);
  const next = new DocumentKind(name, data);
  const before = kindNamed(name);
  const docs = await StoredDocument.findByKind(name);
  if (docs.length === 0) return;
  if ((before?.filedBy() ?? null) !== next.filedBy()) {
    throw new Refusal('kind-in-use', {
      kind: name,
      why: `its filing cannot change while ${docs.length} ${name} document(s) exist`,
    });
  }
  const misfits = docs.filter((d) => next.fieldFailures(d.getData()).length > 0).map((d) => d.getPath());
  if (misfits.length > 0) {
    throw new Refusal('kind-in-use', {
      kind: name,
      why: `these documents would not fit it: ${misfits.slice(0, 5).join(', ')}${misfits.length > 5 ? ' …' : ''}`,
    });
  }
  if (next.isUnique()) {
    const seen = new Map<string, string>();
    for (const d of docs) {
      for (const w of next.keywordsOf(d.getPath(), d.getData())) {
        const first = seen.get(w);
        if (first !== undefined && first !== d.getPath()) {
          throw new Refusal('kind-in-use', {
            kind: name,
            why: `'${w}' would name two documents — ${first} and ${d.getPath()}`,
          });
        }
        seen.set(w, d.getPath());
      }
    }
  }
}

/**
 * ⭐ A declaration may not be removed while documents of its kind that no
 * pack shipped exist (filed world state nobody could then write or keep
 * correctly). Shipped documents leave with their pack.
 */
async function vetDeclarationDelete(path: string): Promise<void> {
  const name = path.slice(path.lastIndexOf('/') + 1);
  const filed = await StoredDocument.find<StoredDocument>({ kind: name, sourcePack: { $in: [null] } });
  if (filed.length > 0) {
    throw new Refusal('kind-in-use', {
      kind: name,
      why: `${filed.length} ${name} document(s) no pack shipped still exist (${filed[0]!.getPath()}…)`,
    });
  }
}

/** Who writes: the plain save, or one of the filing transports. */
type WriteBy = 'save' | FilingTransport;

/**
 * ⭐⭐ **The one write.** Every transport keeps its own authority check and
 * path scheme and then calls this — the only code that constructs or saves
 * a `StoredDocument`. In order: the kind is declared (else
 * `document-kind-undeclared`) → the data fits the kind's `fields:` → the
 * kind's service checks its meaning (`parse`) → the card is derived →
 * saved → the service forgets the path (the edit is live on the next read).
 */
async function writeDocument(req: {
  kind: string;
  path: string;
  owner: string;
  data: Record<string, unknown>;
  by: WriteBy;
  /** The stored row, when the transport already read it. */
  existing?: StoredDocument | null;
}): Promise<void> {
  const { path, data } = req;
  const kind = kindNamed(req.kind);
  if (kind === null) throw new Refusal('document-kind-undeclared', { path, kind: req.kind });
  // ⭐ A filed kind is written by its transport and only by it — the plain
  // save refuses (title on the path is not enough to write somebody's herd
  // record); a transport writing a kind it does not file is a defect.
  const filedBy = kind.filedBy();
  if (req.by === 'save') {
    if (filedBy !== null) {
      throw new Refusal('document-filed', { path, kind: kind.getName(), transport: filedBy });
    }
  } else if (filedBy !== req.by) {
    throw new Error(
      `DocumentApi: the ${req.by} transport cannot write a ${kind.getName()} ` +
        `(${filedBy === null ? 'it is not filed' : `it is filed by ${filedBy}`})`,
    );
  }
  const shape = kind.fieldFailures(data);
  if (shape.length > 0) {
    const why = shape.join('; ');
    throw new Refusal('invalid-document', { path, why }, { message: why });
  }
  {
    try {
      await checkMeaningImpl(kind, data, path);
    } catch (err) {
      const why = err instanceof Error ? err.message : String(err);
      throw new Refusal('invalid-document', { path, why }, { message: why, cause: err });
    }
  }
  const existing = req.existing !== undefined ? req.existing : await StoredDocument.findByPath(path);
  // ⭐ A ledger only grows (the constitution's A2): an immutable kind is
  // written once; a growing field keeps every earlier entry.
  const altered = kind.ledgerFailures(existing?.getKind() === kind.getName() ? existing.getData() : null, data);
  if (altered.length > 0) throw new Refusal('ledger-altered', { path, why: altered.join('; ') });
  if (kind.getName() === DocumentKind.BOOTSTRAP_NAME) await vetDeclarationEdit(path, data);
  // ⭐ A `unique` kind's word means one document (an emote, a formation):
  // a second claimant is refused here as at install.
  if (kind.isUnique()) {
    for (const word of kind.keywordsOf(path, data)) {
      const other = (await findByKeyImpl(kind.getName(), 'word', { eq: word, limit: 2 })).find(
        (d) => d.getPath() !== path,
      );
      if (other) {
        const why = `the ${kind.getName()} word '${word}' already names ${other.getPath()}`;
        throw new Refusal('invalid-document', { path, why }, { message: why });
      }
    }
  }
  const doc = existing ?? new StoredDocument();
  doc.path = path;
  doc.owner = req.owner;
  doc.kind = kind.getName();
  doc.data = data;
  doc.keys = kind.cardOf(path, data);
  await doc.save();
  await residentService(kind)?.forget([path]);
  // A declaration is read back at once — every later write asks it.
  if (kind.getName() === DocumentKind.BOOTSTRAP_NAME) await kinds().ensure(path);
}

async function saveReleaseImpl(
  publisher: Stuff & Publisher,
  path: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (!MixinApi.isPublisher(publisher)) {
    throw new Error(
      "DocumentApi.saveRelease: the owner must be a publisher organization",
    );
  }
  const owner = publisher.getTemplatePath() ?? "";
  if (owner.length === 0) {
    throw new Error(
      "DocumentApi.saveRelease: the publisher has no durable path to own by",
    );
  }
  const feed = publisher.getFeedPath();
  if (feed.length === 0 || !path.startsWith(`${feed}/`)) {
    throw new Error(
      `DocumentApi.saveRelease: ${path} is not under ${owner}'s feed ` +
        `(${feed || "unauthored"})`,
    );
  }

  await writeDocument({ kind: RELEASE_DOCUMENT_KIND, path, owner: owner, data: data, by: 'release' });

  // Authorship is still the acting author's, keyed on the path — the
  // publisher owns the document, a person wrote it. DocumentLogic is an
  // admitted authoring transport (the `recordAuthoring` gate names
  // `/platform/idea/api/document`).
  await ProvenanceApi.recordAuthoring({ path });
}


/**
 * Write a document **owned by a Business** rather than by the acting
 * author — `saveReleaseImpl`'s twin, built to the same rails.
 *
 * ⚠⚠ **The second ownership bypass in this file**, and it exists for the
 * same reason as the first: `save` gates on parcel title, which admits
 * the *landowner*. A bill of lading is issued by a **clerk** on behalf of
 * a **carrier**, and making every clerk a landowner is precisely the
 * error `saveReleaseImpl`'s comment names. Titling each carrier an extent
 * does not work either — it works for the proprietor and fails for every
 * employee, and a player-run carrier cannot be given a group.
 *
 * Three rails, all load-bearing and all structural:
 *
 *   1. **No caller-supplied owner.** It takes the `Business` and derives
 *      the owner from its own durable path.
 *   2. **The path must lie under that business's own branch.** A carrier
 *      cannot stamp its ownership anywhere else in the tree — and this is
 *      also what makes a depot's records cover *exactly* what it handled,
 *      read by prefix (logistics D12/AC17).
 *   3. **The `kind` must be declared `filed: business`.**
 *
 * ⚠ Deliberately **no caller-module allowlist**, unlike `saveRelease`.
 * The callers are pack registries — the haulage trade's today, a second
 * trade's tomorrow — and a `FromModule` list here would be a kernel edit
 * every such pack needs, which the standing rule forbids (*a pack must
 * never need a kernel list edit*). The three rails above are the
 * containment; the caller list would have added friction to TypeScript,
 * which is already root.
 */
async function saveAsBusinessImpl(
  business: Stuff & Business,
  path: string,
  kind: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (!MixinApi.isBusiness(business)) {
    throw new Error(
      'DocumentApi.saveAsBusiness: the owner must be a Business',
    );
  }
  const owner = business.getTemplatePath() ?? '';
  if (owner.length === 0) {
    throw new Error(
      'DocumentApi.saveAsBusiness: the business has no durable path to own by',
    );
  }
  if (!path.startsWith(`${owner}/`)) {
    throw new Error(
      `DocumentApi.saveAsBusiness: ${path} is not under ${owner}'s own branch`,
    );
  }
  if (kindNamed(kind)?.filedBy() !== 'business') {
    throw new Error(`DocumentApi.saveAsBusiness: '${kind}' is not a business-filed kind (filed: business)`);
  }

  await writeDocument({ kind: kind, path, owner: owner, data: data, by: 'business' });

  // Authorship is the acting author's, keyed on the path — the carrier
  // owns the paper, a person (or an NPC clerk) wrote it. Same split as
  // the release path.
  await ProvenanceApi.recordAuthoring({ path });
}

/**
 * The papers directory every instrument files under (the `instrument`
 * kind's `contentDir`).
 */
const PAPERS_DIR = 'papers';

/**
 * The branch a contract party's papers live under: a member's is their
 * own `/home/<key>` (the record store the runtime banks under their
 * name); a Business's or an Organization's is its own durable path.
 */
function papersBranchOf(partyKey: string): string {
  if (partyKey.startsWith('/platform/agent/Avatar/')) {
    const key = partyKey.split('/').filter(Boolean).pop() ?? '';
    return key ? `/home/${key}` : '';
  }
  return partyKey;
}

/**
 * ⚠⚠ **The instrument transport — the fourth ownership bypass** (with
 * `saveRelease`, `saveToRegister`, `saveAsBusiness`), economic bootstrap
 * D10. Files the readable paper behind a claim on `contracts` — the
 * Arrival Note, a loan, an unclaimed-property claim — under EACH PARTY'S
 * OWN branch, owned by that party, written by the machine.
 *
 * Why a bypass: the Note is written at `embody confirm` for a member the
 * machine is standing in for; a loan files under both the borrower's and
 * the lender's branches in one act; a discharge appends a line under a
 * player's home when a WAGE lands (the acting author is the payroll, not
 * the player); an escheat writes under an absentee who is not here.
 * `save`'s gate — the acting author owns the branch — is the wrong
 * question for every one of them.
 *
 * Its rails, all structural: **no caller-supplied owner** (derived from
 * the party's key by the one `/home/<key>` rule), **the path must lie
 * under that party's `papers/`**, **the `kind` is pinned** to
 * `instrument`, and it is **gated to one calling module** — the contract
 * logic, which is the one writer of `contracts` and therefore the only
 * thing that knows a claim exists to paper.
 */
async function saveInstrumentImpl(
  partyKey: string,
  path: string,
  data: Record<string, unknown>,
): Promise<void> {
  const owner = papersBranchOf(partyKey);
  if (owner.length === 0) {
    throw new Error('DocumentApi.saveInstrument: the party has no branch to file under');
  }
  if (!path.startsWith(`${owner}/${PAPERS_DIR}/`)) {
    throw new Error(
      `DocumentApi.saveInstrument: ${path} is not under ${owner}/${PAPERS_DIR}/`,
    );
  }
  await writeDocument({ kind: 'instrument', path, owner: owner, data: data, by: 'instrument' });
}

/** The directory a player's maps live under, inside their own home. */
const MAPS_DIR = 'map';

/** The `/home/<key>` branch an identity path owns. */
function homeBranchOf(ownerKey: string): string {
  const key = ownerKey.split('/').filter(Boolean).pop() ?? '';
  return key ? `/home/${key}` : '';
}

/**
 * ⚠⚠ **The map transport** — the fifth ownership bypass, and the only
 * one whose reason is the EXECUTION CONTEXT rather than the filing.
 *
 * A map is written when a player perceives a place, and arrival
 * auto-senses through `self.forceCommand('sense')`.
 * `getActingAuthor()` answers **null** inside a forced frame, so the
 * ordinary context gate would reach `canAtPath(null, …)` and fail
 * closed for the single most important write this kind has. The owner
 * is therefore derived from the viewer key the caller already holds.
 *
 * Rails, all structural: no caller-supplied owner, the path pinned
 * under that player's own `/home/<key>/map/`, the `kind` pinned, and
 * the Api face gated to `NavigationLogic`.
 */
async function saveMapImpl(
  ownerKey: string,
  localityAddress: string,
  data: Record<string, unknown>,
): Promise<void> {
  const owner = homeBranchOf(ownerKey);
  if (owner.length === 0) {
    throw new Error('DocumentApi.saveMap: no home branch to file under');
  }
  const locality = localityAddress.replace(/^\/+|\/+$/g, '');
  if (locality.length === 0) {
    throw new Error('DocumentApi.saveMap: no locality to file under');
  }
  const path = `${owner}/${MAPS_DIR}/${locality}`;
  await writeDocument({ kind: 'map', path, owner: owner, data: data, by: 'map' });
}

/** The branch every stream token lives under (the platform pack's root
 *  joined to the `stream-token` kind's content dir). */
const STREAM_TOKENS_BRANCH = '/platform/stream-tokens';

/** The document kind a stream token is stored as. */
const STREAM_TOKEN_KIND = 'stream-token';

/** A token's document path — `null` for anything that is not a sha256 hex. */
function streamTokenPath(hash: string): string | null {
  return /^[0-9a-f]{64}$/.test(hash) ? `${STREAM_TOKENS_BRANCH}/${hash}` : null;
}

/**
 * ⚠⚠ **The stream-token transport** (broadcast-ready D4) — the token
 * registry, writing its own book, and nothing else.
 *
 * A token names a player, and the WS upgrade has only the raw token: it
 * hashes it and READS the path. So the record cannot live on the player's
 * own branch (a path keyed by the player is unfindable from the token),
 * and no player may hold the pen on `/platform/stream-tokens/` (they could
 * mint a record naming somebody else). Rails, all structural: the Api face
 * is gated to `StreamLogic`, the path is pinned to a sha256 hex under the
 * branch, the kind is pinned, and the record's fields are taken typed.
 */
async function saveStreamTokenImpl(
  hash: string,
  record: { playerId: string; scope: string; issuedAt: number },
): Promise<void> {
  const path = streamTokenPath(hash);
  if (!path) throw new Error('DocumentApi.saveStreamToken: not a sha256 hex');
  if (record.playerId.length === 0) throw new Error('DocumentApi.saveStreamToken: no player');
  await writeDocument({ kind: STREAM_TOKEN_KIND, path, owner: STREAM_TOKENS_BRANCH, data: { playerId: record.playerId, scope: record.scope, issuedAt: record.issuedAt }, by: 'stream-token' });
}

/** Revoke a token by its hash. Returns whether a record existed. */
async function deleteStreamTokenImpl(hash: string): Promise<boolean> {
  const path = streamTokenPath(hash);
  if (!path) return false;
  const doc = await StoredDocument.findByPath(path);
  if (!doc || doc.getKind() !== STREAM_TOKEN_KIND) return false;
  await doc.delete();
  return true;
}

/** The branch every landing's berth roll lives under. */
const BERTHS_BRANCH = '/platform/berths';

/** The document kind a berth roll is stored under. */
const BERTH_ROLL_KIND = 'berth-roll';

/** A landing's roll, by its path — `null` for a path that names no landing. */
function berthRollPath(landingPath: string): string | null {
  const landing = landingPath.replace(/\/+$/, '');
  return landing.startsWith('/') && landing.length > 1 ? `${BERTHS_BRANCH}${landing}` : null;
}

/** The handles on a stored roll. */
function handlesOf(doc: StoredDocument | null): string[] {
  const lying = doc?.getData().lying;
  return Array.isArray(lying) ? lying.filter((h): h is string => typeof h === 'string' && h !== '') : [];
}

/**
 * The writes to each landing's roll, chained — two ships making fast at one
 * quay in one tick each read-modify-write the same document, and the second
 * must read the first's line. A cache of in-flight promises, never state.
 */
const berthWrites = new Map<string, Promise<void>>();

/**
 * ⚠⚠ **The berth transport** — a ship's own line on a landing's roll.
 *
 * Rails, all structural: the Api face admits only the ship writing for
 * herself; the handle is hers (durable handle, else her row); whether she
 * lies there is READ off her (`getBerth()`), never taken from the caller;
 * the path and the kind are pinned; the owner is the landing.
 */
async function saveBerthImpl(ship: Stuff & Berthed, landingPath: string): Promise<void> {
  const path = berthRollPath(landingPath);
  const handle = ship.getDurableHandle() ?? ship.getTemplatePath();
  if (path === null || !handle) {
    throw new Error(`DocumentApi.saveBerth: no roll for '${landingPath}' or no handle to write on it`);
  }
  const landing = landingPath.replace(/\/+$/, '');
  const lies = ship.getBerth() === landing;
  const write = async (): Promise<void> => {
    const doc = await StoredDocument.findByPath(path);
    const was = handlesOf(doc);
    const has = was.includes(handle);
    if (has === lies) return;
    if (doc === null && !lies) return;
    await writeDocument({
      kind: BERTH_ROLL_KIND,
      path,
      owner: landing,
      data: { lying: lies ? [...was, handle] : was.filter((h) => h !== handle) },
      by: 'berth',
      existing: doc,
    });
  };
  const prior = berthWrites.get(path) ?? Promise.resolve();
  const mine = prior.catch(() => undefined).then(write);
  berthWrites.set(path, mine);
  try {
    await mine;
  } finally {
    if (berthWrites.get(path) === mine) berthWrites.delete(path);
  }
}

/** A landing's roll, read. */
async function berthRollOfImpl(landingPath: string): Promise<string[]> {
  const path = berthRollPath(landingPath);
  return path === null ? [] : handlesOf(await StoredDocument.findByPath(path));
}

/**
 * One player's maps under a locality prefix — theirs only.
 *
 * ⭐ A prefix read with NO JOIN is the whole reason the address keeps
 * its slashes in the path: the address tree nests, so `map terminus`
 * is every map filed under Terminus and nothing else.
 */
async function readMapsImpl(
  ownerKey: string,
  localityPrefix: string,
): Promise<Array<{ path: string; data: Record<string, unknown> }>> {
  const owner = homeBranchOf(ownerKey);
  if (owner.length === 0) return [];
  const prefix = localityPrefix.replace(/^\/+|\/+$/g, '');
  const base = prefix.length > 0
    ? `${owner}/${MAPS_DIR}/${prefix}`
    : `${owner}/${MAPS_DIR}`;
  const rows = await documentsUnder(base);
  return rows
    .filter((d) => d.kind === 'map')
    .map((d) => ({ path: d.path, data: d.data as Record<string, unknown> }));
}

/**
 * Write a **herd** document, owned by the ranching trade's own branch.
 *
 * ⚠⚠ **An ownership bypass by construction**, and — exactly as
 * `saveRelease` is — narrow only because of the shape of its signature
 * plus its gate. `save` gates on self-home / covering title, which
 * admits the *branch owner*; the herdbook's whole point is that its
 * subject is **not** the branch owner:
 *
 * > **You file; you do not hold the pen.**
 *
 * A keeper must be able to draft a head out and turn it back in — which
 * writes the record — while remaining unable to rewrite what the record
 * SAYS about their animals. Routing those writes through a pinned
 * transport is how that is arranged, and it is the same arrangement the
 * press path makes for a comms director who is not a landowner.
 *
 * Four things keep it honest, and all four are load-bearing:
 *
 *   1. **It takes no owner.** The owner is the registry branch, fixed
 *      here, so there is no parameter to lie in.
 *   2. **It refuses a path outside the register.** A caller cannot stamp
 *      the trade's ownership anywhere else in the tree.
 *   3. **The `kind` is pinned here, not passed.** It cannot write
 *      anything but a herd.
 *   4. **The caller is gated to the registry singleton itself**, which
 *      is where the validation of what a legitimate herd looks like
 *      lives.
 *
 * ⚠ The kernel names a pack path in that gate, which is ordinarily the
 * tell of a mis-cut. It is not one here: a document KIND is a platform
 * act by construction (its consumer is code and the installer needs a
 * go-live hook), and naming the one consumer alongside the kind it was
 * declared for is the same act, not a second one. `lint:gates` resolves
 * the string, so a rename cannot silently orphan it.
 */
/**
 * ⚠⚠ **Everything this refuses, it refuses structurally.** No allowlist,
 * no pack name: the branch, the owner and the kind all come off the
 * register, and the register may only administer a branch it lives under.
 */
async function saveToRegisterImpl(
  register: Stuff & Registrar,
  path: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (!MixinApi.isRegistrar(register)) {
    throw new Error('DocumentApi.saveToRegister: that is not a register');
  }
  const owner = register.getRegisterOwner();
  const prefix = register.getRegisterPrefix();
  const kind = register.getRegisterKind();
  const seat = register.getTemplatePath() ?? '';

  if (owner.length === 0 || prefix.length === 0 || kind.length === 0) {
    throw new Error(
      'DocumentApi.saveToRegister: the register declares no branch, owner or kind',
    );
  }
  // ⭐⭐ **A register keeps its OWN book.** The owner has to be a branch
  // the register itself sits under, or a class could declare itself
  // registrar of somebody's home directory and file over it.
  if (seat !== owner && !seat.startsWith(`${owner}/`)) {
    throw new Error(
      `DocumentApi.saveToRegister: ${seat} does not sit under ${owner}, ` +
        'so it does not keep that branch\'s book',
    );
  }
  if (prefix !== owner && !prefix.startsWith(`${owner}/`)) {
    throw new Error(
      `DocumentApi.saveToRegister: ${prefix} is not under ${owner}`,
    );
  }
  if (!path.startsWith(`${prefix}/`)) {
    throw new Error(`DocumentApi.saveToRegister: ${path} is not in ${prefix}`);
  }
  // ⚠ The kind is pinned to the register's one kind, and must be a kind
  // the platform knows — a register cannot invent a vocabulary.
  if (kindNamed(kind)?.filedBy() !== 'register') {
    throw new Error(`DocumentApi.saveToRegister: ${kind} is not a register-filed kind (filed: register)`);
  }

  await writeDocument({ kind: kind, path, owner: owner, data: data, by: 'register' });
}

async function saveImpl(
  path: string,
  kind: string,
  data: Record<string, unknown>,
): Promise<void> {
  const actor = actingAuthor();
  const denial = await gateMutation(actor, path);
  if (denial !== null) throw new Refusal("document-access-denied", { path }, { message: denial });
  // ⭐ The funnel refuses an undeclared kind, a shape the kind's `fields:`
  // refuses, and a meaning its service's `parse` refuses — the installer's
  // own check, so a row a pack could not ship is not stored by a save
  // either. ⛔ A command view that NAMES code (its `controller:`) is content
  // (wizard-axis D5): title over the path decided it above.
  const existing = await StoredDocument.findByPath(path);

  // Persist (find-or-create). Owner = the acting author's durable path.
  await writeDocument({ kind: kind, path, owner: actor?.getIdentityPath() ?? "", data: data, by: 'save', existing });

  // Authorship — append a provenance row keyed on the path (author from
  // context, never a param). DocumentLogic is an admitted authoring
  // transport (the `recordAuthoring` gate names `/platform/idea/api/document`).
  await ProvenanceApi.recordAuthoring({ path });
}

/**
 * The catalogue serving `kind` — its declaration's `catalogued.by`, when
 * that service is resident. A catalogue nothing has stood up holds nothing
 * to forget; a kind read by path alone has none.
 */
function catalogueForImpl(kind: string): ServesDocuments | null {
  const declared = kindNamed(kind);
  if (declared === null) return null;
  const by = declared.servedBy();
  if (by === KIND_CATALOGUE) return kinds();
  return by ? ((StuffApi.findByTemplatePath(by) as unknown as ServesDocuments | undefined) ?? null) : null;
}

async function deleteImpl(path: string): Promise<boolean> {
  const actor = actingAuthor();
  const denial = await gateMutation(actor, path);
  if (denial !== null) throw new Refusal("document-access-denied", { path }, { message: denial });
  const doc = await StoredDocument.findByPath(path);
  if (!doc) return false;
  const kind = doc.kind;
  if (kind === DocumentKind.BOOTSTRAP_NAME) await vetDeclarationDelete(path);
  await doc.delete();
  await catalogueForImpl(kind)?.forget([path]);
  return true;
}

/* ─────────────────────────── paper ─────────────────────────── */

/**
 * A document's date in words — the world's calendar for a game-time kind,
 * the real calendar for an out-of-character one — or '' when undated.
 */
function dateWords(kind: DocumentKind, data: Record<string, unknown>): string {
  const at = kind.dateOf(data);
  if (at === null) return '';
  if (kind.dated()?.unit === 'real-ms') return new Date(at).toISOString().slice(0, 10);
  return DefaultCalendar.singleton().formatDate(Quantity.of(at, 's'));
}

/** One line of a record a register lists — its title, and its date when dated. */
function summaryLine(doc: StoredDocument): string {
  const kind = kindNamed(doc.getKind());
  const title = kind ? kind.titleOf(doc.getPath(), doc.getData()) : doc.getPath().split('/').pop() ?? '';
  const when = kind ? dateWords(kind, doc.getData()) : '';
  return when ? `${title} — ${when}` : title;
}

/** The five entities a prose render escapes, decoded: a page is plain text. */
function plainText(markup: string): string {
  return markup
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/** A page break inside a paper template's output. */
const PAGE_BREAK = /<page\/>/;

/**
 * ⭐ Render a stored document as pages, from its kind's declaration: a
 * `secret` kind is never paper (`null`); a kind with a `paper.template`
 * renders it (Liquid, over the document's data plus `title`, `date`,
 * `path`, `owner` and `owner_leaf`; `<page/>` breaks a page); anything else
 * prints its summary line — title and date. A document carrying `teaches`
 * (an edition) or a `recipeId` (a recipe) teaches it when read.
 */
async function pagesOfImpl(path: string): Promise<DocumentPages | null> {
  const doc = await StoredDocument.findByPath(path);
  if (doc === null) return null;
  const kind = kindNamed(doc.getKind());
  if (kind === null || kind.isSecret()) return null;
  const data = doc.getData();
  const title = kind.titleOf(path, data);
  const template = kind.paperTemplate();
  let pages: string[];
  if (template !== null) {
    const owner = doc.getOwner();
    const rendered = plainText(
      ProseApi.renderCompiled(ProseApi.compile(template), {
        ...data,
        title,
        date: dateWords(kind, data),
        path,
        owner,
        owner_leaf: owner.split('/').filter(Boolean).pop() ?? '',
      }),
    );
    pages = rendered.split(PAGE_BREAK).map((p) => p.trim()).filter((p) => p !== '');
  } else {
    pages = [summaryLine(doc)];
  }
  if (pages.length === 0) return null;
  const teaches = Array.isArray(data.teaches)
    ? (data.teaches as EditionTeaching[])
    : typeof data.recipeId === 'string' && data.recipeId !== ''
      ? [{ recipeId: data.recipeId, name: title }]
      : undefined;
  return { title, pages, ...(teaches ? { teaches } : {}) };
}

/**
 * ⭐ Freeze a printing — the edition transport. Rails, all structural
 * (`saveAsBusiness`'s posture — its callers span the kernel and the
 * printing pack, so a module allowlist would be a kernel list every
 * printing trade needs): the **path is pinned** to
 * `<source>/editions/<hash of the pages>`, the **kind is pinned**, the
 * **owner is derived** from the source (its document's owner, or the
 * owner of the records under a register prefix) and never supplied, and a
 * second freeze of the same pages finds the same edition. Throws on a
 * source that names nothing — the caller checks first.
 */
async function freezeEditionImpl(req: EditionRequest): Promise<string> {
  const source = req.source.replace(/\/+$/, '');
  if (source.length === 0 || req.pages.length === 0) {
    throw new TypeError('DocumentApi.freezeEdition: a source and at least one page');
  }
  const sourceDoc = await StoredDocument.findByPath(source);
  const owner =
    sourceDoc?.getOwner() ??
    (await documentsUnder(`${source}/`)).find((d) => d.getOwner() !== '')?.getOwner() ??
    '';
  if (owner === '') {
    throw new TypeError(`DocumentApi.freezeEdition: ${source} names no document to print from`);
  }
  const hash = createHash('sha1').update(JSON.stringify(req.pages)).digest('hex').slice(0, 16);
  const path = `${source}/${EDITIONS_DIR}/${hash}`;
  if ((await StoredDocument.findByPath(path)) !== null) return path;
  const data: EditionData = {
    source,
    hash,
    title: req.title ?? source.split('/').filter(Boolean).pop() ?? 'a paper',
    pages: [...req.pages],
    frozenAtS: WorldClockApi.getNow().rawValue(),
    ...(req.teaches && req.teaches.length > 0 ? { teaches: req.teaches } : {}),
    ...(req.validUntilS !== undefined ? { validUntilS: req.validUntilS } : {}),
  };
  await writeDocument({ kind: 'edition', path, owner: owner, data: data as unknown as Record<string, unknown>, by: 'edition' });
  return path;
}

/**
 * ⭐ The document `reader` may CALL UP by a word: the newest
 * standing release whose headline or publisher answers to it (an in-game
 * reader is a member — `members` and `public` both read; the press room's
 * `public` filter is the anonymous web's), else a paper of the reader's own
 * whose title does. Never a search of anyone else's papers.
 */
/** How many of the newest releases `callUp` searches by word. */
const CALL_UP_RELEASE_WINDOW = 200;

async function callUpImpl(reader: Stuff, word: string): Promise<{ path: string; title: string } | null> {
  if (word.trim() === '') return null;
  // ⭐ Named by the one rule (naming overhaul D-C5 rule 3), never a
  // substring: a release answers to its headline and its press; newest
  // first over a bounded page, so a word several share calls up the most
  // recent (a tie in date order).
  const releases = (await findByKeyImpl(RELEASE_DOCUMENT_KIND, 'date', {
    order: 'desc',
    limit: CALL_UP_RELEASE_WINDOW,
  }))
    .map((d) => Release.fromDocument(d))
    .filter((r) => !r.isRetracted() && Release.publishedByOwner(r))
    .sort((a, b) => b.getPublishedAt() - a.getPublishedAt());
  const firstOf = <T>(a: NameAnswer<T>): T | null => (a.kind === 'one' ? a.one : a.kind === 'tie' ? a.tie[0]! : null);
  const release = firstOf(
    GrammarApi.name(
      word,
      releases.map((r) => ({
        value: r,
        keywords: [r.getHeadline().toLowerCase(), r.owner.toLowerCase()],
        title: r.getHeadline(),
      })),
    ),
  );
  if (release !== null) return { path: release.getPath(), title: `"${release.getHeadline()}"` };
  const key = (reader.getIdentityPath() ?? '').split('/').filter(Boolean).pop() ?? '';
  if (key === '') return null;
  const mine: Array<{ path: string; title: string }> = [];
  for (const d of await documentsUnder(`/home/${key}/`)) {
    const pages = await pagesOfImpl(d.getPath());
    if (pages !== null) mine.push({ path: d.getPath(), title: pages.title });
  }
  return firstOf(GrammarApi.name(word, mine.map((m) => ({ value: m, keywords: [m.title.toLowerCase()], title: m.title }))));
}

/**
 * DocumentLogic — the hot-reloadable logic singleton behind
 * {@link DocumentApi}.
 *
 * Lives at `/platform/idea/api/document` (a stateless `Stuff` singleton, no backing
 * `Template`); `DocumentApi`'s statics forward here via
 * `StuffApi.singletonSync`. All store logic lives in module-private
 * functions, so there are no intra-singleton `this.x()` calls to trip the
 * gate. Each public method carries the `FromModule` gate.
 *
 * @internal
 */
@Unshadowable
export class DocumentLogic extends ApiLogic {
  /** See {@link DocumentApi.checkMeaning}. */
  @CallSecurity(DocumentApiCallers)
  public checkMeaning(kind: DocumentKind, data: Record<string, unknown>, path: string): Promise<void> {
    return checkMeaningImpl(kind, data, path);
  }

  /** See {@link DocumentApi.read}. */
  @CallSecurity(DocumentApiCallers)
  public async read(path: string): Promise<StoredDocument | null> {
    return readImpl(path);
  }

  /** See {@link DocumentApi.list}. */
  @CallSecurity(DocumentApiCallers)
  public async list(prefix: string): Promise<StoredDocument[]> {
    return listImpl(prefix);
  }

  /** See {@link DocumentApi.catalogueFor}. */
  @CallSecurity(DocumentApiCallers)
  public catalogueFor(kind: string): ServesDocuments | null {
    return catalogueForImpl(kind);
  }

  /** See {@link DocumentApi.listOfKind}. */
  @CallSecurity(DocumentApiCallers)
  public async listOfKind(kind: string): Promise<StoredDocument[]> {
    return listOfKindImpl(kind);
  }

  /** See {@link DocumentApi.findByKey}. */
  @CallSecurity(DocumentApiCallers)
  public async findByKey(
    kind: string,
    key: string,
    q: DocumentKeyQuery = {},
  ): Promise<StoredDocument[]> {
    return findByKeyImpl(kind, key, q);
  }

  /**
   * See {@link DocumentApi.saveRelease}. ⚠⚠ This is the ownership bypass.
   * The narrowing that matters lives on the **Api static** — every logic
   * method's caller is its own face, so a policy here would name
   * `DocumentApi` and narrow nothing.
   */
  @CallSecurity(DocumentApiCallers)
  public async saveRelease(
    publisher: Stuff & Publisher,
    path: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    return saveReleaseImpl(publisher, path, data);
  }

  /**
   * See {@link DocumentApi.saveToRegister}. ⚠⚠ One of the three
   * ownership bypasses (`saveRelease`, `saveAsBusiness`, this), and the
   * narrowing lives on the **Api static** for `saveRelease`'s reason
   * exactly.
   */
  @CallSecurity(DocumentApiCallers)
  public async saveToRegister(
    register: Stuff & Registrar,
    path: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    return saveToRegisterImpl(register, path, data);
  }

  /**
   * See {@link DocumentApi.saveAsBusiness}. ⚠⚠ One of the three
   * ownership bypasses; its own three rails are in `saveAsBusinessImpl`.
   */
  @CallSecurity(DocumentApiCallers)
  public async saveAsBusiness(
    business: Stuff & Business,
    path: string,
    kind: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    return saveAsBusinessImpl(business, path, kind, data);
  }

  /** See {@link DocumentApi.saveMap}. Rails in `saveMapImpl`. */
  @CallSecurity(DocumentApiCallers)
  public async saveMap(
    ownerKey: string,
    localityAddress: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    return saveMapImpl(ownerKey, localityAddress, data);
  }

  /** See {@link DocumentApi.readMaps}. */
  @CallSecurity(DocumentApiCallers)
  public async readMaps(
    ownerKey: string,
    localityPrefix: string,
  ): Promise<Array<{ path: string; data: Record<string, unknown> }>> {
    return readMapsImpl(ownerKey, localityPrefix);
  }

  /** See {@link DocumentApi.saveStreamToken}. Rails in `saveStreamTokenImpl`. */
  @CallSecurity(DocumentApiCallers)
  public async saveStreamToken(
    hash: string,
    record: { playerId: string; scope: string; issuedAt: number },
  ): Promise<void> {
    return saveStreamTokenImpl(hash, record);
  }

  /** See {@link DocumentApi.deleteStreamToken}. */
  @CallSecurity(DocumentApiCallers)
  public async deleteStreamToken(hash: string): Promise<boolean> {
    return deleteStreamTokenImpl(hash);
  }

  /** See {@link DocumentApi.saveBerth}. Rails in `saveBerthImpl`. */
  @CallSecurity(DocumentApiCallers)
  public async saveBerth(ship: Stuff & Berthed, landingPath: string): Promise<void> {
    return saveBerthImpl(ship, landingPath);
  }

  /** See {@link DocumentApi.berthRollOf}. */
  @CallSecurity(DocumentApiCallers)
  public async berthRollOf(landingPath: string): Promise<string[]> {
    return berthRollOfImpl(landingPath);
  }

  /** See {@link DocumentApi.saveInstrument}. Rails in `saveInstrumentImpl`. */
  @CallSecurity(DocumentApiCallers)
  public async saveInstrument(
    partyKey: string,
    path: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    return saveInstrumentImpl(partyKey, path, data);
  }

  /** See {@link DocumentApi.pagesOf}. */
  @CallSecurity(DocumentApiCallers)
  public async pagesOf(path: string): Promise<DocumentPages | null> {
    return pagesOfImpl(path);
  }

  /** See {@link DocumentApi.callUp}. */
  @CallSecurity(DocumentApiCallers)
  public async callUp(reader: Stuff, word: string): Promise<{ path: string; title: string } | null> {
    // who is acting must be who is named (call-security pass D5)
    AccessApi.requireActor(reader);
    return callUpImpl(reader, word);
  }

  /** See {@link DocumentApi.freezeEdition}. Rails in `freezeEditionImpl`. */
  @CallSecurity(DocumentApiCallers)
  public async freezeEdition(req: EditionRequest): Promise<string> {
    return freezeEditionImpl(req);
  }

  /** See {@link DocumentApi.save}. */
  @CallSecurity(DocumentApiCallers)
  public async save(
    path: string,
    kind: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    return saveImpl(path, kind, data);
  }

  /** See {@link DocumentApi.delete}. */
  @CallSecurity(DocumentApiCallers)
  public async delete(path: string): Promise<boolean> {
    return deleteImpl(path);
  }
}
