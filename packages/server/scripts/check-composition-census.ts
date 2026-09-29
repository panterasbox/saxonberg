/**
 * check-composition-census — ⭐⭐⭐ **for every template, does it need
 * every mixin its class composes?**
 *
 * The measurement the base-class narrowing work is actually about, and
 * the one its first census could not take. `check-mixin-census.ts`
 * counts the seven channels through which a mixin can be *necessary*
 * and says so honestly; it reports nothing about composition, because a
 * bare script cannot walk the mixin prototypes. That left the register
 * a hand-made list of ten `(class, mixin)` pairs, which is not an audit
 * of the tree — and a build planned from ten items narrows ten items.
 *
 * ⭐ The class graph was never the obstacle. The obstacle was the
 * ENTRY: this module is imported through
 * `composition-census-preload.js`, which registers the call-security
 * loader hook and then dynamically imports, exactly as `src/preload.js`
 * has done for the server since the beginning. See that file's header.
 *
 * ## What it measures
 *
 * For every class a content row names, one row per prototype-chain
 * layer (`MixinApi.getPersistenceContributors` — the layer's
 * `_mixinName` and its OWN declared persistent fields, not the
 * aggregated chain), crossed with what that class's rows actually
 * author in their `data:` blocks:
 *
 *   class · mixin layer · its fields · rows of this class · rows
 *   authoring at least one of that layer's fields
 *
 * ## ⚠⚠ What a zero does and does not mean
 *
 * **It is not a verdict, and this tool must never be read as one.** A
 * layer no row authors is one of three different things and the number
 * cannot tell them apart:
 *
 *  1. a **misrepresentation** — the thing is not that, and the mixin
 *     should come off (a seed is not chattel);
 *  2. a **content gap** — the thing IS that and somebody owes rows
 *     (the mine's unauthored air);
 *  3. **behaviour with no authored surface** — the mixin is doing its
 *     job through minted or derived state and has no field an author
 *     would ever write. `ChattelMixin`'s `_chattelId` is STAMPED, not
 *     authored; `WetMixin` is derived. Both would read zero here and
 *     both are load-bearing.
 *
 * ⭐ So the columns to read together are *authoring rows* and the
 * **channel** columns of `mixin-census` — and then a human decides. The
 * one thing this tool licenses on its own is a shorter list to think
 * about.
 *
 * ## Output
 *
 * A human table on stdout, and `--json <path>` writes the full matrix
 * for a planner to reason over cluster by cluster.
 *
 * ## ⭐⭐ `--cotenancy` — the OTHER question
 *
 * The audit above asks *does this class need its mixins*. It cannot ask
 * the sibling question, which is just as much of the work:
 *
 * > **Do the rows sharing a class actually deserve to — and if they do,
 * > is the class named for what they have in common?**
 *
 * The measurable form is divergence. Rows of one class that author
 * DISJOINT field sets are not the same kind of thing wearing one class;
 * they are two kinds of thing that nobody has separated yet. A key some
 * rows set and others never touch is where the seam is.
 *
 * ⚠ Divergence is evidence, not a verdict — the same three readings
 * apply. Rows may diverge because they are genuinely different (split
 * the class), because half of them are under-authored (write the rows),
 * or because the field is optional by design (a `Lamp` that is lit and
 * one that is not).
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import YAML from "yaml";
import { CONTENT } from "./pack-roots";
import "../src/test-bootstrap";
import { StuffApi } from "../src/mud/api/stuff";
import { MixinApi, type AnyConstructor } from "../src/mud/api/mixin";

/** One authored row: where it lives, what class it names, what it sets. */
interface Row {
  file: string;
  path: string;
  classPath: string;
  dataKeys: Set<string>;
}

/** One prototype-chain layer of a class, with its own declared fields. */
interface Layer {
  mixin: string;
  fields: string[];
  /**
   * ⭐⭐ The subset of `fields` an author could ever write
   * (`fieldMeta.authorable`). **This is what makes the census readable.**
   *
   * A layer with NO authorable field cannot be judged by what rows
   * author, because no row could author it: `ContainableMixin`'s state
   * is where the thing currently is, `ChattelMixin`'s `_chattelId` is
   * STAMPED at transfer, `WetMixin` is derived. Ranking those beside
   * `ThermalMixin` — whose `stampedTemperatureK` an author genuinely
   * may write and mostly does not — is comparing a silence to an
   * absence.
   */
  authorable: string[];
}

function* walkYaml(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walkYaml(full);
    else if (e.name.endsWith(".yaml") || e.name.endsWith(".yml")) yield full;
  }
}

