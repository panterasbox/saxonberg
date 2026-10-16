/**
 * check-self-contributions — assert the gate FIRES on each dead shape and
 * stays quiet on every live one (the shipped-broken-gate clause: a gate
 * proven only by staying green may have silently stopped matching).
 */

import { describe, it, expect } from 'vitest';
import {
  selfDeclarationsIn,
  mixinsComposedBy,
  deadSelfDeclarations,
  type ReceiverQuestions,
  type SelfDeclaration,
} from '../check-self-contributions';

describe('selfDeclarationsIn — reading the statics', () => {
  it('reads a class\'s non-empty self list, and its owner', () => {
    const src = `
      export default class Bole extends Good {
        static commandContributions: CommandContributions = {
          self: ['trade/forestry/cmd/forestry/rive.yaml'],
          peers: [],
        };
      }`;
    const [d] = selfDeclarationsIn('/x/Bole.ts', src);
    expect(d).toMatchObject({ owner: 'Bole', mixin: false, verbs: ['trade/forestry/cmd/forestry/rive.yaml'] });
  });

  it('reads a mixin factory\'s returned class as a mixin', () => {
    const src = `
      export function AssembledMixin<T>(Base: T) {
        return class AssembledMixin extends Base {
          static commandContributions: CommandContributions = {
            self: ['platform/cmd/crafting/repair.yaml'],
          };
        };
      }`;
    expect(selfDeclarationsIn('/x/Assembled.ts', src)[0]).toMatchObject({ owner: 'AssembledMixin', mixin: true });
  });

  it('ignores an empty self, a spread-only list counts, and a doc comment showing the static is not one', () => {
    const src = `
      /**
       * \`static commandContributions = { self, inventory }\` — prose, not code.
       */
      class A extends B {
        static commandContributions = { self: [ /* nothing */ ], peers: ['x.yaml'] };
      }
      class C extends B {
        static commandContributions = { self: [...(B.commandContributions.self ?? [])] };
      }`;
    const ds = selfDeclarationsIn('/x/A.ts', src);
    expect(ds.map((d) => d.owner)).toEqual(['C']);
    expect(ds[0]!.verbs[0]).toMatch(/^\.\.\./);
  });
});

describe('mixinsComposedBy — a factory\'s own chain', () => {
  it('lists the mixins the returned class extends', () => {
    const src = `export function CharacterMixin(Base) {
      return class CharacterMixin extends PerceiverMixin(CommandGiverMixin(Base)) {};
    }`;
    expect(mixinsComposedBy(src, 'CharacterMixin')).toEqual(['PerceiverMixin', 'CommandGiverMixin']);
  });
});

describe('deadSelfDeclarations — who RECEIVES', () => {
  // The world: an avatar (a giver) composes CharacterMixin, which composes
  // ContainerMixin; a tool composes AssembledMixin and nothing that
  // receives `self`; a shadow and a hosted update are receivers.
  const classes = new Map([
    ['/lib/character/Avatar', '/f/Avatar.ts'],
    ['/platform/thing/AssembledTool', '/f/AssembledTool.ts'],
    ['/platform/thing/Bole', '/f/Bole.ts'],
    ['/platform/shadow/Hood', '/f/Hood.ts'],
    ['/platform/idea/CommsUpdate', '/f/CommsUpdate.ts'],
  ]);
  const composesTable: Record<string, string[]> = {
    '/lib/character/Avatar': ['CommandGiverMixin', 'CharacterMixin'],
    '/platform/thing/AssembledTool': ['AssembledMixin'],
    '/platform/idea/CommsUpdate': ['AetherHostedMixin', 'CommsMixin'],
  };
  const q: ReceiverQuestions = {
    isReceiver: (c) =>
      (composesTable[c] ?? []).includes('CommandGiverMixin') ||
      (composesTable[c] ?? []).includes('AetherHostedMixin') ||
      c === '/platform/shadow/Hood',
    composes: (c, m) => (composesTable[c] ?? []).includes(m),
    extends: () => false,
  };
  const graph = new Map([
    ['CharacterMixin', ['ContainerMixin']],
    ['AssembledMixin', ['DurableMixin']],
  ]);
  const pathOf = (f: string): string | null =>
    [...classes].find(([, file]) => file === f)?.[0] ?? null;
  const decl = (owner: string, file: string, mixin: boolean): SelfDeclaration => ({ owner, file, mixin, verbs: ['v.yaml'] });
  const dead = (d: SelfDeclaration): boolean =>
    deadSelfDeclarations([d], classes, graph, q, pathOf).length === 1;

  it('⭐⭐ a mixin composed only by non-receivers is dead (the AssembledMixin case)', () => {
    expect(dead(decl('AssembledMixin', '/f/Assembled.ts', true))).toBe(true);
  });

  it('⭐ a class that is no receiver is dead (the Bole case)', () => {
    expect(dead(decl('Bole', '/f/Bole.ts', false))).toBe(true);
  });

  it('a giver\'s own self is live', () => {
    expect(dead(decl('Avatar', '/f/Avatar.ts', false))).toBe(false);
  });

  it('a mixin a giver composes is live — directly, or through a mixin that composes it', () => {
    expect(dead(decl('CharacterMixin', '/f/Character.ts', true))).toBe(false);
    expect(dead(decl('ContainerMixin', '/f/Container.ts', true))).toBe(false);
  });

  it('a shadow and a hosted update are receivers', () => {
    expect(dead(decl('Hood', '/f/Hood.ts', false))).toBe(false);
    expect(dead(decl('CommsMixin', '/f/Comms.ts', true))).toBe(false);
  });

  it('a non-receiver base is live when a receiver extends it', () => {
    const base = decl('Bole', '/f/Bole.ts', false);
    const viaSub: ReceiverQuestions = { ...q, extends: (c, b) => c === '/lib/character/Avatar' && b === '/platform/thing/Bole' };
    expect(deadSelfDeclarations([base], classes, graph, viaSub, pathOf)).toEqual([]);
  });
});
