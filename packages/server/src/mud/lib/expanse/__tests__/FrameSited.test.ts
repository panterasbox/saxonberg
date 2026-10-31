import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FrameSitedMixin } from '../FrameSited';
import { Idea } from '../../stuff/Idea';
import type { Stuff } from '../../stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

/**
 * ⭐ A fixed place standing at a position on a frame (river W13): the
 * citation is the FRAME's to read, and the frame is told the place stands
 * there once, the first time it is used — never at creation.
 */

class Landing extends FrameSitedMixin(Idea) {}

const RIVER = '/stuff/idea/Watercourse/test';
const cited: string[] = [];
let stood = 0;
const frame = {
  siteOf: (cite: string) => {
    cited.push(cite);
    return { frame: 'line', at: { course: 'test', km: 8.9, across: cite.endsWith(',right') ? 35 : 0 } };
  },
  getTemplatePath: () => RIVER,
  craft: () => [],
  onSiteStood: async () => {
    stood += 1;
  },
};

beforeEach(() => {
  StuffApi.clearAll();
  cited.length = 0;
  stood = 0;
  vi.spyOn(StuffApi, 'singleton').mockImplementation((async (p: string) => (p === RIVER ? frame : null)) as never);
  vi.spyOn(MixinApi, 'isLineFrame').mockImplementation(((x: unknown) => x === frame) as never);
});
afterEach(() => vi.restoreAllMocks());

describe('a place sited on a frame', () => {
  it('⭐ where it stands is the frame’s reading of a citation in the frame’s own grammar', async () => {
    const quay = makeStuff(() => new Landing());
    quay.setFrameSite({ frame: RIVER, cite: 'confluence+0.1,right', span: 0.2, name: 'quay' });
    const at = await quay.sitePosition();
    expect(cited).toEqual(['confluence+0.1,right']);
    expect(at).toMatchObject({ frame: 'line', at: { km: 8.9, across: 35 } });
  });

  it('⭐ the frame is told it stands there once, however often it is used', async () => {
    const quay = makeStuff(() => new Landing());
    quay.setFrameSite({ frame: RIVER, cite: 'confluence+0.1,left' });
    await Promise.all([quay.frameSiteStood(), quay.frameSiteStood()]);
    await quay.frameSiteStood();
    expect(stood).toBe(1);
  });

  it('a place on no frame stands nowhere, and nothing is told', async () => {
    const yard = makeStuff(() => new Landing());
    expect(await yard.sitePosition()).toBeNull();
    await yard.frameSiteStood();
    expect(stood).toBe(0);
  });
});
