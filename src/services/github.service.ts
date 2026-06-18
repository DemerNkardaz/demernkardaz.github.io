import { z } from 'zod';
import { HttpClient, NamespacedCache } from '../core/http-client';
import { SchemaValidationError } from '@/core/schema-validation';

const API_BASE = 'https://api.github.com';

const GithubRepoSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    full_name: z.string(),
    description: z.string().nullable(),
    html_url: z.string(),
    stargazers_count: z.number(),
    forks_count: z.number(),
    open_issues_count: z.number(),
    language: z.string().nullable(),
    archived: z.boolean(),
    default_branch: z.string(),
    pushed_at: z.string(),
  })
  .passthrough();

const GithubUserSchema = z
  .object({
    login: z.string(),
    id: z.number(),
    type: z.string(),
    name: z.string().nullable(),
    public_repos: z.number(),
    followers: z.number(),
    following: z.number(),
  })
  .passthrough();

const GithubSearchReposSchema = z
  .object({
    total_count: z.number(),
    incomplete_results: z.boolean(),
    items: z.array(GithubRepoSchema),
  })
  .passthrough();

const GithubReleaseSchema = z
  .object({
    id: z.number(),
    tag_name: z.string(),
    name: z.string().nullable(),
    draft: z.boolean(),
    prerelease: z.boolean(),
    published_at: z.string().nullable(),
    html_url: z.string(),
  })
  .passthrough();

export type GithubRepo = z.infer<typeof GithubRepoSchema>;
export type GithubUser = z.infer<typeof GithubUserSchema>;
export type GithubSearchRepos = z.infer<typeof GithubSearchReposSchema>;
export type GithubRelease = z.infer<typeof GithubReleaseSchema>;

function validate<T>(schema: z.ZodType<T>, data: unknown, url: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new SchemaValidationError(
      `Response from ${url} does not match expected schema: ${issues}`,
      url
    );
  }
  return result.data;
}

export interface GithubServiceConfig {
  /**
   * Personal access token. Опционален: без токена GitHub API работает,
   * но с лимитом 60 запросов/час против 5000/час с токеном.
   */
  token?: string;
}

/** Фабрика готового HttpClient под GitHub: Accept, User-Agent, и Authorization если есть токен. */
export function createGithubHttpClient(config: GithubServiceConfig = {}): HttpClient {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'api-client-example',
  };

  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`;
  }

  return new HttpClient({ headers });
}

export class GithubService {
  constructor(
    private readonly http: HttpClient,
    private readonly cache: NamespacedCache
  ) {}

  async getRepo(owner: string, repo: string): Promise<GithubRepo> {
    const key = `repo:${owner}/${repo}`;
    const cached = this.cache.get<GithubRepo>(key);
    if (cached) return cached;

    const url = `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const raw = await this.http.getJson<unknown>(url);
    const data = validate(GithubRepoSchema, raw, url);

    this.cache.set(key, data);
    return data;
  }

  async getUser(username: string): Promise<GithubUser> {
    const key = `user:${username}`;
    const cached = this.cache.get<GithubUser>(key);
    if (cached) return cached;

    const url = `${API_BASE}/users/${encodeURIComponent(username)}`;
    const raw = await this.http.getJson<unknown>(url);
    const data = validate(GithubUserSchema, raw, url);

    this.cache.set(key, data);
    return data;
  }

  /** Поиск репозиториев (синтаксис GitHub search, например `user:octocat language:typescript`). */
  async searchRepos(query: string, perPage = 30): Promise<GithubSearchRepos> {
    const key = `search:repos:${query}:${perPage}`;
    const cached = this.cache.get<GithubSearchRepos>(key);
    if (cached) return cached;

    const url = `${API_BASE}/search/repositories?q=${encodeURIComponent(query)}&per_page=${perPage}`;
    const raw = await this.http.getJson<unknown>(url);
    const data = validate(GithubSearchReposSchema, raw, url);

    this.cache.set(key, data);
    return data;
  }

  /** GitHub отдаёт максимум 100 релизов на страницу; для большинства репо одной страницы достаточно. */
  async getReleases(owner: string, repo: string, perPage = 30): Promise<GithubRelease[]> {
    const key = `releases:${owner}/${repo}:${perPage}`;
    const cached = this.cache.get<GithubRelease[]>(key);
    if (cached) return cached;

    const url = `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=${perPage}`;
    const raw = await this.http.getJson<unknown>(url);
    const data = validate(z.array(GithubReleaseSchema), raw, url);

    this.cache.set(key, data);
    return data;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
