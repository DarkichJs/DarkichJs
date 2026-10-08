import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {mono, theme} from '../theme';

/** macOS-style terminal window that springs in at `start`. */
export const TerminalWindow: React.FC<{
  title: string;
  start?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({title, start = 0, style, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - start, fps, config: {damping: 18, stiffness: 140, mass: 0.7}});
  const opacity = interpolate(frame - start, [0, 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <div
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        borderRadius: 10,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        opacity,
        transform: `translateY(${(1 - p) * 18}px) scale(${0.96 + p * 0.04})`,
        ...style,
      }}
    >
      <div
        style={{
          height: 26,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
          gap: 6,
          borderBottom: `1px solid ${theme.border}`,
          background: theme.card,
          position: 'relative',
        }}
      >
        {theme.dots.map((c) => (
          <div key={c} style={{width: 9, height: 9, borderRadius: 5, background: c}} />
        ))}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: mono,
            fontSize: 10,
            color: theme.muted,
          }}
        >
          {title}
        </div>
      </div>
      <div style={{flex: 1, position: 'relative'}}>{children}</div>
    </div>
  );
};
