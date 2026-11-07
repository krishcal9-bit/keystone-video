// Scan shots + prepare music, then render out/keystone-30s.mp4 (1920×1080, 30 fps, H.264, AAC when music exists).
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';

const run = (cmd, args) => execFileSync(cmd, args, {stdio: 'inherit'});
run('node', ['scripts/scan-shots.mjs']);
run('npx', ['tsx', 'scripts/music.ts']);
const hasMusic = JSON.parse(fs.readFileSync('src/music.generated.json', 'utf8')).present;
const args = ['remotion', 'render', 'src/index.ts', 'Keystone', 'out/keystone-30s.mp4', '--codec=h264', '--crf=18', '--x264-preset=slow', '--pixel-format=yuv420p', '--image-format=jpeg', '--jpeg-quality=95'];
if (hasMusic) args.push('--audio-codec=aac', '--audio-bitrate=256k');
else args.push('--muted');
run('npx', args);
console.log(hasMusic ? 'Rendered with music.' : 'Rendered without audio (public/music.mp3 not found).');
