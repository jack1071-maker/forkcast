import { loadFont as loadBarlow } from '@remotion/google-fonts/BarlowCondensed';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, interpolateColors, staticFile, useCurrentFrame } from 'remotion';

/*
 * Forkcast promo, vertical 1080 × 1920. See ../STORYBOARD-v2.md.
 * One continuous story: logo → camera button → 3D phone (Blender) → estimate card → Today ring → week rings →
 * weight goal → Dynamic Island → 3D phone end card.
 * Every shot's main shape turns into the next one; nothing cross-fades between shots.
 */

import { B, FPS } from './beats';

export { FPS };


export const DURATION = Math.round(B.end * FPS);

const C = {
  bg: '#F6F5F2',
  card: '#FFFFFF',
  cardHi: '#F0EEEA',
  text: '#141414',
  muted: '#6F6C67',
  line: '#E7E4DF',
  ring: '#8E9FE0',
  good: '#9CCBA6',
  goodText: '#3F7A4E',
  protein: '#8FB8EE',
  carbs: '#F2CC6B',
  fat: '#C3A9EE',
};

const { fontFamily: HEAD } = loadBarlow('normal', { weights: ['600', '700'], subsets: ['latin'] });
const { fontFamily: BODY } = loadInter('normal', { weights: ['500', '600', '700'], subsets: ['latin'] });

// ---------- Timing helpers ----------

/** Fast, then slow for longer. */
const OUT = Easing.bezier(0.16, 1, 0.3, 1);
/** Smooth on both ends, for shape morphs. */
const IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

/** 0 → 1 between two times (seconds). */
function prog(frame: number, [a, b]: number[] | readonly number[], ease = IN_OUT) {
  return interpolate(frame / FPS, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
}
const mix = (a: number, b: number, p: number) => a + (b - a) * p;
const n = (v: number) => Math.round(v).toLocaleString('en-US');

// ---------- Layout ----------

const W = 1080;
const H = 1920;
const CX = W / 2;
const CY = H / 2 - 40;
/** Where the line of words sits, under the main object. */
const TEXT_Y = 1660;

/** A box centered on the crosshair (plus an offset). */
function centered(w: number, h: number, dx = 0, dy = 0): React.CSSProperties {
  return { position: 'absolute', left: CX + dx - w / 2, top: CY + dy - h / 2, width: w, height: h };
}

// ---------- The logo (same geometry as the app's src/components/logo.tsx, 1024 grid) ----------

const LOGO = 460;
const LS = LOGO / 1024;
const RING_R = 330 * LS;
const RING_W = 70 * LS;

function Fork({ color = C.text, scale = 1, dy = 0, opacity = 1 }: { color?: string; scale?: number; dy?: number; opacity?: number }) {
  const fw = 150;
  const top = 512 - 170;
  const tineH = 130;
  const tineW = 30;
  return (
    <svg style={{ ...centered(LOGO, LOGO, 0, dy), opacity, transform: `scale(${scale})` }} viewBox="0 0 1024 1024">
      <g fill={color}>
        {[0, 1, 2].map((i) => (
          <rect key={i} x={512 - fw / 2 + (i * (fw - tineW)) / 2} y={top} width={tineW} height={tineH + 20} rx={tineW / 2} />
        ))}
        <rect x={512 - fw / 2} y={top + tineH} width={fw} height={60} rx={30} />
        <rect x={512 - 24} y={top + tineH + 30} width={48} height={512 + 200 - (top + tineH + 30)} rx={24} />
      </g>
    </svg>
  );
}

/** A ring: grey track plus a colored arc that starts at 12 o'clock. */
function Arc({
  r,
  stroke,
  progress,
  color,
  track = C.line,
  trackOpacity = 1,
  dx = 0,
  dy = 0,
}: {
  r: number;
  stroke: number;
  progress: number;
  color: string;
  track?: string | null;
  trackOpacity?: number;
  dx?: number;
  dy?: number;
}) {
  const size = r * 2 + stroke + 4;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <svg style={centered(size, size, dx, dy)} viewBox={`0 0 ${size} ${size}`}>
      {track ? <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" opacity={trackOpacity} /> : null}
      {p > 0.0005 ? (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - p)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      ) : null}
    </svg>
  );
}

