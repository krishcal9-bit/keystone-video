import {Config} from '@remotion/cli/config';
import fs from 'node:fs';

// Use the pre-installed headless shell when present (no download needed).
const SHELL =
  '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
if (fs.existsSync(SHELL)) {
  Config.setBrowserExecutable(SHELL);
}

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
Config.setOverwriteOutput(true);
Config.setConcurrency(4);
