// Renders the promo to out/forkcast-promo.mp4 with the soundtrack:  npm.cmd run sound, then npm.cmd run render
// (3D frames first: blender -b -P blender/phone.py -- snap 65 6 fast, and the same with end)
// This PC is Windows on ARM, where Remotion can't make videos directly, so:
// 1) Remotion renders every frame as a JPEG (out/frames), 2) the x64 ffmpeg that ships with Remotion
// (it runs fine under Windows' x64 emulation) joins them into an H.264 .mp4.
import { execFileSync, execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const ffmpeg = 'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe';
const out = process.argv[2] ?? 'out/forkcast-promo.mp4';
const audio = process.argv[3]; // optional soundtrack (.wav / .m4a)

rmSync('out/frames', { recursive: true, force: true });
execSync('npx.cmd remotion render Promo out/frames --sequence --image-format=jpeg --jpeg-quality=95', { stdio: 'inherit' });
const args = ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '30', '-i', 'out/frames/element-%03d.jpeg'];
if (audio) args.push('-i', audio, '-c:a', 'aac', '-b:a', '192k', '-shortest');
args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out);
execFileSync(ffmpeg, args, { stdio: 'inherit' });
console.log(`Saved ${out}`);