// ---------- Text: each word rises from blurred to sharp ----------

function Words({ text, at, out, size = 96, y = TEXT_Y }: { text: string; at: number; out?: number; size?: number; y?: number }) {
  const frame = useCurrentFrame();
  const s = frame / FPS;
  const words = text.split(' ');
  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        right: 60,
        top: y - size * 0.6,
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        columnGap: size * 0.26,
      }}>
      {words.map((w, i) => {
        const pIn = interpolate(s, [at + i * 0.08, at + i * 0.08 + 0.55], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: OUT });
        const pOut = out == null ? 0 : interpolate(s, [out + i * 0.03, out + i * 0.03 + 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic) });
        // Words keep rising as they leave, so the direction never reverses.
        const rise = (1 - pIn) * 30 + pOut * 30;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              fontFamily: HEAD,
              fontWeight: 700,
              fontSize: size,
              lineHeight: 1.1,
              letterSpacing: -0.5,
              opacity: pIn * (1 - pOut),
              filter: `blur(${(1 - pIn) * 14 + pOut * 14}px)`,
              transform: `translateY(${-rise + 30}px)`,
              // Solid on top, easing to warm grey at the bottom of the letters.
              backgroundImage: `linear-gradient(180deg, ${C.text} 52%, #57534E 100%)`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}>
            {w}
          </span>
        );
      })}
    </div>
  );
}

// ---------- Depth: soft out-of-focus color behind everything ----------

function Bokeh({ opacity }: { opacity: number }) {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const blobs = [
    { c: C.ring, x: 170, y: 420, r: 300, sx: 0.21, sy: 0.17 },
    { c: C.good, x: 930, y: 760, r: 260, sx: 0.15, sy: 0.23 },
    { c: C.carbs, x: 240, y: 1500, r: 240, sx: 0.19, sy: 0.13 },
    { c: C.fat, x: 880, y: 1640, r: 280, sx: 0.12, sy: 0.18 },
  ];
  return (
    <AbsoluteFill style={{ opacity }}>
      {blobs.map((b, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: b.x - b.r + Math.sin(t * b.sx + i) * 40,
            top: b.y - b.r + Math.cos(t * b.sy + i * 2) * 40,
            width: b.r * 2,
            height: b.r * 2,
            borderRadius: '50%',
            background: b.c,
            opacity: 0.28,
            filter: 'blur(90px)',
          }}
        />
      ))}
    </AbsoluteFill>
  );
}

// ---------- The 3D phone (rendered by blender/phone.py into public/3d) ----------

/** The Blender frames are centered on y 960; the 2D crosshair is at y 920, so they're drawn 40 px higher. */
const Y3D = CY - 960;
/** Measured by phone.py (public/3d/*.json): the camera viewfinder on the phone's screen when the snap shot lands. */
const VF = { x: 241.8, y: 284.5 + 420 * (1271 / 2556) + Y3D, w: 596.4, h: 1572 * (1271 / 2556) };
const SNAP_FRAMES = 82;
const END_FRAMES = 142;
/** The Dynamic Island in the first end frame: 522 × 158 px, centered. */
const PILL = { w: 522, h: 158 };

function Frames3D({ shot, start, count, clip }: { shot: 'snap' | 'end'; start: number; count: number; clip?: string }) {
  const frame = useCurrentFrame();
  const i = Math.max(0, Math.min(count - 1, Math.floor(frame - start * FPS)));
  return (
    <AbsoluteFill style={{ top: Y3D, clipPath: clip }}>
      <Img src={staticFile(`3d/${shot}/${String(i).padStart(4, '0')}.png`)} style={{ width: W, height: H }} />
    </AbsoluteFill>
  );
}

// ---------- The video ----------

