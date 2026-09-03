/**
 * check-template-census — D17's invariant: **`templatePath` always
 * resolves to a content row** (residences wave 1).
 *
 * Three clauses:
 *
 *   (a) The string `asTemplatePath` appears nowhere in the kernel's
 *       `src/` or any pack's `src/` — the channel is RETIRED; minted
 *       instance identity rides `asIdentityPath` (the identity axis).
 *   (b) Every template-path-valued FIELD in every pack's domain rows
 *       resolves to a real row: `props:`/`cast:` entries (plain and
 *       `{template, onto}`), `exits.<dir>.destination` +
 *       `exits.<dir>.door`, `adornments`, `stockLines[].itemTemplatePath`,
 *       `prices` keys, `roomTemplate`, `holderPath`, `streetPath`,
 *       `corridorTemplate`, `programmePath`, and floorplan `room`
 *       entries. (`class:` / `hydratorClass:` stay
 *       `check-instanceable-placement`'s — shared reader, no duplicate.)
 *   (c) Every `TemplatePaths` constant in `lib/paths.ts` that names a
 *       singleton *Registry/Catalogue* resolves to a pack row (the six
 *       framework registries ride trivial platform-pack rows; a renamed
 *       row must not leave a constant pointing at nothing).
 *
 * No exemption list, by design: a reference that cannot resolve is a
 * content bug, not a candidate for a list.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { packSources } from './pack-roots';

const EXIT_ON_FINDINGS = true;

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SERVER_ROOT, '../..');
const CONTENT = join(REPO_ROOT, 'packages/content');
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);

/** Kind dirs the template walk never enters (mirrors `nonTemplateDirs`). */
const NON_TEMPLATE_DIRS = new Set([
  'settings', 'subjects', 'descriptor-banks', 'quantity', 'wiki',
  'emotes', 'recipes', 'name-banks', 'blueprints', 'archetypes', 'msh',
]);

interface Finding { clause: string; file: string; detail: string }
const findings: Finding[] = [];

function* walk(dir: string, ext: string, parent = ''): Generator<string> {
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return; }
  for (const e of entries) {
    if (SKIP.has(e) || e.startsWith('.')) continue;
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) {
      // A `cmd` dir holds views unless its parent is `idea` (the one
      // walk rule); kind dirs are enumerated, never guessed.
      if (e === 'cmd' && parent !== 'idea') continue;
      if (NON_TEMPLATE_DIRS.has(e) && dir.endsWith('content')) continue;
      yield* walk(p, ext, e);
    } else if (e.endsWith(ext)) yield p;
  }
}

/** Every domain template row shipped by any pack: path -> file. */
function templateRows(): Map<string, string> {
  const rows = new Map<string, string>();
  if (!existsSync(CONTENT)) return rows;
  for (const pack of readdirSync(CONTENT)) {
    const root = join(CONTENT, pack, 'content');
    if (!existsSync(root)) continue;
    for (const f of walk(root, '.yaml')) {
      const path = '/' + relative(root, f).replace(/\.yaml$/, '').split('\\').join('/');
      rows.set(path, f);
    }
  }
  return rows;
}

// ── clause (a): the retired channel ─────────────────────────────────
function checkRetiredChannel(): void {
  const roots = [join(SERVER_ROOT, 'src')];
  for (const p of packSources()) roots.push(p.srcDir);
  for (const root of roots) {
    for (const f of walk(root, '.ts')) {
      const src = readFileSync(f, 'utf8');
      if (f.endsWith('check-template-census.ts')) continue;
      if (src.includes('asTemplatePath')) {
        findings.push({
          clause: 'a', file: f,
          detail: 'names the retired `asTemplatePath` channel — minted identity rides `asIdentityPath`',
        });
      }
    }
  }
}

// ── clause (b): every template-path field resolves ──────────────────
function isPath(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith('/');
}

