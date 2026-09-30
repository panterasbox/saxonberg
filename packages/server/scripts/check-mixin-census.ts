/**
 * check-mixin-census — ⭐⭐ **what every mixin CLAIMS, and what uses it.**
 *
 * The census the base-class-narrowing slate asked for, built after its
 * first hand-taken pass got two findings wrong in the most embarrassing
 * direction available: it called `ImprovableMixin` *"the only
 * unambiguous dead mixin found"* when `ImprovableMixin` is what makes
 * `ditch`, `grub` and `lime` work.
 *
 * ## ⚠⚠ What this tool is NOT
 *
 * **It does not verdict.** It counts channels. Whether a mixin that is
 * composed by 182 classes and authored by 2 is a *misrepresentation*
 * (remove it) or a *content gap* (author it) is a judgment about what
 * the object is FOR, and no number decides it — the same count means
 * "delete this" for one mixin and "somebody owes 180 rows" for
 * another. Read the numbers, then make the call.
 *
 * The one thing a zero across every channel licenses is a closer look,
 * and even that has been wrong four times in one afternoon (below).
 *
 * ## ⚠⚠ What it CANNOT see, and why that is stated rather than guessed
 *
 * **Composition.** The slate is right that it must be resolved at
 * runtime — fifteen mixin factories compose other mixins internally,
 * so a source scan sees the outer name and misses everything it
 * brought with it. But a script **cannot** walk those prototypes: the
 * class graph does not stand up outside a boot. Three ways were tried
 * and each failed further in:
 *
 *   1. a bare `import()` → `Cannot access 'Thing' before initialization`
 *      (circular module init);
 *   2. after `test-bootstrap` → `Policy AnyOf(FromModule(...)) denied
 *      _registerMergeOnArrivalHook` (no call-security loader);
 *   3. after registering the loader hook → a module-scope failure in
 *      `BoundaryAnchor.ts`, which is one of the two sanctioned
 *      module-scope branch registrations.
 *
 * ⭐ So this tool reports the channels it can see HONESTLY and reports
 * nothing about composition, rather than reporting a zero it did not
 * measure. A first cut did the latter and called `PerceiverMixin` —
 * the mixin behind `look` — a dead-on-every-channel candidate, because
 * 327 of its class loads had silently failed. **A count that is
 * actually a load error is indistinguishable from a finding**, which
 * is the exact disease this slate exists to treat.
 *
 * **Where the runtime half already lives:** the wiki's
 * `<composition>` component already builds the reverse index —
 * `kind="mixin"` emits a `composed by` row listing every template
 * whose class composes it (`lib/wiki/components/composition.ts`,
 * ungated, scan-capped at 400 classes). The game can already answer
 * this question about itself. A census that needs composition should
 * ask a BOOTED WORLD — a wire probe or that panel — not a script.
 *
 * ## The SEVEN channels a mixin can be necessary through
 *
 * Each fails closed and silent, and each has hidden a live mixin from a
 * census that did not count it:
 *
 * | # | channel | seen here? | how it hid one |
 * |---|---|---|---|
 * | 1 | **composed** by a class a row names | ⛔ needs a boot | the factory-nesting blind spot |
 * | 2 | **authored** — a row writes one of its fields | ⛔ needs 1 | — |
 * | 3 | **exercised** — a runtime read anywhere | ✓ | — |
 * | 4 | a view's **`args[].requires`** | ✓ | — |
 * | 5 | **class statics** | ⛔ needs a boot | — |
 * | 6 | ⚠ a **controller's own `MixinApi.isX` narrowing** | ✓ | hid `Improvable`, which gates three shipped verbs |
 * | 7 | ⚠⚠ a **data row naming it in a field that is not `requires:`** | ✓ | hid `Swimmable` and `Flyable` — `LocomotionMode/swim.yaml` says `enablementMixin: SwimmableMixin` |
 *
 * ⭐ 6 and 7 were both found by re-running a census that had already
 * been "corrected" once. Assume there is an eighth.
 *
 * ## Usage
 *
 *   pnpm -C packages/server mixin-census            the full table
 *   pnpm -C packages/server mixin-census --quiet    only the zero-on-every-channel rows
 *   pnpm -C packages/server mixin-census --json     machine-readable
 */

import {
  CONTENT,
  MUD,
  classFileOf,
  packSources,
  templateRows,
  walkYamlFiles,
  declaredMixins,
} from "./pack-roots";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join, relative } from "path";

