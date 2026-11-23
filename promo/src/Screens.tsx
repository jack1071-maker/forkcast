import { loadFont as loadBarlow } from '@remotion/google-fonts/BarlowCondensed';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';

/*
 * The two phone screens used as textures on the Blender phone, at real iPhone resolution (1179 × 2556, 3× the
 * app's 393-point layout). They copy the app's real design: colors and fonts from src/lib/ui.ts,
 * the Today screen layout from src/components/screens/today.tsx.
 */

export const SCREEN_W = 1179;
export const SCREEN_H = 2556;
/** Where the camera viewfinder (the photo) sits on the snap screen, in screen pixels. Used to line up the 2D card. */
export const VIEWFINDER = { x: 0, y: 420, w: 1179, h: 1572 };

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

/** App sizes are in points; the screen is 3 pixels per point. */
const P = 3;

function StatusBar({ dark }: { dark?: boolean }) {
  const c = dark ? '#fff' : C.text;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 54 * P, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${8 * P}px ${34 * P}px 0` }}>
      <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 17 * P, color: c }}>12:30</span>
      {/* signal, wifi, battery (simple shapes, room left in the middle for the Dynamic Island) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 * P }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 * P, height: 12 * P }}>
          {[4, 6, 8, 11].map((h, i) => (
            <div key={i} style={{ width: 3 * P, height: h * P, borderRadius: P, background: c }} />
          ))}
        </div>
        <div style={{ width: 25 * P, height: 12 * P, borderRadius: 4 * P, border: `${1.2 * P}px solid ${c}`, padding: 1.5 * P, opacity: 0.95 }}>
          <div style={{ width: '78%', height: '100%', borderRadius: 2 * P, background: c }} />
        </div>
      </div>
    </div>
  );
}

/** Forkcast's camera view: the photo in a 3:4 viewfinder, black above and below, a white shutter button. */
export function ScreenSnap() {
  const corner = (k: number): React.CSSProperties => ({
    position: 'absolute',
    width: 70,
    height: 70,
    left: k % 2 ? undefined : 70,
    right: k % 2 ? 70 : undefined,
    top: k < 2 ? 70 : undefined,
    bottom: k < 2 ? undefined : 70,
    borderColor: 'rgba(255,255,255,0.92)',
    borderStyle: 'solid',
    borderWidth: 0,
    borderTopWidth: k < 2 ? 8 : 0,
    borderBottomWidth: k < 2 ? 0 : 8,
    borderLeftWidth: k % 2 ? 0 : 8,
    borderRightWidth: k % 2 ? 8 : 0,
    borderRadius: 20,
  });
  return (
    <AbsoluteFill style={{ background: '#0B0B0B' }}>
      <StatusBar dark />
      <div style={{ position: 'absolute', top: 70 * P, left: 0, right: 0, textAlign: 'center', fontFamily: HEAD, fontWeight: 700, fontSize: 30 * P, letterSpacing: 1.5 * P, color: '#fff' }}>
        SNAP YOUR FOOD
      </div>
      <div style={{ position: 'absolute', left: VIEWFINDER.x, top: VIEWFINDER.y, width: VIEWFINDER.w, height: VIEWFINDER.h, overflow: 'hidden' }}>
        <Img src={staticFile('meal.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {[0, 1, 2, 3].map((k) => (
          <div key={k} style={corner(k)} />
        ))}
      </div>
      <div style={{ position: 'absolute', top: VIEWFINDER.y + VIEWFINDER.h + 16 * P, left: 0, right: 0, textAlign: 'center', fontFamily: BODY, fontWeight: 600, fontSize: 13 * P, letterSpacing: 1.4 * P, color: 'rgba(255,255,255,0.6)' }}>
        PHOTO · BARCODE
      </div>
      {/* Shutter */}
      <div style={{ position: 'absolute', left: SCREEN_W / 2 - 40 * P, top: 2556 - 122 * P, width: 80 * P, height: 80 * P, borderRadius: '50%', border: `${5 * P}px solid #fff`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 62 * P, height: 62 * P, borderRadius: '50%', background: '#fff' }} />
      </div>
    </AbsoluteFill>
  );
}

