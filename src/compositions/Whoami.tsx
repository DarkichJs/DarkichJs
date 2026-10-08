import React from 'react';
import {AbsoluteFill, Easing, interpolate, interpolateColors, useCurrentFrame} from 'remotion';
import {Prompt} from '../components/Prompt';
import {TerminalWindow} from '../components/TerminalWindow';
import {fmt, mono, rand, shortDate, theme} from '../theme';
import type {Ascii, Stats, WhoamiProps} from '../types';

export const WHOAMI_SIZE = {width: 900, height: 480, duration: 180};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const PAD = 12;
const WIN_TOP = 62;
const WIN_W = (WHOAMI_SIZE.width - PAD * 2 - 16) / 2;
const WIN_H = WHOAMI_SIZE.height - WIN_TOP - PAD;
const BODY_H = WIN_H - 26;

const SCAN_START = 26;
const SCAN_FRAMES = 64;
const GLITCH = '!<>-_\\/[]{}=+*^?#%$01';

const AsciiPortrait: React.FC<{ascii: Ascii; accent: string}> = ({ascii, accent}) => {
  const frame = useCurrentFrame();
  const ASPECT = 2; // must match imageToAscii's charAspect
  const charW = Math.min((WIN_W - 20) / ascii.cols, (BODY_H - 20) / ascii.rows / ASPECT);
  const lineH = charW * ASPECT;
  const fontSize = charW / 0.6;

  // Scanline position in rows; a few rows behind it are still "decoding".
  const scan = interpolate(frame, [SCAN_START, SCAN_START + SCAN_FRAMES], [-2, ascii.rows + 3], {
    ...clamp,
    easing: Easing.bezier(0.45, 0, 0.25, 1),
  });
  const scanOpacity = interpolate(frame, [SCAN_START, SCAN_START + 4, SCAN_START + SCAN_FRAMES, SCAN_START + SCAN_FRAMES + 8], [0, 1, 1, 0], clamp);

  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <div style={{position: 'relative', width: charW * ascii.cols, height: lineH * ascii.rows}}>
        {ascii.cells.map((row, r) => {
          const behind = scan - r;
          if (behind < 0) return null;
          return (
            <div
              key={r}
              style={{
                position: 'absolute',
                top: r * lineH,
                height: lineH,
                lineHeight: `${lineH}px`,
                fontFamily: mono,
                fontSize,
                fontWeight: 700,
                whiteSpace: 'pre',
                // Soft phosphor glow makes the thin glyphs read as one luminous shape.
                textShadow: `0 0 ${charW * 0.9}px ${accent}66`,
                letterSpacing: charW - fontSize * 0.6,
              }}
            >
              {row.map((cell, c) => {
                if (cell.ch === ' ') return ' ';
                const decoding = behind < 3 && rand(r, c, Math.floor(frame / 2)) > behind / 3;
                const ch = decoding ? GLITCH[Math.floor(rand(c, r, frame) * GLITCH.length)] : cell.ch;
                const color = decoding ? accent : cell.color;
                return (
                  <span key={c} style={{color, opacity: (0.62 + cell.ink * 0.38) * Math.min(1, 0.25 + behind / 5)}}>
                    {ch}
                  </span>
                );
              })}
            </div>
          );
        })}
        <div
          style={{
            position: 'absolute',
            left: -20,
            right: -20,
            top: scan * lineH - 2,
            height: 3,
            background: accent,
            boxShadow: `0 0 18px 4px ${accent}`,
            opacity: scanOpacity * 0.85,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

type Card = {label: string; value: number; decimals?: number; unit?: string; sub: string; highlight?: boolean};

const cardsFor = (s: Stats): Card[] => {
  const range = (r: Stats['currentRange']) => (r ? `${shortDate(r.start)} – ${shortDate(r.end)}` : 'no streak yet');
  return [
    {label: 'current streak', value: s.currentStreak, unit: 'days', sub: range(s.currentRange), highlight: true},
    {label: 'longest streak', value: s.longestStreak, unit: 'days', sub: range(s.longestRange)},
    {label: 'contributions', value: s.total, sub: 'in the last year'},
    {
      label: 'active days',
      value: s.activeDays,
      unit: `/ ${s.totalDays}`,
      sub: `${Math.round((s.activeDays / Math.max(1, s.totalDays)) * 100)}% of the year`,
    },
    {label: 'best day', value: s.bestDay?.count ?? 0, sub: s.bestDay ? shortDate(s.bestDay.date) : '—'},
    {label: 'avg / active day', value: s.avgPerActiveDay, decimals: 1, sub: 'contributions'},
  ];
};

const StatCard: React.FC<{card: Card; index: number; accent: string}> = ({card, index}) => {
  const frame = useCurrentFrame();
  const start = 34 + index * 7;
  const p = interpolate(frame, [start, start + 50], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
  const appear = interpolate(frame, [start - 6, start + 10], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const value = card.value * p;
  // Highlighted number glows while it's counting, then settles.
  const glow = card.highlight ? interpolate(frame, [start + 30, start + 70], [1, 0.35], clamp) : 0;

  return (
    <div
      style={{
        background: theme.card,
        border: `1px solid ${theme.border}`,
        borderRadius: 7,
        padding: '8px 11px',
        opacity: appear,
        transform: `translateY(${(1 - appear) * 8}px)`,
        fontFamily: mono,
      }}
    >
      <div style={{fontSize: 10, color: theme.muted}}>$ {card.label}</div>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 3}}>
        <span
          style={{
            fontSize: 27,
            fontWeight: 800,
            color: card.highlight ? theme.green : theme.text,
            textShadow: glow ? `0 0 ${14 * glow}px ${theme.green}` : undefined,
          }}
        >
          {card.decimals ? value.toFixed(card.decimals) : fmt(value)}
        </span>
        {card.unit && <span style={{fontSize: 11, color: theme.muted}}>{card.unit}</span>}
      </div>
      <div style={{fontSize: 9.5, color: theme.faint, marginTop: 1}}>{card.sub}</div>
    </div>
  );
};

const WeeklyBars: React.FC<{weekly: number[]; height: number}> = ({weekly, height}) => {
  const frame = useCurrentFrame();
  const max = Math.max(1, ...weekly);
  return (
    <div style={{display: 'flex', alignItems: 'flex-end', gap: 2, height}}>
      {weekly.map((w, i) => {
        const t = 70 + i * 1.1;
        const p = interpolate(frame, [t, t + 22], [0, 1], {...clamp, easing: Easing.bezier(0.34, 1.3, 0.64, 1)});
        const ratio = w / max;
        const color = interpolateColors(ratio, [0, 0.25, 0.5, 1], [theme.levels[1], theme.levels[2], theme.levels[3], theme.levels[4]]);
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: Math.max(2, ratio * height) * p,
              background: w ? color : theme.levels[0],
              borderRadius: '2px 2px 0 0',
            }}
          />
        );
      })}
    </div>
  );
};

