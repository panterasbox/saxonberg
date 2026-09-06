/**
 * The wardrobe — named outfits, zero new verbs.
 *
 * ⚠ The last two tests here are **source-shape** tests, and they are the
 * point of the wave as much as the mechanism is: `wear set` had to be a
 * STANZA on the shipped `wear` view, and `dress` had to stay unclaimed
 * (settled with build-3, reserved for the butchery pack). Both are the
 * kind of constraint that is trivially true today and silently violated
 * six months from now, so they are asserted against the shipped YAML
 * rather than remembered.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import { WardrobeMixin } from '../Wardrobe';
import { Idea } from '../../stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestWardrobe extends WardrobeMixin(Idea) {}

const here = dirname(fileURLToPath(import.meta.url));
const CMD_ROOT = join(
  here, '..', '..', '..', '..', '..', '..',
  'content', 'platform', 'content', 'platform', 'cmd',
);

function allViews(root: string): Array<{ file: string; doc: Record<string, unknown> }> {
  const out: Array<{ file: string; doc: Record<string, unknown> }> = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) stack.push(full);
      else if (entry.endsWith('.yaml')) {
        out.push({
          file: full,
          doc: (YAML.parse(readFileSync(full, 'utf-8')) ?? {}) as Record<
            string,
            unknown
          >,
        });
      }
    }
  }
  return out;
}

describe('WardrobeMixin — the variable-key escape hatch', () => {
  afterEach(() => StuffApi.clearAll());

  it('is registered and narrows', () => {
    const w = makeStuff(() => new TestWardrobe());
    expect(MixinApi.isWardrobe(w)).toBe(true);
    expect(MixinApi.hasMixin(w, Mixins.Wardrobe)).toBe(true);
  });

  it('round-trips a named set, matched the way a player types it', () => {
    const w = makeStuff(() => new TestWardrobe());
    w.setWardrobe('Work Clothes', ['shirt', 'trousers', 'coat']);
    expect(w.getWardrobe('work clothes')).toEqual([
      'shirt',
      'trousers',
      'coat',
    ]);
    expect(w.getWardrobeNames()).toEqual(['work clothes']);
  });

  it('stores KEYWORDS, so a set survives replacing the garment', () => {
    // ⭐ The whole reason it is not instance refs: buy a new shirt and
    // the old set still works, because the new one answers to the same
    // word — and a keyword resolving to nothing is skipped rather than
    // dangling.
    const w = makeStuff(() => new TestWardrobe());
    w.setWardrobe('daily', ['shirt']);
    for (const entry of w.getWardrobe('daily')) {
      expect(typeof entry).toBe('string');
    }
  });

  it('an empty list forgets the set; removeWardrobe reports', () => {
    const w = makeStuff(() => new TestWardrobe());
    w.setWardrobe('gone', ['shirt']);
    w.setWardrobe('gone', []);
    expect(w.getWardrobeNames()).toEqual([]);
    expect(w.removeWardrobe('nothing')).toBe(false);
  });

  it('is a persistent field — it rides the holder snapshot, not a collection', () => {
    expect(TestWardrobe.fieldMeta.wardrobes?.persistent).toBe(true);
  });

  it('refuses an empty name and a non-record bulk set', () => {
    const w = makeStuff(() => new TestWardrobe());
    expect(() => w.setWardrobe('   ', ['shirt'])).toThrow(RangeError);
    expect(() =>
      w.setWardrobes([] as unknown as Record<string, string[]>),
    ).toThrow(TypeError);
  });
});

describe('the verb shape — sets ride a verb, they are not one', () => {
  /*
   * ⚠⚠ This suite used to assert ZERO NEW VERBS. Two shipped since —
   * `equip` and `unequip` — and that was a deliberate decision rather
   * than erosion: the covering ladder makes ORDER the engine's
   * knowledge while the interface made the player rediscover it one
   * refusal at a time, so an orchestrator that dresses you
   * innermost-first is the verb that owns a problem previously dumped
   * on the person least equipped to solve it. See `equip-slate.md`.
   *
   * ⭐⭐ And the four precise verbs STAYED. A draft made them aliases —
   * `equip` carrying `wear` and `wield`, `unequip` carrying
   * `remove`/`doff`/`unwield` — which collapses two mixins into one arg
   * and therefore **makes `wear sword` legal**, because an arg that
   * admits both cannot refuse either. That is what these tests now
   * pin: the narrow `requires:` per verb, which is the whole reason
   * they are still separate views.
   *
   * What survives untouched, and is what this suite really tested: a
   * saved set is a SUBCOMMAND of a dressing verb, never a verb of its
   * own.
   */
  function view(name: string): {
    verbs?: string[];
    controller?: string;
    subcommands?: Record<string, unknown>;
    fallthrough?: boolean;
    args?: Array<{ required?: boolean; requires?: string }>;
  } {
    return YAML.parse(
      readFileSync(join(CMD_ROOT, 'inventory', `${name}.yaml`), 'utf-8'),
    ) as never;
  }

  it('`equip.yaml` is the orchestrator, with set/sets as subcommands', () => {
    const doc = view('equip');
    expect(doc.verbs).toEqual(['equip']);
    expect(Object.keys(doc.subcommands ?? {}).sort()).toEqual(['set', 'sets']);
    // ⚠ `fallthrough` is what keeps bare `equip <item>` working once the
    // verb has subcommands: an unrecognised first token binds against
    // `args:` instead of erroring.
    expect(doc.fallthrough).toBe(true);
    // ⭐ The target is OPTIONAL — bare `equip` is the whole-kit form and
    // the main path, which is the entire point of the verb.
    expect(doc.args?.[0]?.required).toBe(false);
  });

  it('`unequip.yaml` is the other direction, and only that', () => {
    expect(view('unequip').verbs).toEqual(['unequip']);
  });

  it('⭐⭐ the four precise verbs keep their OWN narrow `requires:`', () => {
    /*
     * The reason they were not collapsed. `wear` may not be handed a
     * sword and `wield` may not be handed a coat, and that refusal is
     * the ARG's, which means it happens before any controller runs and
     * reads as a grammar error rather than as a rule.
     */
    const narrow: Array<[string, string[], string]> = [
      ['wear', ['wear'], 'WearableMixin'],
      ['wield', ['wield'], 'WieldableMixin'],
      ['remove', ['remove', 'doff'], 'WearableMixin'],
      ['unwield', ['unwield'], 'WieldableMixin'],
    ];
    for (const [name, verbs, requires] of narrow) {
      const doc = view(name);
      expect(doc.verbs, name).toEqual(verbs);
      expect(doc.args?.[0]?.requires, name).toBe(requires);
      // ⚠ Each names exactly ONE thing, unlike the orchestrators.
      expect(doc.args?.[0]?.required, name).toBe(true);
    }
    // ...whereas the orchestrators deliberately span both.
    for (const name of ['equip', 'unequip']) {
      expect(view(name).args?.[0]?.requires, name).toBe(
        'WearableMixin|WieldableMixin',
      );
    }
  });

  it('⭐ six views, TWO controllers — the act is one implementation', () => {
    /*
     * What the verbs share is the covering ladder, the fit gate, the
     * slot claim and the timing. Duplicating a controller per verb to
     * express a grammar difference would be duplicating all of that,
     * and it is how the two halves drift apart.
     */
    const on = (name: string): string => view(name).controller ?? '';
    for (const name of ['equip', 'wear', 'wield']) {
      expect(on(name), name).toBe('/platform/idea/cmd/inventory/EquipController');
    }
    for (const name of ['unequip', 'remove', 'unwield']) {
      expect(on(name), name).toBe(
        '/platform/idea/cmd/inventory/UnequipController',
      );
    }
  });

  it('⚠⚠ TEXTILES claims no `dress` — and medical still owns it alone', () => {
    /*
     * ⚠ **The requirement's premise was stale.** *"`dress` is not
     * taken"* was settled with build-3 and reserved for a future
     * butchery pack — but `medical/treat.yaml` has shipped
     * `verbs: [treat, bind, dress]` since the medic build, where it
     * means *dressing a wound*. So "unclaimed" was already false, and
     * the constraint as literally written is unsatisfiable.
     *
     * What it actually protects is checkable and is what this asserts:
     * **the wardrobe adds no verb**, so `dress` still resolves to
     * exactly one view and that view is medical's — the textiles build
     * neither took the word nor made it ambiguous.
     */
    const owners: string[] = [];
    for (const { file, doc } of allViews(CMD_ROOT)) {
      const words = [
        ...((doc.verbs as string[] | undefined) ?? []),
        ...((doc.aliases as string[] | undefined) ?? []),
      ];
      if (words.includes('dress')) owners.push(file);
    }
    expect(owners).toHaveLength(1);
    expect(owners[0]).toMatch(/medical[/\\]treat\.yaml$/);
  });

  it('nothing under `inventory/` claims a verb this build did not have', () => {
    // The wardrobe rode an existing view. If a later change reaches for
    // a verb instead, this is where it shows up.
    const inventoryVerbs = new Set<string>();
    for (const { doc } of allViews(join(CMD_ROOT, 'inventory'))) {
      for (const v of (doc.verbs as string[] | undefined) ?? []) {
        inventoryVerbs.add(v);
      }
    }
    expect(inventoryVerbs.has('wear')).toBe(true);
    expect(inventoryVerbs.has('dress')).toBe(false);
    expect(inventoryVerbs.has('outfit')).toBe(false);
    expect(inventoryVerbs.has('livery')).toBe(false);
  });
});
