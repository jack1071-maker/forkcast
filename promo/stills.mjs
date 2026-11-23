// Renders still frames for review: node stills.mjs 1.0 2.5 4 ...  (seconds) -> out/stills/
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';

const times = process.argv.slice(2).map(Number);
// This PC is Windows on ARM, where Remotion can't download its own browser, so use the installed Chrome.
const browserExecutable = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const composition = await selectComposition({ serveUrl, id: 'Promo', browserExecutable });
for (const t of times) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(t * composition.fps));
  const output = path.resolve(`out/stills/t${t.toFixed(2).padStart(5, '0')}.jpg`);
  await renderStill({ composition, serveUrl, browserExecutable, frame, output, imageFormat: 'jpeg', jpegQuality: 80, scale: 0.4 });
  console.log('rendered', t);
}