/**
 * Every content row that names a class, with the keys its `data:` block
 * sets.
 *
 * ⚠ `extends:` is resolved at READ time and never flattened, so a child
 * row's own `data:` is only half of what it authors. The parent's keys
 * are folded in here — otherwise every `extends:` child reads as
 * authoring almost nothing and its class looks narrower than it is.
 */
function readRows(): Row[] {
  const byPath = new Map<string, Row>();
  const raw: Array<{ row: Row; extends?: string }> = [];
  if (!existsSync(CONTENT)) return [];

  for (const pack of readdirSync(CONTENT).sort()) {
    const root = join(CONTENT, pack, "content");
    if (!existsSync(root)) continue;
    for (const file of walkYaml(root)) {
      let doc: unknown;
      try {
        doc = YAML.parse(readFileSync(file, "utf8"));
      } catch {
        continue; // a malformed row is `lint:census`'s business, not ours
      }
      if (!doc || typeof doc !== "object") continue;
      const d = doc as Record<string, unknown>;
      const classPath = typeof d.class === "string" ? d.class : "";
      if (!classPath) continue;
      const data = (d.data ?? {}) as Record<string, unknown>;
      // The template path is the file's position under `content/`.
      const rel = file.split("\\").join("/").split("/content/").pop() ?? file;
      const path = "/" + rel.replace(/\.(yaml|yml)$/, "");
      const row: Row = {
        file,
        path,
        classPath,
        dataKeys: new Set(Object.keys(data)),
      };
      byPath.set(path, row);
      raw.push({
        row,
        ...(typeof d.extends === "string" ? { extends: d.extends } : {}),
      });
    }
  }

  // Fold each child's inherited keys in, one level at a time until
  // nothing changes (a chain may be deeper than one).
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    for (const { row, extends: parentPath } of raw) {
      if (!parentPath) continue;
      const parent = byPath.get(parentPath);
      if (!parent) continue;
      for (const k of parent.dataKeys) {
        if (!row.dataKeys.has(k)) {
          row.dataKeys.add(k);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return [...byPath.values()];
}

/** The prototype-chain layers of a class, or null when it will not load. */
async function layersOf(classPath: string): Promise<Layer[] | null> {
  try {
    const ctor = (await StuffApi.loadClassByPath(classPath)) as AnyConstructor;
    if (typeof ctor !== "function") return null;
    const meta = MixinApi.getAllFieldMeta(ctor) as Record<
      string,
      { authorable?: true } | undefined
    >;
    return MixinApi.getPersistenceContributors(ctor).map((c) => ({
      mixin: c.key,
      fields: c.fields,
      authorable: c.fields.filter((f) => meta[f]?.authorable === true),
    }));
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const jsonFlag = process.argv.indexOf("--json");
  const jsonPath = jsonFlag >= 0 ? process.argv[jsonFlag + 1] : null;

  const cotenancy = process.argv.includes("--cotenancy");
  const rows = readRows();
  const byClass = new Map<string, Row[]>();
  for (const r of rows) {
    const list = byClass.get(r.classPath) ?? [];
    list.push(r);
    byClass.set(r.classPath, list);
  }

  const classPaths = [...byClass.keys()].sort();
  const failed: string[] = [];
  const report: Array<{
    classPath: string;
    rows: number;
    layers: Array<{
      mixin: string;
      fields: string[];
      authorable: string[];
      authoringRows: number;
      authoredFields: string[];
    }>;
  }> = [];

  for (const classPath of classPaths) {
    const layers = await layersOf(classPath);
    if (layers === null) {
      failed.push(classPath);
      continue;
    }
    const classRows = byClass.get(classPath)!;
    report.push({
      classPath,
      rows: classRows.length,
      layers: layers.map((l) => {
        const authoredFields = l.fields.filter((f) =>
          classRows.some((r) => r.dataKeys.has(f)),
        );
        const authoringRows = classRows.filter((r) =>
          l.fields.some((f) => r.dataKeys.has(f)),
        ).length;
        return {
          mixin: l.mixin,
          fields: l.fields,
          authorable: l.authorable,
          authoringRows,
          authoredFields,
        };
      }),
    });
  }

  // ⚠⚠ The load-failure count is reported FIRST and loudly. A census
  // whose loads failed silently is how the first cut called the mixin
  // behind `look` dead; a number that is actually a load error is
  // indistinguishable from a finding.
  console.info("=".repeat(72));
  console.info("composition census — what every row's class composes");
  console.info("=".repeat(72));
  console.info(
    `rows: ${rows.length}   classes named: ${classPaths.length}   ` +
      `loaded: ${report.length}   FAILED TO LOAD: ${failed.length}`,
  );
  if (failed.length) {
    console.info("\n⚠ classes that would not load (NOT measured):");
    for (const f of failed.slice(0, 40)) console.info(`    ${f}`);
    if (failed.length > 40) console.info(`    … and ${failed.length - 40} more`);
  }

  // ⭐⭐ TWO lists, because they are two different questions. A layer
  // with no AUTHORABLE field cannot be judged by what rows author — no
  // row could author it — so ranking it beside one that could is
  // comparing an absence to a silence.
  const rank = (
    pick: (l: (typeof report)[number]["layers"][number]) => boolean,
  ): Array<[string, { rows: number; classes: string[] }]> => {
    const byMixin = new Map<string, { rows: number; classes: string[] }>();
    for (const c of report) {
      if (c.rows < 2) continue;
      for (const l of c.layers) {
        if (!pick(l)) continue;
        const e = byMixin.get(l.mixin) ?? { rows: 0, classes: [] };
        e.rows += c.rows;
        e.classes.push(`${c.classPath} (${c.rows})`);
        byMixin.set(l.mixin, e);
      }
    }
    return [...byMixin.entries()].sort((a, b) => b[1].rows - a[1].rows);
  };

  console.info(
    "\n⭐⭐ A — AUTHORABLE, and no row of the class writes it",
  );
  console.info(
    "   The real shortlist: an author COULD say this and never does.\n",
  );
  for (const [mixin, e] of rank(
    (l) => l.authorable.length > 0 && l.authoringRows === 0,
  ).slice(0, 30)) {
    console.info(
      `  ${String(e.rows).padStart(4)} rows  ${mixin.padEnd(28)} ` +
        `${e.classes.length} class${e.classes.length === 1 ? "" : "es"}`,
    );
  }

  console.info(
    "\n⚠ B — NO authorable field at all — cannot be judged by authoring",
  );
  console.info(
    "   Minted, derived or pure-runtime state. Read the CHANNELS for these\n" +
      "   (`pnpm -C packages/server mixin-census`), never this column.\n",
  );
  for (const [mixin, e] of rank(
    (l) => l.fields.length > 0 && l.authorable.length === 0,
  ).slice(0, 15)) {
    console.info(
      `  ${String(e.rows).padStart(4)} rows  ${mixin.padEnd(28)} ` +
        `${e.classes.length} class${e.classes.length === 1 ? "" : "es"}`,
    );
  }

  if (cotenancy) {
    console.info("\n⭐⭐ CO-TENANCY — rows that share a class and are not alike");
    console.info(
      "   A key some rows set and others never touch is where a seam is.\n" +
        "   (evidence, not a verdict — the same three readings apply)\n",
    );
    interface Split {
      classPath: string;
      rows: number;
      core: number;
      splits: Array<{ field: string; setters: number }>;
      score: number;
    }
    const splits: Split[] = [];
    for (const [classPath, classRows] of byClass) {
      if (classRows.length < 3) continue;
      const counts = new Map<string, number>();
      for (const r of classRows)
        for (const k of r.dataKeys) counts.set(k, (counts.get(k) ?? 0) + 1);
      const n = classRows.length;
      // A field is a SEAM when a real minority sets it: not universal
      // (that is the class's own core) and not a one-off (that is a
      // single bespoke row, which is what authoring is for).
      const seams = [...counts.entries()]
        .filter(([, c]) => c >= 2 && c <= n - 2)
        .map(([field, c]) => ({ field, setters: c }))
        .sort((a, b) => b.setters - a.setters);
      const core = [...counts.values()].filter((c) => c === n).length;
      if (seams.length === 0) continue;
      // Score by how evenly the biggest seam splits the class: a field
      // set by half its rows is a fault line; one set by all but one is
      // an omission.
      const top = seams[0]!.setters;
      const evenness = 1 - Math.abs(top / n - 0.5) * 2;
      splits.push({
        classPath,
        rows: n,
        core,
        splits: seams.slice(0, 5),
        score: evenness * n,
      });
    }
    for (const s2 of splits.sort((a, b) => b.score - a.score).slice(0, 25)) {
      const fields = s2.splits
        .map((x) => `${x.field} ${x.setters}/${s2.rows}`)
        .join(" · ");
      console.info(`  ${s2.classPath}  (${s2.rows} rows, ${s2.core} shared)`);
      console.info(`      ${fields}`);
    }
    console.info(`\n  ${splits.length} classes with a seam.`);
  }

  if (jsonPath) {
    writeFileSync(
      jsonPath,
      JSON.stringify(
        {
          report,
          failed,
          // Per-row authored keys, so a planner can ask the co-tenancy
          // question itself rather than trusting this script's scoring.
          rows: rows.map((r) => ({
            path: r.path,
            classPath: r.classPath,
            keys: [...r.dataKeys].sort(),
          })),
        },
        null,
        2,
      ),
    );
    console.info(`\nfull matrix → ${jsonPath}`);
  }
}

await main();
