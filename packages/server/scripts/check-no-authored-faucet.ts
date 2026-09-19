/**
 * check-no-authored-faucet — ⭐ **no authored number becomes money**
 * (economic bootstrap, retrofit gate 2; the institutions slate's rule).
 *
 * > All money comes from one reserve, by two published rules. Nobody can
 * > type a bigger number.
 *
 * At 1.0 money was created three ways nobody chose: a stipend banked at
 * character creation, an opening grant to every business on its first
 * account, and a coin faucet the Governor could point at whatever venue
 * they stood in — each an authored figure (`banking.onboardingStipend`,
 * `banking.openingCapital`, `banking.openingFloat`, a Business row's
 * `openingCapital:`) that a code site turned into a `mint`. The bootstrap
 * replaces every one with a RULE the Schedule parameterises (the
 * perpetual, the window) or a recorded act (`reserve override`), and this
 * gate is what keeps a fourth faucet from being authored.
 *
 * ## What counts, stated exactly
 *
 * Three populations, summed:
 *
 *   (a) **content**: any `openingCapital:` key in a shipped row
 *       (`packages/content/*\/content/**\/*.yaml`);
 *   (b) **settings**: the three retired keys, wherever a `settings/*.yaml`
 *       still declares them;
 *   (c) **code**: a line in the kernel's `src/mud/**` or a pack's `src/**`
 *       (tests excluded) that posts a `mint` or issues coin —
 *       `postTransaction("mint"`, `BankingApi.mint(`, `BankingApi.float(`,
 *       `issueCash(` / `issueCashImpl(` as a CALL, `seedFloatImpl(` as a
 *       call — attributed to its enclosing function, minus the allowlist.
 *
 * The allowlist is `file#function`, and it names exactly the sites the
 * requirements permit: the two rules (`reconcilePerpetualImpl`, the
 * window's `windowAdvanceImpl`), the recorded override
 * (`overrideImpl`), and the harness seams (`issueCashImpl` / `issueCash`
 * / `mint`, which survive for the banking test harness and for the three
 * above to ride — a call to them from anywhere else is counted).
 *
 * ## Census, then ratchet
 *
 * The census at W3 is the ceiling; W6 drives it to 0 and the gate holds
 * 0. It may fall; it may never rise. The `check-lib-statics.ts` shape:
 * a `CEILING`, a `--report`, a test beside it that proves the gate FIRES
 * on a fixture. CI-gating through `lint:family`.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, dirname, relative, basename } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const KERNEL = join(HERE, "..", "src", "mud");
const CONTENT = join(HERE, "..", "..", "content");

/** The ceiling: the census this gate holds. It may fall; it may never rise. */
export const FAUCET_CEILING = 10;

/** The retired settings keys — an authored figure the code turned into money. */
export const RETIRED_SETTING_KEYS = [
  "banking.onboardingStipend",
  "banking.openingCapital",
  "banking.openingFloat",
] as const;

/** `<file basename>#<function>` — the sites the requirements permit. */
export const FAUCET_ALLOWLIST: ReadonlySet<string> = new Set([
  // The two rules.
  "BankingLogic.ts#reconcilePerpetualImpl",
  "BankingLogic.ts#windowAdvanceImpl",
  // The recorded override — the ONE hand-typed number left.
  "BankingLogic.ts#overrideImpl",
  // The harness seams the rules ride; a call from anywhere else counts.
  "BankingLogic.ts#issueCashImpl",
  "BankingLogic.ts#issueCash",
  "BankingLogic.ts#mint",
]);

export interface FaucetSite {
  kind: "content" | "setting" | "code";
  file: string;
  line: number;
  /** `file#function` for a code site; the key for a setting; the row key for content. */
  where: string;
}

