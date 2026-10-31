import useStreamState from '../../hooks/useStreamState';
import useShow from '../../hooks/useShow';
import Stage from '../shared/Stage';
import Sidebar, { SIDEBAR } from './Sidebar';
import LowerThird, { LOWER_THIRD } from './LowerThird';
import { palette } from '../../tokens/palette';
import { FACE_STACKS } from '../../tokens/faces';

/** The content area — the display capture shows through here, 16:9. */
const CONTENT = { width: 1520, height: 855 } as const;
/** The camera's corner — the camera source shows through here, 16:9. */
const CAMERA = { width: SIDEBAR.width, height: LOWER_THIRD.height } as const;

/**
 * Stand-ins for the OBS sources beneath the overlay, shown only with
 * `?mock` so the frame can be judged in a plain browser. In OBS the page is
 * transparent there and the real display capture and camera show through.
 */
function SourceStandIn({ label, size }: { label: string; size: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        background: `repeating-linear-gradient(45deg, ${palette.bg.sunken} 0 24px, ${palette.bg.ground} 24px 48px)`,
        fontFamily: FACE_STACKS.chrome,
        color: palette.text.mute,
      }}
    >
      <div style={{ fontSize: 28 }}>{label}</div>
      <div style={{ fontSize: 18 }}>{size}</div>
    </div>
  );
}

/**
 * The Live scene's overlay: a frame around the desktop.
 *
 *   ┌──────────────────────────────┬─────────┐
 *   │ CONTENT 1520 × 855           │ SIDEBAR │  brand · topic + agenda · chat
 *   │ (transparent: the display)   │   400   │
 *   ├──────────────────────────────┼─────────┤
 *   │ LOWER THIRD 1520 × 225       │ CAMERA  │  transparent: the camera
 *   └──────────────────────────────┴─────────┘
 *
 * ⚠⚠ This page covers nothing private. A privacy cover is the absence of a
 * source in OBS (the Away scene has no display and no camera), never a layer
 * here — if this page failed to load, a cover drawn by it would fail too.
 */
export default function LiveOverlay() {
  const feed = useStreamState();
  const show = useShow();
  const mock = new URLSearchParams(window.location.search).has('mock');
  const live = mock || (feed.connected && feed.state?.mode === 'live');

  return (
    <Stage>
      {mock && (
        <>
          <div style={{ position: 'absolute', left: 0, top: 0, ...CONTENT }}>
            <SourceStandIn label="Display capture" size="1520 × 855" />
          </div>
          <div
            style={{
              position: 'absolute',
              left: CONTENT.width,
              top: CONTENT.height,
              ...CAMERA,
            }}
          >
            <SourceStandIn label="Camera" size="400 × 225" />
          </div>
        </>
      )}

      <div style={{ position: 'absolute', left: CONTENT.width, top: 0 }}>
        <Sidebar show={show} chat={feed.chat} live={live} />
      </div>

      <div style={{ position: 'absolute', left: 0, top: CONTENT.height }}>
        <LowerThird show={show} />
      </div>

      {/* A hairline frame on the camera's corner, so it sits in the chrome. */}
      <div
        style={{
          position: 'absolute',
          left: CONTENT.width,
          top: CONTENT.height,
          ...CAMERA,
          boxSizing: 'border-box',
          borderTop: `1px solid ${palette.line}`,
          borderLeft: `1px solid ${palette.line}`,
          pointerEvents: 'none',
        }}
      />
    </Stage>
  );
}
