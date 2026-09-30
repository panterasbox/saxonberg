/**
 * check-authored-prose — **prose a player reads may not carry YAML
 * escaping.**
 *
 * An unquoted YAML scalar whose value opens with an escaped quote keeps
 * the backslash and the quotes *in the string*, and a content row is the
 * one place nothing downstream will notice: the value is never parsed
 * again, never compared, never rendered through a template — it is
 * simply pasted into a sentence and shown to somebody.
 *
 * ⭐ **Why this gate exists, and it is the whole argument for it.** Five
 * rows across four packs shipped like this:
 *
 *   instrumentNoun: \"a surveyor's compass or a miner's dial"
 *
 * so a prospector asking what he needed was told
 *
 *   It wants \"a surveyor's compass or a miner's dial".
 *
 * ⚠ **The suite could not see it and neither could the wire drive.** The
 * checkpoint that covered that exact line matched `/compass/` — and
 * `compass` is in there, surrounded by junk. A substring assertion is
 * blind to everything it is not asserting on, which is most of the
 * sentence. It took reading the words in a browser.
 *
 * So the check is mechanical and the ceiling is 0: the census over the
 * whole content tree came back clean once the five were fixed, so this
 * starts where it ends. `lint:family` derives its roster from
 * package.json, so adding the script is all the enrolment there is.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';

const EXIT_ON_FINDINGS = true; // CI-gating

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, '..', '..', '..');
const CONTENT = join(REPO, 'packages', 'content');

/**
 * An unquoted scalar opening with `\"`. Deliberately narrow: a value
 * that is *properly* double-quoted may contain whatever it likes, and a
 * block scalar (`|`, `>`) is not a quoting context at all.
 */
const ESCAPED_OPEN = /^\s*[A-Za-z_][A-Za-z0-9_]*:[ \t]*\\"/;

function walk(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === 'dist') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.yaml')) out.push(full);
  }
}

const files: string[] = [];
walk(CONTENT, files);

interface Finding {
  file: string;
  line: number;
  text: string;
}

const findings: Finding[] = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (line.trimStart().startsWith('#')) continue; // authored comments
    if (!ESCAPED_OPEN.test(line)) continue;
    findings.push({ file, line: i + 1, text: line.trim().slice(0, 110) });
  }
}

if (findings.length === 0) {
  console.log(
    `check-authored-prose: 0 escaped-quote scalars ` +
      `(ceiling 0; ${files.length} content file(s) scanned) ✔`,
  );
  process.exit(0);
}

console.error(
  `check-authored-prose: ${findings.length} authored scalar${
    findings.length === 1 ? '' : 's'
  } open with an escaped quote — the ceiling is 0.\n`,
);
for (const f of findings) {
  console.error(`  ${relative(REPO, f.file)}:${f.line}  ${f.text}`);
}
console.error(
  `\nThe backslash and the quotes end up IN the sentence a player reads.\n` +
    `Quote the whole value instead:\n` +
    `  noun: "a surveyor's compass or a miner's dial"\n`,
);
process.exit(EXIT_ON_FINDINGS ? 1 : 0);
