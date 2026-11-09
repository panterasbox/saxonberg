import useStreamState from '../../hooks/useStreamState';
import useShow, { type Show } from '../../hooks/useShow';
import useObsScene from '../../hooks/useObsScene';
import { layersFor } from '../../show/rules';
import SceneNotice from '../shared/SceneNotice';
import Stage from '../shared/Stage';
import Nameplate from '../shared/Nameplate';
import { currentProfile } from '../../show/profiles';
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
 * The rules' `game-summary` layer: live, with the streamer's Saxonberg not
 * in front — a strip across the top of the content area keeps the world on
 * screen while the desktop shows the code.
 */
function GameSummary({ show }: { show: Show }) {
  const facts = [
    show.topic,
    show.playersOnline === null
      ? null
      : `${show.playersOnline} ${show.playersOnline === 1 ? 'player' : 'players'} in Saxonberg now`,
  ].filter(Boolean);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: CONTENT.width,
        height: 56,
        boxSizing: 'border-box',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        background: 'linear-gradient(to bottom, rgba(4,11,23,0.9), rgba(4,11,23,0.65))',
        fontFamily: FACE_STACKS.chrome,
        fontSize: 24,
        color: palette.text.fg,
      }}
    >
      <span style={{ color: palette.accent, fontWeight: 600 }}>The game is in another window</span>
      {facts.length > 0 && <span style={{ color: palette.text.dim }}>{facts.join(' · ')}</span>}
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
  const profile = currentProfile();
  const show = useShow(profile, feed);
  const notice = useObsScene(feed);
  const mock = new URLSearchParams(window.location.search).has('mock');
  // ⭐ From the last thing the server said — a dropped feed holds it.
  const live = mock || feed.state?.phase === 'live';
  const layers = feed.state
    ? layersFor({
        phase: feed.state.phase,
        reason: feed.state.reason,
        foreground: feed.state.client?.foreground ?? null,
      })
    : [];

  return (
    <Stage>
      {/* The stand-ins are for judging the frame in a plain browser; inside OBS
          the real display and camera are underneath and must show through. */}
      {mock && !window.obsstudio && (
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

      {layers.includes('game-summary') && <GameSummary show={show} />}

      <div style={{ position: 'absolute', left: CONTENT.width, top: 0 }}>
        <Sidebar show={show} profile={profile} chat={feed.chat} live={live} />
      </div>

      <div style={{ position: 'absolute', left: 0, top: CONTENT.height }}>
        <LowerThird show={show} profile={profile} />
      </div>

      {/* The nameplate — who you are watching — on the camera, where the eye
          goes to see who is talking, flush right in the canvas's corner. A
          dark strip so it reads on any frame. */}
      <div
        style={{
          position: 'absolute',
          left: CONTENT.width,
          top: CONTENT.height + CAMERA.height - 54,
          width: CAMERA.width,
          height: 54,
          boxSizing: 'border-box',
          padding: '0 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          background: 'linear-gradient(to top, rgba(4,11,23,0.88), rgba(4,11,23,0.6))',
        }}
      >
        <Nameplate />
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
      <SceneNotice text={notice} />
    </Stage>
  );
}
