// Makes the promo's soundtrack from scratch (no samples, nothing downloaded): node sound.mjs -> out/soundtrack.wav
// Every sound is placed from the same beat times as the animation (src/beats.ts), so re-timing the video re-times the sound.
// Style (from the skill's sound rules): soft pops and tonal ticks on shape changes, whooshes only under real movement,
// no dings or bells, a calm music bed about 10 dB under the effects, a swell and a low hit on the final landing.
import { mkdirSync, writeFileSync } from 'node:fs';

import { B } from './src/beats.ts';

const SR = 48000;
const LEN = Math.ceil(B.end * SR);
const music = [new Float32Array(LEN), new Float32Array(LEN)];
const sfx = [new Float32Array(LEN), new Float32Array(LEN)];
const SNAP_LAND = B.snap3d + 78 / 30;
const END_LAND = B.end3d + 138 / 30;

// Repeatable "random" numbers, so the soundtrack is the same every time.
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const db = (d) => Math.pow(10, d / 20);
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

function add(bus, t, samples, gain, pan = 0) {
  const start = Math.round(t * SR);
  const l = gain * Math.min(1, 1 - pan);
  const r = gain * Math.min(1, 1 + pan);
  for (let i = 0; i < samples.length; i++) {
    const j = start + i;
    if (j < 0 || j >= LEN) continue;
    bus[0][j] += samples[i] * l;
    bus[1][j] += samples[i] * r;
  }
}

/** A tone that glides from f0 to f1, with a quick attack and an exponential fade. */
function tone(dur, f0, f1, attack, decay, harmonics = [[1, 1]]) {
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = f0 * Math.pow(f1 / f0, i / n);
    ph += (2 * Math.PI * f) / SR;
    const env = Math.min(1, t / attack) * Math.exp(-t / decay);
    let v = 0;
    for (const [k, a] of harmonics) v += Math.sin(ph * k) * a;
    out[i] = v * env;
  }
  return out;
}

/** Filtered noise whose center frequency sweeps lo -> hi -> lo: an airy whoosh. Fades in and out smoothly. */
function whoosh(dur, lo, hi, q = 1.4) {
  const n = Math.round(dur * SR);
  const out = new Float32Array(n);
  let low = 0, band = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const fc = lo + (hi - lo) * Math.sin(Math.PI * u);
    const f = 2 * Math.sin((Math.PI * fc) / SR);
    const x = rnd();
    low += f * band;
    const high = x - low - band / q;
    band += f * high;
    out[i] = band * Math.pow(Math.sin(Math.PI * u), 2) * 0.6;
  }
  return out;
}

/** A short burst of bright noise plus a little tonal click. */
function tick(pitch = 1) {
  const n = Math.round(0.05 * SR);
  const out = new Float32Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const x = rnd();
    const hp = x - prev; // crude high-pass
    prev = x;
    out[i] = hp * Math.exp(-t / 0.004) * 0.5 + Math.sin(2 * Math.PI * 2100 * pitch * t) * Math.exp(-t / 0.008) * 0.6;
  }
  return out;
}

const pop = (pitch = 1) => tone(0.2, 620 * pitch, 190 * pitch, 0.002, 0.04);
/** Soft wooden mallet (marimba-like): fundamental plus a quiet 4th harmonic, short decay. */
const mallet = (f) => tone(0.7, f, f, 0.002, 0.22, [[1, 1], [4, 0.18], [10, 0.04]]);
const softHit = () => tone(1.2, 120, 42, 0.003, 0.3);

// ---------- Sound effects on the beats ----------
const S = (t, smp, d, pan = 0) => add(sfx, t, smp, db(d), pan);

