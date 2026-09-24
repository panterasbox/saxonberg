/**
 * ⭐ The fold, one case per row of the D5 table, driven through a real
 * `Floor` rather than a helper — because the fold's inputs come from four
 * different places (the material's tags, the room's geometry, the floor's
 * own flag, the surface slot) and a table test that supplied them directly
 * would prove the switch and nothing about the wiring.
 *
 * Every material here is invented in-test: `lint:test-content` forbids
 * kernel tests naming shipped paths, and the point of the fold is that it
 * reads TAGS, so a synthetic material with the right tags is a better
 * witness than granite.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import Floor from '../../../platform/thing/Floor';
import Material from '../../material/Material';
import { Quantity } from '../../quantity';
import { GROUND_KINDS } from '../GroundKind';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';

let seq = 0;

/** A material that exists only to carry a tag list. */
function mat(name: string, tags: string[]): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    return m;
  }, `/test/material/${name}-${seq}`) as unknown as Material;
}

interface FloorOpts {
  tags?: string[];
  onGrade?: boolean;
  worked?: boolean;
  wet?: boolean;
}

function floorOf(opts: FloorOpts): Floor {
  const f = makeStuff(() => {
    const raw = new Floor();
    if (opts.wet) raw.surfaceBulk = true;
    return raw;
  });
  if (opts.tags) f.setMaterial(mat('m', opts.tags));
  // `onGrade` is authored here rather than derived: the derivation is
  // `Floor.test.ts`'s subject, and pinning it keeps this file about the fold.
  f.setOnGrade(opts.onGrade ?? false);
  f.setWorked(opts.worked ?? false);
  if (opts.wet) {
    (f as unknown as { surfaceCapacity: Quantity<'L'> }).surfaceCapacity =
      Quantity.of(10, 'L');
    f.setBulkMaterial('surface', mat('rain', ['liquid']));
    f.setBulkAmount('surface', Quantity.of(2, 'L'));
  }
  return f;
}

describe('the ground fold — every row of the table', () => {
  it('mineral, on grade, undressed → rock', () => {
    expect(floorOf({ tags: ['rock'], onGrade: true }).getGroundKind()).toBe(
      'rock'
    );
  });

  it('mineral, on grade, worked → set-paving', () => {
    expect(
      floorOf({ tags: ['rock'], onGrade: true, worked: true }).getGroundKind()
    ).toBe('set-paving');
  });

  it('mineral, off grade → slab, dressed or not', () => {
    expect(floorOf({ tags: ['rock'], onGrade: false }).getGroundKind()).toBe(
      'slab'
    );
    expect(
      floorOf({ tags: ['ceramic'], onGrade: false, worked: true }).getGroundKind()
    ).toBe('slab');
  });

  it('all four mineral tags read the same', () => {
    for (const tag of ['rock', 'mineral', 'ceramic', 'glass']) {
      expect(floorOf({ tags: [tag], onGrade: true }).getGroundKind()).toBe(
        'rock'
      );
    }
  });

  it('earth, dry → earth', () => {
    expect(floorOf({ tags: ['earth'] }).getGroundKind()).toBe('earth');
  });

  it('earth, standing water → mire', () => {
    expect(floorOf({ tags: ['earth'], wet: true }).getGroundKind()).toBe('mire');
  });

  it('earth, worked → beaten-floor, wet or dry', () => {
    expect(floorOf({ tags: ['earth'], worked: true }).getGroundKind()).toBe(
      'beaten-floor'
    );
    expect(
      floorOf({ tags: ['earth'], worked: true, wet: true }).getGroundKind()
    ).toBe('beaten-floor');
  });

  it('granular, unbound → loose', () => {
    expect(floorOf({ tags: ['granular'] }).getGroundKind()).toBe('loose');
  });

  it('granular, worked → set-paving', () => {
    expect(
      floorOf({ tags: ['granular'], worked: true }).getGroundKind()
    ).toBe('set-paving');
  });

  it('timber → boards, on grade or off, worked or not', () => {
    expect(floorOf({ tags: ['wood'] }).getGroundKind()).toBe('boards');
    expect(
      floorOf({ tags: ['wood'], onGrade: true, worked: true }).getGroundKind()
    ).toBe('boards');
  });

  it('metal and alloy → plate', () => {
    expect(floorOf({ tags: ['metal'] }).getGroundKind()).toBe('plate');
    expect(floorOf({ tags: ['alloy'] }).getGroundKind()).toBe('plate');
  });
});

describe('the fold is total', () => {
  it('an invented material nothing recognises → contrived, list unchanged', () => {
    const f = floorOf({ tags: ['rubbery', 'pink', 'limbo'] });
    expect(f.getGroundKind()).toBe('contrived');
    // AC 18: nothing had to change to allow it.
    expect(GROUND_KINDS).toHaveLength(10);
  });

  it('no material at all → contrived rather than a throw', () => {
    expect(floorOf({}).getGroundKind()).toBe('contrived');
  });

  it('⭐ granular beats earth — sand is loose, not bare earth', () => {
    // The one judgement call in the precedence list, and the case it was
    // written for: `earth/sand` carries both tags.
    expect(floorOf({ tags: ['granular', 'earth', 'soil'] }).getGroundKind()).toBe(
      'loose'
    );
  });

  it('⭐ the same inputs give the same answer, unchosen (AC 17)', () => {
    const a = floorOf({ tags: ['rock'], onGrade: true, worked: true });
    const b = floorOf({ tags: ['rock'], onGrade: true, worked: true });
    expect(a.getGroundKind()).toBe(b.getGroundKind());
    expect(a.getGroundKind()).toBe('set-paving');
  });
});

describe('the derived sentence look appends', () => {
  it('names the material and the construction', () => {
    const f = makeStuff(() => new Floor());
    f.setMaterial(mat('granite', ['rock']));
    f.setOnGrade(true);
    f.setWorked(true);
    expect(f.groundPhrase()).toBe('It is granite, set as paving.');
  });

  it('is null when the floor is made of nothing', () => {
    expect(makeStuff(() => new Floor()).groundPhrase()).toBeNull();
  });
});
