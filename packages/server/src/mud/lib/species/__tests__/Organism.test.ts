import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OrganismMixin } from '../Organism';
import Species from '../../../platform/idea/species/Species';
import { Idea } from '../../stuff/Idea';
import Thing from '../../stuff/Thing';
import { HasInteractiveMixin } from '../../connection/HasInteractive';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';

const OrganismThingBase = OrganismMixin(Thing);
class OrganismThing extends OrganismThingBase {}

/** A body somebody PLAYS — the only thing that distinguishes the two. */
const PlayedBodyBase = HasInteractiveMixin(OrganismMixin(Thing));
class PlayedBody extends PlayedBodyBase {}

/** Stand a world clock up; ages are dates, so they need one. */
function clock(): void {
  makeStuffAtPath(
    () => new WorldClockRegistry(),
    '/platform/idea/WorldClockRegistry',
  );
}

/** A species that HAS been timed — the thing that makes age confer. */
let timedSeq = 0;
function timedSpecies(): Species {
  // ⚠ Stamped, not bare: `setSpecies` stores the template PATH, so an
  // unstamped species binds nothing and every life stage reads null —
  // which would make this suite pass for the wrong reason.
  timedSeq += 1;
  const sp = makeStuffAtPath(
    () => new Species(),
    `/stuff/idea/species/_test/timed-${timedSeq}`,
  ) as Species;
  sp.setAgeCurve({ weanedAt: 60, matureAt: 400, agedAt: 3000, senescentAt: 5000 });
  return sp;
}

describe('OrganismMixin', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  it('composes onto Thing; Idea is not Organism', () => {
    const organism = makeStuff(() => new OrganismThing());
    const idea = makeStuff(() => new Idea());
    expect(MixinApi.isOrganism(organism)).toBe(true);
    expect(MixinApi.isOrganism(idea)).toBe(false);
    expect(MixinApi.hasMixin(organism, Mixins.Organism)).toBe(true);
  });

  it('lazy species resolution via templatePath', () => {
    const sapiens = makeStuff(() => new Species());
    sapiens.setBinomial('Homo sapiens');
    stampTemplatePathForTest(
      sapiens,
      '/stuff/idea/species/animalia/chordata/mammalia/primates/hominidae/homo/sapiens'
    );

    const organism = makeStuff(() => new OrganismThing());
    organism.setSpecies(sapiens);
    expect(organism._speciesPath).toBe(
      '/stuff/idea/species/animalia/chordata/mammalia/primates/hominidae/homo/sapiens'
    );
    expect(organism.getSpecies()).toBe(sapiens);
  });

  it('age + lifecycleState round-trip', () => {
    clock();
    const organism = makeStuff(() => new OrganismThing());
    organism.setAge(42);
    organism.setLifecycleState('alive');
    expect(organism.getAge()).toBeCloseTo(42, 5);
    expect(organism.getLifecycleState()).toBe('alive');
  });

  it('⭐ age is a DATE, not a counter — no clock means UNKNOWN, not newborn', () => {
    const organism = makeStuff(() => new OrganismThing());
    expect(organism.getBornAt()).toBe(0);
    expect(organism.getAgeDays()).toBe(0);
  });

  it('⚠ the DEAD do not get older — `diedAt` freezes the age it died at', () => {
    clock();
    const organism = makeStuff(() => new OrganismThing());
    organism.setAge(100);
    organism.setLifecycleState('dead');
    const atDeath = organism.getAgeDays();
    expect(organism.getDiedAt()).toBeGreaterThan(0);
    // The stamp is taken once, on the way in — a second call cannot move it.
    organism.setLifecycleState('dead');
    expect(organism.getAgeDays()).toBe(atDeath);
  });
});

/**
 * ⭐⭐ **A player's age confers NOTHING, and that is the whole design.**
 *
 * Players and NPCs share species rows — a played human and an innkeeper
 * are one `homo/sapiens` — so the authored curve cannot be what tells
 * them apart. What tells them apart is that **we do not model a player
 * character's biological arc**: their age is seniority, a number to say
 * out loud, and it must never become an input to a capability.
 *
 * ⚠ That is what makes parking a character worth exactly nothing, and it
 * is why the number can be honest wall-clock time instead of something
 * defended against being farmed.
 */
describe('seniority is not a life stage', () => {
  beforeEach(() => { StuffApi.clearAll(); });
  afterEach(() => { StuffApi.clearAll(); });

  it('⭐ an NPC of a timed species HAS a life stage, and it confers', () => {
    clock();
    const npc = makeStuff(() => new OrganismThing());
    npc.setSpecies(timedSpecies());
    npc.setAge(30);
    expect(npc.getLifeStage()).toBe('newborn');
    expect(npc.isMature()).toBe(false);
    npc.setAge(1000);
    expect(npc.getLifeStage()).toBe('adult');
    expect(npc.isMature()).toBe(true);
  });

  it('⚠⚠ a PLAYED body of the SAME species has none of it', () => {
    clock();
    const player = makeStuff(() => new PlayedBody());
    player.setSpecies(timedSpecies());
    player.setAge(1000);
    // Same species, same age, same curve.
    expect(player.getLifeStage()).toBeNull();
    expect(player.isMature()).toBe(false);
  });

  it('⭐ but the NUMBER is still readable — a birthday is worth having', () => {
    clock();
    const player = makeStuff(() => new PlayedBody());
    player.setAge(365);
    // Seniority: how long ago you arrived. It is the CONSEQUENCE that
    // stops, never the telling.
    expect(player.getAgeDays()).toBeCloseTo(365, 5);
    expect(player.getBornAt()).toBeGreaterThan(0);
  });

  // ⚠ Retitled by the merge: `SexedMixin` folded into `Organism`
  // on this branch, so there is no longer a mixin to leave uncomposed.
  // The behaviour is unchanged — an unset sex reads null.
  it('getSex returns null until a sex is set', () => {
    const organism = makeStuff(() => new OrganismThing());
    expect(organism.getSex()).toBeNull();
  });

  it('getSpecies returns null when path is unset', () => {
    const organism = makeStuff(() => new OrganismThing());
    expect(organism.getSpecies()).toBeNull();
  });
});
