import { useEffect, useState, type ReactNode } from 'react';

/** The canvas every scene lays out on, in OBS pixels. */
export const CANVAS = { width: 1920, height: 1080 } as const;

/**
 * A fixed 1920 × 1080 stage, scaled to fit the viewport. Every position in a
 * scene is in canvas pixels, so the layout holds in an OBS browser source
 * (1920 × 1080 at 1×), a preview window, or a scaled display.
 */
export default function Stage({ children }: { children: ReactNode }) {
  const fit = () =>
    Math.min(window.innerWidth / CANVAS.width, window.innerHeight / CANVAS.height);
  const [scale, setScale] = useState(fit);
  useEffect(() => {
    const onResize = () => setScale(fit());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: CANVAS.width,
        height: CANVAS.height,
        transform: `translate(-50%, -50%) scale(${scale})`,
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}
