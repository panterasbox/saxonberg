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
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { BeliefStoreMixin, RECOGNITION } from '../../belief/BeliefStore';

const POTTER = '/test/agent/potter-device';

class Seal extends MarkedMixin(Good) {
  static _mixinName = 'MarkedDeviceTestSeal';
}
class Tile extends MarkedMixin(StackableMixin(Good)) {
  static _mixinName = 'MarkedDeviceTestTile';
}
/** Someone who remembers people by name. */
class Viewer extends BeliefStoreMixin(Good) {
  static _mixinName = 'MarkedDeviceTestViewer';
}

afterEach(() => StuffApi.clearAll());

describe('⭐ a device pressed from a tool into a thing', () => {
  it('takeDeviceFrom copies whose mark — and leaves the thing\'s own writing as it was (B106)', () => {
    const seal = makeStuff(() => new Seal());
    seal.setMarkDevice(POTTER);
    const label = makeStuff(() => new Seal());
    label.setMarkForm('inked');
    expect(label.takeDeviceFrom(seal)).toBe(POTTER);
    expect(label.getMarkDevice()).toBe(POTTER);
    // An inked label stamped is still an inked label: it needs light.
    expect(label.getMarkForm()).toBe('inked');
    expect(label.requiresLightToRead()).toBe(true);
  });

  it('a tool that bears no device presses nothing', () => {
    const blank = makeStuff(() => new Seal());
    const tile = makeStuff(() => new Seal());
    expect(tile.takeDeviceFrom(blank)).toBe('');
    expect(tile.getMarkDevice()).toBe('');
  });

  it('⭐ a look names the mark as the VIEWER knows it — never a stranger\'s name for free (B106)', () => {
    const marked = makeStuff(() => new Seal());
    marked.setLongDescription('A tile.');
    marked.setMarkDevice(POTTER);
    const stranger = makeStuff(() => new Viewer());
    expect(marked.getMarkupLong(stranger as never, {})).toMatch(/It bears a maker's mark you do not know\./);
    const friend = makeStuff(() => new Viewer());
    friend.know(RECOGNITION, POTTER, { knownAs: 'Hester' });
    expect(marked.getMarkupLong(friend as never, {})).toMatch(/It bears Hester's mark\./);
    const potter = makeStuffAtPath(() => new Viewer(), POTTER);
    expect(marked.deviceFor(potter)).toBe('your own mark');
    const bare = makeStuff(() => new Seal());
    bare.setLongDescription('A tile.');
    expect(bare.getMarkupLong(stranger as never, {})).not.toMatch(/mark/);
  });

  it('⭐ knowing whose mark it is does not need the maker in the world — and asking forgets nothing', () => {
    const marked = makeStuff(() => new Seal());
    marked.setMarkDevice('/test/agent/potter-away');
    const friend = makeStuff(() => new Viewer());
    friend.know(RECOGNITION, '/test/agent/potter-away', { knownAs: 'Hester' });
    expect(marked.deviceFor(friend)).toBe("Hester's mark");
    expect(friend.knownNameOf('/test/agent/potter-away')).toBe('Hester');
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
