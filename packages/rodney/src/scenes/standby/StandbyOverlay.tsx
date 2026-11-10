import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import Banner from './Banner';
import ChatPanel from '../shared/ChatPanel';
import Stage from '../shared/Stage';
import Nameplate from '../shared/Nameplate';
import { CHANNEL } from '../../show/channel';
import { currentProfile } from '../../show/profiles';
import ErrorBoundary from './ErrorBoundary';
import useAwayTimer from '../../hooks/useAwayTimer';
import useStreamState from '../../hooks/useStreamState';
import useObsScene from '../../hooks/useObsScene';
import SceneNotice from '../shared/SceneNotice';
import type { StreamShow } from '../../show/wire';
import { palette } from '../../tokens/palette';
import { FACE_STACKS } from '../../tokens/faces';

// Quiet, scholarly — inscriptions under the timer.
const APHORISMS = [
  'The light is left on in the library.',
  'Knowing a secret is real is worth more than the secret.',
  'Every master leaves a mark.',
  'Patience is the scholar’s instrument.',
  'The work waits, and is worth the waiting.',
];

/*
 * The layout, on the 1920 × 1080 stage. The r3f camera sits at z = 3.6,
 * y = 0.2 with a 36° vertical field. Measured from a render (the cloth
 * stretches about a fifth under its own weight, so the numbers are
 * empirical, not projected): the crossbars sit ≈ 95 px down, the cloth
 * hangs to ≈ 760 px, and the banners' inner edges leave the screen columns
 * ≈ 540–1380 between them — the chat sits inside that — with the caption
 * below the chat.
 */
const BANNER_TOP = 0.95;
const BANNER_X = 1.42;
const COLUMN = { left: 580, width: 760, top: 115, bottom: 1080 - 785 } as const;

/**
 * Layered for resilience (OBS's CEF and some GPUs have flaky WebGL):
 *   1. monastery as a CSS background — always visible, zero WebGL.
 *   2. the banners in a TRANSPARENT <Canvas>, wrapped in an ErrorBoundary so
 *      a WebGL failure degrades to "monastery + chat + timer", never blank.
 *   3. the chat and the caption as plain DOM, independent of the canvas.
 * No post-processing — the EffectComposer DoF pass was throwing per-frame GL
 * errors that blanked the output on real drivers.
 *
 * Two voices only (DESIGN-SYSTEM § Type): Spectral for the wordmarks, the
 * label, the timer and the inscription; Public Sans for the chat.
 */
/**
 * The studio's banner on the left, never changing; the show's on the right,
 * from the profile (`?show=`). The person is the nameplate in the corner.
 */
function BannerScene() {
  const profile = currentProfile();
  return (
    <>
      <ambientLight intensity={0.6} color={'#9fb0cc'} />
      <directionalLight position={[0, 5, 3]} intensity={2.6} color={'#f2f5fa'} />
      <pointLight position={[0, -1, 2]} intensity={4} color={'#5b8fd6'} distance={14} />
      <Banner
        markUrl="/brand/panterasbox-hex-white.svg"
        wordmark={CHANNEL.studio}
        position={[-BANNER_X, BANNER_TOP, 0]}
      />
      <Banner
        markUrl={profile.mark}
        wordmark={profile.wordmark}
        position={[BANNER_X, BANNER_TOP, 0]}
        phase={0.37}
      />
    </>
  );
}

/** What the caption says for the phase the feed is in. */
interface Caption {
  /** The engraved heading over the timer. */
  heading: string;
  /** The countdown's target (epoch ms), or null for no countdown at all. */
  countTo: number | null;
  /** What shows when the countdown has run out, or with no countdown. */
  idle: string | null;
  /** The line under the timer — the reason's copy; else the aphorisms. */
  line: string | null;
  /** The agenda, on Starting. */
  agenda: { title: string; done: boolean }[];
}

/**
 * ⭐ One page, every non-live phase (broadcast-ready D14): Starting counts
 * to `startsAt` with the agenda; Away shows the reason and counts to
 * `awayUntil` — ⚠ and for a PRIVACY reason shows no countdown at all (a
 * timer tells the audience how long the private thing takes); Ending is
 * the outro. With no feed at all, the shipped demo countdown stands.
 */
function captionFor(state: StreamShow | null): Caption | null {
  if (!state) return null;
  switch (state.phase) {
    case 'starting':
      return {
        heading: state.topic ? `Starting soon · ${state.topic}` : 'Starting soon',
        countTo: state.startsAt,
        idle: 'any moment',
        line: null,
        agenda: state.agenda,
      };
    case 'standby': {
      const r = state.reason;
      const timed = r !== null && !r.privacy && state.awayUntil !== null;
      return {
        heading: r ? r.label : 'Stepped away',
        countTo: timed ? state.awayUntil : null,
        idle: timed ? 'any moment' : 'back shortly',
        line: r ? r.copy : null,
        agenda: [],
      };
    }
    case 'ending':
      return {
        heading: "That's the show",
        countTo: null,
        idle: 'Thanks for watching',
        line: 'Saxonberg is open all week — what you watched, you can play.',
        agenda: [],
      };
    case 'live':
      return { heading: 'Live', countTo: null, idle: 'on air', line: null, agenda: [] };
    case 'offline':
      return { heading: 'Off the air', countTo: null, idle: 'see you next week', line: null, agenda: [] };
  }
}

