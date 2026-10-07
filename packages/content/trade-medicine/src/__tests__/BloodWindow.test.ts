/**
 * BloodWindow (blood build D2) — a priced board that is also a donation
 * bank. The composition reaches BOTH mixins, and the board affords the
 * bank's verbs on top of the inherited menu/order.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import BloodWindow from '../thing/BloodWindow';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

afterEach(() => StuffApi.clearAll());

describe('BloodWindow', () => {
  it('composes DonationBankMixin AND PricedOfferMixin', () => {
    const w = makeStuff(() => new BloodWindow());
    expect(MixinApi.isDonationBank(w)).toBe(true);
    expect(MixinApi.isPricedOffer(w)).toBe(true);
  });

  it('affords issue/donate on top of the inherited menu/order', () => {
    const env = BloodWindow.commandContributions.environment ?? [];
    expect(env).toContain('trade/medicine/cmd/medical/issue.yaml');
    expect(env).toContain('trade/medicine/cmd/medical/donate.yaml');
    // The inherited board verbs are re-listed (getContributions shadows).
    expect(env).toContain('platform/cmd/retail/order.yaml');
  });
});