const CARD_W = 820;
const CARD_H = 1180;
const PHOTO_H_CARD = 470;
const CARD = { x: CX - CARD_W / 2, y: CY - CARD_H / 2, w: CARD_W, h: CARD_H };

const WEEK_R = 50;
const WEEK_GAP = 132;
const weekX = (i: number) => (i - 3) * WEEK_GAP;
const WEEK_FILL = [0.94, 0.98, 0.9, 1, 0.96, 0.92, 0.97];
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Weight trend: where each day's point sits once the rings become a line. */
const LINE_PTS = [
  [-420, -170],
  [-320, -150],
  [-220, -158],
  [-120, -105],
  [-20, -92],
  [80, -55],
  [180, -40],
];
const GOAL_Y = 170;
const GOAL_X = 400;

const rectMix = (a: { x: number; y: number; w: number; h: number }, b: typeof a, p: number) => ({
  x: mix(a.x, b.x, p),
  y: mix(a.y, b.y, p),
  w: mix(a.w, b.w, p),
  h: mix(a.h, b.h, p),
});

export function Promo() {
  const frame = useCurrentFrame();
  const s = frame / FPS;
  const p = (r: number[]) => prog(frame, r);
  const po = (r: number[]) => prog(frame, r, OUT);

  // One continuous, slow push-in that eases to a stop before the end (never reverses).
  const cam = interpolate(s, [0, B.toPill[0]], [1, 1.06], { extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.4, 1) });
  const drift = interpolate(s, [0, B.toPill[0]], [0, 1], { extrapolateRight: 'clamp' });
  const camX = Math.sin(drift * Math.PI) * 10;

  // ----- Shot 1: logo -----
  const dotIn = prog(frame, [B.dot, B.dot + 0.35], OUT);
  const ringDraw = po(B.ringDraw);
  const forkIn = po(B.fork);
  const preSquash = prog(frame, [B.toButton[0] - 0.2, B.toButton[0]], IN_OUT);
  const toButton = p(B.toButton);
  const camIn = po(B.cameraIcon);
  // ----- Shot 2: button -----
  const squash = Math.sin(prog(frame, B.squash, IN_OUT) * Math.PI) * 0.08;
  const iconOut = p(B.iconOut);
  // ----- Shot 3: 3D phone -----
  const iris = prog(frame, B.iris, Easing.bezier(0.5, 0, 0.2, 1));
  const scan = prog(frame, B.scan, Easing.inOut(Easing.sin));
  // ----- Shot 4: lift out into the card -----
  const lift = prog(frame, B.lift, Easing.bezier(0.6, 0, 0.2, 1));
  const count = po(B.count);
  const bars = po(B.bars);
  const press = Math.sin(prog(frame, B.press, IN_OUT) * Math.PI) * 0.03;
  // ----- Shot 5 -----
  const flood = prog(frame, B.flood, Easing.bezier(0.5, 0, 0.2, 1));
  const ring = po(B.ring);
  // ----- Shots 6–8 -----
  const toWeek = p(B.toWeek);
  const toDots = p(B.toDots);
  const line = po(B.line);
  const goalLine = po(B.goalLine);
  const toPill = p(B.toPill);
  const endIris = prog(frame, B.endIris, Easing.bezier(0.5, 0, 0.2, 1));

  const showLogo = s < B.toButton[1] + 0.05;
  const showButton = s >= B.toButton[0] && s < B.snap3d;
  const showSnap3d = s >= B.snap3d && s < B.flood[0] + 0.2;
  const showCard = s >= B.lift[0] && s < B.flood[1] + 0.05;
  const showToday = s >= B.flood[0] + 0.3 && s < B.endIris[1];
  const floodDone = s >= B.flood[1] - 0.02;

  // The card: starts exactly on the phone's viewfinder, then lifts out to full size, then floods the frame.
  const btnD = (RING_R + RING_W / 2) * 2;
  let box = rectMix(VF, CARD, lift);
  let boxR = mix(0, 64, lift);
  if (s >= B.flood[0]) {
    box = rectMix(CARD, { x: -W * 0.15, y: -H * 0.15, w: W * 1.3, h: H * 1.3 }, flood);
    boxR = mix(64, 0, flood);
  }
  const photo = rectMix({ x: 0, y: 0, w: VF.w, h: VF.h }, { x: 24, y: 24, w: CARD_W - 48, h: PHOTO_H_CARD }, lift);
  const cardContent = (s >= B.lift[0] ? 1 : 0) * (1 - prog(frame, [B.flood[0], B.flood[0] + 0.25], IN_OUT));

  // Today ring (shot 5) → today's mini ring in the week strip (shot 6).
  const bigR = 300;
  const todayR = mix(bigR, WEEK_R, toWeek);
  const todayStroke = mix(30, 10, toWeek);
  const trackIn = prog(frame, [B.flood[0] + 0.3, B.flood[1] + 0.1], IN_OUT);
  const todayX = mix(0, weekX(6), toWeek);
  const todayFill = mix(0.55 * ring, WEEK_FILL[6], prog(frame, [B.weekFill[1] - 0.4, B.weekFill[1]], OUT));
  const todayColor = interpolateColors(prog(frame, [B.weekFill[1] - 0.4, B.weekFill[1]], IN_OUT), [0, 1], [C.ring, C.good]);
  const ringCenterText = 1 - prog(frame, [B.toWeek[0], B.toWeek[0] + 0.3], IN_OUT);

  // Week rings → dots on a line → the Dynamic Island.
  const ringPos = (i: number) => {
    const out = i === 6 ? 1 : prog(frame, [B.toWeek[0] + 0.45, B.toWeek[1] + 0.35], OUT);
    let x = mix(weekX(6), weekX(i), out);
    let y = 0;
    let r = WEEK_R;
    if (s >= B.toDots[0]) {
      x = mix(weekX(i), LINE_PTS[i][0], toDots);
      y = mix(0, LINE_PTS[i][1], toDots);
      r = mix(WEEK_R, 11, toDots);
    }
    if (s >= B.toPill[0]) {
      // All seven slide together and swell into one pill, the same size as the phone's island.
      x = mix(LINE_PTS[i][0], mix(-(PILL.w / 2 - PILL.h / 2), PILL.w / 2 - PILL.h / 2, i / 6), toPill);
      y = mix(LINE_PTS[i][1], 0, toPill);
      r = mix(11, PILL.h / 2, toPill);
    }
    return { x, y, r };
  };

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: BODY }}>
      <Bokeh opacity={1} />
      <AbsoluteFill style={{ transform: `translateX(${camX}px) scale(${cam})` }}>
        {/* ---------- Shot 1: the logo builds itself ---------- */}
        {showLogo ? (
          <>
            <AbsoluteFill style={{ transform: `scale(${1 - preSquash * 0.06})`, transformOrigin: `${CX}px ${CY}px` }}>
              <Arc r={RING_R} stroke={RING_W} progress={0.75 * ringDraw + 0.25 * toButton} color={C.ring} trackOpacity={ringDraw} />
            </AbsoluteFill>
            {ringDraw < 0.05 ? (
              <div style={{ ...centered(RING_W, RING_W, 0, -RING_R), borderRadius: '50%', background: C.ring, transform: `scale(${dotIn})` }} />
            ) : null}
            <Fork dy={(1 - forkIn) * 60} opacity={forkIn} scale={1 - toButton} />
          </>
        ) : null}

        {/* ---------- Shot 2: the camera button (it's really the phone's lens) ---------- */}
        {showButton ? (
          <div
            style={{
              ...centered(btnD, btnD),
              borderRadius: '50%',
              background: C.text,
              transform: `scale(${mix(0.94, 1, toButton) * (1 - squash)})`,
              clipPath: s < B.toButton[1] ? `circle(${toButton * 51}% at 50% 50%)` : undefined,
            }}>
            <svg
              style={{ position: 'absolute', left: btnD / 2 - 70, top: btnD / 2 - 70, width: 140, height: 140, opacity: camIn * (1 - iconOut), transform: `scale(${mix(0.6, 1, camIn)})` }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />
              <circle cx={12} cy={12.5} r={3.5} />
            </svg>
          </div>
        ) : null}

        {/* ---------- Shot 3: the 3D phone (opens out of the button's circle) ---------- */}
        {showSnap3d ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              // The phone goes soft behind the card as it lifts out (depth of field).
              filter: `blur(${lift * 14}px)`,
              opacity: 1 - lift * 0.55,
            }}>
            <Frames3D shot="snap" start={B.snap3d} count={SNAP_FRAMES} clip={iris < 1 ? `circle(${mix(btnD / 2, 1250, iris)}px at ${CX}px ${960}px)` : undefined} />
            {/* Scan line across the viewfinder */}
            {scan > 0 && scan < 1 ? (
              <div style={{ position: 'absolute', left: VF.x, top: VF.y, width: VF.w, height: VF.h, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: `${scan * 100}%`, height: 0 }}>
                  <div style={{ position: 'absolute', left: 0, right: 0, top: -120, height: 120, background: 'linear-gradient(180deg, rgba(142,159,224,0) 0%, rgba(142,159,224,0.45) 100%)' }} />
                  <div style={{ position: 'absolute', left: 0, right: 0, top: -2, height: 4, background: C.ring, boxShadow: `0 0 18px 5px ${C.ring}` }} />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ---------- Shot 4: the photo lifts out of the screen and becomes the estimate card ---------- */}
        {showCard ? (
          <div
            style={{
              position: 'absolute',
              left: box.x,
              top: box.y,
              width: box.w,
              height: box.h,
              borderRadius: boxR,
              background: C.card,
              overflow: 'hidden',
              transform: `scale(${1 - press})`,
              boxShadow: s < B.flood[0] ? `0 ${40 * lift}px ${90 * lift}px rgba(20,20,20,${0.18 * lift})` : 'none',
            }}>
            <div
              style={{
                position: 'absolute',
                left: photo.x,
                top: photo.y,
                width: photo.w,
                height: photo.h,
                borderRadius: mix(0, 44, lift),
                overflow: 'hidden',
                opacity: 1 - prog(frame, [B.flood[0], B.flood[0] + 0.25], IN_OUT),
              }}>
              <Img src={staticFile('meal.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            {cardContent > 0.01 && s >= B.cardText - 0.1 ? (
              <div style={{ position: 'absolute', left: 48, right: 48, top: PHOTO_H_CARD + 24 + 40, opacity: cardContent }}>
                <CardBody s={s} count={count} bars={bars} press={press} />
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ---------- Shots 5–7 ---------- */}
        {showToday ? (
          <>
            {floodDone ? (
              <>
                {/* The floor left by the flood: white, warming to the phone screen's off-white before the 3D ending. */}
                <div style={{ position: 'absolute', left: -300, top: -300, right: -300, bottom: -300, background: interpolateColors(toPill, [0, 1], [C.card, C.bg]) }} />
                <AbsoluteFill style={{ transform: `scale(${1 / cam})`, opacity: prog(frame, [B.flood[1], B.flood[1] + 1.2], IN_OUT) * 0.7 }}>
                  <Bokeh opacity={1} />
                </AbsoluteFill>
              </>
            ) : null}

            {s < B.toWeek[1] ? (
              <>
                <div style={{ ...centered(600, 60, 0, -bigR - 90), textAlign: 'center', fontFamily: BODY, fontWeight: 600, fontSize: 30, letterSpacing: 4, color: C.muted, opacity: ring * ringCenterText }}>
                  CALORIES
                </div>
                <div style={{ ...centered(600, 260), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: ring * ringCenterText }}>
                  <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 190, lineHeight: 1, color: C.text }}>{n(mix(2120, 960, ring))}</div>
                  <div style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 44, letterSpacing: 6, color: C.muted, marginTop: 6 }}>CAL LEFT</div>
                </div>
              </>
            ) : null}

            {s < B.toDots[0] + 0.02 ? (
              <>
                {s >= B.toWeek[0]
                  ? [0, 1, 2, 3, 4, 5].map((i) => {
                      const { x } = ringPos(i);
                      const fill = prog(frame, [B.weekFill[0] + i * 0.2, B.weekFill[0] + i * 0.2 + 0.55], OUT) * WEEK_FILL[i];
                      const reveal = prog(frame, [B.toWeek[0] + 0.45, B.toWeek[0] + 0.75], IN_OUT);
                      const labels = prog(frame, [B.toWeek[1] + 0.35, B.toWeek[1] + 0.8], IN_OUT);
                      return (
                        <React.Fragment key={i}>
                          <div style={{ opacity: reveal }}>
                            <Arc r={WEEK_R} stroke={10} progress={fill} color={C.good} dx={x} />
                          </div>
                          <DayLabel x={x} i={i} opacity={labels} />
                        </React.Fragment>
                      );
                    })
                  : null}
                <Arc r={todayR} stroke={todayStroke} progress={todayFill} color={todayColor} dx={todayX} trackOpacity={trackIn} />
                {s >= B.toWeek[0] ? <DayLabel x={todayX} i={6} opacity={prog(frame, [B.toWeek[1] + 0.35, B.toWeek[1] + 0.8], IN_OUT)} today /> : null}
                <Streak at={B.streak} />
              </>
            ) : null}

            {s >= B.toDots[0] ? <Trend frame={frame} s={s} ringPos={ringPos} toDots={toDots} line={line} goalLine={goalLine} toPill={toPill} /> : null}
          </>
        ) : null}

        {/* ---------- Shot 8: the 3D ending (opens out of the island) ---------- */}
        {s >= B.end3d ? (
          <Frames3D shot="end" start={B.end3d} count={END_FRAMES} clip={endIris < 1 ? `circle(${mix(PILL.w / 2, 1250, endIris)}px at ${CX}px ${960}px)` : undefined} />
        ) : null}
      </AbsoluteFill>

      {/* ---------- Words (outside the camera so they stay steady) ---------- */}
      <Words text="Forkcast" at={B.word1} out={B.toButton[0] - 0.1} size={120} />
      <Words text="Snap your food." at={B.word2} out={B.snap3d + 0.2} />
      <Words text="See the calories." at={B.word4} out={B.press[0]} />
      <Words text="Watch your day fill up." at={B.word5} out={B.toWeek[0]} />
      <Words text="Hit your goal. Every day." at={B.word6} out={B.toDots[0]} />
      <Words text="See when you'll get there." at={B.word7} out={B.toPill[0]} />
      <EndCard s={s} />
    </AbsoluteFill>
  );
}

