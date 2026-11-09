import { useEffect, useRef, useState } from 'react';
import type { StreamFeed } from './useStreamState';
import { sceneFor } from '../show/rules';
import { applyScene } from '../obs';

/**
 * ⭐ The one place the overlay switches OBS's scene (broadcast-ready D14):
 * whenever the feed's phase or reason moves, apply the rules table's scene.
 *
 * Opt-in per page with `?switch` — put it on one browser source per
 * scene set, so two pages never race. A feed that drops changes NOTHING:
 * the last scene holds, and nothing here ever infers `live`.
 *
 * Returns the notice to show in the page's corner when switching is off or
 * failed (never silent), or null.
 */
export default function useObsScene(feed: StreamFeed): string | null {
  const enabled = new URLSearchParams(window.location.search).has('switch');
  const [notice, setNotice] = useState<string | null>(null);
  const last = useRef<string | null>(null);
  const state = feed.connected ? feed.state : null;
  const scene = state ? sceneFor(state) : null;

  useEffect(() => {
    if (!enabled || scene === null || scene === last.current) return;
    last.current = scene;
    let cancelled = false;
    void applyScene(scene).then((r) => {
      if (!cancelled) setNotice(r.ok ? null : r.why);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, scene]);

  return enabled ? notice : null;
}
