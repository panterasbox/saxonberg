/**
 * check-idle-cadence — ⭐ **what the realm costs when nobody is looking.**
 *
 * Every `trigger: cadence:<n>` behaviour spec in the content tree arms its
 * own timer, forever, whether or not a single player is in the room. The
 * cost is not one timer — it is **Σ 60 000 / interval** across every
 * authored row, and nothing anywhere added it up. A row that drops a
 * `cadence:2s` on a brain nobody watches is indistinguishable from a row
 * that does the right thing, and it fails by looking normal.
 *
 * So: census today's total as the ceiling, and let it fall but never rise.
 * ⭐ The point of the ratchet is that it makes **stopping the growth**
 * affordable before anybody has time to migrate every row — the agent
 * coordination build moves the deliberative brains onto one beat per
 * agent, and this number is the meter that proves it.
 *
 * ## Rules
 *
 *   1. ⭐ CENSUS + RATCHET — Σ fires/min over every `cadence:` spec, plus
 *      (per row, once) the nightly beat of any row carrying `candidate`
 *      specs whose brains run unwatched. `IDLE_CADENCE_CEILING_PER_MIN`
 *      is today's figure; it may fall, never rise.
 *   2. ERROR — a `trigger:` the engine's own parser would throw on.
 *      `Behaved._parseTrigger` fails loud at wire time, which is a boot
 *      the author may never see; the same words are checked here.
 *   3. ERROR — a `cadence:` spec naming a brain whose file cannot be
 *      resolved. A brain path that resolves to nothing is wired with a
 *      `_warn` and then does nothing at all, forever.
 *
 * The arms that make the new `candidate` declarations mandatory
 * (`kind`, `summary`, `urgency`) are added as the build migrates the
 * brains — they are WARN while a wave is in flight and ERROR after.
 *
 * Usage:
 *   tsx scripts/check-idle-cadence.ts            # CI gate
 *   tsx scripts/check-idle-cadence.ts --report   # the inventory
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import {
  classFileOf,
  effectiveDoc,
  inheritanceIndex,
  packSources,
  type InheritanceIndex,
} from './pack-roots';

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SERVER_ROOT, '../..');
const CONTENT = join(REPO_ROOT, 'packages/content');

/**
 * ⭐ **Census-then-ratchet, over the AUTHORED TIMERS only.** Σ fires/min of
 * every `cadence:` spec in the content tree. Lower it whenever a wave moves
 * rows off their own timers; never raise it. A new row that wants a timer of
 * its own has to make room. At **0** since the agent-coordination build moved
 * every deliberative brain onto the beat.
 *
 * ⚠⚠ **This deliberately EXCLUDES the nightly beat, and the exclusion is the
 * design.** It did not at first, and the gate was wrong within one merge:
 * master arrived with two new agents — a public-works warden and an oilworks
 * hand — and the census went 17 → 18 **with no timer added anywhere**,
 * because each agent pays exactly one beat and the realm had grown by two.
 * ⭐ A ratchet over a figure that scales with content size is a gate that
 * refuses an NPC for existing: *a bare COUNT as a permanent gate is a refusal
 * nothing can lift*, and the author it refuses is the one doing the right
 * thing. The beat total is still MEASURED and still reported — see
 * `beatsPerMinOf` — but it is checked per-agent (at most one each), which is
 * the invariant that actually matters, and the operator's dial is
 * `behaviorBeatNightlyMs` rather than a number in this file.
 */
export const IDLE_CADENCE_CEILING_PER_MIN = 0;

/**
 * ⚠ A fact about the past: the census the day the gate landed. Never edit
 * it down — lowering this instead of the ceiling is how a ratchet quietly
 * stops being one.
 */
export const IDLE_CADENCE_HIGH_WATER = 263.2;

/**
 * The nightly beat an agent arms when it has at least one `candidate`
 * spec whose brain runs unwatched (`presenceGated = false`). Mirrors
 * `AppSettingKeys.behaviorBeatNightlyMs`'s shipped default — the gate
 * reads the authored default from the settings row when it is present.
 */
const BEAT_NIGHTLY_MS_DEFAULT = 120_000;

