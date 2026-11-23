import { Composition, Still } from 'remotion';

import { DURATION, FPS, Promo } from './Promo';
import { SCREEN_H, SCREEN_W, ScreenSnap, ScreenToday } from './Screens';

/** The Forkcast promo: vertical 9:16 (1080 × 1920). Plus the two phone screens used as textures in Blender. */
export function Root() {
  return (
    <>
      <Composition id="Promo" component={Promo} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} />
      <Still id="ScreenSnap" component={ScreenSnap} width={SCREEN_W} height={SCREEN_H} />
      <Still id="ScreenToday" component={ScreenToday} width={SCREEN_W} height={SCREEN_H} />
    </>
  );
}
