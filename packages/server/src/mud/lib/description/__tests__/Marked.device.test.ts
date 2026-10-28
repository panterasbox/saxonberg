/**
 * ⭐ A DEVICE is a mark a thing bears (ceramics review, 2026-10-28): the
 * potter's stamp, a die's device, the device cut in the tool itself. One
 * home — `MarkedMixin` — whatever pressed it.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import Good from '../../stuff/Good';
import { MarkedMixin } from '../Marked';
import { StackableMixin } from '../../stuff/Stackable';
import { StuffApi } from '../../../api/stuff';
import { makeStuff, stampTemplatePathForTest } from '../../security/__tests__/test-setup';

const POTTER = '/test/agent/potter-device';

class Seal extends MarkedMixin(Good) {
  static _mixinName = 'MarkedDeviceTestSeal';
}
class Tile extends MarkedMixin(StackableMixin(Good)) {
  static _mixinName = 'MarkedDeviceTestTile';
}

afterEach(() => StuffApi.clearAll());

describe('⭐ a device pressed from a tool into a thing', () => {
  it('takeDeviceFrom copies whose mark, embossed — felt as well as seen', () => {
    const seal = makeStuff(() => new Seal());
    seal.setMarkDevice(POTTER);
    const tile = makeStuff(() => new Seal());
    expect(tile.takeDeviceFrom(seal)).toBe(POTTER);
    expect(tile.getMarkDevice()).toBe(POTTER);
    expect(tile.getMarkForm()).toBe('embossed');
    expect(tile.requiresLightToRead()).toBe(false);
  });

  it('a tool that bears no device presses nothing', () => {
    const blank = makeStuff(() => new Seal());
    const tile = makeStuff(() => new Seal());
    expect(tile.takeDeviceFrom(blank)).toBe('');
    expect(tile.getMarkDevice()).toBe('');
  });

  it('a look says whose mark it bears; a thing bearing none says nothing', () => {
    const marked = makeStuff(() => new Seal());
    marked.setLongDescription('A tile.');
    marked.setMarkDevice(POTTER);
    marked.setMarkForm('embossed');
    expect(marked.getMarkupLong(marked as never, {})).toMatch(/It bears .+'s mark\./);
    const bare = makeStuff(() => new Seal());
    bare.setLongDescription('A tile.');
    expect(bare.getMarkupLong(bare as never, {})).not.toMatch(/mark/);
  });

  it('a stamped stack and a bare one do not merge', () => {
    const a = makeStuff(() => new Tile());
    const b = makeStuff(() => new Tile());
    stampTemplatePathForTest(a, '/x/thing/tile');
    stampTemplatePathForTest(b, '/x/thing/tile');
    expect(a.canMergeWith(b)).toBe(true);
    b.setMarkDevice(POTTER);
    expect(a.canMergeWith(b)).toBe(false);
  });
});