/**
 * ⚠ WARN until the migration lands: the declaration arms (`kind`,
 * `summary`, `urgency`, `claims`) are reported but not fatal while the
 * waves are in flight, and become ERROR in W4's closing commit. A gate
 * that fails on work nobody has done yet is a gate somebody turns off.
 */
const DECLARATIONS_ARE_GATES = true;

/** ⚠ Mirrors `TASK_KINDS` in `lib/behavior/Urgency.ts`. */
const TASK_KINDS = ['threat', 'body', 'work', 'social', 'filler'];

/** The kinds whose acts must say which hands they are using. */
const MUST_CLAIM = new Set(['threat', 'body', 'work']);

/** The two brains leaving the rail in W3 — deliberately un-declared. */
const LEAVING = new Set(['shifts', 'covers']);

/** The witness topics `Behaved._parseTrigger` accepts. */
const WITNESS_TRIGGERS = ['arrival', 'departure', 'emote', 'speech'];

let _inheritIdx: InheritanceIndex | null = null;
function inheritIdx(): InheritanceIndex {
  return (_inheritIdx ??= inheritanceIndex());
}

const SOURCES = packSources();

interface Spec {
  brain: string;
  trigger: string;
}

interface Row {
  path: string;
  file: string;
  specs: Spec[];
}

function contentRows(): Row[] {
  const out: Row[] = [];
  if (!existsSync(CONTENT)) return out;
  for (const pack of readdirSync(CONTENT).sort()) {
    const root = join(CONTENT, pack, 'content');
    if (!existsSync(root) || !statSync(root).isDirectory()) continue;
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const abs = join(dir, entry);
        if (statSync(abs).isDirectory()) {
          walk(abs);
          continue;
        }
        if (!entry.endsWith('.yaml')) continue;
        let parsed: unknown;
        try {
          parsed = YAML.parse(readFileSync(abs, 'utf8'));
        } catch {
          continue;
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          continue;
        }
        // ⚠ A child row states no `behaviors:` of its own, so reading the
        // raw field would skip every inheriting person SILENTLY.
        const raw = effectiveDoc(
          abs,
          parsed as Record<string, unknown>,
          inheritIdx(),
        );
        const data = (raw.data ?? {}) as Record<string, unknown>;
        if (!Array.isArray(data.behaviors)) continue;
        const specs: Spec[] = [];
        for (const entry of data.behaviors as Record<string, unknown>[]) {
          if (!entry || typeof entry !== 'object') continue;
          specs.push({
            brain: typeof entry.brain === 'string' ? entry.brain : '',
            trigger: typeof entry.trigger === 'string' ? entry.trigger : '',
          });
        }
        if (!specs.length) continue;
        out.push({
          path: '/' + relative(root, abs).replace(/\.yaml$/, ''),
          file: relative(REPO_ROOT, abs),
          specs,
        });
      }
    };
    walk(root);
  }
  return out;
}

/**
 * The authored `behavior.beatNightlyMs`, if the settings row carries one.
 * Reading it rather than hardcoding keeps the meter honest when an
 * operator moves the dial: the realm's idle cost IS the dial times the
 * rows.
 */
function nightlyBeatMs(): number {
  const row = join(
    CONTENT,
    'platform/content/settings/behavior.yaml',
  );
  if (!existsSync(row)) return BEAT_NIGHTLY_MS_DEFAULT;
  try {
    const doc = YAML.parse(readFileSync(row, 'utf8')) as Record<
      string,
      unknown
    >;
    const settings = (doc?.data ?? doc) as Record<string, unknown>;
    const values = (settings?.settings ?? settings) as Record<string, unknown>;
    const v = values?.['behavior.beatNightlyMs'];
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) && n > 0 ? n : BEAT_NIGHTLY_MS_DEFAULT;
  } catch {
    return BEAT_NIGHTLY_MS_DEFAULT;
  }
}

/** `cadence:<n>[ms|s|m]` → interval in ms, or null when not a cadence. */
export function cadenceMs(trigger: string): number | null {
  const m = /^cadence:(\d+)(ms|s|m)?$/.exec(trigger.trim());
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2] ?? 's';
  if (!Number.isFinite(n) || n <= 0) return null;
  return unit === 'ms' ? n : unit === 'm' ? n * 60_000 : n * 1000;
}

