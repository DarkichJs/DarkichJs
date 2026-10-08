import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {mono, theme} from '../theme';

/** `user@host ~ $ command` with the command typed out and a blinking cursor. */
export const Prompt: React.FC<{
  user: string;
  host: string;
  command: string;
  accent: string;
  start?: number;
  charsPerFrame?: number;
  size?: number;
}> = ({user, host, command, accent, start = 0, charsPerFrame = 0.9, size = 17}) => {
  const frame = useCurrentFrame() - start;
  const typed = Math.floor(interpolate(frame, [0, command.length / charsPerFrame], [0, command.length], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }));
  const done = typed >= command.length;
  // Solid while typing, then blinks every 16 frames.
  const cursorOn = !done || Math.floor(frame / 16) % 2 === 0;
  const opacity = interpolate(frame, [-6, 0], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <div style={{fontFamily: mono, fontSize: size, fontWeight: 700, color: theme.text, opacity, whiteSpace: 'pre'}}>
      <span style={{color: accent}}>{user}@{host}</span>
      <span style={{color: theme.muted}}> ~ </span>
      <span style={{color: theme.green}}>$ </span>
      {command.slice(0, typed)}
      <span
        style={{
          display: 'inline-block',
          width: '0.6em',
          height: '1.1em',
          marginLeft: 2,
          verticalAlign: 'text-bottom',
          background: cursorOn ? theme.text : 'transparent',
        }}
      />
    </div>
  );
};
