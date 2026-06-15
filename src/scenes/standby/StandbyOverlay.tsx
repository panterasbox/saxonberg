import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import Banner from './Banner';
import ErrorBoundary from './ErrorBoundary';
import useAwayTimer from '../../hooks/useAwayTimer';
import useStreamState from '../../hooks/useStreamState';
import { palette } from '../../tokens/palette';
import { FACE_STACKS } from '../../tokens/faces';

// Serif "world voice" — quiet, scholarly (Mrs. Frankweiler's archive).
const APHORISMS = [
  'The light is left on in the library.',
  'Knowing a secret is real is worth more than the secret.',
  'Every master leaves a mark.',
  'Patience is the scholar’s instrument.',
  'The work waits, and is worth the waiting.',
];

/**
 * Layered for resilience (OBS's CEF and some GPUs have flaky WebGL):
 *   1. monastery as a CSS background — always visible, zero WebGL.
 *   2. the banner in a TRANSPARENT <Canvas> on top, wrapped in an ErrorBoundary
 *      so a WebGL failure degrades to "monastery + timer", never a blank screen.
 *   3. the timer/copy as plain DOM, independent of the canvas entirely.
 * No post-processing — the EffectComposer DoF pass was throwing per-frame GL
 * errors that blanked the output on real drivers.
 */
function BannerScene() {
  return (
    <>
      <ambientLight intensity={0.55} color={'#9fb8d6'} />
      <directionalLight position={[-4, 5, 3]} intensity={2.8} color={'#dce8ff'} />
      <pointLight position={[2, -1, 2]} intensity={5} color={'#3a6aa0'} distance={14} />
      <Suspense fallback={null}>
        <Banner position={[1.0, 0.9, 0]} />
      </Suspense>
    </>
  );
}

export default function StandbyOverlay() {
  // When the broadcast feed is connected, drive the countdown off
  // saxonberg's StreamState.awayUntil; otherwise fall back to ?until=
  // / demo (undefined override).
  const feed = useStreamState();
  const override = feed.connected ? feed.state?.awayUntil ?? null : undefined;
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
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: palette.bg.base,
        backgroundImage: 'url(/monastery.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: FACE_STACKS.sans,
      }}
    >
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
              fontFamily: FACE_STACKS.mono,
              fontSize: '0.72rem',
              color: palette.accent.red,
              opacity: 0.85,
              pointerEvents: 'none',
            }}
          >
            banner: WebGL unavailable in this viewer
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
            console.log('[pbox-stream] WebGL context OK:', gl.getContext().getParameter(0x1f01));
          }}
        >
          <BannerScene />
        </Canvas>
      </ErrorBoundary>

      {/* CSS vignette (replaces the WebGL post pass). */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0) 42%, rgba(0,8,20,0.72) 100%)',
        }}
      />

      {/* DOM overlay — always renders, independent of WebGL. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: '7vh',
          pointerEvents: 'none',
          textShadow: '0 2px 18px rgba(0,8,20,0.7)',
        }}
      >
        <div
          style={{
            fontFamily: FACE_STACKS.sans,
            color: palette.text.muted,
            letterSpacing: '0.42em',
            fontSize: '0.95rem',
            textTransform: 'uppercase',
            marginBottom: '0.6rem',
          }}
        >
          {timer.expired ? 'Resuming' : 'Stream Resumes In'}
        </div>

        <div
          style={{
            fontFamily: FACE_STACKS.mono,
            color: timer.urgent ? palette.accent.red : palette.text.primary,
            fontSize: '5.2rem',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
          }}
        >
          {timer.expired ? 'any moment' : timer.label}
        </div>

        <div
          style={{
            fontFamily: FACE_STACKS.serif,
            color: palette.text.secondary,
            fontStyle: 'italic',
            fontSize: '1.5rem',
            marginTop: '1.4rem',
            maxWidth: '40ch',
            textAlign: 'center',
          }}
        >
          {quote}
        </div>
      </div>
    </div>
  );
}