export function refsOf(data: Record<string, unknown>): Array<{ field: string; path: string }> {
  const out: Array<{ field: string; path: string }> = [];
  const push = (field: string, v: unknown): void => {
    if (isPath(v)) out.push({ field, path: v });
  };
  // Reference-Idea citations: each names a real row (a biome, a species,
  // a material, a body plan) that the hydrator resolves. They are plain
  // path strings, and censusing them is the whole point of clause (b).
  for (const f of [
    '_biomePath', '_extendsBiomePath', '_speciesPath', '_bodyPlanPath',
    '_parentCladePath', '_materialPath', '_defaultMaterialPath',
  ] as const) {
    push(f, data[f]);
  }

  // ⚠ `props:` and `cast:` — the born-with fields. They were ONE field
  // (`populates:`) until the farming build split them by designation,
  // and this census kept reading the retired name: it went on reporting
  // green while 322 of its 462 field refs quietly stopped being checked,
  // because the field it looked for no longer existed anywhere. A gate
  // that passes by not looking is worse than no gate. If these are ever
  // renamed again, this list is what has to move with them.
  for (const field of ['props', 'cast'] as const) {
    const entries = data[field];
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (isPath(entry)) push(field, entry);
      else if (entry && typeof entry === 'object') {
        push(`${field}.template`, (entry as Record<string, unknown>).template);
        push(`${field}.onto`, (entry as Record<string, unknown>).onto);
      }
    }
  }
  // ⭐ Both this build and the water build found that gap independently
  // and widened this walk in the same commit-week; the merge left two
  // identical loops and this is the survivor. Two walks would have
  // double-counted every born-with ref in the census total.
  /*
   * ⚠⚠ `composition[].materialPath` — the same gap as `props:`/`cast:`
   * above, found the same way. A blend names its constituents by
   * template path and NOTHING checked that they resolve, so `bronze`
   * could name a tin row that did not exist (it named none at all, and
   * silently summed to 0.88). Every read that walks composition —
   * `analyze chemistry`, `containsElementOf`, the flat element map —
   * would have been quietly wrong about what the material IS.
   */
  /*
   * ⭐ `biologicalSource.speciesPath` — a material that says what it
   * came FROM. The field shipped for years with every single row
   * leaving it `null`, so the census had never seen one; the textile
   * build's fibre and dyestuff rows are the first to populate it, and
   * the gate caught them on the same pass — including the fact that
   * the first draft authored a bare path where the field is a
   * `{ speciesPath, tissueType }` composite.
   *
   * ⚠ It matters for the same reason `composition.materialPath` does:
   * a material naming a species that does not exist is a silent lie
   * about what the substance IS, and nothing else checks it.
   */
  const bio = data.biologicalSource;
  if (bio && typeof bio === 'object' && !Array.isArray(bio)) {
    push(
      'biologicalSource.speciesPath',
      (bio as Record<string, unknown>).speciesPath,
    );
  }

  const composition = data.composition;
  if (Array.isArray(composition)) {
    for (const part of composition) {
      if (part && typeof part === 'object') {
        push('composition.materialPath', (part as Record<string, unknown>).materialPath);
      }
    }
  }
  /*
   * ⭐ The deposit's MATERIAL citations. A `Deposit` is a pure-data Idea
   * whose whole content is references: each stratum names its host rock,
   * each zone its ore mineral, and the lode its gangue. They are the
   * numbers `hew` and `analyze ground` resolve, so a rowless one is a
   * face that reads as barren for a reason no author could find.
   */
  const strata = data.stratigraphy;
  if (Array.isArray(strata)) {
    for (const layer of strata) {
      if (layer && typeof layer === 'object') {
        push('stratigraphy.host', (layer as Record<string, unknown>).host);
      }
    }
  }
  const oreZones = data.zones;
  if (Array.isArray(oreZones)) {
    for (const z of oreZones) {
      if (z && typeof z === 'object') {
        push('zones.mineral', (z as Record<string, unknown>).mineral);
      }
    }
  }
  const lode = data.lode;
  if (lode && typeof lode === 'object') {
    push('lode.gangue', (lode as Record<string, unknown>).gangue);
  }
  /*
   * The warren's own citation: the working TYPE it clones per cell.
   *
   * ⚠ `typeRows` is a plain map of kind → path, which clause (d)'s
   * detector does not flag — it looks at scalars and at arrays of
   * objects. Reading it anyway is free, and a type row that resolves to
   * nothing is a `carve` that mints a room from no template.
   */
  const typeRows = data.typeRows;
  if (typeRows && typeof typeRows === 'object' && !Array.isArray(typeRows)) {
    for (const [kind, v] of Object.entries(typeRows as Record<string, unknown>)) {
      push(`typeRows.${kind}`, v);
    }
  }
  const exits = data.exits;
  if (exits && typeof exits === 'object') {
    for (const [dir, spec] of Object.entries(exits as Record<string, unknown>)) {
      if (spec && typeof spec === 'object') {
        push(`exits.${dir}.destination`, (spec as Record<string, unknown>).destination);
        push(`exits.${dir}.door`, (spec as Record<string, unknown>).door);
      }
    }
  }
  const adornments = data.adornments;
  if (Array.isArray(adornments)) for (const a of adornments) push('adornments', a);
  const stockLines = data.stockLines;
  if (Array.isArray(stockLines)) {
    for (const line of stockLines) {
      if (line && typeof line === 'object') {
        push('stockLines.itemTemplatePath', (line as Record<string, unknown>).itemTemplatePath);
      }
    }
  }
  const prices = data.prices;
  if (prices && typeof prices === 'object') {
    for (const key of Object.keys(prices as Record<string, unknown>)) {
      if (key.startsWith('/')) out.push({ field: 'prices', path: key });
    }
  }
  // ⭐ `leesMaterial` / `productMaterial` / `turnedMaterial` arrived with
  // the fermentation build, on a master that had no clause (d) to notice
  // them — so this is the clause's first contact with content it did not
  // grow up beside, and the honest disposition is to READ them rather
  // than ignore them. All three name a real material row (what a ferment
  // becomes, what it throws, and what it becomes if it turns), which is
  // precisely what clause (b) exists to check.
  for (const scalar of [
    'roomTemplate', 'holderPath', 'streetPath', 'corridorTemplate',
    'programmePath', 'purifiedByBoiling',
    'productMaterial', 'leesMaterial', 'turnedMaterial',
    // The mine: the ore row a face yields, the warren that carves, the
    // grid it carves into, and the parcel extent the claim ring covers.
    // ⭐ Flagged by clause (d) on the water merge — the meta-gate doing
    // exactly its job on a build that had not met it yet.
    'oreRow', 'warrenPath', 'zonePath', 'mineExtent', 'aditPath',
    // The zone's ground model, and the collier's three outcomes.
    'deposit', 'charcoalTemplate', 'brandsTemplate', 'ashTemplate',
    'gangueMaterialPath',
  ] as const) {
    push(scalar, data[scalar]);
  }
  const floorplan = data.floorplan;
  if (Array.isArray(floorplan)) {
    for (const roomSpec of floorplan) {
      if (roomSpec && typeof roomSpec === 'object') {
        push('floorplan.room', (roomSpec as Record<string, unknown>).room);
      }
    }
  }
  return out;
}

