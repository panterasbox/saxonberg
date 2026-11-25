/**
 * PlayerSlot — where the one stream player should sit (stream arrival D3).
 *
 * It renders an empty box and registers ITS rectangle with the store; the
 * `StreamPlayer` (mounted once, above every screen) follows it. A slot never
 * holds an iframe itself — reparenting an iframe reloads it — so a layout
 * that moves the slot moves only a rectangle. It re-measures on resize, on
 * any scroll (capture phase) and once per animation frame while mounted, and
 * unregisters when it unmounts (the player falls back to the dock, or goes).
 */

import React, { useLayoutEffect, useRef } from "react";
import styled from "styled-components";
import { useStore } from "../../store";

const Spot = styled.div`
  position: absolute;
  inset: 0;
`;

/** `place` says which it is: the DOCK every pre-world screen lays out, or a
 * stage's own slot (watch mode, the phone). */
export function PlayerSlot({ place = "slot" }: { place?: "slot" | "dock" }): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const setSlot = useStore((s) => s.setPlayerSlot);
  useLayoutEffect(() => {
    let frame = 0;
    const measure = (): void => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setSlot({ left: r.left, top: r.top, width: r.width, height: r.height, place });
    };
    const tick = (): void => {
      measure();
      frame = window.requestAnimationFrame(tick);
    };
    measure();
    frame = window.requestAnimationFrame(tick);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ref.current && observer) observer.observe(ref.current);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      setSlot(null);
    };
  }, [setSlot, place]);
  return <Spot ref={ref} data-testid="player-slot" />;
}