export default function StandbyOverlay() {
  // The feed's last word stands across a drop (fail closed); with no feed
  // at all, the countdown falls back to ?until= / the demo.
  const feed = useStreamState();
  const notice = useObsScene(feed);
  const caption = captionFor(feed.state);
  const override = caption === null ? undefined : caption.countTo;
  const timer = useAwayTimer(override);
  const counting = caption === null || caption.countTo !== null;
  const [quote, setQuote] = useState(APHORISMS[0]);
  // OBS can drop a hidden browser source's WebGL context, and the banners
  // came back frozen. Rebuild the canvas whenever the page is shown again or
  // the context is lost — a fresh scene is cheap; a stopped flag is not.
  const [glEpoch, setGlEpoch] = useState(0);
  useEffect(() => {
    const rebuild = () => setGlEpoch((n) => n + 1);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') rebuild();
    };
    const onObs = (e: Event) => {
      if ((e as CustomEvent<boolean>).detail) rebuild();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('obsSourceVisibleChanged', onObs);
    window.addEventListener('obsSourceActiveChanged', onObs);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('obsSourceVisibleChanged', onObs);
      window.removeEventListener('obsSourceActiveChanged', onObs);
    };
  }, []);

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % APHORISMS.length;
      setQuote(APHORISMS[i]);
    }, 9000);
    return () => clearInterval(id);
  }, []);

  return (
    <Stage>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: palette.bg.ground,
          backgroundImage: 'url(/monastery.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          fontFamily: FACE_STACKS.chrome,
        }}
      >
        {/* Deepen the backdrop toward the ink ground so the panels read. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(ellipse at center, rgba(7,18,36,0.35) 30%, rgba(4,11,23,0.85) 100%)',
          }}
        />

        {/* Banner layer — transparent, isolated from the rest of the tree.
          The fallback is a visible diagnostic: if you see it, WebGL failed
          to initialize in this viewer (not a banner bug). */}
        <ErrorBoundary
          fallback={
            <div
              style={{
                position: 'absolute',
                bottom: 12,
                right: 14,
                fontFamily: FACE_STACKS.chrome,
                fontSize: '0.72rem',
                color: palette.text.mute,
                pointerEvents: 'none',
              }}
            >
              banners: WebGL unavailable in this viewer
            </div>
          }
        >
          <Canvas
            key={glEpoch}
            style={{ position: 'absolute', inset: 0 }}
            camera={{ position: [0, 0.2, 3.6], fov: 36 }}
            gl={{ antialias: true, alpha: true }}
            dpr={[1, 2]}
            onCreated={({ gl }) => {
              gl.domElement.addEventListener('webglcontextlost', (e) => {
                e.preventDefault();
                setGlEpoch((n) => n + 1);
              });
              // eslint-disable-next-line no-console
              console.log('[rodney] WebGL context OK:', gl.getContext().getParameter(0x1f01));
            }}
          >
            <BannerScene />
          </Canvas>
        </ErrorBoundary>

        {/* The chat, between the banners. */}
        <div
          style={{
            position: 'absolute',
            left: COLUMN.left,
            width: COLUMN.width,
            top: COLUMN.top,
            bottom: COLUMN.bottom,
          }}
        >
          <ChatPanel lines={feed.chat} />
        </div>

        {/* The caption, below them. */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 1080 - COLUMN.bottom + 28,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none',
            textShadow: '0 2px 18px rgba(4,11,23,0.8)',
            fontFamily: FACE_STACKS.display,
          }}
        >
          <div
            style={{
              color: palette.text.dim,
              fontWeight: 500,
              letterSpacing: '0.19em',
              fontSize: 20,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            {caption ? caption.heading : timer.expired ? 'Resuming' : 'Stream resumes in'}
          </div>

          <div
            style={{
              color: timer.urgent ? palette.accent : palette.text.fg,
              fontWeight: 500,
              fontSize: 88,
              fontVariantNumeric: 'tabular-nums lining-nums',
              lineHeight: 1,
            }}
          >
            {counting && !timer.expired
              ? timer.label
              : caption?.idle ?? 'any moment'}
          </div>

          {caption && caption.agenda.length > 0 && (
            <div
              style={{
                fontFamily: FACE_STACKS.chrome,
                fontSize: 26,
                color: palette.text.dim,
                marginTop: 14,
                textAlign: 'center',
              }}
            >
              {caption.agenda.map((a) => (
                <span key={a.title} style={{ margin: '0 14px', opacity: a.done ? 0.55 : 1 }}>
                  {a.done ? '✓ ' : ''}
                  {a.title}
                </span>
              ))}
            </div>
          )}

          <div
            style={{
              color: palette.text.dim,
              fontSize: 28,
              marginTop: 14,
              maxWidth: '48ch',
              textAlign: 'center',
            }}
          >
            {caption?.line ?? quote}
          </div>
        </div>

        {/* Who you are watching, tucked in the corner, flush right. */}
        <div style={{ position: 'absolute', right: 40, bottom: 36 }}>
          <Nameplate size="large" />
        </div>
        <SceneNotice text={notice} />
      </div>
    </Stage>
  );
}
