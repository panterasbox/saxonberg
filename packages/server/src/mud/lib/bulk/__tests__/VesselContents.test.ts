/**
 * **What a viewer sees in a vessel** — `Bulkable.getContentsDescriptionFor`.
 *
 * A flask is just a flask; a potion's identity lives on its MATERIAL
 * (magic-items D24/D26), which is what makes one identification cover
 * every flask of that draught. So both *looking at* a flask and
 * *identifying* one have to reach past the glass, and the reach has to
 * be per-viewer — the same flask reads as "an iridescent crimson
 * potion" to one character and "a veiling draught" to another.
 *
 * The rest of the bulk substrate is deliberately viewer-blind (a puddle
 * of water is a puddle of water), so the non-identifiable path must stay
 * byte-for-byte what it shipped as. That is half of what is asserted
 * here.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MixinApi } from '../../../api/mixin';
import { RecognitionApi } from '../../../api/recognition';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { BulkableMixin, type Bulkable } from '../Bulkable';
import { NamedMixin } from '../../description/Named';
import { ContainableMixin } from '../../spatial/Containable';
import { IdentifiableMixin } from '../../identification/Identifiable';
import { Appearance } from '../../identification/Appearance';
import { DescriptorBank } from '../../identification/DescriptorBank';
import {
  BeliefStoreMixin,
  IDENTIFICATION,
} from '../../belief/BeliefStore';
import { PerceptionMixin } from '../../perception/Perception';
import { SensorMixin } from '../../message/Sensor';
import { Idea } from '../../stuff/Idea';
import Material from '../../material/Material';
import { Stuff } from '../../stuff/Stuff';
import { Quantity } from '../../quantity';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';

class Viewer extends BeliefStoreMixin(PerceptionMixin(SensorMixin(Idea))) {}
class TestVessel extends BulkableMixin(ContainableMixin(NamedMixin(Idea))) {}
/** The potion shape: identity rides the MATERIAL, not the flask. */
class TestDraught extends IdentifiableMixin(Material) {}
/** A thing with no bulk at all — the `null` case. */
class Rock extends ContainableMixin(NamedMixin(Idea)) {}

let seq = 0;

/**
 * A one-word-per-axis bank, so the rendered descriptor is deterministic
 * — and deliberately **vowel-initial**, because the article bug this
 * covers ("a iridescent crimson potion") is one bank draw away at all
 * times with a hardcoded "a".
 */
function installBank(): void {
  const bank = new DescriptorBank();
  bank.key = 'potion';
  bank.primary = ['crimson'];
  bank.secondary = ['iridescent'];
  bank.primaryAxis = 'colour';
  bank.secondaryAxis = 'clarity';
  DescriptorBank.primeCache([bank]);
}

function makeDraught(path = `/stuff/idea/material/potion/test-${seq++}`): Material {
  return makeStuffAtPath(() => {
    const m = new TestDraught();
    m.setName('veiling draught');
    m.setKeywords(['draught']);
    m.setTags(['liquid']);
    m.setDescriptorClass('potion');
    m.setIdentifiedName('a veiling draught');
    return m;
  }, path) as unknown as Material;
}

/** A plain, non-identifiable liquid — the coffee case. */
function makePlainMaterial(name: string): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setKeywords([name]);
    m.setTags(['liquid']);
    m.setAppearance(`some ${name}`);
    return m;
  }, `/stuff/idea/material/bulk/${name}-${seq++}`) as unknown as Material;
}

function makeVessel(material?: Material, amountL = 0.25): Stuff & Bulkable {
  return makeStuff(() => {
    const v = new TestVessel();
    v.setName('flask');
    v.interiorBulk = true;
    v.setInteriorCapacity(Quantity.of(0.25, 'L'));
    if (material) {
      v.setBulkMaterial('interior', material);
      v.setBulkAmount('interior', Quantity.of(amountL, 'L'));
    }
    return v;
  }) as unknown as Stuff & Bulkable;
}