// ---------- Pieces ----------

function CardBody({ s, count, bars, press }: { s: number; count: number; bars: number; press: number }) {
  const rise = (t: number) => {
    const q = interpolate(s, [t, t + 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: OUT });
    return { opacity: q, transform: `translateY(${(1 - q) * 20}px)`, filter: `blur(${(1 - q) * 8}px)` };
  };
  const macros = [
    { label: 'Protein', g: 26, goal: 150, c: C.protein },
    { label: 'Carbs', g: 70, goal: 220, c: C.carbs },
    { label: 'Fat', g: 24, goal: 64, c: C.fat },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
      <div style={rise(B.cardText)}>
        <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 46, color: C.text }}>Ravioli in tomato sauce</div>
        <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 30, color: C.muted, marginTop: 8 }}>6 pieces · 1 serving</div>
      </div>
      <div style={{ ...rise(B.cardText + 0.15), display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 150, lineHeight: 1, color: C.text }}>{n(600 * count)}</span>
        <span style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 48, letterSpacing: 4, color: C.muted }}>CAL</span>
      </div>
      <div style={{ ...rise(B.cardText + 0.3), display: 'flex', gap: 30 }}>
        {macros.map((m) => (
          <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 22, letterSpacing: 3, color: C.muted, textTransform: 'uppercase' }}>{m.label}</div>
            <div style={{ height: 10, borderRadius: 5, background: C.line, overflow: 'hidden' }}>
              <div style={{ height: 10, borderRadius: 5, width: `${(m.g / m.goal) * 100 * bars}%`, background: m.c }} />
            </div>
            <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 44, color: C.text }}>
              {Math.round(m.g * bars)}
              <span style={{ fontWeight: 600, fontSize: 30, color: C.muted }}> g</span>
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          ...rise(B.cardText + 0.5),
          marginTop: 6,
          height: 104,
          borderRadius: 26,
          background: press > 0.001 ? '#000' : C.text,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: BODY,
          fontWeight: 700,
          fontSize: 32,
          letterSpacing: 4,
          color: '#fff',
          transform: `scale(${1 - press * 2})`,
        }}>
        ADD TO TODAY
      </div>
    </div>
  );
}

