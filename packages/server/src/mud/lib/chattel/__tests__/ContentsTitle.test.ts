/**
 * ⭐ ContentsTitle — whose a liquid is, by agreement (the communal-oven
 * rule, potash): untitled lots make no claim, disagreeing ones make it
 * nobody's, and nobody's stays nobody's.
 */
import { describe, it, expect } from 'vitest';
import { ContentsTitle } from '../ContentsTitle';
import type { ChattelOwner } from '../ChattelRecord';

const ALICE: ChattelOwner = { kind: 'player', templatePath: '/platform/agent/Avatar/alice' };
const BOB: ChattelOwner = { kind: 'player', templatePath: '/platform/agent/Avatar/bob' };

describe('ContentsTitle', () => {
  it('rain makes no claim: your lye topped up with it is still yours', () => {
    expect(new ContentsTitle(ALICE).with(undefined).owner()).toEqual(ALICE);
    expect(new ContentsTitle(undefined).with(ALICE).owner()).toEqual(ALICE);
  });

  it('the same owner twice is that owner', () => {
    expect(new ContentsTitle(ALICE).with({ ...ALICE }).owner()).toEqual(ALICE);
  });

  it('two owners make it nobody\'s — and it stays nobody\'s', () => {
    const mixed = new ContentsTitle(ALICE).with(BOB);
    expect(mixed.claimed()).toBeNull();
    expect(mixed.with(ALICE).claimed()).toBeNull();
    expect(mixed.with(undefined).claimed()).toBeNull();
  });

  it('nothing titled is no claim at all', () => {
    expect(new ContentsTitle(undefined).with(undefined).claimed()).toBeUndefined();
    expect(new ContentsTitle(undefined).owner()).toBeNull();
  });
});
