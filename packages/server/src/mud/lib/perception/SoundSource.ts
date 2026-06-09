/**
 * SoundSourceMixin — anything that emits sound.
 *
 * Mirrors `SmellSourceMixin`'s shape: stored emission expressed as
 * dB amplitude + a string `character` for prose ("whistle",
 * "footsteps", "humming"). To stop emitting, set amplitude to zero;
 * to start, set it to a positive dB value.
 *
 * Hosts: Things (a ringing alarm clock, a whistling kettle, a
 * playing radio), Vessels, Locations.
 *
 * Persistence — scalar-default rule. Two scalar fields:
 * `emittedAmplitude` (number; dB) and `character` (string).
 *
 * Witness hook: `setEmittedAmplitude` / `setCharacter` fire
 * `onSoundSourceChanged` on the immediate environment when stored
 * values change.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { Quantity } from '../quantity';

export interface SoundSource {
  getEmittedAmplitude(): Quantity<'dB'>;
  setEmittedAmplitude(value: Quantity<'dB'> | number | string): void;
  getCharacter(): string;
  setCharacter(value: string): void;
}

export interface SoundSourceObserver {
  onSoundSourceChanged?(
    source: Stuff,
    oldAmplitude: Quantity<'dB'>,
    newAmplitude: Quantity<'dB'>,
    oldCharacter: string,
    newCharacter: string,
  ): void;
}

export function SoundSourceMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class SoundSourceMixin extends Base {
    static _mixinName = 'SoundSourceMixin';
    static persistentFields = ['emittedAmplitude', 'character'];

    private _emittedAmplitude: number = 0;
    private _character: string = '';

    protected get emittedAmplitude(): number {
      return this._emittedAmplitude;
    }
    protected set emittedAmplitude(value: number) {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new TypeError(
          `SoundSourceMixin.emittedAmplitude must be a finite number, got ${value}`,
        );
      }
      this._emittedAmplitude = value;
    }

    protected get character(): string {
      return this._character;
    }
    protected set character(value: string) {
      if (typeof value !== 'string') {
        throw new TypeError(
          `SoundSourceMixin.character must be a string, got ${typeof value}`,
        );
      }
      this._character = value;
    }

    getEmittedAmplitude(): Quantity<'dB'> {
      return Quantity.of(this._emittedAmplitude, 'dB');
    }

    setEmittedAmplitude(value: Quantity<'dB'> | number | string): void {
      const db = coerceDbInput(value);
      const prev = this._emittedAmplitude;
      this._emittedAmplitude = db;
      if (prev !== db) {
        fireOnSoundSourceChanged(
          this as unknown as Stuff,
          Quantity.of(prev, 'dB'),
          Quantity.of(db, 'dB'),
          this._character,
          this._character,
        );
      }
    }

    getCharacter(): string {
      return this._character;
    }

    setCharacter(value: string): void {
      if (typeof value !== 'string') {
        throw new TypeError(
          `SoundSourceMixin.setCharacter: must be a string, got ${typeof value}`,
        );
      }
      const prev = this._character;
      this._character = value;
      if (prev !== value) {
        const amp = Quantity.of(this._emittedAmplitude, 'dB');
        fireOnSoundSourceChanged(
          this as unknown as Stuff,
          amp,
          amp,
          prev,
          value,
        );
      }
    }
  };
}

function coerceDbInput(value: Quantity<'dB'> | number | string): number {
  if (value instanceof Quantity) {
    if (value.unit !== 'dB') {
      throw new TypeError(
        `SoundSourceMixin: expected Quantity<'dB'>, got Quantity<'${value.unit}'>`,
      );
    }
    return value.rawValue();
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(
        `SoundSourceMixin: emitted amplitude must be a finite number, got ${value}`,
      );
    }
    return value;
  }
  if (typeof value === 'string') {
    return Quantity.parse(value, 'dB').rawValue();
  }
  throw new TypeError(
    `SoundSourceMixin: emitted amplitude must be Quantity<'dB'>, number, or tag string`,
  );
}

function fireOnSoundSourceChanged(
  source: Stuff,
  oldAmp: Quantity<'dB'>,
  newAmp: Quantity<'dB'>,
  oldCharacter: string,
  newCharacter: string,
): void {
  if (!MixinApi.isContainable(source)) return;
  const env = source.getContainer() as Partial<SoundSourceObserver> | null;
  if (!env) return;
  // Optional witness: any environment may opt into the observer
  // contract by defining the hook; no mixin gates it, so a
  // structural presence check is the only available seam.
  const hook = env.onSoundSourceChanged;
  if (typeof hook !== 'function') return;
  hook.call(env, source, oldAmp, newAmp, oldCharacter, newCharacter);
}
