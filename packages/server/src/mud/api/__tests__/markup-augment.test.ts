/**
 * `augmentMarkup` substrate tests — pipeline-level behavior in
 * isolation. End-to-end exercise (DetailedMixin contributing the
 * detail-key wrap, look prose + subscription projection both seeing
 * the wrapped text) lives in the LookController + Detailed tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { augmentMarkup, type MarkupAugmenter } from '../mml';
import { Idea } from '../../lib/stuff/Idea';
import { StuffApi } from '../stuff';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

describe('augmentMarkup', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it('returns the input unchanged when the host has no augmenters', () => {
    class HostA extends Idea {}
    const host = makeStuff(() => new HostA());
    const viewer = makeStuff(() => new HostA());
    expect(augmentMarkup('hello world', host, viewer)).toBe('hello world');
  });

  it('returns empty input unchanged (short-circuit, no walk)', () => {
    class HostA extends Idea {
      static markupAugmenters: MarkupAugmenter[] = [
        () => 'replaced',
      ];
    }
    const host = makeStuff(() => new HostA());
    const viewer = makeStuff(() => new HostA());
    expect(augmentMarkup('', host, viewer)).toBe('');
  });

  it('applies a single contributed augmenter to the input', () => {
    class HostB extends Idea {
      static markupAugmenters: MarkupAugmenter[] = [
        (text) => `[${text}]`,
      ];
    }
    const host = makeStuff(() => new HostB());
    const viewer = makeStuff(() => new HostB());
    expect(augmentMarkup('foo', host, viewer)).toBe('[foo]');
  });

  it('folds multiple augmenters in declaration order', () => {
    class HostC extends Idea {
      static markupAugmenters: MarkupAugmenter[] = [
        (text) => `${text}-A`,
        (text) => `${text}-B`,
        (text) => `${text}-C`,
      ];
    }
    const host = makeStuff(() => new HostC());
    const viewer = makeStuff(() => new HostC());
    expect(augmentMarkup('seed', host, viewer)).toBe('seed-A-B-C');
  });

  it('walks the prototype chain parent-first → child-last', () => {
    class HostParent extends Idea {
      static markupAugmenters: MarkupAugmenter[] = [
        (text) => `${text}+parent`,
      ];
    }
    class HostChild extends HostParent {
      static markupAugmenters: MarkupAugmenter[] = [
        (text) => `${text}+child`,
      ];
    }
    const host = makeStuff(() => new HostChild());
    const viewer = makeStuff(() => new HostChild());
    // Walker pushes parent-first; result is `seed+parent+child`.
    expect(augmentMarkup('seed', host, viewer)).toBe('seed+parent+child');
  });

  it('threads the viewer through to augmenters', () => {
    class Viewer extends Idea {}
    class HostV extends Idea {
      static markupAugmenters: MarkupAugmenter[] = [
        (text, _host, viewer) => `${text}-${viewer.stuffId}`,
      ];
    }
    const host = makeStuff(() => new HostV());
    const viewer = makeStuff(() => new Viewer());
    expect(augmentMarkup('foo', host, viewer)).toBe(`foo-${viewer.stuffId}`);
  });

  it('threads the host through to augmenters', () => {
    class HostH extends Idea {
      static markupAugmenters: MarkupAugmenter[] = [
        (text, host) => `${text}-${host.stuffId}`,
      ];
    }
    const host = makeStuff(() => new HostH());
    const viewer = makeStuff(() => new HostH());
    expect(augmentMarkup('foo', host, viewer)).toBe(`foo-${host.stuffId}`);
  });

  it('a parent class without its own slot is skipped (own-prop only)', () => {
    class HostParent extends Idea {
      // No markupAugmenters declared here.
    }
    class HostChild extends HostParent {
      static markupAugmenters: MarkupAugmenter[] = [
        (text) => `${text}-only-child`,
      ];
    }
    const host = makeStuff(() => new HostChild());
    const viewer = makeStuff(() => new HostChild());
    expect(augmentMarkup('seed', host, viewer)).toBe('seed-only-child');
  });

  it('does not double-collect inherited markupAugmenters via prototype', () => {
    // Parent declares a slot; child does NOT but otherwise extends.
    // The walker's `hasOwnProperty` filter means parent contributes
    // exactly once, regardless of how deep the chain runs.
    class HostParent extends Idea {
      static markupAugmenters: MarkupAugmenter[] = [
        (text) => `${text}-once`,
      ];
    }
    class HostChild extends HostParent {}
    const host = makeStuff(() => new HostChild());
    const viewer = makeStuff(() => new HostChild());
    expect(augmentMarkup('seed', host, viewer)).toBe('seed-once');
  });
});
