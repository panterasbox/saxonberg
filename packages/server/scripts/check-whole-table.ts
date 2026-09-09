/**
 * check-whole-table — **an Api may not hand back its table.**
 *
 * The sibling of `check-world-scan`, and the same defect from the other
 * end. That gate stops code reading the whole OBJECT REGISTRY; this one
 * stops code reading a whole COLLECTION out of the thing that owns it
 * and then narrowing at the call site:
 *
 *   BAD    `(await registry.allRecords()).find(r => r.getExtent() === x)`
 *   BAD    `catalogue.allLanes().filter(l => l.nodes.includes(here))`
 *   BAD    `PlayerApi.getAllAvatars()[0]`
 *   GOOD   `registry.recordFor(x)` · `catalogue.lanesAt(here)`
 *
 * ⭐ **The gate is on the CONSUMER, deliberately.** Whether a whole-table
 * read is legitimate depends on the question — a channel broadcast
 * genuinely wants every logged-in avatar, and the wiki's backlink report
 * genuinely wants every page — and no regex can tell those from a lookup
 * wearing a nice name. But `.find` / `.filter` / `[0]` immediately after
 * the read is not ambiguous at all: it says out loud that the caller
 * wanted ONE thing, or a SLICE, and asked for everything.
 *
 * So the definition side stays a review judgment (*does this grow with
 * the world? is it keyed via the execution context rather than by an
 * argument?* — `BankingApi.accountsOf` and `ContractApi.activeClaims`
 * both look unkeyed and are not), and the call side is mechanical.
 *
 * ⚠ **A ratchet at zero, not a census.** The offenders the world-scan
 * build found were fixed in the same build, so the ceiling starts where
 * it ends. `EXEMPT` ships empty; an entry needs a reason a reviewer
 * reads, and *"the operation really is over all of them"* is an argument
 * for moving the narrowing INTO the owner, not for an exemption.
 *
 * Walks the kernel tree and every capability pack's `src/`; tests are
 * exempt (a test asserting on a whole table is asserting, not querying).
 *
 * Self-enrolls: `lint:family` derives its roster from package.json.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';
import { packSources } from './pack-roots';

const EXIT_ON_FINDINGS = true; // CI-gating

const here = dirname(fileURLToPath(import.meta.url));
const SERVER_SRC = join(here, '..', 'src');
const MUD_ROOT = join(SERVER_SRC, 'mud');

/**
 * Deliberate exceptions. Each needs the file, and a reason a reviewer
 * can weigh. Ships EMPTY — see the header.
 */
const EXEMPT: Array<{ file: string; reason: string }> = [];

/**
 * A whole-collection read (`allX()`, `getAllX()`, a bare `all()`)
 * immediately narrowed by the caller — `.find` / `.filter` / `.some` /
 * `.every` / `.flatMap`, or an index straight into it (`allX()[0]` is a
 * lookup wearing a list's clothes).
 *
 * The receiver is captured so the SELF case can be let through (below).
 * The `\)?` and `(?:\.stuff)?` absorb the two shapes that sit between
 * the read and the narrowing in this codebase: an `await` in parentheses,
 * and MQL's result wrapper.
 */
const READ =
  /(\w+)\.(?:all[A-Z]\w*|getAll\w*|all)\(\)\s*\)?\s*(?:\.stuff)?\s*(?:\.(?:find|filter|some|every|flatMap)\(|\[)/;

/**
 * ⭐ **An owner narrowing its OWN table is the fix, not the defect.**
 * `this.allModes().filter(…)` inside `LocomotionLogic`, or
 * `MaturationProfile.all().find(…)` inside `MaturationProfile.ts`, is
 * exactly what this gate tells callers to ask for: a keyed read, living
 * with the collection. So a receiver of `this` — or the class the file
 * is named for — is not a finding.
 */
function isSelfReceiver(receiver: string, file: string): boolean {
  if (receiver === 'this') return true;
  const own = file.slice(file.lastIndexOf('/') + 1).replace(/\.ts$/, '');
  return receiver === own;
}

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue;
      walk(full, out);
    } else if (full.endsWith('.ts') && !full.endsWith('.d.ts')) {
      out.push(full);
    }
  }
}

const files: string[] = [];
walk(MUD_ROOT, files);
for (const pack of packSources()) walk(pack.srcDir, files);

interface Finding {
  file: string;
  line: number;
  text: string;
}

const findings: Finding[] = [];

for (const file of files) {
  if (EXEMPT.some((e) => file.endsWith(e.file))) continue;
  const lines = readFileSync(file, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trimStart().startsWith('*')) continue; // doc comments
    const hit = READ.exec(line);
    if (!hit) continue;
    if (isSelfReceiver(hit[1]!, file)) continue;
    findings.push({ file, line: i + 1, text: line.trim().slice(0, 110) });
  }
}

if (findings.length === 0) {
  console.log(
    `check-whole-table: 0 whole-table reads narrowed at the call site ` +
      `(ceiling 0; ${files.length} files scanned, ${EXEMPT.length} exempt) OK`,
  );
  process.exit(0);
}

console.error(
  `check-whole-table: ${findings.length} whole-table read${
    findings.length === 1 ? '' : 's'
  } narrowed at the call site — the ceiling is 0.\n`,
);
for (const f of findings) {
  console.error(
    `  ${relative(join(SERVER_SRC, '..'), f.file)}:${f.line}  ${f.text}`,
  );
}
console.error(
  `\nAsk the owner the question instead of asking for the table:\n` +
    `  registry.recordFor(x)   not   registry.allRecords().find(...)\n` +
    `  catalogue.lanesAt(p)    not   catalogue.allLanes().filter(...)\n\n` +
    `If the owner has no such read, ADD ONE - that is the fix, and it is\n` +
    `where an index can later go without a caller moving. See\n` +
    `docs/antipatterns.md, section: An Api May Not Hand Back Its Table.`,
);
process.exit(EXIT_ON_FINDINGS ? 1 : 0);
