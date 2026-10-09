/**
 * ⭐ **One record of verb affordances, split by what performs the act.**
 *
 * The bar's six working verbs used to be a single six-item list —
 * `pour stir strain garnish serve mix` — copied VERBATIM onto two rows,
 * the shaker's and the mixing glass's, as `capabilities[].verbs`. That
 * was the bar's verb set, not the shaker's: `garnish` and `serve` have
 * nothing to do with shaking. They lived there because those were the
 * two rows with a `capabilities` block to hang a list on, while the
 * stations that actually host the work — the back-bar and the well —
 * afforded nothing at all.
 *
 * With verbs as class statics the list has to be attributed, and each
 * verb now names one home:
 *
 *   - `pour`, `stir`   → the build VESSEL (`ManualBuildMixin`): what a
 *                        build is banked into and worked on.
 *   - `strain`         → the STRAINER: the instrument that strains.
 *   - `mix`, `serve`,
 *     `garnish`        → the STATION: whole-drink acts, done at the bar.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { ManualBuildMixin } from '@saxonberg/server/mud/lib/craft/ManualBuild';
import BarStation from '../thing/BarStation';
import Strainer from '../thing/Strainer';
import Muddler from '../thing/Muddler';

const V = (name: string) => `trade/hospitality/cmd/crafting/${name}.yaml`;

/** Every verb any bar class affords, flattened. */
function allAfforded(): string[] {
  const sources = [
    ManualBuildMixin(Good).commandContributions,
    BarStation.commandContributions,
    Strainer.commandContributions,
    Muddler.commandContributions,
  ];
  return sources.flatMap((c) => [...(c.environment ?? []), ...(c.peers ?? [])]);
}

describe('the bar affords each verb from exactly one place', () => {
  it('the station does the whole-drink acts — and the flair', () => {
    const peers = BarStation.commandContributions.peers ?? [];
    expect(peers).toEqual([
      V('mix'),
      V('serve'),
      V('garnish'),
      // ⭐⭐ `platform/cmd/social/flourish.yaml` — the fourth, and the only
      // one of the four that is a PLATFORM view named from this pack.
      //
      // `flourish` was the residue of a retired mechanism. It shipped as
      // the demonstration that band-gated verb CONFERRAL worked —
      // `FlourishController`'s docstring still said it was *"afforded
      // only through competence conferral (it is in no static
      // commandContributions)"* — and conferral was retired in !285:
      // `refreshConferrals` no longer exists in the source, and
      // `Discipline/mixology.yaml` went on carrying a rule that pushed a
      // verb to nobody. So the verb was afforded by NOTHING, and the
      // reachability sweep's census is what found it.
      //
      // ⭐ The retirement's own doctrine decided where it goes: *a band
      // must never confer a verb, because THE REFUSAL IS THE PROGRESSION
      // UI* — if something lifts a verb, the verb has to EXIST for you to
      // be told. So the RAIL affords it (the instrument affords the verb,
      // and this station already affords the three acts performed at it)
      // and Mixology competence LIFTS it, as a refusal in the controller
      // that names the band. A player at a bar learns there is something
      // there to get good at; an unknown verb teaches nobody.
      //
      // ⚠ A pack class naming a platform view is the shipped direction —
      // every trade's instrument confers the platform verbs it performs
      // (`pour`, `stir`, `heat`). The forbidden direction is the kernel
      // naming a pack's view.
      'platform/cmd/social/flourish.yaml',
    ]);
  });

  it('the strainer strains; the vessels do not', () => {
    expect(Strainer.commandContributions.peers).toEqual([V('strain')]);
    const build = ManualBuildMixin(Good).commandContributions;
    expect(build.peers ?? []).not.toContain(V('strain'));
    expect(BarStation.commandContributions.peers ?? []).not.toContain(V('strain'));
  });

  it('the build vessel banks and works the build', () => {
    const build = ManualBuildMixin(Good).commandContributions;
    expect(build.peers).toEqual([
      'platform/cmd/crafting/pour.yaml',
      'platform/cmd/crafting/stir.yaml',
    ]);
  });

  it('the muddler muddles, and claims nothing else', () => {
    expect(Muddler.commandContributions.peers).toEqual([V('muddle')]);
  });

  // ⭐ The regression that matters: no verb is claimed twice. This is
  // the property a second, row-level record could not have — and did
  // not have, since two rows carried the identical list.
  it('no verb is afforded by two different bar classes', () => {
    const all = allAfforded();
    const seen = new Map<string, number>();
    for (const v of all) seen.set(v, (seen.get(v) ?? 0) + 1);
    // environment + peers on one class is one home, not two.
    const duplicated = [...seen.entries()]
      .filter(([, n]) => n > 2)
      .map(([v]) => v);
    expect(duplicated).toEqual([]);
  });
});
