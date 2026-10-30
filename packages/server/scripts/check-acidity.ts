/**
 * check-acidity — ⭐ **a material tagged `acid` must author a pH below 7.**
 *
 * The tag is a word; `ph` is the number the world reads. A glazed face
 * leaches by the contents' acid attack, from their pH (ceramics M7; B109),
 * so an acid whose row authors none reads neutral (7), and a lead glaze
 * leaches nothing into it. Nothing says so anywhere. That is how vitriol
 * shipped (review R2-B4).
 *
 * The converse is NOT a rule: lemon juice and wine are acidic without being
 * "an acid", so a pH below 7 without the tag is legitimate.
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, relative, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SERVER_ROOT, '../..');
const CONTENT = join(REPO_ROOT, 'packages/content');

/** Every `.yaml` under a directory, recursively. */
function yamlFiles(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const abs = join(dir, f);
    if (statSync(abs).isDirectory()) yamlFiles(abs, out);
    else if (f.endsWith('.yaml')) out.push(abs);
  }
  return out;
}

function main(): void {
  const failures: string[] = [];
  let acids = 0;
  for (const pack of existsSync(CONTENT) ? readdirSync(CONTENT) : []) {
    const root = join(CONTENT, pack, 'content');
    if (!existsSync(root)) continue;
    for (const file of yamlFiles(root)) {
      if (!file.includes('/idea/material/')) continue;
      let parsed: unknown;
      try {
        parsed = YAML.parse(readFileSync(file, 'utf8'));
      } catch {
        continue; // a malformed row is another gate's finding
      }
      const data = (parsed as { data?: Record<string, unknown> } | null)?.data;
      if (!data || !Array.isArray(data.tags) || !data.tags.includes('acid')) continue;
      acids += 1;
      const ph = data.ph;
      if (typeof ph !== 'number' || !(ph < 7)) {
        failures.push(
          `${relative(REPO_ROOT, file)}: tagged 'acid' but 'ph' is ` +
            `${JSON.stringify(ph)} — author its pH, below 7. Without it it ` +
            `reads neutral and a glazed face leaches nothing into it.`,
        );
      }
    }
  }
  if (failures.length > 0) {
    console.error(`\ncheck-acidity: ${failures.length} problem(s)\n`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    console.error('');
    process.exit(1);
  }
  console.log(`check-acidity: ${acids} acid row(s), each authoring a pH below 7`);
}

main();
