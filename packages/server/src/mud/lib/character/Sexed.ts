/**
 * SexedMixin — biological sex for organisms whose species' sex-
 * determination system declares one.
 *
 * Sexed is biology, not gender. v1's gender model lives on
 * `GenderedMixin` (pronouns, social presentation); the two compose
 * orthogonally. A frog NPC composes `OrganismMixin + SexedMixin` (no
 * gender surface needed); a human Avatar composes both Sexed and
 * Gendered (sex from biology, pronouns from social presentation).
 *
 * The valid sex set is read from the host organism's species'
 * `sexDeterminationSystem` (`'xy'`, `'zw'`, `'environmental'`,
 * `'haplodiploid'`, `'hermaphroditic-simultaneous'`,
 * `'hermaphroditic-sequential'`, `'dioecious'`, `'monoecious'`,
 * `'none'`). The setter rejects values outside that set.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';

export interface Sexed {
  getSex(): string | null;
  setSex(value: string | null): void;
  getValidSexSet(): readonly string[];
}

/**
 * Map a species' `sexDeterminationSystem` string to its valid sex
 * value set. Centralized here rather than scattered so adding a new
 * system is one-place. v1 covers the systems we ship in the species
 * roster; new systems land alongside the species that need them.
 */
const VALID_SEX_BY_SYSTEM: Record<string, readonly string[]> = {
  xy: ['male', 'female', 'intersex'],
  zw: ['male', 'female', 'intersex'],
  environmental: ['male', 'female'],
  haplodiploid: ['male', 'female'],
  'hermaphroditic-simultaneous': ['hermaphrodite'],
  'hermaphroditic-sequential': ['male', 'female', 'hermaphrodite'],
  dioecious: ['male', 'female'],
  monoecious: ['male-and-female'],
  none: [],
};

export function SexedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class SexedMixin extends Base {
    static _mixinName = 'SexedMixin';
    static fieldMeta: FieldMeta = {
      sex: { persistent: true },
    };

    /** @authorable */
    public sex: string | null = null;

    public getSex(): string | null { return this.sex; }

    public setSex(value: string | null): void {
      if (value === null) {
        this.sex = null;
        return;
      }
      const valid = this.getValidSexSet();
      if (valid.length === 0) {
        // Species with `sexDeterminationSystem === 'none'` shouldn't
        // accept any sex value; constructed-host setSex is rejected.
        throw new Error(
          `SexedMixin.setSex: species' sex-determination system rejects all sex values; ` +
            `cannot set '${value}'.`
        );
      }
      if (!valid.includes(value)) {
        throw new Error(
          `SexedMixin.setSex: '${value}' not in valid set ` +
            `[${valid.join(', ')}] for species' sex-determination system.`
        );
      }
      this.sex = value;
    }

    /**
     * Lookup the valid sex set from the host's species'
     * sex-determination system. If the host doesn't compose
     * `OrganismMixin` (degenerate), or the species is unset, returns
     * an empty set — the setter then rejects every value.
     */
    public getValidSexSet(): readonly string[] {
      const self = this as unknown as Stuff;
      if (!MixinApi.isOrganism(self)) return [];
      const species = self.getSpecies();
      if (!species) return [];
      const system = species.getSexDeterminationSystem();
      return VALID_SEX_BY_SYSTEM[system] ?? [];
    }
  };
}