/** A call to one of the faucet primitives (a DEFINITION line does not count). */
const CODE_PATTERNS: ReadonlyArray<RegExp> = [
  /postTransaction\(\s*["']mint["']/,
  /\bBankingApi\.mint\(/,
  /\bBankingApi\.float\(/,
  /(?<!function\s)(?<!async\s)\bissueCashImpl\(/,
  /\bBankingApi\.issueCash\(/,
  /(?<!function\s)(?<!async\s)\bseedFloatImpl\(/,
];

/** The name of the function or method whose body contains `lineIndex` (nearest declaration above). */
export function enclosingFunctionAt(lines: readonly string[], lineIndex: number): string {
  for (let i = lineIndex; i >= 0; i--) {
    const l = lines[i]!;
    const fn = /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*[(<]/.exec(l);
    if (fn) return fn[1]!;
    const method = /^\s{2}(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^;]*$/.exec(l);
    if (method && !/^\s{2}(?:if|for|while|switch|return|const|let|var|await)\b/.test(l)) return method[1]!;
  }
  return "<module>";
}

/** The pure decision core over one source file: every faucet call not on the allowlist. */
export function codeSitesOf(file: string, source: string): FaucetSite[] {
  const lines = source.split("\n");
  const out: FaucetSite[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (/^\s*(\/\/|\*|\/\*)/.test(l)) continue;
    if (!CODE_PATTERNS.some((p) => p.test(l))) continue;
    const where = `${basename(file)}#${enclosingFunctionAt(lines, i)}`;
    if (FAUCET_ALLOWLIST.has(where)) continue;
    out.push({ kind: "code", file, line: i + 1, where });
  }
  return out;
}

/** The pure decision core over one settings yaml: every retired key it still declares. */
export function settingSitesOf(file: string, source: string): FaucetSite[] {
  const out: FaucetSite[] = [];
  source.split("\n").forEach((l, i) => {
    const m = /^\s*-?\s*key:\s*([\w.]+)/.exec(l);
    if (m && (RETIRED_SETTING_KEYS as readonly string[]).includes(m[1]!)) {
      out.push({ kind: "setting", file, line: i + 1, where: m[1]! });
    }
  });
  return out;
}

/** The pure decision core over one content row: an `openingCapital:` key. */
export function contentSitesOf(file: string, source: string): FaucetSite[] {
  const out: FaucetSite[] = [];
  source.split("\n").forEach((l, i) => {
    if (/^\s*openingCapital\s*:/.test(l)) out.push({ kind: "content", file, line: i + 1, where: "openingCapital" });
  });
  return out;
}

function* walk(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".") || entry === "node_modules" || entry === "__tests__" || entry === "dist") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

export function census(): FaucetSite[] {
  const out: FaucetSite[] = [];
  const rel = (f: string) => relative(REPO_ROOT, f).split("\\").join("/");
  for (const f of walk(KERNEL)) {
    if (f.endsWith(".ts") && !f.endsWith(".test.ts")) out.push(...codeSitesOf(rel(f), readFileSync(f, "utf8")));
  }
  if (existsSync(CONTENT)) {
    for (const pack of readdirSync(CONTENT).sort()) {
      const src = join(CONTENT, pack, "src");
      for (const f of walk(src)) {
        if (f.endsWith(".ts") && !f.endsWith(".test.ts")) out.push(...codeSitesOf(rel(f), readFileSync(f, "utf8")));
      }
      const content = join(CONTENT, pack, "content");
      for (const f of walk(content)) {
        if (!f.endsWith(".yaml")) continue;
        const text = readFileSync(f, "utf8");
        if (f.includes(`${join(content, "settings")}`)) out.push(...settingSitesOf(rel(f), text));
        else out.push(...contentSitesOf(rel(f), text));
      }
    }
  }
  return out.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}

function main(): void {
  const mode = process.argv.find((a) => a.startsWith("--")) ?? "--lint";
  const sites = census();
  if (mode === "--report") {
    for (const s of sites) console.log(`  ${s.kind.padEnd(8)} ${s.file}:${s.line}  ${s.where}`);
    console.log(`\n${sites.length} authored faucet(s); the ceiling is ${FAUCET_CEILING}`);
    return;
  }
  if (sites.length > FAUCET_CEILING) {
    console.error(
      `\n✖ lint:no-authored-faucet — ${sites.length} authored faucet(s); the ceiling is ${FAUCET_CEILING}.\n\n` +
        `  All money comes from one reserve, by two published rules. A ` +
        `number in a row, a setting or a controller that a code site turns ` +
        `into a mint is a faucet nobody chose. The treasury APPROPRIATES ` +
        `from what the perpetual rule bought; a business opens on the ` +
        `treasury's advance; a player arrives on their Note; the Governor ` +
        `tunes rows and records an override. Nothing else mints.\n`,
    );
    for (const s of sites) console.error(`  ${s.kind.padEnd(8)} ${s.file}:${s.line}  ${s.where}`);
    process.exit(1);
  }
  console.log(`lint:no-authored-faucet — ${sites.length} authored faucet(s) (ceiling ${FAUCET_CEILING})`);
}

if (process.argv[1]?.includes("check-no-authored-faucet")) main();