/**
 * ⭐⭐ **Clause (d): the gate on the gate.**
 *
 * Every `data` key in shipped content whose value is path-shaped must be
 * either READ by `refsOf` or listed here as deliberately ignored.
 *
 * ⚠ This clause exists because clause (b) went blind and stayed green.
 * `populates:` split into `props:`/`cast:` in another build; `refsOf`
 * kept reading the retired name, and the census went on passing while
 * 322 of its 462 field refs quietly stopped being checked — the count
 * was the only symptom, and nothing was watching it. A gate that passes
 * by not looking is worse than no gate at all.
 *
 * So a renamed or newly-introduced path-valued field now FAILS here
 * until somebody decides which it is. Enumerate, never infer.
 */
const IGNORED_PATH_FIELDS: readonly string[] = [
  // Addresses resolve by AddressApi's longest-prefix walk, not by
  // template lookup.
  '_address',
  // A behaviour names a brain MODULE, not a content row.
  'behaviors',
  // A conduit's / a store's served EXTENT is a coverage prefix resolved
  // longest-prefix, exactly like `_address` — not a citation of a row.
  // A served extent very often names ground no single template backs
  // (`/world/terminus` covers a city, not a thing), and an extent that
  // resolves to nothing serves NOTHING rather than everything, so an
  // unresolvable one fails closed and is not the silent hazard this
  // clause exists to catch. See docs/subsystems/watershed.md.
  'extent',
  'servesExtent',
  // ⭐ A mining claim's block names a parcel EXTENT — ground somebody
  // holds title to — and staking one deliberately mints *a title and no
  // room*. That is the whole difference between `stake` and `title buy`:
  // one is a first-come registration over ground, the other is choosing
  // from a catalogue of lots somebody already laid out. So a claim
  // extent naming no row is the NORMAL case, not a dangling reference,
  // and it resolves through `ParcelApi.ownerOf`'s longest-prefix walk
  // exactly like `_address` and `servesExtent` above.
  'claimBlocks',
];

/**
 * Path-valued fields `refsOf` does NOT yet read — the pre-existing tail,
 * listed so that a NEW one fails while these only warn.
 *
 * The `lint:test-content` discipline: **the list only shrinks.** A
 * listed field warns; an unlisted one fails; a listed field that has
 * since become read (or vanished) is stale and fails too. Working an
 * entry off this list means teaching `refsOf` to read it — each is a
 * real template path nothing currently proves resolves.
 */