export const Whoami: React.FC<WhoamiProps> = ({prompt, host, accent, login, ascii, stats}) => {
  const cards = cardsFor(stats);
  return (
    <AbsoluteFill style={{background: theme.bg}}>
      <div style={{position: 'absolute', top: 20, width: '100%', display: 'flex', justifyContent: 'center'}}>
        <Prompt user={prompt} host={host} command="whoami" accent={accent} />
      </div>

      <TerminalWindow
        title={`${login.toLowerCase()} — portrait.txt`}
        start={12}
        style={{position: 'absolute', left: PAD, top: WIN_TOP, width: WIN_W, height: WIN_H}}
      >
        <AsciiPortrait ascii={ascii} accent={accent} />
      </TerminalWindow>

      <TerminalWindow
        title={`${login.toLowerCase()} — stats`}
        start={18}
        style={{position: 'absolute', left: PAD + WIN_W + 16, top: WIN_TOP, width: WIN_W, height: WIN_H}}
      >
        <div style={{position: 'absolute', inset: 12, display: 'flex', flexDirection: 'column', gap: 10}}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8}}>
            {cards.map((c, i) => (
              <StatCard key={c.label} card={c} index={i} accent={accent} />
            ))}
          </div>
          <div style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 6}}>
            <div style={{fontFamily: mono, fontSize: 10, color: theme.muted}}>$ weekly activity</div>
            <WeeklyBars weekly={stats.weekly} height={56} />
          </div>
        </div>
      </TerminalWindow>
    </AbsoluteFill>
  );
};
