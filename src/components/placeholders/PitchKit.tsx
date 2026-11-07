import React from 'react';
import {C} from '../../lib/brand';
import {SANS, serif} from '../../lib/fonts';
import {ease, mix} from '../../lib/motion';
import {Cursor} from '../Cursor';
import {AppHeader, Bar, Card, Chip, Label, ScreenProps, Title} from './common';

const SALUTATION = 'Estimada congregación:';
const BODY = 'Gracias por recibirnos. Su terreno puede dar hogar a familias de nuestra comunidad.';
const CLICK_ES = 14;
const TYPE_START = 20;
const CPS = 3.2; // characters per frame

export const PitchKit: React.FC<ScreenProps> = ({f}) => {
  const es = ease(f, CLICK_ES, 8);
  const typed = Math.max(0, Math.floor((f - TYPE_START) * CPS));
  const sal = SALUTATION.slice(0, typed);
  const body = BODY.slice(0, Math.max(0, typed - SALUTATION.length));
  const doneAt = TYPE_START + (SALUTATION.length + BODY.length) / CPS;
  const caretOn = Math.floor(f / 8) % 2 === 0 || f < doneAt;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#EEF2EF'}}>
      <AppHeader active="Pitch Kit" />
      <Card x={24} y={88} w={420} h={888}>
        <div style={{padding: 28, display: 'flex', flexDirection: 'column', gap: 20}}>
          <Title>Pitch Kit</Title>
          <Label size={15}>Language</Label>
          <div style={{position: 'relative', height: 50, borderRadius: 999, background: C.pineSoft, display: 'flex'}}>
            <div
              style={{
                position: 'absolute',
                top: 4,
                left: 4 + es * 178,
                width: 178,
                height: 42,
                borderRadius: 999,
                background: C.surface,
                boxShadow: '0 1px 3px rgba(24,36,32,0.12)',
              }}
            />
            {['English', 'Español'].map((l, i) => (
              <div
                key={l}
                style={{
                  position: 'relative',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: SANS,
                  fontWeight: 600,
                  fontSize: 17,
                  color: (i === 1 ? es : 1 - es) > 0.5 ? C.pine : C.ink2,
                }}
              >
                {l}
              </div>
            ))}
          </div>
          <Label size={15} style={{marginTop: 8}}>Audience</Label>
          <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
            <Chip on={1}>Congregation</Chip>
            <Chip>Board</Chip>
            <Chip>Pastor</Chip>
          </div>
          <Label size={15} style={{marginTop: 8}}>Includes</Label>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 12}}>
              <div style={{width: 22, height: 22, borderRadius: 6, background: C.pine}} />
              <Bar w={220 - i * 40} h={12} />
            </div>
          ))}
          <div style={{height: 52, borderRadius: 12, background: C.pine, marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Label size={17} color={C.surface}>Draft letter</Label>
          </div>
        </div>
      </Card>
      {/* the letter */}
      <div
        style={{
          position: 'absolute',
          left: 540,
          top: 120,
          width: 940,
          height: 860,
          background: C.surface,
          borderRadius: 6,
          boxShadow: '0 1px 2px rgba(24,36,32,0.05), 0 18px 40px rgba(24,36,32,0.10)',
          padding: '72px 84px',
          boxSizing: 'border-box',
        }}
      >
        <Bar w={160} h={12} />
        <div style={{height: 46}} />
        <div style={{...serif(40, 600, 50), color: C.ink, minHeight: 48}}>
          {sal}
          {typed <= SALUTATION.length && f >= TYPE_START && caretOn && <Caret h={40} />}
        </div>
        <div style={{height: 22}} />
        <div style={{fontFamily: SANS, fontWeight: 400, fontSize: 28, lineHeight: 1.55, color: C.ink, minHeight: 90, maxWidth: 740}}>
          {body}
          {typed > SALUTATION.length && caretOn && <Caret h={28} />}
        </div>
        <div style={{height: 26}} />
        {/* the rest of the letter writes itself as skeleton lines */}
        {[640, 700, 560, 680, 420].map((w, i) => {
          const t = ease(f, doneAt - 6 + i * 4, 14);
          return <Bar key={i} w={w * t} h={14} style={{marginBottom: 22, opacity: t > 0 ? 1 : 0}} />;
        })}
        <div style={{height: 24}} />
        <Bar w={mix(0, 220, ease(f, doneAt + 18, 12))} h={14} color={C.pineMist2} />
      </div>
      <Cursor
        frame={f}
        appearAt={2}
        path={[
          {at: 2, x: 360, y: 420},
          {at: CLICK_ES, x: 325, y: 237, click: true},
          {at: 36, x: 470, y: 330},
        ]}
        hideAt={44}
      />
    </div>
  );
};

const Caret: React.FC<{h: number}> = ({h}) => (
  <span style={{display: 'inline-block', width: 3, height: h * 0.95, background: C.pine, marginLeft: 3, verticalAlign: 'text-bottom', borderRadius: 2}} />
);
