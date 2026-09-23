/**
 * check-no-authored-faucet's pure decision cores: a mint outside the
 * allowlisted rules is a faucet; the allowlisted rule is not; a call to
 * an allowlisted seam from elsewhere IS; a retired settings key and an
 * `openingCapital:` row key are faucets. The census may fall, never rise.
 */

import '../../src/test-bootstrap';
import { describe, it, expect } from 'vitest';
import {
  codeSitesOf,
  settingSitesOf,
  contentSitesOf,
  enclosingFunctionAt,
  census,
  FAUCET_CEILING,
} from '../check-no-authored-faucet';

describe('check-no-authored-faucet', () => {
  it('⭐ fires on a mint in a function that is not one of the two rules or the override', () => {
    const src = [
      'async function ensureVenueAccountImpl(): Promise<void> {',
      '  await postTransaction("mint", [',
      '  ]);',
      '}',
    ].join('\n');
    expect(codeSitesOf('BankingLogic.ts', src)).toEqual([
      { kind: 'code', file: 'BankingLogic.ts', line: 2, where: 'BankingLogic.ts#ensureVenueAccountImpl' },
    ]);
  });

  it('the two rules and the recorded override are allowed; the same call from a controller is not', () => {
    const rule = 'async function reconcilePerpetualImpl(): Promise<void> {\n  await postTransaction("mint", [\n  ]);\n}';
    expect(codeSitesOf('BankingLogic.ts', rule)).toEqual([]);
    const ctrl = 'export default class ReserveController {\n  async mint(): Promise<void> {\n    await BankingApi.mint(account, amount);\n  }\n}';
    expect(codeSitesOf('ReserveController.ts', ctrl)).toEqual([
      { kind: 'code', file: 'ReserveController.ts', line: 3, where: 'ReserveController.ts#mint' },
    ]);
    // A call to the harness seam from anywhere but the seam itself counts.
    const embody = 'export default class EmbodyController {\n  async commit(): Promise<void> {\n    await BankingApi.issueCash(avatar, amount, "onboarding");\n  }\n}';
    expect(codeSitesOf('EmbodyController.ts', embody)).toHaveLength(1);
  });

  it('a DEFINITION line is not a call; a comment is not a site', () => {
    const src = 'async function issueCashImpl(): Promise<void> {\n  // postTransaction("mint" — the comment\n}';
    expect(codeSitesOf('BankingLogic.ts', src)).toEqual([]);
    expect(enclosingFunctionAt(['const x = 1;'], 0)).toBe('<module>');
  });

  it('a retired settings key and an authored openingCapital are faucets', () => {
    expect(settingSitesOf('banking.yaml', '  - key: banking.openingCapital\n    value: "20000"\n  - key: banking.salesTaxRate\n')).toEqual([
      { kind: 'setting', file: 'banking.yaml', line: 1, where: 'banking.openingCapital' },
    ]);
    expect(contentSitesOf('business.yaml', 'data:\n  openingCapital: 500\n')).toEqual([
      { kind: 'content', file: 'business.yaml', line: 2, where: 'openingCapital' },
    ]);
  });

  it('the shipped census is at or below the ceiling', () => {
    expect(census().length).toBeLessThanOrEqual(FAUCET_CEILING);
  });
});
