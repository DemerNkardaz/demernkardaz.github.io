import { HttpClient, CacheStore, NamespacedCache } from '@/core/http-client';
import { NpmService } from '@/services/npm.service';

/**
 * Единственный экземпляр на всё приложение. Создаётся один раз при
 * импорте модуля (ES-модули кэшируются), поэтому кэш и rate-limit
 * состояние HttpClient переживают переходы между страницами/компонентами.
 * Не создавайте новый NpmService внутри компонента — это убивает смысл кэша.
 */
const cache = new CacheStore();
const npmHttp = new HttpClient({ headers: { 'User-Agent': 'nkardaz.github.io' } });

export const npmService = new NpmService(npmHttp, new NamespacedCache(cache, 'npm'));