describe('getContentsDescriptionFor — the identifiable path', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 100000);
    Appearance.clearMemo();
    DescriptorBank.clearCache();
    installBank();
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    Appearance.clearMemo();
    DescriptorBank.clearCache();
  });

  it('reaches PAST the glass to the material', () => {
    const draught = makeDraught();
    const flask = makeVessel(draught);
    const viewer = makeStuff(() => new Viewer());

    // The flask itself is an ordinary vessel and knows nothing. What
    // comes back is a fact about the SUBSTANCE.
    const seen = flask.getContentsDescriptionFor(viewer);
    expect(seen).toBe('an iridescent crimson potion');
  });

  it('takes its ARTICLE from the phrase, not a hardcoded "a"', () => {
    // Half the words in a descriptor bank start with a vowel, so a
    // hardcoded article is a coin flip. This is that assertion, pinned
    // by a bank whose only draw is vowel-initial.
    const draught = makeDraught();
    const flask = makeVessel(draught);
    const viewer = makeStuff(() => new Viewer());
    expect(flask.getContentsDescriptionFor(viewer)).toMatch(/^an /);
  });

  it('is PER-VIEWER — one identification, two different flask readings', () => {
    const draught = makeDraught();
    const flask = makeVessel(draught);
    const knower = makeStuff(() => new Viewer());
    const stranger = makeStuff(() => new Viewer());

    knower.know(IDENTIFICATION, draught.getTemplatePath()!, {
      typeKnown: true,
      learnedGeneration: Appearance.currentGeneration().generation,
    });

    expect(flask.getContentsDescriptionFor(knower)).toBe(
      'a veiling draught',
    );
    expect(flask.getContentsDescriptionFor(stranger)).toBe(
      'an iridescent crimson potion',
    );
  });

  it('the record keys on the MATERIAL, so it covers every flask', () => {
    const draught = makeDraught('/stuff/idea/material/potion/shared');
    const first = makeVessel(draught);
    const second = makeVessel(draught);
    const knower = makeStuff(() => new Viewer());
    knower.know(IDENTIFICATION, draught.getTemplatePath()!, {
      typeKnown: true,
      learnedGeneration: Appearance.currentGeneration().generation,
    });

    // Identifying the substance once identifies it everywhere it is
    // poured. Decanting carries the knowledge because it carries the
    // substance.
    expect(first.getContentsDescriptionFor(knower)).toBe(
      'a veiling draught',
    );
    expect(second.getContentsDescriptionFor(knower)).toBe(
      'a veiling draught',
    );
  });

  it('agrees with RecognitionApi.describe on the material', () => {
    const draught = makeDraught();
    const flask = makeVessel(draught);
    const viewer = makeStuff(() => new Viewer());
    // Not a parallel rendering path — the SAME one, reached through the
    // vessel. A second implementation here is how the two drift.
    expect(flask.getContentsDescriptionFor(viewer)).toBe(
      RecognitionApi.describe(viewer, draught as unknown as Stuff),
    );
  });
});

describe('getContentsDescriptionFor — the shipped path, unchanged', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 100000);
    DescriptorBank.clearCache();
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    DescriptorBank.clearCache();
  });

  it('a non-identifiable material reads its appearance, viewer-blind', () => {
    const coffee = makePlainMaterial('coffee');
    const mug = makeVessel(coffee);
    const a = makeStuff(() => new Viewer());
    const b = makeStuff(() => new Viewer());
    // Coffee is coffee. There is nothing to learn about it, and the two
    // viewers must not diverge.
    expect(mug.getContentsDescriptionFor(a)).toBe('some coffee');
    expect(mug.getContentsDescriptionFor(b)).toBe('some coffee');
  });

  it('an EMPTY vessel reports nothing', () => {
    const flask = makeVessel(undefined);
    const viewer = makeStuff(() => new Viewer());
    // `null`, not "it holds nothing" — the caller decides whether to say
    // anything at all, and `look` says nothing.
    expect(flask.getContentsDescriptionFor(viewer)).toBeNull();
  });

  it('a vessel drained to empty reports nothing', () => {
    const coffee = makePlainMaterial('coffee');
    const mug = makeVessel(coffee, 0);
    const viewer = makeStuff(() => new Viewer());
    expect(mug.getContentsDescriptionFor(viewer)).toBeNull();
  });

  it('a host with NO slot reports nothing rather than throwing', () => {
    // `getBulk` throws for a slotless host, and for an ambiguous one
    // (both slots, no affordance named). The description pass runs on
    // every render, so the boring cases have to be silent — this is
    // what keeps the augmenter from taking a room description down.
    const slotless = makeStuff(() => {
      const v = new TestVessel();
      v.setName('brick');
      return v;
    }) as unknown as Stuff & Bulkable;
    const viewer = makeStuff(() => new Viewer());
    expect(() => slotless.getBulk()).toThrow();
    expect(slotless.getContentsDescriptionFor(viewer)).toBeNull();
  });

  it('a non-bulkable thing has no such method to call', () => {
    // The guard lives at the CALL SITE (`MixinApi.isBulkable`), which is
    // the shipped convention — the method is the mixin's, not a
    // universal read.
    const rock = makeStuff(() => new Rock());
    expect(MixinApi.isBulkable(rock)).toBe(false);
  });
});