// 1. Logo: the dot appears, the ring draws (a rising whoosh), the fork lands.
S(B.dot, pop(1.1), -12);
S(B.ringDraw[0], whoosh(B.ringDraw[1] - B.ringDraw[0], 300, 2600), -24);
S(B.fork[0] + 0.35, mallet(hz(62)), -15);
// 2. Ring fills into the button; the button is pressed (a camera shutter).
S(B.toButton[0] + 0.25, pop(0.8), -12);
S(B.squash[0] + 0.08, tick(0.8), -9);
S(B.squash[0] + 0.13, tick(1.1), -11);
// 3. The 3D pull-back and spin: one long whoosh under the movement, a soft settle when it lands.
S(B.snap3d, whoosh(SNAP_LAND - B.snap3d + 0.3, 180, 1800, 0.9), -17);
S(SNAP_LAND - 0.02, softHit(), -20);
// Scan: a faint glassy glide.
S(B.scan[0], tone(B.scan[1] - B.scan[0], 900, 1500, 0.3, 0.9), -30);
// 4. The photo lifts out into the card; numbers tick up; the button press.
S(B.lift[0], whoosh(B.lift[1] - B.lift[0] + 0.2, 400, 3200), -22);
for (let i = 0; i < 14; i++) {
  const u = i / 13;
  S(B.count[0] + (B.count[1] - B.count[0]) * Math.pow(u, 1.6), tick(0.9 + u * 0.5), -21 + u * 3);
}
S(B.press[0], tick(0.7), -10);
S(B.press[0] + 0.05, pop(0.9), -15);
// 5. Card floods the frame; the ring sweeps round.
S(B.flood[0], whoosh(B.flood[1] - B.flood[0] + 0.2, 250, 2200), -22);
S(B.ring[0], tone(B.ring[1] - B.ring[0], 300, 600, 0.05, 1.2, [[1, 1], [2, 0.3]]), -27);
// 6. The week: one mallet note per ring, rising up the scale, then the streak chip.
S(B.toWeek[0], pop(0.7), -16);
[62, 64, 66, 69, 71, 74, 76].forEach((m, i) => S(B.weekFill[0] + i * 0.2 + 0.1, mallet(hz(m)), -16, -0.6 + i * 0.2));
S(B.streak, pop(1.2), -15);
// 7. Rings become points (little ticks), the line draws, the date chip pops.
for (let i = 0; i < 7; i++) S(B.toDots[0] + 0.3 + i * 0.05, tick(1.3 - i * 0.04), -22, -0.6 + i * 0.2);
S(B.line[0], whoosh(B.line[1] - B.line[0], 500, 2400), -27);
S(B.dateChip, pop(1.05), -13);
// 8. Points slide together into the island (a soft "suction"), then the long 3D pull-back and turn, landing on a low hit.
S(B.toPill[0], tone(B.toPill[1] - B.toPill[0] + 0.15, 900, 220, 0.25, 0.6), -22);
S(B.toPill[1] - 0.02, tick(0.6), -14);
S(B.end3d, whoosh(END_LAND - B.end3d + 0.4, 160, 1600, 0.8), -16);
S(END_LAND - 0.03, softHit(), -12);
S(B.endText, pop(0.9), -18);

// ---------- Music bed: warm pad chords + a soft mallet arpeggio, D major, 100 BPM ----------
const BEAT = 60 / 100;
const chords = [
  [50, 57, 62, 66], // D
  [47, 54, 59, 62], // Bm
  [43, 50, 55, 59], // G
  [45, 52, 57, 61], // A
];
const BAR = BEAT * 4;
for (let bar = 0; bar * BAR < B.end; bar++) {
  const t = bar * BAR;
  // Land on D major for the end card.
  const chord = t >= B.end3d ? chords[0] : chords[bar % 4];
  for (const m of chord) {
    const pad = tone(BAR + 1.2, hz(m), hz(m), 0.6, 3.0, [[1, 1], [2, 0.25], [3, 0.08]]);
    add(music, t, pad, db(-30), (m % 3) * 0.3 - 0.3);
  }
  // Eighth-note arpeggio, very quiet, from the first logo beat until just before the end card.
  if (t > 0.5 && t < B.endText) {
    for (let k = 0; k < 8; k++) {
      const note = chord[[0, 2, 1, 3, 2, 3, 1, 2][k]] + 12;
      add(music, t + k * (BEAT / 2), mallet(hz(note)), db(-31), k % 2 ? 0.35 : -0.35);
    }
  }
}
// Fade the music in, lift it a little into the 3D ending, and fade it out at the very end.
for (let i = 0; i < LEN; i++) {
  const t = i / SR;
  const g = Math.min(1, t / 1.5) * (t > B.end3d ? 1 + 0.6 * Math.min(1, (t - B.end3d) / 3) : 1) * Math.min(1, (B.end - t) / 1.2);
  music[0][i] *= g;
  music[1][i] *= g;
}

// ---------- Mix, limit and save ----------
const mix = [new Float32Array(LEN), new Float32Array(LEN)];
let peak = 0;
for (let c = 0; c < 2; c++)
  for (let i = 0; i < LEN; i++) {
    mix[c][i] = sfx[c][i] + music[c][i];
    peak = Math.max(peak, Math.abs(mix[c][i]));
  }
const norm = db(-1.5) / peak; // peaks at -1.5 dBFS
const pcm = Buffer.alloc(44 + LEN * 4);
pcm.write('RIFF', 0);
pcm.writeUInt32LE(36 + LEN * 4, 4);
pcm.write('WAVEfmt ', 8);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20);
pcm.writeUInt16LE(2, 22);
pcm.writeUInt32LE(SR, 24);
pcm.writeUInt32LE(SR * 4, 28);
pcm.writeUInt16LE(4, 32);
pcm.writeUInt16LE(16, 34);
pcm.write('data', 36);
pcm.writeUInt32LE(LEN * 4, 40);
for (let i = 0; i < LEN; i++)
  for (let c = 0; c < 2; c++) pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, mix[c][i] * norm)) * 32767), 44 + i * 4 + c * 2);
mkdirSync('out', { recursive: true });
writeFileSync('out/soundtrack.wav', pcm);
console.log(`Saved out/soundtrack.wav (${B.end}s). Peak before limiting ${(20 * Math.log10(peak)).toFixed(1)} dB, normalized to -1.5 dBFS.`);