function Ring({ r, stroke, p, color, children }: { r: number; stroke: number; p: number; color: string; children?: React.ReactNode }) {
  const size = r * 2 + stroke;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ position: 'absolute', left: 0, top: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={C.line} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circ} ${circ}`} strokeDashoffset={circ * (1 - p)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      {children}
    </div>
  );
}

const label: React.CSSProperties = { fontFamily: BODY, fontWeight: 600, fontSize: 11 * P, letterSpacing: 1.4 * P, color: C.muted, textTransform: 'uppercase' };
const card: React.CSSProperties = { background: C.card, borderRadius: 20 * P, border: `${P}px solid ${C.line}`, padding: 18 * P };

/** Forkcast's Today screen with sample data (the same numbers as the 2D shots). */
export function ScreenToday() {
  const week = [0.94, 0.98, 0.9, 1, 0.96, 0.92, 0.55];
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const macros = [
    { l: 'Protein', v: 71, g: 150, c: C.protein },
    { l: 'Carbs', v: 120, g: 220, c: C.carbs },
    { l: 'Fat', v: 40, g: 64, c: C.fat },
  ];
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <StatusBar />
      <div style={{ position: 'absolute', top: 64 * P, left: 20 * P, right: 20 * P, display: 'flex', flexDirection: 'column', gap: 14 * P }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 12 * P, letterSpacing: 1.2 * P, color: C.muted }}>SUNDAY, NOV 22</div>
            <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 36 * P, lineHeight: 1.1, letterSpacing: P, color: C.text }}>TODAY</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 * P, border: `${P}px solid ${C.line}`, borderRadius: 999, padding: `${6 * P}px ${12 * P}px`, marginBottom: 4 * P }}>
            <svg width={16 * P} height={16 * P} viewBox="0 0 24 24" fill="none" stroke={C.carbs} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3c.5 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3.6 2.4-4.6.2 1.8 1 2.8 2.1 3.1C11 9.5 11 6 12 3z" />
            </svg>
            <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 18 * P, color: C.text }}>11</span>
            <span style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 13 * P, letterSpacing: 0.8 * P, color: C.muted }}>DAYS</span>
          </div>
        </div>
        {/* Week strip */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {week.map((p, i) => (
            <div key={i} style={{ alignItems: 'center', display: 'flex', flexDirection: 'column', gap: 4 * P, padding: `${6 * P}px ${3 * P}px`, borderRadius: 14 * P, minWidth: 42 * P, ...(i === 6 ? { background: C.card, border: `${P}px solid ${C.line}` } : {}) }}>
              <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 11 * P, letterSpacing: P, color: i === 6 ? C.text : C.muted }}>{days[i]}</span>
              <Ring r={15 * P} stroke={3.5 * P} p={p} color={i === 6 ? C.ring : C.good}>
                <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 12 * P, color: C.text }}>{16 + i}</span>
              </Ring>
            </div>
          ))}
        </div>
        {/* Calories */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 * P, paddingTop: 26 * P, paddingBottom: 26 * P }}>
          <div style={{ ...label, alignSelf: 'flex-start' }}>Calories</div>
          <Ring r={103 * P} stroke={14 * P} p={0.55} color={C.ring}>
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 64 * P, lineHeight: 1.1, color: C.text }}>960</span>
              <span style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 15 * P, letterSpacing: 2 * P, color: C.muted }}>CAL LEFT</span>
            </div>
          </Ring>
          <div style={{ display: 'flex', alignSelf: 'stretch', alignItems: 'center', marginTop: 8 * P }}>
            {[
              ['1,160', 'Eaten', C.text],
              ['2,120', 'Goal', C.text],
              ['55%', 'Of goal', C.text],
            ].map(([v, l, c], i) => (
              <React.Fragment key={l}>
                {i ? <div style={{ width: P, height: 30 * P, background: C.line }} /> : null}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 24 * P, color: c }}>{v}</span>
                  <span style={{ ...label, fontSize: 10 * P }}>{l}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
        {/* Macros */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 * P }}>
          <div style={label}>Macros</div>
          <div style={{ display: 'flex', gap: 16 * P }}>
            {macros.map((m) => (
              <div key={m.l} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 * P }}>
                <span style={label}>{m.l}</span>
                <div style={{ height: 4 * P, borderRadius: 2 * P, background: C.line, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(m.v / m.g) * 100}%`, background: m.c }} />
                </div>
                <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 20 * P, color: C.text }}>
                  {m.v}
                  <span style={{ fontWeight: 600, fontSize: 14 * P, color: C.muted }}> / {m.g} g</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Tab bar */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 96 * P, borderTop: `${P}px solid ${C.line}`, background: C.bg, display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', paddingTop: 10 * P }}>
        {['TODAY', '', 'HISTORY', 'PROGRESS'].map((t, i) =>
          i === 1 ? (
            <div key={i} style={{ width: 60 * P, height: 60 * P, borderRadius: '50%', background: C.text, border: `${4 * P}px solid ${C.bg}`, marginTop: -26 * P, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width={26 * P} height={26 * P} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />
                <circle cx={12} cy={12.5} r={3.5} />
              </svg>
            </div>
          ) : (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 * P, width: 80 * P }}>
              <div style={{ width: 24 * P, height: 24 * P, borderRadius: '50%', border: `${1.8 * P}px solid ${i === 0 ? C.text : C.muted}`, opacity: i === 0 ? 1 : 0.8 }} />
              <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 10 * P, letterSpacing: P, color: i === 0 ? C.text : C.muted }}>{t}</span>
            </div>
          ),
        )}
      </div>
    </AbsoluteFill>
  );
}