function DayLabel({ x, i, opacity, today }: { x: number; i: number; opacity: number; today?: boolean }) {
  return (
    <>
      <div style={{ ...centered(80, 40, x, -WEEK_R - 52), textAlign: 'center', fontFamily: BODY, fontWeight: 600, fontSize: 26, letterSpacing: 2, color: today ? C.text : C.muted, opacity }}>{DAYS[i]}</div>
      <div style={{ ...centered(80, 40, x, 0), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: BODY, fontWeight: 600, fontSize: 28, color: C.text, opacity }}>{16 + i}</div>
    </>
  );
}

function Streak({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const s = frame / FPS;
  const q = interpolate(s, [at, at + 0.6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: OUT });
  const leave = interpolate(s, [B.toDots[0] - 0.1, B.toDots[0] + 0.25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        ...centered(250, 76, 0, -220),
        borderRadius: 999,
        border: `2px solid ${C.line}`,
        background: C.card,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        opacity: q * (1 - leave),
        filter: `blur(${(1 - q) * 10 + leave * 10}px)`,
        transform: `translateY(${(1 - q) * 24 - leave * 24}px)`,
      }}>
      <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke={C.carbs} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3c.5 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3.6 2.4-4.6.2 1.8 1 2.8 2.1 3.1C11 9.5 11 6 12 3z" />
      </svg>
      <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 42, color: C.text }}>11</span>
      <span style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 30, letterSpacing: 2, color: C.muted }}>DAYS</span>
    </div>
  );
}

