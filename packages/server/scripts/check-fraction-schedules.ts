/**
 * check-fraction-schedules — ⭐⭐ **a schedule's `separation` and its
 * spans' `material` are ONE claim, and a row that gets it half right is
 * the dangerous case.**
 *
 * A `FractionSchedule` says what a vessel does as it is drawn, and since
 * the drilling build there are two kinds of thing it can be:
 *
 *  - `'cuts'` (the default) — **grades of one substance.** A pot still's
 *    foreshots, heads, hearts and tails are all new-make spirit; they
 *    differ in character and in what they will poison you with, and the
 *    distiller's art is deciding where to cut and then **blending what
 *    they kept.** One `productMaterial`, several qualities of it.
 *  - `'fractions'` — **different substances.** A refinery column's
 *    gasoline is not a grade of kerosene and no amount of blending makes
 *    it one. Every span names its own `material`, and the schedule names
 *    no product at all, because there is no such thing as *the* product
 *    of a column.
 *
 * ## ⚠⚠ What this gate is actually protecting
 *
 * Not a missing-everything row — those fail loudly. The dangerous case
 * is a `'fractions'` row missing **one** `material`: that span would
 * quietly be handed out as the schedule's `productMaterial`, which in a
 * refinery means **a cask labelled kerosene full of gasoline.** It would
 * surface at the completion of a pour, with nobody watching, long after
 * the author had moved on.
 *
 * ## ⭐ Why a GATE and not a runtime check
 *
 * It was `FractionSchedule.onCreate` for one revision, and
 * `lint:on-create` refused it: that hook is a RATCHET (*the ceiling may
 * fall, never rise*) and it *collects work that belongs elsewhere*. The
 * audit agreed — this is an **authoring** rule, not a runtime one. It
 * cannot be fixed by a player, it cannot vary at run time, and the
 * person who needs to hear about it is reading a YAML file right now.
 * Build time, named by file, is where that belongs.
 *
 * ⚠ And it cannot live in `setFractions` either, which is where it
 * started: `separation` and `fractions` are two authored keys and the
 * `TemplateApplier` dispatches a row's `data:` keys in the order the row
 * happens to list them, so a setter check reads whatever `separation`
 * was at that moment. A perfectly good column would throw and
 * **reordering the YAML would fix it** — a validation that depends on
 * authoring whitespace.
 *
 * `lint:family` derives its roster from package.json, so this enrols
 * itself.
 */

import { readFileSync } from 'fs';
import { relative } from 'path';
import YAML from 'yaml';
import { CONTENT, walkYamlFiles } from './pack-roots';

const EXIT_ON_FINDINGS = true; // CI-gating

/** The infix every fractionation row sits under (the catalogue's own warm key). */
const PATH_INFIX = '/idea/fractionation/';

interface Finding {
  file: string;
  detail: string;
}

const findings: Finding[] = [];
let scanned = 0;
let columns = 0;

for (const file of walkYamlFiles(CONTENT)) {
  if (file.includes('node_modules')) continue;
  if (!file.replace(/\\/g, '/').includes(PATH_INFIX)) continue;
  let parsed: { data?: Record<string, unknown> } | null = null;
  try {
    parsed = YAML.parse(readFileSync(file, 'utf8')) as {
      data?: Record<string, unknown>;
    };
  } catch (err) {
    findings.push({
      file,
      detail: `is not parseable YAML: ${String(err)}`,
    });
    continue;
  }
  const data = parsed?.data;
  if (!data || typeof data !== 'object') continue;
  // A fractionation row is one that declares spans. Anything else under
  // the infix is somebody else's business.
  const spans = data.fractions;
  if (!Array.isArray(spans)) continue;
  scanned += 1;

  const separation = String(data.separation ?? 'cuts');
  const product = String(data.productMaterial ?? '');
  const key = String(data.key ?? relative(CONTENT, file));

  if (separation !== 'cuts' && separation !== 'fractions') {
    findings.push({
      file,
      detail:
        `'${key}' declares separation '${separation}', which is not one of ` +
        `'cuts' | 'fractions'. ⚠ The vocabulary is the compiler's on the ` +
        `TypeScript side and nothing coerces a row's string, so a typo here ` +
        `reads as 'cuts' and a column silently becomes a pot still.`,
    });
    continue;
  }

  if (separation === 'fractions') {
    columns += 1;
    for (const raw of spans) {
      if (!raw || typeof raw !== 'object') continue;
      const span = raw as Record<string, unknown>;
      const spanKey = String(span.key ?? '(unnamed)');
      const material = String(span.material ?? '');
      if (material.trim() === '') {
        findings.push({
          file,
          detail:
            `'${key}' declares 'fractions' and span '${spanKey}' names no ` +
            `material. ⚠⚠ That span would be handed out as the schedule's ` +
            `productMaterial — in a refinery, a cask labelled one thing ` +
            `full of another, at the completion of a pour, with nobody ` +
            `watching. A column separates one substance into DIFFERENT ` +
            `substances, so every span has to say what it is.`,
        });
      }
    }
    if (product !== '') {
      findings.push({
        file,
        detail:
          `'${key}' declares 'fractions' AND a productMaterial ` +
          `('${product}'). ⭐ There is no such thing as THE product of a ` +
          `column; each span names its own.`,
      });
    }
  } else {
    for (const raw of spans) {
      if (!raw || typeof raw !== 'object') continue;
      const span = raw as Record<string, unknown>;
      if (span.material !== undefined) {
        findings.push({
          file,
          detail:
            `'${key}' is 'cuts' and span '${String(span.key ?? '(unnamed)')}' ` +
            `names a material. ⭐ A pot still's fractions are GRADES of one ` +
            `substance and recombining them is the distiller's art — name ` +
            `one productMaterial, or declare 'fractions'.`,
        });
      }
    }
    if (product === '') {
      findings.push({
        file,
        detail:
          `'${key}' is 'cuts' and names no productMaterial. ⚠ Every span ` +
          `would yield nothing: a draw off this vessel stamps the ` +
          `destination with an empty path.`,
      });
    }
  }
}

if (findings.length > 0) {
  console.error(
    `check-fraction-schedules: ${findings.length} finding(s) — the ceiling is 0.\n`,
  );
  for (const f of findings) {
    console.error(`  ${relative(CONTENT, f.file)}`);
    console.error(`    ${f.detail}`);
  }
  console.error(
    `\n⭐ A schedule's kind and its spans' materials are ONE claim about ` +
      `what\nkind of machine this is. See ` +
      `docs/subsystems/fractionation.md § separation.`,
  );
  if (EXIT_ON_FINDINGS) process.exit(1);
} else {
  console.log(
    `check-fraction-schedules: ${scanned} schedule(s) — ${columns} column(s), ` +
      `${scanned - columns} still(s); every kind matches its spans ✔`,
  );
}