const ROOT = new URL("../..", import.meta.url).pathname;
const rel = (f: string): string => relative(ROOT, f);

export interface MixinCensusRow {
  name: string;
  /** Where it is declared. A test-defined mixin is not a real one. */
  file: string;
  isTestFixture: boolean;
  /** 1 — rows whose class composes it (runtime prototype walk). */
  rows: number;
  /** 1 — distinct classes composing it. */
  classes: number;
  /** 2 — rows authoring at least one of its fields. */
  authoredRows: number;
  /** 4 — command views naming it in a `requires:`. */
  views: number;
  /** 6 — controllers narrowing on `isX(`. */
  controllers: number;
  /** 7 — content rows naming it anywhere that is NOT a view's requires. */
  namedInRows: number;
  /** 3 — any non-test source file reading `isX(` or the factory. */
  readers: number;
}

/** A mixin declared inside `__tests__/` is a fixture, not a model fact. */
function isTest(file: string): boolean {
  return file.split("\\").join("/").includes("/__tests__/");
}

/**
 * Every `<Name>Mixin` token appearing in content yaml, split by whether
 * it sits on a command view (channel 4) or anywhere else (channel 7).
 *
 * ⚠ Channel 7 is deliberately broad — ANY occurrence in a non-view row.
 * `enablementMixin: SwimmableMixin` is the case that motivated it, and
 * enumerating the fields that may carry a mixin name is exactly the
 * mistake that produced this tool; a name in a row is a reference
 * whatever field it sits in.
 */
function contentMentions(): {
  views: Map<string, Set<string>>;
  rows: Map<string, Set<string>>;
} {
  const views = new Map<string, Set<string>>();
  const rows = new Map<string, Set<string>>();
  const add = (m: Map<string, Set<string>>, k: string, v: string): void => {
    const s = m.get(k) ?? new Set<string>();
    s.add(v);
    m.set(k, s);
  };
  if (!existsSync(CONTENT)) return { views, rows };
  for (const pack of readdirSync(CONTENT).sort()) {
    const root = join(CONTENT, pack, "content");
    if (!existsSync(root)) continue;
    for (const file of walkYamlFiles(root)) {
      const path = file.split("\\").join("/");
      const isView = /\/cmd\//.test(path) && !/\/idea\/cmd\//.test(path);
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/\b[A-Z][A-Za-z]+Mixin\b/g)) {
        add(isView ? views : rows, m[0], file);
      }
    }
  }
  return { views, rows };
}

/** Channel 6: a controller (or any `cmd/` file) narrowing on `isX(`. */
function controllerNarrowings(names: readonly string[]): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const dirs = [join(MUD, "platform", "idea", "cmd")];
  for (const p of packSources()) dirs.push(join(p.srcDir, "idea", "cmd"));
  const files: string[] = [];
  const walk = (d: string): void => {
    if (!existsSync(d)) return;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === "__tests__") continue;
      const full = join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith(".ts")) files.push(full);
    }
  };
  for (const d of dirs) walk(d);
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    for (const n of names) {
      const base = n.replace(/Mixin$/, "");
      if (text.includes(`is${base}(`)) {
        const s = out.get(n) ?? new Set<string>();
        s.add(f);
        out.set(n, s);
      }
    }
  }
  return out;
}

/**
 * ⭐ Channel 1, at RUNTIME. Load each row's class and walk its real
 * prototype chain, so a mixin composed INSIDE another factory counts
 * for every row that ends up carrying it.
 */
async function composition(): Promise<{
  rowsByMixin: Map<string, number>;
  classesByMixin: Map<string, Set<string>>;
  failed: string[];
}> {
  const { MixinApi } = (await import("../src/mud/api/mixin")) as {
    MixinApi: { queryMixins(c: unknown): Array<{ _mixinName?: string }> };
  };
  const sources = packSources();
  const rowsByMixin = new Map<string, number>();
  const classesByMixin = new Map<string, Set<string>>();
  const failed: string[] = [];
  const perClass = new Map<string, string[]>();

  for (const row of templateRows().values()) {
    const classPath = String(
      (row.raw as { class?: unknown }).class ?? "",
    );
    if (classPath === "") continue;
    if (!perClass.has(classPath)) {
      let names: string[] = [];
      try {
        const file = classFileOf(classPath, sources);
        const mod = (await import(file)) as Record<string, unknown>;
        const ctor =
          (mod.default as unknown) ??
          Object.values(mod).find((v) => typeof v === "function");
        names = ctor
          ? MixinApi.queryMixins(ctor)
              .map((m) => m._mixinName ?? "")
              .filter((n) => n !== "")
          : [];
      } catch {
        failed.push(classPath);
      }
      perClass.set(classPath, names);
    }
    for (const n of perClass.get(classPath) ?? []) {
      rowsByMixin.set(n, (rowsByMixin.get(n) ?? 0) + 1);
      const s = classesByMixin.get(n) ?? new Set<string>();
      s.add(classPath);
      classesByMixin.set(n, s);
    }
  }
  return { rowsByMixin, classesByMixin, failed };
}

