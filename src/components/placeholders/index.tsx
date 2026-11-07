import React from 'react';
import {C} from '../../lib/brand';
import type {SlotId} from '../../slots';
import {ArchIcon} from '../Arch';
import {VH, VW, ScreenProps} from './common';
import {LawLot} from './LawLot';
import {LotScan} from './LotScan';
import {PitchKit} from './PitchKit';
import {PlanStudio} from './PlanStudio';
import {SearchVsWait} from './SearchVsWait';
import {SiteFinder} from './SiteFinder';

export {VW, VH};

const IntroLogo: React.FC<ScreenProps> = () => (
  <div style={{position: 'absolute', inset: 0, background: C.paper, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
    <ArchIcon size={360} />
  </div>
);

const SCREENS: Record<SlotId, React.FC<ScreenProps>> = {
  'law-lot': LawLot,
  'intro-logo': IntroLogo,
  'site-finder': SiteFinder,
  'lot-scan': LotScan,
  'plan-studio': PlanStudio,
  'pitch-kit': PitchKit,
  'search-vs-wait': SearchVsWait,
};

export const Placeholder: React.FC<{id: SlotId} & ScreenProps> = ({id, ...p}) => {
  const S = SCREENS[id];
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: VW, height: VH, overflow: 'hidden'}}>
      <S {...p} />
    </div>
  );
};