function Trend({
  frame,
  s,
  ringPos,
  toDots,
  line,
  goalLine,
  toPill,
}: {
  frame: number;
  s: number;
  ringPos: (i: number) => { x: number; y: number; r: number };
  toDots: number;
  line: number;
  goalLine: number;
  toPill: number;
}) {
  const pts = [0, 1, 2, 3, 4, 5, 6].map(ringPos);
  const dotColor = interpolateColors(toDots, [0, 1], [C.good, C.text]);
  // The chart clears away as the points slide together.
  const chartFade = 1 - prog(frame, [B.toPill[0], B.toPill[0] + 0.3], IN_OUT);
  const sx = (x: number) => CX + x;
  const sy = (y: number) => CY + y;
  const segs = pts.length - 1;
  const drawn = line * segs;
  const linePts: string[] = [];
  for (let i = 0; i <= Math.min(segs, Math.floor(drawn)); i++) linePts.push(`${sx(pts[i].x)},${sy(pts[i].y)}`);
  const k = Math.floor(drawn);
  if (k < segs && drawn > k) {
    const f = drawn - k;
    linePts.push(`${sx(mix(pts[k].x, pts[k + 1].x, f))},${sy(mix(pts[k].y, pts[k + 1].y, f))}`);
  }
  const proj = prog(frame, [B.line[1] - 0.2, B.line[1] + 0.6], OUT);
  const last = pts[6];
  const chip = interpolate(s, [B.dateChip, B.dateChip + 0.6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: OUT });
  // Once the points overlap, a solid pill smooths their edges into the island's exact shape.
  const pill = prog(frame, [B.toPill[0] + 0.45, B.toPill[1]], IN_OUT);

  return (
    <>
      <svg style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} viewBox={`0 0 ${W} ${H}`}>
        <g opacity={goalLine * chartFade}>
          <line x1={sx(-460)} x2={sx(-460 + 920 * goalLine)} y1={sy(GOAL_Y)} y2={sy(GOAL_Y)} stroke={C.goodText} strokeWidth={4} strokeDasharray="16 14" />
        </g>
        {linePts.length > 1 ? (
          <polyline points={linePts.join(' ')} fill="none" stroke={C.text} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" opacity={chartFade} />
        ) : null}
        {proj > 0 ? (
          <line
            x1={sx(last.x)}
            y1={sy(last.y)}
            x2={sx(mix(last.x, GOAL_X, proj))}
            y2={sy(mix(last.y, GOAL_Y, proj))}
            stroke={C.text}
            strokeWidth={6}
            strokeDasharray="4 16"
            strokeLinecap="round"
            opacity={chartFade * 0.6}
          />
        ) : null}
        {proj > 0.95 ? <circle cx={sx(GOAL_X)} cy={sy(GOAL_Y)} r={16 * chip} fill={C.good} stroke={C.goodText} strokeWidth={4} opacity={chartFade} /> : null}
      </svg>
      {pts.map((q, i) => (
        <div
          key={i}
          style={{
            ...centered(q.r * 2, q.r * 2, q.x, q.y),
            borderRadius: '50%',
            background: s >= B.toPill[0] ? C.text : dotColor,
            opacity: Math.min(1, 0.2 + toDots * 2),
          }}
        />
      ))}
      {pill > 0 ? <div style={{ ...centered(PILL.w, PILL.h), borderRadius: PILL.h / 2, background: C.text, opacity: pill }} /> : null}
      <div style={{ ...centered(300, 40, -310, GOAL_Y + 44), fontFamily: BODY, fontWeight: 600, fontSize: 26, letterSpacing: 2, color: C.goodText, opacity: goalLine * chartFade }}>GOAL 170 LB</div>
      <div
        style={{
          ...centered(230, 84, GOAL_X - 20, GOAL_Y - 92),
          borderRadius: 999,
          background: C.text,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: HEAD,
          fontWeight: 700,
          fontSize: 46,
          letterSpacing: 1,
          color: '#fff',
          opacity: chip * chartFade,
          filter: `blur(${(1 - chip) * 10}px)`,
          transform: `translateY(${(1 - chip) * 24}px)`,
        }}>
        JAN 10
      </div>
    </>
  );
}

/** The end card, under the phone: no camera move, everything centered. */
function EndCard({ s }: { s: number }) {
  const q = (t: number) => interpolate(s, [t, t + 0.6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: OUT });
  const word = q(B.endText);
  const tag = q(B.endText + 0.35);
  const url = q(B.endText + 0.7);
  const fx = (v: number): React.CSSProperties => ({ opacity: v, filter: `blur(${(1 - v) * 12}px)`, transform: `translateY(${(1 - v) * 26}px)` });
  return (
    <>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1290, textAlign: 'center', fontFamily: HEAD, fontWeight: 700, fontSize: 150, letterSpacing: 6, color: C.text, ...fx(word) }}>
        FORKCAST
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1470, textAlign: 'center', fontFamily: BODY, fontWeight: 600, fontSize: 44, color: C.text, ...fx(tag) }}>
        Snap. Log. Hit your goal.
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1580, display: 'flex', justifyContent: 'center', ...fx(url) }}>
        <div style={{ borderRadius: 999, background: C.cardHi, padding: '20px 40px', fontFamily: BODY, fontWeight: 600, fontSize: 34, color: C.text }}>
          jack1071-forkcast.expo.app
        </div>
      </div>
    </>
  );
}
