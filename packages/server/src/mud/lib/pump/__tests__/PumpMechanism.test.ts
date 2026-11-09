/**
 * A pump mechanism is a document, resident whenever the pump that names it
 * is (documents path identity, D7): the pump's `mechanism` setter awaits the
 * load, and a synchronous read of a mechanism nothing loaded is an engine
 * defect, thrown by name.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { PumpMechanism } from '../PumpMechanism';
import { PumpingMixin } from '../Pumping';
import { Idea } from '../../stuff/Idea';
import { DocumentApi } from '../../../api/document';
import { DocumentNotResidentError } from '../../errors';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { StoredDocument } from '../../document/StoredDocument';

const PATH = '/test/pump-mechanisms/bellows-draw';

function doc(path: string, data: Record<string, unknown>): StoredDocument {
  return {
    getPath: () => path,
    getKind: () => 'pump-mechanism',
    getData: () => data,
  } as unknown as StoredDocument;
}

class TestPump extends PumpingMixin(Idea) {
  static _mixinName = 'TestPumpingHost';
}

afterEach(() => vi.restoreAllMocks());

describe('PumpMechanism — resident with its pump', () => {
  it('⭐ the pump’s setter loads the mechanism, so a sync read finds it immediately', async () => {
    const read = vi
      .spyOn(DocumentApi, 'read')
      .mockResolvedValue(doc(PATH, { name: 'bellows-draw', pulls: true }));
    const pump = makeStuff(() => new TestPump());
    await pump.setMechanism(PATH);
    expect(read).toHaveBeenCalledWith(PATH);
    expect(PumpMechanism.need(PATH).isPulling()).toBe(true);
    expect((await pump.mechanismRow())?.getName()).toBe('bellows-draw');
  });

  it('a row naming a path with no mechanism fails at the setter, naming it', async () => {
    vi.spyOn(DocumentApi, 'read').mockResolvedValue(null);
    const pump = makeStuff(() => new TestPump());
    await expect(pump.setMechanism('/test/pump-mechanisms/nowhere')).rejects.toThrow(
      /nowhere/,
    );
  });

  it('a sync read of a mechanism nothing loaded throws DocumentNotResidentError by path', () => {
    expect(() => PumpMechanism.need('/test/pump-mechanisms/never-read')).toThrow(
      DocumentNotResidentError,
    );
  });

  it('a mechanism must say whether it pulls', () => {
    expect(() => PumpMechanism.fromData({ name: 'x' }, '/t/pump-mechanisms/x')).toThrow(/pulls/);
  });
});
