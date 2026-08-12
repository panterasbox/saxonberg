/**
 * useStylesheet — bridge the Zustand store's `clientState` snapshot
 * to a resolved `Stylesheet`. Subscribes to overlay changes so the
 * cockpit re-renders when the `style` verb mutates the overlay (via
 * the `client-state-update` push wire).
 *
 * Single source of truth: `clientState['style.overlay']`. The
 * stylesheet picks a theme by reading `overlay.theme` and composes
 * the cascade.
 *
 * ⚠ `pickTheme` is imported from `themes/index`, not defined here. The
 * chrome's `useGround` resolves the same overlay value through the same
 * function; two local copies could drift and leave the transcript on one
 * ground inside chrome on another.
 */

import { useMemo } from 'react';
import { useStore } from '../../store';
import { Stylesheet } from './Stylesheet';
import { pickTheme } from './themes';
import { NEUTRAL_BUCKET_RESOLVER } from './BucketResolver';
import type { StyleOverlay } from './types';

const EMPTY_OVERLAY: StyleOverlay = {};

/**
 * Read the resolved stylesheet for the current player. The hook
 * subscribes to the overlay slice; theme swap + per-channel color +
 * plain-mode all flow through the same path with no reconnect.
 *
 * `viewerStuffId` is consulted for `<mention>` self-match treatment;
 * pass `null` for system-rendered messages without a viewer
 * (boot-time fixtures, archive renders).
 */
export function useStylesheet(
  viewerStuffId: string | null = null,
): Stylesheet {
  const overlay = useStore(
    (state) =>
      (state.clientState['style.overlay'] as StyleOverlay | undefined) ??
      EMPTY_OVERLAY,
  );

  return useMemo(
    () =>
      new Stylesheet(pickTheme(overlay.theme), overlay, {
        resolver: NEUTRAL_BUCKET_RESOLVER,
        viewerStuffId,
      }),
    [overlay, viewerStuffId],
  );
}
