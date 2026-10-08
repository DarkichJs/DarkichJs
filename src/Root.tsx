import React from 'react';
import {Composition} from 'remotion';
import {Contributions, CONTRIB_SIZE} from './compositions/Contributions';
import {Whoami, WHOAMI_SIZE} from './compositions/Whoami';
import {FPS} from './theme';
import config from '../readme.config.json';
import profile from '../data/profile.json';
import ascii from '../data/ascii.json';
import type {Ascii, ContributionsProps, ProfileData, WhoamiProps} from './types';

// Studio defaults come from the last `npm run fetch`; renders pass fresh inputProps.
const data = profile as unknown as ProfileData;
const base = {prompt: config.prompt, host: config.host, accent: config.accent};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Contributions"
      component={Contributions}
      fps={FPS}
      width={CONTRIB_SIZE.width}
      height={CONTRIB_SIZE.height}
      durationInFrames={CONTRIB_SIZE.duration}
      defaultProps={{...base, weeks: data.weeks, total: data.stats.total} satisfies ContributionsProps}
    />
    <Composition
      id="Whoami"
      component={Whoami}
      fps={FPS}
      width={WHOAMI_SIZE.width}
      height={WHOAMI_SIZE.height}
      durationInFrames={WHOAMI_SIZE.duration}
      defaultProps={{...base, login: data.profile.login, ascii: ascii as Ascii, stats: data.stats} satisfies WhoamiProps}
    />
  </>
);