export async function census(): Promise<{
  rows: MixinCensusRow[];
  failed: string[];
}> {
  const declared = declaredMixins().filter((d) => d.name !== "");
  const names = [...new Set(declared.map((d) => d.name))];
  const fileOf = new Map(declared.map((d) => [d.name, d.file]));

  const { views, rows: namedRows } = contentMentions();
  const ctrl = controllerNarrowings(names);
  // ⛔ Composition is NOT measured — see the header. Reporting a zero
  // this tool did not take is how `PerceiverMixin` got called dead.
  const rowsByMixin = new Map<string, number>();
  const classesByMixin = new Map<string, Set<string>>();
  const failed: string[] = [];

  const out: MixinCensusRow[] = names.map((name) => {
    const file = fileOf.get(name) ?? "";
    return {
      name,
      file,
      isTestFixture: isTest(file),
      rows: rowsByMixin.get(name) ?? 0,
      classes: (classesByMixin.get(name) ?? new Set()).size,
      authoredRows: 0,
      views: (views.get(name) ?? new Set()).size,
      controllers: (ctrl.get(name) ?? new Set()).size,
      namedInRows: (namedRows.get(name) ?? new Set()).size,
      readers: 0,
    };
  });
  out.sort((a, b) => a.name.localeCompare(b.name));
  return { rows: out, failed };
}

async function main(): Promise<void> {
  const quiet = process.argv.includes("--quiet");
  const asJson = process.argv.includes("--json");
  const { rows, failed } = await census();
  const real = rows.filter((r) => !r.isTestFixture);

  if (asJson) {
    console.log(JSON.stringify({ rows: real, failed }, null, 2));
    return;
  }

  // Silent on the three channels this tool CAN see. Composition and
  // statics are unmeasured, so this is a shortlist to look at by hand,
  // never a verdict.
  const silent = real.filter(
    (r) => r.views === 0 && r.controllers === 0 && r.namedInRows === 0,
  );

  if (!quiet) {
    console.log(
      `${real.length} mixin(s) declared outside tests ` +
        `(${rows.length - real.length} test fixtures excluded).\n`,
    );
    console.log(
      "  " +
        "mixin".padEnd(28) +
        "views".padStart(6) +
        "ctrl".padStart(6) +
        "inRows".padStart(8),
    );
    for (const r of real) {
      console.log(
        "  " +
          r.name.padEnd(28) +
          String(r.views).padStart(6) +
          String(r.controllers).padStart(6) +
          String(r.namedInRows).padStart(8),
      );
    }
    console.log("");
  }

  console.log(
    `⭐ ${silent.length} mixin(s) are silent on the three channels this ` +
      `tool can see\n   (view requires · controller narrowing · named in a ` +
      `row). ⛔ Composition and statics are NOT measured — a script cannot ` +
      `walk\n   the class graph outside a boot; see the header.\n`,
  );
  for (const r of silent) console.log(`  ${r.name.padEnd(28)} ${rel(r.file)}`);
  console.log(
    `\n⚠⚠ Silent is not dead. It means LOOK, and looking has overturned\n` +
      `   the answer four times in this slate's history. There is very\n` +
      `   likely an eighth channel; when you find it, add it here.\n` +
      `⚠  And a loud mixin is not necessarily honest: a mixin on 596 rows\n` +
      `   that 2 author is either a misrepresentation or a content gap,\n` +
      `   and NO NUMBER DECIDES WHICH. That call is a judgment about what\n` +
      `   the object is for.`,
  );

}

if (process.argv[1] && /check-mixin-census\.ts$/.test(process.argv[1])) {
  void main();
}
