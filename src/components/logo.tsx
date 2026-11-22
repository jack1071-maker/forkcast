import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Rect } from 'react-native-svg';

import { C, F } from '@/lib/ui';

/*
 * The Forkcast logo: a fork inside a calorie ring that's 3/4 full.
 * Drawn on a 1024×1024 grid, the same shapes as scripts/make-icons.py,
 * so the animated logo lines up exactly with the app icon and splash image.
 */
const CENTER = 512;
const RING_R = 330;
const RING_W = 70;
const CIRC = 2 * Math.PI * RING_R;

function Fork({ color }: { color: string }) {
  const fw = 150;
  const top = CENTER - 170;
  const tineH = 130;
  const tineW = 30;
  return (
    <G fill={color}>
      {[0, 1, 2].map((i) => (
        <Rect
          key={i}
          x={CENTER - fw / 2 + (i * (fw - tineW)) / 2}
          y={top}
          width={tineW}
          height={tineH + 20}
          rx={tineW / 2}
        />
      ))}
      <Rect x={CENTER - fw / 2} y={top + tineH} width={fw} height={60} rx={30} />
      <Rect x={CENTER - 24} y={top + tineH + 30} width={48} height={CENTER + 200 - (top + tineH + 30)} rx={24} />
    </G>
  );
}

/** The logo at any size. `ring` is how full the ring is (0 to 1; the real logo is 0.75). */
export function Logo({
  size = 120,
  ring = 0.75,
  color = C.text,
  ringColor = C.ring,
}: {
  size?: number;
  ring?: number;
  /** The fork. */
  color?: string;
  ringColor?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Circle cx={CENTER} cy={CENTER} r={RING_R} stroke={C.line} strokeWidth={RING_W} fill="none" />
      {ring > 0 ? (
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RING_R}
          stroke={ringColor}
          strokeWidth={RING_W}
          fill="none"
          strokeDasharray={`${CIRC} ${CIRC}`}
          strokeDashoffset={CIRC * (1 - ring)}
          // Start at 12 o'clock.
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
        />
      ) : null}
      <Fork color={color} />
    </Svg>
  );
}

/** Same size as the native splash image (app.json → expo-splash-screen → imageWidth), so the hand-off is seamless. */
export const LAUNCH_LOGO_SIZE = 200;

const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const clamp = (x: number) => Math.max(0, Math.min(1, x));
/** 0→1 progress of a step that runs from `start` to `end` milliseconds. */
const step = (ms: number, start: number, end: number) => easeOut(clamp((ms - start) / (end - start)));

const TOTAL_MS = 1900;

/**
 * Plays once when the app opens: on the plain background, the ring fills around the fork like a day of eating,
 * "FORKCAST" rises in underneath, then the whole thing fades away to reveal the app.
 */
export function LaunchAnimation({ onShown, onDone }: { onShown?: () => void; onDone: () => void }) {
  const [ms, setMs] = useState(0);
  const [fast, setFast] = useState(false);

  useEffect(() => {
    onShown?.();
    let raf = 0;
    let cancelled = false;
    let start = 0;
    let length = TOTAL_MS;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        // People who turned on "Reduce Motion" get a quick, calm fade instead.
        if (reduce) {
          setFast(true);
          length = 500;
        }
        const tick = (now: number) => {
          if (!start) start = now;
          const elapsed = now - start;
          setMs(elapsed);
          if (elapsed >= length) {
            onDone();
            return;
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
    // Runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ring = fast ? 0.75 : 0.75 * step(ms, 150, 950);
  const word = fast ? 1 : step(ms, 850, 1250);
  const fade = fast ? 1 - step(ms, 0, 500) : 1 - step(ms, 1500, TOTAL_MS);
  const grow = fast ? 1 : 1 + 0.06 * step(ms, 1500, TOTAL_MS);

  return (
    <View style={[StyleSheet.absoluteFill, st.screen, { opacity: fade }]} pointerEvents="none">
      <View style={{ transform: [{ scale: grow }], alignItems: 'center' }}>
        <Logo size={LAUNCH_LOGO_SIZE} ring={ring} />
        <Text style={[st.word, { opacity: word, transform: [{ translateY: 14 * (1 - word) }] }]}>FORKCAST</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  screen: { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  // Negative margin keeps the logo in the exact middle (where the splash image is) while the word sits below it.
  word: { fontFamily: F.head, color: C.text, fontSize: 34, letterSpacing: 6, marginTop: 4, marginBottom: -48 },
});
