import {fetchData, loadConfig} from './fetch-data.ts';
import {renderAll} from './render.ts';
import {writeReadme} from './readme.ts';

const config = await loadConfig();
const {data, ascii} = await fetchData(config);
console.log(`@${data.profile.login}: ${data.stats.total} contributions`);
await renderAll(config, data, ascii);
await writeReadme(config, data);
console.log('Done: assets/* + README.md');
