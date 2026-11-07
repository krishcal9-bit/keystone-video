import React from 'react';
import {C} from '../../lib/brand';
import {ease, mix} from '../../lib/motion';
import {AppHeader, Bar, Card, Label, ScreenProps, Title} from './common';

/** "Searching vs. waiting" comparison. */
export const SearchVsWait: React.FC<ScreenProps> = ({f}) => (
  <div style={{position: 'absolute', inset: 0, background: C.paper}}>
    <AppHeader />
    {[0, 1].map((col) => {
      const searching = col === 1;
      return (
        <Card key={col} x={80 + col * 740} y={130} w={700} h={800}>
          <div style={{padding: 44, display: 'flex', flexDirection: 'column', gap: 22}}>
            <Label size={20} color={searching ? C.pine : C.ink2}>{searching ? 'Searching' : 'Waiting'}</Label>
            <Title size={44}>{searching ? 'Every eligible site' : 'One offer at a time'}</Title>
            <div style={{height: 10}} />
            {Array.from({length: 9}, (_, i) => {
              const t = searching ? ease(f, 8 + i * 3, 10) : i === 6 ? ease(f, 40, 16) : 0;
              return (
                <div key={i} style={{display: 'flex', alignItems: 'center', gap: 16, opacity: mix(0.3, 1, t)}}>
                  <div style={{width: 18, height: 18, borderRadius: 99, background: t > 0.5 ? (searching ? C.pine : C.ink2) : C.line}} />
                  <Bar w={mix(120, 420 - (i % 3) * 60, t)} h={14} color={t > 0.5 ? C.pineMist : C.line} />
                </div>
              );
            })}
          </div>
        </Card>
      );
    })}
  </div>
);