interface BrainDecl {
  name: string;
  file: string | null;
  kind: string | null;
  summary: string | null;
  discipline: string | null;
  claims: string[];
  declaresUrgency: boolean;
}

/**
 * What a brain declares, read from its SOURCE.
 *
 * ⭐ Regex over the file rather than an `import()`: a brain module pulls
 * the Api graph behind it, and a build-time gate that boots half the
 * engine to read five statics is a gate that becomes too slow to run.
 * The declarations are literals by contract (`satisfies BrainStatics`
 * with explicit annotations), so the text IS the value.
 */
const declCache = new Map<string, BrainDecl>();
function brainDecl(brainPath: string): BrainDecl {
  const cached = declCache.get(brainPath);
  if (cached) return cached;
  const name = brainPath.split('/').pop() ?? brainPath;
  const file = brainFile(brainPath);
  const decl: BrainDecl = {
    name,
    file,
    kind: null,
    summary: null,
    discipline: null,
    claims: [],
    declaresUrgency: false,
  };
  if (file) {
    const src = readFileSync(file, 'utf8');
    decl.kind = /static kind[^=]*=\s*['"]([a-z-]+)['"]/.exec(src)?.[1] ?? null;
    decl.summary =
      /static summary[^=]*=\s*(['"`])/.test(src) ? 'declared' : null;
    decl.discipline =
      /static discipline[^=]*=\s*['"]([a-z-]+)['"]/.exec(src)?.[1] ?? null;
    const claims = /static claims[^=]*=\s*\[([^\]]*)\]/.exec(src)?.[1] ?? '';
    decl.claims = [...claims.matchAll(/['"]([a-z]+)['"]/g)].map((m) => m[1]!);
    decl.declaresUrgency = /static (async )?urgency\s*\(/.test(src);
  }
  declCache.set(brainPath, decl);
  return decl;
}

/**
 * Every shipped Discipline key, read from the rows. A brain crediting a
 * Discipline nothing ships writes evidence nothing can read back.
 *
 * ⚠ Walks each pack's `content/` subtree ONLY. A walk rooted at
 * `packages/content` descends into every pack's `node_modules`, where the
 * workspace's symlinks make it effectively unbounded — the gate HANGS
 * rather than failing, which is the worst way for a gate to be wrong.
 */
let _disciplines: Set<string> | null = null;
function disciplines(): Set<string> {
  if (_disciplines) return _disciplines;
  const out = new Set<string>();
  if (!existsSync(CONTENT)) return (_disciplines = out);
  for (const pack of readdirSync(CONTENT)) {
    const root = join(CONTENT, pack, 'content');
    if (!existsSync(root) || !statSync(root).isDirectory()) continue;
    for (const abs of yamlFiles(root)) {
      let doc: unknown;
      try {
        doc = YAML.parse(readFileSync(abs, 'utf8'));
      } catch {
        continue;
      }
      const row = doc as Record<string, unknown> | null;
      if (!row || row.class !== '/platform/idea/Discipline') continue;
      const key = (row.data as Record<string, unknown> | undefined)?.key;
      if (typeof key === 'string') out.add(key);
    }
  }
  return (_disciplines = out);
}

/** Every `.yaml` under `dir`, recursively. */
function yamlFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) yamlFiles(abs, out);
    else if (entry.endsWith('.yaml')) out.push(abs);
  }
  return out;
}

/** Does the brain source declare it runs with nobody watching? */
const unwatchedCache = new Map<string, boolean>();
function runsUnwatched(brainPath: string): boolean {
  const cached = unwatchedCache.get(brainPath);
  if (cached !== undefined) return cached;
  let answer = false;
  const file = brainFile(brainPath);
  if (file) {
    const src = readFileSync(file, 'utf8');
    answer = /presenceGated\s*(?::[^=]*)?=\s*false/.test(src);
  }
  unwatchedCache.set(brainPath, answer);
  return answer;
}

/** The brain's source file, resolved the way the runtime resolves it. */
const brainFileCache = new Map<string, string | null>();
function brainFile(brainPath: string): string | null {
  const cached = brainFileCache.get(brainPath);
  if (cached !== undefined) return cached;
  let found: string | null = null;
  const candidate = classFileOf(brainPath, SOURCES);
  if (candidate && existsSync(candidate)) found = candidate;
  brainFileCache.set(brainPath, found);
  return found;
}

function main(): void {
  const report = process.argv.includes('--report');
  const rows = contentRows();
  const failures: string[] = [];
  const declArms: string[] = [];
  const namedBrains = new Set<string>();
  const nightly = nightlyBeatMs();

  let total = 0;
  const perRow = new Map<string, number>();
  const perBrain = new Map<string, number>();
  let cadenceSpecs = 0;
  let candidateSpecs = 0;
  let beatRows = 0;
  // ⚠ Charged SEPARATELY from `total`: the beat scales with how many agents
  // the realm has, so ratcheting it would refuse new content. See
  // IDLE_CADENCE_CEILING_PER_MIN.
  let beatTotal = 0;

  for (const row of rows) {
    let rowTotal = 0;
    let hasUnwatchedCandidate = false;
    for (const spec of row.specs) {
      const trigger = spec.trigger.trim();
      if (!trigger) {
        failures.push(`${row.file}: a behaviour spec with no 'trigger:'.`);
        continue;
      }
      if (spec.brain) namedBrains.add(spec.brain);
      const ms = cadenceMs(trigger);
      if (ms === null) {
        if (
          trigger !== 'engage' &&
          trigger !== 'candidate' &&
          !WITNESS_TRIGGERS.includes(trigger)
        ) {
          failures.push(
            `${row.file}: trigger '${trigger}' is not one the engine ` +
              `parses (cadence:<n>[ms|s|m] · candidate · engage · ` +
              `${WITNESS_TRIGGERS.join(' · ')}). It throws at wire time, ` +
              `in a boot the author may never read.`,
          );
        }
        if (trigger === 'candidate') {
          candidateSpecs++;
          if (spec.brain && runsUnwatched(spec.brain)) {
            hasUnwatchedCandidate = true;
          }
          if (spec.brain) {
            const d = brainDecl(spec.brain);
            if (!d.file) {
              failures.push(
                `${row.file}: candidate brain '${spec.brain}' resolves to ` +
                  `no source file.`,
              );
            } else if (!d.declaresUrgency) {
              // ⚠ A `candidate` spec over a brain with no `urgency` is
              // skipped at wire time with a warning: the row looks wired
              // and the brain never runs.
              failures.push(
                `${row.file}: '${spec.brain}' is wired as a candidate but ` +
                  `declares no 'urgency' — the spec is skipped at wire ` +
                  `time and the brain never runs.`,
              );
            }
          }
          continue;
        }
        continue;
      }
      cadenceSpecs++;
      if (spec.brain && !brainFile(spec.brain)) {
        failures.push(
          `${row.file}: brain '${spec.brain}' resolves to no source file. ` +
            `It is wired with a warning and then does nothing, forever.`,
        );
      } else if (spec.brain) {
        // ⭐ A brain that knows how much it wants the beat should not be
        // running its own timer: the whole point of the arbiter is that
        // one agent decides once, rather than N timers deciding N times.
        const d = brainDecl(spec.brain);
        if (d.declaresUrgency) {
          declArms.push(
            `${row.file}: '${spec.brain}' declares 'urgency' but is wired ` +
              `on '${trigger}' — it should be 'trigger: candidate'.`,
          );
        }
      }
      const perMin = 60_000 / ms;
      rowTotal += perMin;
      perBrain.set(spec.brain, (perBrain.get(spec.brain) ?? 0) + perMin);
    }
    // ⭐ One beat per AGENT, not per spec — that is the whole point of the
    // arbiter, so the meter must charge it once.
    if (hasUnwatchedCandidate) {
      beatRows++;
      beatTotal += 60_000 / nightly;
      perBrain.set('(the beat)', (perBrain.get('(the beat)') ?? 0) + 60_000 / nightly);
    }
    if (rowTotal > 0) perRow.set(row.file, rowTotal);
    total += rowTotal;
  }

  // ── the declaration audit, over every brain any row names ──────────
  for (const brainPath of [
    ...new Set([...perBrain.keys(), ...namedBrains]),
  ].sort()) {
    if (!brainPath || brainPath === '(the beat)') continue;
    const d = brainDecl(brainPath);
    if (!d.file || LEAVING.has(d.name)) continue;
    if (!d.kind) {
      declArms.push(`${brainPath}: declares no 'kind'.`);
    } else if (!TASK_KINDS.includes(d.kind)) {
      failures.push(
        `${brainPath}: kind '${d.kind}' is not a task kind ` +
          `(${TASK_KINDS.join(' · ')}).`,
      );
    }
    if (!d.summary) {
      // ⚠ 38 brains shipped with `label` repeating the filename, so the
      // author palette could say the name of a thing and nothing else.
      declArms.push(
        `${brainPath}: declares no 'summary' — the author palette can say ` +
          `its name and nothing about what it does.`,
      );
    }
    if (d.kind && MUST_CLAIM.has(d.kind) && d.claims.length === 0) {
      declArms.push(
        `${brainPath}: kind '${d.kind}' with no 'claims' — "it does not do ` +
          `two things at once" is only true if the act says which hands ` +
          `it is using.`,
      );
    }
    if (d.discipline && !disciplines().has(d.discipline)) {
      failures.push(
        `${brainPath}: discipline '${d.discipline}' has no shipped ` +
          `Discipline row, so nothing it credits can be read back.`,
      );
    }
  }

  if (declArms.length) {
    if (DECLARATIONS_ARE_GATES) failures.push(...declArms);
    else {
      console.warn(
        `\n⚠ lint:idle-cadence — ${declArms.length} declaration finding(s) ` +
          `(WARN until the migration lands):\n`,
      );
      for (const w of declArms) console.warn(`  ${w}`);
      console.warn('');
    }
  }

  const rounded = Math.round(total * 10) / 10;

  if (report) {
    const top = [...perRow.entries()].sort((a, b) => b[1] - a[1]);
    console.log(
      `Idle cost: ${rounded} fires/min from AUTHORED TIMERS ` +
        `(${cadenceSpecs} cadence spec(s)) — the ratcheted figure — plus ` +
        `${Math.round(beatTotal * 10) / 10}/min from the beat ` +
        `(${beatRows} agent(s) × one beat at ${nightly} ms), which scales ` +
        `with the realm and is the operator's dial, not a ceiling. ` +
        `${candidateSpecs} candidate spec(s).\n`,
    );
    console.log('By row (heaviest first):');
    for (const [file, n] of top.slice(0, 25)) {
      console.log(`  ${(Math.round(n * 10) / 10).toString().padStart(6)}  ${file}`);
    }
    console.log('\nBy brain:');
    for (const [brain, n] of [...perBrain.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(
        `  ${(Math.round(n * 10) / 10).toString().padStart(6)}  ${brain || '(no brain)'}`,
      );
    }
    console.log('');
  }

  if (rounded > IDLE_CADENCE_CEILING_PER_MIN) {
    failures.push(
      `the content tree fires ${rounded} behaviour beat(s) per minute from ` +
        `AUTHORED TIMERS with nobody watching, above the ceiling of ` +
        `${IDLE_CADENCE_CEILING_PER_MIN}. ⭐ The census may fall, never rise ` +
        `— a row that wants a timer of its own has to make room, and the ` +
        `answer is almost always 'trigger: candidate' so the row rides the ` +
        `one beat it already pays for. Run with --report to see which rows ` +
        `pay.`,
    );
  }

  if (failures.length) {
    console.error(`\n✖ lint:idle-cadence — ${failures.length} finding(s):\n`);
    for (const f of failures) console.error(`  ${f}\n`);
    process.exit(1);
  }
  console.log(
    `✔ lint:idle-cadence — ${rounded} fires/min from authored timers ` +
      `across ${perRow.size} row(s), at or under the ceiling of ` +
      `${IDLE_CADENCE_CEILING_PER_MIN}; plus ` +
      `${Math.round(beatTotal * 10) / 10}/min from ${beatRows} agent(s) × ` +
      `one beat, which is the dial and not a ceiling.`,
  );
}

if (process.argv[1] && /check-idle-cadence\.ts$/.test(process.argv[1])) main();