const UNREAD_PATH_FIELDS: readonly string[] = [
  'businessPath', 'carriedSpellPath', 'charMaterialPath', 'charter',
  'container', 'departments', 'dropDestination', 'effects',
  'feedPath', 'growsIntoPath', 'harvestTemplatePath', 'interiorMaterial',
  'lobbyPath', 'makerId', 'material', 'operatingLocations', 'parLines',
  'parentExtent', 'parentOrganization', 'principal', 'roadTemplate',
  'rosterSlots', 'routes', 'seatIn', 'seats', 'seedTemplatePath',
  'surfaceMaterial', 'teachesSpellPath', 'trapTemplate', 'treasury',
  'warren',
];

function checkPathFieldCoverage(rows: Map<string, string>): void {
  const read = new Set<string>();
  const seen = new Set<string>();
  for (const [, file] of rows) {
    let parsed: Record<string, unknown> | null;
    try { parsed = YAML.parse(readFileSync(file, 'utf8')) as Record<string, unknown> | null; }
    catch { continue; }
    const data = parsed?.data;
    if (!data || typeof data !== 'object') continue;
    const d = data as Record<string, unknown>;
    for (const { field } of refsOf(d)) read.add(field.split('.')[0]!);
    for (const [k, v] of Object.entries(d)) {
      const pathish =
        isPath(v) ||
        (Array.isArray(v) && v.some((e) => isPath(e) ||
          (e && typeof e === 'object' && Object.values(e as object).some(isPath))));
      if (pathish) seen.add(k);
    }
  }
  const unread: string[] = [];
  for (const k of [...seen].sort()) {
    if (read.has(k) || IGNORED_PATH_FIELDS.includes(k)) continue;
    if (UNREAD_PATH_FIELDS.includes(k)) { unread.push(k); continue; }
    findings.push({
      clause: 'd', file: '(content)',
      detail:
        `data.${k} holds template-path-shaped values but refsOf() does ` +
        `not read it. Either teach refsOf to read it, or list it in ` +
        `IGNORED_PATH_FIELDS with the reason. ⚠ If this is a RENAME of a ` +
        `field refsOf used to read, the census has just gone blind on ` +
        `every ref it carried — which is exactly how populates: → ` +
        `props:/cast: cost this gate 322 of its 462 refs while still ` +
        `reporting green.`,
    });
  }
  // Stale entries: listed as unread but now read (or gone from content).
  for (const k of UNREAD_PATH_FIELDS) {
    if (!seen.has(k) || read.has(k)) {
      findings.push({
        clause: 'd', file: '(content)',
        detail:
          `data.${k} is listed in UNREAD_PATH_FIELDS but is now read (or ` +
          `no longer appears in content). Drop it — the list only shrinks.`,
      });
    }
  }
  if (unread.length > 0) {
    console.warn(
      `check-template-census: ${unread.length} path-valued field(s) are ` +
        `not yet censused (warn-only; the list only shrinks): ` +
        `${unread.join(', ')}`,
    );
  }
}

function checkFieldRefs(rows: Map<string, string>): number {
  let checked = 0;
  for (const [, file] of rows) {
    let parsed: Record<string, unknown> | null;
    try { parsed = YAML.parse(readFileSync(file, 'utf8')) as Record<string, unknown> | null; }
    catch { continue; } // malformed YAML is the installer's error, not this gate's
    const data = parsed?.data;
    if (!data || typeof data !== 'object') continue;
    for (const { field, path } of refsOf(data as Record<string, unknown>)) {
      checked += 1;
      if (!rows.has(path)) {
        findings.push({
          clause: 'b', file,
          detail: `${field}: ${path} resolves to no content row`,
        });
      }
    }
  }
  return checked;
}

// ── clause (c): the singleton constants in lib/paths.ts ─────────────
function checkTemplatePathConstants(rows: Map<string, string>): number {
  const src = readFileSync(join(SERVER_ROOT, 'src/mud/lib/paths.ts'), 'utf8');
  const block = src.match(/export const TemplatePaths = \{([\s\S]*?)\n\} as const/);
  if (!block) {
    findings.push({ clause: 'c', file: 'src/mud/lib/paths.ts', detail: 'TemplatePaths block not found' });
    return 0;
  }
  let checked = 0;
  for (const m of block[1]!.matchAll(/:\s*"(\/[^"]+)"/g)) {
    const path = m[1]!;
    const leaf = path.split('/').pop()!;
    if (!/(Registry|Catalogue)$/.test(leaf)) continue;
    checked += 1;
    if (!rows.has(path)) {
      findings.push({
        clause: 'c', file: 'src/mud/lib/paths.ts',
        detail: `TemplatePaths names singleton '${path}' but no pack ships a row there`,
      });
    }
  }
  return checked;
}

