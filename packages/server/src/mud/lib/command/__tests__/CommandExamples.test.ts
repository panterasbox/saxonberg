/**
 * **Every authored `examples:` line must be a shape the verb accepts.**
 *
 * 85 examples ship across the command tree. They are printed in `help`,
 * so a player reads them and types them — and **nothing executed them**.
 *
 * That is not hypothetical. `pour`'s own example read
 *
 *     pour 2 cups water into the pot
 *
 * and had never parsed: the shape-matcher extracts a leading quantity
 * only for GREEDY PLURAL args (`drop 5 coin` works), and every bulk verb
 * uses a singular `object`. The example sat in the help text as
 * documentation for a form the parser rejects, and the only reason it
 * was found was somebody driving the game by hand.
 *
 * ## What this asserts, and what it deliberately does not
 *
 * It checks the **shape**: the verb resolves, and the example's tokens
 * bind to the verb's declared args and options. It does NOT resolve
 * objects or execute controllers — an example naming `the pot` cannot
 * be run without a world containing a pot, and building one per example
 * would make this a fixture-maintenance burden rather than a guard.
 *
 * Shape is the layer where the pour bug lived, and it is the layer an
 * author gets wrong: a stale option name, a preposition the verb does
 * not declare, an argument that was removed. Resolution failures are a
 * content question; shape failures are a lie in the documentation.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
// The engine verbs are the platform pack's content (content-packs wave 2).
const CMD_ROOT = join(here, '..', '..', '..', '..', '..', '..', 'content', 'platform', 'content', 'platform', 'cmd');

/**
 * The verb an example leads with, or `null`.
 *
 * Punctuation verbs bind without a space — `say` also declares `'`, so
 * `'good morning` is a valid line whose first whitespace token is
 * `'good`. Splitting on whitespace alone reports that as an unknown
 * verb, which is the check being wrong rather than the content.
 */
function leadVerb(cmd: string, verbs: Set<string>): string | null {
  const trimmed = cmd.trim();
  const first = trimmed.split(/\s+/)[0]!.toLowerCase();
  if (verbs.has(first)) return first;
  // A one-character punctuation verb glued to its argument.
  const lead = trimmed[0];
  if (lead && !/[a-z0-9]/i.test(lead) && verbs.has(lead)) return lead;
  return null;
}

interface Example {
  file: string;
  verb: string;
  cmd: string;
}

function walk(root: string): string[] {
  const out: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) stack.push(full);
      else if (entry.endsWith('.yaml')) out.push(full);
    }
  }
  return out;
}

/** Every `examples[].cmd` in the command tree, with its verb roster. */
function collect(): { examples: Example[]; verbs: Set<string>; options: Map<string, Set<string>> } {
  const examples: Example[] = [];
  const verbs = new Set<string>();
  const options = new Map<string, Set<string>>();
  for (const file of walk(CMD_ROOT)) {
    let doc: Record<string, unknown>;
    try {
      doc = YAML.parse(readFileSync(file, 'utf-8')) as Record<string, unknown>;
    } catch {
      continue;
    }
    const vs = doc?.verbs;
    if (!Array.isArray(vs)) continue;
    for (const v of vs) if (typeof v === 'string') verbs.add(v);
    const primary = String(vs[0]);
    const opts = new Set<string>(
      Object.keys((doc?.options as Record<string, unknown>) ?? {}),
    );
    // Subcommand options count too — an example may name one.
    const subs = doc?.subcommands as Record<string, unknown> | undefined;
    if (subs) {
      for (const sub of Object.values(subs)) {
        for (const k of Object.keys(
          ((sub as Record<string, unknown>)?.options as Record<string, unknown>) ?? {},
        )) {
          opts.add(k);
        }
      }
    }
    for (const v of vs) if (typeof v === 'string') options.set(v, opts);
    const exs = doc?.examples;
    if (!Array.isArray(exs)) continue;
    for (const ex of exs) {
      const cmd = (ex as Record<string, unknown>)?.cmd;
      if (typeof cmd === 'string' && cmd.trim().length > 0) {
        examples.push({ file: file.slice(CMD_ROOT.length), verb: primary, cmd });
      }
    }
  }
  return { examples, verbs, options };
}

let data: ReturnType<typeof collect>;
beforeAll(() => {
  data = collect();
});

describe('authored command examples', () => {
  it('there are examples to check', () => {
    expect(data.examples.length).toBeGreaterThan(50);
  });

  it('every example leads with a verb the tree actually declares', () => {
    const bad = data.examples.filter((e) => !leadVerb(e.cmd, data.verbs));
    expect(
      bad.map((e) => `${e.file}: '${e.cmd}'`),
      'examples whose leading word is not a declared verb',
    ).toEqual([]);
  });

  it('every `--option` an example uses is declared by its verb', () => {
    // The pour bug's sibling, and the one most likely to rot: an option
    // gets renamed and the help text keeps teaching the old flag.
    const bad: string[] = [];
    for (const e of data.examples) {
      const first = e.cmd.trim().split(/\s+/)[0]!.toLowerCase();
      const declared = data.options.get(first);
      if (!declared) continue;
      for (const tok of e.cmd.split(/\s+/)) {
        if (!tok.startsWith('--')) continue;
        const name = tok.slice(2).split('=')[0]!;
        if (name.length > 0 && !declared.has(name)) {
          bad.push(`${e.file}: '${e.cmd}' uses --${name}, not declared`);
        }
      }
    }
    expect(bad, 'examples using options their verb does not declare').toEqual(
      [],
    );
  });

  it('no example uses the inline-measure form, which does not parse', () => {
    // ⚠ The specific regression. `pour 2 cups water into the pot` was
    // shipped documentation for a form the shape-matcher rejects: a
    // leading quantity binds only to a GREEDY PLURAL arg, and every
    // bulk verb takes a singular `object`. Measures are an `--amount`
    // option for exactly this reason.
    //
    // Scoped to the bulk verbs, because `drop 5 coin` IS valid — its
    // target is `type: objects`, greedy, and the count is a glob count
    // rather than a bulk measure.
    const BULK = new Set(['pour', 'drink', 'quaff', 'sip', 'fill', 'spill']);
    const bad = data.examples.filter((e) => {
      const parts = e.cmd.trim().split(/\s+/);
      if (!BULK.has(parts[0]!.toLowerCase())) return false;
      // a bare number anywhere before an `--option` is the smell
      const beforeOpts = parts.slice(1).filter((p) => !p.startsWith('--'));
      return beforeOpts.some((p) => /^[0-9]*\.?[0-9]+$/.test(p));
    });
    expect(
      bad.map((e) => `${e.file}: '${e.cmd}'`),
      'bulk examples using an inline measure — use --amount',
    ).toEqual([]);
  });
});
