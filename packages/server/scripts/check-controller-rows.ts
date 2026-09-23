/**
 * check-controller-rows — ⭐⭐ **a `controller:` is a TEMPLATE PATH, and a
 * controller with no row is a verb that dies on dispatch.**
 *
 * A command view names its controller by path
 * (`/platform/idea/cmd/employment/QuitController`), and the dispatcher
 * resolves that path the way it resolves any other Idea: through a
 * template ROW. A controller class with no row resolves to nothing, and
 * the verb answers `controller-error` — every time, for everybody,
 * forever.
 *
 * ⚠ **It is invisible to the whole test suite.** A controller test
 * instantiates the class directly (`new ApplyController().execute(...)`),
 * so it passes with no row at all; a view test parses YAML, so it passes
 * too. Nothing between the two asks *does this path resolve*. The
 * trades-and-labor build shipped `apply` and `clock` with their views,
 * their controllers, their affordances, 15 green controller tests and no
 * rows — and found out by DRIVING, on the third checkpoint.
 *
 * That is the reachability chain's **data** link failing in its purest
 * form: everything present, nothing wired, closed and silent.
 *
 * ## ⚠ What counts, stated exactly
 *
 * Every absolute `controller:` value anywhere in a command VIEW — the
 * top-level one and every subcommand stanza's — checked against the set
 * of template paths any pack ships a row for. A `cmd` directory is views
 * unless its parent is `idea` (the shipped path rule: `<root>/idea/cmd/**`
 * holds the CONTROLLERS, `<root>/cmd/**` holds their views).
 *
 * ⭐ A ratchet at zero: the census was 309 refs and 0 missing the moment
 * the two this build was missing were written, so there is no backlog to
 * burn down and the ceiling starts where it ends.
 *
 * Self-enrols: `lint:family` derives its roster from package.json.
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';
import YAML from 'yaml';
import { CONTENT } from './pack-roots';

const EXIT_ON_FINDINGS = true; // CI-gating

const REPO_ROOT = join(CONTENT, '..', '..');

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.yaml')) out.push(full);
  }
  return out;
}

/** Every template path any pack ships a row for. */
const rows = new Set<string>();
/** Every absolute `controller:` a command view names, with its view. */
const refs: { view: string; path: string }[] = [];

for (const pack of readdirSync(CONTENT)) {
  const contentDir = join(CONTENT, pack, 'content');
  if (!existsSync(contentDir)) continue;
  for (const file of walk(contentDir)) {
    let doc: Record<string, unknown> | null;
    try {
      doc = YAML.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    } catch {
      continue; // a malformed row is another gate's finding
    }
    if (!doc || typeof doc !== 'object') continue;
    const path = `/${relative(contentDir, file).replace(/\.yaml$/, '')}`;
    if (typeof doc.class === 'string') rows.add(path);

    // ⚠ A `cmd` dir is VIEWS unless its parent is `idea`.
    const isView = file.includes('/cmd/') && !file.includes('/idea/cmd/');
    if (!isView) continue;
    const harvest = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      const obj = node as Record<string, unknown>;
      if (typeof obj.controller === 'string' && obj.controller.startsWith('/')) {
        refs.push({ view: relative(REPO_ROOT, file), path: obj.controller });
      }
      for (const value of Object.values(obj)) harvest(value);
    };
    harvest(doc);
  }
}

const missing = refs.filter((r) => !rows.has(r.path));

if (missing.length === 0) {
  console.log(
    `check-controller-rows: ${refs.length} controller ref(s) across the ` +
      `command views; every one resolves to a row (ceiling 0) ✔`,
  );
  process.exit(0);
}

console.error(
  `check-controller-rows: ${missing.length} controller path(s) with no ` +
    `template row — the ceiling is 0.\n`,
);
for (const m of missing) console.error(`  ${m.path}\n    named by ${m.view}`);
console.error(
  `\n⭐ A \`controller:\` is a TEMPLATE PATH. A controller class with no\n` +
    `row resolves to nothing and the verb answers \`controller-error\` —\n` +
    `every time, for everybody, forever — while its controller tests stay\n` +
    `green, because they instantiate the class directly.\n\n` +
    `Write the row beside its siblings:\n` +
    `  packages/content/<pack>/content/<root>/idea/cmd/<category>/<Name>Controller.yaml\n` +
    `    class: <the controller's template path>\n` +
    `    data: {}\n\n` +
    `See docs/subsystems/command-routing.md and command-spec.md.`,
);
process.exit(EXIT_ON_FINDINGS ? 1 : 0);
