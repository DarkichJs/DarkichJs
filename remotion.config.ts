import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('png');
Config.setOverwriteOutput(true);
// chrome-headless-shell never fires requestAnimationFrame on recent macOS,
// so the root component never mounts. Chrome for Testing works everywhere.
Config.setChromeMode('chrome-for-testing');
