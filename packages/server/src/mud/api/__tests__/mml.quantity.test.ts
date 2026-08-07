/**
 * `<quantity>` — the measured-value tag's registration and security
 * posture.
 *
 * The tag has been emitted by `Quantity.buildMarkup` since the quantity
 * substrate landed, but was in NO tag vocabulary: `isKnownTag` returned
 * false, so by the documented rule it was a *component candidate* whose
 * name resolves to the module path `/lib/wiki/components/quantity`.
 * These tests pin the registration and, more importantly, pin that it
 * never becomes inert.
 *
 * ⚠ The inert question is not cosmetic. `<quantity>` is a factual claim
 * about the world on the server's authority — the canonical numeric an
 * instrument produced. A player who could write it literally could
 * forge instrument data, which discredits every honest reading beside
 * it. See `docs/subsystems/messaging.md`.
 */

import { describe, it, expect } from 'vitest';
import { Mml } from '../mml';
import {
  KNOWN_TAGS,
  INERT_TAGS,
  passthroughAllows,
  isComponentCandidate,
  type TagPolicy,
} from '../mml/tags';

describe('<quantity> — registration', () => {
  it('is a known tag', () => {
    expect(KNOWN_TAGS.has('quantity')).toBe(true);
    expect(Mml.isKnownTag('quantity')).toBe(true);
  });

  it('is no longer a component candidate — the name is not a module path', () => {
    // The regression this build closes: an unregistered safe-identifier
    // tag resolves as `/lib/wiki/components/<name>`.
    expect(isComponentCandidate('quantity')).toBe(false);
  });
});

describe('<quantity> — it must never be inert', () => {
  it('is absent from INERT_TAGS', () => {
    expect(INERT_TAGS.has('quantity')).toBe(false);
  });

  it('is refused by the none / spoiler / inert passthrough policies', () => {
    for (const policy of ['none', 'spoiler', 'inert'] as TagPolicy[]) {
      expect(passthroughAllows(policy, 'quantity')).toBe(false);
    }
  });

  it('sits on the same side of the line as <speech>', () => {
    // Both are authority claims: speech attributes words, quantity
    // attributes a measurement. If one is ever made inert without the
    // other, that is a drift worth failing on.
    for (const policy of ['none', 'spoiler', 'inert'] as TagPolicy[]) {
      expect(passthroughAllows(policy, 'quantity')).toBe(
        passthroughAllows(policy, 'speech')
      );
    }
  });
});

describe('<quantity> — flatten', () => {
  it('yields its children verbatim, so a bare client reads the prose', () => {
    expect(
      Mml.flatten(
        '<quantity channel="thermal" unit="degC" value="1240">1240 °C</quantity>'
      )
    ).toBe('1240 °C');
  });

  it('flattens identically with and without the reading attributes', () => {
    // Pins the contract against the `default` branch being shadowed by
    // a case added above it: the attributes are metadata, never prose.
    const bare = Mml.flatten('<quantity unit="kg" value="3">3 kg</quantity>');
    const rich = Mml.flatten(
      '<quantity channel="mass" unit="kg" value="3" via="a balance" ' +
        'lo="0" hi="10">3 kg</quantity>'
    );
    expect(bare).toBe('3 kg');
    expect(rich).toBe('3 kg');
  });

  it('flattens inside surrounding prose', () => {
    expect(
      Mml.flatten(
        'The forge sits at <quantity channel="thermal" unit="degC" ' +
          'value="1240">1240 °C</quantity> right now.'
      )
    ).toBe('The forge sits at 1240 °C right now.');
  });
});
