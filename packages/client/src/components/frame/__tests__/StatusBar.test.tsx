/**
 * `StatusBar` — the axiom's own surface.
 *
 * ⭐ Driven through the **store**, not through props, because that is
 * what the affordances actually do: `handleCommandPreview` /
 * `handleCommandClick` in `App` write `ghostPreview` / `ghostFlash` and
 * nothing is passed down. A prop-driven test would pass against a bar
 * wired to nothing.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StatusBar } from '../StatusBar';
import { useStore } from '../../../store/index';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, '../../..');

function ghostText(): string {
  return screen.getByTestId('ghost-line').textContent ?? '';
}

function actionText(): string {
  return screen.getByTestId('status-bar-action').textContent ?? '';
}

describe('StatusBar', () => {
  beforeEach(() => {
    act(() => {
      useStore.getState().setGhostPreview(null);
      useStore.getState().flashGhost('');
    });
  });

  it('at rest shows the teaching hint and no command', () => {
    render(<StatusBar />);
    expect(ghostText()).toMatch(/hover a highlighted word/i);
    // ⚠ And nothing in the right region. The reference art puts
    // `here:forge · 1,240 frames` here; neither figure has a source, and
    // inventing them in the surface that advertises honesty would be
    // the joke this build is not making.
    expect(actionText()).toBe('');
  });

  it('shows a hovered affordance VERBATIM, and says what a click does', () => {
    render(<StatusBar />);
    act(() => {
      useStore.getState().setGhostPreview('look anvil');
    });
    // Verbatim: not "look at the anvil", not a moded variant. The whole
    // claim is that the string shown is the string sent.
    expect(ghostText()).toContain('look anvil');
    expect(actionText()).toBe('click to send');
  });

  it('restores on mouse-leave', () => {
    render(<StatusBar />);
    act(() => {
      useStore.getState().setGhostPreview('look anvil');
    });
    act(() => {
      useStore.getState().setGhostPreview(null);
    });
    expect(ghostText()).toMatch(/hover a highlighted word/i);
    expect(actionText()).toBe('');
  });

  describe('the post-click flash', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows the sent command, then clears itself', () => {
      render(<StatusBar />);
      act(() => {
        useStore.getState().flashGhost('› look anvil');
      });
      expect(ghostText()).toContain('look anvil');
      // ⚠ Not "click to send" — the command has already gone, and a
      // promise about the pointer's target would be false here.
      expect(actionText()).toBe('');

      act(() => {
        vi.advanceTimersByTime(900);
      });
      expect(ghostText()).toMatch(/hover a highlighted word/i);
    });
  });
});

/**
 * ⭐⭐ **Exactly one preview surface, asserted structurally.**
 *
 * `GhostCommandLine` had two render sites. Two places showing what a
 * click would send is worse than none, because they can disagree — and
 * a disagreement here does not just look wrong, it discredits the one
 * claim the surface exists to make. So this is a source scan rather
 * than a note in a doc: a second consumer of `ghostPreview` fails the
 * suite the moment it is written, not the moment someone notices.
 *
 * (The two RENDER sites — `App` and `CharGenStage` — are fine and
 * intended: they are mutually exclusive phases, so one bar is mounted at
 * any instant. What must stay singular is the module that reads the
 * preview state and paints it.)
 */
describe('the one-preview-surface guard', () => {
  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === '__tests__') continue;
        walk(full, out);
      } else if (/\.(ts|tsx)$/.test(entry)) {
        out.push(full);
      }
    }
    return out;
  }

  it('exactly one module reads ghostPreview', () => {
    const readers = walk(srcDir).filter((file) => {
      const text = readFileSync(file, 'utf8');
      // The store DECLARES the slice; a consumer SELECTS it.
      return /\bs\.ghostPreview\b/.test(text);
    });
    expect(
      readers.map((f) => f.slice(srcDir.length + 1)),
    ).toEqual(['components/frame/StatusBar.tsx']);
  });

  it('nothing imports the retired GhostCommandLine', () => {
    // ⚠ An IMPORT, not a mention: `StatusBar`'s own doc comment names
    // the component it replaced, and a guard that made the replacement
    // undocumentable would be worse than the guard is good — the same
    // call `noHexLiterals` makes about naming a colour in prose.
    const importers = walk(srcDir).filter((file) =>
      /^\s*import\s[^\n]*GhostCommandLine/m.test(readFileSync(file, 'utf8')),
    );
    expect(importers.map((f) => f.slice(srcDir.length + 1))).toEqual([]);
  });
});
