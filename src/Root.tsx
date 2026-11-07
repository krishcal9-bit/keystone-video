import React from 'react';
import {Composition} from 'remotion';
import {Main} from './Main';
import {FPS, TOTAL} from './lib/motion';

export const Root: React.FC = () => (
  <>
    <Composition id="Keystone" component={Main} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
    <Composition id="KeystoneVertical" component={Main} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />
  </>
);
