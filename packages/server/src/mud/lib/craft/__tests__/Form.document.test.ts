/**
 * A form word is a document, resident whenever the instrument that lists
 * it is (documents path identity, D7): `setForms` awaits each load, and a
 * synchronous read of a form nothing loaded throws by name.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Form } from '../FormSpec';
import { FormingMixin } from '../Forming';
import { Idea } from '../../stuff/Idea';
import { DocumentApi } from '../../../api/document';
import { DocumentNotResidentError } from '../../errors';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { StoredDocument } from '../../document/StoredDocument';
import { CraftingApi } from '../../../api/crafting';

const MUG = '/test/forms/mug';

class TestWheel extends FormingMixin(Idea) {
  static _mixinName = 'TestFormingHost';
}

afterEach(() => vi.restoreAllMocks());

describe('Form — resident with its instrument', () => {
  it('⭐ the instrument’s setter loads every form it lists; a sync read finds it at once', async () => {
    vi.spyOn(DocumentApi, 'read').mockResolvedValue({
      getPath: () => MUG,
      getKind: () => 'form',
      getData: () => ({ key: 'mug', formClass: 'open', capacityL: 0.5 }),
    } as unknown as StoredDocument);
    const wheel = makeStuff(() => new TestWheel());
    await wheel.setForms([MUG]);
    expect(CraftingApi.forms().need(MUG).key).toBe('mug');
  });

  it('an instrument listing a path with no form fails at the setter, naming it', async () => {
    vi.spyOn(DocumentApi, 'read').mockResolvedValue(null);
    const wheel = makeStuff(() => new TestWheel());
    await expect(wheel.setForms(['/test/forms/nothing'])).rejects.toThrow(/nothing/);
  });

  it('a sync read of a form nothing loaded throws DocumentNotResidentError', () => {
    expect(() => CraftingApi.forms().need('/test/forms/never')).toThrow(DocumentNotResidentError);
  });

  it('refuses a form class outside the five', () => {
    expect(() => CraftingApi.forms().parse({ formClass: 'sphere' }, '/t/forms/x')).toThrow(/formClass/);
  });
});
