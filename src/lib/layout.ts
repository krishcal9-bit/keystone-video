import {useVideoConfig} from 'remotion';
import {SAFE} from './brand';

/** Layout helper: the same scenes re-lay out for 1920×1080 and 1080×1920. */
export const useL = () => {
  const {width, height} = useVideoConfig();
  const V = height > width;
  return {W: width, H: height, V, M: SAFE, CW: width - SAFE * 2};
};