/**
 * ── clause (d): a `cast:` entry names an AGENT ────────────────────────
 *
 * ⚠⚠ **`props:`/`cast:` is a DECLARED DESIGNATION with a gate in both
 * directions.** `PopulatesMixin.applyCast` refuses a row that does not
 * resolve to a `Behaved` class — *that is a prop, not cast* — and throws
 * at HYDRATE. When the row carrying the list is in a pack's `boot:`
 * chain, that is a FATAL boot error rather than a warning.
 *
 * Two shipped rows were on the wrong list and the metal-chain build found
 * them by booting: the Registry's deed desk (a counter) and Katie's
 * master ring (a key). Both had comments beside them calling them props;
 * only the YAML disagreed.
 *
 * The check is BRANCH-shaped rather than mixin-shaped, because a script
 * does not import the mudlib: a cast member's class must live on an
 * `agent/` branch. That is not the same predicate `applyCast` uses — a
 * `Behaved` composition is — but it catches the whole observed failure
 * class (things on the people list) with no class loading, and a genuine
 * `Behaved` non-agent would be a design conversation rather than a typo.
 */
/**
 * The `/paths` listed under a row's `cast:` key.
 *
 * ⚠⚠ **This consumes the list ITEMS rather than slicing a block.** The
 * first cut wrote the end of the block as a lookahead `(?=^  \S|\Z)` —
 * and JS has no `\Z`, so `\Z` matched a literal `Z`, the lookahead
 * never fired at end-of-file, and the whole regex FAILED rather than
 * matching short. Every row whose `cast:` was its LAST key went
 * unchecked and the gate passed silently. `check-location-classes` had
 * the identical bug in its exits scan; the fix is the same both times —
 * match a shape that terminates on its own, so there is no end-of-block
 * to get wrong.
 */
export function castRefsOf(text: string): string[] {
  const block = /^ {2}cast:[^\S\n]*\n((?:[^\S\n]+-[^\S\n]*\S+[^\S\n]*\n?)*)/m.exec(
    text,
  );
  if (!block) return [];
  return [...block[1]!.matchAll(/^\s*-\s*(\/\S+)\s*$/gm)].map((m) => m[1]!);
}

function checkCastAreAgents(rows: Map<string, string>): number {
  const classOf = new Map<string, string>();
  for (const [path, file] of rows) {
    const m = /^class:\s*(\S+)\s*$/m.exec(readFileSync(file, 'utf8'));
    if (m) classOf.set(path, m[1]!);
  }
  let checked = 0;
  for (const [, file] of rows) {
    const text = readFileSync(file, 'utf8');
    for (const target of castRefsOf(text)) {
      const cls = classOf.get(target);
      if (cls === undefined) continue; // clause (b) already reports it
      checked += 1;
      if (!/\/agent\//.test(cls)) {
        findings.push({
          clause: 'd', file,
          detail:
            `\`cast:\` names ${target}, whose class ${cls} is not on an ` +
            `agent branch — that is a PROP, not cast. It throws at hydrate ` +
            `(\`PopulatesMixin.applyCast\`); list it under \`props:\`.`,
        });
      }
    }
  }
  return checked;
}

function main(): void {
  const rows = templateRows();
  checkRetiredChannel();
  const fieldRefs = checkFieldRefs(rows);
  checkPathFieldCoverage(rows);
  const constants = checkTemplatePathConstants(rows);
  const castRefs = checkCastAreAgents(rows);

  if (findings.length > 0) {
    console.error(`\n[check-template-census — ERROR] ${findings.length} finding(s):\n`);
    for (const f of findings) {
      console.error(`  (${f.clause}) ${relative(REPO_ROOT, f.file)}: ${f.detail}`);
    }
    if (EXIT_ON_FINDINGS) process.exit(1);
  } else {
    console.log(
      `check-template-census: every templatePath resolves to a row ` +
        `(${rows.size} rows; ${fieldRefs} field refs, ${constants} singleton constants, ` +
        `${castRefs} cast member(s) on agent branches; asTemplatePath retired).`,
    );
  }
}

if (process.argv[1] && /check-template-census\.ts$/.test(process.argv[1])) main();
