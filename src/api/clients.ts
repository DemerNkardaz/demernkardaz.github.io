import { HttpClient, CacheStore, NamespacedCache } from '@/core/http-client';
import { JsonpClient } from '@/core/jsonp-client';
import { NpmService } from '@/services/npm.service';
import { WakatimeService } from '@/services/wakatime.service';

/**
 * Единственный экземпляр на всё приложение. Создаётся один раз при
 * импорте модуля (ES-модули кэшируются), поэтому кэш и rate-limit
 * состояние HttpClient/JsonpClient переживают переходы между
 * страницами/компонентами.
 * Не создавайте новый сервис внутри компонента — это убивает смысл кэша.
 */
const cache = new CacheStore();
const npmHttp = new HttpClient({ headers: { 'User-Agent': 'nkardaz.github.io' } });
const wakatimeJsonp = new JsonpClient();

export const npmService = new NpmService(npmHttp, new NamespacedCache(cache, 'npm'));
export const wakatimeService = new WakatimeService(
  wakatimeJsonp,
  new NamespacedCache(cache, 'wakatime')
);
