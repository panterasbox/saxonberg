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

export default function StandbyOverlay() {
  // When the broadcast feed is connected, drive the countdown off
  // saxonberg's StreamState.awayUntil; otherwise fall back to ?until=
  // / demo (undefined override).
  const feed = useStreamState();
  const override = feed.connected ? (feed.state?.awayUntil ?? null) : undefined;
  const timer = useAwayTimer(override);
  const [quote, setQuote] = useState(APHORISMS[0]);

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
            style={{ position: 'absolute', inset: 0 }}
            camera={{ position: [0, 0.2, 3.6], fov: 36 }}
            gl={{ antialias: true, alpha: true }}
            dpr={[1, 2]}
            onCreated={({ gl }) => {
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
            {timer.expired ? 'Resuming' : 'Stream resumes in'}
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
            {timer.expired ? 'any moment' : timer.label}
          </div>

          <div
            style={{
              color: palette.text.dim,
              fontSize: 28,
              marginTop: 14,
              maxWidth: '48ch',
              textAlign: 'center',
            }}
          >
            {quote}
          </div>
        </div>

        {/* Who you are watching, tucked in the corner. */}
        <div style={{ position: 'absolute', left: 40, bottom: 36 }}>
          <Nameplate size="large" />
        </div>
      </div>
    </Stage>
  );
}
