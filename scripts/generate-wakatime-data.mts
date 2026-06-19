import fs from 'fs';
import path from 'path';
import { WakatimeService } from '../src/services/wakatime.service.ts';
import { HttpClient, CacheStore, NamespacedCache } from '../src/core/http-client';

const WAKATIME_USERNAME = 'Nkardaz';
const CODING_ACTIVITY_SHARE_ID = '00fc0562-a231-4035-92cd-e56b0c92e5c5';
const LANGUAGES_SHARE_ID = '9aeaa1dc-e2fb-449b-bfe1-56d7cdec1c2a';

const wakatimeHttp = new HttpClient({
  headers: { 'User-Agent': 'github-actions-bot' },
});
const cache = new CacheStore();
const wakatimeService = new WakatimeService(wakatimeHttp, new NamespacedCache(cache, 'wakatime'));

async function generate() {
  console.log('Generating wakatime-data.json...');

  const [codingActivity, languages] = await Promise.all([
    wakatimeService.getCodingActivity(WAKATIME_USERNAME, CODING_ACTIVITY_SHARE_ID),
    wakatimeService.getLanguages(WAKATIME_USERNAME, LANGUAGES_SHARE_ID),
  ]);

  const data = { codingActivity, languages };
  const outputPath = path.join(process.cwd(), 'public', 'wakatime-data.json');

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Success! Data saved to ${outputPath}`);
}

generate().catch((err) => {
  console.error('Generation failed:', err);
  process.exit(1);
});
