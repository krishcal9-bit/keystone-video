import React from 'react';
import {C} from '../lib/brand';
import {serif} from '../lib/fonts';

/**
 * "Keystone" wordmark: Fraunces semibold, slightly soft, tight tracking,
 * with a tiny brass keystone notch set into the K's crotch.
 */
export const Wordmark: React.FC<{size: number; color?: string; weight?: number; notch?: number; bg?: string; style?: React.CSSProperties}> = ({
  size,
  color = C.ink,
  weight = 600,
  notch = 1,
  bg = C.paper,
  style,
}) => {
  // Measured on Fraunces 600 / opsz 144: K stem spans 0.10–0.24 em, cap top at 0.16 em.
  // The brass keystone is set into the top of the stem, outlined in paper so it reads as a cut.
  const w = size * 0.135;
  const h = size * 0.125;
  return (
    <span style={{...serif(size, weight, 50), color, display: 'inline-block', position: 'relative', lineHeight: 1, whiteSpace: 'nowrap', ...style}}>
      <span style={{position: 'relative', display: 'inline-block'}}>
        K
        <svg
          width={w}
          height={h}
          viewBox="0 0 27 25"
          style={{
            position: 'absolute',
            left: size * 0.168 - w / 2,
            top: size * 0.148,
            opacity: notch > 0 ? 1 : 0,
            transform: `translateY(${(1 - notch) * -size * 0.22}px)`,
            overflow: 'visible',
          }}
        >
          <path d="M1,1 L26,1 L20.5,24 L6.5,24 Z" fill={C.brass} stroke={bg} strokeWidth={2.2} strokeLinejoin="round" />
        </svg>
      </span>
      eystone
    </span>
  );
};
