import React from 'react';
import {AbsoluteFill, Easing, interpolate, interpolateColors, useCurrentFrame} from 'remotion';
import {Prompt} from '../components/Prompt';
import {fmt, monthOf, mono, theme} from '../theme';
import type {ContributionsProps} from '../types';

export const CONTRIB_SIZE = {width: 900, height: 250, duration: 150};

const CELL = 12;
const GAP = 3;
const PITCH = CELL + GAP;
const GRID_START = 24;
const COL_DELAY = 1.1;
const ROW_DELAY = 1.6;
const POP = 16;

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const Contributions: React.FC<ContributionsProps> = ({prompt, host, accent, weeks, total}) => {
  const frame = useCurrentFrame();
  const cols = weeks.length;
  const gridW = cols * PITCH - GAP;
  const left = (CONTRIB_SIZE.width - gridW) / 2 + 14;
  const top = 86;

  // Month label at the first column whose first day starts a new month.
  const months: {col: number; label: string}[] = [];
  weeks.forEach((w, c) => {
    const first = w[0];
    if (!first) return;
    const label = monthOf(first.date);
    const prev = months.at(-1);
    if (!prev || (prev.label !== label && c - prev.col >= 3)) months.push({col: c, label});
  });
  if (months.length > 1 && months[1].col - months[0].col < 3) months.shift();

  const waveEnd = GRID_START + cols * COL_DELAY + 7 * ROW_DELAY + POP;
  const counted = interpolate(frame, [GRID_START, waveEnd], [0, total], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{background: theme.bg, fontFamily: mono}}>
      <div style={{position: 'absolute', top: 22, width: '100%', display: 'flex', justifyContent: 'center'}}>
        <Prompt user={prompt} host={host} command="./contributions.sh" accent={accent} />
      </div>

      {months.map((m) => {
        const t = GRID_START + m.col * COL_DELAY;
        return (
          <div
            key={`${m.col}${m.label}`}
            style={{
              position: 'absolute',
              left: left + m.col * PITCH,
              top: top - 20,
              fontSize: 11,
              color: theme.muted,
              opacity: interpolate(frame, [t, t + 8], [0, 1], clamp),
            }}
          >
            {m.label}
          </div>
        );
      })}

      {['Mon', 'Wed', 'Fri'].map((d, i) => (
        <div
          key={d}
          style={{
            position: 'absolute',
            left: left - 34,
            top: top + (1 + i * 2) * PITCH - 1,
            fontSize: 10,
            color: theme.muted,
            opacity: interpolate(frame, [GRID_START - 6, GRID_START + 4], [0, 1], clamp),
          }}
        >
          {d}
        </div>
      ))}

      {weeks.map((w, c) =>
        w.map((d) => {
          const r = d.weekday;
          const t = GRID_START + c * COL_DELAY + r * ROW_DELAY;
          const p = interpolate(frame, [t, t + POP], [0, 1], {...clamp, easing: Easing.bezier(0.34, 1.36, 0.64, 1)});
          // Active cells arrive with a bright flash that cools to their level colour.
          const heat = d.level > 0 ? interpolate(frame, [t + 3, t + POP + 18], [1, 0], {...clamp, easing: Easing.out(Easing.quad)}) : 0;
          const base = theme.levels[d.level];
          const color = interpolateColors(heat, [0, 1], [base, '#b6ffbf']);
          return (
            <div
              key={d.date}
              style={{
                position: 'absolute',
                left: left + c * PITCH,
                top: top + r * PITCH,
                width: CELL,
                height: CELL,
                borderRadius: 3,
                background: color,
                opacity: interpolate(frame, [t, t + 7], [0, 1], clamp),
                transform: `scale(${p})`,
                boxShadow: heat > 0.05 ? `0 0 ${10 * heat}px ${theme.green}` : undefined,
              }}
            />
          );
        }),
      )}

      <div
        style={{
          position: 'absolute',
          left,
          top: top + 7 * PITCH + 12,
          width: gridW,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12,
          color: theme.muted,
          opacity: interpolate(frame, [GRID_START, GRID_START + 8], [0, 1], clamp),
        }}
      >
        <div>
          <span style={{color: theme.text, fontWeight: 800}}>{fmt(counted)}</span> contributions in the last year
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 3}}>
          Less
          {theme.levels.map((c) => (
            <div key={c} style={{width: 10, height: 10, borderRadius: 2, background: c, margin: '0 1px'}} />
          ))}
          More
        </div>
      </div>
    </AbsoluteFill>
  );
};
