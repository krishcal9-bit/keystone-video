import React from 'react';
import {Composition} from 'remotion';
import {Main} from './Main';
import {FPS, TOTAL} from './lib/motion';

// Landscape only: 1920×1080, 30 fps, 30.0 s.
export const Root: React.FC = () => <Composition id="Keystone" component={Main} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />;
