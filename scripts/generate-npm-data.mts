import fs from 'fs';
import path from 'path';
import { NpmService } from '../src/services/npm.service.ts';
import { HttpClient, CacheStore, NamespacedCache } from '../src/core/http-client';

const npmHttp = new HttpClient({
  headers: { 'User-Agent': 'github-actions-bot' },
});
const cache = new CacheStore();
const npmService = new NpmService(npmHttp, new NamespacedCache(cache, 'npm'));

async function generate() {
  console.log('Generating npm-data.json...');

  const data = await npmService.searchPackages('nkardaz');
  const outputPath = path.join(process.cwd(), 'public', 'npm-data.json');

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Success! Data saved to ${outputPath}`);
}

generate().catch((err) => {
  console.error('Generation failed:', err);
  process.exit(1);
});
