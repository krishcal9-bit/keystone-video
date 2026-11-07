// Scan shots, then render both cuts. Usage: node scripts/render.mjs [horizontal|vertical|all]
import {execFileSync} from 'node:child_process';

const which = process.argv[2] ?? 'all';
const run = (args) => execFileSync('npx', args, {stdio: 'inherit'});
run(['node', 'scripts/scan-shots.mjs']);
const common = ['--codec=h264', '--crf=18', '--x264-preset=slow', '--pixel-format=yuv420p', '--muted', '--image-format=jpeg', '--jpeg-quality=95'];
if (which !== 'vertical') run(['remotion', 'render', 'src/index.ts', 'Keystone', 'out/keystone-30s.mp4', ...common]);
if (which !== 'horizontal') run(['remotion', 'render', 'src/index.ts', 'KeystoneVertical', 'out/keystone-30s-vertical.mp4', ...common]);
